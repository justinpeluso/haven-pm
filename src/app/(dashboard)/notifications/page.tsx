import { requireAuth } from "@/lib/auth/session";
import { getNotifications } from "@/lib/actions/shared";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { formatDateTime } from "@/lib/utils";

export default async function NotificationsPage() {
  await requireAuth();
  const notifications = await getNotifications();

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Notifications" }]} />
        <h1 className="mt-2 text-2xl font-bold">Notifications</h1>
      </div>

      <div className="space-y-2">
        {notifications.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No notifications
            </CardContent>
          </Card>
        ) : (
          notifications.map((n) => (
            <Card key={n.id} className={n.isRead ? "opacity-60" : ""}>
              <CardContent className="p-4">
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{n.title}</p>
                      {!n.isRead && <Badge variant="info">New</Badge>}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">{n.message}</p>
                    <p className="text-xs text-muted-foreground mt-2">
                      {formatDateTime(n.createdAt)}
                    </p>
                  </div>
                  {n.link && (
                    <Link href={n.link} className="text-sm text-primary hover:underline shrink-0">
                      View
                    </Link>
                  )}
                </div>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
