import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NewEventForm } from "@/components/calendar/new-event-form";
import { UserRole } from "@prisma/client";

export default async function NewCalendarEventPage() {
  await requirePermission("calendar:write");

  const [properties, staff] = await Promise.all([
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
    }),
  ]);

  return <NewEventForm properties={properties} staff={staff} />;
}
