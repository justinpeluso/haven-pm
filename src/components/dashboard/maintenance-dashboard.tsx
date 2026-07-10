import Link from "next/link";
import { Wrench, Clock, CheckCircle, Calendar } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDate, formatDateTime } from "@/lib/utils";
import type { getMaintenanceDashboardData } from "@/lib/queries/dashboard";

type MaintenanceData = Awaited<ReturnType<typeof getMaintenanceDashboardData>>;

export function MaintenanceDashboard({ data }: { data: MaintenanceData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-3">
        <StatCard
          title="Assigned Work Orders"
          value={data.assigned.length}
          icon={Wrench}
        />
        <StatCard
          title="Due Today"
          value={data.assigned.filter((w) => {
            if (!w.targetCompletion) return false;
            const today = new Date();
            const due = new Date(w.targetCompletion);
            return due.toDateString() === today.toDateString();
          }).length}
          icon={Clock}
        />
        <StatCard
          title="Completed (Recent)"
          value={data.completed.length}
          icon={CheckCircle}
        />
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Assigned Work Orders</CardTitle>
        </CardHeader>
        <CardContent>
          {data.assigned.length ? (
            <div className="space-y-3">
              {data.assigned.map((order) => (
                <Link
                  key={order.id}
                  href={`/maintenance/${order.id}`}
                  className="flex flex-col gap-2 rounded-lg border p-4 transition-colors hover:bg-muted/50 sm:flex-row sm:items-center sm:justify-between"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{order.title}</p>
                      <Badge variant={getPriorityVariant(order.priority)}>
                        {order.priority}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {order.property.name}
                      {order.unit && ` · Unit ${order.unit.unitNumber}`}
                    </p>
                    {order.tenant?.user.name && (
                      <p className="text-xs text-muted-foreground">
                        Tenant: {order.tenant.user.name}
                      </p>
                    )}
                  </div>
                  <div className="flex items-center gap-3 text-sm">
                    {order.targetCompletion && (
                      <span className="text-muted-foreground">
                        Due {formatDate(order.targetCompletion)}
                      </span>
                    )}
                    <Badge variant="outline">{formatStatus(order.status)}</Badge>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground text-center py-8">
              No assigned work orders
            </p>
          )}
        </CardContent>
      </Card>

      {data.upcoming.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Calendar className="h-4 w-4" />
              Upcoming Appointments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.upcoming.map((event) => (
                <div key={event.id} className="flex items-center justify-between rounded-lg border p-3">
                  <div>
                    <p className="text-sm font-medium">{event.title}</p>
                    {event.property && (
                      <p className="text-xs text-muted-foreground">{event.property.name}</p>
                    )}
                  </div>
                  <span className="text-sm text-muted-foreground">
                    {formatDateTime(event.startAt)}
                  </span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
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
