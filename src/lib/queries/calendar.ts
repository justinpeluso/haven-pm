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
