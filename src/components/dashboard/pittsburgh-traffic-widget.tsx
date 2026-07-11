"use client";

import { useEffect, useState } from "react";
import {
  AlertTriangle,
  Construction,
  MapPin,
  Radio,
  RefreshCw,
  RouteOff,
  Signpost,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import type { TrafficKind, TrafficSnapshot, TrafficUpdate } from "@/lib/traffic";

const REFRESH_MS = 30_000;

function kindMeta(kind: TrafficKind): {
  label: string;
  className: string;
  icon: typeof AlertTriangle;
} {
  switch (kind) {
    case "incident":
      return {
        label: "Incident",
        className: "border-red-200 bg-red-50 text-red-700",
        icon: AlertTriangle,
      };
    case "closure":
      return {
        label: "Closure",
        className: "border-orange-200 bg-orange-50 text-orange-700",
        icon: RouteOff,
      };
    case "sign":
      return {
        label: "Sign",
        className: "border-sky-200 bg-sky-50 text-sky-700",
        icon: Signpost,
      };
    case "condition":
      return {
        label: "Conditions",
        className: "border-amber-200 bg-amber-50 text-amber-700",
        icon: AlertTriangle,
      };
    case "roadwork":
      return {
        label: "Roadwork",
        className: "border-yellow-200 bg-yellow-50 text-yellow-800",
        icon: Construction,
      };
  }
}

function relativeTime(iso: string): string {
  const seconds = Math.max(0, Math.round((Date.now() - new Date(iso).getTime()) / 1000));
  if (seconds < 5) return "just now";
  if (seconds < 60) return `${seconds}s ago`;
  const minutes = Math.round(seconds / 60);
  return `${minutes}m ago`;
}

export function PittsburghTrafficWidget() {
  const [data, setData] = useState<TrafficSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let cancelled = false;
    let intervalId: ReturnType<typeof setInterval> | undefined;

    async function load() {
      try {
        const res = await fetch("/api/traffic", { cache: "no-store" });
        if (!res.ok) throw new Error("Failed to load traffic");
        const json = (await res.json()) as TrafficSnapshot;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) {
          setError("Traffic updates unavailable — retrying…");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    load();
    intervalId = setInterval(load, REFRESH_MS);
    const tickId = setInterval(() => setTick((t) => t + 1), 1000);

    return () => {
      cancelled = true;
      if (intervalId) clearInterval(intervalId);
      clearInterval(tickId);
    };
  }, []);

  void tick;

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Radio className="h-4 w-4" />
          Pittsburgh traffic
          <span className="relative flex h-2 w-2">
            <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-emerald-400 opacity-60" />
            <span className="relative inline-flex h-2 w-2 rounded-full bg-emerald-500" />
          </span>
        </CardTitle>
        <div className="flex items-center gap-2 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          <span>Live · refreshes every 30s</span>
          {data && (
            <span className="inline-flex items-center gap-1">
              <RefreshCw className={`h-3 w-3 ${loading ? "animate-spin" : ""}`} />
              {relativeTime(data.fetchedAt)}
            </span>
          )}
        </div>
      </CardHeader>
      <CardContent>
        {error && !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{error}</p>
        ) : loading && !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading live traffic…</p>
        ) : data && data.updates.length === 0 ? (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No active Pittsburgh-area incidents reported right now.
          </p>
        ) : (
          <ul className="divide-y rounded-lg border">
            {data?.updates.map((update) => (
              <TrafficRow key={update.id} update={update} />
            ))}
          </ul>
        )}
        <p className="mt-3 text-[10px] text-muted-foreground/80">
          Pittsburgh metro · live from 511PA (PennDOT) · auto-refresh 30s
          {error && data ? ` · ${error}` : ""}
        </p>
      </CardContent>
    </Card>
  );
}

function TrafficRow({ update }: { update: TrafficUpdate }) {
  const meta = kindMeta(update.kind);
  const Icon = meta.icon;

  return (
    <li className="flex gap-3 px-3 py-3">
      <div className="mt-0.5 shrink-0">
        <Icon className="h-4 w-4 text-muted-foreground" />
      </div>
      <div className="min-w-0 flex-1 space-y-1">
        <div className="flex flex-wrap items-center gap-2">
          <Badge variant="outline" className={`text-[10px] ${meta.className}`}>
            {meta.label}
          </Badge>
          <p className="truncate text-sm font-medium">{update.title}</p>
          <span className="text-[10px] text-muted-foreground">
            {update.milesFromDowntown} mi
          </span>
        </div>
        <p className="text-xs leading-relaxed text-muted-foreground">{update.description}</p>
      </div>
    </li>
  );
}
