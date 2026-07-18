/**
 * Import parsed AppFolio staging JSON into Haven PM.
 * Preserves staff/party login users; replaces portfolio rows.
 *
 * Usage:
 *   python3 scripts/parse-appfolio-pdfs.py
 *   npx tsx scripts/import-appfolio-staging.ts
 *   npx tsx scripts/import-appfolio-staging.ts --redact   # fake emails/phones for prod
 *
 * Point at a DB with DATABASE_URL (or DATABASE_URL_UNPOOLED) in the env.
 */
import {
  PrismaClient,
  UserRole,
  PropertyStatus,
  UnitStatus,
  LeaseStatus,
} from "@prisma/client";
import bcrypt from "bcryptjs";
import fs from "fs";
import path from "path";

const REDACT = process.argv.includes("--redact");
const prisma = new PrismaClient();
const STAGING = path.join(process.cwd(), "data/appfolio-staging");

type ParsedUnit = {
  label: string;
  addressLine1: string;
  city: string;
  state: string;
  zip: string;
  unitName: string;
  marketRent: number | null;
  deposit: number | null;
  sqft: number | null;
  beds: number | null;
  baths: number | null;
  revenue: boolean;
};

type ParsedTenant = {
  name: string;
  last: string;
  first: string;
  status: string;
  tenantType: string;
  email: string | null;
  phone: string | null;
  moveIn: string | null;
  leaseTo: string | null;
  rent: number | null;
  deposit: number | null;
  unitLabel: string | null;
};

type ParsedOwner = { name: string; phone: string | null; email: string | null };

function readJson<T>(name: string): T {
  return JSON.parse(fs.readFileSync(path.join(STAGING, name), "utf8")) as T;
}

function normKey(s: string): string {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function parseMdY(s: string | null | undefined): Date | null {
  if (!s) return null;
  const m = /^(\d{2})\/(\d{2})\/(\d{4})$/.exec(s.trim());
  if (!m) return null;
  const d = new Date(Number(m[3]), Number(m[1]) - 1, Number(m[2]));
  return Number.isNaN(d.getTime()) ? null : d;
}

function synthEmail(name: string, i: number): string {
  const base = name
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ".")
    .replace(/^\.|\.$/g, "")
    .slice(0, 40);
  return `tenant.${base || "resident"}.${i}@havenpm.local`;
}

async function clearPortfolioKeepStaff() {
  console.log("→ Clearing portfolio tables (keeping staff users)...");
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

  // Remove only TENANT-role users (demo tenant logins)
  await prisma.user.deleteMany({ where: { role: UserRole.TENANT } });
  console.log("✓ Portfolio cleared");
}

async function ensureStaff() {
  const passwordHash = await bcrypt.hash("Chomps123", 12);
  const partyPasswordHash = passwordHash;
  const staff: Array<{
    email: string;
    name: string;
    role: UserRole;
    phone: string;
    hash?: string;
  }> = [
    {
      email: "admin@havenpm.com",
      name: "Alex Administrator",
      role: UserRole.ADMINISTRATOR,
      phone: "(412) 555-0100",
    },
    {
      email: "justin@havenpm.com",
      name: "Justin Peluso",
      role: UserRole.ADMINISTRATOR,
      phone: "(412) 555-0105",
    },
    {
      email: "michelle@havenpm.com",
      name: "Michelle Turcan",
      role: UserRole.ADMINISTRATOR,
      phone: "(412) 555-0106",
    },
    {
      email: "manager@havenpm.com",
      name: "Maria Manager",
      role: UserRole.PROPERTY_MANAGER,
      phone: "(412) 555-0101",
    },
    {
      email: "player1@havenpm.com",
      name: "Justin",
      role: UserRole.ADMINISTRATOR,
      phone: "(412) 555-0161",
      hash: partyPasswordHash,
    },
    {
      email: "player2@havenpm.com",
      name: "Rusty",
      role: UserRole.OFFICE_STAFF,
      phone: "(412) 555-0162",
      hash: partyPasswordHash,
    },
    {
      email: "player3@havenpm.com",
      name: "Elisha",
      role: UserRole.OFFICE_STAFF,
      phone: "(412) 555-0163",
      hash: partyPasswordHash,
    },
    {
      email: "player4@havenpm.com",
      name: "Eric Prendergast",
      role: UserRole.OFFICE_STAFF,
      phone: "(412) 555-0164",
      hash: partyPasswordHash,
    },
    {
      email: "eric@havenpm.com",
      name: "Eric Prendergast",
      role: UserRole.OFFICE_STAFF,
      phone: "(412) 555-0164",
      hash: partyPasswordHash,
    },
  ];

  for (const s of staff) {
    await prisma.user.upsert({
      where: { email: s.email },
      create: {
        email: s.email,
        name: s.name,
        passwordHash: s.hash ?? passwordHash,
        role: s.role,
        phone: s.phone,
      },
      update: {
        name: s.name,
        passwordHash: s.hash ?? passwordHash,
        role: s.role,
        phone: s.phone,
        isActive: true,
        deletedAt: null,
      },
    });
  }
}

function redactPhone(i: number): string {
  const n = String(5550100 + (i % 8900)).padStart(7, "0");
  return `(412) ${n.slice(0, 3)}-${n.slice(3)}`;
}

async function main() {
  const dbHost = (() => {
    try {
      const u = process.env.DATABASE_URL_UNPOOLED || process.env.DATABASE_URL || "";
      return u ? new URL(u).hostname : "(none)";
    } catch {
      return "(unparseable)";
    }
  })();
  console.log("📦 Importing AppFolio staging data into Haven PM...");
  console.log(`   DB host: ${dbHost}`);
  console.log(`   Redact PII: ${REDACT ? "yes" : "no"}\n`);

  const units = readJson<ParsedUnit[]>("parsed-units.json");
  const tenants = readJson<ParsedTenant[]>("parsed-tenants.json");
  const ownersIn = readJson<ParsedOwner[]>("parsed-owners.json");

  await clearPortfolioKeepStaff();
  await ensureStaff();

  // Owners
  const ownerIds = new Map<string, string>();
  for (let oi = 0; oi < ownersIn.length; oi++) {
    const o = ownersIn[oi];
    const created = await prisma.owner.create({
      data: {
        name: o.name,
        phone: REDACT ? redactPhone(oi + 200) : o.phone,
        email: REDACT ? `owner.${oi + 1}@havenpm.local` : o.email,
        notes: "Imported from AppFolio Property Directory",
      },
    });
    ownerIds.set(o.name, created.id);
  }
  const defaultOwnerId =
    ownerIds.get("Bill Schneider") ??
    (
      await prisma.owner.create({
        data: {
          name: "Bill Schneider",
          phone: "(412) 841-8478",
          notes: "Default portfolio owner (AppFolio import)",
        },
      })
    ).id;

  // Each AppFolio "property" row is often a single unit — create Property + Unit 1:1
  const unitByKey = new Map<string, { propertyId: string; unitId: string; label: string }>();
  let propCount = 0;
  let unitCount = 0;

  for (const u of units) {
    const rent = u.marketRent && u.marketRent > 0 ? u.marketRent : 0;
    const property = await prisma.property.create({
      data: {
        name: u.label,
        addressLine1: u.addressLine1 || u.label,
        city: u.city,
        state: u.state || "PA",
        zipCode: u.zip,
        status: PropertyStatus.ACTIVE,
        ownerId: defaultOwnerId,
        squareFootage: u.sqft ?? undefined,
        bedrooms: u.beds ?? undefined,
        bathrooms: u.baths ?? undefined,
        rentAmount: rent > 0 ? rent : undefined,
        securityDeposit: u.deposit && u.deposit > 0 ? u.deposit : undefined,
        tags: ["appfolio-import"],
        internalNotes: `AppFolio unit label: ${u.unitName}`,
      },
    });
    propCount++;

    const unitNumber =
      u.unitName !== u.label && u.unitName.length < 40
        ? u.unitName.replace(u.label, "").trim() || "1"
        : "1";

    const unit = await prisma.unit.create({
      data: {
        propertyId: property.id,
        unitNumber: unitNumber.slice(0, 40) || "1",
        status: UnitStatus.VACANT,
        squareFootage: u.sqft ?? undefined,
        bedrooms: u.beds ?? undefined,
        bathrooms: u.baths ?? undefined,
        rentAmount: rent > 0 ? rent : 1, // schema requires Decimal
        depositAmount: u.deposit && u.deposit > 0 ? u.deposit : undefined,
        internalNotes: u.revenue === false ? "Non-revenue unit (AppFolio)" : undefined,
      },
    });
    unitCount++;

    const keys = [normKey(u.label), normKey(u.unitName), normKey(u.addressLine1)];
    for (const k of keys) {
      if (k) unitByKey.set(k, { propertyId: property.id, unitId: unit.id, label: u.label });
    }
  }

  // Tenants: Current Financially Responsible with a matchable unit
  const currentFr = tenants.filter(
    (t) => t.status === "Current" && t.tenantType === "Financially Responsible"
  );

  let tenantCount = 0;
  let leaseCount = 0;
  let unmatched = 0;
  const usedEmails = new Set<string>();
  const tenantPasswordHash = await bcrypt.hash("Chomps123", 10);

  for (let i = 0; i < currentFr.length; i++) {
    const t = currentFr[i];
    let match =
      (t.unitLabel && unitByKey.get(normKey(t.unitLabel))) ||
      null;
    if (!match && t.unitLabel) {
      // fuzzy: unit key contains tenant label or vice versa
      const tk = normKey(t.unitLabel);
      for (const [k, v] of unitByKey) {
        if (k.includes(tk) || tk.includes(k)) {
          match = v;
          break;
        }
      }
    }
    if (!match) {
      unmatched++;
      continue;
    }

    let email = REDACT
      ? `tenant.${i + 1}@havenpm.local`
      : (t.email || synthEmail(t.name, i)).toLowerCase();
    if (usedEmails.has(email) || email.endsWith("@havenpm.com")) {
      email = REDACT ? `tenant.${i + 10_000}@havenpm.local` : synthEmail(t.name, i + 10_000);
    }
    usedEmails.add(email);
    const phone = REDACT ? redactPhone(i) : t.phone;

    const user = await prisma.user.create({
      data: {
        email,
        name: t.name,
        passwordHash: tenantPasswordHash,
        role: UserRole.TENANT,
        phone,
      },
    });

    const tenant = await prisma.tenant.create({
      data: {
        userId: user.id,
        phone,
        internalNotes: `AppFolio status=${t.status}; type=${t.tenantType}${REDACT ? "; contacts redacted" : ""}`,
      },
    });
    tenantCount++;

    const moveIn = parseMdY(t.moveIn) ?? new Date(2024, 0, 1);
    const leaseTo = parseMdY(t.leaseTo) ?? new Date(moveIn.getFullYear() + 1, moveIn.getMonth(), moveIn.getDate());
    const rent =
      t.rent && t.rent > 0
        ? t.rent
        : (
            await prisma.unit.findUnique({ where: { id: match.unitId } })
          )?.rentAmount ?? 1;

    await prisma.lease.create({
      data: {
        unitId: match.unitId,
        tenantId: tenant.id,
        startDate: moveIn,
        endDate: leaseTo,
        rentAmount: rent,
        depositAmount: t.deposit && t.deposit > 0 ? t.deposit : undefined,
        status: LeaseStatus.ACTIVE,
      },
    });
    leaseCount++;

    await prisma.unit.update({
      where: { id: match.unitId },
      data: {
        status: UnitStatus.OCCUPIED,
        moveInDate: moveIn,
        rentAmount: rent,
      },
    });
  }

  // Settings geography nudge
  for (const [key, value] of [
    ["company_city", "Pittsburgh"],
    ["company_state", "PA"],
    ["data_source", "appfolio-import-20260717"],
  ] as const) {
    await prisma.setting.upsert({
      where: { key },
      create: { key, value },
      update: { value },
    });
  }

  console.log("\n✓ Import complete");
  console.log(`  Owners:     ${ownerIds.size || 1}`);
  console.log(`  Properties: ${propCount}`);
  console.log(`  Units:      ${unitCount}`);
  console.log(`  Tenants:    ${tenantCount}`);
  console.log(`  Leases:     ${leaseCount}`);
  console.log(`  Unmatched current FR tenants: ${unmatched}`);
  console.log("\nLogin: justin@havenpm.com / Chomps123");
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
