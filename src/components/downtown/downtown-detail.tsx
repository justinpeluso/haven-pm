"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import type {
  BusinessMix,
  DowntownMetrics,
  SamplePoi,
  UsPeer,
} from "@/lib/downtown/types";
import type { DowntownProfile } from "@/lib/downtown/profiles";
import { DowntownSubnav } from "./downtown-subnav";

type DowntownInfo = {
  id: string;
  name: string;
  state: string;
  county: string;
  milesFromAllegheny: number;
  downtownName: string;
  center: { lat: number; lng: number };
  radiusM: number;
  tags: string[];
};

type Props = {
  id: string;
  initialDowntown: DowntownInfo;
  initialMetrics: DowntownMetrics;
  initialProfile: DowntownProfile;
  peers: UsPeer[];
  mapUrl: string;
};

function MixBars({ mix }: { mix: BusinessMix }) {
  const entries: [string, number][] = [
    ["Food", mix.food],
    ["Retail", mix.retail],
    ["Services", mix.services],
    ["Civic", mix.civic],
    ["Office", mix.office],
    ["Other", mix.other],
  ];
  return (
    <div className="space-y-2">
      {entries.map(([label, pct]) => (
        <div key={label} className="grid grid-cols-[5.5rem_1fr_2.25rem] items-center gap-2 text-xs">
          <span style={{ color: "var(--dt-muted)" }}>{label}</span>
          <div className="downtown-bar">
            <span style={{ width: `${pct}%` }} />
          </div>
          <span className="downtown-stat text-right">{pct}%</span>
        </div>
      ))}
    </div>
  );
}

const CAT_FILTERS = ["all", "food", "retail", "services", "civic", "office", "other"] as const;

export function DowntownDetail({
  id,
  initialDowntown,
  initialMetrics,
  initialProfile,
  peers,
  mapUrl,
}: Props) {
  const [metrics, setMetrics] = useState(initialMetrics);
  const [profile, setProfile] = useState(initialProfile);
  const [refreshing, setRefreshing] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [bizQ, setBizQ] = useState("");
  const [cat, setCat] = useState<(typeof CAT_FILTERS)[number]>("all");

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setRefreshing(true);
      try {
        const res = await fetch(`/api/downtowns/${id}?refresh=1`);
        if (!res.ok) throw new Error("Refresh failed");
        const data = await res.json();
        if (!cancelled) {
          setMetrics(data.metrics);
          if (data.profile) setProfile(data.profile);
        }
      } catch {
        if (!cancelled) setError("Live OSM refresh unavailable — showing baseline directory.");
      } finally {
        if (!cancelled) setRefreshing(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id]);

  const businesses: SamplePoi[] = useMemo(() => {
    if (metrics.samplePois && metrics.samplePois.length > 0) return metrics.samplePois;
    return profile.sampleBusinesses.map((b) => ({
      name: b.name,
      category: b.category,
      street: b.street,
      note: b.note,
      status: b.status ?? "open",
    }));
  }, [metrics.samplePois, profile.sampleBusinesses]);

  const filteredBiz = useMemo(() => {
    let list = businesses;
    if (cat !== "all") list = list.filter((b) => b.category === cat);
    const q = bizQ.trim().toLowerCase();
    if (q) {
      list = list.filter((b) =>
        [b.name, b.street, b.cuisine, b.brand, b.note, b.category]
          .filter(Boolean)
          .join(" ")
          .toLowerCase()
          .includes(q)
      );
    }
    return list;
  }, [businesses, cat, bizQ]);

  const radiusMi = Math.round((initialDowntown.radiusM / 1609.34) * 100) / 100;

  return (
    <div className="downtown-shell space-y-6">
      <DowntownSubnav active="intel" />
      <div className="text-sm" style={{ color: "var(--dt-muted)" }}>
        <Link href="/downtown" className="underline decoration-[var(--dt-line)] underline-offset-2">
          ← All downtowns
        </Link>
      </div>

      <header className="space-y-3 border-b border-[var(--dt-line)] pb-5">
        <div className="flex flex-wrap items-center gap-2">
          <span className="downtown-chip" data-active="true">
            {metrics.dataSource === "osm" ? "OSM live" : "Baseline directory"}
          </span>
          {refreshing && <span className="downtown-chip">Refreshing map data…</span>}
          {initialDowntown.tags.map((t) => (
            <span key={t} className="downtown-chip">
              {t.replace(/_/g, " ")}
            </span>
          ))}
        </div>
        <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
          {initialDowntown.name}, {initialDowntown.state}
        </h1>
        <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
          Isolating{" "}
          <strong style={{ color: "var(--dt-fg)" }}>{initialDowntown.downtownName}</strong>
          {" · "}
          {initialDowntown.county} County · {initialDowntown.milesFromAllegheny} mi from Allegheny
          {" · "}~{radiusMi} mi core radius
          {" · "}
          <a href={mapUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2">
            OpenStreetMap
          </a>
        </p>
        {error && (
          <p className="text-xs" style={{ color: "var(--dt-warn)" }}>
            {error}
          </p>
        )}
      </header>

      <div className="downtown-panel p-5">
        <h2 className="text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-accent)" }}>
          CBD isolation
        </h2>
        <p className="mt-2 max-w-3xl text-sm leading-relaxed">{profile.isolationBrief}</p>
        <div className="mt-4 grid gap-4 md:grid-cols-3">
          <div>
            <div className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
              Primary corridors
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {profile.primaryCorridors.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
              Landmarks / anchors
            </div>
            <ul className="mt-2 space-y-1 text-sm">
              {profile.landmarks.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
              Market notes
            </div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--dt-muted)" }}>
              {profile.marketNotes}
            </p>
          </div>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-3">
        <div className="downtown-panel p-4">
          <div className="text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-muted)" }}>
            Vibrancy
          </div>
          <div className="downtown-stat mt-2 text-3xl" style={{ color: "var(--dt-good)" }}>
            {metrics.vibrancy}
          </div>
          <div className="downtown-bar mt-3">
            <span style={{ width: `${metrics.vibrancy}%` }} />
          </div>
        </div>
        <div className="downtown-panel p-4">
          <div className="text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-muted)" }}>
            Vacancy estimate
          </div>
          <div className="downtown-stat mt-2 text-3xl" style={{ color: "var(--dt-warn)" }}>
            {metrics.vacancyEstimate}%
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--dt-muted)" }}>
            Estimate from density / mix — not a lease survey.
          </p>
        </div>
        <div className="downtown-panel p-4">
          <div className="text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-muted)" }}>
            Directory listings
          </div>
          <div className="downtown-stat mt-2 text-3xl">{businesses.length}</div>
          <p className="mt-2 text-xs" style={{ color: "var(--dt-muted)" }}>
            Named businesses in this CBD snapshot
          </p>
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="downtown-panel p-4">
          <h2 className="mb-3 text-sm font-medium">Business type mix</h2>
          <MixBars mix={metrics.mix} />
        </div>
        <div className="downtown-panel p-4">
          <h2 className="mb-3 text-sm font-medium">Compared to US peer downtowns</h2>
          <ul className="space-y-2 text-sm">
            {peers.map((p) => (
              <li
                key={p.id}
                className="flex justify-between border-b border-[var(--dt-line)] pb-2 last:border-0"
              >
                <span>
                  {p.name}, {p.state}
                  <span className="block text-xs" style={{ color: "var(--dt-muted)" }}>
                    Δ vibrancy {metrics.vibrancy - p.vibrancy >= 0 ? "+" : ""}
                    {metrics.vibrancy - p.vibrancy} · Δ vacancy{" "}
                    {(metrics.vacancyEstimate - p.vacancyEstimate).toFixed(1)} pts
                  </span>
                </span>
                <span className="downtown-stat text-xs">
                  V {p.vibrancy} · {p.vacancyEstimate}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="downtown-panel overflow-hidden">
        <div className="border-b border-[var(--dt-line)] p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium">Business directory</h2>
              <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                Names, streets, and notes for this isolation
                {metrics.dataSource === "osm" ? " (OpenStreetMap enriched)" : " (baseline sample)"}
              </p>
            </div>
            <input
              className="downtown-input max-w-xs"
              placeholder="Filter businesses…"
              value={bizQ}
              onChange={(e) => setBizQ(e.target.value)}
            />
          </div>
          <div className="mt-3 flex flex-wrap gap-2">
            {CAT_FILTERS.map((c) => (
              <button
                key={c}
                type="button"
                className="downtown-chip"
                data-active={cat === c}
                onClick={() => setCat(c)}
              >
                {c}
              </button>
            ))}
          </div>
        </div>
        <ul className="divide-y divide-[var(--dt-line)]">
          {filteredBiz.map((p, i) => (
            <li key={`${p.name}-${i}`} className="px-4 py-3">
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <div className="font-medium">{p.name}</div>
                  <div className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs" style={{ color: "var(--dt-muted)" }}>
                    <span className="uppercase tracking-wide">{p.category}</span>
                    {p.street && <span>{p.street}</span>}
                    {p.cuisine && <span>Cuisine: {p.cuisine}</span>}
                    {p.brand && <span>Brand: {p.brand}</span>}
                    {p.hours && <span>{p.hours}</span>}
                    {p.phone && <span>{p.phone}</span>}
                  </div>
                  {p.note && (
                    <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--dt-muted)" }}>
                      {p.note}
                    </p>
                  )}
                  {p.website && (
                    <a
                      href={p.website.startsWith("http") ? p.website : `https://${p.website}`}
                      target="_blank"
                      rel="noreferrer"
                      className="mt-1 inline-block text-xs underline underline-offset-2"
                    >
                      Website
                    </a>
                  )}
                </div>
                <span
                  className="downtown-chip shrink-0"
                  data-active={p.status === "reported_vacant"}
                >
                  {p.status === "reported_vacant" ? "Vacant / watch" : "Active"}
                </span>
              </div>
            </li>
          ))}
          {filteredBiz.length === 0 && (
            <li className="px-4 py-8 text-sm" style={{ color: "var(--dt-muted)" }}>
              No businesses match this filter.
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
