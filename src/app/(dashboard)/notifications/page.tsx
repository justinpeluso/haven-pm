import { requireAuth } from "@/lib/auth/session";
import { getNotifications } from "@/lib/actions/shared";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { EmptyState } from "@/components/shared/empty-state";
import { NotificationList } from "@/components/notifications/notification-list";
import { Bell } from "lucide-react";

export default async function NotificationsPage() {
  await requireAuth();
  const notifications = await getNotifications();

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Notifications" }]} />
        <h1 className="mt-2 text-2xl font-bold">Notifications</h1>
        <p className="text-muted-foreground">
          {notifications.filter((n) => !n.isRead).length} unread
        </p>
      </div>

      {notifications.length === 0 ? (
        <EmptyState
          icon={Bell}
          title="All caught up"
          description="New assignments, showings, and updates will appear here."
        />
      ) : (
        <NotificationList notifications={notifications} />
      )}
    </div>
  );
}
