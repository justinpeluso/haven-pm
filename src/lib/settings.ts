import { db } from "@/lib/db";

export type PaymentProvider = "external" | "stripe";

export interface PaymentSettings {
  provider: PaymentProvider;
  externalUrl: string;
  stripeEnabled: boolean;
}

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const settings = await db.setting.findMany({
    where: {
      key: { in: ["payment_provider", "payment_portal_url", "stripe_enabled"] },
    },
  });

  const map = Object.fromEntries(settings.map((s) => [s.key, s.value]));

  return {
    provider: (map.payment_provider as PaymentProvider) || "external",
    externalUrl: map.payment_portal_url || process.env.PAYMENT_PORTAL_URL || "https://payments.example.com",
    stripeEnabled: map.stripe_enabled === "true" && !!process.env.STRIPE_SECRET_KEY,
  };
}

export async function updatePaymentSettings(data: {
  provider: PaymentProvider;
  externalUrl?: string;
}) {
  await db.setting.upsert({
    where: { key: "payment_provider" },
    update: { value: data.provider },
    create: { key: "payment_provider", value: data.provider },
  });

  if (data.externalUrl) {
    await db.setting.upsert({
      where: { key: "payment_portal_url" },
      update: { value: data.externalUrl },
      create: { key: "payment_portal_url", value: data.externalUrl },
    });
  }
}
