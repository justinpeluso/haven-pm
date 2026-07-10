import Link from "next/link";
import { Plus, Building2 } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getProperties } from "@/lib/actions/properties";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { formatCurrency } from "@/lib/utils";

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
            const occupiedUnits = property.units.filter(
              (u) => u.status === "OCCUPIED" || u.status === "NOTICE_GIVEN"
            ).length;
            const totalUnits = property.units.length;

            return (
              <Link key={property.id} href={`/properties/${property.id}`}>
                <Card className="h-full transition-colors hover:bg-muted/50">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="flex items-center gap-2">
                        <Building2 className="h-4 w-4 text-muted-foreground" />
                        <CardTitle className="text-base">{property.name}</CardTitle>
                      </div>
                      <Badge variant="outline">{property.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    <p className="text-sm text-muted-foreground">
                      {property.addressLine1}, {property.city}, {property.state}
                    </p>
                    <div className="flex items-center justify-between text-sm">
                      <span>{totalUnits} units · {occupiedUnits} occupied</span>
                      {property._count.maintenanceRequests > 0 && (
                        <Badge variant="warning">{property._count.maintenanceRequests} open</Badge>
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
