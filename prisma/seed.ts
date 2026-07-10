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
} from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding Haven PM database...");

  const passwordHash = await bcrypt.hash("password123", 12);

  // ─── Users ───────────────────────────────────────────────────────────────
  const admin = await prisma.user.upsert({
    where: { email: "admin@havenpm.com" },
    update: {},
    create: {
      email: "admin@havenpm.com",
      name: "Alex Administrator",
      passwordHash,
      role: UserRole.ADMINISTRATOR,
      phone: "555-0100",
    },
  });

  const manager = await prisma.user.upsert({
    where: { email: "manager@havenpm.com" },
    update: {},
    create: {
      email: "manager@havenpm.com",
      name: "Maria Manager",
      passwordHash,
      role: UserRole.PROPERTY_MANAGER,
      phone: "555-0101",
    },
  });

  const agent = await prisma.user.upsert({
    where: { email: "agent@havenpm.com" },
    update: {},
    create: {
      email: "agent@havenpm.com",
      name: "Jordan Agent",
      passwordHash,
      role: UserRole.LEASING_AGENT,
      phone: "555-0102",
    },
  });

  const maintenance = await prisma.user.upsert({
    where: { email: "maintenance@havenpm.com" },
    update: {},
    create: {
      email: "maintenance@havenpm.com",
      name: "Mike Technician",
      passwordHash,
      role: UserRole.MAINTENANCE_STAFF,
      phone: "555-0103",
    },
  });

  const office = await prisma.user.upsert({
    where: { email: "office@havenpm.com" },
    update: {},
    create: {
      email: "office@havenpm.com",
      name: "Sarah Office",
      passwordHash,
      role: UserRole.OFFICE_STAFF,
      phone: "555-0104",
    },
  });

  const tenantUser = await prisma.user.upsert({
    where: { email: "tenant@havenpm.com" },
    update: {},
    create: {
      email: "tenant@havenpm.com",
      name: "Taylor Tenant",
      passwordHash,
      role: UserRole.TENANT,
      phone: "555-0105",
    },
  });

  console.log("✓ Users created");

  // ─── Settings ────────────────────────────────────────────────────────────
  await prisma.setting.upsert({
    where: { key: "payment_portal_url" },
    update: {},
    create: {
      key: "payment_portal_url",
      value: "https://payments.example.com",
    },
  });

  // ─── Owners ──────────────────────────────────────────────────────────────
  const owner1 = await prisma.owner.create({
    data: {
      name: "Riverside Holdings LLC",
      email: "contact@riversideholdings.com",
      phone: "555-0200",
      address: "100 Commerce St, Portland, OR 97201",
    },
  });

  const owner2 = await prisma.owner.create({
    data: {
      name: "Pacific Property Group",
      email: "info@pacificproperty.com",
      phone: "555-0201",
    },
  });

  console.log("✓ Owners created");

  // ─── Properties ──────────────────────────────────────────────────────────
  const property1 = await prisma.property.create({
    data: {
      name: "Riverside Apartments",
      addressLine1: "1200 River Road",
      city: "Portland",
      state: "OR",
      zipCode: "97201",
      status: PropertyStatus.ACTIVE,
      ownerId: owner1.id,
      squareFootage: 45000,
      bedrooms: 2,
      bathrooms: 2,
      rentAmount: 1850,
      securityDeposit: 1850,
      utilities: ["Water", "Trash"],
      appliances: ["Dishwasher", "Microwave", "Refrigerator"],
      amenities: ["Pool", "Fitness Center", "Parking"],
      parking: "Covered garage",
      tags: ["multifamily", "downtown"],
    },
  });

  const property2 = await prisma.property.create({
    data: {
      name: "Oak Street Townhomes",
      addressLine1: "450 Oak Street",
      city: "Portland",
      state: "OR",
      zipCode: "97205",
      status: PropertyStatus.ACTIVE,
      ownerId: owner2.id,
      squareFootage: 32000,
      bedrooms: 3,
      bathrooms: 2.5,
      rentAmount: 2400,
      securityDeposit: 2400,
      utilities: ["Water"],
      appliances: ["Washer", "Dryer", "Dishwasher"],
      amenities: ["Private Patio", "Storage"],
      parking: "2-car garage",
      tags: ["townhome"],
    },
  });

  const property3 = await prisma.property.create({
    data: {
      name: "Sunset View Condos",
      addressLine1: "789 Sunset Boulevard",
      city: "Beaverton",
      state: "OR",
      zipCode: "97005",
      status: PropertyStatus.ACTIVE,
      ownerId: owner1.id,
      rentAmount: 1650,
      securityDeposit: 1650,
      amenities: ["Balcony", "Gym"],
      parking: "Surface lot",
    },
  });

  console.log("✓ Properties created");

  // ─── Units ───────────────────────────────────────────────────────────────
  const units = await Promise.all([
    prisma.unit.create({
      data: { propertyId: property1.id, unitNumber: "101", status: UnitStatus.OCCUPIED, bedrooms: 1, bathrooms: 1, rentAmount: 1450, depositAmount: 1450 },
    }),
    prisma.unit.create({
      data: { propertyId: property1.id, unitNumber: "102", status: UnitStatus.OCCUPIED, bedrooms: 2, bathrooms: 2, rentAmount: 1850, depositAmount: 1850 },
    }),
    prisma.unit.create({
      data: { propertyId: property1.id, unitNumber: "201", status: UnitStatus.AVAILABLE, bedrooms: 2, bathrooms: 2, rentAmount: 1900, depositAmount: 1900 },
    }),
    prisma.unit.create({
      data: { propertyId: property1.id, unitNumber: "202", status: UnitStatus.NOTICE_GIVEN, bedrooms: 1, bathrooms: 1, rentAmount: 1500, depositAmount: 1500 },
    }),
    prisma.unit.create({
      data: { propertyId: property2.id, unitNumber: "A", status: UnitStatus.OCCUPIED, bedrooms: 3, bathrooms: 2.5, rentAmount: 2400, depositAmount: 2400 },
    }),
    prisma.unit.create({
      data: { propertyId: property2.id, unitNumber: "B", status: UnitStatus.AVAILABLE, bedrooms: 3, bathrooms: 2.5, rentAmount: 2450, depositAmount: 2450 },
    }),
    prisma.unit.create({
      data: { propertyId: property3.id, unitNumber: "1A", status: UnitStatus.OCCUPIED, bedrooms: 2, bathrooms: 2, rentAmount: 1650, depositAmount: 1650 },
    }),
    prisma.unit.create({
      data: { propertyId: property3.id, unitNumber: "2B", status: UnitStatus.VACANT, bedrooms: 1, bathrooms: 1, rentAmount: 1350, depositAmount: 1350 },
    }),
  ]);

  console.log("✓ Units created");

  // ─── Tenant & Lease ──────────────────────────────────────────────────────
  const tenant = await prisma.tenant.create({
    data: {
      userId: tenantUser.id,
      phone: "555-0105",
      emergencyContact: "Casey Tenant",
      emergencyPhone: "555-0199",
      pets: "1 cat (approved)",
    },
  });

  const lease = await prisma.lease.create({
    data: {
      unitId: units[0].id,
      tenantId: tenant.id,
      startDate: new Date("2025-01-01"),
      endDate: new Date("2026-12-31"),
      rentAmount: 1450,
      depositAmount: 1450,
      status: "ACTIVE",
      terms: "12-month lease with option to renew",
    },
  });

  console.log("✓ Tenant & lease created");

  // ─── Maintenance Requests ────────────────────────────────────────────────
  const mr1 = await prisma.maintenanceRequest.create({
    data: {
      requestNumber: "MR-2026-10001",
      propertyId: property1.id,
      unitId: units[0].id,
      tenantId: tenant.id,
      category: MaintenanceCategory.PLUMBING,
      priority: MaintenancePriority.HIGH,
      status: MaintenanceStatus.IN_PROGRESS,
      title: "Kitchen sink leaking",
      description: "Water pooling under the kitchen sink. Started 2 days ago.",
      assignedStaffId: maintenance.id,
      createdById: tenantUser.id,
      targetCompletion: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
      tenantNotes: "Please call before entering",
    },
  });

  await prisma.maintenanceTimeline.createMany({
    data: [
      { requestId: mr1.id, userId: tenantUser.id, action: "Request submitted", notes: "Kitchen sink leaking" },
      { requestId: mr1.id, userId: manager.id, action: "Manager assigned", newValue: maintenance.name! },
      { requestId: mr1.id, userId: maintenance.id, action: "Status changed", oldValue: "ASSIGNED", newValue: "IN_PROGRESS", notes: "Inspected — needs new P-trap" },
    ],
  });

  const mr2 = await prisma.maintenanceRequest.create({
    data: {
      requestNumber: "MR-2026-10002",
      propertyId: property1.id,
      unitId: units[3].id,
      category: MaintenanceCategory.HVAC,
      priority: MaintenancePriority.MEDIUM,
      status: MaintenanceStatus.SUBMITTED,
      title: "AC not cooling properly",
      description: "Air conditioning runs but does not cool below 78°F.",
      createdById: manager.id,
    },
  });

  await prisma.maintenanceTimeline.create({
    data: { requestId: mr2.id, userId: manager.id, action: "Request submitted" },
  });

  const mr3 = await prisma.maintenanceRequest.create({
    data: {
      requestNumber: "MR-2026-10003",
      propertyId: property2.id,
      unitId: units[4].id,
      category: MaintenanceCategory.ELECTRICAL,
      priority: MaintenancePriority.LOW,
      status: MaintenanceStatus.COMPLETED,
      title: "Replace hallway light fixture",
      description: "Hallway light flickering intermittently.",
      assignedStaffId: maintenance.id,
      cost: 125.50,
      vendor: "Bright Electric Co.",
      completedAt: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
    },
  });

  console.log("✓ Maintenance requests created");

  // ─── Prospects ───────────────────────────────────────────────────────────
  const prospect1 = await prisma.prospect.create({
    data: {
      name: "Chris Prospect",
      email: "chris@email.com",
      phone: "555-0300",
      leadSource: "Zillow",
      budget: 2000,
      moveDate: new Date("2026-08-01"),
      pets: "No pets",
      status: ProspectStatus.SHOWING_SCHEDULED,
      internalNotes: "Looking for 2BR near downtown",
      properties: {
        create: [{ propertyId: property1.id }, { propertyId: property3.id }],
      },
    },
  });

  await prisma.prospectTimeline.createMany({
    data: [
      { prospectId: prospect1.id, userId: agent.id, action: "Prospect created" },
      { prospectId: prospect1.id, userId: agent.id, action: "Status changed", oldValue: "NEW", newValue: "CONTACTED" },
      { prospectId: prospect1.id, userId: agent.id, action: "Showing scheduled", newValue: "Unit 201" },
    ],
  });

  const prospect2 = await prisma.prospect.create({
    data: {
      name: "Dana Applicant",
      email: "dana@email.com",
      phone: "555-0301",
      leadSource: "Referral",
      budget: 2500,
      moveDate: new Date("2026-09-01"),
      status: ProspectStatus.APPLICATION_RECEIVED,
      properties: { create: [{ propertyId: property2.id }] },
    },
  });

  const prospect3 = await prisma.prospect.create({
    data: {
      name: "Evan Lead",
      email: "evan@email.com",
      phone: "555-0302",
      leadSource: "Website",
      budget: 1500,
      status: ProspectStatus.NEW,
    },
  });

  console.log("✓ Prospects created");

  // ─── Showings & Calendar ─────────────────────────────────────────────────
  const showingDate = new Date();
  showingDate.setDate(showingDate.getDate() + 2);
  showingDate.setHours(14, 0, 0, 0);

  await prisma.showing.create({
    data: {
      prospectId: prospect1.id,
      propertyId: property1.id,
      unitId: units[2].id,
      agentId: agent.id,
      scheduledAt: showingDate,
      duration: 30,
      status: "SCHEDULED",
      notes: "Meet at leasing office",
    },
  });

  await prisma.calendarEvent.createMany({
    data: [
      {
        title: "Showing: Chris Prospect",
        type: CalendarEventType.SHOWING,
        propertyId: property1.id,
        unitId: units[2].id,
        assigneeId: agent.id,
        createdById: agent.id,
        startAt: showingDate,
        endAt: new Date(showingDate.getTime() + 30 * 60000),
        color: "#3b82f6",
      },
      {
        title: "HVAC Repair — Unit 202",
        type: CalendarEventType.MAINTENANCE,
        propertyId: property1.id,
        unitId: units[3].id,
        assigneeId: maintenance.id,
        createdById: manager.id,
        startAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 25 * 60 * 60 * 1000),
        color: "#f97316",
      },
      {
        title: "Move-in Inspection — Unit 1A",
        type: CalendarEventType.INSPECTION,
        propertyId: property3.id,
        unitId: units[6].id,
        assigneeId: manager.id,
        createdById: manager.id,
        startAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000 + 60 * 60000),
        color: "#8b5cf6",
      },
      {
        title: "Team Meeting",
        type: CalendarEventType.STAFF_EVENT,
        assigneeId: manager.id,
        createdById: admin.id,
        startAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000),
        endAt: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000 + 60 * 60000),
        color: "#6b7280",
        notes: "Weekly staff sync",
      },
    ],
  });

  console.log("✓ Showings & calendar events created");

  // ─── Documents ───────────────────────────────────────────────────────────
  await prisma.document.createMany({
    data: [
      { name: "Lease Agreement — Unit 101", fileName: "lease-101.pdf", url: "/documents/lease-101.pdf", mimeType: "application/pdf", type: DocumentType.LEASE, propertyId: property1.id, unitId: units[0].id, tenantId: tenant.id, leaseId: lease.id },
      { name: "Move-in Checklist", fileName: "movein-checklist.pdf", url: "/documents/movein-checklist.pdf", mimeType: "application/pdf", type: DocumentType.MOVE_IN_CHECKLIST, tenantId: tenant.id },
      { name: "Annual Inspection Report", fileName: "inspection-2025.pdf", url: "/documents/inspection-2025.pdf", mimeType: "application/pdf", type: DocumentType.INSPECTION_REPORT, propertyId: property1.id },
      { name: "Rental Application — Dana", fileName: "application-dana.pdf", url: "/documents/application-dana.pdf", mimeType: "application/pdf", type: DocumentType.SIGNED_DOCUMENT, prospectId: prospect2.id },
    ],
  });

  console.log("✓ Documents created");

  // ─── Notes ───────────────────────────────────────────────────────────────
  await prisma.note.createMany({
    data: [
      { content: "Building exterior repainted Q1 2026. Looks great.", authorId: manager.id, propertyId: property1.id },
      { content: "Tenant prefers morning appointments for maintenance.", authorId: manager.id, tenantId: tenant.id },
      { content: "Very interested in Unit 201. Budget flexible.", authorId: agent.id, prospectId: prospect1.id },
      { content: "P-trap replacement needed. Parts ordered.", authorId: maintenance.id, maintenanceRequestId: mr1.id },
    ],
  });

  console.log("✓ Notes created");

  // ─── Messages ────────────────────────────────────────────────────────────
  await prisma.message.createMany({
    data: [
      { senderId: tenantUser.id, receiverId: manager.id, tenantId: tenant.id, subject: "Sink leak update", body: "The leak seems to be getting worse. Any update on the repair?" },
      { senderId: manager.id, receiverId: tenantUser.id, tenantId: tenant.id, subject: "Re: Sink leak update", body: "Mike is scheduled for tomorrow morning between 9-11 AM. He'll call before arriving." },
      { senderId: agent.id, receiverId: office.id, subject: "Showing confirmation", body: "Can you send the confirmation email to Chris Prospect for Thursday at 2 PM?" },
    ],
  });

  console.log("✓ Messages created");

  // ─── Notifications ───────────────────────────────────────────────────────
  await prisma.notification.createMany({
    data: [
      { userId: manager.id, type: NotificationType.MAINTENANCE_REQUEST, title: "New Maintenance Request", message: "AC not cooling properly — MR-2026-10002", link: `/maintenance/${mr2.id}` },
      { userId: maintenance.id, type: NotificationType.ASSIGNMENT_CHANGED, title: "Work Order Assigned", message: "Kitchen sink leaking — MR-2026-10001", link: `/maintenance/${mr1.id}` },
      { userId: agent.id, type: NotificationType.SHOWING_BOOKED, title: "Showing Scheduled", message: "Chris Prospect at Riverside Apartments", link: "/calendar" },
      { userId: manager.id, type: NotificationType.LEASE_EXPIRING, title: "Lease Expiring Soon", message: "Unit 202 lease expires in 60 days", link: "/tenants" },
    ],
  });

  console.log("✓ Notifications created");

  // ─── Activity Logs ───────────────────────────────────────────────────────
  await prisma.activityLog.createMany({
    data: [
      { action: "CREATED", entityType: "Property", entityId: property1.id, userId: admin.id, propertyId: property1.id },
      { action: "TENANT_ASSIGNED", entityType: "Unit", entityId: units[0].id, userId: manager.id, propertyId: property1.id, unitId: units[0].id, tenantId: tenant.id },
      { action: "LEASE_SIGNED", entityType: "Lease", entityId: lease.id, userId: manager.id, propertyId: property1.id, unitId: units[0].id, tenantId: tenant.id },
      { action: "CREATED", entityType: "MaintenanceRequest", entityId: mr1.id, userId: tenantUser.id, propertyId: property1.id, maintenanceRequestId: mr1.id },
      { action: "STATUS_CHANGED", entityType: "MaintenanceRequest", entityId: mr1.id, userId: maintenance.id, fieldName: "status", oldValue: "ASSIGNED", newValue: "IN_PROGRESS", maintenanceRequestId: mr1.id },
      { action: "CREATED", entityType: "Prospect", entityId: prospect1.id, userId: agent.id, prospectId: prospect1.id },
    ],
  });

  console.log("✓ Activity logs created");
  console.log("\n✅ Seed complete!");
  console.log("\nDemo accounts (password: password123):");
  console.log("  admin@havenpm.com       — Administrator");
  console.log("  manager@havenpm.com     — Property Manager");
  console.log("  agent@havenpm.com       — Leasing Agent");
  console.log("  maintenance@havenpm.com — Maintenance Staff");
  console.log("  office@havenpm.com      — Office Staff");
  console.log("  tenant@havenpm.com      — Tenant");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
