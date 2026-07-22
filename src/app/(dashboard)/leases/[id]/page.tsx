import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { hasPermission } from "@/lib/permissions";
import { getLeaseDetail } from "@/lib/actions/rent";
import { chargeBalance } from "@/lib/rent";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  LeaseActions,
  LeaseChargeForm,
  LeasePaymentForm,
} from "@/components/leases/lease-forms";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function LeaseDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("leases:read");
  const { id } = await params;
  const lease = await getLeaseDetail(id);
  if (!lease) notFound();

  const canWrite = hasPermission(session.user.role, "leases:write");
  const openCharges = lease.charges.filter(
    (c) => c.status === "OPEN" || c.status === "PARTIALLY_PAID"
  );

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Breadcrumbs
            items={[
              { label: "Leases", href: "/leases" },
              { label: lease.tenant.user.name || "Lease" },
            ]}
          />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <h1 className="text-2xl font-bold">
              {lease.tenant.user.name || lease.tenant.user.email}
            </h1>
            {lease.delinquentAt ? (
              <Badge variant="destructive">Delinquent</Badge>
            ) : null}
            <Badge variant="outline">{lease.status}</Badge>
          </div>
          <p className="text-muted-foreground">
            {lease.unit.property.name} · Unit {lease.unit.unitNumber}
          </p>
        </div>
        <LeaseActions
          leaseId={lease.id}
          delinquent={!!lease.delinquentAt}
          canWrite={canWrite}
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(lease.balance)}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Monthly rent
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatCurrency(Number(lease.rentAmount))}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Lease ends
            </CardTitle>
          </CardHeader>
          <CardContent className="text-2xl font-bold">
            {formatDate(lease.endDate)}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Charges</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {lease.charges.length === 0 ? (
                <p className="text-sm text-muted-foreground">No charges yet.</p>
              ) : (
                lease.charges.map((c) => (
                  <div
                    key={c.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">
                        {c.description || c.type.replace(/_/g, " ")}
                      </p>
                      <p className="text-muted-foreground">
                        Due {formatDate(c.dueDate)} · {c.status.replace(/_/g, " ")}
                      </p>
                    </div>
                    <div className="text-right">
                      <p className="font-semibold">{formatCurrency(Number(c.amount))}</p>
                      <p className="text-xs text-muted-foreground">
                        Open {formatCurrency(chargeBalance(c))}
                      </p>
                    </div>
                  </div>
                ))
              )}
            </div>
            {canWrite ? <LeaseChargeForm leaseId={lease.id} /> : null}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Payments</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              {lease.payments.length === 0 ? (
                <p className="text-sm text-muted-foreground">No payments yet.</p>
              ) : (
                lease.payments.map((p) => (
                  <div
                    key={p.id}
                    className="flex items-start justify-between gap-3 rounded-md border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{formatCurrency(Number(p.amount))}</p>
                      <p className="text-muted-foreground">
                        {p.method} · {formatDate(p.paidAt)}
                        {p.reference ? ` · ${p.reference}` : ""}
                      </p>
                    </div>
                    <Badge variant="outline">{p.status}</Badge>
                  </div>
                ))
              )}
            </div>
            {canWrite ? (
              <LeasePaymentForm
                leaseId={lease.id}
                charges={openCharges.map((c) => ({
                  id: c.id,
                  label: `${c.description || c.type} · due ${formatDate(c.dueDate)} (${formatCurrency(chargeBalance(c))} open)`,
                }))}
              />
            ) : null}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
