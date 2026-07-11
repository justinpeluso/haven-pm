import { db } from "@/lib/db";

export async function getCalendarEventsForRange(start: string, end: string) {
  return db.calendarEvent.findMany({
    where: {
      deletedAt: null,
      startAt: { lt: new Date(end) },
      endAt: { gt: new Date(start) },
    },
    include: {
      property: { select: { id: true, name: true } },
      unit: { select: { unitNumber: true } },
      assignee: { select: { id: true, name: true } },
    },
    orderBy: { startAt: "asc" },
  });
}

export async function getCalendarPreviewEvents(limit = 6) {
  const now = new Date();
  const twoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

  return db.calendarEvent.findMany({
    where: {
      deletedAt: null,
      startAt: { gte: now, lte: twoWeeks },
    },
    include: {
      property: { select: { name: true } },
    },
    orderBy: { startAt: "asc" },
    take: limit,
  });
}
