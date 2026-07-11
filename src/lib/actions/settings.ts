"use server";

import { revalidatePath } from "next/cache";
import { requirePermission } from "@/lib/auth/session";
import {
  updatePaymentSettings,
  updateMessagingSettings,
  upsertSettings,
  type PaymentProvider,
} from "@/lib/settings";

function revalidateSettings() {
  revalidatePath("/settings");
  revalidatePath("/dashboard");
  revalidatePath("/messages");
}

export async function savePaymentSettings(formData: FormData) {
  await requirePermission("settings:write");

  const provider = formData.get("provider") as PaymentProvider;
  const externalUrl = formData.get("externalUrl") as string;

  await updatePaymentSettings({
    provider: provider || "external",
    externalUrl: externalUrl || undefined,
  });

  revalidateSettings();
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

  revalidateSettings();
  return { success: true };
}

export async function saveCompanySettings(formData: FormData) {
  await requirePermission("settings:write");

  await upsertSettings({
    company_name: String(formData.get("name") || ""),
    company_legal_name: String(formData.get("legalName") || ""),
    company_support_email: String(formData.get("supportEmail") || ""),
    company_support_phone: String(formData.get("supportPhone") || ""),
    company_website: String(formData.get("website") || ""),
    company_address: String(formData.get("address") || ""),
    company_city: String(formData.get("city") || ""),
    company_state: String(formData.get("state") || ""),
    company_zip: String(formData.get("zipCode") || ""),
    company_timezone: String(formData.get("timezone") || "America/Los_Angeles"),
  });

  revalidateSettings();
  return { success: true };
}

export async function saveLeasingSettings(formData: FormData) {
  await requirePermission("settings:write");

  await upsertSettings({
    lease_default_months: String(formData.get("defaultLeaseMonths") || "12"),
    lease_deposit_months: String(formData.get("defaultDepositMonths") || "1"),
    lease_showing_minutes: String(formData.get("defaultShowingMinutes") || "30"),
    lease_application_fee: String(formData.get("applicationFee") || "0"),
    lease_late_fee: String(formData.get("lateFeeAmount") || "0"),
    lease_late_grace_days: String(formData.get("lateFeeGraceDays") || "5"),
    lease_require_pets: formData.get("requirePetsDisclosure") === "on" ? "true" : "false",
  });

  revalidateSettings();
  return { success: true };
}

export async function saveMaintenanceSettings(formData: FormData) {
  await requirePermission("settings:write");

  await upsertSettings({
    maint_default_priority: String(formData.get("defaultPriority") || "MEDIUM"),
    maint_emergency_sla: String(formData.get("emergencySlaHours") || "4"),
    maint_high_sla: String(formData.get("highSlaHours") || "24"),
    maint_tenant_create: formData.get("allowTenantCreate") === "on" ? "true" : "false",
    maint_require_photos: formData.get("requirePhotos") === "on" ? "true" : "false",
    maint_after_hours_phone: String(formData.get("afterHoursPhone") || ""),
  });

  revalidateSettings();
  return { success: true };
}

export async function saveNotificationSettings(formData: FormData) {
  await requirePermission("settings:write");

  await upsertSettings({
    notify_email_maintenance: formData.get("emailMaintenance") === "on" ? "true" : "false",
    notify_email_showings: formData.get("emailShowings") === "on" ? "true" : "false",
    notify_email_lease_expiring: formData.get("emailLeaseExpiring") === "on" ? "true" : "false",
    notify_email_prospects: formData.get("emailNewProspects") === "on" ? "true" : "false",
    notify_digest_frequency: String(formData.get("digestFrequency") || "daily"),
  });

  revalidateSettings();
  return { success: true };
}

export async function saveCalendarSettings(formData: FormData) {
  await requirePermission("settings:write");

  await upsertSettings({
    calendar_week_starts: String(formData.get("weekStartsOn") || "sunday"),
    calendar_open: String(formData.get("businessOpen") || "09:00"),
    calendar_close: String(formData.get("businessClose") || "17:00"),
    calendar_default_minutes: String(formData.get("defaultEventMinutes") || "60"),
    calendar_show_weekends: formData.get("showWeekends") === "on" ? "true" : "false",
  });

  revalidateSettings();
  return { success: true };
}

export async function saveRegionalSettings(formData: FormData) {
  await requirePermission("settings:write");

  await upsertSettings({
    regional_currency: String(formData.get("currency") || "USD"),
    regional_date_format: String(formData.get("dateFormat") || "MM/DD/YYYY"),
    regional_measurement: String(formData.get("measurement") || "imperial"),
  });

  revalidateSettings();
  return { success: true };
}
