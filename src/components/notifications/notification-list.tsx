"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { markNotificationRead } from "@/lib/actions/shared";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface NotificationItem {
  id: string;
  title: string;
  message: string;
  link: string | null;
  isRead: boolean;
  createdAt: Date;
}

export function NotificationList({ notifications }: { notifications: NotificationItem[] }) {
  const router = useRouter();

  const handleClick = async (n: NotificationItem) => {
    if (!n.isRead) {
      await markNotificationRead(n.id);
    }
    if (n.link) {
      router.push(n.link);
    } else {
      router.refresh();
    }
  };

  return (
    <div className="space-y-2">
      {notifications.map((n) => (
        <Card
          key={n.id}
          className={cn(
            "cursor-pointer transition-colors hover:bg-muted/50",
            n.isRead && "opacity-60"
          )}
          onClick={() => handleClick(n)}
        >
          <CardContent className="p-4">
            <div className="flex items-start justify-between gap-4">
              <div>
                <div className="flex items-center gap-2">
                  <p className="font-medium">{n.title}</p>
                  {!n.isRead && <Badge variant="info">New</Badge>}
                </div>
                <p className="mt-1 text-sm text-muted-foreground">{n.message}</p>
                <p className="mt-2 text-xs text-muted-foreground">
                  {formatDateTime(n.createdAt)}
                </p>
              </div>
              {n.link && (
                <Link
                  href={n.link}
                  className="shrink-0 text-sm text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  View
                </Link>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
