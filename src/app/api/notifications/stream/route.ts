import { NextRequest } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return new Response("Unauthorized", { status: 401 });
  }

  const userId = session.user.id;
  let lastCheck = new Date();

  const stream = new ReadableStream({
    async start(controller) {
      const encoder = new TextEncoder();

      const send = (data: object) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      send({ type: "connected", count: 0 });

      const interval = setInterval(async () => {
        try {
          const notifications = await db.notification.findMany({
            where: {
              userId,
              isRead: false,
              createdAt: { gt: lastCheck },
            },
            orderBy: { createdAt: "desc" },
            take: 10,
          });

          const totalUnread = await db.notification.count({
            where: { userId, isRead: false },
          });

          if (notifications.length > 0) {
            send({
              type: "notifications",
              count: totalUnread,
              items: notifications.map((n) => ({
                id: n.id,
                title: n.title,
                message: n.message,
                link: n.link,
                createdAt: n.createdAt.toISOString(),
              })),
            });
          } else {
            send({ type: "heartbeat", count: totalUnread });
          }

          lastCheck = new Date();
        } catch {
          clearInterval(interval);
          controller.close();
        }
      }, 5000);

      request.signal.addEventListener("abort", () => {
        clearInterval(interval);
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache, no-transform",
      Connection: "keep-alive",
    },
  });
}
