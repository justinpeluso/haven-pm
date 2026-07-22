import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { AppFolioTenantHints } from "@/components/shared/appfolio-extras-section";
import { UserCircle } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhone } from "@/lib/phone";

export default async function TenantsPage() {
  await requirePermission("tenants:read");

  const tenants = await db.tenant.findMany({
    where: { deletedAt: null },
    include: {
      user: { select: { name: true, email: true, phone: true } },
      leases: {
        where: { status: "ACTIVE", deletedAt: null },
        select: {
          id: true,
          status: true,
          unit: {
            select: {
              unitNumber: true,
              property: { select: { name: true } },
            },
          },
        },
        take: 1,
      },
    },
    orderBy: { createdAt: "desc" },
  });

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Tenants" }]} />
        <h1 className="mt-2 text-2xl font-bold">Tenants</h1>
        <p className="text-muted-foreground">{tenants.length} tenants</p>
      </div>

      {tenants.length === 0 ? (
        <EmptyState
          icon={UserCircle}
          title="No tenants yet"
          description="Tenants appear here once leases are created and activated."
        />
      ) : (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
          {tenants.map((tenant) => {
            const lease = tenant.leases[0];
            const phone = tenant.phone || tenant.user.phone;
            return (
              <Link
                key={tenant.id}
                href={`/tenants/${tenant.id}`}
                className={cn(
                  "block rounded-xl outline-none transition-colors",
                  "hover:bg-muted/40 focus-visible:ring-2 focus-visible:ring-ring"
                )}
              >
                <Card className="h-full">
                  <CardContent className="space-y-2 p-4">
                    <p className="font-medium">{tenant.user.name}</p>
                    <p className="text-sm text-muted-foreground">{tenant.user.email}</p>
                    <AppFolioTenantHints
                      extras={tenant.appfolioExtras as Record<string, unknown> | null}
                    />
                    {phone ? (
                      <p className="text-sm text-muted-foreground">{formatPhone(phone)}</p>
                    ) : null}
                    {lease && (
                      <>
                        <p className="text-sm">
                          {lease.unit.property.name} · Unit {lease.unit.unitNumber}
                        </p>
                        <Badge variant="success">Active Lease</Badge>
                      </>
                    )}
                  </CardContent>
                </Card>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
