"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import { updatePaymentSettings, type PaymentProvider } from "@/lib/settings";

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
