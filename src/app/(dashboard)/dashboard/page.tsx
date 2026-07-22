import { requireAuth } from "@/lib/auth/session";
import { getDashboardData } from "@/lib/queries/dashboard";
import { getCalendarPreviewEvents } from "@/lib/queries/calendar";
import { getPortfolioPulse } from "@/lib/queries/portfolio-pulse";
import {
  getPaymentSettings,
  getMessagingSettings,
  getCompanySettings,
} from "@/lib/settings";
import { fetchWeatherForPlace } from "@/lib/weather";
import { UserRole } from "@prisma/client";
import { AdminDashboard } from "@/components/dashboard/admin-dashboard";
import { TenantDashboard } from "@/components/dashboard/tenant-dashboard";
import { MaintenanceDashboard } from "@/components/dashboard/maintenance-dashboard";
import { AgentDashboard } from "@/components/dashboard/agent-dashboard";
import { DashboardSideWidgets } from "@/components/dashboard/dashboard-side-widgets";
import { PittsburghTrafficWidget } from "@/components/dashboard/pittsburgh-traffic-widget";
import { PittsburghHousingWidget } from "@/components/dashboard/pittsburgh-housing-widget";
import { PittsburghAirQualityWidget } from "@/components/dashboard/pittsburgh-air-quality-widget";
import { MortgageRatesWidget } from "@/components/dashboard/mortgage-rates-widget";
import { PortfolioPulseWidget } from "@/components/dashboard/portfolio-pulse-widget";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";

export default async function DashboardPage() {
  const session = await requireAuth();
  const company = await getCompanySettings();
  const isTenantOrProspect =
    session.user.role === UserRole.TENANT ||
    session.user.role === UserRole.PROSPECT;
  const showStaffWidgets = !isTenantOrProspect;

  const [dashboard, payment, messaging, events, weatherResult, pulse] =
    await Promise.all([
      getDashboardData(session.user.role, session.user.id),
      getPaymentSettings(),
      getMessagingSettings(),
      showStaffWidgets ? getCalendarPreviewEvents(6) : Promise.resolve([]),
      fetchWeatherForPlace(company.city, company.state)
        .then((weather) => ({ weather, error: null as string | null }))
        .catch(() => ({
          weather: null,
          error: "Weather unavailable right now — try refreshing.",
        })),
      showStaffWidgets ? getPortfolioPulse() : Promise.resolve(null),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Dashboard" }]} />
        <h1 className="mt-2 text-2xl font-bold tracking-tight">
          Good {getGreeting()}, {session.user.name?.split(" ")[0] || "there"}
        </h1>
        <p className="text-muted-foreground">
          {isTenantOrProspect
            ? "Here’s what’s happening with your home."
            : "Here’s what’s happening across your portfolio today."}
        </p>
      </div>

      {pulse ? <PortfolioPulseWidget data={pulse} /> : null}

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
        <TenantDashboard data={dashboard.data} payment={payment} messaging={messaging} />
      )}
      {session.user.role === UserRole.PROSPECT && (
        <div className="rounded-xl border p-8 text-center">
          <h2 className="text-lg font-semibold">Welcome to Haven PM</h2>
          <p className="text-muted-foreground mt-2">
            Browse available properties and connect with our leasing team.
          </p>
        </div>
      )}

      <DashboardSideWidgets
        weather={weatherResult.weather}
        weatherError={weatherResult.error}
        events={events.map((e) => ({
          id: e.id,
          title: e.title,
          type: e.type,
          startAt: e.startAt,
          color: e.color,
          propertyName: e.property?.name ?? null,
        }))}
      />

      {showStaffWidgets ? (
        <>
          <PittsburghTrafficWidget />
          <PittsburghHousingWidget />
          <div className="grid gap-4 lg:grid-cols-2">
            <PittsburghAirQualityWidget />
            <MortgageRatesWidget />
          </div>
        </>
      ) : null}
    </div>
  );
}

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "morning";
  if (hour < 17) return "afternoon";
  return "evening";
}
