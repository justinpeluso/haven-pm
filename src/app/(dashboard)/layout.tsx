import { requireAuth } from "@/lib/auth/session";
import { DashboardShell } from "@/components/layout/dashboard-shell";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <DashboardShell role={session.user.role} user={session.user}>
      {children}
    </DashboardShell>
  );
}
