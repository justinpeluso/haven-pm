import Link from "next/link";
import { Plus, Building2, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getProperties } from "@/lib/actions/properties";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils";
import { getOccupancy } from "@/lib/occupancy";

export default async function PropertiesPage() {
  await requirePermission("properties:read");
  const properties = await getProperties();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Properties" }]} />
          <h1 className="mt-2 text-2xl font-bold">Properties</h1>
          <p className="text-muted-foreground">{properties.length} properties in portfolio</p>
        </div>
        <Button asChild>
          <Link href="/properties/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Property
          </Link>
        </Button>
      </div>

      {properties.length === 0 ? (
        <EmptyState
          icon={Building2}
          title="No properties yet"
          description="Add your first property to start managing units, tenants, and maintenance."
          actionLabel="Add Property"
          actionHref="/properties/new"
        />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {properties.map((property) => {
            const occupancy = getOccupancy(property.units);
            const occupants = property.units
              .flatMap((u) =>
                u.leases.map((l) => ({
                  name: l.tenant.user.name,
                  unit: u.unitNumber,
                }))
              )
              .filter((o) => o.name);

            return (
              <Link key={property.id} href={`/properties/${property.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex min-w-0 items-center gap-2">
                        <Building2 className="h-4 w-4 shrink-0 text-muted-foreground" />
                        <CardTitle className="truncate text-base">{property.name}</CardTitle>
                      </div>
                      <Badge variant={occupancy.badgeVariant} className="shrink-0">
                        {occupancy.label}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {property.addressLine1}, {property.city}, {property.state}
                    </p>
                    <p className="text-sm text-muted-foreground">{occupancy.description}</p>
                    {occupants.length > 0 && (
                      <p className="flex items-start gap-1.5 text-xs text-muted-foreground">
                        <Users className="mt-0.5 h-3 w-3 shrink-0" />
                        <span className="line-clamp-2">
                          {occupants
                            .slice(0, 3)
                            .map((o) => `${o.name} (Unit ${o.unit})`)
                            .join(" · ")}
                          {occupants.length > 3 ? ` · +${occupants.length - 3} more` : ""}
                        </span>
                      </p>
                    )}
                    <div className="flex items-center justify-between text-sm">
                      <span>
                        {occupancy.total} units · {occupancy.occupied} occupied
                      </span>
                      {property._count.maintenanceRequests > 0 && (
                        <Badge variant="warning">
                          {property._count.maintenanceRequests} open
                        </Badge>
                      )}
                    </div>
                    {property.rentAmount && (
                      <p className="text-sm font-medium">
                        From {formatCurrency(Number(property.rentAmount))}/mo
                      </p>
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
