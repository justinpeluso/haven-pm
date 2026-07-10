import { requireAuth } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getPaymentSettings } from "@/lib/settings";
import { UserRole } from "@prisma/client";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TenantDashboard } from "@/components/dashboard/tenant-dashboard";
import { MaintenanceDashboard } from "@/components/dashboard/maintenance-dashboard";
import { AgentDashboard } from "@/components/dashboard/agent-dashboard";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export default async function DashboardPage() {
  const session = await requireAuth();
  const [dashboard, payment] = await Promise.all([
    getDashboardData(session.user.role, session.user.id),
    getPaymentSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Dashboard" }]} />
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Good {getGreeting()}, {session.user.name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-muted-foreground">
          Here&apos;s what&apos;s happening across your portfolio today.
        </p>
      </div>

      {dashboard.type === "admin" && dashboard.data && (
        <AdminDashboard data={dashboard.data} />
      )}
      {dashboard.type === "manager" && dashboard.data && (
        <AdminDashboard data={dashboard.data} />
      )}
      {dashboard.type === "agent" && dashboard.data && (
        <AgentDashboard data={dashboard.data} />
      )}
      {dashboard.type === "maintenance" && dashboard.data && (
        <MaintenanceDashboard data={dashboard.data} />
      )}
      {dashboard.type === "tenant" && dashboard.data && (
        <TenantDashboard data={dashboard.data} payment={payment} />
      )}
      {session.user.role === UserRole.PROSPECT && (
        <div className="rounded-xl border p-8 text-center">
          <h2 className="text-lg font-semibold">Welcome to Haven PM</h2>
          <p className="text-muted-foreground mt-2">
            Browse available properties and connect with our leasing team.
          </p>
        </div>
      )}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
