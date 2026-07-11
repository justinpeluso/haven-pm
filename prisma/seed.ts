import {
  PrismaClient,
  UserRole,
  PropertyStatus,
  UnitStatus,
  MaintenanceStatus,
  MaintenancePriority,
  MaintenanceCategory,
  ProspectStatus,
  CalendarEventType,
  DocumentType,
  NotificationType,
  ActivityAction,
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

const VENDORS = [
  { name: "Cascade HVAC Pros", category: "HVAC", phone: "(412) 555-1001", email: "dispatch@cascadehvac.test" },
  { name: "Bright Electric Co.", category: "Electrical", phone: "(412) 555-1002", email: "jobs@brightelectric.test" },
  { name: "HandyFix Services", category: "Handyman", phone: "(412) 555-1003", email: "hello@handyfix.test" },
  { name: "FlowRight Plumbing", category: "Plumbing", phone: "(412) 555-1004", email: "service@flowright.test" },
  { name: "GreenScape Maintenance", category: "Landscaping", phone: "(412) 555-1005", email: "crew@greenscape.test" },
] as const;

const PROPERTY_ADDRESSES = [
  { name: "Riverside Apartments", addressLine1: "1200 River Road", city: "Portland", zip: "97201" },
  { name: "Oak Street Townhomes", addressLine1: "450 Oak Street", city: "Portland", zip: "97205" },
  { name: "Sunset View Condos", addressLine1: "789 Sunset Boulevard", city: "Beaverton", zip: "97005" },
  { name: "Hawthorne Flats", addressLine1: "2100 Hawthorne Blvd", city: "Portland", zip: "97214" },
  { name: "Alberta Row Houses", addressLine1: "1520 NE Alberta St", city: "Portland", zip: "97211" },
  { name: "Division Street Lofts", addressLine1: "3400 SE Division St", city: "Portland", zip: "97202" },
  { name: "Pearl District Suites", addressLine1: "1120 NW Glisan St", city: "Portland", zip: "97209" },
  { name: "Sellwood Cottages", addressLine1: "820 SE Tacoma St", city: "Portland", zip: "97202" },
  { name: "Mississippi Avenue Homes", addressLine1: "4050 N Mississippi Ave", city: "Portland", zip: "97227" },
  { name: "Belmont Court", addressLine1: "2800 SE Belmont St", city: "Portland", zip: "97214" },
  { name: "Cedar Hills Residences", addressLine1: "9100 SW Cedar Hills Blvd", city: "Beaverton", zip: "97005" },
  { name: "Tigard Crossing", addressLine1: "12500 SW Main St", city: "Tigard", zip: "97223" },
  { name: "Lake Oswego Terrace", addressLine1: "400 A Ave", city: "Lake Oswego", zip: "97034" },
  { name: "Hillsboro Station", addressLine1: "220 SE 8th Ave", city: "Hillsboro", zip: "97123" },
  { name: "Gresham Park Apartments", addressLine1: "500 NE Division Pl", city: "Gresham", zip: "97030" },
  { name: "St Johns Village", addressLine1: "7200 N Lombard St", city: "Portland", zip: "97203" },
  { name: "Multnomah Village Homes", addressLine1: "7820 SW Capitol Hwy", city: "Portland", zip: "97219" },
  { name: "Kenton Flats", addressLine1: "8300 N Interstate Ave", city: "Portland", zip: "97217" },
  { name: "Woodstock Gardens", addressLine1: "4500 SE Woodstock Blvd", city: "Portland", zip: "97206" },
  { name: "Foster Road Townhomes", addressLine1: "6100 SE Foster Rd", city: "Portland", zip: "97206" },
  { name: "Powell Butte Residences", addressLine1: "3700 SE 122nd Ave", city: "Portland", zip: "97236" },
  { name: "Beaverton Creek Apartments", addressLine1: "1500 SW Murray Blvd", city: "Beaverton", zip: "97005" },
  { name: "Tualatin River Homes", addressLine1: "18800 SW Boones Ferry Rd", city: "Tualatin", zip: "97062" },
  { name: "Milwaukie Waterfront", addressLine1: "11000 SE Main St", city: "Milwaukie", zip: "97222" },
  { name: "Clackamas Ridge", addressLine1: "12000 SE 82nd Ave", city: "Happy Valley", zip: "97086" },
  { name: "Forest Grove Cottages", addressLine1: "2000 Pacific Ave", city: "Forest Grove", zip: "97116" },
  { name: "Cornelius Meadows", addressLine1: "900 Baseline St", city: "Cornelius", zip: "97113" },
  { name: "Sherwood Village", addressLine1: "16000 SW Langer Dr", city: "Sherwood", zip: "97140" },
  { name: "Wilsonville Commons", addressLine1: "29500 SW Town Center Loop", city: "Wilsonville", zip: "97070" },
  { name: "Canby Orchard Homes", addressLine1: "200 N Ivy St", city: "Canby", zip: "97013" },
] as const;

const TENANT_NAMES = [
  "Taylor Tenant", "Avery Brooks", "Jordan Lee", "Morgan Chen", "Riley Patel",
  "Casey Nguyen", "Quinn Morales", "Harper Singh", "Reese Kim", "Blake Torres",
];

const PROSPECT_NAMES = [
  "Chris Prospect", "Dana Applicant", "Evan Lead", "Fiona Walsh", "Gabe Ortiz",
  "Hannah Price", "Ian Delgado", "Jade Hoffman", "Kai Brennan", "Lena Soto",
  "Miles Grant", "Nora Vega", "Owen Blake", "Priya Shah", "Quinn Adler",
  "Rosa Mendoza", "Sam Whitaker", "Tina Cho", "Uri Feldman", "Vera Santos",
];

const LEAD_SOURCES = ["Zillow", "Apartments.com", "Referral", "Website", "Walk-in", "Craigslist"];

async function clearDatabase() {
  console.log("→ Clearing existing data...");
  // Child tables first
  await prisma.noteAttachment.deleteMany();
  await prisma.maintenancePhoto.deleteMany();
  await prisma.maintenanceAttachment.deleteMany();
  await prisma.maintenanceTimeline.deleteMany();
  await prisma.prospectTimeline.deleteMany();
  await prisma.prospectProperty.deleteMany();
  await prisma.showing.deleteMany();
  await prisma.calendarEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.message.deleteMany();
  await prisma.note.deleteMany();
  await prisma.document.deleteMany();
  await prisma.activityLog.deleteMany();
  await prisma.auditLog.deleteMany();
  await prisma.savedSearch.deleteMany();
  await prisma.inspection.deleteMany();
  await prisma.maintenanceRequest.deleteMany();
  await prisma.lease.deleteMany();
  await prisma.propertyPhoto.deleteMany();
  await prisma.unit.deleteMany();
  await prisma.tenant.deleteMany();
  await prisma.prospect.deleteMany();
  await prisma.property.deleteMany();
  await prisma.owner.deleteMany();
  await prisma.account.deleteMany();
  await prisma.session.deleteMany();
  await prisma.user.deleteMany();
  await prisma.setting.deleteMany();
  console.log("✓ Database cleared");
}

function julyShowingSlots(): Date[] {
  // 20 slots from July 15–31, 2026 (weekdays preferred, staggered times)
  const slots: Date[] = [];
  const times = [10, 11, 13, 14, 15, 16]; // hours
  let day = 15;
  let timeIdx = 0;

  while (slots.length < 20 && day <= 31) {
    const local = new Date(2026, 6, day, times[timeIdx % times.length], 0, 0);
    slots.push(local);
    timeIdx++;
    if (timeIdx % 2 === 0) day++; // ~2 showings per day
  }
  return slots;
}

async function main() {
  console.log("🌱 Seeding Haven PM database (expanded demo)...\n");

  await clearDatabase();

  const passwordHash = await bcrypt.hash("password123", 12);

  // ─── Core staff ──────────────────────────────────────────────────────────
  const admin = await prisma.user.create({
    data: {
      email: "admin@havenpm.com",
      name: "Alex Administrator",
      passwordHash,
      role: UserRole.ADMINISTRATOR,
      phone: "(412) 555-0100",
    },
  });

  const manager = await prisma.user.create({
    data: {
      email: "manager@havenpm.com",
      name: "Maria Manager",
      passwordHash,
      role: UserRole.PROPERTY_MANAGER,
      phone: "(412) 555-0101",
    },
  });

  const agents = await Promise.all([
    prisma.user.create({
      data: {
        email: "agent@havenpm.com",
        name: "Jordan Agent",
        passwordHash,
        role: UserRole.LEASING_AGENT,
        phone: "(412) 555-0102",
      },
    }),
    prisma.user.create({
      data: {
        email: "agent2@havenpm.com",
        name: "Riley Agent",
        passwordHash,
        role: UserRole.LEASING_AGENT,
        phone: "(412) 555-0112",
      },
    }),
    prisma.user.create({
      data: {
        email: "agent3@havenpm.com",
        name: "Casey Agent",
        passwordHash,
        role: UserRole.LEASING_AGENT,
        phone: "(412) 555-0122",
      },
    }),
  ]);

  const maintenance = await prisma.user.create({
    data: {
      email: "maintenance@havenpm.com",
      name: "Mike Technician",
      passwordHash,
      role: UserRole.MAINTENANCE_STAFF,
      phone: "(412) 555-0103",
    },
  });

  const office = await prisma.user.create({
    data: {
      email: "office@havenpm.com",
      name: "Sarah Office",
      passwordHash,
      role: UserRole.OFFICE_STAFF,
      phone: "(412) 555-0104",
    },
  });

  console.log("✓ Staff + 3 leasing agents created");

  // ─── Settings (incl. vendor directory for testing) ───────────────────────
  await prisma.setting.createMany({
    data: [
      { key: "payment_portal_url", value: "https://payments.example.com" },
      { key: "vendors", value: JSON.stringify(VENDORS) },
      { key: "messaging_portal_url", value: "https://my.quo.com/" },
      { key: "messaging_provider_name", value: "OpenPhone" },
      { key: "messaging_phone_number", value: "(412) 797-5007" },
      { key: "company_city", value: "Pittsburgh" },
      { key: "company_state", value: "PA" },
      { key: "company_zip", value: "15222" },
      { key: "company_timezone", value: "America/New_York" },
    ],
  });

  // ─── Owners ──────────────────────────────────────────────────────────────
  const owner1 = await prisma.owner.create({
    data: {
      name: "Riverside Holdings LLC",
      email: "contact@riversideholdings.com",
      phone: "(412) 555-0200",
      address: "100 Commerce St, Portland, OR 97201",
    },
  });

  const owner2 = await prisma.owner.create({
    data: {
      name: "Pacific Property Group",
      email: "info@pacificproperty.com",
      phone: "(412) 555-0201",
    },
  });

  const owners = [owner1, owner2];

  // ─── 30 Properties ───────────────────────────────────────────────────────
  const properties = [];
  for (let i = 0; i < PROPERTY_ADDRESSES.length; i++) {
    const addr = PROPERTY_ADDRESSES[i];
    const rent = 1400 + (i % 10) * 100;
    const property = await prisma.property.create({
      data: {
        name: addr.name,
        addressLine1: addr.addressLine1,
        city: addr.city,
        state: "OR",
        zipCode: addr.zip,
        status: PropertyStatus.ACTIVE,
        ownerId: owners[i % 2].id,
        squareFootage: 8000 + i * 500,
        bedrooms: 1 + (i % 3),
        bathrooms: 1 + (i % 2) * 0.5,
        rentAmount: rent,
        securityDeposit: rent,
        utilities: i % 2 === 0 ? ["Water", "Trash"] : ["Water"],
        appliances: ["Dishwasher", "Refrigerator"],
        amenities: i % 3 === 0 ? ["Parking", "Laundry"] : ["Parking"],
        parking: i % 2 === 0 ? "Covered garage" : "Surface lot",
        tags: ["demo"],
      },
    });
    properties.push(property);
  }

  console.log(`✓ ${properties.length} properties created`);

  // ─── Units (2 per property; first 5 properties fully occupied) ───────────
  const units = [];
  for (let i = 0; i < properties.length; i++) {
    const baseRent = Number(properties[i].rentAmount) || 1500;
    const fullyOccupied = i < 5;
    const u1 = await prisma.unit.create({
      data: {
        propertyId: properties[i].id,
        unitNumber: "101",
        status: fullyOccupied ? UnitStatus.OCCUPIED : UnitStatus.AVAILABLE,
        bedrooms: 1 + (i % 3),
        bathrooms: 1,
        rentAmount: baseRent,
        depositAmount: baseRent,
      },
    });
    const u2 = await prisma.unit.create({
      data: {
        propertyId: properties[i].id,
        unitNumber: "102",
        status: fullyOccupied ? UnitStatus.OCCUPIED : UnitStatus.AVAILABLE,
        bedrooms: 2,
        bathrooms: 2,
        rentAmount: baseRent + 200,
        depositAmount: baseRent + 200,
      },
    });
    units.push(u1, u2);
  }

  console.log(`✓ ${units.length} units created`);

  // ─── 10 Tenants + leases (fill both units on properties 0–4) ─────────────
  const tenants = [];
  for (let i = 0; i < 10; i++) {
    const email = i === 0 ? "tenant@havenpm.com" : `tenant${i + 1}@havenpm.com`;
    const user = await prisma.user.create({
      data: {
        email,
        name: TENANT_NAMES[i],
        passwordHash,
        role: UserRole.TENANT,
        phone: `(412) 555-02${String(i).padStart(2, "0")}`,
      },
    });

    const tenant = await prisma.tenant.create({
      data: {
        userId: user.id,
        phone: user.phone,
        emergencyContact: `Emergency for ${TENANT_NAMES[i]}`,
        emergencyPhone: `(412) 555-09${String(i).padStart(2, "0")}`,
        pets: i % 3 === 0 ? "1 cat (approved)" : i % 3 === 1 ? "None" : "1 dog (approved)",
      },
    });

    // Pair tenants onto properties 0–4 (2 units each → fully Occupied)
    const unit = units[i]; // units 0–9 = props 0–4, units 101 & 102
    await prisma.lease.create({
      data: {
        unitId: unit.id,
        tenantId: tenant.id,
        startDate: new Date("2025-01-01"),
        endDate: new Date("2026-12-31"),
        rentAmount: unit.rentAmount,
        depositAmount: unit.depositAmount,
        status: "ACTIVE",
        terms: "12-month lease with option to renew",
      },
    });

    tenants.push({ tenant, user });
  }

  console.log(`✓ ${tenants.length} tenants + leases created (5 fully occupied properties)`);

  // ─── 20 Prospects (linked to first 20 properties) ────────────────────────
  const prospects = [];
  for (let i = 0; i < 20; i++) {
    const status =
      i < 20
        ? ProspectStatus.SHOWING_SCHEDULED
        : ProspectStatus.NEW;
    const prospect = await prisma.prospect.create({
      data: {
        name: PROSPECT_NAMES[i],
        email: `prospect${i + 1}@email.com`,
        phone: `(412) 555-03${String(i).padStart(2, "0")}`,
        leadSource: LEAD_SOURCES[i % LEAD_SOURCES.length],
        budget: 1500 + (i % 8) * 150,
        moveDate: new Date(2026, 7 + (i % 3), 1 + (i % 20)),
        pets: i % 4 === 0 ? "No pets" : i % 4 === 1 ? "1 cat" : "1 dog",
        status,
        internalNotes: `Interested in ${PROPERTY_ADDRESSES[i].name}`,
        properties: {
          create: [{ propertyId: properties[i].id }],
        },
      },
    });

    await prisma.prospectTimeline.createMany({
      data: [
        { prospectId: prospect.id, userId: agents[i % 3].id, action: "Prospect created" },
        {
          prospectId: prospect.id,
          userId: agents[i % 3].id,
          action: "Status changed",
          oldValue: "NEW",
          newValue: "SHOWING_SCHEDULED",
        },
      ],
    });

    prospects.push(prospect);
  }

  console.log(`✓ ${prospects.length} prospects created (linked to 20 properties)`);

  // ─── Showings July 15–31, split evenly across 3 agents ───────────────────
  const showingSlots = julyShowingSlots();
  const showingsCreated = [];

  for (let i = 0; i < 20; i++) {
    const agent = agents[i % 3];
    const scheduledAt = showingSlots[i];
    const property = properties[i];
    const unit = units[i * 2 + 1]; // available unit 102

    const showing = await prisma.showing.create({
      data: {
        prospectId: prospects[i].id,
        propertyId: property.id,
        unitId: unit.id,
        agentId: agent.id,
        scheduledAt,
        duration: 30,
        status: "SCHEDULED",
        notes: `Meet at ${property.name} lobby`,
      },
    });

    await prisma.calendarEvent.create({
      data: {
        title: `Showing: ${prospects[i].name}`,
        type: CalendarEventType.SHOWING,
        propertyId: property.id,
        unitId: unit.id,
        assigneeId: agent.id,
        createdById: agent.id,
        startAt: scheduledAt,
        endAt: new Date(scheduledAt.getTime() + 30 * 60000),
        color: "#3b82f6",
        notes: `Agent: ${agent.name}`,
      },
    });

    showingsCreated.push({ agent: agent.name, when: scheduledAt, prospect: prospects[i].name });
  }

  // Extra calendar events: staff, inspections, move-ins, move-outs
  await prisma.calendarEvent.createMany({
    data: [
      {
        title: "Team Meeting",
        type: CalendarEventType.STAFF_EVENT,
        assigneeId: manager.id,
        createdById: admin.id,
        startAt: new Date(2026, 6, 17, 9, 0, 0),
        endAt: new Date(2026, 6, 17, 10, 0, 0),
        color: "#6b7280",
        notes: "Weekly staff sync",
      },
      {
        title: "Portfolio Inspection Sweep",
        type: CalendarEventType.INSPECTION,
        assigneeId: manager.id,
        createdById: manager.id,
        startAt: new Date(2026, 6, 22, 9, 0, 0),
        endAt: new Date(2026, 6, 22, 12, 0, 0),
        color: "#8b5cf6",
      },
      {
        title: `Move-in: ${TENANT_NAMES[0]} — Unit 101`,
        type: CalendarEventType.MOVE_IN,
        propertyId: properties[0].id,
        unitId: units[0].id,
        assigneeId: manager.id,
        createdById: office.id,
        startAt: new Date(2026, 6, 16, 10, 0, 0),
        endAt: new Date(2026, 6, 16, 12, 0, 0),
        color: "#22c55e",
        notes: "Keys + walkthrough at leasing office",
      },
      {
        title: `Move-in: ${TENANT_NAMES[2]} — Unit 101`,
        type: CalendarEventType.MOVE_IN,
        propertyId: properties[1].id,
        unitId: units[2].id,
        assigneeId: agents[0].id,
        createdById: office.id,
        startAt: new Date(2026, 6, 20, 14, 0, 0),
        endAt: new Date(2026, 6, 20, 16, 0, 0),
        color: "#22c55e",
        notes: "Utility transfer confirmation needed",
      },
      {
        title: `Move-out: ${TENANT_NAMES[8]} — Unit 101`,
        type: CalendarEventType.MOVE_OUT,
        propertyId: properties[4].id,
        unitId: units[8].id,
        assigneeId: manager.id,
        createdById: office.id,
        startAt: new Date(2026, 6, 25, 9, 0, 0),
        endAt: new Date(2026, 6, 25, 11, 0, 0),
        color: "#ef4444",
        notes: "Final inspection + deposit walkthrough",
      },
      {
        title: `Move-out: ${TENANT_NAMES[9]} — Unit 102`,
        type: CalendarEventType.MOVE_OUT,
        propertyId: properties[4].id,
        unitId: units[9].id,
        assigneeId: maintenance.id,
        createdById: manager.id,
        startAt: new Date(2026, 6, 28, 13, 0, 0),
        endAt: new Date(2026, 6, 28, 15, 0, 0),
        color: "#ef4444",
        notes: "Turnover cleaning after move-out",
      },
    ],
  });

  console.log(`✓ ${showingsCreated.length} July showings + move-in/out events booked`);

  // ─── Maintenance requests (12+) incl. 5 vendor jobs ──────────────────────
  const maintenanceJobs: Array<{
    vendor?: (typeof VENDORS)[number];
    category: MaintenanceCategory;
    priority: MaintenancePriority;
    status: MaintenanceStatus;
    title: string;
    description: string;
    propertyIdx: number;
    unitIdx: number;
    tenantIdx?: number;
    cost?: number;
    createdBy: "manager" | "tenant";
  }> = [
    {
      vendor: VENDORS[0],
      category: MaintenanceCategory.HVAC,
      priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.IN_PROGRESS,
      title: "AC not cooling — Unit 101",
      description: "System runs but won't drop below 78°F. Call Cascade HVAC.",
      propertyIdx: 0,
      unitIdx: 0,
      tenantIdx: 0,
      createdBy: "tenant",
    },
    {
      vendor: VENDORS[1],
      category: MaintenanceCategory.ELECTRICAL,
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.IN_PROGRESS,
      title: "Replace hallway light fixture",
      description: "Flickering fixture in common hallway. Bright Electric scheduled.",
      propertyIdx: 1,
      unitIdx: 2,
      cost: 125.5,
      createdBy: "manager",
    },
    {
      vendor: VENDORS[2],
      category: MaintenanceCategory.GENERAL,
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.ASSIGNED,
      title: "Repair closet door + patch drywall",
      description: "Handyman punch-list after move-out.",
      propertyIdx: 2,
      unitIdx: 4,
      createdBy: "manager",
    },
    {
      vendor: VENDORS[3],
      category: MaintenanceCategory.PLUMBING,
      priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.ASSIGNED,
      title: "Kitchen sink leaking",
      description: "P-trap drip under sink. FlowRight Plumbing on call.",
      propertyIdx: 0,
      unitIdx: 0,
      tenantIdx: 0,
      createdBy: "tenant",
    },
    {
      vendor: VENDORS[4],
      category: MaintenanceCategory.LANDSCAPING,
      priority: MaintenancePriority.LOW,
      status: MaintenanceStatus.SCHEDULED,
      title: "Front lawn irrigation repair",
      description: "Broken sprinkler head near entry. GreenScape to fix.",
      propertyIdx: 3,
      unitIdx: 6,
      createdBy: "manager",
    },
    {
      category: MaintenanceCategory.APPLIANCE,
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.SUBMITTED,
      title: "Dishwasher not draining",
      description: "Standing water at bottom of dishwasher after every cycle.",
      propertyIdx: 0,
      unitIdx: 1,
      tenantIdx: 1,
      createdBy: "tenant",
    },
    {
      category: MaintenanceCategory.PEST_CONTROL,
      priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.SUBMITTED,
      title: "Ant infestation in kitchen",
      description: "Trail of ants along baseboards and under sink.",
      propertyIdx: 2,
      unitIdx: 4,
      tenantIdx: 4,
      createdBy: "tenant",
    },
    {
      category: MaintenanceCategory.STRUCTURAL,
      priority: MaintenancePriority.EMERGENCY,
      status: MaintenanceStatus.IN_PROGRESS,
      title: "Ceiling water stain spreading",
      description: "Brown stain growing above living room — possible roof leak.",
      propertyIdx: 2,
      unitIdx: 5,
      tenantIdx: 5,
      createdBy: "tenant",
    },
    {
      category: MaintenanceCategory.HVAC,
      priority: MaintenancePriority.LOW,
      status: MaintenanceStatus.COMPLETED,
      title: "Replace furnace filter",
      description: "Quarterly filter swap completed.",
      propertyIdx: 3,
      unitIdx: 6,
      tenantIdx: 6,
      cost: 45,
      createdBy: "manager",
    },
    {
      category: MaintenanceCategory.ELECTRICAL,
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.WAITING_ON_PARTS,
      title: "Outlet sparking in bedroom",
      description: "GFCI outlet trips and sparked once. Parts ordered.",
      propertyIdx: 3,
      unitIdx: 7,
      tenantIdx: 7,
      createdBy: "tenant",
    },
    {
      category: MaintenanceCategory.PLUMBING,
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.SCHEDULED,
      title: "Toilet running continuously",
      description: "Flapper likely worn — scheduled for Friday morning.",
      propertyIdx: 4,
      unitIdx: 8,
      tenantIdx: 8,
      createdBy: "tenant",
    },
    {
      category: MaintenanceCategory.GENERAL,
      priority: MaintenancePriority.LOW,
      status: MaintenanceStatus.CLOSED,
      title: "Broken blinds in living room",
      description: "Slats snapped — replaced and closed out.",
      propertyIdx: 4,
      unitIdx: 9,
      tenantIdx: 9,
      cost: 80,
      createdBy: "tenant",
    },
  ];

  for (let i = 0; i < maintenanceJobs.length; i++) {
    const job = maintenanceJobs[i];
    const createdById =
      job.createdBy === "tenant" && job.tenantIdx !== undefined
        ? tenants[job.tenantIdx].user.id
        : manager.id;

    const mr = await prisma.maintenanceRequest.create({
      data: {
        requestNumber: `MR-2026-${20001 + i}`,
        propertyId: properties[job.propertyIdx].id,
        unitId: units[job.unitIdx].id,
        tenantId: job.tenantIdx !== undefined ? tenants[job.tenantIdx].tenant.id : undefined,
        category: job.category,
        priority: job.priority,
        status: job.status,
        title: job.title,
        description: job.description,
        assignedStaffId:
          job.status === MaintenanceStatus.SUBMITTED ? undefined : maintenance.id,
        createdById,
        vendor: job.vendor?.name,
        cost: job.cost,
        completedAt:
          job.status === MaintenanceStatus.COMPLETED || job.status === MaintenanceStatus.CLOSED
            ? new Date(2026, 6, 10, 15, 0, 0)
            : undefined,
        targetCompletion: new Date(2026, 6, 18 + (i % 10), 17, 0, 0),
        tenantNotes: job.tenantIdx !== undefined ? "Please call before entering" : undefined,
      },
    });

    const timeline: Array<{
      requestId: string;
      userId: string;
      action: string;
      oldValue?: string;
      newValue?: string;
      notes?: string;
    }> = [{ requestId: mr.id, userId: createdById, action: "Request submitted" }];

    if (job.vendor) {
      timeline.push({
        requestId: mr.id,
        userId: manager.id,
        action: "Vendor assigned",
        newValue: job.vendor.name,
        notes: `${job.vendor.category} — ${job.vendor.phone}`,
      });
    }

    if (job.status !== MaintenanceStatus.SUBMITTED) {
      timeline.push({
        requestId: mr.id,
        userId: maintenance.id,
        action: "Status changed",
        oldValue: "SUBMITTED",
        newValue: job.status,
      });
    }

    await prisma.maintenanceTimeline.createMany({ data: timeline });
  }

  console.log(`✓ ${maintenanceJobs.length} maintenance requests created (incl. ${VENDORS.length} vendor jobs)`);

  // ─── Documents / notes / messages / notifications (sample) ───────────────
  await prisma.document.createMany({
    data: [
      {
        name: "Lease Agreement — Unit 101",
        fileName: "lease-101.pdf",
        url: "/documents/lease-101.pdf",
        mimeType: "application/pdf",
        type: DocumentType.LEASE,
        propertyId: properties[0].id,
        unitId: units[0].id,
        tenantId: tenants[0].tenant.id,
      },
      {
        name: "Move-in Checklist",
        fileName: "movein-checklist.pdf",
        url: "/documents/movein-checklist.pdf",
        mimeType: "application/pdf",
        type: DocumentType.MOVE_IN_CHECKLIST,
        tenantId: tenants[0].tenant.id,
      },
      {
        name: "Annual Inspection Report",
        fileName: "inspection-2025.pdf",
        url: "/documents/inspection-2025.pdf",
        mimeType: "application/pdf",
        type: DocumentType.INSPECTION_REPORT,
        propertyId: properties[0].id,
      },
      {
        name: "Rental Application — Dana",
        fileName: "application-dana.pdf",
        url: "/documents/application-dana.pdf",
        mimeType: "application/pdf",
        type: DocumentType.SIGNED_DOCUMENT,
        prospectId: prospects[1].id,
      },
    ],
  });

  await prisma.note.createMany({
    data: [
      {
        content: "Building exterior repainted Q1 2026.",
        authorId: manager.id,
        propertyId: properties[0].id,
      },
      {
        content: "Very interested — budget flexible for July move-in.",
        authorId: agents[0].id,
        prospectId: prospects[0].id,
      },
    ],
  });

  await prisma.message.createMany({
    data: [
      {
        senderId: tenants[0].user.id,
        receiverId: manager.id,
        tenantId: tenants[0].tenant.id,
        subject: "Sink leak update",
        body: "The leak seems to be getting worse. Any update on the repair?",
      },
      {
        senderId: manager.id,
        receiverId: tenants[0].user.id,
        tenantId: tenants[0].tenant.id,
        subject: "Re: Sink leak update",
        body: "FlowRight Plumbing is scheduled. Mike will meet them on site.",
      },
      {
        senderId: agents[0].id,
        receiverId: office.id,
        subject: "July showing batch",
        body: "20 showings booked Jul 15–31 across Jordan, Riley, and Casey.",
      },
    ],
  });

  await prisma.notification.createMany({
    data: [
      {
        userId: manager.id,
        type: NotificationType.MAINTENANCE_REQUEST,
        title: "Vendor work orders ready",
        message: "5 vendor jobs seeded (HVAC, Electric, Handyman, Plumbing, Landscaping)",
        link: "/maintenance",
      },
      {
        userId: agents[0].id,
        type: NotificationType.SHOWING_BOOKED,
        title: "July showings booked",
        message: "Your July 15+ showing slate is on the calendar",
        link: "/calendar",
      },
      {
        userId: agents[1].id,
        type: NotificationType.SHOWING_BOOKED,
        title: "July showings booked",
        message: "Your July 15+ showing slate is on the calendar",
        link: "/calendar",
      },
      {
        userId: agents[2].id,
        type: NotificationType.SHOWING_BOOKED,
        title: "July showings booked",
        message: "Your July 15+ showing slate is on the calendar",
        link: "/calendar",
      },
    ],
  });

  await prisma.activityLog.createMany({
    data: [
      {
        action: ActivityAction.CREATED,
        entityType: "Property",
        entityId: properties[0].id,
        userId: admin.id,
        propertyId: properties[0].id,
      },
      {
        action: ActivityAction.CREATED,
        entityType: "Prospect",
        entityId: prospects[0].id,
        userId: agents[0].id,
        prospectId: prospects[0].id,
      },
    ],
  });

  console.log("✓ Documents, notes, messages, notifications created");

  // Per-agent showing counts
  const byAgent = [0, 0, 0];
  for (let i = 0; i < 20; i++) byAgent[i % 3]++;

  console.log("\n✅ Seed complete!\n");
  console.log("Counts:");
  console.log(`  Properties:  ${properties.length}`);
  console.log(`  Units:       ${units.length}`);
  console.log(`  Tenants:     ${tenants.length}`);
  console.log(`  Prospects:   ${prospects.length}`);
  console.log(`  Agents:      ${agents.length} (showings: ${byAgent.join(" / ")})`);
  console.log(`  Showings:    ${showingsCreated.length} (Jul 15–31, 2026)`);
  console.log(`  Vendors:     ${VENDORS.length}`);
  console.log("\nDemo logins (password: password123):");
  console.log("  admin@havenpm.com / manager@havenpm.com / office@havenpm.com");
  console.log("  agent@havenpm.com / agent2@havenpm.com / agent3@havenpm.com");
  console.log("  maintenance@havenpm.com");
  console.log("  tenant@havenpm.com … tenant10@havenpm.com");
  console.log("\nVendors:");
  for (const v of VENDORS) {
    console.log(`  • ${v.name} (${v.category}) — ${v.phone}`);
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
