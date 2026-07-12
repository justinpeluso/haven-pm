"use client";

import { useDeferredValue, useEffect, useMemo, useRef, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import Fuse from "fuse.js";
import { Search, X } from "lucide-react";
import type { BusinessMix } from "@/lib/downtown/types";
import { DowntownSubnav } from "./downtown-subnav";

export type DowntownListItem = {
  id: string;
  name: string;
  state: "PA" | "OH";
  county: string;
  milesFromAllegheny: number;
  downtownName: string;
  tags: string[];
  vibrancy: number;
  vacancyEstimate: number;
  mix: BusinessMix;
  poiCount: number;
};

type ComparePayload = {
  regionalVibrancy: number;
  peerAvgVibrancy: number;
  vibrancyDelta: number;
  regionalVacancy: number;
  peerAvgVacancy: number;
  vacancyDelta: number;
  peers: {
    id: string;
    name: string;
    state: string;
    vibrancy: number;
    vacancyEstimate: number;
    note: string;
  }[];
};

type Props = {
  initial: DowntownListItem[];
  stats: {
    count: number;
    avgVibrancy: number;
    medianVacancy: number;
    pa: number;
    oh: number;
  };
  compare: ComparePayload;
};

const TAGS = [
  "main_street",
  "river_town",
  "suburb",
  "industrial",
  "college",
  "city",
  "county_seat",
];

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

function highlight(text: string, q: string) {
  if (!q.trim()) return text;
  const idx = text.toLowerCase().indexOf(q.trim().toLowerCase());
  if (idx < 0) return text;
  return (
    <>
      {text.slice(0, idx)}
      <mark className="rounded-sm bg-[rgba(196,163,90,0.35)] text-inherit px-0.5">
        {text.slice(idx, idx + q.trim().length)}
      </mark>
      {text.slice(idx + q.trim().length)}
    </>
  );
}

export function DowntownHub({ initial, stats, compare }: Props) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [q, setQ] = useState("");
  const [state, setState] = useState<"ALL" | "PA" | "OH">("ALL");
  const [maxMiles, setMaxMiles] = useState<number | null>(40);
  const [tag, setTag] = useState<string | null>(null);
  const [sort, setSort] = useState<"miles" | "vibrancy" | "vacancy" | "name" | "relevance">(
    "miles"
  );
  const [activeIndex, setActiveIndex] = useState(0);
  const [, startTransition] = useTransition();
  const deferredQ = useDeferredValue(q);

  const fuse = useMemo(
    () =>
      new Fuse(initial, {
        keys: [
          { name: "name", weight: 0.4 },
          { name: "downtownName", weight: 0.28 },
          { name: "county", weight: 0.15 },
          { name: "tags", weight: 0.12 },
          { name: "state", weight: 0.05 },
        ],
        threshold: 0.32,
        ignoreLocation: true,
        includeScore: true,
      }),
    [initial]
  );

  const filtered = useMemo(() => {
    let list = initial;
    if (state !== "ALL") list = list.filter((d) => d.state === state);
    if (maxMiles != null) list = list.filter((d) => d.milesFromAllegheny <= maxMiles);
    if (tag) list = list.filter((d) => d.tags.includes(tag));

    const query = deferredQ.trim();
    if (query) {
      const poolIds = new Set(list.map((d) => d.id));
      const hits = fuse.search(query).filter((h) => poolIds.has(h.item.id));
      list = hits.map((h) => h.item);
      if (sort === "relevance" || sort === "miles") {
        return list;
      }
    }

    const sorted = [...list];
    if (sort === "vibrancy") sorted.sort((a, b) => b.vibrancy - a.vibrancy);
    else if (sort === "vacancy") sorted.sort((a, b) => a.vacancyEstimate - b.vacancyEstimate);
    else if (sort === "name") sorted.sort((a, b) => a.name.localeCompare(b.name));
    else sorted.sort((a, b) => a.milesFromAllegheny - b.milesFromAllegheny);
    return sorted;
  }, [initial, state, maxMiles, tag, deferredQ, sort, fuse]);

  useEffect(() => {
    setActiveIndex(0);
  }, [deferredQ, state, tag, maxMiles]);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const avgMix = useMemo(() => {
    const n = Math.max(1, filtered.length);
    const sum = filtered.reduce(
      (acc, d) => {
        acc.food += d.mix.food;
        acc.retail += d.mix.retail;
        acc.services += d.mix.services;
        acc.civic += d.mix.civic;
        acc.office += d.mix.office;
        acc.other += d.mix.other;
        return acc;
      },
      { food: 0, retail: 0, services: 0, civic: 0, office: 0, other: 0 }
    );
    return {
      food: Math.round(sum.food / n),
      retail: Math.round(sum.retail / n),
      services: Math.round(sum.services / n),
      civic: Math.round(sum.civic / n),
      office: Math.round(sum.office / n),
      other: Math.round(sum.other / n),
    };
  }, [filtered]);

  const suggestions = useMemo(() => {
    if (!q.trim() || q.trim().length < 2) return [];
    return filtered.slice(0, 6);
  }, [q, filtered]);

  return (
    <div className="downtown-shell space-y-6">
      <DowntownSubnav active="intel" />

      <header className="space-y-3 border-b border-[var(--dt-line)] pb-5">
        <p
          className="text-[0.7rem] uppercase tracking-[0.18em]"
          style={{ color: "var(--dt-accent)" }}
        >
          Downtown Properties · Market Intelligence
        </p>
        <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
          Downtowns within 40 miles of Allegheny County
        </h1>
        <p className="max-w-2xl text-sm" style={{ color: "var(--dt-muted)" }}>
          {stats.count} central business districts across western PA and nearby Ohio.
          Search is fuzzy across town, CBD name, county, and tags — try “Beaver” or “Third Street”.
        </p>
        <div className="downtown-hub-legend max-w-3xl pt-1">
          <span>
            <strong>Market intel</strong> — CBD isolation, demographics, mix &amp; directory
          </span>
          <span>
            <strong>News</strong> — local CBD coverage
          </span>
          <span>
            <strong>Gallery</strong> — street &amp; storefront photos
          </span>
          <span>
            <strong>Historical Properties</strong> — building dossiers
          </span>
        </div>
      </header>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Tracked downtowns", value: String(stats.count) },
          { label: "Avg vibrancy", value: `${stats.avgVibrancy}` },
          { label: "Median vacancy est.", value: `${stats.medianVacancy}%` },
          { label: "PA / OH split", value: `${stats.pa} / ${stats.oh}` },
        ].map((s) => (
          <div key={s.label} className="downtown-panel p-4">
            <div className="text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-muted)" }}>
              {s.label}
            </div>
            <div className="downtown-stat mt-2 text-2xl font-medium">{s.value}</div>
          </div>
        ))}
      </div>

      <div className="relative">
        <div className="downtown-search-wrap">
          <Search className="downtown-search-icon h-4 w-4" />
          <input
            ref={inputRef}
            className="downtown-input"
            placeholder="Search downtowns…  ⌘K"
            value={q}
            onChange={(e) => {
              const v = e.target.value;
              startTransition(() => setQ(v));
              if (v.trim() && sort === "miles") setSort("relevance");
            }}
            onKeyDown={(e) => {
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setActiveIndex((i) => Math.min(i + 1, Math.max(0, filtered.length - 1)));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setActiveIndex((i) => Math.max(0, i - 1));
              } else if (e.key === "Enter" && filtered[activeIndex]) {
                e.preventDefault();
                router.push(`/downtown/${filtered[activeIndex]!.id}`);
              } else if (e.key === "Escape") {
                setQ("");
                inputRef.current?.blur();
              }
            }}
          />
          <div className="downtown-search-actions">
            {q && (
              <button
                type="button"
                className="downtown-chip"
                onClick={() => setQ("")}
                aria-label="Clear search"
              >
                <X className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
        </div>
        {suggestions.length > 0 && q.trim().length >= 2 && (
          <div className="downtown-panel absolute z-20 mt-2 w-full overflow-hidden shadow-lg">
            {suggestions.map((d, i) => (
              <button
                key={d.id}
                type="button"
                className="downtown-search-suggest"
                style={{
                  background: i === activeIndex ? "rgba(196,163,90,0.08)" : undefined,
                }}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => router.push(`/downtown/${d.id}`)}
              >
                <span className="min-w-0 space-y-1">
                  <span className="block font-medium leading-snug">{highlight(d.name, q)}</span>
                  <span className="block text-xs leading-relaxed" style={{ color: "var(--dt-muted)" }}>
                    {highlight(d.downtownName, q)} · {d.county} County, {d.state}
                  </span>
                </span>
                <span className="downtown-stat shrink-0 pt-0.5 text-xs" style={{ color: "var(--dt-muted)" }}>
                  {d.milesFromAllegheny} mi
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
          Showing <span className="downtown-stat text-[var(--dt-fg)]">{filtered.length}</span> of{" "}
          {stats.count}
        </p>
        <div className="flex flex-wrap items-center gap-2.5">
          {(["ALL", "PA", "OH"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className="downtown-chip"
              data-active={state === s}
              onClick={() => setState(s)}
            >
              {s === "ALL" ? "All states" : s}
            </button>
          ))}
          {[20, 30, 40].map((m) => (
            <button
              key={m}
              type="button"
              className="downtown-chip"
              data-active={maxMiles === m}
              onClick={() => setMaxMiles(m)}
            >
              ≤ {m} mi
            </button>
          ))}
          {TAGS.map((t) => (
            <button
              key={t}
              type="button"
              className="downtown-chip"
              data-active={tag === t}
              onClick={() => setTag(tag === t ? null : t)}
            >
              {t.replace(/_/g, " ")}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.2fr_1fr]">
        <div className="downtown-panel p-4">
          <div className="mb-3 flex items-end justify-between gap-3">
            <div>
              <h2 className="text-sm font-medium tracking-wide">Business mix (filtered set)</h2>
              <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                Category share across {filtered.length} downtowns
              </p>
            </div>
            <select
              className="downtown-chip bg-transparent"
              value={sort}
              onChange={(e) => setSort(e.target.value as typeof sort)}
            >
              <option value="relevance">Sort: relevance</option>
              <option value="miles">Sort: distance</option>
              <option value="vibrancy">Sort: vibrancy</option>
              <option value="vacancy">Sort: vacancy</option>
              <option value="name">Sort: name</option>
            </select>
          </div>
          <MixBars mix={avgMix} />
        </div>

        <div className="downtown-panel p-4">
          <h2 className="text-sm font-medium tracking-wide">vs US peer downtowns</h2>
          <p className="mb-3 text-xs" style={{ color: "var(--dt-muted)" }}>
            Regional avg vibrancy {compare.regionalVibrancy} (
            {compare.vibrancyDelta >= 0 ? "+" : ""}
            {compare.vibrancyDelta} vs peers) · vacancy {compare.regionalVacancy}% (
            {compare.vacancyDelta >= 0 ? "+" : ""}
            {compare.vacancyDelta} pts)
          </p>
          <ul className="space-y-2 text-sm">
            {compare.peers.slice(0, 6).map((p) => (
              <li
                key={p.id}
                className="flex items-center justify-between border-b border-[var(--dt-line)] pb-2 last:border-0"
              >
                <span>
                  {p.name}, {p.state}
                  <span className="ml-2 text-xs" style={{ color: "var(--dt-muted)" }}>
                    {p.note}
                  </span>
                </span>
                <span className="downtown-stat text-xs">
                  V {p.vibrancy} · Vac {p.vacancyEstimate}%
                </span>
              </li>
            ))}
          </ul>
        </div>
      </div>

      <div className="downtown-panel overflow-hidden">
        <div
          className="grid grid-cols-[1.4fr_0.7fr_0.5fr_0.5fr_0.5fr] gap-3 border-b border-[var(--dt-line)] px-4 py-3 text-[0.65rem] uppercase tracking-[0.12em]"
          style={{ color: "var(--dt-muted)" }}
        >
          <span>Downtown</span>
          <span>County</span>
          <span>Mi</span>
          <span>Vibrancy</span>
          <span>Vacancy est.</span>
        </div>
        <div className="max-h-[32rem] overflow-y-auto">
          {filtered.map((d, i) => (
            <Link
              key={d.id}
              href={`/downtown/${d.id}`}
              className="downtown-result-row"
              style={{
                background: i === activeIndex && q ? "rgba(196,163,90,0.06)" : undefined,
              }}
            >
              <span className="min-w-0 space-y-1">
                <span className="block font-medium leading-snug">{highlight(d.name, deferredQ)}</span>
                <span className="block text-xs leading-relaxed" style={{ color: "var(--dt-muted)" }}>
                  {highlight(d.downtownName, deferredQ)} · {d.state}
                </span>
              </span>
              <span className="self-center" style={{ color: "var(--dt-muted)" }}>{d.county}</span>
              <span className="downtown-stat self-center">{d.milesFromAllegheny}</span>
              <span className="downtown-stat self-center" style={{ color: "var(--dt-good)" }}>
                {d.vibrancy}
              </span>
              <span className="downtown-stat self-center" style={{ color: "var(--dt-warn)" }}>
                {d.vacancyEstimate}%
              </span>
            </Link>
          ))}
          {filtered.length === 0 && (
            <p className="px-4 py-10 text-sm" style={{ color: "var(--dt-muted)" }}>
              No downtowns match — try a shorter query or clear filters.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
