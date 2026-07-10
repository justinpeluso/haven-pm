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
}) {
  const stripe = getStripe();
  if (!stripe) return null;

  const settings = await getPaymentSettings();

  const session = await stripe.checkout.sessions.create({
    mode: "payment",
    customer_email: params.tenantEmail,
    line_items: [
      {
        price_data: {
          currency: "usd",
          product_data: {
            name: "Monthly Rent",
            description: `Rent payment for ${params.tenantName}`,
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
      type: "rent",
    },
  });

  return session.url;
}
