"use server";

import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";

export async function getActivityLogs(filters?: {
  entityType?: string;
  propertyId?: string;
  limit?: number;
}) {
  await requirePermission("audit:read");

  return db.activityLog.findMany({
    where: {
      ...(filters?.entityType ? { entityType: filters.entityType } : {}),
      ...(filters?.propertyId ? { propertyId: filters.propertyId } : {}),
    },
    include: {
      user: { select: { name: true, email: true } },
      property: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: filters?.limit ?? 100,
  });
}

export async function getAuditLogs(limit = 100) {
  await requirePermission("audit:read");

  return db.auditLog.findMany({
    include: {
      user: { select: { name: true, email: true } },
    },
    orderBy: { createdAt: "desc" },
    take: limit,
  });
}

export async function getAuditFilterOptions() {
  await requirePermission("audit:read");

  const [entityTypes, properties] = await Promise.all([
    db.activityLog.findMany({
      distinct: ["entityType"],
      select: { entityType: true },
      orderBy: { entityType: "asc" },
    }),
    db.property.findMany({
      where: { deletedAt: null },
      select: { id: true, name: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return {
    entityTypes: entityTypes.map((e) => e.entityType),
    properties,
  };
}
