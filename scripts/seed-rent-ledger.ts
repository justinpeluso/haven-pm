/**
 * Seed realistic rent ledger rows on existing active leases.
 * Usage: npx tsx scripts/seed-rent-ledger.ts
 */
import { PrismaClient, ChargeStatus, ChargeType, PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";

const prisma = new PrismaClient();

async function main() {
  const leases = await prisma.lease.findMany({
    where: { status: "ACTIVE", deletedAt: null },
    include: { tenant: { include: { user: { select: { email: true, name: true } } } } },
    orderBy: { createdAt: "asc" },
  });

  if (!leases.length) {
    console.log("No active leases found.");
    return;
  }

  let charges = 0;
  let payments = 0;

  for (let i = 0; i < leases.length; i++) {
    const lease = leases[i];
    const rent = Number(lease.rentAmount);

    // Clear prior demo ledger for this lease so reseed is idempotent-ish
    await prisma.payment.deleteMany({ where: { leaseId: lease.id } });
    await prisma.charge.deleteMany({ where: { leaseId: lease.id } });

    const lastMonthDue = new Date();
    lastMonthDue.setMonth(lastMonthDue.getMonth() - 1);
    lastMonthDue.setDate(1);

    const thisMonthDue = new Date();
    thisMonthDue.setDate(1);

    // Prior month — fully paid
    const paidCharge = await prisma.charge.create({
      data: {
        leaseId: lease.id,
        tenantId: lease.tenantId,
        type: ChargeType.RENT,
        status: ChargeStatus.PAID,
        amount: new Prisma.Decimal(rent),
        amountPaid: new Prisma.Decimal(rent),
        dueDate: lastMonthDue,
        description: `${lastMonthDue.toLocaleString("en-US", { month: "long" })} rent`,
      },
    });
    charges++;
    await prisma.payment.create({
      data: {
        leaseId: lease.id,
        tenantId: lease.tenantId,
        chargeId: paidCharge.id,
        amount: new Prisma.Decimal(rent),
        method: PaymentMethod.ACH,
        status: PaymentStatus.SUCCEEDED,
        paidAt: new Date(lastMonthDue.getTime() + 3 * 86400000),
        reference: `ACH-${lease.id.slice(-6)}`,
        notes: "Seeded prior-month payment",
      },
    });
    payments++;

    // Current month — open (first 3 tenants get overdue + late fee for delinquency demo)
    const current = await prisma.charge.create({
      data: {
        leaseId: lease.id,
        tenantId: lease.tenantId,
        type: ChargeType.RENT,
        status: ChargeStatus.OPEN,
        amount: new Prisma.Decimal(rent),
        amountPaid: new Prisma.Decimal(0),
        dueDate: thisMonthDue,
        description: `${thisMonthDue.toLocaleString("en-US", { month: "long" })} rent`,
      },
    });
    charges++;

    if (i < 3) {
      await prisma.charge.create({
        data: {
          leaseId: lease.id,
          tenantId: lease.tenantId,
          type: ChargeType.LATE_FEE,
          status: ChargeStatus.OPEN,
          amount: new Prisma.Decimal(50),
          amountPaid: new Prisma.Decimal(0),
          dueDate: thisMonthDue,
          description: "Late fee",
        },
      });
      charges++;
      await prisma.lease.update({
        where: { id: lease.id },
        data: { delinquentAt: new Date() },
      });
    } else if (i === 3) {
      // Partial payment demo
      await prisma.payment.create({
        data: {
          leaseId: lease.id,
          tenantId: lease.tenantId,
          chargeId: current.id,
          amount: new Prisma.Decimal(Math.round(rent / 2)),
          method: PaymentMethod.CHECK,
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          reference: "CHK-PARTIAL",
        },
      });
      payments++;
      await prisma.charge.update({
        where: { id: current.id },
        data: {
          amountPaid: new Prisma.Decimal(Math.round(rent / 2)),
          status: ChargeStatus.PARTIALLY_PAID,
        },
      });
      await prisma.lease.update({
        where: { id: lease.id },
        data: { delinquentAt: null },
      });
    } else {
      await prisma.lease.update({
        where: { id: lease.id },
        data: { delinquentAt: null },
      });
    }

    console.log(
      `✓ ${lease.tenant.user.name || lease.tenant.user.email} — rent ${rent}`
    );
  }

  console.log(`\nSeeded ${charges} charges and ${payments} payments across ${leases.length} leases.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
