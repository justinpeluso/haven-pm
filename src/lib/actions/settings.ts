"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import {
  updatePaymentSettings,
  updateMessagingSettings,
  type PaymentProvider,
} from "@/lib/settings";

export async function savePaymentSettings(formData: FormData) {
  await requirePermission("settings:write");

  const provider = formData.get("provider") as PaymentProvider;
  const externalUrl = formData.get("externalUrl") as string;

  await updatePaymentSettings({
    provider: provider || "external",
    externalUrl: externalUrl || undefined,
  });

  revalidatePath("/settings");
  revalidatePath("/dashboard");
  return { success: true };
}

export async function saveMessagingSettings(formData: FormData) {
  await requirePermission("settings:write");

  const portalUrl = (formData.get("portalUrl") as string)?.trim();
  const providerName = (formData.get("providerName") as string)?.trim();

  if (!portalUrl) {
    return { error: "Messaging portal URL is required" };
  }

  await updateMessagingSettings({
    portalUrl,
    providerName: providerName || undefined,
  });

  revalidatePath("/settings");
  revalidatePath("/messages");
  revalidatePath("/dashboard");
  return { success: true };
}
