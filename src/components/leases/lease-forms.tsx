"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  createCharge,
  recordPayment,
  renewLease,
  setLeaseDelinquency,
} from "@/lib/actions/rent";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function LeaseChargeForm({ leaseId }: { leaseId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await createCharge(new FormData(e.currentTarget));
        setPending(false);
        if (result.error) {
          toast({ title: "Failed", description: result.error, variant: "destructive" });
          return;
        }
        toast({ title: "Charge recorded" });
        e.currentTarget.reset();
        router.refresh();
      }}
    >
      <input type="hidden" name="leaseId" value={leaseId} />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="charge-type">Type</Label>
          <select
            id="charge-type"
            name="type"
            defaultValue="RENT"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {["RENT", "LATE_FEE", "SECURITY_DEPOSIT", "OTHER"].map((t) => (
              <option key={t} value={t}>
                {t.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor="charge-amount">Amount</Label>
          <Input id="charge-amount" name="amount" type="number" step="0.01" min="0.01" required />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="charge-due">Due date</Label>
        <Input id="charge-due" name="dueDate" type="date" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="charge-desc">Description</Label>
        <Input id="charge-desc" name="description" placeholder="July rent" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Add charge
      </Button>
    </form>
  );
}

export function LeasePaymentForm({
  leaseId,
  charges,
}: {
  leaseId: string;
  charges: Array<{ id: string; label: string }>;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await recordPayment(new FormData(e.currentTarget));
        setPending(false);
        if (result.error) {
          toast({ title: "Failed", description: result.error, variant: "destructive" });
          return;
        }
        toast({ title: "Payment recorded" });
        e.currentTarget.reset();
        router.refresh();
      }}
    >
      <input type="hidden" name="leaseId" value={leaseId} />
      <div className="space-y-1">
        <Label htmlFor="pay-charge">Apply to charge</Label>
        <select
          id="pay-charge"
          name="chargeId"
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          defaultValue=""
        >
          <option value="">Oldest open first (auto)</option>
          {charges.map((c) => (
            <option key={c.id} value={c.id}>
              {c.label}
            </option>
          ))}
        </select>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="pay-amount">Amount</Label>
          <Input id="pay-amount" name="amount" type="number" step="0.01" min="0.01" required />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pay-method">Method</Label>
          <select
            id="pay-method"
            name="method"
            defaultValue="CHECK"
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            {["CASH", "CHECK", "ACH", "CARD", "STRIPE", "OTHER"].map((m) => (
              <option key={m} value={m}>
                {m}
              </option>
            ))}
          </select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="pay-date">Paid at</Label>
          <Input
            id="pay-date"
            name="paidAt"
            type="date"
            defaultValue={new Date().toISOString().slice(0, 10)}
          />
        </div>
        <div className="space-y-1">
          <Label htmlFor="pay-ref">Reference</Label>
          <Input id="pay-ref" name="reference" placeholder="Check # / confirmation" />
        </div>
      </div>
      <div className="space-y-1">
        <Label htmlFor="pay-notes">Notes</Label>
        <Textarea id="pay-notes" name="notes" rows={2} />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Record payment
      </Button>
    </form>
  );
}

export function LeaseActions({
  leaseId,
  delinquent,
  canWrite,
}: {
  leaseId: string;
  delinquent: boolean;
  canWrite: boolean;
}) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  if (!canWrite) return null;

  return (
    <div className="flex flex-wrap gap-2">
      <Button
        type="button"
        size="sm"
        variant={delinquent ? "outline" : "destructive"}
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await setLeaseDelinquency(leaseId, !delinquent);
          setPending(false);
          if (result.error) {
            toast({ title: "Failed", description: result.error, variant: "destructive" });
            return;
          }
          toast({ title: delinquent ? "Delinquency cleared" : "Marked delinquent" });
          router.refresh();
        }}
      >
        {delinquent ? "Clear delinquent" : "Mark delinquent"}
      </Button>
      <Button
        type="button"
        size="sm"
        variant="secondary"
        disabled={pending}
        onClick={async () => {
          setPending(true);
          const result = await renewLease(leaseId);
          setPending(false);
          if (result.error) {
            toast({ title: "Failed", description: result.error, variant: "destructive" });
            return;
          }
          toast({ title: "Lease renewed (+12 months)" });
          router.refresh();
        }}
      >
        Renew +12 months
      </Button>
    </div>
  );
}
