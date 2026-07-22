import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { getLeaseReceivables } from "@/lib/actions/rent";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function LeasesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  await requirePermission("leases:read");
  const params = await searchParams;
  const delinquentOnly = params.filter === "delinquent";

  const leases = await getLeaseReceivables({ delinquentOnly });
  const totalOutstanding = leases.reduce((sum, l) => sum + l.balance, 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <Breadcrumbs items={[{ label: "Leases" }]} />
          <h1 className="mt-2 text-2xl font-bold">Leases & receivables</h1>
          <p className="text-muted-foreground">
            {leases.length} active leases · {formatCurrency(totalOutstanding)} outstanding
          </p>
        </div>
        <div className="flex gap-2">
          <Button asChild size="sm" variant="secondary">
            <Link href="/leases/new">New lease</Link>
          </Button>
          <Button asChild size="sm" variant={delinquentOnly ? "outline" : "default"}>
            <Link href="/leases">All active</Link>
          </Button>
          <Button asChild size="sm" variant={delinquentOnly ? "default" : "outline"}>
            <Link href="/leases?filter=delinquent">Delinquent</Link>
          </Button>
        </div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Active leases</CardTitle>
          <CardDescription>
            Balance is open charges minus amounts already paid.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-2">
          {leases.length === 0 ? (
            <p className="text-sm text-muted-foreground">No leases match this filter.</p>
          ) : (
            leases.map((lease) => (
              <Link
                key={lease.id}
                href={`/leases/${lease.id}`}
                className="flex flex-wrap items-center justify-between gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/40"
              >
                <div className="min-w-0 space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {lease.tenant.user.name || lease.tenant.user.email}
                    </p>
                    {lease.delinquentAt ? (
                      <Badge variant="destructive">Delinquent</Badge>
                    ) : lease.noticeGivenAt ? (
                      <Badge variant="warning">Notice</Badge>
                    ) : lease.balance > 0 ? (
                      <Badge variant="warning">Balance due</Badge>
                    ) : (
                      <Badge variant="outline">Current</Badge>
                    )}
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {lease.unit.property.name} · Unit {lease.unit.unitNumber} · Rent{" "}
                    {formatCurrency(Number(lease.rentAmount))}/mo
                  </p>
                </div>
                <div className="text-right text-sm">
                  <p className="font-semibold">{formatCurrency(lease.balance)}</p>
                  <p className="text-xs text-muted-foreground">
                    {lease.oldestDue
                      ? `Oldest due ${formatDate(lease.oldestDue)}`
                      : "No open charges"}
                  </p>
                </div>
              </Link>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
