import Link from "next/link";
import { UserPlus, Calendar, Building2, TrendingUp } from "lucide-react";
import { StatCard } from "@/components/dashboard/stat-card";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDateTime } from "@/lib/utils";
import type { getAgentDashboardData } from "@/lib/queries/dashboard";

type AgentData = Awaited<ReturnType<typeof getAgentDashboardData>>;

export function AgentDashboard({ data }: { data: AgentData }) {
  const totalPipeline = data.pipeline.reduce((sum, p) => sum + p._count, 0);

  return (
    <div className="space-y-6">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard title="Active Leads" value={data.leads.length} icon={UserPlus} />
        <StatCard title="Showings Today" value={data.showingsToday.length} icon={Calendar} />
        <StatCard title="Available Units" value={data.availableUnits.length} icon={Building2} />
        <StatCard title="Pipeline Total" value={totalPipeline} icon={TrendingUp} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Today&apos;s Showings</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/calendar">Calendar</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.showingsToday.length ? (
              <div className="space-y-3">
                {data.showingsToday.map((showing) => (
                  <div key={showing.id} className="rounded-lg border p-3">
                    <div className="flex items-center justify-between">
                      <p className="font-medium">{showing.prospect.name}</p>
                      <Badge variant="outline">{showing.status}</Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {formatDateTime(showing.scheduledAt)} · {showing.duration} min
                    </p>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground text-center py-4">
                No showings scheduled today
              </p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-base">Prospect Pipeline</CardTitle>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/prospects">View all</Link>
            </Button>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {data.pipeline.map((stage) => (
                <div key={stage.status} className="flex items-center justify-between">
                  <span className="text-sm">{formatStatus(stage.status)}</span>
                  <Badge variant="secondary">{stage._count}</Badge>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Recent Leads</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {data.leads.map((lead) => (
              <Link
                key={lead.id}
                href={`/prospects/${lead.id}`}
                className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
              >
                <div>
                  <p className="text-sm font-medium">{lead.name}</p>
                  <p className="text-xs text-muted-foreground">{lead.email}</p>
                </div>
                <div className="text-right">
                  <Badge variant="outline">{formatStatus(lead.status)}</Badge>
                  {lead.budget && (
                    <p className="text-xs text-muted-foreground mt-1">
                      Budget: {formatCurrency(Number(lead.budget))}
                    </p>
                  )}
                </div>
              </Link>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Available Units</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid gap-3 sm:grid-cols-2">
            {data.availableUnits.map((unit) => (
              <div key={unit.id} className="rounded-lg border p-3">
                <p className="font-medium">{unit.property.name}</p>
                <p className="text-sm text-muted-foreground">Unit {unit.unitNumber}</p>
                <p className="text-sm font-medium mt-1">
                  {formatCurrency(Number(unit.rentAmount))}/mo
                </p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
