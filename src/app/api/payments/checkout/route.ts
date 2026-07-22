import { NextResponse } from "next/server";
import { ChargeStatus } from "@prisma/client";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRentCheckoutSession } from "@/lib/stripe";
import { getPaymentSettings } from "@/lib/settings";
import { chargeBalance } from "@/lib/rent";

export async function POST(request: Request) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (session.user.role !== "TENANT") {
    return NextResponse.json({ error: "Tenants only" }, { status: 403 });
  }

  const settings = await getPaymentSettings();

  if (settings.provider !== "stripe") {
    return NextResponse.json({ url: settings.externalUrl });
  }

  let requestedChargeId: string | undefined;
  try {
    const body = await request.json();
    if (body?.chargeId && typeof body.chargeId === "string") {
      requestedChargeId = body.chargeId;
    }
  } catch {
    // empty body is fine — pay oldest open charge
  }

  const tenant = await db.tenant.findUnique({
    where: { userId: session.user.id },
    include: {
      user: { select: { email: true, name: true } },
      leases: {
        where: { status: "ACTIVE", deletedAt: null },
        take: 1,
      },
    },
  });

  if (!tenant?.leases[0]) {
    return NextResponse.json({ error: "No active lease" }, { status: 400 });
  }

  const lease = tenant.leases[0];
  const openCharges = await db.charge.findMany({
    where: {
      leaseId: lease.id,
      tenantId: tenant.id,
      status: { in: [ChargeStatus.OPEN, ChargeStatus.PARTIALLY_PAID] },
    },
    orderBy: { dueDate: "asc" },
  });

  const charge = requestedChargeId
    ? openCharges.find((c) => c.id === requestedChargeId)
    : openCharges[0];

  if (!charge) {
    return NextResponse.json({ error: "No open balance to pay" }, { status: 400 });
  }

  const amountDue = chargeBalance(charge);
  if (amountDue <= 0) {
    return NextResponse.json({ error: "Charge already paid" }, { status: 400 });
  }

  const amountCents = Math.round(amountDue * 100);
  const checkoutUrl = await createRentCheckoutSession({
    tenantEmail: tenant.user.email,
    tenantName: tenant.user.name || "Tenant",
    amountCents,
    leaseId: lease.id,
    chargeId: charge.id,
    tenantId: tenant.id,
  });

  if (!checkoutUrl) {
    return NextResponse.json({
      error: "Stripe not configured. Add STRIPE_SECRET_KEY to .env",
      url: settings.externalUrl,
    });
  }

  return NextResponse.json({ url: checkoutUrl });
}
