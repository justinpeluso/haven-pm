"use client";

import { useState } from "react";
import { savePaymentSettings, saveMessagingSettings } from "@/lib/actions/settings";
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
import { Loader2, CreditCard, Smartphone } from "lucide-react";
import type { PaymentSettings, MessagingSettings } from "@/lib/settings";
import { toast } from "@/hooks/use-toast";

interface SettingsFormProps {
  payment: PaymentSettings;
  messaging: MessagingSettings;
  stripeConfigured: boolean;
}

export function SettingsForm({ payment, messaging, stripeConfigured }: SettingsFormProps) {
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [messagingLoading, setMessagingLoading] = useState(false);
  const [provider, setProvider] = useState(payment.provider);

  const handlePaymentSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setPaymentLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("provider", provider);
    await savePaymentSettings(formData);
    setPaymentLoading(false);
    toast({ title: "Payment settings saved" });
  };

  const handleMessagingSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setMessagingLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await saveMessagingSettings(formData);
    setMessagingLoading(false);
    if (result.error) {
      toast({ title: "Could not save", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Messaging settings saved" });
  };

  return (
    <div className="space-y-6">
      <form onSubmit={handlePaymentSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CreditCard className="h-4 w-4" />
              Payment Configuration
            </CardTitle>
            <CardDescription>
              Configure how tenants pay rent via the &quot;Pay Rent&quot; button
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label>Payment Provider</Label>
              <Select value={provider} onValueChange={(v) => setProvider(v as "external" | "stripe")}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="external">External Portal URL</SelectItem>
                  <SelectItem value="stripe" disabled={!stripeConfigured}>
                    Stripe Checkout {!stripeConfigured && "(not configured)"}
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>

            {provider === "external" && (
              <div className="space-y-2">
                <Label htmlFor="externalUrl">External Payment Portal URL</Label>
                <Input
                  id="externalUrl"
                  name="externalUrl"
                  type="url"
                  defaultValue={payment.externalUrl}
                  placeholder="https://payments.example.com"
                />
                <p className="text-xs text-muted-foreground">
                  Tenants will be redirected to this URL when clicking Pay Rent
                </p>
              </div>
            )}

            {provider === "stripe" && (
              <div className="space-y-2 rounded-lg bg-muted p-4 text-sm">
                <p className="font-medium">Stripe Checkout</p>
                <p className="text-muted-foreground">
                  Tenants pay rent via Stripe Checkout. Set these in your <code>.env</code> file:
                </p>
                <ul className="list-disc space-y-1 pl-4 text-xs text-muted-foreground">
                  <li>STRIPE_SECRET_KEY=sk_test_...</li>
                  <li>STRIPE_PUBLISHABLE_KEY=pk_test_...</li>
                </ul>
                {!stripeConfigured && (
                  <p className="text-xs text-destructive">
                    STRIPE_SECRET_KEY not found — add it to enable Stripe payments
                  </p>
                )}
              </div>
            )}

            <Button type="submit" disabled={paymentLoading}>
              {paymentLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Payment Settings
            </Button>
          </CardContent>
        </Card>
      </form>

      <form onSubmit={handleMessagingSubmit}>
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Smartphone className="h-4 w-4" />
              SMS / Messaging Portal
            </CardTitle>
            <CardDescription>
              Haven does not send texts itself. Staff open your SMS provider from Messages.
              Paste the provider dashboard URL here when you subscribe.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="providerName">Provider display name</Label>
              <Input
                id="providerName"
                name="providerName"
                defaultValue={messaging.providerName}
                placeholder="e.g. Dialpad, Twilio, Apartment List SMS"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="portalUrl">Portal URL</Label>
              <Input
                id="portalUrl"
                name="portalUrl"
                type="url"
                required
                defaultValue={messaging.portalUrl}
                placeholder="https://app.your-sms-provider.com"
              />
              <p className="text-xs text-muted-foreground">
                Placeholder until you choose a vendor:{" "}
                <code className="text-[11px]">https://messaging.example.com/haven-pm</code>
              </p>
            </div>
            <Button type="submit" disabled={messagingLoading}>
              {messagingLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Messaging Settings
            </Button>
          </CardContent>
        </Card>
      </form>
    </div>
  );
}
