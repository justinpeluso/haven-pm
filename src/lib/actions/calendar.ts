"use server";

import { revalidatePath } from "next/cache";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { ActivityAction } from "@prisma/client";

export async function updateCalendarEventTime(
  eventId: string,
  startAt: string,
  endAt: string
) {
  const session = await requirePermission("calendar:write");

  const existing = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!existing) return { error: "Event not found" };

  await db.calendarEvent.update({
    where: { id: eventId },
    data: {
      startAt: new Date(startAt),
      endAt: new Date(endAt),
    },
  });

  await logActivity({
    action: ActivityAction.UPDATED,
    entityType: "CalendarEvent",
    entityId: eventId,
    userId: session.user.id,
    fieldName: "startAt",
    oldValue: existing.startAt.toISOString(),
    newValue: startAt,
  });

  revalidatePath("/calendar");
  return { success: true };
}

export async function updateCalendarEvent(
  eventId: string,
  data: {
    title: string;
    type: string;
    propertyId?: string | null;
    assigneeId?: string | null;
    startAt: string;
    endAt: string;
    notes?: string | null;
    recurrence?: string;
    color?: string | null;
  }
) {
  const session = await requirePermission("calendar:write");

  const existing = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!existing) return { error: "Event not found" };

  await db.calendarEvent.update({
    where: { id: eventId },
    data: {
      title: data.title,
      type: data.type as import("@prisma/client").CalendarEventType,
      propertyId: data.propertyId || null,
      assigneeId: data.assigneeId || null,
      startAt: new Date(data.startAt),
      endAt: new Date(data.endAt),
      notes: data.notes || null,
      recurrence: (data.recurrence as import("@prisma/client").RecurrenceType) || "NONE",
      color: data.color || null,
    },
  });

  await logActivity({
    action: ActivityAction.UPDATED,
    entityType: "CalendarEvent",
    entityId: eventId,
    userId: session.user.id,
    propertyId: data.propertyId || undefined,
  });

  revalidatePath("/calendar");
  return { success: true };
}

export async function deleteCalendarEvent(eventId: string) {
  const session = await requirePermission("calendar:write");

  const existing = await db.calendarEvent.findUnique({ where: { id: eventId } });
  if (!existing) return { error: "Event not found" };

  await db.calendarEvent.update({
    where: { id: eventId },
    data: { deletedAt: new Date() },
  });

  await logActivity({
    action: ActivityAction.DELETED,
    entityType: "CalendarEvent",
    entityId: eventId,
    userId: session.user.id,
  });

  revalidatePath("/calendar");
  return { success: true };
}
