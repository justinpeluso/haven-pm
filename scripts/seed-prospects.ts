/**
 * Seed demo prospects against the current portfolio without wiping it.
 * Replaces only prior demos (email ends with @haven-demo.test).
 *
 * Usage:
 *   npm run db:seed:prospects
 *   COUNT=20 npx tsx scripts/seed-prospects.ts
 */
import {
  PrismaClient,
  UserRole,
  ProspectStatus,
  ShowingStatus,
  CalendarEventType,
} from "@prisma/client";

const prisma = new PrismaClient();
const DEMO_DOMAIN = "haven-demo.test";
const COUNT = Math.min(40, Math.max(8, Number(process.env.COUNT || 18)));

const LEAD_SOURCES = ["Zillow", "Apartments.com", "Referral", "Website", "Walk-in", "Craigslist"];

const NAMES = [
  "Chris Prospect",
  "Dana Applicant",
  "Evan Lead",
  "Fiona Walsh",
  "Gabe Ortiz",
  "Hannah Price",
  "Ian Delgado",
  "Jade Hoffman",
  "Kai Brennan",
  "Lena Soto",
  "Miles Grant",
  "Nora Vega",
  "Owen Blake",
  "Priya Shah",
  "Quinn Adler",
  "Rosa Mendoza",
  "Sam Whitaker",
  "Tina Cho",
  "Uri Feldman",
  "Vera Santos",
];

const STATUSES: ProspectStatus[] = [
  ProspectStatus.NEW,
  ProspectStatus.CONTACTED,
  ProspectStatus.SHOWING_SCHEDULED,
  ProspectStatus.APPLICATION_SENT,
  ProspectStatus.APPLICATION_RECEIVED,
  ProspectStatus.APPROVED,
  ProspectStatus.DENIED,
  ProspectStatus.LEASED,
  ProspectStatus.CONTACTED,
  ProspectStatus.SHOWING_SCHEDULED,
  ProspectStatus.NEW,
  ProspectStatus.APPLICATION_SENT,
  ProspectStatus.SHOWING_SCHEDULED,
  ProspectStatus.APPROVED,
  ProspectStatus.CONTACTED,
  ProspectStatus.NEW,
  ProspectStatus.APPLICATION_RECEIVED,
  ProspectStatus.SHOWING_SCHEDULED,
];

function dbHost(): string {
  try {
    return new URL(process.env.DATABASE_URL || "").hostname || "?";
  } catch {
    return "?";
  }
}

function daysFromNow(n: number, hour = 14): Date {
  const d = new Date();
  d.setDate(d.getDate() + n);
  d.setHours(hour, 0, 0, 0);
  return d;
}

async function clearDemoProspects() {
  const existing = await prisma.prospect.findMany({
    where: { email: { endsWith: `@${DEMO_DOMAIN}` } },
    select: { id: true },
  });
  if (existing.length === 0) return 0;
  const ids = existing.map((p) => p.id);

  // Showings for these prospects; calendar events titled with DEMO-PROSPECT
  await prisma.showing.deleteMany({ where: { prospectId: { in: ids } } });
  await prisma.prospectTimeline.deleteMany({ where: { prospectId: { in: ids } } });
  await prisma.prospectProperty.deleteMany({ where: { prospectId: { in: ids } } });
  await prisma.note.deleteMany({ where: { prospectId: { in: ids } } });
  await prisma.document.deleteMany({ where: { prospectId: { in: ids } } });
  await prisma.activityLog.deleteMany({ where: { prospectId: { in: ids } } });
  await prisma.calendarEvent.deleteMany({
    where: { title: { startsWith: "DEMO Showing:" } },
  });
  await prisma.prospect.deleteMany({ where: { id: { in: ids } } });
  return existing.length;
}

async function main() {
  console.log(`→ Seeding prospects on ${dbHost()} (count=${COUNT})`);

  const agents = await prisma.user.findMany({
    where: {
      deletedAt: null,
      role: { in: [UserRole.LEASING_AGENT, UserRole.PROPERTY_MANAGER, UserRole.ADMINISTRATOR] },
    },
    orderBy: { email: "asc" },
    take: 8,
  });
  if (agents.length === 0) throw new Error("No staff users found");

  const properties = await prisma.property.findMany({
    where: { deletedAt: null },
    include: {
      units: {
        where: { deletedAt: null },
        take: 2,
        orderBy: { unitNumber: "asc" },
      },
    },
    take: 60,
    orderBy: { name: "asc" },
  });
  if (properties.length === 0) {
    throw new Error("No properties found — import portfolio or run db:seed first.");
  }

  const removed = await clearDemoProspects();
  if (removed > 0) console.log(`→ Removed ${removed} prior demo prospects`);

  let created = 0;
  let showings = 0;

  for (let i = 0; i < COUNT; i++) {
    const name = NAMES[i % NAMES.length]!;
    const status = STATUSES[i % STATUSES.length]!;
    const property = properties[i % properties.length]!;
    const unit = property.units[0];
    const agent = agents[i % agents.length]!;
    const email = `demo.prospect${String(i + 1).padStart(2, "0")}@${DEMO_DOMAIN}`;

    const prospect = await prisma.prospect.create({
      data: {
        name: `${name}`,
        email,
        phone: `(412) 555-${String(4000 + i).padStart(4, "0")}`,
        leadSource: LEAD_SOURCES[i % LEAD_SOURCES.length],
        budget: 1200 + (i % 10) * 175,
        moveDate: daysFromNow(14 + (i % 45), 12),
        pets: i % 3 === 0 ? "No pets" : i % 3 === 1 ? "1 cat" : "1 dog",
        status,
        assignedAgentId: agent.id,
        internalNotes: `DEMO prospect interested in ${property.name}`,
        properties: { create: [{ propertyId: property.id }] },
        createdAt: daysFromNow(-(2 + (i % 20)), 11),
      },
    });

    await prisma.prospectTimeline.createMany({
      data: [
        {
          prospectId: prospect.id,
          userId: agent.id,
          action: "Prospect created",
          notes: "DEMO seed",
        },
        ...(status !== ProspectStatus.NEW
          ? [
              {
                prospectId: prospect.id,
                userId: agent.id,
                action: "Status changed",
                oldValue: "NEW",
                newValue: status,
              },
            ]
          : []),
      ],
    });

    const wantsShowing =
      status === ProspectStatus.SHOWING_SCHEDULED ||
      status === ProspectStatus.APPLICATION_SENT ||
      status === ProspectStatus.APPLICATION_RECEIVED ||
      (i % 4 === 0 && status !== ProspectStatus.DENIED && status !== ProspectStatus.ARCHIVED);

    if (wantsShowing) {
      const scheduledAt = daysFromNow(1 + (i % 12), 10 + (i % 6));
      await prisma.showing.create({
        data: {
          prospectId: prospect.id,
          propertyId: property.id,
          unitId: unit?.id,
          agentId: agent.id,
          scheduledAt,
          duration: 30,
          status: ShowingStatus.SCHEDULED,
          notes: `DEMO — meet at ${property.name}`,
        },
      });
      await prisma.calendarEvent.create({
        data: {
          title: `DEMO Showing: ${name}`,
          type: CalendarEventType.SHOWING,
          propertyId: property.id,
          unitId: unit?.id,
          assigneeId: agent.id,
          createdById: agent.id,
          startAt: scheduledAt,
          endAt: new Date(scheduledAt.getTime() + 30 * 60_000),
          color: "#3b82f6",
          notes: `DEMO prospect ${email}`,
        },
      });
      showings += 1;
    }

    created += 1;
  }

  console.log(`✓ Created ${created} demo prospects (${showings} showings). View at /prospects`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
