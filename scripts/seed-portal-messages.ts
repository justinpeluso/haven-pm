/**
 * Seed demo tenant portal logins + ~10 fake portal messages for inbox testing.
 * Idempotent: replaces prior portal-demo tenants / messages.
 *
 * Usage:
 *   npx tsx scripts/seed-portal-messages.ts
 *   npm run db:seed:portal
 */
import {
  MessageStatus,
  PortalMessagePriority,
  PortalMessageType,
  PrismaClient,
  UserRole,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();
const PASSWORD = "Chomps123";
const DEMO_EMAIL_PREFIX = "portal-demo";

/** Primary play-around tenant login. */
const DEMO_PORTAL = {
  email: "portal@havenpm.com",
  name: "Demo Tenant",
  phone: "(412) 555-7788",
} as const;

const FAKE_TENANTS = [
  {
    email: `${DEMO_EMAIL_PREFIX}1@havenpm.com`,
    name: "Mia Chen",
    phone: "(412) 555-2201",
  },
  {
    email: `${DEMO_EMAIL_PREFIX}2@havenpm.com`,
    name: "Jordan Blake",
    phone: "(412) 555-2202",
  },
  {
    email: `${DEMO_EMAIL_PREFIX}3@havenpm.com`,
    name: "Priya Nair",
    phone: "(412) 555-2203",
  },
  {
    email: `${DEMO_EMAIL_PREFIX}4@havenpm.com`,
    name: "Sam Ortiz",
    phone: "(412) 555-2204",
  },
  {
    email: `${DEMO_EMAIL_PREFIX}5@havenpm.com`,
    name: "Elena Rossi",
    phone: "(412) 555-2205",
  },
  {
    email: `${DEMO_EMAIL_PREFIX}6@havenpm.com`,
    name: "Marcus Webb",
    phone: "(412) 555-2206",
  },
  {
    email: `${DEMO_EMAIL_PREFIX}7@havenpm.com`,
    name: "Aisha Rahman",
    phone: "(412) 555-2207",
  },
  {
    email: `${DEMO_EMAIL_PREFIX}8@havenpm.com`,
    name: "Noah Patel",
    phone: "(412) 555-2208",
  },
  {
    email: `${DEMO_EMAIL_PREFIX}9@havenpm.com`,
    name: "Casey Morgan",
    phone: "(412) 555-2209",
  },
  {
    email: `${DEMO_EMAIL_PREFIX}10@havenpm.com`,
    name: "Lena Okonkwo",
    phone: "(412) 555-2210",
  },
] as const;

type MessageSeed = {
  tenantEmail: string;
  type: PortalMessageType;
  priority: PortalMessagePriority;
  subject: string;
  body: string;
  unread?: boolean;
  /** Staff claimed this thread — seeds as READ + agentWorking for filter QA. */
  agentWorking?: boolean;
  hoursAgo: number;
};

const MESSAGES: MessageSeed[] = [
  {
    tenantEmail: FAKE_TENANTS[0].email,
    type: PortalMessageType.BILLING,
    priority: PortalMessagePriority.MEDIUM,
    subject: "Rent receipt for June",
    body: "Hi — can you resend my June rent receipt? My accountant needs it by Friday.",
    unread: true,
    hoursAgo: 2,
  },
  {
    tenantEmail: FAKE_TENANTS[1].email,
    type: PortalMessageType.MAINTENANCE,
    priority: PortalMessagePriority.HIGH,
    subject: "Kitchen sink slow drain",
    body: "Kitchen sink has been draining slowly for a few days. Not fully clogged yet, but getting worse. Prefer a weekday afternoon.",
    // Claimed by office — exercises Agent working filter / yellow marker.
    unread: false,
    agentWorking: true,
    hoursAgo: 5,
  },
  {
    tenantEmail: FAKE_TENANTS[2].email,
    type: PortalMessageType.NOISE,
    priority: PortalMessagePriority.URGENT,
    subject: "Loud music past midnight",
    body: "Unit above us had loud music again after midnight last night. Second time this week. Can someone follow up?",
    // Second claimed thread for multi-row working-state QA.
    unread: false,
    agentWorking: true,
    hoursAgo: 8,
  },
  {
    tenantEmail: FAKE_TENANTS[3].email,
    type: PortalMessageType.LEASE,
    priority: PortalMessagePriority.MEDIUM,
    subject: "Lease renewal question",
    body: "Our lease ends in 60 days. We’d like to renew for another year — is there a renewal packet or rent change we should expect?",
    unread: true,
    hoursAgo: 12,
  },
  {
    tenantEmail: FAKE_TENANTS[4].email,
    type: PortalMessageType.GENERAL,
    priority: PortalMessagePriority.LOW,
    subject: "Package locker access",
    body: "Amazon left a package notice but I can’t open the lobby locker. Who do I contact for the code?",
    unread: true,
    hoursAgo: 18,
  },
  {
    tenantEmail: FAKE_TENANTS[5].email,
    type: PortalMessageType.BILLING,
    priority: PortalMessagePriority.HIGH,
    subject: "Late fee dispute",
    body: "I paid online on the 1st but still see a late fee. Payment confirmation #HP-44821 attached in my email if you need it.",
    unread: true,
    hoursAgo: 26,
  },
  {
    tenantEmail: FAKE_TENANTS[6].email,
    type: PortalMessageType.MAINTENANCE,
    priority: PortalMessagePriority.URGENT,
    subject: "No hot water",
    body: "No hot water since this morning. Tried resetting the breaker. Two adults and a toddler here — please call when you can send someone.",
    unread: true,
    hoursAgo: 3,
  },
  {
    tenantEmail: FAKE_TENANTS[7].email,
    type: PortalMessageType.OTHER,
    priority: PortalMessagePriority.LOW,
    subject: "Parking permit sticker",
    body: "Need a replacement visitor parking sticker — the old one cracked off. Happy to pick it up at the office.",
    unread: false,
    hoursAgo: 48,
  },
  {
    tenantEmail: FAKE_TENANTS[8].email,
    type: PortalMessageType.LEASE,
    priority: PortalMessagePriority.MEDIUM,
    subject: "Adding a roommate",
    body: "I’d like to add my partner to the lease starting next month. What’s the screening / application process?",
    unread: true,
    hoursAgo: 30,
  },
  {
    tenantEmail: FAKE_TENANTS[9].email,
    type: PortalMessageType.GENERAL,
    priority: PortalMessagePriority.MEDIUM,
    subject: "Smoke detector chirping",
    body: "Hallway smoke detector chirps every few minutes. Battery maybe? It’s keeping us up at night.",
    unread: true,
    hoursAgo: 9,
  },
];

async function upsertTenant(opts: {
  email: string;
  name: string;
  phone: string;
  passwordHash: string;
}) {
  const user = await prisma.user.upsert({
    where: { email: opts.email },
    create: {
      email: opts.email,
      name: opts.name,
      passwordHash: opts.passwordHash,
      role: UserRole.TENANT,
      phone: opts.phone,
      isActive: true,
    },
    update: {
      name: opts.name,
      passwordHash: opts.passwordHash,
      role: UserRole.TENANT,
      phone: opts.phone,
      isActive: true,
      deletedAt: null,
    },
  });

  const tenant = await prisma.tenant.upsert({
    where: { userId: user.id },
    create: {
      userId: user.id,
      phone: opts.phone,
      emergencyContact: `${opts.name} emergency`,
      emergencyPhone: opts.phone,
    },
    update: {
      phone: opts.phone,
      deletedAt: null,
    },
  });

  return { user, tenant };
}

async function main() {
  const passwordHash = await bcrypt.hash(PASSWORD, 12);

  const staff = await prisma.user.findFirst({
    where: {
      isActive: true,
      deletedAt: null,
      role: {
        in: [
          UserRole.ADMINISTRATOR,
          UserRole.PROPERTY_MANAGER,
          UserRole.OFFICE_STAFF,
        ],
      },
    },
    orderBy: { createdAt: "asc" },
  });
  if (!staff) {
    throw new Error("No staff user found to receive portal messages.");
  }

  // Clear prior demo portal messages from portal-demo* + portal@ tenants
  const demoEmails = [
    DEMO_PORTAL.email,
    ...FAKE_TENANTS.map((t) => t.email),
  ];
  const demoUsers = await prisma.user.findMany({
    where: { email: { in: [...demoEmails] } },
    select: { id: true, tenantProfile: { select: { id: true } } },
  });
  const demoTenantIds = demoUsers
    .map((u) => u.tenantProfile?.id)
    .filter((id): id is string => !!id);

  if (demoTenantIds.length) {
    const deleted = await prisma.message.deleteMany({
      where: { tenantId: { in: demoTenantIds }, type: { not: null } },
    });
    console.log(`Cleared ${deleted.count} prior demo portal messages`);
  }

  const demo = await upsertTenant({
    ...DEMO_PORTAL,
    passwordHash,
  });
  console.log(`✓ ${DEMO_PORTAL.email} → ${DEMO_PORTAL.name} (play login)`);

  const byEmail = new Map<string, { userId: string; tenantId: string; phone: string }>();
  byEmail.set(DEMO_PORTAL.email, {
    userId: demo.user.id,
    tenantId: demo.tenant.id,
    phone: DEMO_PORTAL.phone,
  });

  for (const t of FAKE_TENANTS) {
    const row = await upsertTenant({ ...t, passwordHash });
    byEmail.set(t.email, {
      userId: row.user.id,
      tenantId: row.tenant.id,
      phone: t.phone,
    });
    console.log(`✓ ${t.email} → ${t.name}`);
  }

  // One sample from the play login too
  const playMessage: MessageSeed = {
    tenantEmail: DEMO_PORTAL.email,
    type: PortalMessageType.GENERAL,
    priority: PortalMessagePriority.MEDIUM,
    subject: "Testing the tenant portal",
    body: "This is the Demo Tenant play account. Feel free to send more messages from here while testing.",
    unread: true,
    hoursAgo: 1,
  };

  let created = 0;
  for (const m of [...MESSAGES, playMessage]) {
    const tenant = byEmail.get(m.tenantEmail);
    if (!tenant) continue;
    const createdAt = new Date(Date.now() - m.hoursAgo * 60 * 60 * 1000);
    const agentWorking = m.agentWorking === true;
    // Claiming marks the message read in the app; keep seed consistent.
    const unread = agentWorking ? false : m.unread !== false;
    await prisma.message.create({
      data: {
        senderId: tenant.userId,
        receiverId: staff.id,
        tenantId: tenant.tenantId,
        subject: m.subject,
        body: m.body,
        type: m.type,
        priority: m.priority,
        callbackPhone: tenant.phone,
        status: unread ? MessageStatus.SENT : MessageStatus.READ,
        agentWorking,
        readAt: unread ? null : createdAt,
        createdAt,
      },
    });
    created += 1;
  }

  const workingCount = [...MESSAGES, playMessage].filter((m) => m.agentWorking).length;
  console.log(`\nCreated ${created} portal messages (inbox receiver: ${staff.email})`);
  console.log(`  ${workingCount} seeded with agentWorking=true (for inbox filter QA)`);
  console.log(`\nDemo tenant portal login (password: ${PASSWORD}):`);
  console.log(`  ${DEMO_PORTAL.email} → ${DEMO_PORTAL.name}`);
  console.log(`Also: tenant@havenpm.com (if seeded) and portal-demo1@…portal-demo10@`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
