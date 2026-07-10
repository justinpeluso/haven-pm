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
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Total open requests</span>
                <Badge variant="warning">{data.openMaintenance}</Badge>
              </div>
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
