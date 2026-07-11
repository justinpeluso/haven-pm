"use client";

import { Suspense, useState } from "react";
import { UserRole } from "@prisma/client";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { NotificationStream } from "@/components/notifications/notification-stream";
import { PageAlerts } from "@/components/shared/page-alerts";

interface DashboardShellProps {
  role: UserRole;
  user: {
    name: string | null;
    email: string;
    role: UserRole;
  };
  company?: {
    name: string;
    website: string;
  };
  children: React.ReactNode;
}

export function DashboardShell({ role, user, company, children }: DashboardShellProps) {
  const [mobileOpen, setMobileOpen] = useState(false);

  return (
    <div className="flex min-h-screen">
      <Sidebar
        role={role}
        company={company}
        mobileOpen={mobileOpen}
        onMobileOpenChange={setMobileOpen}
      />
      <div className="flex min-w-0 flex-1 flex-col overflow-hidden">
        <NotificationStream />
        <Header user={user} onMenuClick={() => setMobileOpen(true)} />
        <main className="flex-1 overflow-y-auto p-4 md:p-6">
          <Suspense fallback={null}>
            <PageAlerts />
          </Suspense>
          {children}
        </main>
      </div>
    </div>
  );
}
