import { requirePermission } from "@/lib/auth/session";
import { getAllAppSettings } from "@/lib/settings";
import { hasPermission } from "@/lib/permissions";
import { canViewDemoAccounts } from "@/lib/demo-accounts";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SettingsForm } from "@/components/settings/settings-form";
import { DemoAccountsPanel } from "@/components/demo-accounts-panel";

export default async function SettingsPage() {
  const session = await requirePermission("settings:read");
  const settings = await getAllAppSettings();
  const canWrite = hasPermission(session.user.role, "settings:write");
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;
  const showDemoAccounts = canViewDemoAccounts(session.user);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Settings" }]} />
        <h1 className="mt-2 text-2xl font-bold">Settings</h1>
        <p className="text-muted-foreground">
          Company, leasing, maintenance, notifications, calendar, and integrations
          {!canWrite && " (view only)"}
        </p>
      </div>

      {showDemoAccounts ? <DemoAccountsPanel /> : null}

      <SettingsForm
        {...settings}
        stripeConfigured={stripeConfigured}
        canWrite={canWrite}
      />
    </div>
  );
}
