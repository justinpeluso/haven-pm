import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

/** Resolve the Tenant row for a user session, if any. */
export async function getTenantForUser(userId: string) {
  return db.tenant.findUnique({
    where: { userId },
    select: { id: true, phone: true },
  });
}

/** Active lease location for a tenant (property + unit). */
export async function getTenantActiveLeaseLocation(tenantId: string) {
  const lease = await db.lease.findFirst({
    where: { tenantId, status: "ACTIVE", deletedAt: null },
    select: {
      id: true,
      unitId: true,
      unit: {
        select: {
          id: true,
          unitNumber: true,
          propertyId: true,
          property: { select: { id: true, name: true } },
        },
      },
    },
    orderBy: { startDate: "desc" },
  });
  if (!lease?.unit) return null;
  return {
    leaseId: lease.id,
    unitId: lease.unit.id,
    unitNumber: lease.unit.unitNumber,
    propertyId: lease.unit.propertyId,
    propertyName: lease.unit.property.name,
  };
}

export function isTenantRole(role: UserRole | string) {
  return role === UserRole.TENANT || role === "TENANT";
}
