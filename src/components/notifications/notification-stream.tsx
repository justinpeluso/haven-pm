"use client";

import { useEffect, useRef } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { toast } from "@/hooks/use-toast";

export function NotificationStream() {
  const queryClient = useQueryClient();
  const eventSourceRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const es = new EventSource("/api/notifications/stream");
    eventSourceRef.current = es;

    es.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);

        if (data.type === "notifications" && data.items?.length > 0) {
          queryClient.setQueryData(["notifications", "unread"], { count: data.count });

          for (const item of data.items) {
            toast({
              title: item.title,
              description: item.message,
            });
          }
        } else if (data.type === "heartbeat") {
          queryClient.setQueryData(["notifications", "unread"], { count: data.count });
        }
      } catch {
        // ignore parse errors
      }
    };

    es.onerror = () => {
      es.close();
      setTimeout(() => {
        if (!eventSourceRef.current) return;
      }, 10000);
    };

    return () => {
      es.close();
      eventSourceRef.current = null;
    };
  }, [queryClient]);

  return null;
}
