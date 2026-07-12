"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import type {
  BusinessMix,
  DowntownMetrics,
  SamplePoi,
  UsPeer,
} from "@/lib/downtown/types";
import type { DowntownProfile } from "@/lib/downtown/profiles";
import type { DowntownYoutube } from "@/lib/downtown/youtube";
import type { DowntownDocument } from "@/lib/downtown/documents";
import { DowntownSubnav } from "./downtown-subnav";
import { DowntownSafeImg } from "./downtown-safe-img";

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
  youtube?: DowntownYoutube | null;
  documents?: DowntownDocument[];
};

const DOC_KIND_LABEL: Record<DowntownDocument["kind"], string> = {
  founding: "Founding",
  courthouse: "Courthouse",
  plat_map: "Plat map",
  sanborn: "Sanborn",
  plan: "Plan",
  other: "Scan",
};

const HISTORY_PREVIEW_CHARS = 520;

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

function SectionLabel({ children }: { children: ReactNode }) {
  return <h2 className="downtown-section-label">{children}</h2>;
}

function ExpandableText({
  text,
  limit = HISTORY_PREVIEW_CHARS,
  className = "",
}: {
  text: string;
  limit?: number;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const needsTruncation = text.length > limit;
  const shown =
    !needsTruncation || open
      ? text
      : `${text.slice(0, limit).replace(/\s+\S*$/, "").trimEnd()}…`;

  return (
    <div className={className}>
      <p className="downtown-prose whitespace-pre-line">{shown}</p>
      {needsTruncation && (
        <button
          type="button"
          className="downtown-read-more mt-2"
          onClick={() => setOpen((v) => !v)}
        >
          {open ? "Show less" : "Read more"}
        </button>
      )}
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
  youtube = null,
  documents = [],
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

  const overviewBody = useMemo(() => {
    const overview = (profile.overview || "").trim();
    const isolation = (profile.isolationBrief || "").trim();
    if (!overview) return isolation;
    if (!isolation) return overview;
    if (overview.startsWith(isolation) || overview === isolation) return overview;
    return `${isolation}\n\n${overview}`;
  }, [profile.overview, profile.isolationBrief]);

  const historyText =
    profile.history?.trim() || "History notes will appear after the intel cache is built.";

  return (
    <div className="downtown-shell downtown-detail space-y-8">
      <DowntownSubnav active="intel" />
      <div className="text-sm" style={{ color: "var(--dt-muted)" }}>
        <Link href="/downtown" className="underline decoration-[var(--dt-line)] underline-offset-2">
          ← All downtowns
        </Link>
      </div>

      {/* 1. Hero + CBD isolation / market overview */}
      <header className="space-y-4 border-b border-[var(--dt-line)] pb-6">
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

      <section className="downtown-panel p-5 space-y-5">
        <div>
          <SectionLabel>CBD isolation · market overview</SectionLabel>
          <ExpandableText text={overviewBody} limit={640} className="mt-3 max-w-3xl" />
          {profile.wikiUrl && (
            <a
              href={profile.wikiUrl}
              target="_blank"
              rel="noreferrer"
              className="mt-3 inline-block text-xs underline underline-offset-2"
              style={{ color: "var(--dt-muted)" }}
            >
              Wikipedia{profile.wikiTitle ? ` · ${profile.wikiTitle}` : ""}
            </a>
          )}
        </div>

        {profile.facts?.length > 0 && (
          <div className="flex flex-wrap gap-2">
            {profile.facts.map((f) => (
              <span key={f} className="downtown-chip">
                {f}
              </span>
            ))}
          </div>
        )}

        <div className="grid gap-5 md:grid-cols-3 border-t border-[var(--dt-line)] pt-5">
          <div>
            <div className="downtown-meta-label">Primary corridors</div>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed">
              {profile.primaryCorridors.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="downtown-meta-label">Landmarks / anchors</div>
            <ul className="mt-2 space-y-1 text-sm leading-relaxed">
              {profile.landmarks.map((c) => (
                <li key={c}>· {c}</li>
              ))}
            </ul>
          </div>
          <div>
            <div className="downtown-meta-label">Market notes</div>
            <p className="mt-2 text-sm leading-relaxed" style={{ color: "var(--dt-muted)" }}>
              {profile.marketNotes}
            </p>
          </div>
        </div>
      </section>

      {/* 2. History + demographics */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="downtown-panel p-5">
          <SectionLabel>Town history</SectionLabel>
          <ExpandableText text={historyText} className="mt-3" />
        </div>
        <div className="downtown-panel p-5 space-y-4">
          <SectionLabel>Current demographics</SectionLabel>
          <div className="grid grid-cols-2 gap-px overflow-hidden border border-[var(--dt-line)] bg-[var(--dt-line)] sm:grid-cols-3">
            {[
              {
                label: "Pop. 2023",
                value: profile.demographics?.population2023?.toLocaleString() ?? "—",
              },
              {
                label: "Census 2020",
                value: profile.demographics?.population2020?.toLocaleString() ?? "—",
              },
              {
                label: "Land area",
                value: profile.demographics?.landAreaSqMi
                  ? `${profile.demographics.landAreaSqMi.toFixed(2)} sq mi`
                  : "—",
              },
              {
                label: "Density",
                value: profile.demographics?.densityPerSqMi
                  ? `${Math.round(profile.demographics.densityPerSqMi).toLocaleString()}/sq mi`
                  : "—",
              },
              {
                label: "Founded",
                value: profile.demographics?.foundedYear?.toString() ?? "—",
              },
              {
                label: "Elevation",
                value: profile.demographics?.elevationFt
                  ? `${profile.demographics.elevationFt} ft`
                  : "—",
              },
            ].map((stat) => (
              <div key={stat.label} className="bg-[var(--dt-panel)] px-3 py-2.5">
                <div className="downtown-meta-label">{stat.label}</div>
                <div className="downtown-stat mt-0.5 text-base">{stat.value}</div>
              </div>
            ))}
          </div>
          {profile.demographicsNarrative?.trim() && (
            <ExpandableText
              text={profile.demographicsNarrative}
              limit={360}
              className="text-[var(--dt-muted)]"
            />
          )}
          {profile.demographics?.source && (
            <p className="text-[0.65rem]" style={{ color: "var(--dt-muted)" }}>
              Source: {profile.demographics.source}
              {profile.demographics.placeName ? ` · ${profile.demographics.placeName}` : ""}
            </p>
          )}
        </div>
      </section>

      {/* 3. KPIs */}
      <section className="downtown-panel downtown-kpi-strip">
        <div className="downtown-kpi">
          <div className="downtown-meta-label">Vibrancy</div>
          <div className="downtown-stat mt-1.5 text-2xl" style={{ color: "var(--dt-good)" }}>
            {metrics.vibrancy}
          </div>
          <div className="downtown-bar mt-2.5">
            <span style={{ width: `${metrics.vibrancy}%` }} />
          </div>
        </div>
        <div className="downtown-kpi">
          <div className="downtown-meta-label">Vacancy estimate</div>
          <div className="downtown-stat mt-1.5 text-2xl" style={{ color: "var(--dt-warn)" }}>
            {metrics.vacancyEstimate}%
          </div>
          <p className="mt-2 text-xs" style={{ color: "var(--dt-muted)" }}>
            Density / mix estimate — not a lease survey.
          </p>
        </div>
        <div className="downtown-kpi">
          <div className="downtown-meta-label">Directory listings</div>
          <div className="downtown-stat mt-1.5 text-2xl">{businesses.length}</div>
          <p className="mt-2 text-xs" style={{ color: "var(--dt-muted)" }}>
            Named businesses in this CBD snapshot
          </p>
        </div>
      </section>

      {/* 4. YouTube */}
      <section>
        <SectionLabel>Town history on video</SectionLabel>
        {youtube?.videoId ? (
          <div className="mt-3 space-y-2.5">
            <div className="relative w-full overflow-hidden border border-[var(--dt-line)] bg-black/40 aspect-video">
              <iframe
                title={youtube.title || "Town history video"}
                src={`https://www.youtube-nocookie.com/embed/${youtube.videoId}`}
                className="absolute inset-0 h-full w-full"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                allowFullScreen
                loading="lazy"
                referrerPolicy="strict-origin-when-cross-origin"
              />
            </div>
            <p className="text-sm leading-snug">
              {youtube.title}
              {youtube.channelTitle ? (
                <span style={{ color: "var(--dt-muted)" }}> · {youtube.channelTitle}</span>
              ) : null}
            </p>
          </div>
        ) : (
          <p className="downtown-empty mt-2">No history video curated for this downtown yet.</p>
        )}
      </section>

      {/* 5. Documents & scans */}
      <section>
        <SectionLabel>Documents & scans</SectionLabel>
        {documents.length > 0 ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {documents.map((doc) => (
              <a
                key={`${doc.url}-${doc.title}`}
                href={doc.url}
                target="_blank"
                rel="noopener noreferrer"
                className="group block border border-[var(--dt-line)] transition hover:border-[var(--dt-accent)]"
              >
                <div className="relative aspect-[4/3] overflow-hidden bg-black/35">
                  <DowntownSafeImg
                    src={doc.thumbUrl}
                    alt=""
                    className="h-full w-full object-cover opacity-90 transition group-hover:opacity-100"
                  />
                </div>
                <div className="space-y-2 p-3">
                  <div className="flex flex-wrap items-center gap-1.5">
                    <span className="downtown-chip">
                      {DOC_KIND_LABEL[doc.kind] ?? "Scan"}
                    </span>
                    {doc.year ? <span className="downtown-chip">{doc.year}</span> : null}
                  </div>
                  <div className="text-sm leading-snug line-clamp-2">{doc.title}</div>
                  <div
                    className="text-[0.65rem] uppercase tracking-[0.1em]"
                    style={{ color: "var(--dt-muted)" }}
                  >
                    {doc.source}
                  </div>
                </div>
              </a>
            ))}
          </div>
        ) : (
          <p className="downtown-empty mt-2">
            No founding maps, Sanborns, or plan scans linked for this downtown yet.
          </p>
        )}
      </section>

      {/* 6. Mix / peers / directory */}
      <section className="grid gap-5 lg:grid-cols-2">
        <div className="downtown-panel p-4">
          <SectionLabel>Business type mix</SectionLabel>
          <div className="mt-3">
            <MixBars mix={metrics.mix} />
          </div>
        </div>
        <div className="downtown-panel p-4">
          <SectionLabel>Compared to US peer downtowns</SectionLabel>
          <ul className="mt-3 space-y-2 text-sm">
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
      </section>

      <section className="downtown-panel overflow-hidden">
        <div className="border-b border-[var(--dt-line)] p-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div>
              <SectionLabel>Business directory</SectionLabel>
              <p className="mt-1 text-xs" style={{ color: "var(--dt-muted)" }}>
                Names, streets, and notes for this isolation
                {metrics.dataSource === "osm" ? " (OpenStreetMap enriched)" : " (baseline sample)"}
              </p>
            </div>
            <input
              className="downtown-input downtown-input-compact max-w-xs"
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
                  <div
                    className="mt-1 flex flex-wrap gap-x-3 gap-y-1 text-xs"
                    style={{ color: "var(--dt-muted)" }}
                  >
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
      </section>
    </div>
  );
}
