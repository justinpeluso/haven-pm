"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requireAuth, requirePermission } from "@/lib/auth/session";
import { calendarEventSchema, noteSchema, messageSchema } from "@/lib/validations";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@prisma/client";

export async function createCalendarEvent(formData: FormData) {
  const session = await requirePermission("calendar:write");

  const raw: Record<string, unknown> = {};
  for (const key of [
    "title", "type", "propertyId", "unitId", "assigneeId",
    "startAt", "endAt", "allDay", "color", "notes", "recurrence",
  ]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = calendarEventSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const event = await db.calendarEvent.create({
    data: {
      ...parsed.data,
      createdById: session.user.id,
      startAt: new Date(parsed.data.startAt),
      endAt: new Date(parsed.data.endAt),
      allDay: parsed.data.allDay === true || parsed.data.allDay === ("true" as unknown as boolean),
    },
  });

  revalidatePath("/calendar");
  return { success: true, id: event.id };
}

export async function getCalendarEvents(start?: string, end?: string) {
  await requirePermission("calendar:read");

  const where: Record<string, unknown> = { deletedAt: null };
  if (start && end) {
    where.startAt = { gte: new Date(start) };
    where.endAt = { lte: new Date(end) };
  }

  return db.calendarEvent.findMany({
    where,
    include: {
      property: true,
      unit: true,
      assignee: { select: { name: true } },
    },
    orderBy: { startAt: "asc" },
  });
}

export async function createNote(formData: FormData) {
  const session = await requirePermission("notes:write");

  const raw: Record<string, unknown> = {};
  for (const key of ["content", "propertyId", "unitId", "tenantId", "prospectId", "maintenanceRequestId"]) {
    const val = formData.get(key);
    if (val !== null && val !== "") raw[key] = val;
  }

  const parsed = noteSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const note = await db.note.create({
    data: {
      ...parsed.data,
      authorId: session.user.id,
    },
  });

  await logActivity({
    action: ActivityAction.NOTE_ADDED,
    entityType: "Note",
    entityId: note.id,
    userId: session.user.id,
    propertyId: parsed.data.propertyId,
    unitId: parsed.data.unitId,
    tenantId: parsed.data.tenantId,
    prospectId: parsed.data.prospectId,
    maintenanceRequestId: parsed.data.maintenanceRequestId,
  });

  revalidatePath("/");
  return { success: true, id: note.id };
}

export async function sendMessage(formData: FormData) {
  const session = await requirePermission("messages:write");

  const raw = {
    receiverId: formData.get("receiverId") as string,
    subject: (formData.get("subject") as string) || undefined,
    body: formData.get("body") as string,
    tenantId: (formData.get("tenantId") as string) || undefined,
  };

  const parsed = messageSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0].message };
  }

  const message = await db.message.create({
    data: {
      ...parsed.data,
      senderId: session.user.id,
    },
  });

  revalidatePath("/messages");
  return { success: true, id: message.id };
}

export async function markNotificationRead(id: string) {
  const session = await requireAuth();
  await db.notification.updateMany({
    where: { id, userId: session.user.id },
    data: { isRead: true },
  });
  revalidatePath("/notifications");
}

export async function getNotifications(unreadOnly = false) {
  const session = await requireAuth();

  return db.notification.findMany({
    where: {
      userId: session.user.id,
      ...(unreadOnly ? { isRead: false } : {}),
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });
}
