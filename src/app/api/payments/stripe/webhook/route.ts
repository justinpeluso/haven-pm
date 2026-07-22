import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { PaymentMethod, PaymentStatus, Prisma } from "@prisma/client";
import { db } from "@/lib/db";
import { getStripe } from "@/lib/stripe";
import { deriveChargeStatus, toNumber } from "@/lib/rent";

export const runtime = "nodejs";

export async function POST(request: NextRequest) {
  const stripe = getStripe();
  const webhookSecret = process.env.STRIPE_WEBHOOK_SECRET;
  if (!stripe || !webhookSecret) {
    return NextResponse.json({ error: "Stripe webhook not configured" }, { status: 500 });
  }

  const signature = request.headers.get("stripe-signature");
  if (!signature) {
    return NextResponse.json({ error: "Missing signature" }, { status: 400 });
  }

  const rawBody = await request.text();
  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(rawBody, signature, webhookSecret);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid signature";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (event.type === "checkout.session.completed") {
    const checkout = event.data.object as Stripe.Checkout.Session;
    const leaseId = checkout.metadata?.leaseId;
    const chargeId = checkout.metadata?.chargeId;
    const tenantId = checkout.metadata?.tenantId;
    const sessionId = checkout.id;
    const amountCents = checkout.amount_total ?? 0;

    if (!leaseId || !tenantId || !chargeId || amountCents <= 0) {
      return NextResponse.json({ received: true, skipped: true });
    }

    const existing = await db.payment.findUnique({
      where: { stripeCheckoutSessionId: sessionId },
      select: { id: true },
    });
    if (existing) {
      return NextResponse.json({ received: true, duplicate: true });
    }

    const amount = amountCents / 100;

    await db.$transaction(async (tx) => {
      await tx.payment.create({
        data: {
          leaseId,
          tenantId,
          chargeId,
          amount: new Prisma.Decimal(amount),
          method: PaymentMethod.STRIPE,
          status: PaymentStatus.SUCCEEDED,
          paidAt: new Date(),
          reference: checkout.payment_intent?.toString() || sessionId,
          stripeCheckoutSessionId: sessionId,
          stripePaymentIntentId:
            typeof checkout.payment_intent === "string"
              ? checkout.payment_intent
              : checkout.payment_intent?.id,
          notes: "Recorded via Stripe checkout webhook",
        },
      });

      const charge = await tx.charge.findUnique({ where: { id: chargeId } });
      if (charge) {
        const nextPaid = toNumber(charge.amountPaid) + amount;
        await tx.charge.update({
          where: { id: chargeId },
          data: {
            amountPaid: new Prisma.Decimal(
              Math.min(nextPaid, toNumber(charge.amount))
            ),
            status: deriveChargeStatus(toNumber(charge.amount), nextPaid),
          },
        });
      }
    });
  }

  return NextResponse.json({ received: true });
}
