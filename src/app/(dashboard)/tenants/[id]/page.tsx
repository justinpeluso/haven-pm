import { notFound } from "next/navigation";
import Link from "next/link";
import { Mail, Building2, Wrench, FileText } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { getMessagingSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { PhoneLink } from "@/components/shared/phone-link";
import { AppFolioExtrasSection } from "@/components/shared/appfolio-extras-section";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function TenantDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("tenants:read");
  const { id } = await params;

  const [tenant, messaging] = await Promise.all([
    db.tenant.findFirst({
      where: { id, deletedAt: null },
      include: {
        user: { select: { name: true, email: true, phone: true } },
        leases: {
          where: { deletedAt: null },
          orderBy: { startDate: "desc" },
          include: {
            unit: {
              include: {
                property: {
                  select: { id: true, name: true, addressLine1: true, city: true, state: true },
                },
              },
            },
          },
        },
        maintenanceRequests: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: {
            id: true,
            title: true,
            requestNumber: true,
            status: true,
            priority: true,
            createdAt: true,
          },
        },
        documents: {
          where: { deletedAt: null },
          orderBy: { createdAt: "desc" },
          take: 12,
          select: { id: true, name: true, type: true, url: true },
        },
      },
    }),
    getMessagingSettings(),
  ]);

  if (!tenant) notFound();

  const phone = tenant.phone || tenant.user.phone;
  const activeLease = tenant.leases.find((l) => l.status === "ACTIVE");
  const name = tenant.user.name || "Unnamed tenant";

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Tenants", href: "/tenants" },
            { label: name },
          ]}
        />
        <div className="mt-2 flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-2xl font-bold">{name}</h1>
            <p className="text-muted-foreground">{tenant.user.email}</p>
          </div>
          {activeLease ? (
            <Badge variant="success">Active lease</Badge>
          ) : (
            <Badge variant="secondary">No active lease</Badge>
          )}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card className="lg:col-span-1">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Contact</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <p className="flex items-center gap-2 text-muted-foreground">
              <Mail className="h-4 w-4 shrink-0" />
              <a href={`mailto:${tenant.user.email}`} className="text-foreground hover:underline">
                {tenant.user.email}
              </a>
            </p>
            {phone ? (
              <div className="flex items-center gap-2">
                <PhoneLink phone={phone} inboxUrl={messaging.portalUrl} />
              </div>
            ) : (
              <p className="text-muted-foreground">No phone on file</p>
            )}
            {tenant.emergencyContact ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Emergency contact
                </p>
                <p className="mt-0.5">
                  {tenant.emergencyContact}
                  {tenant.emergencyPhone ? ` · ${tenant.emergencyPhone}` : ""}
                </p>
              </div>
            ) : null}
            {tenant.pets ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Pets
                </p>
                <p className="mt-0.5">{tenant.pets}</p>
              </div>
            ) : null}
            {tenant.internalNotes ? (
              <div>
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Internal notes
                </p>
                <p className="mt-0.5 whitespace-pre-wrap text-muted-foreground">
                  {tenant.internalNotes}
                </p>
              </div>
            ) : null}
          </CardContent>
        </Card>

        <Card className="lg:col-span-2">
          <CardHeader className="pb-3">
            <CardTitle className="text-base">Leases</CardTitle>
          </CardHeader>
          <CardContent>
            {tenant.leases.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No leases on file</p>
            ) : (
              <ul className="space-y-3">
                {tenant.leases.map((lease) => (
                  <li key={lease.id} className="rounded-lg border p-4">
                    <div className="flex flex-wrap items-start justify-between gap-2">
                      <div className="flex items-start gap-2">
                        <Building2 className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        <div>
                          <Link
                            href={`/properties/${lease.unit.property.id}`}
                            className="font-medium hover:underline"
                          >
                            {lease.unit.property.name}
                          </Link>
                          <p className="text-sm text-muted-foreground">
                            Unit {lease.unit.unitNumber}
                            {lease.unit.property.addressLine1
                              ? ` · ${lease.unit.property.addressLine1}, ${lease.unit.property.city}`
                              : ""}
                          </p>
                        </div>
                      </div>
                      <Badge variant={lease.status === "ACTIVE" ? "success" : "outline"}>
                        {lease.status.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="mt-2 text-sm text-muted-foreground">
                      {formatDate(lease.startDate)} – {formatDate(lease.endDate)}
                      {" · "}
                      {formatCurrency(Number(lease.rentAmount))}/mo
                      {lease.depositAmount != null
                        ? ` · Deposit ${formatCurrency(Number(lease.depositAmount))}`
                        : ""}
                    </p>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>

      <AppFolioExtrasSection
        extras={tenant.appfolioExtras as Record<string, unknown> | null}
        title="AppFolio tenant details"
      />

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Maintenance</CardTitle>
            <Wrench className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tenant.maintenanceRequests.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No maintenance requests</p>
            ) : (
              <ul className="space-y-2">
                {tenant.maintenanceRequests.map((mr) => (
                  <li key={mr.id}>
                    <Link
                      href={`/maintenance/${mr.id}`}
                      className="flex items-center justify-between rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                    >
                      <div className="min-w-0">
                        <p className="truncate font-medium">{mr.title}</p>
                        <p className="text-xs text-muted-foreground">{mr.requestNumber}</p>
                      </div>
                      <Badge variant="outline">{mr.status.replace(/_/g, " ")}</Badge>
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-3">
            <CardTitle className="text-base">Documents</CardTitle>
            <FileText className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {tenant.documents.length === 0 ? (
              <p className="py-6 text-center text-sm text-muted-foreground">No documents</p>
            ) : (
              <ul className="space-y-2">
                {tenant.documents.map((doc) => (
                  <li
                    key={doc.id}
                    className="flex items-center justify-between rounded-lg border p-3 text-sm"
                  >
                    <div>
                      <p className="font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type}</p>
                    </div>
                    <a
                      href={doc.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline"
                    >
                      View
                    </a>
                  </li>
                ))}
              </ul>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
