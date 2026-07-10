"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { prospectSchema, showingSchema } from "@/lib/validations";
import { logActivity, logProspectTimeline, createNotification } from "@/lib/activity";
import { ActivityAction, NotificationType } from "@prisma/client";

export async function createProspect(formData: FormData) {
  const session = await requirePermission("prospects:write");

  const raw: Record<string, unknown> = {};
  for (const key of ["name", "email", "phone", "leadSource", "budget", "moveDate", "pets", "notes", "status"]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const propertyIds = formData.getAll("propertyIds") as string[];
  if (propertyIds.length) raw.propertyIds = propertyIds;

  const parsed = prospectSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const { propertyIds: pIds, moveDate, notes, ...prospectData } = parsed.data;

  const prospect = await db.prospect.create({
    data: {
      ...prospectData,
      internalNotes: notes,
      moveDate: moveDate ? new Date(moveDate) : undefined,
      properties: pIds?.length
        ? { create: pIds.map((propertyId) => ({ propertyId })) }
        : undefined,
    },
  });

  await logProspectTimeline(prospect.id, "Prospect created", session.user.id);
  await logActivity({
    action: ActivityAction.CREATED,
    entityType: "Prospect",
    entityId: prospect.id,
    userId: session.user.id,
    prospectId: prospect.id,
  });

  revalidatePath("/prospects");
  return { success: true, id: prospect.id };
}

export async function updateProspectStatus(id: string, status: string) {
  const session = await requirePermission("prospects:write");

  const existing = await db.prospect.findUnique({ where: { id } });
  if (!existing) return { error: "Prospect not found" };

  await db.prospect.update({
    where: { id },
    data: { status: status as import("@prisma/client").ProspectStatus },
  });

  await logProspectTimeline(
    id,
    "Status changed",
    session.user.id,
    existing.status,
    status
  );

  revalidatePath(`/prospects/${id}`);
  revalidatePath("/prospects");
  return { success: true };
}

export async function scheduleShowing(formData: FormData) {
  const session = await requirePermission("calendar:write");

  const raw: Record<string, unknown> = {};
  for (const key of ["prospectId", "propertyId", "unitId", "agentId", "scheduledAt", "duration", "notes"]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = showingSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const showing = await db.showing.create({
    data: {
      ...parsed.data,
      scheduledAt: new Date(parsed.data.scheduledAt),
    },
  });

  await db.prospect.update({
    where: { id: parsed.data.prospectId },
    data: { status: "SHOWING_SCHEDULED" },
  });

  await logProspectTimeline(
    parsed.data.prospectId,
    "Showing scheduled",
    session.user.id,
    undefined,
    parsed.data.scheduledAt
  );

  // Create calendar event
  const prospect = await db.prospect.findUnique({ where: { id: parsed.data.prospectId } });
  const property = parsed.data.propertyId
    ? await db.property.findUnique({ where: { id: parsed.data.propertyId } })
    : null;

  await db.calendarEvent.create({
    data: {
      title: `Showing: ${prospect?.name}`,
      type: "SHOWING",
      propertyId: parsed.data.propertyId,
      unitId: parsed.data.unitId,
      assigneeId: parsed.data.agentId,
      createdById: session.user.id,
      startAt: new Date(parsed.data.scheduledAt),
      endAt: new Date(new Date(parsed.data.scheduledAt).getTime() + parsed.data.duration * 60000),
      color: "#3b82f6",
      notes: parsed.data.notes,
    },
  });

  await createNotification(
    parsed.data.agentId,
    NotificationType.SHOWING_BOOKED,
    "Showing Scheduled",
    `${prospect?.name} at ${property?.name || "property"}`,
    `/calendar`
  );

  revalidatePath("/prospects");
  revalidatePath("/calendar");
  return { success: true, id: showing.id };
}

export async function getProspects(status?: string) {
  await requirePermission("prospects:read");

  return db.prospect.findMany({
    where: {
      deletedAt: null,
      ...(status ? { status: status as import("@prisma/client").ProspectStatus } : {}),
    },
    include: {
      properties: { include: { property: true } },
      _count: { select: { showings: true } },
    },
    orderBy: { createdAt: "desc" },
  });
}

export async function getProspect(id: string) {
  await requirePermission("prospects:read");

  return db.prospect.findUnique({
    where: { id },
    include: {
      properties: { include: { property: true } },
      showings: {
        include: { agent: { select: { name: true } } },
        orderBy: { scheduledAt: "desc" },
      },
      timeline: { orderBy: { createdAt: "desc" } },
      notes: {
        where: { deletedAt: null },
        include: { author: { select: { name: true } } },
        orderBy: { createdAt: "desc" },
      },
      documents: { where: { deletedAt: null } },
    },
  });
}
