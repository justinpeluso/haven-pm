"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  clearPortalMessageAgentWorking,
  markAllPortalMessagesRead,
  markPortalMessageAgentWorking,
  markPortalMessageRead,
  markPortalMessageUnread,
  replyToPortalMessage,
} from "@/lib/actions/messages";
import { createMaintenanceRequestFromPortalMessage } from "@/lib/actions/maintenance";
import type { PortalInboxFilter } from "@/lib/portal-inbox";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { CheckCheck, Loader2, Phone, Wrench } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatDistanceToNow } from "date-fns";
import { cn } from "@/lib/utils";

export type PortalThreadReply = {
  id: string;
  body: string;
  createdAt: Date | string;
  sender?: {
    id: string;
    name: string | null;
    email: string;
    role?: string;
  } | null;
};

export type PortalInboxItem = {
  id: string;
  subject: string | null;
  body: string;
  type: string | null;
  priority: string | null;
  callbackPhone: string | null;
  status: string;
  agentWorking?: boolean;
  readAt: Date | string | null;
  createdAt: Date | string;
  sender?: { name: string | null; email: string; phone: string | null } | null;
  tenant?: {
    phone: string | null;
    user: { name: string | null; email: string };
  } | null;
  replies?: PortalThreadReply[];
  maintenanceRequest?: {
    id: string;
    requestNumber: string;
    status: string;
    title: string;
  } | null;
};

export type PortalInboxFilterCounts = {
  all: number;
  unread: number;
  read: number;
  working: number;
};

const FILTER_CHIPS: { key: PortalInboxFilter; label: string }[] = [
  { key: "all", label: "All" },
  { key: "unread", label: "Unread" },
  { key: "read", label: "Read" },
  { key: "working", label: "Agent working" },
];

const TYPE_LABEL: Record<string, string> = {
  GENERAL: "General",
  BILLING: "Billing",
  MAINTENANCE: "Maintenance",
  LEASE: "Lease",
  NOISE: "Noise",
  OTHER: "Other",
};

const WO_CATEGORIES = [
  "PLUMBING",
  "ELECTRICAL",
  "HVAC",
  "APPLIANCE",
  "STRUCTURAL",
  "PEST_CONTROL",
  "LANDSCAPING",
  "GENERAL",
  "OTHER",
];

function priorityVariant(
  priority: string | null
): "secondary" | "warning" | "destructive" | "outline" {
  if (priority === "URGENT" || priority === "HIGH") return "destructive";
  if (priority === "MEDIUM") return "warning";
  return "secondary";
}

function asDate(value: Date | string) {
  return typeof value === "string" ? new Date(value) : value;
}

function ThreadReplyComposer({
  messageId,
  pending,
  onReply,
}: {
  messageId: string;
  pending: boolean;
  onReply: (id: string, formData: FormData) => Promise<void>;
}) {
  return (
    <form
      className="mt-3 space-y-2"
      onSubmit={async (e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const formData = new FormData(form);
        await onReply(messageId, formData);
        form.reset();
      }}
    >
      <Textarea
        name="body"
        rows={2}
        required
        placeholder="Write a reply…"
        disabled={pending}
      />
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Send reply
      </Button>
    </form>
  );
}

function CreateWorkOrderPanel({
  message,
  pending,
  onCreate,
}: {
  message: PortalInboxItem;
  pending: boolean;
  onCreate: (id: string, formData: FormData) => Promise<void>;
}) {
  const defaultPriority =
    message.priority === "URGENT"
      ? "EMERGENCY"
      : message.priority === "HIGH" ||
          message.priority === "MEDIUM" ||
          message.priority === "LOW"
        ? message.priority
        : "MEDIUM";
  const defaultCategory = message.type === "MAINTENANCE" ? "GENERAL" : "GENERAL";

  return (
    <form
      className="mt-3 space-y-3 rounded-md border border-dashed p-3"
      onSubmit={async (e) => {
        e.preventDefault();
        const formData = new FormData(e.currentTarget);
        await onCreate(message.id, formData);
      }}
    >
      <p className="flex items-center gap-1.5 text-sm font-medium">
        <Wrench className="h-3.5 w-3.5" />
        Create work order
      </p>
      <div className="space-y-1">
        <Label htmlFor={`wo-title-${message.id}`}>Title</Label>
        <input
          id={`wo-title-${message.id}`}
          name="title"
          defaultValue={message.subject || ""}
          className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          required
          disabled={pending}
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor={`wo-desc-${message.id}`}>Description</Label>
        <Textarea
          id={`wo-desc-${message.id}`}
          name="description"
          rows={3}
          defaultValue={message.body}
          required
          disabled={pending}
        />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor={`wo-cat-${message.id}`}>Category</Label>
          <select
            id={`wo-cat-${message.id}`}
            name="category"
            defaultValue={defaultCategory}
            disabled={pending}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {WO_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {c.replace(/_/g, " ")}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1">
          <Label htmlFor={`wo-pri-${message.id}`}>Priority</Label>
          <select
            id={`wo-pri-${message.id}`}
            name="priority"
            defaultValue={defaultPriority}
            disabled={pending}
            className="flex h-9 w-full rounded-md border border-input bg-transparent px-3 py-1 text-sm shadow-sm"
          >
            {["LOW", "MEDIUM", "HIGH", "EMERGENCY"].map((p) => (
              <option key={p} value={p}>
                {p}
              </option>
            ))}
          </select>
        </div>
      </div>
      <p className="text-xs text-muted-foreground">
        Property and unit come from the tenant’s active lease.
      </p>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Create work order
      </Button>
    </form>
  );
}

export function StaffPortalInbox({
  messages,
  filter = "all",
  counts,
}: {
  messages: PortalInboxItem[];
  filter?: PortalInboxFilter;
  counts: PortalInboxFilterCounts;
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [markingAll, startMarkAll] = useTransition();
  const [showWoFor, setShowWoFor] = useState<string | null>(null);
  const unread = counts.unread;

  const runAction = async (
    id: string,
    action: () => Promise<{ error?: string }>,
    successTitle: string
  ) => {
    setPendingId(id);
    const result = await action();
    setPendingId(null);
    if (result.error) {
      toast({ title: "Failed", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: successTitle });
    router.refresh();
  };

  const onReply = async (id: string, formData: FormData) => {
    setPendingId(id);
    const result = await replyToPortalMessage(id, formData);
    setPendingId(null);
    if (result.error) {
      toast({ title: "Failed", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Reply sent" });
    router.refresh();
  };

  const onCreateWo = async (id: string, formData: FormData) => {
    setPendingId(id);
    const result = await createMaintenanceRequestFromPortalMessage(id, formData);
    setPendingId(null);
    if (result.error) {
      toast({ title: "Failed", description: result.error, variant: "destructive" });
      return;
    }
    setShowWoFor(null);
    toast({
      title: "Work order created",
      description: result.requestNumber
        ? `Linked ${result.requestNumber}`
        : undefined,
    });
    router.refresh();
  };

  const onMarkAll = () => {
    startMarkAll(async () => {
      await markAllPortalMessagesRead();
      toast({ title: "All messages marked as read" });
      router.refresh();
    });
  };

  const emptyCopy =
    filter === "unread"
      ? "No unread tenant messages."
      : filter === "read"
        ? "No read tenant messages."
        : filter === "working"
          ? "No messages marked as agent working."
          : "No tenant portal messages yet.";

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
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Inbox filters">
          {FILTER_CHIPS.map((chip) => {
            const active = filter === chip.key;
            const count = counts[chip.key];
            const href =
              chip.key === "all" ? "/messages" : `/messages?filter=${chip.key}`;
            return (
              <Button
                key={chip.key}
                asChild
                size="sm"
                variant={active ? "default" : "outline"}
                className={cn(
                  "h-8",
                  active &&
                    chip.key === "working" &&
                    "bg-amber-400 text-amber-950 hover:bg-amber-300"
                )}
              >
                <Link href={href} scroll={false} role="tab" aria-selected={active}>
                  {chip.label}
                  <span
                    className={cn(
                      "ml-1.5 tabular-nums",
                      active ? "opacity-90" : "text-muted-foreground"
                    )}
                  >
                    {count}
                  </span>
                </Link>
              </Button>
            );
          })}
        </div>
        {messages.length === 0 ? (
          <p className="text-sm text-muted-foreground">{emptyCopy}</p>
        ) : (
          messages.map((m) => {
            const working = !!m.agentWorking;
            const unreadRow = m.status !== "READ" && !working;
            const name =
              m.tenant?.user.name ||
              m.sender?.name ||
              m.tenant?.user.email ||
              m.sender?.email ||
              "Tenant";
            const phone = m.callbackPhone || m.tenant?.phone || m.sender?.phone;
            const when = asDate(m.createdAt);
            const replies = m.replies ?? [];

            return (
              <div
                key={m.id}
                className={`rounded-lg border p-4 ${
                  working
                    ? "border-amber-400/80 bg-amber-500/10"
                    : unreadRow
                      ? "border-primary/30 bg-primary/5"
                      : "bg-background"
                }`}
              >
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div className="min-w-0 space-y-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="font-semibold">{name}</p>
                      {working ? (
                        <Badge className="border-transparent bg-amber-400 text-amber-950 hover:bg-amber-400/90">
                          Agent working
                        </Badge>
                      ) : unreadRow ? (
                        <Badge>Unread</Badge>
                      ) : (
                        <Badge variant="outline">Read</Badge>
                      )}
                      {m.type ? (
                        <Badge variant="outline">{TYPE_LABEL[m.type] ?? m.type}</Badge>
                      ) : null}
                      {m.priority ? (
                        <Badge variant={priorityVariant(m.priority)}>{m.priority}</Badge>
                      ) : null}
                      {m.maintenanceRequest ? (
                        <Link
                          href={`/maintenance/${m.maintenanceRequest.id}`}
                          className="inline-flex"
                        >
                          <Badge variant="secondary">
                            {m.maintenanceRequest.requestNumber}
                          </Badge>
                        </Link>
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

                {replies.length > 0 ? (
                  <div className="mt-3 space-y-2 border-l-2 border-muted pl-3">
                    {replies.map((r) => (
                      <div key={r.id} className="text-sm">
                        <p className="text-xs text-muted-foreground">
                          {r.sender?.name || r.sender?.email || "User"}
                          {" · "}
                          {formatDistanceToNow(asDate(r.createdAt), { addSuffix: true })}
                        </p>
                        <p className="whitespace-pre-wrap">{r.body}</p>
                      </div>
                    ))}
                  </div>
                ) : null}

                <div className="mt-3 flex flex-wrap gap-2">
                  <Button
                    type="button"
                    size="sm"
                    variant="secondary"
                    disabled={pendingId === m.id}
                    onClick={() =>
                      runAction(m.id, () => markPortalMessageRead(m.id), "Marked as read")
                    }
                  >
                    Mark as read
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={pendingId === m.id}
                    onClick={() =>
                      runAction(
                        m.id,
                        () => markPortalMessageUnread(m.id),
                        "Marked as unread"
                      )
                    }
                  >
                    Mark as unread
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={working ? "outline" : "default"}
                    className={
                      working
                        ? "border-amber-400/70 text-amber-800 dark:text-amber-200"
                        : "bg-amber-400 text-amber-950 hover:bg-amber-300"
                    }
                    disabled={pendingId === m.id}
                    onClick={() =>
                      runAction(
                        m.id,
                        () =>
                          working
                            ? clearPortalMessageAgentWorking(m.id)
                            : markPortalMessageAgentWorking(m.id),
                        working ? "Cleared working status" : "Marked as working"
                      )
                    }
                  >
                    {working ? "Clear working" : "Agent working on this…"}
                  </Button>
                  {!m.maintenanceRequest ? (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={pendingId === m.id}
                      onClick={() =>
                        setShowWoFor((cur) => (cur === m.id ? null : m.id))
                      }
                    >
                      <Wrench className="mr-1.5 h-3.5 w-3.5" />
                      Work order
                    </Button>
                  ) : (
                    <Button asChild size="sm" variant="outline">
                      <Link href={`/maintenance/${m.maintenanceRequest.id}`}>
                        Open work order
                      </Link>
                    </Button>
                  )}
                </div>

                {showWoFor === m.id && !m.maintenanceRequest ? (
                  <CreateWorkOrderPanel
                    message={m}
                    pending={pendingId === m.id}
                    onCreate={onCreateWo}
                  />
                ) : null}

                <ThreadReplyComposer
                  messageId={m.id}
                  pending={pendingId === m.id}
                  onReply={onReply}
                />
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
  messages: PortalInboxItem[];
}) {
  const router = useRouter();
  const [pendingId, setPendingId] = useState<string | null>(null);

  const onReply = async (id: string, formData: FormData) => {
    setPendingId(id);
    const result = await replyToPortalMessage(id, formData);
    setPendingId(null);
    if (result.error) {
      toast({ title: "Failed", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Reply sent" });
    router.refresh();
  };

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
        const when = asDate(m.createdAt);
        const working = !!m.agentWorking;
        const replies = m.replies ?? [];
        return (
          <div
            key={m.id}
            className={`rounded-lg border p-4 ${
              working ? "border-amber-400/80 bg-amber-500/10" : ""
            }`}
          >
            <div className="flex flex-wrap items-center gap-2">
              <p className="font-medium">{m.subject || "Message"}</p>
              {m.type ? (
                <Badge variant="outline">{TYPE_LABEL[m.type] ?? m.type}</Badge>
              ) : null}
              {m.priority ? (
                <Badge variant={priorityVariant(m.priority)}>{m.priority}</Badge>
              ) : null}
              {working ? (
                <Badge className="border-transparent bg-amber-400 text-amber-950 hover:bg-amber-400/90">
                  Agent working on this…
                </Badge>
              ) : (
                <Badge variant={m.status === "READ" ? "outline" : "secondary"}>
                  {m.status === "READ" ? "Read by office" : "Sent"}
                </Badge>
              )}
              {m.maintenanceRequest ? (
                <Link
                  href={`/maintenance/${m.maintenanceRequest.id}`}
                  className="inline-flex"
                >
                  <Badge variant="secondary">
                    {m.maintenanceRequest.requestNumber}
                  </Badge>
                </Link>
              ) : null}
            </div>
            <p className="mt-2 whitespace-pre-wrap text-sm text-muted-foreground">
              {m.body}
            </p>
            {replies.length > 0 ? (
              <div className="mt-3 space-y-2 border-l-2 border-muted pl-3">
                {replies.map((r) => (
                  <div key={r.id} className="text-sm">
                    <p className="text-xs text-muted-foreground">
                      {r.sender?.role && r.sender.role !== "TENANT"
                        ? "Office"
                        : "You"}
                      {" · "}
                      {formatDistanceToNow(asDate(r.createdAt), { addSuffix: true })}
                    </p>
                    <p className="whitespace-pre-wrap text-foreground">{r.body}</p>
                  </div>
                ))}
              </div>
            ) : null}
            <p className="mt-2 text-xs text-muted-foreground">
              {formatDistanceToNow(when, { addSuffix: true })}
            </p>
            <ThreadReplyComposer
              messageId={m.id}
              pending={pendingId === m.id}
              onReply={onReply}
            />
          </div>
        );
      })}
    </div>
  );
}
