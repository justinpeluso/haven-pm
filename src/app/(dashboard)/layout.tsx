import { requireAuth } from "@/lib/auth/session";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { NotificationStream } from "@/components/notifications/notification-stream";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await requireAuth();

  return (
    <div className="flex min-h-screen">
      <Sidebar role={session.user.role} />
      <div className="flex flex-1 flex-col overflow-hidden">
        <NotificationStream />
        <Header user={session.user} />
        <main className="flex-1 overflow-y-auto p-6">{children}</main>
      </div>
    </div>
  );
}
