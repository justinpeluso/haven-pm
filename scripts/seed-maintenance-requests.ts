/**
 * Seed demo maintenance requests against the current portfolio
 * (AppFolio import or regular seed) without wiping properties/tenants.
 *
 * Replaces only prior demo rows (requestNumber MR-DEMO-*).
 *
 * Usage:
 *   npx tsx scripts/seed-maintenance-requests.ts
 *   npm run db:seed:maintenance
 *   COUNT=40 npx tsx scripts/seed-maintenance-requests.ts
 */
import {
  PrismaClient,
  UserRole,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceCategory,
  LeaseStatus,
} from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_PREFIX = "MR-DEMO-";
const COUNT = Math.min(80, Math.max(8, Number(process.env.COUNT || 28)));

const VENDORS = [
  { name: "Cascade HVAC Pros", phone: "(412) 555-1001" },
  { name: "Bright Electric Co.", phone: "(412) 555-1002" },
  { name: "HandyFix Services", phone: "(412) 555-1003" },
  { name: "FlowRight Plumbing", phone: "(412) 555-1004" },
  { name: "GreenScape Maintenance", phone: "(412) 555-1005" },
] as const;

type JobTemplate = {
  category: MaintenanceCategory;
  priority: MaintenancePriority;
  status: MaintenanceStatus;
  title: string;
  description: string;
  vendorIdx?: number;
  cost?: number;
  createdBy: "manager" | "tenant";
  needsTenant?: boolean;
};

const TEMPLATES: JobTemplate[] = [
  {
    category: MaintenanceCategory.HVAC,
    priority: MaintenancePriority.HIGH,
    status: MaintenanceStatus.IN_PROGRESS,
    title: "AC not cooling",
    description: "System runs but won't drop below 78°F. Needs service call.",
    vendorIdx: 0,
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.ELECTRICAL,
    priority: MaintenancePriority.MEDIUM,
    status: MaintenanceStatus.IN_PROGRESS,
    title: "Hallway light fixture flickering",
    description: "Common-area fixture flickers after dusk. Schedule electrician.",
    vendorIdx: 1,
    cost: 125.5,
    createdBy: "manager",
  },
  {
    category: MaintenanceCategory.GENERAL,
    priority: MaintenancePriority.MEDIUM,
    status: MaintenanceStatus.ASSIGNED,
    title: "Closet door + drywall patch",
    description: "Handyman punch-list after turnover.",
    vendorIdx: 2,
    createdBy: "manager",
  },
  {
    category: MaintenanceCategory.PLUMBING,
    priority: MaintenancePriority.HIGH,
    status: MaintenanceStatus.ASSIGNED,
    title: "Kitchen sink leaking",
    description: "P-trap drip under sink. Tenant reports slow puddle.",
    vendorIdx: 3,
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.LANDSCAPING,
    priority: MaintenancePriority.LOW,
    status: MaintenanceStatus.SCHEDULED,
    title: "Front lawn irrigation repair",
    description: "Broken sprinkler head near entry walk.",
    vendorIdx: 4,
    createdBy: "manager",
  },
  {
    category: MaintenanceCategory.APPLIANCE,
    priority: MaintenancePriority.MEDIUM,
    status: MaintenanceStatus.SUBMITTED,
    title: "Dishwasher not draining",
    description: "Standing water at bottom after every cycle.",
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.PEST_CONTROL,
    priority: MaintenancePriority.HIGH,
    status: MaintenanceStatus.SUBMITTED,
    title: "Ant trail in kitchen",
    description: "Ant line along baseboards and under sink.",
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.STRUCTURAL,
    priority: MaintenancePriority.EMERGENCY,
    status: MaintenanceStatus.IN_PROGRESS,
    title: "Ceiling water stain spreading",
    description: "Brown stain growing above living room — possible roof leak.",
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.HVAC,
    priority: MaintenancePriority.LOW,
    status: MaintenanceStatus.COMPLETED,
    title: "Replace furnace filter",
    description: "Quarterly filter swap completed.",
    cost: 45,
    createdBy: "manager",
  },
  {
    category: MaintenanceCategory.ELECTRICAL,
    priority: MaintenancePriority.MEDIUM,
    status: MaintenanceStatus.WAITING_ON_PARTS,
    title: "Outlet sparking in bedroom",
    description: "GFCI outlet tripped and sparked once. Parts ordered.",
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.PLUMBING,
    priority: MaintenancePriority.MEDIUM,
    status: MaintenanceStatus.SCHEDULED,
    title: "Toilet running continuously",
    description: "Flapper likely worn — scheduled for Friday morning.",
    vendorIdx: 3,
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.GENERAL,
    priority: MaintenancePriority.LOW,
    status: MaintenanceStatus.CLOSED,
    title: "Broken living-room blinds",
    description: "Slats snapped — replaced and closed out.",
    cost: 80,
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.APPLIANCE,
    priority: MaintenancePriority.HIGH,
    status: MaintenanceStatus.ASSIGNED,
    title: "Refrigerator not cooling",
    description: "Fridge warm; freezer still cold. Food at risk.",
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.OTHER,
    priority: MaintenancePriority.LOW,
    status: MaintenanceStatus.SUBMITTED,
    title: "Mailbox lock sticky",
    description: "Key turns hard; request lube or lock swap.",
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.PLUMBING,
    priority: MaintenancePriority.EMERGENCY,
    status: MaintenanceStatus.IN_PROGRESS,
    title: "Water heater leaking",
    description: "Pool forming under heater closet — shutoff tagged.",
    vendorIdx: 3,
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.HVAC,
    priority: MaintenancePriority.MEDIUM,
    status: MaintenanceStatus.SCHEDULED,
    title: "No heat in bedroom",
    description: "Vents blow cool air only in primary bedroom.",
    vendorIdx: 0,
    createdBy: "tenant",
    needsTenant: true,
  },
  {
    category: MaintenanceCategory.GENERAL,
    priority: MaintenancePriority.MEDIUM,
    status: MaintenanceStatus.COMPLETED,
    title: "Rekey after move-out",
    description: "Locks rekeyed; new keys logged to office.",
    cost: 95,
    createdBy: "manager",
  },
  {
    category: MaintenanceCategory.STRUCTURAL,
    priority: MaintenancePriority.MEDIUM,
    status: MaintenanceStatus.WAITING_ON_PARTS,
    title: "Sliding door roller failure",
    description: "Patio door sticks; rollers ordered.",
    createdBy: "manager",
  },
  {
    category: MaintenanceCategory.PEST_CONTROL,
    priority: MaintenancePriority.MEDIUM,
    status: MaintenanceStatus.SCHEDULED,
    title: "Quarterly pest treatment",
    description: "Exterior bait stations + kitchen perimeter.",
    createdBy: "manager",
  },
  {
    category: MaintenanceCategory.LANDSCAPING,
    priority: MaintenancePriority.LOW,
    status: MaintenanceStatus.CLOSED,
    title: "Storm debris cleanup",
    description: "Fallen branch cleared from driveway.",
    vendorIdx: 4,
    cost: 150,
    createdBy: "manager",
  },
];

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL || "").hostname || "?";
  } catch {
    return "?";
  }
}

function daysAgo(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(10 + (n % 6), 15, 0, 0);
  return d;
}

function daysFromNow(n: number): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(17, 0, 0, 0);
  return d;
}

async function clearDemoRequests() {
  const existing = await prisma.maintenanceRequest.findMany({
    where: { requestNumber: { startsWith: DEMO_PREFIX } },
    select: { id: true },
  });
  if (existing.length === 0) return 0;
  const ids = existing.map((r) => r.id);
  await prisma.maintenanceTimeline.deleteMany({ where: { requestId: { in: ids } } });
  await prisma.maintenancePhoto.deleteMany({ where: { requestId: { in: ids } } });
  await prisma.maintenanceAttachment.deleteMany({ where: { requestId: { in: ids } } });
  // Clear optional FKs that point at these requests
  await prisma.calendarEvent.updateMany({
    where: { maintenanceRequestId: { in: ids } },
    data: { maintenanceRequestId: null },
  });
  await prisma.note.updateMany({
    where: { maintenanceRequestId: { in: ids } },
    data: { maintenanceRequestId: null },
  });
  await prisma.document.updateMany({
    where: { maintenanceRequestId: { in: ids } },
    data: { maintenanceRequestId: null },
  });
  await prisma.activityLog.updateMany({
    where: { maintenanceRequestId: { in: ids } },
    data: { maintenanceRequestId: null },
  });
  await prisma.maintenanceRequest.deleteMany({ where: { id: { in: ids } } });
  return existing.length;
}

async function main() {
  console.log(`→ Seeding maintenance demos on ${dbHost()} (count=${COUNT})`);

  const [manager, maintenance, admin] = await Promise.all([
    prisma.user.findFirst({
      where: { role: UserRole.PROPERTY_MANAGER, deletedAt: null },
      orderBy: { email: "asc" },
    }),
    prisma.user.findFirst({
      where: { role: UserRole.MAINTENANCE_STAFF, deletedAt: null },
      orderBy: { email: "asc" },
    }),
    prisma.user.findFirst({
      where: { role: UserRole.ADMINISTRATOR, deletedAt: null },
      orderBy: { email: "asc" },
    }),
  ]);

  const staffId = manager?.id || admin?.id;
  const assigneeId = maintenance?.id || staffId;
  if (!staffId) {
    throw new Error("No PROPERTY_MANAGER or ADMINISTRATOR user found — seed staff first.");
  }

  const leases = await prisma.lease.findMany({
    where: { status: LeaseStatus.ACTIVE, deletedAt: null },
    include: {
      unit: { include: { property: true } },
      tenant: { include: { user: true } },
    },
    take: 200,
    orderBy: { startDate: "desc" },
  });

  const vacantUnits = await prisma.unit.findMany({
    where: {
      deletedAt: null,
      leases: { none: { status: LeaseStatus.ACTIVE, deletedAt: null } },
    },
    include: { property: true },
    take: 80,
    orderBy: { updatedAt: "desc" },
  });

  if (leases.length === 0 && vacantUnits.length === 0) {
    throw new Error("No units/leases found — import portfolio or run db:seed first.");
  }

  const removed = await clearDemoRequests();
  if (removed > 0) console.log(`→ Removed ${removed} prior ${DEMO_PREFIX}* requests`);

  let created = 0;
  for (let i = 0; i < COUNT; i++) {
    const tmpl = TEMPLATES[i % TEMPLATES.length]!;
    const lease = leases.length ? leases[i % leases.length]! : null;
    const vacant = vacantUnits.length ? vacantUnits[i % vacantUnits.length]! : null;

    const useTenant = tmpl.needsTenant !== false && tmpl.createdBy === "tenant" && lease;
    const propertyId = useTenant
      ? lease!.unit.propertyId
      : lease?.unit.propertyId || vacant!.propertyId;
    const unitId = useTenant ? lease!.unitId : lease?.unitId || vacant!.id;
    const tenantId = useTenant ? lease!.tenantId : undefined;
    const unitLabel = useTenant
      ? lease!.unit.unitNumber
      : lease?.unit.unitNumber || vacant?.unitNumber || "?";
    const propName = useTenant
      ? lease!.unit.property.name
      : lease?.unit.property.name || vacant?.property.name || "Property";

    const createdById =
      useTenant && lease?.tenant.userId ? lease.tenant.userId : staffId;

    const vendor =
      tmpl.vendorIdx !== undefined ? VENDORS[tmpl.vendorIdx] : undefined;
    const done =
      tmpl.status === MaintenanceStatus.COMPLETED ||
      tmpl.status === MaintenanceStatus.CLOSED;

    const mr = await prisma.maintenanceRequest.create({
      data: {
        requestNumber: `${DEMO_PREFIX}${String(10001 + i)}`,
        propertyId,
        unitId,
        tenantId,
        category: tmpl.category,
        priority: tmpl.priority,
        status: tmpl.status,
        title: `${tmpl.title} — ${propName} / ${unitLabel}`,
        description: tmpl.description,
        assignedStaffId:
          tmpl.status === MaintenanceStatus.SUBMITTED ? undefined : assigneeId,
        createdById,
        vendor: vendor?.name,
        cost: tmpl.cost,
        completedAt: done ? daysAgo(2 + (i % 5)) : undefined,
        targetCompletion: done ? daysAgo(1) : daysFromNow(2 + (i % 12)),
        tenantNotes: tenantId ? "Please call or text before entering." : undefined,
        internalNotes: vendor
          ? `Vendor: ${vendor.name} ${vendor.phone}`
          : undefined,
        createdAt: daysAgo(1 + (i % 21)),
      },
    });

    const timeline: Array<{
      requestId: string;
      userId: string;
      action: string;
      oldValue?: string;
      newValue?: string;
      notes?: string;
      createdAt: Date;
    }> = [
      {
        requestId: mr.id,
        userId: createdById,
        action: "Request submitted",
        createdAt: daysAgo(1 + (i % 21)),
      },
    ];

    if (vendor) {
      timeline.push({
        requestId: mr.id,
        userId: staffId,
        action: "Vendor assigned",
        newValue: vendor.name,
        notes: vendor.phone,
        createdAt: new Date(daysAgo(1 + (i % 21)).getTime() + 60_000),
      });
    }

    if (tmpl.status !== MaintenanceStatus.SUBMITTED && assigneeId) {
      timeline.push({
        requestId: mr.id,
        userId: assigneeId,
        action: "Status changed",
        oldValue: "SUBMITTED",
        newValue: tmpl.status,
        createdAt: new Date(daysAgo(Math.max(0, (i % 21) - 1)).getTime() + 120_000),
      });
    }

    await prisma.maintenanceTimeline.createMany({ data: timeline });
    created += 1;
  }

  const open = await prisma.maintenanceRequest.count({
    where: {
      requestNumber: { startsWith: DEMO_PREFIX },
      status: {
        notIn: [MaintenanceStatus.COMPLETED, MaintenanceStatus.CLOSED],
      },
    },
  });

  console.log(
    `✓ Created ${created} demo maintenance requests (${open} open). View at /maintenance`
  );
  if (maintenance) {
    console.log(`  Assignee: ${maintenance.email}`);
  } else {
    console.log("  Note: no MAINTENANCE_STAFF user — assigned to manager/admin instead.");
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
