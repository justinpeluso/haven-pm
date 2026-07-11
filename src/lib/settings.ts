import { db } from "@/lib/db";

export type PaymentProvider = "external" | "stripe";

export interface PaymentSettings {
  provider: PaymentProvider;
  externalUrl: string;
  stripeEnabled: boolean;
}

export interface MessagingSettings {
  portalUrl: string;
  providerName: string;
  phoneNumber: string;
}

export interface CompanySettings {
  name: string;
  legalName: string;
  supportEmail: string;
  supportPhone: string;
  website: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  timezone: string;
}

export interface LeasingSettings {
  defaultLeaseMonths: string;
  defaultDepositMonths: string;
  defaultShowingMinutes: string;
  applicationFee: string;
  lateFeeAmount: string;
  lateFeeGraceDays: string;
  requirePetsDisclosure: string; // "true" | "false"
}

export interface MaintenanceSettings {
  defaultPriority: string;
  emergencySlaHours: string;
  highSlaHours: string;
  allowTenantCreate: string;
  requirePhotos: string;
  afterHoursPhone: string;
}

export interface NotificationSettings {
  emailMaintenance: string;
  emailShowings: string;
  emailLeaseExpiring: string;
  emailNewProspects: string;
  digestFrequency: string; // daily | weekly | off
}

export interface CalendarSettings {
  weekStartsOn: string; // sunday | monday
  businessOpen: string;
  businessClose: string;
  defaultEventMinutes: string;
  showWeekends: string;
}

export interface RegionalSettings {
  currency: string;
  dateFormat: string;
  measurement: string; // imperial | metric
}

async function getSettingMap(keys: string[]) {
  const settings = await db.setting.findMany({ where: { key: { in: keys } } });
  return Object.fromEntries(settings.map((s) => [s.key, s.value]));
}

export async function upsertSettings(entries: Record<string, string>) {
  await Promise.all(
    Object.entries(entries).map(([key, value]) =>
      db.setting.upsert({
        where: { key },
        update: { value },
        create: { key, value },
      })
    )
  );
}

const DEFAULT_MESSAGING_URL = "https://my.openphone.com/";
const DEFAULT_MESSAGING_PROVIDER = "OpenPhone";

export async function getPaymentSettings(): Promise<PaymentSettings> {
  const map = await getSettingMap([
    "payment_provider",
    "payment_portal_url",
    "stripe_enabled",
  ]);

  return {
    provider: (map.payment_provider as PaymentProvider) || "external",
    externalUrl:
      map.payment_portal_url ||
      process.env.PAYMENT_PORTAL_URL ||
      "https://payments.example.com",
    stripeEnabled: map.stripe_enabled === "true" && !!process.env.STRIPE_SECRET_KEY,
  };
}

export async function updatePaymentSettings(data: {
  provider: PaymentProvider;
  externalUrl?: string;
}) {
  const entries: Record<string, string> = {
    payment_provider: data.provider,
  };
  if (data.externalUrl) entries.payment_portal_url = data.externalUrl;
  await upsertSettings(entries);
}

export async function getMessagingSettings(): Promise<MessagingSettings> {
  const map = await getSettingMap([
    "messaging_portal_url",
    "messaging_provider_name",
    "messaging_phone_number",
  ]);

  return {
    portalUrl:
      map.messaging_portal_url ||
      process.env.MESSAGING_PORTAL_URL ||
      DEFAULT_MESSAGING_URL,
    providerName:
      map.messaging_provider_name ||
      process.env.MESSAGING_PROVIDER_NAME ||
      DEFAULT_MESSAGING_PROVIDER,
    phoneNumber:
      map.messaging_phone_number ||
      process.env.MESSAGING_PHONE_NUMBER ||
      "",
  };
}

export async function updateMessagingSettings(data: {
  portalUrl: string;
  providerName?: string;
  phoneNumber?: string;
}) {
  const entries: Record<string, string> = {
    messaging_portal_url: data.portalUrl,
  };
  if (data.providerName) entries.messaging_provider_name = data.providerName;
  if (data.phoneNumber !== undefined) {
    entries.messaging_phone_number = data.phoneNumber;
  }
  await upsertSettings(entries);
}

export async function getCompanySettings(): Promise<CompanySettings> {
  const map = await getSettingMap([
    "company_name",
    "company_legal_name",
    "company_support_email",
    "company_support_phone",
    "company_website",
    "company_address",
    "company_city",
    "company_state",
    "company_zip",
    "company_timezone",
  ]);

  return {
    name: map.company_name || "Haven Property Management",
    legalName: map.company_legal_name || "Haven PM LLC",
    supportEmail: map.company_support_email || "support@havenpm.com",
    supportPhone: map.company_support_phone || "555-0100",
    website: map.company_website || "https://havenpm.example.com",
    address: map.company_address || "100 Commerce St",
    city: map.company_city || "Pittsburgh",
    state: map.company_state || "PA",
    zipCode: map.company_zip || "15222",
    timezone: map.company_timezone || "America/New_York",
  };
}

export async function getLeasingSettings(): Promise<LeasingSettings> {
  const map = await getSettingMap([
    "lease_default_months",
    "lease_deposit_months",
    "lease_showing_minutes",
    "lease_application_fee",
    "lease_late_fee",
    "lease_late_grace_days",
    "lease_require_pets",
  ]);

  return {
    defaultLeaseMonths: map.lease_default_months || "12",
    defaultDepositMonths: map.lease_deposit_months || "1",
    defaultShowingMinutes: map.lease_showing_minutes || "30",
    applicationFee: map.lease_application_fee || "50",
    lateFeeAmount: map.lease_late_fee || "75",
    lateFeeGraceDays: map.lease_late_grace_days || "5",
    requirePetsDisclosure: map.lease_require_pets || "true",
  };
}

export async function getMaintenanceSettings(): Promise<MaintenanceSettings> {
  const map = await getSettingMap([
    "maint_default_priority",
    "maint_emergency_sla",
    "maint_high_sla",
    "maint_tenant_create",
    "maint_require_photos",
    "maint_after_hours_phone",
  ]);

  return {
    defaultPriority: map.maint_default_priority || "MEDIUM",
    emergencySlaHours: map.maint_emergency_sla || "4",
    highSlaHours: map.maint_high_sla || "24",
    allowTenantCreate: map.maint_tenant_create || "true",
    requirePhotos: map.maint_require_photos || "false",
    afterHoursPhone: map.maint_after_hours_phone || "555-0199",
  };
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const map = await getSettingMap([
    "notify_email_maintenance",
    "notify_email_showings",
    "notify_email_lease_expiring",
    "notify_email_prospects",
    "notify_digest_frequency",
  ]);

  return {
    emailMaintenance: map.notify_email_maintenance || "true",
    emailShowings: map.notify_email_showings || "true",
    emailLeaseExpiring: map.notify_email_lease_expiring || "true",
    emailNewProspects: map.notify_email_prospects || "true",
    digestFrequency: map.notify_digest_frequency || "daily",
  };
}

export async function getCalendarSettings(): Promise<CalendarSettings> {
  const map = await getSettingMap([
    "calendar_week_starts",
    "calendar_open",
    "calendar_close",
    "calendar_default_minutes",
    "calendar_show_weekends",
  ]);

  return {
    weekStartsOn: map.calendar_week_starts || "sunday",
    businessOpen: map.calendar_open || "09:00",
    businessClose: map.calendar_close || "17:00",
    defaultEventMinutes: map.calendar_default_minutes || "60",
    showWeekends: map.calendar_show_weekends || "true",
  };
}

export async function getRegionalSettings(): Promise<RegionalSettings> {
  const map = await getSettingMap([
    "regional_currency",
    "regional_date_format",
    "regional_measurement",
  ]);

  return {
    currency: map.regional_currency || "USD",
    dateFormat: map.regional_date_format || "MM/DD/YYYY",
    measurement: map.regional_measurement || "imperial",
  };
}

export async function getAllAppSettings() {
  const [payment, messaging, company, leasing, maintenance, notifications, calendar, regional] =
    await Promise.all([
      getPaymentSettings(),
      getMessagingSettings(),
      getCompanySettings(),
      getLeasingSettings(),
      getMaintenanceSettings(),
      getNotificationSettings(),
      getCalendarSettings(),
      getRegionalSettings(),
    ]);

  return {
    payment,
    messaging,
    company,
    leasing,
    maintenance,
    notifications,
    calendar,
    regional,
  };
}
