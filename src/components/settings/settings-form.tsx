"use client";

import { useState } from "react";
import {
  savePaymentSettings,
  saveMessagingSettings,
  saveCompanySettings,
  saveLeasingSettings,
  saveMaintenanceSettings,
  saveNotificationSettings,
  saveCalendarSettings,
  saveRegionalSettings,
} from "@/lib/actions/settings";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Loader2,
  CreditCard,
  Smartphone,
  Building2,
  FileSignature,
  Wrench,
  Bell,
  Calendar,
  Globe,
  ExternalLink,
} from "lucide-react";
import type {
  PaymentSettings,
  MessagingSettings,
  CompanySettings,
  LeasingSettings,
  MaintenanceSettings,
  NotificationSettings,
  CalendarSettings,
  RegionalSettings,
} from "@/lib/settings";
import { toast } from "@/hooks/use-toast";

interface SettingsFormProps {
  payment: PaymentSettings;
  messaging: MessagingSettings;
  company: CompanySettings;
  leasing: LeasingSettings;
  maintenance: MaintenanceSettings;
  notifications: NotificationSettings;
  calendar: CalendarSettings;
  regional: RegionalSettings;
  stripeConfigured: boolean;
  canWrite: boolean;
}

function SaveButton({ loading, disabled }: { loading: boolean; disabled?: boolean }) {
  return (
    <Button type="submit" disabled={loading || disabled}>
      {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
      Save
    </Button>
  );
}

export function SettingsForm({
  payment,
  messaging,
  company,
  leasing,
  maintenance,
  notifications,
  calendar,
  regional,
  stripeConfigured,
  canWrite,
}: SettingsFormProps) {
  const [loadingKey, setLoadingKey] = useState<string | null>(null);
  const [provider, setProvider] = useState(payment.provider);
  const [leasePriority, setLeasePriority] = useState(maintenance.defaultPriority);
  const [digest, setDigest] = useState(notifications.digestFrequency);
  const [weekStart, setWeekStart] = useState(calendar.weekStartsOn);
  const [currency, setCurrency] = useState(regional.currency);
  const [dateFormat, setDateFormat] = useState(regional.dateFormat);
  const [measurement, setMeasurement] = useState(regional.measurement);
  const [timezone, setTimezone] = useState(company.timezone);
  const [requirePets, setRequirePets] = useState(leasing.requirePetsDisclosure === "true");
  const [allowTenantCreate, setAllowTenantCreate] = useState(maintenance.allowTenantCreate === "true");
  const [requirePhotos, setRequirePhotos] = useState(maintenance.requirePhotos === "true");
  const [emailMaintenance, setEmailMaintenance] = useState(notifications.emailMaintenance === "true");
  const [emailShowings, setEmailShowings] = useState(notifications.emailShowings === "true");
  const [emailLeaseExpiring, setEmailLeaseExpiring] = useState(notifications.emailLeaseExpiring === "true");
  const [emailNewProspects, setEmailNewProspects] = useState(notifications.emailNewProspects === "true");
  const [showWeekends, setShowWeekends] = useState(calendar.showWeekends === "true");

  const runSave = async (
    key: string,
    action: (fd: FormData) => Promise<{ success?: boolean; error?: string }>,
    formData: FormData
  ) => {
    if (!canWrite) {
      toast({ title: "Read-only", description: "You don't have permission to change settings.", variant: "destructive" });
      return;
    }
    setLoadingKey(key);
    const result = await action(formData);
    setLoadingKey(null);
    if (result.error) {
      toast({ title: "Could not save", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Settings saved" });
  };

  return (
    <div className="space-y-6">
      {/* Company */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("timezone", timezone);
          void runSave("company", saveCompanySettings, fd);
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Building2 className="h-4 w-4" />
              Company profile
            </CardTitle>
            <CardDescription>Brand and contact details shown across Haven</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Company name</Label>
                <Input id="name" name="name" defaultValue={company.name} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="legalName">Legal name</Label>
                <Input id="legalName" name="legalName" defaultValue={company.legalName} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportEmail">Support email</Label>
                <Input id="supportEmail" name="supportEmail" type="email" defaultValue={company.supportEmail} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="supportPhone">Support phone</Label>
                <Input id="supportPhone" name="supportPhone" defaultValue={company.supportPhone} disabled={!canWrite} />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="website">Website</Label>
                <Input id="website" name="website" type="url" defaultValue={company.website} disabled={!canWrite} />
                {company.website && (
                  <p className="text-sm">
                    <a
                      href={company.website}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-primary hover:underline"
                    >
                      {company.website.replace(/^https?:\/\//, "")}
                      <ExternalLink className="h-3 w-3" />
                    </a>
                  </p>
                )}
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="address">Street address</Label>
                <Input id="address" name="address" defaultValue={company.address} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" defaultValue={company.city} disabled={!canWrite} />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-2">
                  <Label htmlFor="state">State</Label>
                  <Input id="state" name="state" defaultValue={company.state} disabled={!canWrite} />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="zipCode">ZIP</Label>
                  <Input id="zipCode" name="zipCode" defaultValue={company.zipCode} disabled={!canWrite} />
                </div>
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label>Timezone</Label>
                <Select value={timezone} onValueChange={setTimezone} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[
                      "America/Los_Angeles",
                      "America/Denver",
                      "America/Chicago",
                      "America/New_York",
                      "America/Phoenix",
                      "Pacific/Honolulu",
                    ].map((tz) => (
                      <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            {canWrite && <SaveButton loading={loadingKey === "company"} />}
          </CardContent>
        </Card>
      </form>

      {/* Leasing */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          if (requirePets) fd.set("requirePetsDisclosure", "on");
          void runSave("leasing", saveLeasingSettings, fd);
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileSignature className="h-4 w-4" />
              Leasing defaults
            </CardTitle>
            <CardDescription>Defaults for new leases, showings, and fees</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="defaultLeaseMonths">Lease term (months)</Label>
                <Input id="defaultLeaseMonths" name="defaultLeaseMonths" type="number" min={1} defaultValue={leasing.defaultLeaseMonths} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultDepositMonths">Deposit (months rent)</Label>
                <Input id="defaultDepositMonths" name="defaultDepositMonths" type="number" min={0} step={0.5} defaultValue={leasing.defaultDepositMonths} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultShowingMinutes">Showing length (min)</Label>
                <Input id="defaultShowingMinutes" name="defaultShowingMinutes" type="number" min={15} step={15} defaultValue={leasing.defaultShowingMinutes} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="applicationFee">Application fee ($)</Label>
                <Input id="applicationFee" name="applicationFee" type="number" min={0} step={1} defaultValue={leasing.applicationFee} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFeeAmount">Late fee ($)</Label>
                <Input id="lateFeeAmount" name="lateFeeAmount" type="number" min={0} step={1} defaultValue={leasing.lateFeeAmount} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="lateFeeGraceDays">Late fee grace (days)</Label>
                <Input id="lateFeeGraceDays" name="lateFeeGraceDays" type="number" min={0} defaultValue={leasing.lateFeeGraceDays} disabled={!canWrite} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                className="h-4 w-4 rounded border"
                checked={requirePets}
                onChange={(e) => setRequirePets(e.target.checked)}
                disabled={!canWrite}
              />
              Require pets disclosure on applications
            </label>
            {canWrite && <SaveButton loading={loadingKey === "leasing"} />}
          </CardContent>
        </Card>
      </form>

      {/* Maintenance */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("defaultPriority", leasePriority);
          if (allowTenantCreate) fd.set("allowTenantCreate", "on");
          if (requirePhotos) fd.set("requirePhotos", "on");
          void runSave("maintenance", saveMaintenanceSettings, fd);
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" />
              Maintenance
            </CardTitle>
            <CardDescription>Work-order defaults and response targets</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Default priority</Label>
                <Select value={leasePriority} onValueChange={setLeasePriority} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["LOW", "MEDIUM", "HIGH", "EMERGENCY"].map((p) => (
                      <SelectItem key={p} value={p}>{p}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="emergencySlaHours">Emergency SLA (hours)</Label>
                <Input id="emergencySlaHours" name="emergencySlaHours" type="number" min={1} defaultValue={maintenance.emergencySlaHours} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="highSlaHours">High priority SLA (hours)</Label>
                <Input id="highSlaHours" name="highSlaHours" type="number" min={1} defaultValue={maintenance.highSlaHours} disabled={!canWrite} />
              </div>
              <div className="space-y-2 sm:col-span-3">
                <Label htmlFor="afterHoursPhone">After-hours emergency phone</Label>
                <Input id="afterHoursPhone" name="afterHoursPhone" defaultValue={maintenance.afterHoursPhone} disabled={!canWrite} />
              </div>
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border" checked={allowTenantCreate} onChange={(e) => setAllowTenantCreate(e.target.checked)} disabled={!canWrite} />
                Allow tenants to submit maintenance requests
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border" checked={requirePhotos} onChange={(e) => setRequirePhotos(e.target.checked)} disabled={!canWrite} />
                Require photo upload on new requests
              </label>
            </div>
            {canWrite && <SaveButton loading={loadingKey === "maintenance"} />}
          </CardContent>
        </Card>
      </form>

      {/* Notifications */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("digestFrequency", digest);
          if (emailMaintenance) fd.set("emailMaintenance", "on");
          if (emailShowings) fd.set("emailShowings", "on");
          if (emailLeaseExpiring) fd.set("emailLeaseExpiring", "on");
          if (emailNewProspects) fd.set("emailNewProspects", "on");
          void runSave("notifications", saveNotificationSettings, fd);
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Bell className="h-4 w-4" />
              Notifications
            </CardTitle>
            <CardDescription>Email alert preferences for staff</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border" checked={emailMaintenance} onChange={(e) => setEmailMaintenance(e.target.checked)} disabled={!canWrite} />
                New / updated maintenance requests
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border" checked={emailShowings} onChange={(e) => setEmailShowings(e.target.checked)} disabled={!canWrite} />
                Showing booked or changed
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border" checked={emailLeaseExpiring} onChange={(e) => setEmailLeaseExpiring(e.target.checked)} disabled={!canWrite} />
                Leases expiring within 60 days
              </label>
              <label className="flex items-center gap-2 text-sm">
                <input type="checkbox" className="h-4 w-4 rounded border" checked={emailNewProspects} onChange={(e) => setEmailNewProspects(e.target.checked)} disabled={!canWrite} />
                New prospect leads
              </label>
            </div>
            <div className="space-y-2 max-w-xs">
              <Label>Email digest</Label>
              <Select value={digest} onValueChange={setDigest} disabled={!canWrite}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="daily">Daily</SelectItem>
                  <SelectItem value="weekly">Weekly</SelectItem>
                  <SelectItem value="off">Off</SelectItem>
                </SelectContent>
              </Select>
            </div>
            {canWrite && <SaveButton loading={loadingKey === "notifications"} />}
          </CardContent>
        </Card>
      </form>

      {/* Calendar */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("weekStartsOn", weekStart);
          if (showWeekends) fd.set("showWeekends", "on");
          void runSave("calendar", saveCalendarSettings, fd);
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Calendar & hours
            </CardTitle>
            <CardDescription>Business hours and calendar display</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Week starts on</Label>
                <Select value={weekStart} onValueChange={setWeekStart} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sunday">Sunday</SelectItem>
                    <SelectItem value="monday">Monday</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="defaultEventMinutes">Default event length (min)</Label>
                <Input id="defaultEventMinutes" name="defaultEventMinutes" type="number" min={15} step={15} defaultValue={calendar.defaultEventMinutes} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessOpen">Office opens</Label>
                <Input id="businessOpen" name="businessOpen" type="time" defaultValue={calendar.businessOpen} disabled={!canWrite} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="businessClose">Office closes</Label>
                <Input id="businessClose" name="businessClose" type="time" defaultValue={calendar.businessClose} disabled={!canWrite} />
              </div>
            </div>
            <label className="flex items-center gap-2 text-sm">
              <input type="checkbox" className="h-4 w-4 rounded border" checked={showWeekends} onChange={(e) => setShowWeekends(e.target.checked)} disabled={!canWrite} />
              Show weekends on calendar
            </label>
            {canWrite && <SaveButton loading={loadingKey === "calendar"} />}
          </CardContent>
        </Card>
      </form>

      {/* Regional */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("currency", currency);
          fd.set("dateFormat", dateFormat);
          fd.set("measurement", measurement);
          void runSave("regional", saveRegionalSettings, fd);
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Globe className="h-4 w-4" />
              Regional
            </CardTitle>
            <CardDescription>Currency, dates, and units of measure</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label>Currency</Label>
                <Select value={currency} onValueChange={setCurrency} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["USD", "CAD", "EUR", "GBP", "MXN"].map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Date format</Label>
                <Select value={dateFormat} onValueChange={setDateFormat} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="MM/DD/YYYY">MM/DD/YYYY</SelectItem>
                    <SelectItem value="DD/MM/YYYY">DD/MM/YYYY</SelectItem>
                    <SelectItem value="YYYY-MM-DD">YYYY-MM-DD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Measurements</Label>
                <Select value={measurement} onValueChange={setMeasurement} disabled={!canWrite}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="imperial">Imperial (sq ft)</SelectItem>
                    <SelectItem value="metric">Metric (m²)</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            {canWrite && <SaveButton loading={loadingKey === "regional"} />}
          </CardContent>
        </Card>
      </form>

      {/* Payment */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          fd.set("provider", provider);
          void runSave("payment", savePaymentSettings, fd);
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Payments
            </CardTitle>
            <CardDescription>How tenants pay rent via Pay Rent</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Payment provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as "external" | "stripe")} disabled={!canWrite}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">External portal URL</SelectItem>
                  <SelectItem value="stripe" disabled={!stripeConfigured}>
                    Stripe Checkout {!stripeConfigured && "(not configured)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
            {provider === "external" && (
              <div className="space-y-2">
                <Label htmlFor="externalUrl">Payment portal URL</Label>
                <Input id="externalUrl" name="externalUrl" type="url" defaultValue={payment.externalUrl} disabled={!canWrite} />
              </div>
            )}
            {provider === "stripe" && (
              <p className="text-sm text-muted-foreground">
                Uses <code>STRIPE_SECRET_KEY</code> from your environment.
              </p>
            )}
            {canWrite && <SaveButton loading={loadingKey === "payment"} />}
          </CardContent>
        </Card>
      </form>

      {/* Messaging */}
      <form
        onSubmit={(e) => {
          e.preventDefault();
          void runSave("messaging", saveMessagingSettings, new FormData(e.currentTarget));
        }}
      >
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4" />
              SMS / messaging portal
            </CardTitle>
            <CardDescription>
              External SMS provider dashboard opened from Texting
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="providerName">Provider name</Label>
              <Input id="providerName" name="providerName" defaultValue={messaging.providerName} disabled={!canWrite} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portalUrl">Portal URL</Label>
              <Input id="portalUrl" name="portalUrl" type="url" required defaultValue={messaging.portalUrl} disabled={!canWrite} />
            </div>
            {canWrite && <SaveButton loading={loadingKey === "messaging"} />}
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
