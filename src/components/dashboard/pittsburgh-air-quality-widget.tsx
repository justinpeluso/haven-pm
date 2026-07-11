"use client";

import { useEffect, useState } from "react";
import { Leaf, MapPin, Wind } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AirQualitySnapshot } from "@/lib/air-quality";

function aqiColor(aqi: number): string {
  if (aqi <= 50) return "text-emerald-600";
  if (aqi <= 100) return "text-amber-600";
  if (aqi <= 150) return "text-orange-600";
  if (aqi <= 200) return "text-red-600";
  return "text-purple-700";
}

function aqiBarColor(aqi: number): string {
  if (aqi <= 50) return "bg-emerald-500";
  if (aqi <= 100) return "bg-amber-500";
  if (aqi <= 150) return "bg-orange-500";
  if (aqi <= 200) return "bg-red-500";
  return "bg-purple-600";
}

export function PittsburghAirQualityWidget() {
  const [data, setData] = useState<AirQualitySnapshot | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      try {
        const res = await fetch("/api/air-quality", { cache: "no-store" });
        if (!res.ok) throw new Error("failed");
        const json = (await res.json()) as AirQualitySnapshot;
        if (!cancelled) {
          setData(json);
          setError(null);
        }
      } catch {
        if (!cancelled) setError("Air quality unavailable right now.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    const id = setInterval(load, 15 * 60 * 1000);
    return () => {
      cancelled = true;
      clearInterval(id);
    };
  }, []);

  return (
    <Card className="h-full">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
        <CardTitle className="flex items-center gap-2 text-base">
          <Leaf className="h-4 w-4" />
          Air quality
        </CardTitle>
        <span className="flex items-center gap-1 text-xs text-muted-foreground">
          <MapPin className="h-3 w-3" />
          Pittsburgh
        </span>
      </CardHeader>
      <CardContent>
        {error && !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">{error}</p>
        ) : loading && !data ? (
          <p className="py-6 text-center text-sm text-muted-foreground">Loading air quality…</p>
        ) : data ? (
          <div className="space-y-4">
            <div className="flex items-end justify-between gap-3">
              <div>
                <p className={`text-4xl font-bold tracking-tight tabular-nums ${aqiColor(data.usAqi)}`}>
                  {data.usAqi}
                </p>
                <p className="text-sm font-medium">{data.category}</p>
              </div>
              <div className="text-right text-xs text-muted-foreground">
                <p className="inline-flex items-center gap-1">
                  <Wind className="h-3 w-3" />
                  US AQI
                </p>
                <p className="mt-1">PM2.5 {data.pm25} · PM10 {data.pm10}</p>
              </div>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-muted">
              <div
                className={`h-full rounded-full transition-all ${aqiBarColor(data.usAqi)}`}
                style={{ width: `${Math.min(100, (data.usAqi / 300) * 100)}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{data.advice}</p>
            <p className="text-[10px] text-muted-foreground/80">Open-Meteo · refreshes every 15 min</p>
          </div>
        ) : null}
      </CardContent>
    </Card>
  );
}
