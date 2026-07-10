import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { createRentCheckoutSession } from "@/lib/stripe";
import { getPaymentSettings } from "@/lib/settings";

export async function POST() {
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

  const tenant = await db.tenant.findUnique({
    where: { userId: session.user.id },
    include: {
      user: { select: { email: true, name: true } },
      leases: {
        where: { status: "ACTIVE" },
        take: 1,
      },
    },
  });

  if (!tenant?.leases[0]) {
    return NextResponse.json({ error: "No active lease" }, { status: 400 });
  }

  const lease = tenant.leases[0];
  const amountCents = Math.round(Number(lease.rentAmount) * 100);

  const checkoutUrl = await createRentCheckoutSession({
    tenantEmail: tenant.user.email,
    tenantName: tenant.user.name || "Tenant",
    amountCents,
    leaseId: lease.id,
  });

  if (!checkoutUrl) {
    return NextResponse.json({
      error: "Stripe not configured. Add STRIPE_SECRET_KEY to .env",
      url: settings.externalUrl,
    });
  }

  return NextResponse.json({ url: checkoutUrl });
}
