import Stripe from "stripe";
import { getPaymentSettings } from "./settings";

export function getStripe() {
  const key = process.env.STRIPE_SECRET_KEY;
  if (!key) return null;
  return new Stripe(key, { apiVersion: "2025-02-24.acacia" });
}

export async function createRentCheckoutSession(params: {
  tenantEmail: string;
  tenantName: string;
  amountCents: number;
  leaseId: string;
  chargeId: string;
  tenantId: string;
}) {
  const stripe = getStripe();
  if (!stripe) return null;

  await getPaymentSettings();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.tenantEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Rent payment",
            description: `Payment for ${params.tenantName}`,
          },
          unit_amount: params.amountCents,
        },
        quantity: 1,
      },
    ],
    success_url: `${process.env.AUTH_URL || "http://localhost:3000"}/dashboard?payment=success`,
    cancel_url: `${process.env.AUTH_URL || "http://localhost:3000"}/dashboard?payment=cancelled`,
    metadata: {
      leaseId: params.leaseId,
      chargeId: params.chargeId,
      tenantId: params.tenantId,
      type: "rent",
    },
  });

  return session.url;
}
