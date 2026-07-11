import { db } from "@/lib/db";

export async function getPortfolioPulse() {
  const now = new Date();
  const in60Days = new Date(now.getTime() + 60 * 24 * 60 * 60 * 1000);
  const in30Days = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

  const [expiringLeases, vacantUnits, moveEvents, openEmergency] = await Promise.all([
    db.lease.findMany({
      where: {
        deletedAt: null,
        status: "ACTIVE",
        endDate: { gte: now, lte: in60Days },
      },
      include: {
        tenant: { include: { user: { select: { name: true } } } },
        unit: {
          include: { property: { select: { id: true, name: true } } },
        },
      },
      orderBy: { endDate: "asc" },
      take: 6,
    }),
    db.unit.findMany({
      where: {
        deletedAt: null,
        status: { in: ["AVAILABLE", "VACANT"] },
      },
      include: {
        property: { select: { id: true, name: true } },
      },
      orderBy: { updatedAt: "desc" },
      take: 6,
    }),
    db.calendarEvent.findMany({
      where: {
        deletedAt: null,
        type: { in: ["MOVE_IN", "MOVE_OUT"] },
        startAt: { gte: now, lte: in30Days },
      },
      include: {
        property: { select: { name: true } },
        unit: { select: { unitNumber: true } },
      },
      orderBy: { startAt: "asc" },
      take: 6,
    }),
    db.maintenanceRequest.count({
      where: {
        deletedAt: null,
        priority: "EMERGENCY",
        status: { notIn: ["COMPLETED", "CLOSED"] },
      },
    }),
  ]);

  const vacantCount = await db.unit.count({
    where: { deletedAt: null, status: { in: ["AVAILABLE", "VACANT"] } },
  });

  const expiringCount = await db.lease.count({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      endDate: { gte: now, lte: in60Days },
    },
  });

  return {
    expiringCount,
    vacantCount,
    openEmergency,
    expiringLeases: expiringLeases.map((l) => ({
      id: l.id,
      endDate: l.endDate,
      rentAmount: Number(l.rentAmount),
      tenantName: l.tenant.user.name,
      unitNumber: l.unit.unitNumber,
      propertyId: l.unit.property.id,
      propertyName: l.unit.property.name,
    })),
    vacantUnits: vacantUnits.map((u) => ({
      id: u.id,
      unitNumber: u.unitNumber,
      bedrooms: u.bedrooms,
      rentAmount: Number(u.rentAmount),
      propertyId: u.property.id,
      propertyName: u.property.name,
      status: u.status,
    })),
    moveEvents: moveEvents.map((e) => ({
      id: e.id,
      title: e.title,
      type: e.type,
      startAt: e.startAt,
      propertyName: e.property?.name ?? null,
      unitNumber: e.unit?.unitNumber ?? null,
    })),
  };
}

export type PortfolioPulse = Awaited<ReturnType<typeof getPortfolioPulse>>;
