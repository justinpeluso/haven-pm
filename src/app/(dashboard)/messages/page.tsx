import { UserRole } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { isStaffRole } from "@/lib/permissions";
import {
  getPortalInboxMessages,
  getTenantCallbackPhone,
} from "@/lib/actions/messages";
import {
  matchesPortalInboxFilter,
  parsePortalInboxFilter,
} from "@/lib/portal-inbox";
import { getMessagingSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { TenantPortalMessageForm } from "@/components/messages/tenant-portal-message-form";
import {
  StaffPortalInbox,
  TenantSentMessages,
  type PortalInboxItem,
} from "@/components/messages/portal-inbox";
import { ExternalLink, MessageSquare, Phone, Smartphone } from "lucide-react";

export default async function MessagesPage({
  searchParams,
}: {
  searchParams: Promise<{ filter?: string }>;
}) {
  const session = await requirePermission("messages:read");
  const role = session.user.role;
  const isTenant = role === UserRole.TENANT;
  const isStaff = isStaffRole(role);
  const params = await searchParams;
  const filter = parsePortalInboxFilter(params.filter);

  const [portalMessages, messaging, defaultPhone] = await Promise.all([
    getPortalInboxMessages(),
    isStaff || role === UserRole.PROSPECT
      ? getMessagingSettings()
      : Promise.resolve(null),
    isTenant ? getTenantCallbackPhone() : Promise.resolve(""),
  ]);

  if (isTenant) {
    return (
      <div className="mx-auto max-w-2xl space-y-6">
        <div>
          <Breadcrumbs items={[{ label: "Messages" }]} />
          <h1 className="mt-2 text-2xl font-bold">Messages</h1>
          <p className="text-muted-foreground">
            Contact the office about billing, lease questions, noise, and more.
          </p>
        </div>

        <TenantPortalMessageForm defaultPhone={defaultPhone} />

        <Card>
          <CardHeader>
            <CardTitle className="text-base">Your messages</CardTitle>
            <CardDescription>
              Office replies and work-order links show up in each thread.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <TenantSentMessages messages={portalMessages} />
          </CardContent>
        </Card>
      </div>
    );
  }

  const isOpenPhone =
    messaging &&
    (/openphone|quo/i.test(messaging.providerName) ||
      /openphone\.com|quo\.com/i.test(messaging.portalUrl));
  const hasNumber = Boolean(messaging?.phoneNumber?.trim());

  const all = portalMessages as PortalInboxItem[];
  const counts = {
    all: all.length,
    unread: all.filter((m) => matchesPortalInboxFilter(m, "unread")).length,
    read: all.filter((m) => matchesPortalInboxFilter(m, "read")).length,
    working: all.filter((m) => matchesPortalInboxFilter(m, "working")).length,
  };
  const filtered =
    filter === "all" ? all : all.filter((m) => matchesPortalInboxFilter(m, filter));

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Messages" }]} />
        <h1 className="mt-2 text-2xl font-bold">Messages</h1>
        <p className="text-muted-foreground">
          Tenant portal inbox
          {messaging ? (
            <>
              {" "}
              and SMS via{" "}
              <span className="font-medium text-foreground">{messaging.providerName}</span>
            </>
          ) : null}
          .
        </p>
      </div>

      {isStaff ? (
        <StaffPortalInbox messages={filtered} filter={filter} counts={counts} />
      ) : null}

      {messaging ? (
        <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
          <CardHeader>
            <div className="flex flex-wrap items-center gap-2">
              <CardTitle className="flex items-center gap-2 text-lg">
                <Smartphone className="h-5 w-5" />
                {messaging.providerName} SMS
              </CardTitle>
              {hasNumber ? (
                <Badge variant="success">Connected</Badge>
              ) : (
                <Badge variant="warning">Add business number</Badge>
              )}
            </div>
            <CardDescription>
              Optional SMS channel for prospects and quick texts
              {isOpenPhone ? " (OpenPhone / Quo)." : "."}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {hasNumber ? (
              <div className="rounded-xl border bg-background/80 p-4">
                <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Business number
                </p>
                <p className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
                  <Phone className="h-5 w-5 text-muted-foreground" />
                  {messaging.phoneNumber}
                </p>
              </div>
            ) : null}

            <div className="flex flex-wrap gap-2">
              <Button asChild size="lg">
                <a href={messaging.portalUrl} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-2 h-4 w-4" />
                  Open {messaging.providerName} inbox
                </a>
              </Button>
              {!hasNumber ? (
                <Button asChild size="lg" variant="outline">
                  <a href="/settings">Add number in Settings</a>
                </Button>
              ) : null}
            </div>

            <p className="flex items-start gap-2 text-xs text-muted-foreground">
              <MessageSquare className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              Tenant portal messages above stay in Haven. SMS remains in{" "}
              {messaging.providerName}.
            </p>
          </CardContent>
        </Card>
      ) : null}
    </div>
  );
}
