import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ComposeForm } from "@/components/messages/compose-form";
import { formatDateTime } from "@/lib/utils";
import { MessageSquare } from "lucide-react";

export default async function MessagesPage() {
  const session = await requirePermission("messages:read");

  const [messages, users] = await Promise.all([
    db.message.findMany({
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
    }),
    db.user.findMany({
      where: { id: { not: session.user.id }, deletedAt: null },
      select: { id: true, name: true, email: true },
      orderBy: { name: "asc" },
    }),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Messages" }]} />
        <h1 className="mt-2 text-2xl font-bold">Messages</h1>
      </div>

      <ComposeForm users={users} />

      <div className="space-y-2">
        <h2 className="text-sm font-medium text-muted-foreground">Recent messages</h2>
        {messages.length === 0 ? (
          <EmptyState
            icon={MessageSquare}
            title="No messages yet"
            description="Send a message to a team member or tenant using the form above."
          />
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
                <p className="mt-1 text-sm text-muted-foreground">
                  {msg.senderId === session.user.id ? "To" : "From"}{" "}
                  {msg.senderId === session.user.id ? msg.receiver.name : msg.sender.name}
                </p>
                <p className="mt-2 line-clamp-2 text-sm">{msg.body}</p>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
