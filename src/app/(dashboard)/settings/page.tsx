import { requirePermission } from "@/lib/auth/session";
import { getPaymentSettings, getMessagingSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { SettingsForm } from "@/components/settings/settings-form";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export default async function SettingsPage() {
  await requirePermission("settings:read");

  const [payment, messaging] = await Promise.all([
    getPaymentSettings(),
    getMessagingSettings(),
  ]);
  const stripeConfigured = !!process.env.STRIPE_SECRET_KEY;

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Settings" }]} />
        <h1 className="mt-2 text-2xl font-bold">Settings</h1>
      </div>

      <SettingsForm
        payment={payment}
        messaging={messaging}
        stripeConfigured={stripeConfigured}
      />

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Company</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label>Company Name</Label>
            <Input defaultValue="Haven Property Management" />
          </div>
          <div className="space-y-2">
            <Label>Support Email</Label>
            <Input defaultValue="support@havenpm.com" />
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
