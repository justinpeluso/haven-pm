import Link from "next/link";
import { Suspense } from "react";
import { Plus, Users } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getProspects } from "@/lib/actions/prospects";
import { getMessagingSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { ListFilters } from "@/components/shared/list-filters";
import { PhoneLink } from "@/components/shared/phone-link";
import { formatCurrency, formatDate } from "@/lib/utils";

const STATUS_OPTIONS = [
  "NEW", "CONTACTED", "SHOWING_SCHEDULED", "APPLICATION_SENT",
  "APPLICATION_RECEIVED", "APPROVED", "DENIED", "LEASED", "ARCHIVED",
].map((s) => ({ value: s, label: s.replace(/_/g, " ") }));

export default async function ProspectsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  await requirePermission("prospects:read");
  const params = await searchParams;
  const [prospects, messaging] = await Promise.all([
    getProspects(params.status),
    getMessagingSettings(),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <Breadcrumbs items={[{ label: "Prospects" }]} />
          <h1 className="mt-2 text-2xl font-bold">Prospect CRM</h1>
          <p className="text-muted-foreground">{prospects.length} prospects in pipeline</p>
        </div>
        <Button asChild>
          <Link href="/prospects/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Prospect
          </Link>
        </Button>
      </div>

      <Suspense fallback={null}>
        <ListFilters
          filters={[{ key: "status", label: "Status", options: STATUS_OPTIONS }]}
        />
      </Suspense>

      {prospects.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No prospects in pipeline"
          description={
            params.status
              ? "No prospects match this status. Try a different filter or add a new lead."
              : "Track leads from first contact through lease signing."
          }
          actionLabel="Add Prospect"
          actionHref="/prospects/new"
        />
      ) : (
        <div className="space-y-3">
          {prospects.map((prospect) => (
            <Card key={prospect.id} className="transition-colors hover:bg-muted/50">
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div className="min-w-0">
                  <Link href={`/prospects/${prospect.id}`} className="font-medium hover:underline">
                    {prospect.name}
                  </Link>
                  <p className="text-sm text-muted-foreground">{prospect.email}</p>
                  {prospect.phone && (
                    <div className="mt-1">
                      <PhoneLink
                        phone={prospect.phone}
                        fromNumber={messaging.phoneNumber}
                        className="text-sm"
                      />
                    </div>
                  )}
                  {prospect.properties.length > 0 && (
                    <p className="mt-1 text-xs text-muted-foreground">
                      Interested in: {prospect.properties.map((p) => p.property.name).join(", ")}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  {prospect.budget && (
                    <span className="text-sm text-muted-foreground">
                      {formatCurrency(Number(prospect.budget))}
                    </span>
                  )}
                  <Badge variant="outline">{prospect.status.replace(/_/g, " ")}</Badge>
                  {prospect.createdAt && (
                    <span className="hidden text-xs text-muted-foreground sm:inline">
                      {formatDate(prospect.createdAt)}
                    </span>
                  )}
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
