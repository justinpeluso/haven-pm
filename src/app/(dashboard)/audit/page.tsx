import { Suspense } from "react";
import { requirePermission } from "@/lib/auth/session";
import { getActivityLogs, getAuditFilterOptions } from "@/lib/actions/audit";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { AuditFilters } from "@/components/audit/audit-filters";
import { formatDateTime } from "@/lib/utils";
import { EmptyState } from "@/components/shared/empty-state";
import { ClipboardList } from "lucide-react";

export default async function AuditPage({
  searchParams,
}: {
  searchParams: Promise<{ entityType?: string; propertyId?: string }>;
}) {
  await requirePermission("audit:read");
  const params = await searchParams;

  const [logs, filterOptions] = await Promise.all([
    getActivityLogs({
      entityType: params.entityType,
      propertyId: params.propertyId,
    }),
    getAuditFilterOptions(),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Audit Log" }]} />
        <h1 className="mt-2 text-2xl font-bold">Audit Log</h1>
        <p className="text-muted-foreground">
          System activity and change history across the platform
        </p>
      </div>

      <Suspense fallback={null}>
        <AuditFilters
          entityTypes={filterOptions.entityTypes}
          properties={filterOptions.properties}
        />
      </Suspense>

      {logs.length === 0 ? (
        <EmptyState
          icon={ClipboardList}
          title="No audit entries"
          description="Activity will be recorded here as users create and update records."
        />
      ) : (
        <div className="space-y-2">
          {logs.map((log) => (
            <Card key={log.id}>
              <CardContent className="flex flex-col gap-2 p-4 sm:flex-row sm:items-start sm:justify-between">
                <div className="space-y-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <p className="font-medium">
                      {log.action.replace(/_/g, " ")} — {log.entityType}
                    </p>
                    <Badge variant="outline">{log.entityType}</Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">
                    {log.user?.name || log.user?.email || "System"}
                    {log.property && ` · ${log.property.name}`}
                  </p>
                  {(log.oldValue || log.newValue) && (
                    <p className="text-xs text-muted-foreground">
                      {log.oldValue && <span>From: {log.oldValue}</span>}
                      {log.oldValue && log.newValue && " → "}
                      {log.newValue && <span>To: {log.newValue}</span>}
                    </p>
                  )}
                </div>
                <span className="shrink-0 text-xs text-muted-foreground">
                  {formatDateTime(log.createdAt)}
                </span>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
