"use client";

import { useState } from "react";
import { savePaymentSettings } from "@/lib/actions/settings";
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
import { Loader2, CreditCard } from "lucide-react";
import type { PaymentSettings } from "@/lib/settings";

interface SettingsFormProps {
  payment: PaymentSettings;
  stripeConfigured: boolean;
}

export function SettingsForm({ payment, stripeConfigured }: SettingsFormProps) {
  const [loading, setLoading] = useState(false);
  const [provider, setProvider] = useState(payment.provider);
  const [saved, setSaved] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setSaved(false);

    const formData = new FormData(e.currentTarget);
    formData.set("provider", provider);
    await savePaymentSettings(formData);

    setLoading(false);
    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
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
            <div className="rounded-lg bg-muted p-4 text-sm space-y-2">
              <p className="font-medium">Stripe Checkout</p>
              <p className="text-muted-foreground">
                Tenants pay rent via Stripe Checkout. Set these in your <code>.env</code> file:
              </p>
              <ul className="text-xs text-muted-foreground list-disc pl-4 space-y-1">
                <li>STRIPE_SECRET_KEY=sk_test_...</li>
                <li>STRIPE_PUBLISHABLE_KEY=pk_test_...</li>
              </ul>
              {!stripeConfigured && (
                <p className="text-destructive text-xs">
                  STRIPE_SECRET_KEY not found — add it to enable Stripe payments
                </p>
              )}
            </div>
          )}

          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Payment Settings
          </Button>
          {saved && <span className="ml-3 text-sm text-emerald-600">Saved!</span>}
        </CardContent>
      </Card>
    </form>
  );
}
