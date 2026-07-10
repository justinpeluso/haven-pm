import { requirePermission } from "@/lib/auth/session";
import { getCalendarEventsForRange } from "@/lib/queries/calendar";
import { db } from "@/lib/db";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { CalendarView } from "@/components/calendar/calendar-view";
import { UserRole } from "@prisma/client";
import { hasPermission } from "@/lib/permissions";

export default async function CalendarPage() {
  const session = await requirePermission("calendar:read");

  const now = new Date();
  const start = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const end = new Date(now.getFullYear(), now.getMonth() + 3, 0);

  const [events, properties, staff] = await Promise.all([
    getCalendarEventsForRange(start.toISOString(), end.toISOString()),
    db.property.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
    db.user.findMany({
      where: {
        isActive: true,
        role: {
          in: [
            UserRole.ADMINISTRATOR,
            UserRole.PROPERTY_MANAGER,
            UserRole.LEASING_AGENT,
            UserRole.MAINTENANCE_STAFF,
            UserRole.OFFICE_STAFF,
          ],
        },
      },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  const canEdit = hasPermission(session.user.role, "calendar:write");

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Calendar" }]} />
        <h1 className="mt-2 text-2xl font-bold">Calendar</h1>
        <p className="text-muted-foreground">
          Click any event for details. Drag to reschedule.
        </p>
      </div>

      <CalendarView
        canEdit={canEdit}
        properties={properties}
        staff={staff}
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          startAt: e.startAt.toISOString(),
          endAt: e.endAt.toISOString(),
          allDay: e.allDay,
          color: e.color,
          notes: e.notes,
          recurrence: e.recurrence,
          propertyId: e.propertyId ?? undefined,
          assigneeId: e.assigneeId ?? undefined,
          property: e.property,
          unit: e.unit,
          assignee: e.assignee,
        }))}
      />
    </div>
  );
}
