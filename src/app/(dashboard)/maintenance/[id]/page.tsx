import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { isStaffRole } from "@/lib/permissions";
import { getTenantForUser } from "@/lib/tenant-scope";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { MaintenanceUpdateForm } from "@/components/maintenance/update-form";
import {
  MaintenancePhotoUpload,
  MaintenanceScheduleForm,
} from "@/components/maintenance/field-tools";
import { formatCurrency, formatDateTime } from "@/lib/utils";

export default async function MaintenanceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("maintenance:read");
  const { id } = await params;
  const staffViewer = isStaffRole(session.user.role);

  let tenantScopeId: string | undefined;
  if (!staffViewer) {
    const tenant = await getTenantForUser(session.user.id);
    if (!tenant) notFound();
    tenantScopeId = tenant.id;
  }

  const request = await db.maintenanceRequest.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(tenantScopeId ? { tenantId: tenantScopeId } : {}),
    },
    include: {
      property: true,
      unit: true,
      tenant: { include: { user: { select: { name: true, email: true } } } },
      assignedStaff: { select: { id: true, name: true } },
      photos: true,
      timeline: { orderBy: { createdAt: "asc" } },
      notes: {
        where: { deletedAt: null },
        include: { author: { select: { name: true } } },
      },
    },
  });

  if (!request) notFound();

  const staff = staffViewer
    ? await db.user.findMany({
        where: { role: "MAINTENANCE_STAFF", isActive: true },
        select: { id: true, name: true },
      })
    : [];

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Maintenance", href: "/maintenance" },
            { label: request.requestNumber },
          ]}
        />
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold">{request.title}</h1>
          <Badge variant={getPriorityVariant(request.priority)}>{request.priority}</Badge>
          <Badge variant="outline">{formatStatus(request.status)}</Badge>
        </div>
        <p className="text-muted-foreground">{request.requestNumber}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p>{request.description}</p>
              {request.tenantNotes && (
                <div>
                  <p className="text-sm font-medium">Tenant Notes</p>
                  <p className="text-sm text-muted-foreground">{request.tenantNotes}</p>
                </div>
              )}
              <div className="grid gap-4 sm:grid-cols-2 text-sm">
                <div>
                  <p className="text-muted-foreground">Property</p>
                  <p className="font-medium">{request.property.name}</p>
                </div>
                {request.unit && (
                  <div>
                    <p className="text-muted-foreground">Unit</p>
                    <p className="font-medium">{request.unit.unitNumber}</p>
                  </div>
                )}
                <div>
                  <p className="text-muted-foreground">Category</p>
                  <p className="font-medium">{request.category}</p>
                </div>
                <div>
                  <p className="text-muted-foreground">Submitted</p>
                  <p className="font-medium">{formatDateTime(request.createdAt)}</p>
                </div>
                {request.cost && (
                  <div>
                    <p className="text-muted-foreground">Cost</p>
                    <p className="font-medium">{formatCurrency(Number(request.cost))}</p>
                  </div>
                )}
                {request.vendor && (
                  <div>
                    <p className="text-muted-foreground">Vendor</p>
                    <p className="font-medium">{request.vendor}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Photos</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {request.photos.length === 0 ? (
                <p className="text-sm text-muted-foreground">No photos yet.</p>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {request.photos.map((photo) => (
                    <figure key={photo.id} className="overflow-hidden rounded-md border">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={`/api/maintenance/photos/${photo.id}`}
                        alt={photo.caption || "Maintenance photo"}
                        className="h-40 w-full object-cover"
                      />
                      {photo.caption ? (
                        <figcaption className="px-2 py-1 text-xs text-muted-foreground">
                          {photo.caption}
                        </figcaption>
                      ) : null}
                    </figure>
                  ))}
                </div>
              )}
              <MaintenancePhotoUpload requestId={request.id} />
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              <ActivityTimeline
                items={request.timeline.map((t) => ({
                  id: t.id,
                  action: t.action,
                  oldValue: t.oldValue,
                  newValue: t.newValue,
                  notes: t.notes,
                  createdAt: t.createdAt,
                }))}
              />
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          {staffViewer ? (
            <>
              <MaintenanceUpdateForm
                requestId={request.id}
                currentStatus={request.status}
                currentPriority={request.priority}
                assignedStaffId={request.assignedStaffId}
                staff={staff}
              />
              <MaintenanceScheduleForm requestId={request.id} />
            </>
          ) : null}

          {request.assignedStaff && (
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Assigned To</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="font-medium">{request.assignedStaff.name}</p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getPriorityVariant(priority: string): "default" | "secondary" | "warning" | "destructive" {
  const map: Record<string, "default" | "secondary" | "warning" | "destructive"> = {
    LOW: "secondary",
    MEDIUM: "default",
    HIGH: "warning",
    EMERGENCY: "destructive",
  };
  return map[priority] || "default";
}
