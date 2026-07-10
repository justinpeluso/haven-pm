import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getMaintenanceRequests } from "@/lib/actions/maintenance";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatDate } from "@/lib/utils";

export default async function MaintenancePage() {
  await requirePermission("maintenance:read");
  const requests = await getMaintenanceRequests();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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
