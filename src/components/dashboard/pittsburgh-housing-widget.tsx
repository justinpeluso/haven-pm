"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Building2, Home, MapPin, Minus } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { HousingMarketSnapshot, HousingMetric } from "@/lib/housing-market";

function formatMoney(value: number, unit: "rent" | "sale"): string {
  if (unit === "rent") {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      maximumFractionDigits: 0,
    }).format(value);
  }
  if (value >= 1_000_000) {
    return `$${(value / 1_000_000).toFixed(2)}M`;
  }
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

function ChangeBadge({ metric }: { metric: HousingMetric }) {
  if (metric.changePct == null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        vs prior
      </span>
    );
  }
  const up = metric.changePct > 0;
  const flat = metric.changePct === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const color = flat
    ? "text-muted-foreground"
    : up
      ? "text-emerald-600"
      : "text-red-600";

  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {up && !flat ? "+" : ""}
      {metric.changePct}% MoM
    </span>
  );
}

function MetricCard({ metric }: { metric: HousingMetric }) {
  const Icon = metric.id === "rent-2br" ? Building2 : Home;

  return (
    <div className="rounded-xl border bg-gradient-to-b from-background to-muted/30 p-4">
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground">
          <Icon className="h-4 w-4" />
          {metric.label}
        </div>
        <ChangeBadge metric={metric} />
      </div>
      <p className="mt-3 text-3xl font-bold tracking-tight tabular-nums">
        {formatMoney(metric.value, metric.unit)}
        {metric.unit === "rent" && (
          <span className="text-base font-medium text-muted-foreground">/mo</span>
        )}
      </p>
      <p className="mt-1 text-xs text-muted-foreground">
        {metric.periodLabel}
        {metric.sampleSize != null ? ` · ${metric.sampleSize} sales` : ""}
      </p>
      <p className="mt-2 text-[11px] leading-snug text-muted-foreground/90">{metric.detail}</p>
    </div>
  );
}

export function PittsburghHousingWidget() {
  const [data, setData] = useState<HousingMarketSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      try {
        const res = await fetch("/api/housing-market", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load");
        const json = (await res.json()) as HousingMarketSnapshot;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Housing market data unavailable right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    return () => {
      cancelled = true;
    };
  }, []);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Home className="h-4 w-4" />
          Pittsburgh housing market
        </CardTitle>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          Monthly averages
        </span>
      </CardHeader>
      <CardContent>
        {error && !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{error}</p>
        ) : loading && !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            Loading monthly market data…
          </p>
        ) : data ? (
          <div className="grid gap-3 sm:grid-cols-3">
            {data.metrics.map((metric) => (
              <MetricCard key={metric.id} metric={metric} />
            ))}
          </div>
        ) : null}
        <p className="mt-3 text-[10px] text-muted-foreground/80">
          Sources: Zillow Research ZORI (rent) · Allegheny County property assessments via WPRDC
          (sales) · free public data, no API key
        </p>
      </CardContent>
    </Card>
  );
}
