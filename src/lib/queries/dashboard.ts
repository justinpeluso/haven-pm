import { db } from "@/lib/db";
import { UserRole } from "@prisma/client";

export async function getAdminDashboardData() {
  const [
    propertyCount,
    unitStats,
    openMaintenance,
    overdueMaintenance,
    prospectsWaiting,
    upcomingShowings,
    recentActivity,
    occupancyData,
  ] = await Promise.all([
    db.property.count({ where: { deletedAt: null } }),
    db.unit.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    }),
    db.maintenanceRequest.count({
      where: {
        deletedAt: null,
        status: { notIn: ["COMPLETED", "CLOSED"] },
      },
    }),
    db.maintenanceRequest.count({
      where: {
        deletedAt: null,
        status: { notIn: ["COMPLETED", "CLOSED"] },
        targetCompletion: { lt: new Date() },
      },
    }),
    db.prospect.count({
      where: {
        deletedAt: null,
        status: { in: ["NEW", "CONTACTED"] },
      },
    }),
    db.showing.count({
      where: {
        scheduledAt: {
          gte: new Date(),
          lte: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        },
        status: { in: ["SCHEDULED", "CONFIRMED"] },
      },
    }),
    db.activityLog.findMany({
      take: 10,
      orderBy: { createdAt: "desc" },
      include: { user: { select: { name: true } } },
    }),
    db.unit.findMany({
      where: { deletedAt: null },
      select: { status: true },
    }),
  ]);

  const totalUnits = occupancyData.length;
  const occupiedUnits = occupancyData.filter(
    (u) => u.status === "OCCUPIED" || u.status === "NOTICE_GIVEN"
  ).length;
  const vacantUnits = occupancyData.filter(
    (u) => u.status === "AVAILABLE" || u.status === "VACANT"
  ).length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupiedUnits / totalUnits) * 100) : 0;

  return {
    propertyCount,
    unitStats,
    openMaintenance,
    overdueMaintenance,
    prospectsWaiting,
    upcomingShowings,
    recentActivity,
    totalUnits,
    occupiedUnits,
    vacantUnits,
    occupancyRate,
  };
}

export async function getTenantDashboardData(userId: string) {
  const tenant = await db.tenant.findUnique({
    where: { userId },
    include: {
      leases: {
        where: { status: "ACTIVE", deletedAt: null },
        include: {
          unit: {
            include: { property: true },
          },
        },
        take: 1,
      },
      maintenanceRequests: {
        where: { deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
      },
      user: {
        include: {
          messagesReceived: {
            where: { deletedAt: null },
            orderBy: { createdAt: "desc" },
            take: 5,
            include: { sender: { select: { name: true } } },
          },
        },
      },
    },
  });

  const documents = tenant
    ? await db.document.findMany({
        where: { tenantId: tenant.id, deletedAt: null },
        orderBy: { createdAt: "desc" },
        take: 5,
      })
    : [];

  return { tenant, documents };
}

export async function getMaintenanceDashboardData(userId: string) {
  const [assigned, completed, upcoming] = await Promise.all([
    db.maintenanceRequest.findMany({
      where: {
        assignedStaffId: userId,
        deletedAt: null,
        status: { notIn: ["COMPLETED", "CLOSED"] },
      },
      include: {
        property: true,
        unit: true,
        tenant: { include: { user: { select: { name: true } } } },
      },
      orderBy: [{ priority: "desc" }, { targetCompletion: "asc" }],
    }),
    db.maintenanceRequest.findMany({
      where: {
        assignedStaffId: userId,
        status: { in: ["COMPLETED", "CLOSED"] },
      },
      orderBy: { completedAt: "desc" },
      take: 10,
      include: { property: true, unit: true },
    }),
    db.calendarEvent.findMany({
      where: {
        assigneeId: userId,
        type: "MAINTENANCE",
        startAt: { gte: new Date() },
        deletedAt: null,
      },
      orderBy: { startAt: "asc" },
      take: 5,
      include: { property: true },
    }),
  ]);

  return { assigned, completed, upcoming };
}

export async function getAgentDashboardData(userId: string) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const [leads, showingsToday, availableUnits, pipeline] = await Promise.all([
    db.prospect.findMany({
      where: {
        deletedAt: null,
        status: { in: ["NEW", "CONTACTED", "SHOWING_SCHEDULED"] },
      },
      orderBy: { createdAt: "desc" },
      take: 10,
    }),
    db.showing.findMany({
      where: {
        agentId: userId,
        scheduledAt: { gte: today, lt: tomorrow },
      },
      include: {
        prospect: true,
      },
      orderBy: { scheduledAt: "asc" },
    }),
    db.unit.findMany({
      where: { status: "AVAILABLE", deletedAt: null },
      include: { property: true },
      take: 10,
    }),
    db.prospect.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    }),
  ]);

  const calendarEvents = await db.calendarEvent.findMany({
    where: {
      assigneeId: userId,
      startAt: { gte: today },
      deletedAt: null,
    },
    orderBy: { startAt: "asc" },
    take: 10,
    include: { property: true },
  });

  return { leads, showingsToday, availableUnits, pipeline, calendarEvents };
}

export async function getManagerDashboardData() {
  return getAdminDashboardData();
}

export async function getDashboardData(role: UserRole, userId: string) {
  switch (role) {
    case UserRole.ADMINISTRATOR:
      return { type: "admin" as const, data: await getAdminDashboardData() };
    case UserRole.PROPERTY_MANAGER:
      return { type: "manager" as const, data: await getManagerDashboardData() };
    case UserRole.LEASING_AGENT:
      return { type: "agent" as const, data: await getAgentDashboardData(userId) };
    case UserRole.MAINTENANCE_STAFF:
      return { type: "maintenance" as const, data: await getMaintenanceDashboardData(userId) };
    case UserRole.TENANT:
      return { type: "tenant" as const, data: await getTenantDashboardData(userId) };
    case UserRole.OFFICE_STAFF:
      return { type: "admin" as const, data: await getAdminDashboardData() };
    default:
      return { type: "prospect" as const, data: null };
  }
}
