import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { formatDateTime } from "@/lib/utils";

export default async function MessagesPage() {
  const session = await requirePermission("messages:read");

  const messages = await db.message.findMany({
    where: {
      deletedAt: null,
      OR: [
        { senderId: session.user.id },
        { receiverId: session.user.id },
      ],
    },
    include: {
      sender: { select: { name: true } },
      receiver: { select: { name: true } },
    },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Messages" }]} />
        <h1 className="mt-2 text-2xl font-bold">Messages</h1>
      </div>

      <div className="space-y-2">
        {messages.length === 0 ? (
          <Card>
            <CardContent className="py-12 text-center text-muted-foreground">
              No messages yet
            </CardContent>
          </Card>
        ) : (
          messages.map((msg) => (
            <Card key={msg.id}>
              <CardContent className="p-4">
                <div className="flex items-center justify-between">
                  <p className="font-medium">{msg.subject || "No subject"}</p>
                  <span className="text-xs text-muted-foreground">
                    {formatDateTime(msg.createdAt)}
                  </span>
                </div>
                <p className="text-sm text-muted-foreground mt-1">
                  {msg.senderId === session.user.id ? "To" : "From"}{" "}
                  {msg.senderId === session.user.id ? msg.receiver.name : msg.sender.name}
                </p>
                <p className="text-sm mt-2 line-clamp-2">{msg.body}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
