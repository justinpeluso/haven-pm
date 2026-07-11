import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getProspect } from "@/lib/actions/prospects";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import { getMessagingSettings } from "@/lib/settings";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ActivityTimeline } from "@/components/shared/activity-timeline";
import { ProspectActions } from "@/components/prospects/prospect-actions";
import { ScheduleShowingForm } from "@/components/prospects/schedule-showing-form";
import { EmptyState } from "@/components/shared/empty-state";
import { PhoneLink } from "@/components/shared/phone-link";
import { formatCurrency, formatDate, formatDateTime } from "@/lib/utils";
import { Calendar, FileText, Home } from "lucide-react";

export default async function ProspectDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const session = await requirePermission("prospects:read");
  const { id } = await params;
  const [prospect, messaging] = await Promise.all([
    getProspect(id),
    getMessagingSettings(),
  ]);

  if (!prospect) notFound();

  const canSchedule = hasPermission(session.user.role, "calendar:write");

  const [allProperties, agents] = canSchedule
    ? await Promise.all([
        db.property.findMany({
          where: { deletedAt: null },
          select: {
            id: true,
            name: true,
            units: { where: { deletedAt: null }, select: { id: true, unitNumber: true } },
          },
          orderBy: { name: "asc" },
        }),
        db.user.findMany({
          where: {
            role: { in: ["LEASING_AGENT", "PROPERTY_MANAGER", "ADMINISTRATOR"] },
            deletedAt: null,
          },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        }),
      ])
    : [[], []];

  const linkedPropertyIds = new Set(prospect.properties.map((p) => p.propertyId));
  const scheduleProperties =
    linkedPropertyIds.size > 0
      ? allProperties.filter((p) => linkedPropertyIds.has(p.id))
      : allProperties;

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
        <p className="flex flex-wrap items-center gap-x-2 gap-y-1 text-muted-foreground">
          <span>{prospect.email}</span>
          {prospect.phone && (
            <>
              <span>·</span>
              <PhoneLink phone={prospect.phone} fromNumber={messaging.phoneNumber} />
            </>
          )}
        </p>
      </div>

      <ProspectActions prospectId={prospect.id} currentStatus={prospect.status} />

      {canSchedule && scheduleProperties.length > 0 && agents.length > 0 && (
        <ScheduleShowingForm
          prospectId={prospect.id}
          properties={scheduleProperties}
          agents={agents}
          defaultAgentId={session.user.id}
        />
      )}

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
              {prospect.timeline.length === 0 ? (
                <p className="py-8 text-center text-sm text-muted-foreground">No activity yet</p>
              ) : (
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
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="showings" className="mt-4">
          {prospect.showings.length === 0 ? (
            <EmptyState
              icon={Calendar}
              title="No showings scheduled"
              description="Use the form above to schedule a showing with this prospect."
              actionLabel="Open Calendar"
              actionHref="/calendar"
            />
          ) : (
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
          )}
        </TabsContent>

        <TabsContent value="properties" className="mt-4">
          {prospect.properties.length === 0 ? (
            <EmptyState
              icon={Home}
              title="No properties linked"
              description="Associate this prospect with properties they're interested in."
            />
          ) : (
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
          )}
        </TabsContent>

        <TabsContent value="notes" className="mt-4">
          {prospect.notes.length === 0 ? (
            <EmptyState
              icon={FileText}
              title="No notes yet"
              description="Add a note above to capture call summaries and follow-ups."
            />
          ) : (
            <div className="space-y-3">
              {prospect.notes.map((note) => (
                <Card key={note.id}>
                  <CardContent className="pt-4">
                    <p className="text-sm">{note.content}</p>
                    <p className="mt-2 text-xs text-muted-foreground">
                      {note.author.name} · {formatDate(note.createdAt)}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
