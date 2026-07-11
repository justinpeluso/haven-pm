import { requirePermission } from "@/lib/auth/session";
import { getMessagingSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageSquare, Smartphone, CheckCircle2 } from "lucide-react";

export default async function MessagesPage() {
  await requirePermission("messages:read");
  const messaging = await getMessagingSettings();
  const isOpenPhone = /openphone/i.test(messaging.providerName) || /openphone\.com/i.test(messaging.portalUrl);

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Messages" }]} />
        <h1 className="mt-2 text-2xl font-bold">Texting & Messages</h1>
        <p className="text-muted-foreground">
          Prospect and tenant SMS runs through{" "}
          <span className="font-medium text-foreground">{messaging.providerName}</span> — not
          Haven&apos;s built-in inbox.
        </p>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5" />
            Open {messaging.providerName}
          </CardTitle>
          <CardDescription>
            Shared business number for calls and two-way texts with tenants and prospects.
            Change the portal URL anytime under Settings.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <Button asChild size="lg">
              <a href={messaging.portalUrl} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="mr-2 h-4 w-4" />
                Open {messaging.providerName}
              </a>
            </Button>
            {isOpenPhone && (
              <Button asChild size="lg" variant="outline">
                <a href="https://www.openphone.com/" target="_blank" rel="noopener noreferrer">
                  Create OpenPhone account
                </a>
              </Button>
            )}
          </div>
          <p className="text-xs text-muted-foreground break-all">
            Destination: {messaging.portalUrl}
          </p>
        </CardContent>
      </Card>

      {isOpenPhone && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <CheckCircle2 className="h-4 w-4" />
              OpenPhone setup (about 10 minutes)
            </CardTitle>
            <CardDescription>
              Haven can&apos;t create the account for you — once it exists, this button opens it.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <ol className="list-decimal space-y-3 pl-5 text-sm text-muted-foreground">
              <li>
                Go to{" "}
                <a
                  href="https://www.openphone.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="font-medium text-foreground underline underline-offset-2"
                >
                  openphone.com
                </a>{" "}
                and start a free trial / create a workspace for Haven PM.
              </li>
              <li>
                Pick a local Pittsburgh-area number (or port your existing business line).
              </li>
              <li>
                Invite leasing agents and property managers so everyone shares the same inbox.
              </li>
              <li>
                Confirm the web inbox opens at{" "}
                <span className="font-medium text-foreground">my.openphone.com</span> (already set
                in Settings).
              </li>
              <li>
                Optional: install the iOS / Android / desktop apps for after-hours replies.
              </li>
            </ol>
          </CardContent>
        </Card>
      )}

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Why OpenPhone here?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Shared number, real two-way SMS, voicemail, and a team inbox — without Haven needing to
            become a phone carrier or handle A2P registration itself.
          </p>
          <p>
            For big vacancy blasts later, add a campaign tool (SimpleTexting / Textedly). Day-to-day
            tenant and prospect texts stay in OpenPhone.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
