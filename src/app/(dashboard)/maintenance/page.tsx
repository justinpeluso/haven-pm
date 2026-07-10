import Link from "next/link";
import { Suspense } from "react";
import { Plus, Wrench } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getMaintenanceRequests } from "@/lib/actions/maintenance";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ListFilters } from "@/components/shared/list-filters";
import { formatDate } from "@/lib/utils";

const STATUS_OPTIONS = [
  "SUBMITTED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS",
  "WAITING_ON_PARTS", "COMPLETED", "CLOSED",
].map((s) => ({ value: s, label: s.replace(/_/g, " ") }));

const PRIORITY_OPTIONS = ["LOW", "MEDIUM", "HIGH", "EMERGENCY"].map((p) => ({
  value: p,
  label: p,
}));

export default async function MaintenancePage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; priority?: string }>;
}) {
  await requirePermission("maintenance:read");
  const params = await searchParams;
  const requests = await getMaintenanceRequests({
    status: params.status,
    priority: params.priority,
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Maintenance" }]} />
          <h1 className="mt-2 text-2xl font-bold">Maintenance</h1>
          <p className="text-muted-foreground">{requests.length} requests</p>
        </div>
        <Button asChild>
          <Link href="/maintenance/new">
            <Plus className="mr-2 h-4 w-4" />
            New Request
          </Link>
        </Button>
      </div>

      <Suspense fallback={null}>
        <ListFilters
          filters={[
            { key: "status", label: "Status", options: STATUS_OPTIONS },
            { key: "priority", label: "Priority", options: PRIORITY_OPTIONS },
          ]}
        />
      </Suspense>

      {requests.length === 0 ? (
        <EmptyState
          icon={Wrench}
          title="No maintenance requests"
          description={
            params.status || params.priority
              ? "No requests match your filters. Try clearing filters or create a new request."
              : "Work orders will appear here when tenants or staff submit maintenance requests."
          }
          actionLabel="New Request"
          actionHref="/maintenance/new"
        />
      ) : (
        <div className="space-y-3">
          {requests.map((req) => (
            <Link key={req.id} href={`/maintenance/${req.id}`}>
              <Card className="transition-colors hover:bg-muted/50">
                <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{req.title}</p>
                      <Badge variant={getPriorityVariant(req.priority)}>{req.priority}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {req.requestNumber} · {req.property.name}
                      {req.unit && ` · Unit ${req.unit.unitNumber}`}
                    </p>
                    {req.tenant?.user.name && (
                      <p className="text-xs text-muted-foreground">Tenant: {req.tenant.user.name}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-3">
                    {req.targetCompletion && (
                      <span className="text-sm text-muted-foreground">
                        Due {formatDate(req.targetCompletion)}
                      </span>
                    )}
                    <Badge variant="outline">{formatStatus(req.status)}</Badge>
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
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
