import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getProspect } from "@/lib/actions/prospects";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("prospects:read");
  const { id } = await params;
  const prospect = await getProspect(id);

  if (!prospect) notFound();

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Prospects", href: "/prospects" },
            { label: prospect.name },
          ]}
        />
        <div className="mt-2 flex items-center gap-3">
          <h1 className="text-2xl font-bold">{prospect.name}</h1>
          <Badge variant="outline">{formatStatus(prospect.status)}</Badge>
        </div>
        <p className="text-muted-foreground">{prospect.email} · {prospect.phone}</p>
      </div>

      <div className="grid gap-4 sm:grid-cols-4">
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Lead Source</p>
            <p className="font-medium">{prospect.leadSource || "—"}</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Budget</p>
            <p className="font-medium">
              {prospect.budget ? formatCurrency(Number(prospect.budget)) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Move Date</p>
            <p className="font-medium">
              {prospect.moveDate ? formatDate(prospect.moveDate) : "—"}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <p className="text-sm text-muted-foreground">Pets</p>
            <p className="font-medium">{prospect.pets || "None"}</p>
          </CardContent>
        </Card>
      </div>

      <Tabs defaultValue="timeline">
        <TabsList>
          <TabsTrigger value="timeline">Timeline</TabsTrigger>
          <TabsTrigger value="showings">Showings</TabsTrigger>
          <TabsTrigger value="properties">Properties</TabsTrigger>
          <TabsTrigger value="notes">Notes</TabsTrigger>
        </TabsList>

        <TabsContent value="timeline" className="mt-4">
          <Card>
            <CardContent className="pt-6">
              <ActivityTimeline
                items={prospect.timeline.map((t) => ({
                  id: t.id,
                  action: t.action,
                  oldValue: t.oldValue,
                  newValue: t.newValue,
                  notes: t.notes,
                  createdAt: t.createdAt,
                }))}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="showings" className="mt-4">
          <div className="space-y-2">
            {prospect.showings.map((showing) => (
              <Card key={showing.id}>
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{formatDateTime(showing.scheduledAt)}</p>
                    <p className="text-sm text-muted-foreground">
                      Agent: {showing.agent.name} · {showing.duration} min
                    </p>
                  </div>
                  <Badge variant="outline">{showing.status}</Badge>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="properties" className="mt-4">
          <div className="grid gap-3 sm:grid-cols-2">
            {prospect.properties.map((pp) => (
              <Card key={pp.id}>
                <CardContent className="p-4">
                  <p className="font-medium">{pp.property.name}</p>
                  <p className="text-sm text-muted-foreground">
                    {pp.property.addressLine1}, {pp.property.city}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          <div className="space-y-3">
            {prospect.notes.map((note) => (
              <Card key={note.id}>
                <CardContent className="pt-4">
                  <p className="text-sm">{note.content}</p>
                  <p className="text-xs text-muted-foreground mt-2">
                    {note.author.name} · {formatDate(note.createdAt)}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
