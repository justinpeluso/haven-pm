import { requirePermission } from "@/lib/auth/session";
import { getMessagingSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { ExternalLink, MessageSquare, Smartphone } from "lucide-react";

export default async function MessagesPage() {
  await requirePermission("messages:read");
  const messaging = await getMessagingSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Messages" }]} />
        <h1 className="mt-2 text-2xl font-bold">Texting & Messages</h1>
        <p className="text-muted-foreground">
          Prospect and tenant SMS runs through an external messaging provider — not Haven&apos;s built-in inbox.
        </p>
      </div>

      <Card className="border-primary/20 bg-gradient-to-br from-primary/5 to-transparent">
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Smartphone className="h-5 w-5" />
            Open messaging portal
          </CardTitle>
          <CardDescription>
            Mass texts, two-way SMS, and prospect campaigns are handled in{" "}
            <span className="font-medium text-foreground">{messaging.providerName}</span>.
            Configure the URL under Settings when you pick a vendor.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Button asChild size="lg" className="w-full sm:w-auto">
            <a href={messaging.portalUrl} target="_blank" rel="noopener noreferrer">
              <ExternalLink className="mr-2 h-4 w-4" />
              Open SMS Portal
            </a>
          </Button>
          <p className="text-xs text-muted-foreground break-all">
            Destination: {messaging.portalUrl}
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <MessageSquare className="h-4 w-4" />
            Why external?
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-muted-foreground">
          <p>
            Carrier-compliant mass texting, delivery reports, opt-out handling, and high-volume
            prospect blasts are better handled by a dedicated SMS platform than an in-app chat.
          </p>
          <p>
            Until a provider is chosen, this button opens a placeholder URL so the workflow is ready
            to wire up.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
