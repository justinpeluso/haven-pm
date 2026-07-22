"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import {
  markAllPortalMessagesRead,
  markPortalMessageRead,
} from "@/lib/actions/messages";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { CheckCheck, Loader2, Phone } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";

export type PortalInboxItem = {
  id: string;
  subject: string | null;
  body: string;
  type: string | null;
  priority: string | null;
  callbackPhone: string | null;
  status: string;
  readAt: Date | string | null;
  createdAt: Date | string;
  sender?: { name: string | null; email: string; phone: string | null } | null;
  tenant?: {
    phone: string | null;
    user: { name: string | null; email: string };
  } | null;
};

const TYPE_LABEL: Record<string, string> = {
  GENERAL: "General",
  BILLING: "Billing",
  MAINTENANCE: "Maintenance",
  LEASE: "Lease",
  NOISE: "Noise",
  OTHER: "Other",
};

function priorityVariant(
  priority: string | null
): "secondary" | "warning" | "destructive" | "outline" {
  if (priority === "URGENT" || priority === "HIGH") return "destructive";
  if (priority === "MEDIUM") return "warning";
  return "secondary";
}

export function StaffPortalInbox({ messages }: { messages: PortalInboxItem[] }) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [markingAll, startMarkAll] = useTransition();
  const unread = messages.filter((m) => m.status !== "READ").length;

  const onMarkRead = async (id: string) => {
    setPendingId(id);
    const result = await markPortalMessageRead(id);
    setPendingId(null);
    if (result.error) {
      toast({ title: "Failed", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Marked as read" });
    router.refresh();
  };

  const onMarkAll = () => {
    startMarkAll(async () => {
      await markAllPortalMessagesRead();
      toast({ title: "All messages marked as read" });
      router.refresh();
    });
  };

  return (
    <Card>
      <CardHeader className="flex flex-row flex-wrap items-start justify-between gap-3 space-y-0">
        <div>
          <CardTitle className="text-base">Tenant message inbox</CardTitle>
          <CardDescription>
            Messages tenants submit from their portal login.
            {unread > 0 ? ` ${unread} unread.` : " All caught up."}
          </CardDescription>
        </div>
        {unread > 0 ? (
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={markingAll}
            onClick={onMarkAll}
          >
            {markingAll ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <CheckCheck className="mr-2 h-4 w-4" />
            )}
            Mark all read
          </Button>
        ) : null}
      </CardHeader>
      <CardContent className="space-y-3">
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">No tenant portal messages yet.</p>
        ) : (
          messages.map((m) => {
            const unreadRow = m.status !== "READ";
            const name =
              m.tenant?.user.name ||
              m.sender?.name ||
              m.tenant?.user.email ||
              m.sender?.email ||
              "Tenant";
            const phone = m.callbackPhone || m.tenant?.phone || m.sender?.phone;
            const when =
              typeof m.createdAt === "string"
                ? new Date(m.createdAt)
                : m.createdAt;

            return (
              <div
                key={m.id}
                className={`rounded-lg border p-4 ${
                  unreadRow ? "border-primary/30 bg-primary/5" : "bg-background"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{name}</p>
                      {unreadRow ? <Badge>Unread</Badge> : <Badge variant="outline">Read</Badge>}
                      {m.type ? (
                        <Badge variant="outline">{TYPE_LABEL[m.type] ?? m.type}</Badge>
                      ) : null}
                      {m.priority ? (
                        <Badge variant={priorityVariant(m.priority)}>{m.priority}</Badge>
                      ) : null}
                    </div>
                    <p className="text-sm font-medium">{m.subject || "Message"}</p>
                    {phone ? (
                      <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
                        <Phone className="h-3.5 w-3.5" />
                        {phone}
                      </p>
                    ) : null}
                  </div>
                  <p className="shrink-0 text-xs text-muted-foreground">
                    {formatDistanceToNow(when, { addSuffix: true })}
                  </p>
                </div>
                <p className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-foreground/90">
                  {m.body}
                </p>
                {unreadRow ? (
                  <div className="mt-3">
                    <Button
                      type="button"
                      size="sm"
                      variant="secondary"
                      disabled={pendingId === m.id}
                      onClick={() => onMarkRead(m.id)}
                    >
                      {pendingId === m.id ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : null}
                      Mark as read
                    </Button>
                  </div>
                ) : null}
              </div>
            );
          })
        )}
      </CardContent>
    </Card>
  );
}

export function TenantSentMessages({
  messages,
}: {
  messages: Array<{
    id: string;
    subject: string | null;
    body: string;
    type: string | null;
    priority: string | null;
    status: string;
    createdAt: Date | string;
  }>;
}) {
  if (!messages.length) {
    return (
      <p className="text-sm text-muted-foreground">
        You haven’t sent any portal messages yet.
      </p>
    );
  }

  return (
    <div className="space-y-3">
      {messages.map((m) => {
        const when =
          typeof m.createdAt === "string" ? new Date(m.createdAt) : m.createdAt;
        return (
          <div key={m.id} className="rounded-lg border p-4">
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{m.subject || "Message"}</p>
              {m.type ? (
                <Badge variant="outline">{TYPE_LABEL[m.type] ?? m.type}</Badge>
              ) : null}
              {m.priority ? (
                <Badge variant={priorityVariant(m.priority)}>{m.priority}</Badge>
              ) : null}
              <Badge variant={m.status === "READ" ? "outline" : "secondary"}>
                {m.status === "READ" ? "Read by office" : "Sent"}
              </Badge>
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {m.body}
            </p>
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDistanceToNow(when, { addSuffix: true })}
            </p>
          </div>
        );
      })}
    </div>
  );
}
