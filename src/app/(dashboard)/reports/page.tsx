import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Building2, Wrench, Users, TrendingUp } from "lucide-react";
import { formatCurrency } from "@/lib/utils";
import { ExportButtons } from "@/components/reports/export-buttons";

export default async function ReportsPage() {
  await requirePermission("reports:read");

  const [
    properties,
    units,
    maintenanceStats,
    maintenanceCosts,
    prospectsByStatus,
    leasesExpiring,
  ] = await Promise.all([
    db.property.count({ where: { deletedAt: null } }),
    db.unit.findMany({ where: { deletedAt: null }, select: { status: true, rentAmount: true } }),
    db.maintenanceRequest.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    }),
    db.maintenanceRequest.aggregate({
      where: { status: { in: ["COMPLETED", "CLOSED"] }, cost: { not: null } },
      _sum: { cost: true },
      _count: true,
    }),
    db.prospect.groupBy({
      by: ["status"],
      where: { deletedAt: null },
      _count: true,
    }),
    db.lease.count({
      where: {
        status: "ACTIVE",
        endDate: {
          lte: new Date(Date.now() + 90 * 24 * 60 * 60 * 1000),
          gte: new Date(),
        },
      },
    }),
  ]);

  const totalUnits = units.length;
  const occupied = units.filter((u) => u.status === "OCCUPIED" || u.status === "NOTICE_GIVEN").length;
  const vacant = units.filter((u) => u.status === "AVAILABLE" || u.status === "VACANT").length;
  const occupancyRate = totalUnits > 0 ? Math.round((occupied / totalUnits) * 100) : 0;
  const totalRent = units
    .filter((u) => u.status === "OCCUPIED")
    .reduce((sum, u) => sum + Number(u.rentAmount), 0);

  const openMaintenance = maintenanceStats
    .filter((s) => !["COMPLETED", "CLOSED"].includes(s.status))
    .reduce((sum, s) => sum + s._count, 0);

  const propertiesByCity = await db.property.groupBy({
    by: ["city"],
    where: { deletedAt: null },
    _count: true,
    orderBy: { _count: { city: "desc" } },
    take: 10,
  });

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Reports" }]} />
          <h1 className="mt-2 text-2xl font-bold">Reports & Analytics</h1>
          <p className="text-muted-foreground">Portfolio performance overview</p>
        </div>
        <ExportButtons report="summary" />
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Properties" value={properties} icon={Building2} />
        <StatCard
          title="Occupancy Rate"
          value={`${occupancyRate}%`}
          icon={TrendingUp}
          description={`${occupied} occupied, ${vacant} vacant`}
        />
        <StatCard title="Open Work Orders" value={openMaintenance} icon={Wrench} />
        <StatCard
          title="Monthly Rent Roll"
          value={formatCurrency(totalRent)}
          icon={Users}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Maintenance Costs</CardTitle>
            <ExportButtons report="maintenance" />
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">
              {formatCurrency(Number(maintenanceCosts._sum.cost || 0))}
            </p>
            <p className="text-sm text-muted-foreground">
              Across {maintenanceCosts._count} completed requests
            </p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Leasing Pipeline</CardTitle>
            <ExportButtons report="pipeline" />
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {prospectsByStatus.map((stage) => (
                <div key={stage.status} className="flex justify-between text-sm">
                  <span>{stage.status.replace(/_/g, " ")}</span>
                  <span className="font-medium">{stage._count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Upcoming Lease Expirations</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-2xl font-bold">{leasesExpiring}</p>
            <p className="text-sm text-muted-foreground">Expiring in the next 90 days</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Properties by City</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {propertiesByCity.map((city) => (
                <div key={city.city} className="flex justify-between text-sm">
                  <span>{city.city}</span>
                  <span className="font-medium">{city._count}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
