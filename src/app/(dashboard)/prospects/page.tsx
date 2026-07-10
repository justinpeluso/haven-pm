import Link from "next/link";
import { Plus } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { getProspects } from "@/lib/actions/prospects";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { formatCurrency, formatDate } from "@/lib/utils";

export default async function ProspectsPage() {
  await requirePermission("prospects:read");
  const prospects = await getProspects();

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
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

      <div className="space-y-3">
        {prospects.map((prospect) => (
          <Link key={prospect.id} href={`/prospects/${prospect.id}`}>
            <Card className="transition-colors hover:bg-muted/50">
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="font-medium">{prospect.name}</p>
                  <p className="text-sm text-muted-foreground">{prospect.email}</p>
                  {prospect.properties.length > 0 && (
                    <p className="text-xs text-muted-foreground mt-1">
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
                  {prospect.moveDate && (
                    <span className="text-sm text-muted-foreground">
                      Move: {formatDate(prospect.moveDate)}
                    </span>
                  )}
                  <Badge variant="outline">{formatStatus(prospect.status)}</Badge>
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>
    </div>
  );
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
