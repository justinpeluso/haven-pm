"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { createLease } from "@/lib/actions/rent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

type TenantOption = {
  id: string;
  label: string;
  email: string;
  hasActiveLease: boolean;
};

type UnitOption = {
  id: string;
  label: string;
  status: string;
  rentAmount: number;
  depositAmount: number | null;
};

export function NewLeaseForm({
  tenants,
  units,
  defaultTenantId,
}: {
  tenants: TenantOption[];
  units: UnitOption[];
  defaultTenantId?: string;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const [unitId, setUnitId] = useState("");
  const selectedUnit = useMemo(
    () => units.find((u) => u.id === unitId),
    [units, unitId]
  );

  const availableTenants = tenants.filter((t) => !t.hasActiveLease);
  const startDefault = new Date().toISOString().slice(0, 10);
  const endDefault = new Date();
  endDefault.setFullYear(endDefault.getFullYear() + 1);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Leases", href: "/leases" },
            { label: "New lease" },
          ]}
        />
        <h1 className="mt-2 text-2xl font-bold">New lease</h1>
        <p className="text-muted-foreground">
          Create an active lease and mark the unit occupied.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lease details</CardTitle>
        </CardHeader>
        <CardContent>
          <form
            className="space-y-4"
            onSubmit={async (e) => {
              e.preventDefault();
              setPending(true);
              const result = await createLease(new FormData(e.currentTarget));
              setPending(false);
              if (result.error) {
                toast({
                  title: "Failed",
                  description: result.error,
                  variant: "destructive",
                });
                return;
              }
              toast({ title: "Lease created" });
              router.push(`/leases/${result.id}`);
            }}
          >
            <div className="space-y-1">
              <Label htmlFor="tenantId">Tenant</Label>
              <select
                id="tenantId"
                name="tenantId"
                required
                defaultValue={defaultTenantId || ""}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="" disabled>
                  Select tenant
                </option>
                {availableTenants.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.label} ({t.email})
                  </option>
                ))}
              </select>
              {availableTenants.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Every tenant already has an active lease.
                </p>
              ) : null}
            </div>

            <div className="space-y-1">
              <Label htmlFor="unitId">Unit</Label>
              <select
                id="unitId"
                name="unitId"
                required
                value={unitId}
                onChange={(e) => setUnitId(e.target.value)}
                className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
              >
                <option value="" disabled>
                  Select available unit
                </option>
                {units.map((u) => (
                  <option key={u.id} value={u.id}>
                    {u.label} · {u.status.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="startDate">Start</Label>
                <Input
                  id="startDate"
                  name="startDate"
                  type="date"
                  required
                  defaultValue={startDefault}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="endDate">End</Label>
                <Input
                  id="endDate"
                  name="endDate"
                  type="date"
                  required
                  defaultValue={endDefault.toISOString().slice(0, 10)}
                />
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="space-y-1">
                <Label htmlFor="rentAmount">Monthly rent</Label>
                <Input
                  id="rentAmount"
                  name="rentAmount"
                  type="number"
                  step="0.01"
                  min="0.01"
                  required
                  key={selectedUnit?.id || "rent"}
                  defaultValue={selectedUnit?.rentAmount ?? ""}
                />
              </div>
              <div className="space-y-1">
                <Label htmlFor="depositAmount">Deposit</Label>
                <Input
                  id="depositAmount"
                  name="depositAmount"
                  type="number"
                  step="0.01"
                  min="0"
                  key={`dep-${selectedUnit?.id || "x"}`}
                  defaultValue={selectedUnit?.depositAmount ?? ""}
                />
              </div>
            </div>

            <div className="space-y-1">
              <Label htmlFor="terms">Terms</Label>
              <Textarea
                id="terms"
                name="terms"
                rows={3}
                placeholder="12-month lease, etc."
              />
            </div>

            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                name="createFirstCharge"
                defaultChecked
                className="h-4 w-4 rounded border"
              />
              Create opening rent charge due on start date
            </label>

            <Button type="submit" disabled={pending || !availableTenants.length}>
              {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
              Create lease
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
