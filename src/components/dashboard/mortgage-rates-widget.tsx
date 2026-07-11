"use client";

import { useEffect, useState } from "react";
import { ArrowDownRight, ArrowUpRight, Landmark, Minus, Percent } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { MortgageRateSnapshot } from "@/lib/mortgage-rates";

function Change({ value }: { value: number | null }) {
  if (value == null) {
    return (
      <span className="inline-flex items-center gap-0.5 text-xs text-muted-foreground">
        <Minus className="h-3 w-3" />
        vs prior week
      </span>
    );
  }
  const up = value > 0;
  const flat = value === 0;
  const Icon = flat ? Minus : up ? ArrowUpRight : ArrowDownRight;
  const color = flat ? "text-muted-foreground" : up ? "text-red-600" : "text-emerald-600";
  return (
    <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${color}`}>
      <Icon className="h-3.5 w-3.5" />
      {up && !flat ? "+" : ""}
      {value.toFixed(2)} pts
    </span>
  );
}

export function MortgageRatesWidget() {
  const [data, setData] = useState<MortgageRateSnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/mortgage-rates", { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as MortgageRateSnapshot;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Mortgage rates unavailable right now.");
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
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Landmark className="h-4 w-4" />
          Mortgage rates
        </CardTitle>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <Percent className="h-3 w-3" />
          U.S. weekly avg
        </span>
      </CardHeader>
      <CardContent>
        {error && !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{error}</p>
        ) : loading && !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading mortgage rates…</p>
        ) : data ? (
          <div className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-xl border bg-gradient-to-b from-background to-muted/30 p-3">
                <p className="text-xs text-muted-foreground">30-year fixed</p>
                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                  {data.rate30.toFixed(2)}
                  <span className="text-base font-medium text-muted-foreground">%</span>
                </p>
                <div className="mt-1">
                  <Change value={data.change30} />
                </div>
              </div>
              <div className="rounded-xl border bg-gradient-to-b from-background to-muted/30 p-3">
                <p className="text-xs text-muted-foreground">15-year fixed</p>
                <p className="mt-1 text-3xl font-bold tracking-tight tabular-nums">
                  {data.rate15.toFixed(2)}
                  <span className="text-base font-medium text-muted-foreground">%</span>
                </p>
                <div className="mt-1">
                  <Change value={data.change15} />
                </div>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">Week of {data.weekOf}</p>
            <p className="text-[10px] text-muted-foreground/80">
              Freddie Mac Primary Mortgage Market Survey · free public data
            </p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
