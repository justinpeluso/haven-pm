import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isStaffRole } from "@/lib/permissions";
import {
  getTenantActiveLeaseLocation,
  getTenantForUser,
} from "@/lib/tenant-scope";
import { NewMaintenanceForm } from "@/components/maintenance/new-form";
import { EmptyState } from "@/components/shared/empty-state";
import { Wrench } from "lucide-react";

export default async function NewMaintenancePage() {
  const session = await requirePermission("maintenance:write");

  if (!isStaffRole(session.user.role)) {
    const tenant = await getTenantForUser(session.user.id);
    if (!tenant) {
      return (
        <EmptyState
          icon={Wrench}
          title="No tenant profile"
          description="Contact the office to set up your account before submitting requests."
        />
      );
    }
    const location = await getTenantActiveLeaseLocation(tenant.id);
    if (!location) {
      return (
        <EmptyState
          icon={Wrench}
          title="No active lease"
          description="Maintenance requests need an active lease on file. Contact the office for help."
        />
      );
    }
    return (
      <NewMaintenanceForm
        properties={[
          {
            id: location.propertyId,
            name: location.propertyName,
            units: [{ id: location.unitId, unitNumber: location.unitNumber }],
          },
        ]}
        lockLocation
      />
    );
  }

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
