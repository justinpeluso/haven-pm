import Link from "next/link";
import {
  Calendar,
  Cloud,
  CloudFog,
  CloudLightning,
  CloudRain,
  CloudSnow,
  CloudSun,
  MapPin,
  Sun,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatDateTime } from "@/lib/utils";
import { weatherLabel, type WeatherSnapshot } from "@/lib/weather";

function WeatherIcon({ code, className = "h-5 w-5" }: { code: number; className?: string }) {
  if (code === 0 || code === 1) return <Sun className={`${className} text-amber-500`} />;
  if (code === 2) return <CloudSun className={`${className} text-sky-500`} />;
  if (code === 3) return <Cloud className={`${className} text-slate-400`} />;
  if (code === 45 || code === 48) return <CloudFog className={`${className} text-slate-400`} />;
  if (code >= 71 && code <= 77) return <CloudSnow className={`${className} text-sky-400`} />;
  if (code >= 95) return <CloudLightning className={`${className} text-violet-500`} />;
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) {
    return <CloudRain className={`${className} text-blue-500`} />;
  }
  return <CloudSun className={`${className} text-sky-500`} />;
}

function weekdayLabel(dateStr: string, index: number): string {
  if (index === 0) return "Today";
  const date = new Date(`${dateStr}T12:00:00`);
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export interface CalendarPreviewEvent {
  id: string;
  title: string;
  type: string;
  startAt: Date | string;
  color: string | null;
  propertyName?: string | null;
}

export function DashboardSideWidgets({
  weather,
  weatherError,
  events,
}: {
  weather: WeatherSnapshot | null;
  weatherError?: string | null;
  events: CalendarPreviewEvent[];
}) {
  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <Calendar className="h-4 w-4" />
            Calendar preview
          </CardTitle>
          <Button variant="ghost" size="sm" asChild>
            <Link href="/calendar">Open</Link>
          </Button>
        </CardHeader>
        <CardContent>
          {events.length === 0 ? (
            <p className="py-6 text-center text-sm text-muted-foreground">
              No upcoming events in the next two weeks.
            </p>
          ) : (
            <ul className="space-y-3">
              {events.map((event) => (
                <li key={event.id} className="flex gap-3">
                  <div
                    className="mt-1 h-10 w-1 shrink-0 rounded-full"
                    style={{ backgroundColor: event.color || "#6b7280" }}
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-2">
                      <p className="truncate text-sm font-medium">{event.title}</p>
                      <Badge variant="outline" className="shrink-0 text-[10px]">
                        {event.type.replace(/_/g, " ")}
                      </Badge>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {formatDateTime(event.startAt)}
                      {event.propertyName ? ` · ${event.propertyName}` : ""}
                    </p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-3">
          <CardTitle className="flex items-center gap-2 text-base">
            <CloudSun className="h-4 w-4" />
            Weekly forecast
          </CardTitle>
          {weather && (
            <span className="flex items-center gap-1 text-xs text-muted-foreground">
              <MapPin className="h-3 w-3" />
              {weather.locationLabel}
            </span>
          )}
        </CardHeader>
        <CardContent>
          {weatherError && !weather ? (
            <p className="py-6 text-center text-sm text-muted-foreground">{weatherError}</p>
          ) : weather ? (
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <WeatherIcon code={weather.weatherCode} className="h-10 w-10" />
                <div>
                  <p className="text-2xl font-bold tracking-tight">
                    {weather.temperature}°F
                  </p>
                  <p className="text-sm text-muted-foreground">
                    {weatherLabel(weather.weatherCode)}
                    {weather.high != null && weather.low != null
                      ? ` · H ${weather.high}° L ${weather.low}°`
                      : ""}
                  </p>
                </div>
              </div>

              <ul className="divide-y rounded-lg border">
                {weather.days.map((day, index) => (
                  <li
                    key={day.date}
                    className="flex items-center gap-3 px-3 py-2 text-sm"
                  >
                    <span className="w-12 shrink-0 font-medium text-muted-foreground">
                      {weekdayLabel(day.date, index)}
                    </span>
                    <WeatherIcon code={day.weatherCode} className="h-4 w-4 shrink-0" />
                    <span className="min-w-0 flex-1 truncate text-xs text-muted-foreground">
                      {weatherLabel(day.weatherCode)}
                    </span>
                    <span className="shrink-0 tabular-nums text-muted-foreground">
                      {day.low}°
                    </span>
                    <span className="w-8 shrink-0 text-right tabular-nums font-medium">
                      {day.high}°
                    </span>
                  </li>
                ))}
              </ul>

              <p className="text-[10px] text-muted-foreground/80">
                Pittsburgh, PA · Open-Meteo
              </p>
            </div>
          ) : (
            <p className="py-6 text-center text-sm text-muted-foreground">Loading weather…</p>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
