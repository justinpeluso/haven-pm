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
import { chargeSchema, paymentSchema } from "@/lib/validations";

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
