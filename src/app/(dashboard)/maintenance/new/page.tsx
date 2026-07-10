import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NewMaintenanceForm } from "@/components/maintenance/new-form";

export default async function NewMaintenancePage() {
  await requirePermission("maintenance:write");

  const properties = await db.property.findMany({
    where: { deletedAt: null },
    select: {
      id: true,
      name: true,
      units: {
        where: { deletedAt: null },
        select: { id: true, unitNumber: true },
      },
    },
    orderBy: { name: "asc" },
  });

  return <NewMaintenanceForm properties={properties} />;
}
