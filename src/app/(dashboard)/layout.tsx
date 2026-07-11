import { requireAuth } from "@/lib/auth/session";
import { getCompanySettings } from "@/lib/settings";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();
  const company = await getCompanySettings();

  return (
    <DashboardShell
      role={session.user.role}
      user={session.user}
      company={{ name: company.name, website: company.website }}
    >
      {children}
    </DashboardShell>
  );
}
