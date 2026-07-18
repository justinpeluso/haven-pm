import Link from "next/link";
import {
  Building2,
  Users,
  Wrench,
  AlertTriangle,
  UserPlus,
  Calendar,
  TrendingUp,
} from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { Button } from "@/components/ui/button";
import { formatDate } from "@/lib/utils";
import type { getAdminDashboardData } from "@/lib/queries/dashboard";

type AdminData = Awaited<ReturnType<typeof getAdminDashboardData>>;

export function AdminDashboard({ data }: { data: AdminData }) {
  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Properties"
          value={data.propertyCount}
          icon={Building2}
          description={`${data.totalUnits} total units`}
        />
        <StatCard
          title="Occupancy Rate"
          value={`${data.occupancyRate}%`}
          icon={TrendingUp}
          description={`${data.occupiedUnits} occupied, ${data.vacantUnits} vacant`}
        />
        <StatCard
          title="Open Maintenance"
          value={data.openMaintenance}
          icon={Wrench}
          description={`${data.overdueMaintenance} overdue`}
        />
        <StatCard
          title="Prospects Waiting"
          value={data.prospectsWaiting}
          icon={UserPlus}
          description={`${data.upcomingShowings} showings this week`}
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Open Maintenance</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/maintenance">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {data.overdueMaintenance > 0 && (
                <div className="flex items-center gap-2 rounded-lg bg-destructive/10 p-3 text-sm">
                  <AlertTriangle className="h-4 w-4 text-destructive" />
                  <span>{data.overdueMaintenance} requests past target completion</span>
                </div>
              )}
              {data.recentOpenMaintenance.length ? (
                <ul className="space-y-2">
                  {data.recentOpenMaintenance.map((mr) => (
                    <li key={mr.id}>
                      <Link
                        href={`/maintenance/${mr.id}`}
                        className="flex flex-col gap-1 rounded-lg border p-3 text-sm transition-colors hover:bg-muted/50"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <span className="font-medium leading-snug">{mr.title}</span>
                          <Badge variant={priorityVariant(mr.priority)}>{mr.priority}</Badge>
                        </div>
                        <p className="text-xs text-muted-foreground">
                          {mr.property.name}
                          {mr.unit ? ` · Unit ${mr.unit.unitNumber}` : ""}
                          {mr.assignedStaff?.name ? ` · ${mr.assignedStaff.name}` : " · Unassigned"}
                        </p>
                        {mr.targetCompletion ? (
                          <p className="text-xs text-muted-foreground">
                            Due {formatDate(mr.targetCompletion)}
                          </p>
                        ) : null}
                      </Link>
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="py-4 text-center text-sm text-muted-foreground">
                  No open maintenance requests
                </p>
              )}
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Upcoming Showings</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendar">View calendar</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-3">
              <Calendar className="h-8 w-8 text-muted-foreground" />
              <div>
                <p className="text-2xl font-bold">{data.upcomingShowings}</p>
                <p className="text-sm text-muted-foreground">Scheduled in the next 7 days</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Activity</CardTitle>
        </CardHeader>
        <CardContent>
          <ActivityTimeline
            items={data.recentActivity.map((a) => ({
              id: a.id,
              action: formatAction(a.action, a.entityType),
              userName: a.user?.name,
              oldValue: a.oldValue,
              newValue: a.newValue,
              createdAt: a.createdAt,
            }))}
          />
        </CardContent>
      </Card>
    </div>
  );
}

function formatAction(action: string, entityType: string): string {
  const actions: Record<string, string> = {
    CREATED: `${entityType} created`,
    UPDATED: `${entityType} updated`,
    STATUS_CHANGED: `${entityType} status changed`,
    ASSIGNED: `${entityType} assigned`,
    DOCUMENT_UPLOADED: "Document uploaded",
    NOTE_ADDED: "Note added",
    LEASE_SIGNED: "Lease signed",
    TENANT_ASSIGNED: "Tenant assigned",
    PRIORITY_CHANGED: "Priority changed",
  };
  return actions[action] || action;
}

function priorityVariant(
  priority: string
): "default" | "secondary" | "destructive" | "outline" | "warning" {
  if (priority === "EMERGENCY" || priority === "HIGH") return "destructive";
  if (priority === "MEDIUM") return "warning";
  return "secondary";
}
