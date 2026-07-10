import { notFound } from "next/navigation";
import Link from "next/link";
import { requirePermission } from "@/lib/auth/session";
import { getProperty } from "@/lib/actions/properties";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function PropertyDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("properties:read");
  const { id } = await params;
  const property = await getProperty(id);

  if (!property) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Properties", href: "/properties" },
            { label: property.name },
          ]}
        />
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold">{property.name}</h1>
          <Badge variant="outline">{property.status}</Badge>
        </div>
        <p className="text-muted-foreground">
          {property.addressLine1}
          {property.addressLine2 && `, ${property.addressLine2}`}
          , {property.city}, {property.state} {property.zipCode}
        </p>
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
            <p className="text-2xl font-bold">
              {property.units.filter((u) => u.status === "OCCUPIED").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Available</p>
            <p className="text-2xl font-bold">
              {property.units.filter((u) => u.status === "AVAILABLE").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Open Maintenance</p>
            <p className="text-2xl font-bold">{property.maintenanceRequests.length}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="units">
        <TabsList>
          <TabsTrigger value="units">Units</TabsTrigger>
          <TabsTrigger value="maintenance">Maintenance</TabsTrigger>
          <TabsTrigger value="documents">Documents</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
          <TabsTrigger value="activity">Activity</TabsTrigger>
        </TabsList>

        <TabsContent value="units" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {property.units.map((unit) => {
              const activeLease = unit.leases[0];
              return (
                <Card key={unit.id}>
                  <CardHeader className="pb-2">
                    <div className="flex items-center justify-between">
                      <CardTitle className="text-sm">Unit {unit.unitNumber}</CardTitle>
                      <Badge variant="outline">{unit.status}</Badge>
                    </div>
                  </CardHeader>
                  <CardContent className="text-sm space-y-1">
                    <p>{formatCurrency(Number(unit.rentAmount))}/mo</p>
                    {unit.bedrooms && <p>{unit.bedrooms} bed · {unit.bathrooms} bath</p>}
                    {activeLease && (
                      <p className="text-muted-foreground">
                        Tenant: {activeLease.tenant.user.name}
                      </p>
                    )}
                  </CardContent>
                </Card>
              );
            })}
          </div>
        </TabsContent>

        <TabsContent value="maintenance" className="mt-4">
          <div className="space-y-2">
            {property.maintenanceRequests.map((req) => (
              <Link
                key={req.id}
                href={`/maintenance/${req.id}`}
                className="flex items-center justify-between rounded-lg border p-3 hover:bg-muted/50"
              >
                <div>
                  <p className="font-medium">{req.title}</p>
                  <p className="text-sm text-muted-foreground">{req.requestNumber}</p>
                </div>
                <Badge>{req.status}</Badge>
              </Link>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="documents" className="mt-4">
          <div className="space-y-2">
            {property.documents.map((doc) => (
              <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                <div>
                  <p className="font-medium">{doc.name}</p>
                  <p className="text-sm text-muted-foreground">{doc.type}</p>
                </div>
                <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-sm text-primary">
                  View
                </a>
              </div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="space-y-3">
            {property.notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="pt-4">
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {note.author.name} · {formatDate(note.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
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
