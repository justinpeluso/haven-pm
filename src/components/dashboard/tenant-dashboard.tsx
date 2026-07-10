import Link from "next/link";
import { Home, Wrench, FileText, MessageSquare } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { getTenantDashboardData } from "@/lib/queries/dashboard";
import type { PaymentSettings } from "@/lib/settings";
import { PayRentButton } from "@/components/tenant/pay-rent-button";

type TenantData = Awaited<ReturnType<typeof getTenantDashboardData>>;

export function TenantDashboard({
  data,
  payment,
}: {
  data: TenantData;
  payment: PaymentSettings;
}) {
  const activeLease = data.tenant?.leases[0];
  const property = activeLease?.unit.property;

  return (
    <div className="space-y-6">
      <Card className="border-primary/20 bg-gradient-to-r from-primary/5 to-transparent">
        <CardContent className="flex flex-col gap-4 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold">Pay Rent</h2>
            <p className="text-sm text-muted-foreground">
              {activeLease
                ? `Current balance due: ${formatCurrency(Number(activeLease.rentAmount))}`
                : "View your payment portal"}
            </p>
          </div>
          <PayRentButton
            rentAmount={activeLease ? Number(activeLease.rentAmount) : undefined}
            provider={payment.stripeEnabled && payment.provider === "stripe" ? "stripe" : "external"}
            externalUrl={payment.externalUrl}
          />
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <Home className="h-4 w-4" />
              Current Property
            </CardTitle>
          </CardHeader>
          <CardContent>
            {property ? (
              <div className="space-y-2">
                <p className="font-medium">{property.name}</p>
                <p className="text-sm text-muted-foreground">
                  {property.addressLine1}, {property.city}, {property.state} {property.zipCode}
                </p>
                {activeLease && (
                  <>
                    <p className="text-sm">Unit {activeLease.unit.unitNumber}</p>
                    <div className="flex gap-4 pt-2 text-sm">
                      <div>
                        <span className="text-muted-foreground">Rent: </span>
                        {formatCurrency(Number(activeLease.rentAmount))}/mo
                      </div>
                      <div>
                        <span className="text-muted-foreground">Lease ends: </span>
                        {formatDate(activeLease.endDate)}
                      </div>
                    </div>
                  </>
                )}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No active lease</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="flex items-center gap-2 text-base">
              <Wrench className="h-4 w-4" />
              Maintenance Requests
            </CardTitle>
            <Button size="sm" asChild>
              <Link href="/maintenance/new">New Request</Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.tenant?.maintenanceRequests.length ? (
              <div className="space-y-3">
                {data.tenant.maintenanceRequests.map((req) => (
                  <Link
                    key={req.id}
                    href={`/maintenance/${req.id}`}
                    className="flex items-center justify-between rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <div>
                      <p className="text-sm font-medium">{req.title}</p>
                      <p className="text-xs text-muted-foreground">{req.requestNumber}</p>
                    </div>
                    <Badge variant={getStatusVariant(req.status)}>{formatStatus(req.status)}</Badge>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No maintenance requests yet</p>
            )}
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <FileText className="h-4 w-4" />
              Documents
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.documents.length ? (
              <div className="space-y-2">
                {data.documents.map((doc) => (
                  <div key={doc.id} className="flex items-center justify-between rounded-lg border p-3">
                    <div>
                      <p className="text-sm font-medium">{doc.name}</p>
                      <p className="text-xs text-muted-foreground">{doc.type.replace(/_/g, " ")}</p>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <a href={doc.url} target="_blank" rel="noopener noreferrer">View</a>
                    </Button>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No documents available</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-base">
              <MessageSquare className="h-4 w-4" />
              Messages
            </CardTitle>
          </CardHeader>
          <CardContent>
            {data.tenant?.user.messagesReceived.length ? (
              <div className="space-y-2">
                {data.tenant.user.messagesReceived.map((msg) => (
                  <Link
                    key={msg.id}
                    href="/messages"
                    className="block rounded-lg border p-3 transition-colors hover:bg-muted/50"
                  >
                    <p className="text-sm font-medium">{msg.subject || "No subject"}</p>
                    <p className="text-xs text-muted-foreground">From {msg.sender.name}</p>
                  </Link>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">No messages</p>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function formatStatus(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function getStatusVariant(status: string): "default" | "secondary" | "warning" | "success" | "info" {
  const map: Record<string, "default" | "secondary" | "warning" | "success" | "info"> = {
    SUBMITTED: "info",
    ASSIGNED: "secondary",
    SCHEDULED: "info",
    IN_PROGRESS: "warning",
    WAITING_ON_PARTS: "warning",
    COMPLETED: "success",
    CLOSED: "default",
  };
  return map[status] || "default";
}
