import Link from "next/link";
import {
  AlertTriangle,
  ArrowRightLeft,
  CalendarClock,
  DoorOpen,
  Home,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatCurrency, formatDate } from "@/lib/utils";
import type { PortfolioPulse } from "@/lib/queries/portfolio-pulse";

export function PortfolioPulseWidget({ data }: { data: PortfolioPulse }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Home className="h-4 w-4" />
          Portfolio pulse
        </CardTitle>
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline">{data.expiringCount} leases ≤60d</Badge>
          <Badge variant="outline">{data.vacantCount} vacant</Badge>
          {data.openEmergency > 0 && (
            <Badge variant="destructive" className="gap-1">
              <AlertTriangle className="h-3 w-3" />
              {data.openEmergency} emergency
            </Badge>
          )}
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid gap-4 lg:grid-cols-3">
          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                Leases expiring
              </h3>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                <Link href="/properties">View</Link>
              </Button>
            </div>
            {data.expiringLeases.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                No leases ending in the next 60 days.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.expiringLeases.map((lease) => (
                  <li key={lease.id} className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {lease.tenantName || "Tenant"}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          {lease.propertyName} · Unit {lease.unitNumber}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <p className="text-xs font-medium">{formatDate(lease.endDate)}</p>
                        <p className="text-[10px] text-muted-foreground">
                          {formatCurrency(lease.rentAmount)}/mo
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                <DoorOpen className="h-3.5 w-3.5 text-muted-foreground" />
                Vacant units
              </h3>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                <Link href="/properties">List</Link>
              </Button>
            </div>
            {data.vacantUnits.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                No vacant units right now.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.vacantUnits.map((unit) => (
                  <li key={unit.id} className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">
                          {unit.propertyName}
                        </p>
                        <p className="truncate text-xs text-muted-foreground">
                          Unit {unit.unitNumber}
                          {unit.bedrooms != null ? ` · ${unit.bedrooms} bed` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge variant="secondary" className="text-[10px]">
                          {unit.status.replace(/_/g, " ")}
                        </Badge>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatCurrency(unit.rentAmount)}/mo
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>

          <section>
            <div className="mb-2 flex items-center justify-between">
              <h3 className="flex items-center gap-1.5 text-sm font-medium">
                <ArrowRightLeft className="h-3.5 w-3.5 text-muted-foreground" />
                Move-ins / outs
              </h3>
              <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" asChild>
                <Link href="/calendar">Calendar</Link>
              </Button>
            </div>
            {data.moveEvents.length === 0 ? (
              <p className="rounded-lg border border-dashed px-3 py-6 text-center text-xs text-muted-foreground">
                No move-ins or move-outs in the next 30 days.
              </p>
            ) : (
              <ul className="divide-y rounded-lg border">
                {data.moveEvents.map((event) => (
                  <li key={event.id} className="px-3 py-2.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{event.title}</p>
                        <p className="truncate text-xs text-muted-foreground">
                          {event.propertyName || "Property"}
                          {event.unitNumber ? ` · Unit ${event.unitNumber}` : ""}
                        </p>
                      </div>
                      <div className="shrink-0 text-right">
                        <Badge
                          variant="outline"
                          className={
                            event.type === "MOVE_IN"
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700 text-[10px]"
                              : "border-orange-200 bg-orange-50 text-orange-700 text-[10px]"
                          }
                        >
                          {event.type === "MOVE_IN" ? "Move-in" : "Move-out"}
                        </Badge>
                        <p className="mt-1 text-[10px] text-muted-foreground">
                          {formatDate(event.startAt)}
                        </p>
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </section>
        </div>
      </CardContent>
    </Card>
  );
}
