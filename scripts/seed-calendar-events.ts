/**
 * Seed demo calendar events (move-in/out, inspections, staff) from leases.
 * Replaces only prior demos (title starts with "DEMO ").
 * Showing events from seed-prospects are left alone (DEMO Showing:).
 *
 * Usage:
 *   npm run db:seed:calendar
 */
import {
  PrismaClient,
  UserRole,
  CalendarEventType,
  LeaseStatus,
  MaintenanceStatus,
} from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_PREFIX = "DEMO ";

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL || "").hostname || "?";
  } catch {
    return "?";
  }
}

function atHour(base: Date, hour: number, durationHrs = 2): { start: Date; end: Date } {
  const start = new Date(base);
  start.setHours(hour, 0, 0, 0);
  const end = new Date(start.getTime() + durationHrs * 60 * 60_000);
  return { start, end };
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  return d;
}

async function clearDemoCalendar() {
  // Keep DEMO Showing: from prospect seed; clear other DEMO * events
  const result = await prisma.calendarEvent.deleteMany({
    where: {
      title: { startsWith: DEMO_PREFIX },
      NOT: { title: { startsWith: "DEMO Showing:" } },
    },
  });
  return result.count;
}

async function main() {
  console.log(`→ Seeding calendar demos on ${dbHost()}`);

  const staff = await prisma.user.findFirst({
    where: {
      deletedAt: null,
      role: { in: [UserRole.PROPERTY_MANAGER, UserRole.ADMINISTRATOR, UserRole.OFFICE_STAFF] },
    },
    orderBy: { email: "asc" },
  });
  const maintenance = await prisma.user.findFirst({
    where: { role: UserRole.MAINTENANCE_STAFF, deletedAt: null },
  });
  if (!staff) throw new Error("No staff user found");

  const leases = await prisma.lease.findMany({
    where: { status: LeaseStatus.ACTIVE, deletedAt: null },
    include: {
      unit: { include: { property: true } },
      tenant: { include: { user: true } },
    },
    take: 80,
    orderBy: { startDate: "desc" },
  });

  const openMr = await prisma.maintenanceRequest.findMany({
    where: {
      status: {
        in: [
          MaintenanceStatus.ASSIGNED,
          MaintenanceStatus.SCHEDULED,
          MaintenanceStatus.IN_PROGRESS,
        ],
      },
      deletedAt: null,
    },
    take: 8,
    orderBy: { createdAt: "desc" },
  });

  const removed = await clearDemoCalendar();
  if (removed > 0) console.log(`→ Removed ${removed} prior DEMO calendar events`);

  const rows: Array<{
    title: string;
    type: CalendarEventType;
    propertyId?: string;
    unitId?: string;
    maintenanceRequestId?: string;
    assigneeId?: string;
    createdById: string;
    startAt: Date;
    endAt: Date;
    color: string;
    notes?: string;
    allDay?: boolean;
  }> = [];

  // Move-ins: leases that started recently or start soon
  const moveInLeases = leases
    .filter((l) => {
      const t = l.startDate.getTime();
      const now = Date.now();
      return t >= now - 45 * 86_400_000 && t <= now + 60 * 86_400_000;
    })
    .slice(0, 10);

  for (let i = 0; i < moveInLeases.length; i++) {
    const l = moveInLeases[i]!;
    const when = l.startDate.getTime() < Date.now() ? daysFromNow(2 + i) : l.startDate;
    const { start, end } = atHour(when, 10 + (i % 3), 2);
    const tenantName = l.tenant.user.name || "Tenant";
    rows.push({
      title: `${DEMO_PREFIX}Move-in: ${tenantName} — ${l.unit.unitNumber}`,
      type: CalendarEventType.MOVE_IN,
      propertyId: l.unit.propertyId,
      unitId: l.unitId,
      assigneeId: staff.id,
      createdById: staff.id,
      startAt: start,
      endAt: end,
      color: "#22c55e",
      notes: `Keys + walkthrough at ${l.unit.property.name}`,
    });
  }

  // Move-outs: leases ending soon
  const moveOutLeases = leases
    .filter((l) => {
      const t = l.endDate.getTime();
      const now = Date.now();
      return t >= now - 14 * 86_400_000 && t <= now + 90 * 86_400_000;
    })
    .slice(0, 8);

  for (let i = 0; i < moveOutLeases.length; i++) {
    const l = moveOutLeases[i]!;
    const when = l.endDate.getTime() < Date.now() ? daysFromNow(3 + i) : l.endDate;
    const { start, end } = atHour(when, 9 + (i % 4), 2);
    const tenantName = l.tenant.user.name || "Tenant";
    rows.push({
      title: `${DEMO_PREFIX}Move-out: ${tenantName} — ${l.unit.unitNumber}`,
      type: CalendarEventType.MOVE_OUT,
      propertyId: l.unit.propertyId,
      unitId: l.unitId,
      assigneeId: maintenance?.id || staff.id,
      createdById: staff.id,
      startAt: start,
      endAt: end,
      color: "#ef4444",
      notes: `Final inspection + deposit walkthrough — ${l.unit.property.name}`,
    });
  }

  // If lease windows were thin, fabricate a few from any leases
  if (rows.filter((r) => r.type === CalendarEventType.MOVE_IN).length < 4 && leases.length) {
    for (let i = 0; i < Math.min(4, leases.length); i++) {
      const l = leases[i]!;
      const { start, end } = atHour(daysFromNow(5 + i), 11, 2);
      rows.push({
        title: `${DEMO_PREFIX}Move-in: ${l.tenant.user.name || "Tenant"} — ${l.unit.unitNumber}`,
        type: CalendarEventType.MOVE_IN,
        propertyId: l.unit.propertyId,
        unitId: l.unitId,
        assigneeId: staff.id,
        createdById: staff.id,
        startAt: start,
        endAt: end,
        color: "#22c55e",
        notes: "DEMO scheduled from portfolio lease sample",
      });
    }
  }
  if (rows.filter((r) => r.type === CalendarEventType.MOVE_OUT).length < 3 && leases.length) {
    for (let i = 0; i < Math.min(3, leases.length); i++) {
      const l = leases[leases.length - 1 - i]!;
      const { start, end } = atHour(daysFromNow(8 + i), 13, 2);
      rows.push({
        title: `${DEMO_PREFIX}Move-out: ${l.tenant.user.name || "Tenant"} — ${l.unit.unitNumber}`,
        type: CalendarEventType.MOVE_OUT,
        propertyId: l.unit.propertyId,
        unitId: l.unitId,
        assigneeId: maintenance?.id || staff.id,
        createdById: staff.id,
        startAt: start,
        endAt: end,
        color: "#ef4444",
        notes: "DEMO scheduled from portfolio lease sample",
      });
    }
  }

  // Staff + inspection
  {
    const { start, end } = atHour(daysFromNow(1), 9, 1);
    rows.push({
      title: `${DEMO_PREFIX}Team Meeting`,
      type: CalendarEventType.STAFF_EVENT,
      assigneeId: staff.id,
      createdById: staff.id,
      startAt: start,
      endAt: end,
      color: "#6b7280",
      notes: "Weekly staff sync",
    });
  }
  {
    const { start, end } = atHour(daysFromNow(6), 9, 3);
    const prop = leases[0]?.unit.property;
    rows.push({
      title: `${DEMO_PREFIX}Portfolio Inspection Sweep`,
      type: CalendarEventType.INSPECTION,
      propertyId: prop?.id,
      assigneeId: staff.id,
      createdById: staff.id,
      startAt: start,
      endAt: end,
      color: "#8b5cf6",
      notes: prop ? `Starting at ${prop.name}` : undefined,
    });
  }

  // Tie a few open maintenance jobs to calendar
  for (let i = 0; i < Math.min(5, openMr.length); i++) {
    const mr = openMr[i]!;
    const { start, end } = atHour(daysFromNow(2 + i), 8 + (i % 5), 1.5);
    rows.push({
      title: `${DEMO_PREFIX}Maint: ${mr.title.slice(0, 48)}`,
      type: CalendarEventType.MAINTENANCE,
      propertyId: mr.propertyId,
      unitId: mr.unitId ?? undefined,
      maintenanceRequestId: mr.id,
      assigneeId: mr.assignedStaffId || maintenance?.id || staff.id,
      createdById: staff.id,
      startAt: start,
      endAt: end,
      color: "#f59e0b",
      notes: mr.requestNumber,
    });
  }

  if (rows.length === 0) {
    throw new Error("No leases/maintenance to attach calendar demos to.");
  }

  await prisma.calendarEvent.createMany({ data: rows });
  const byType = rows.reduce<Record<string, number>>((acc, r) => {
    acc[r.type] = (acc[r.type] || 0) + 1;
    return acc;
  }, {});
  console.log(`✓ Created ${rows.length} DEMO calendar events`, byType);
  console.log("  View at /calendar");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
