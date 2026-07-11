import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Phone, User } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getProperty } from "@/lib/actions/properties";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getOccupancy, unitStatusBadgeVariant, formatUnitStatus } from "@/lib/occupancy";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { PropertyEditForm } from "@/components/properties/property-edit-form";
import { UnitsManager } from "@/components/properties/units-manager";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("properties:read");
  const { id } = await params;
  const [property, owners] = await Promise.all([
    getProperty(id),
    hasPermission(session.user.role, "properties:write")
      ? db.owner.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  if (!property) notFound();

  const canWrite = hasPermission(session.user.role, "properties:write");
  const canWriteUnits = hasPermission(session.user.role, "units:write");
  const occupancy = getOccupancy(property.units);

  const occupants = property.units.flatMap((unit) =>
    unit.leases.map((lease) => ({
      unitId: unit.id,
      unitNumber: unit.unitNumber,
      unitStatus: unit.status,
      rentAmount: Number(unit.rentAmount),
      leaseStart: lease.startDate,
      leaseEnd: lease.endDate,
      tenantId: lease.tenant.id,
      name: lease.tenant.user.name,
      email: lease.tenant.user.email,
      phone: lease.tenant.user.phone || lease.tenant.phone,
      pets: lease.tenant.pets,
    }))
  );

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Properties", href: "/properties" },
            { label: property.name },
          ]}
        />
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <Badge variant={occupancy.badgeVariant}>{occupancy.label}</Badge>
          <Badge variant="outline">{property.status.replace(/_/g, " ")}</Badge>
          {canWrite && (
            <PropertyEditForm
              property={{
                id: property.id,
                name: property.name,
                addressLine1: property.addressLine1,
                addressLine2: property.addressLine2,
                city: property.city,
                state: property.state,
                zipCode: property.zipCode,
                status: property.status,
                ownerId: property.ownerId,
                squareFootage: property.squareFootage,
                bedrooms: property.bedrooms,
                bathrooms: property.bathrooms != null ? Number(property.bathrooms) : null,
                rentAmount: property.rentAmount != null ? Number(property.rentAmount) : null,
                securityDeposit:
                  property.securityDeposit != null ? Number(property.securityDeposit) : null,
                parking: property.parking,
                internalNotes: property.internalNotes,
              }}
              owners={owners}
            />
          )}
        </div>
        <p className="text-muted-foreground">
          {property.addressLine1}
          {property.addressLine2 && `, ${property.addressLine2}`}
          , {property.city}, {property.state} {property.zipCode}
        </p>
        <p className="mt-1 text-sm text-muted-foreground">{occupancy.description}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Units</p>
            <p className="text-2xl font-bold">{property.units.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Occupied</p>
            <p className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">
              {occupancy.occupied}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-2xl font-bold">{occupancy.available}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Open Maintenance</p>
            <p className="text-2xl font-bold">{property.maintenanceRequests.length}</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between gap-2">
            <CardTitle className="text-base">Current Occupants</CardTitle>
            <Badge variant={occupancy.badgeVariant}>
              {occupants.length} resident{occupants.length === 1 ? "" : "s"}
            </Badge>
          </div>
        </CardHeader>
        <CardContent>
          {occupants.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-muted/20 px-4 py-8 text-center">
              <p className="font-medium">No current occupants</p>
              <p className="mt-1 text-sm text-muted-foreground">
                This property is vacant — no active leases on any unit.
              </p>
            </div>
          ) : (
            <div className="grid gap-3 sm:grid-cols-2">
              {occupants.map((occ) => (
                <div
                  key={`${occ.tenantId}-${occ.unitId}`}
                  className="rounded-lg border p-4"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <div className="flex h-8 w-8 items-center justify-center rounded-full bg-muted">
                        <User className="h-4 w-4 text-muted-foreground" />
                      </div>
                      <div>
                        <p className="font-medium">{occ.name || "Unnamed tenant"}</p>
                        <p className="text-sm text-muted-foreground">
                          Unit {occ.unitNumber} · {formatCurrency(Number(occ.rentAmount))}/mo
                        </p>
                      </div>
                    </div>
                    <Badge variant={unitStatusBadgeVariant(occ.unitStatus)}>
                      {formatUnitStatus(occ.unitStatus)}
                    </Badge>
                  </div>
                  <div className="mt-3 space-y-1 text-sm text-muted-foreground">
                    {occ.email && (
                      <p className="flex items-center gap-1.5">
                        <Mail className="h-3.5 w-3.5" />
                        {occ.email}
                      </p>
                    )}
                    {occ.phone && (
                      <p className="flex items-center gap-1.5">
                        <Phone className="h-3.5 w-3.5" />
                        {occ.phone}
                      </p>
                    )}
                    <p>
                      Lease {formatDate(occ.leaseStart)} – {formatDate(occ.leaseEnd)}
                    </p>
                    {occ.pets && <p>Pets: {occ.pets}</p>}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-4">
          <UnitsManager
            propertyId={property.id}
            canWrite={canWriteUnits}
            units={property.units.map((unit) => ({
              id: unit.id,
              unitNumber: unit.unitNumber,
              status: unit.status,
              rentAmount: Number(unit.rentAmount),
              bedrooms: unit.bedrooms,
              bathrooms: unit.bathrooms != null ? Number(unit.bathrooms) : null,
              tenantName: unit.leases[0]?.tenant.user.name,
              tenantEmail: unit.leases[0]?.tenant.user.email,
            }))}
          />
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <div className="space-y-2">
            {property.maintenanceRequests.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No maintenance requests</p>
            ) : (
              property.maintenanceRequests.map((req) => (
                <Link
                  key={req.id}
                  href={`/maintenance/${req.id}`}
                  className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
                >
                  <div>
                    <p className="font-medium">{req.title}</p>
                    <p className="text-sm text-muted-foreground">{req.requestNumber}</p>
                  </div>
                  <Badge variant="outline">{req.status.replace(/_/g, " ")}</Badge>
                </Link>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="space-y-2">
            {property.documents.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No documents</p>
            ) : (
              property.documents.map((doc) => (
                <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="font-medium">{doc.name}</p>
                    <p className="text-sm text-muted-foreground">{doc.type}</p>
                  </div>
                  <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary">
                    View
                  </a>
                </div>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="space-y-3">
            {property.notes.length === 0 ? (
              <p className="py-8 text-center text-sm text-muted-foreground">No notes</p>
            ) : (
              property.notes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="pt-4">
                    <p className="text-sm">{note.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {note.author.name} · {formatDate(note.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="activity" className="mt-4">
          <ActivityTimeline
            items={property.activityLogs.map((log) => ({
              id: log.id,
              action: `${log.action} — ${log.entityType}`,
              userName: log.user?.name,
              oldValue: log.oldValue,
              newValue: log.newValue,
              createdAt: log.createdAt,
            }))}
          />
        </TabsContent>
      </Tabs>

      {property.owner && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Owner</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="font-medium">{property.owner.name}</p>
            {property.owner.email && (
              <p className="text-sm text-muted-foreground">{property.owner.email}</p>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
