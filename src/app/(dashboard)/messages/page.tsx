import { requirePermission } from "@/lib/auth/session";
import { getMessagingSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink, MessageSquare, Phone, Smartphone, CheckCircle2 } from "lucide-react";
import { openPhoneMessageHref } from "@/lib/phone";

export default async function MessagesPage() {
  await requirePermission("messages:read");
  const messaging = await getMessagingSettings();
  const isOpenPhone =
    /openphone|quo/i.test(messaging.providerName) ||
    /openphone\.com|quo\.com/i.test(messaging.portalUrl);
  const hasNumber = Boolean(messaging.phoneNumber?.trim());

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Messages" }]} />
        <h1 className="mt-2 text-2xl font-bold">Texting & Messages</h1>
        <p className="text-muted-foreground">
          Prospect and tenant SMS runs through{" "}
          <span className="font-medium text-foreground">{messaging.providerName}</span>.
        </p>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <div className="flex flex-wrap items-center gap-2">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Smartphone className="h-5 w-5" />
              {messaging.providerName}
            </CardTitle>
            {hasNumber ? (
              <Badge variant="success">Connected</Badge>
            ) : (
              <Badge variant="warning">Add business number</Badge>
            )}
          </div>
          <CardDescription>
            Staff open the shared inbox here. Tenants text the business number below.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {hasNumber && (
            <div className="rounded-xl border bg-background/80 p-4">
              <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                Business number
              </p>
              <p className="mt-1 flex items-center gap-2 text-2xl font-bold tracking-tight">
                <Phone className="h-5 w-5 text-muted-foreground" />
                {messaging.phoneNumber}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Share this number with tenants and prospects — not your personal cell.
              </p>
            </div>
          )}

          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <a href={messaging.portalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open {messaging.providerName} inbox
              </a>
            </Button>
            {hasNumber && (
              <Button asChild size="lg" variant="outline">
                <a href={openPhoneMessageHref(messaging.phoneNumber)}>Text this number</a>
              </Button>
            )}
            {!hasNumber && (
              <Button asChild size="lg" variant="outline">
                <a href="/settings">Add number in Settings</a>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground break-all">
            Inbox: {messaging.portalUrl}
          </p>
        </CardContent>
      </Card>

      {isOpenPhone && !hasNumber && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" />
              Finish connecting OpenPhone
            </CardTitle>
            <CardDescription>
              Account is ready — paste your OpenPhone business number in Settings → SMS.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-2 pl-5 text-sm text-muted-foreground">
              <li>Open OpenPhone and copy your workspace phone number.</li>
              <li>
                In Haven go to{" "}
                <a href="/settings" className="font-medium text-foreground underline underline-offset-2">
                  Settings
                </a>{" "}
                → SMS / messaging portal.
              </li>
              <li>Paste the number and save — Texting will show Connected.</li>
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            How staff use this
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Click <span className="font-medium text-foreground">Open {messaging.providerName} inbox</span>{" "}
            to reply to tenants and prospects in the shared team inbox.
          </p>
          <p>
            Haven does not send SMS itself — OpenPhone handles delivery, voicemail, and the number.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
