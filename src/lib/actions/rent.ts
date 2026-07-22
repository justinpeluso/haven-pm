"use server";

import { revalidatePath } from "next/cache";
import {
  ActivityAction,
  ChargeStatus,
  ChargeType,
  PaymentMethod,
  PaymentStatus,
  Prisma,
} from "@prisma/client";
import { db } from "@/lib/db";
import { requirePermission } from "@/lib/auth/session";
import { logActivity } from "@/lib/activity";
import { chargeBalance, deriveChargeStatus, toNumber } from "@/lib/rent";
import {
  amendRentSchema,
  chargeSchema,
  createLeaseSchema,
  noticeToVacateSchema,
  paymentSchema,
} from "@/lib/validations";

function revalidateLeaseViews(leaseId: string, tenantId?: string) {
  revalidatePath("/leases");
  revalidatePath(`/leases/${leaseId}`);
  revalidatePath("/dashboard");
  revalidatePath("/reports");
  if (tenantId) revalidatePath(`/tenants/${tenantId}`);
}

export async function getLeaseReceivables(filters?: {
  delinquentOnly?: boolean;
  propertyId?: string;
}) {
  await requirePermission("leases:read");

  const leases = await db.lease.findMany({
    where: {
      deletedAt: null,
      status: "ACTIVE",
      ...(filters?.delinquentOnly ? { delinquentAt: { not: null } } : {}),
      ...(filters?.propertyId
        ? { unit: { propertyId: filters.propertyId } }
        : {}),
    },
    include: {
      tenant: { include: { user: { select: { name: true, email: true } } } },
      unit: {
        select: {
          unitNumber: true,
          property: { select: { id: true, name: true } },
        },
      },
      charges: {
        where: { status: { in: [ChargeStatus.OPEN, ChargeStatus.PARTIALLY_PAID] } },
        orderBy: { dueDate: "asc" },
      },
    },
    orderBy: { endDate: "asc" },
  });

  return leases.map((lease) => {
    const balance = lease.charges.reduce((sum, c) => sum + chargeBalance(c), 0);
    const oldestDue = lease.charges[0]?.dueDate ?? null;
    return {
      ...lease,
      balance,
      oldestDue,
      openChargeCount: lease.charges.length,
    };
  });
}

export async function getLeaseDetail(leaseId: string) {
  await requirePermission("leases:read");

  const lease = await db.lease.findFirst({
    where: { id: leaseId, deletedAt: null },
    include: {
      tenant: { include: { user: { select: { name: true, email: true, phone: true } } } },
      unit: {
        include: { property: { select: { id: true, name: true, addressLine1: true } } },
      },
      charges: { orderBy: { dueDate: "desc" } },
      payments: {
        orderBy: { paidAt: "desc" },
        include: { recordedBy: { select: { name: true } }, charge: { select: { description: true, type: true } } },
      },
    },
  });
  if (!lease) return null;

  const balance = lease.charges.reduce((sum, c) => sum + chargeBalance(c), 0);
  return { ...lease, balance };
}

export async function createCharge(formData: FormData) {
  const session = await requirePermission("leases:write");

  const raw = {
    leaseId: String(formData.get("leaseId") || ""),
    type: String(formData.get("type") || "RENT"),
    amount: formData.get("amount"),
    dueDate: String(formData.get("dueDate") || ""),
    description: String(formData.get("description") || "").trim() || undefined,
  };
  const parsed = chargeSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid charge." };

  const lease = await db.lease.findFirst({
    where: { id: parsed.data.leaseId, deletedAt: null },
    select: { id: true, tenantId: true },
  });
  if (!lease) return { error: "Lease not found." };

  const charge = await db.charge.create({
    data: {
      leaseId: lease.id,
      tenantId: lease.tenantId,
      type: parsed.data.type as ChargeType,
      amount: new Prisma.Decimal(parsed.data.amount),
      dueDate: new Date(parsed.data.dueDate),
      description: parsed.data.description,
      status: ChargeStatus.OPEN,
    },
  });

  await logActivity({
    action: ActivityAction.CREATED,
    entityType: "Charge",
    entityId: charge.id,
    userId: session.user.id,
    tenantId: lease.tenantId,
    metadata: { leaseId: lease.id, amount: parsed.data.amount, type: parsed.data.type },
  });

  revalidateLeaseViews(lease.id, lease.tenantId);
  return { success: true, id: charge.id };
}

export async function recordPayment(formData: FormData) {
  const session = await requirePermission("leases:write");

  const raw = {
    leaseId: String(formData.get("leaseId") || ""),
    chargeId: String(formData.get("chargeId") || "") || undefined,
    amount: formData.get("amount"),
    method: String(formData.get("method") || "OTHER"),
    paidAt: String(formData.get("paidAt") || "") || undefined,
    reference: String(formData.get("reference") || "").trim() || undefined,
    notes: String(formData.get("notes") || "").trim() || undefined,
  };
  const parsed = paymentSchema.safeParse(raw);
  if (!parsed.success) return { error: parsed.error.errors[0]?.message ?? "Invalid payment." };

  const lease = await db.lease.findFirst({
    where: { id: parsed.data.leaseId, deletedAt: null },
    select: { id: true, tenantId: true },
  });
  if (!lease) return { error: "Lease not found." };

  let chargeId = parsed.data.chargeId;
  if (chargeId) {
    const charge = await db.charge.findFirst({
      where: { id: chargeId, leaseId: lease.id, status: { not: ChargeStatus.VOID } },
    });
    if (!charge) return { error: "Charge not found on this lease." };
  }

  const amount = parsed.data.amount;

  const payment = await db.$transaction(async (tx) => {
    const created = await tx.payment.create({
      data: {
        leaseId: lease.id,
        tenantId: lease.tenantId,
        chargeId: chargeId || null,
        amount: new Prisma.Decimal(amount),
        method: parsed.data.method as PaymentMethod,
        status: PaymentStatus.SUCCEEDED,
        paidAt: parsed.data.paidAt ? new Date(parsed.data.paidAt) : new Date(),
        reference: parsed.data.reference,
        notes: parsed.data.notes,
        recordedById: session.user.id,
      },
    });

    if (chargeId) {
      const charge = await tx.charge.findUnique({ where: { id: chargeId } });
      if (charge) {
        const nextPaid = toNumber(charge.amountPaid) + amount;
        const status = deriveChargeStatus(toNumber(charge.amount), nextPaid);
        await tx.charge.update({
          where: { id: chargeId },
          data: {
            amountPaid: new Prisma.Decimal(Math.min(nextPaid, toNumber(charge.amount))),
            status,
          },
        });
      }
    } else {
      // Apply FIFO to open charges on the lease.
      let remaining = amount;
      const opens = await tx.charge.findMany({
        where: {
          leaseId: lease.id,
          status: { in: [ChargeStatus.OPEN, ChargeStatus.PARTIALLY_PAID] },
        },
        orderBy: { dueDate: "asc" },
      });
      for (const charge of opens) {
        if (remaining <= 0) break;
        const due = chargeBalance(charge);
        if (due <= 0) continue;
        const apply = Math.min(due, remaining);
        const nextPaid = toNumber(charge.amountPaid) + apply;
        await tx.charge.update({
          where: { id: charge.id },
          data: {
            amountPaid: new Prisma.Decimal(nextPaid),
            status: deriveChargeStatus(toNumber(charge.amount), nextPaid),
          },
        });
        remaining -= apply;
      }
    }

    return created;
  });

  await logActivity({
    action: ActivityAction.CREATED,
    entityType: "Payment",
    entityId: payment.id,
    userId: session.user.id,
    tenantId: lease.tenantId,
    metadata: { leaseId: lease.id, amount, method: parsed.data.method },
  });

  revalidateLeaseViews(lease.id, lease.tenantId);
  return { success: true, id: payment.id };
}

export async function setLeaseDelinquency(leaseId: string, delinquent: boolean) {
  const session = await requirePermission("leases:write");
  const lease = await db.lease.findFirst({
    where: { id: leaseId, deletedAt: null },
    select: { id: true, tenantId: true, delinquentAt: true },
  });
  if (!lease) return { error: "Lease not found." };

  await db.lease.update({
    where: { id: leaseId },
    data: { delinquentAt: delinquent ? new Date() : null },
  });

  await logActivity({
    action: ActivityAction.UPDATED,
    entityType: "Lease",
    entityId: leaseId,
    userId: session.user.id,
    tenantId: lease.tenantId,
    fieldName: "delinquentAt",
    oldValue: lease.delinquentAt?.toISOString() ?? undefined,
    newValue: delinquent ? "flagged" : undefined,
  });

  revalidateLeaseViews(leaseId, lease.tenantId);
  return { success: true };
}

/** Extend an active lease by 12 months and mark status RENEWED trail via terms note. */
export async function renewLease(leaseId: string) {
  const session = await requirePermission("leases:write");
  const lease = await db.lease.findFirst({
    where: { id: leaseId, deletedAt: null, status: "ACTIVE" },
  });
  if (!lease) return { error: "Active lease not found." };

  const nextEnd = new Date(lease.endDate);
  nextEnd.setFullYear(nextEnd.getFullYear() + 1);

  await db.lease.update({
    where: { id: leaseId },
    data: {
      endDate: nextEnd,
      terms: [lease.terms, `Renewed on ${new Date().toISOString().slice(0, 10)} (+12 months)`]
        .filter(Boolean)
        .join("\n"),
    },
  });

  await logActivity({
    action: ActivityAction.UPDATED,
    entityType: "Lease",
    entityId: leaseId,
    userId: session.user.id,
    tenantId: lease.tenantId,
    fieldName: "endDate",
    oldValue: lease.endDate.toISOString(),
    newValue: nextEnd.toISOString(),
    metadata: { renewal: true },
  });

  revalidateLeaseViews(leaseId, lease.tenantId);
  return { success: true, endDate: nextEnd.toISOString() };
}

export async function getLeaseFormOptions() {
  await requirePermission("leases:write");

  const [tenants, units] = await Promise.all([
    db.tenant.findMany({
      where: { deletedAt: null },
      select: {
        id: true,
        user: { select: { name: true, email: true } },
        leases: {
          where: { status: "ACTIVE", deletedAt: null },
          select: { id: true },
          take: 1,
        },
      },
      orderBy: { user: { name: "asc" } },
    }),
    db.unit.findMany({
      where: {
        deletedAt: null,
        status: { in: ["AVAILABLE", "VACANT", "NOTICE_GIVEN"] },
      },
      select: {
        id: true,
        unitNumber: true,
        status: true,
        rentAmount: true,
        depositAmount: true,
        property: { select: { id: true, name: true } },
      },
      orderBy: [{ property: { name: "asc" } }, { unitNumber: "asc" }],
    }),
  ]);

  return {
    tenants: tenants.map((t) => ({
      id: t.id,
      label: t.user.name || t.user.email,
      email: t.user.email,
      hasActiveLease: t.leases.length > 0,
    })),
    units: units.map((u) => ({
      id: u.id,
      label: `${u.property.name} · Unit ${u.unitNumber}`,
      status: u.status,
      rentAmount: Number(u.rentAmount),
      depositAmount: u.depositAmount != null ? Number(u.depositAmount) : null,
    })),
  };
}

export async function createLease(formData: FormData) {
  const session = await requirePermission("leases:write");

  const raw = {
    tenantId: String(formData.get("tenantId") || ""),
    unitId: String(formData.get("unitId") || ""),
    startDate: String(formData.get("startDate") || ""),
    endDate: String(formData.get("endDate") || ""),
    rentAmount: formData.get("rentAmount"),
    depositAmount: formData.get("depositAmount") || undefined,
    terms: String(formData.get("terms") || "").trim() || undefined,
    createFirstCharge: formData.get("createFirstCharge") === "on",
  };

  const parsed = createLeaseSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid lease." };
  }

  const startDate = new Date(parsed.data.startDate);
  const endDate = new Date(parsed.data.endDate);
  if (endDate <= startDate) {
    return { error: "End date must be after start date." };
  }

  const [tenant, unit, existingActive] = await Promise.all([
    db.tenant.findFirst({
      where: { id: parsed.data.tenantId, deletedAt: null },
      select: { id: true },
    }),
    db.unit.findFirst({
      where: { id: parsed.data.unitId, deletedAt: null },
      select: { id: true, status: true, propertyId: true },
    }),
    db.lease.findFirst({
      where: {
        tenantId: parsed.data.tenantId,
        status: "ACTIVE",
        deletedAt: null,
      },
      select: { id: true },
    }),
  ]);

  if (!tenant) return { error: "Tenant not found." };
  if (!unit) return { error: "Unit not found." };
  if (existingActive) {
    return { error: "Tenant already has an active lease. End or notice that lease first." };
  }

  const unitBusy = await db.lease.findFirst({
    where: {
      unitId: unit.id,
      status: "ACTIVE",
      deletedAt: null,
    },
    select: { id: true },
  });
  if (unitBusy) {
    return { error: "Unit already has an active lease." };
  }

  const lease = await db.$transaction(async (tx) => {
    const created = await tx.lease.create({
      data: {
        tenantId: tenant.id,
        unitId: unit.id,
        startDate,
        endDate,
        rentAmount: new Prisma.Decimal(parsed.data.rentAmount),
        depositAmount:
          parsed.data.depositAmount != null
            ? new Prisma.Decimal(parsed.data.depositAmount)
            : null,
        terms: parsed.data.terms,
        status: "ACTIVE",
      },
    });

    await tx.unit.update({
      where: { id: unit.id },
      data: {
        status: "OCCUPIED",
        moveInDate: startDate,
        moveOutDate: null,
      },
    });

    if (parsed.data.createFirstCharge) {
      await tx.charge.create({
        data: {
          leaseId: created.id,
          tenantId: tenant.id,
          type: ChargeType.RENT,
          status: ChargeStatus.OPEN,
          amount: new Prisma.Decimal(parsed.data.rentAmount),
          amountPaid: new Prisma.Decimal(0),
          dueDate: startDate,
          description: `Initial rent · ${startDate.toLocaleString("en-US", { month: "long", year: "numeric" })}`,
        },
      });
    }

    return created;
  });

  await logActivity({
    action: ActivityAction.LEASE_SIGNED,
    entityType: "Lease",
    entityId: lease.id,
    userId: session.user.id,
    tenantId: tenant.id,
    unitId: unit.id,
    propertyId: unit.propertyId,
    metadata: { rentAmount: parsed.data.rentAmount },
  });

  revalidateLeaseViews(lease.id, tenant.id);
  revalidatePath("/tenants");
  revalidatePath(`/tenants/${tenant.id}`);
  revalidatePath("/properties");
  return { success: true, id: lease.id };
}

export async function amendLeaseRent(formData: FormData) {
  const session = await requirePermission("leases:write");

  const raw = {
    leaseId: String(formData.get("leaseId") || ""),
    rentAmount: formData.get("rentAmount"),
    note: String(formData.get("note") || "").trim() || undefined,
  };
  const parsed = amendRentSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid rent change." };
  }

  const lease = await db.lease.findFirst({
    where: { id: parsed.data.leaseId, deletedAt: null, status: "ACTIVE" },
  });
  if (!lease) return { error: "Active lease not found." };

  const oldRent = toNumber(lease.rentAmount);
  await db.lease.update({
    where: { id: lease.id },
    data: {
      rentAmount: new Prisma.Decimal(parsed.data.rentAmount),
      terms: [
        lease.terms,
        `Rent amended ${new Date().toISOString().slice(0, 10)}: ${oldRent} → ${parsed.data.rentAmount}${
          parsed.data.note ? ` (${parsed.data.note})` : ""
        }`,
      ]
        .filter(Boolean)
        .join("\n"),
    },
  });

  await logActivity({
    action: ActivityAction.RENT_CHANGED,
    entityType: "Lease",
    entityId: lease.id,
    userId: session.user.id,
    tenantId: lease.tenantId,
    unitId: lease.unitId,
    fieldName: "rentAmount",
    oldValue: String(oldRent),
    newValue: String(parsed.data.rentAmount),
    metadata: { note: parsed.data.note },
  });

  revalidateLeaseViews(lease.id, lease.tenantId);
  return { success: true };
}

export async function giveNoticeToVacate(formData: FormData) {
  const session = await requirePermission("leases:write");

  const raw = {
    leaseId: String(formData.get("leaseId") || ""),
    moveOutDate: String(formData.get("moveOutDate") || ""),
    note: String(formData.get("note") || "").trim() || undefined,
  };
  const parsed = noticeToVacateSchema.safeParse(raw);
  if (!parsed.success) {
    return { error: parsed.error.errors[0]?.message ?? "Invalid notice." };
  }

  const lease = await db.lease.findFirst({
    where: { id: parsed.data.leaseId, deletedAt: null, status: "ACTIVE" },
    include: { unit: { select: { id: true } } },
  });
  if (!lease) return { error: "Active lease not found." };

  const moveOutDate = new Date(parsed.data.moveOutDate);
  if (Number.isNaN(moveOutDate.getTime())) {
    return { error: "Invalid move-out date." };
  }

  await db.$transaction(async (tx) => {
    await tx.lease.update({
      where: { id: lease.id },
      data: {
        noticeGivenAt: new Date(),
        plannedMoveOutDate: moveOutDate,
        endDate: moveOutDate,
        terms: [
          lease.terms,
          `Notice to vacate ${new Date().toISOString().slice(0, 10)} · move-out ${parsed.data.moveOutDate}${
            parsed.data.note ? ` — ${parsed.data.note}` : ""
          }`,
        ]
          .filter(Boolean)
          .join("\n"),
      },
    });
    await tx.unit.update({
      where: { id: lease.unitId },
      data: {
        status: "NOTICE_GIVEN",
        moveOutDate,
      },
    });
  });

  await logActivity({
    action: ActivityAction.UPDATED,
    entityType: "Lease",
    entityId: lease.id,
    userId: session.user.id,
    tenantId: lease.tenantId,
    unitId: lease.unitId,
    fieldName: "noticeGivenAt",
    newValue: moveOutDate.toISOString(),
    metadata: { notice: true, note: parsed.data.note },
  });

  revalidateLeaseViews(lease.id, lease.tenantId);
  revalidatePath("/properties");
  return { success: true };
}

export async function clearNoticeToVacate(leaseId: string) {
  const session = await requirePermission("leases:write");
  const lease = await db.lease.findFirst({
    where: { id: leaseId, deletedAt: null, status: "ACTIVE" },
  });
  if (!lease) return { error: "Active lease not found." };
  if (!lease.noticeGivenAt) return { error: "No notice on file." };

  await db.$transaction(async (tx) => {
    await tx.lease.update({
      where: { id: lease.id },
      data: {
        noticeGivenAt: null,
        plannedMoveOutDate: null,
        terms: [lease.terms, `Notice cleared ${new Date().toISOString().slice(0, 10)}`]
          .filter(Boolean)
          .join("\n"),
      },
    });
    await tx.unit.update({
      where: { id: lease.unitId },
      data: {
        status: "OCCUPIED",
        moveOutDate: null,
      },
    });
  });

  await logActivity({
    action: ActivityAction.UPDATED,
    entityType: "Lease",
    entityId: lease.id,
    userId: session.user.id,
    tenantId: lease.tenantId,
    unitId: lease.unitId,
    fieldName: "noticeGivenAt",
    oldValue: lease.noticeGivenAt.toISOString(),
    newValue: undefined,
    metadata: { noticeCleared: true },
  });

  revalidateLeaseViews(lease.id, lease.tenantId);
  return { success: true };
}
