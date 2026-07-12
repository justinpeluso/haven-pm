"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import {
  Landmark,
  MapPin,
  ChevronRight,
  Search,
  X,
  Building2,
  Calendar,
} from "lucide-react";
import { DowntownSubnav } from "./downtown-subnav";
import {
  historicalPropertyCorridor,
  historicalPropertyTown,
  type HistoricalProperty,
} from "@/lib/downtown/historical-properties";

const PLACEHOLDER = "/downtown-placeholder.svg";

function SafeImg({
  src,
  fallbackSrc,
  alt,
  className,
}: {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
}) {
  const chain = [src, fallbackSrc, PLACEHOLDER].filter(
    (u, i, arr): u is string => Boolean(u) && arr.indexOf(u) === i
  );
  const [idx, setIdx] = useState(0);
  const current = chain[Math.min(idx, chain.length - 1)] || PLACEHOLDER;
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (idx < chain.length - 1) setIdx((i) => i + 1);
      }}
    />
  );
}

type Props = {
  properties: HistoricalProperty[];
  generatedAt: string;
};

export function DowntownHistoricalList({ properties, generatedAt }: Props) {
  const [q, setQ] = useState("");
  const [town, setTown] = useState<string>("ALL");
  const [corridor, setCorridor] = useState<string>("ALL");
  const [, startTransition] = useTransition();
  const deferredQ = useDeferredValue(q);

  const towns = useMemo(() => {
    const set = new Set(properties.map((p) => historicalPropertyTown(p)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [properties]);

  const corridors = useMemo(() => {
    const set = new Set(properties.map((p) => historicalPropertyCorridor(p)));
    return Array.from(set).sort((a, b) => a.localeCompare(b));
  }, [properties]);

  const filtered = useMemo(() => {
    let list = properties;
    if (town !== "ALL") {
      list = list.filter((p) => historicalPropertyTown(p) === town);
    }
    if (corridor !== "ALL") {
      list = list.filter((p) => historicalPropertyCorridor(p) === corridor);
    }
    const query = deferredQ.trim().toLowerCase();
    if (query) {
      list = list.filter((p) =>
        [
          p.name,
          p.subtitle,
          p.address.street,
          p.address.city,
          p.address.borough,
          p.address.county,
          historicalPropertyTown(p),
          historicalPropertyCorridor(p),
          p.parcelIdentity.cbdCorridor,
          p.structureHistory.buildEra,
          p.structureHistory.currentUse,
          p.historicDistrict.name,
          ...p.tags,
        ]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }
    return list;
  }, [properties, town, corridor, deferredQ]);

  const when = generatedAt
    ? new Date(generatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

  function resetAndFilter(fn: () => void) {
    startTransition(fn);
  }

  return (
    <div className="downtown-shell space-y-6">
      <DowntownSubnav active="historical" />

      <header className="space-y-3 border-b border-[var(--dt-line)] pb-5">
        <p
          className="text-[0.7rem] uppercase tracking-[0.18em]"
          style={{ color: "var(--dt-accent)" }}
        >
          Historical Properties
        </p>
        <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
          Deep dossiers for CBD addresses
        </h1>
        <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--dt-muted)" }}>
          Prefetched public-source dossiers covering structure, plat history,
          Indigenous and fort context, historic-district status, and source citations
          along Beaver&apos;s Third Street spine and nearby civic landmarks.
          {when ? ` Cache ${when}.` : null}
        </p>
      </header>

      <div className="downtown-search-wrap">
        <Search className="downtown-search-icon h-4 w-4" />
        <input
          className="downtown-input"
          placeholder="Search dossiers — address, era, tag, district…"
          value={q}
          onChange={(e) => {
            const value = e.target.value;
            resetAndFilter(() => setQ(value));
          }}
        />
        {q && (
          <div className="downtown-search-actions">
            <button
              type="button"
              className="downtown-chip"
              onClick={() => resetAndFilter(() => setQ(""))}
              aria-label="Clear search"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
          Showing{" "}
          <span className="downtown-stat text-[var(--dt-fg)]">
            {filtered.length}
          </span>{" "}
          of{" "}
          <span className="downtown-stat text-[var(--dt-fg)]">
            {properties.length}
          </span>{" "}
          {properties.length === 1 ? "dossier" : "dossiers"}
        </p>
        {towns.length > 1 && (
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              className="downtown-chip"
              data-active={town === "ALL"}
              onClick={() => resetAndFilter(() => setTown("ALL"))}
            >
              All towns
            </button>
            {towns.map((t) => (
              <button
                key={t}
                type="button"
                className="downtown-chip"
                data-active={town === t}
                onClick={() => resetAndFilter(() => setTown(t))}
              >
                {t}
              </button>
            ))}
          </div>
        )}
        {corridors.length > 1 && (
          <div className="flex flex-wrap gap-2.5">
            <button
              type="button"
              className="downtown-chip"
              data-active={corridor === "ALL"}
              onClick={() => resetAndFilter(() => setCorridor("ALL"))}
            >
              All corridors
            </button>
            {corridors.map((c) => (
              <button
                key={c}
                type="button"
                className="downtown-chip"
                data-active={corridor === c}
                onClick={() => resetAndFilter(() => setCorridor(c))}
              >
                {c}
              </button>
            ))}
          </div>
        )}
      </div>

      {filtered.length === 0 ? (
        <div
          className="downtown-panel p-8 text-center text-sm"
          style={{ color: "var(--dt-muted)" }}
        >
          No dossiers match that search. Try a street name, era, or clear filters.
        </div>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
          {filtered.map((p) => {
            const townLabel = historicalPropertyTown(p);
            const corridorLabel = historicalPropertyCorridor(p);
            return (
              <article
                key={p.id}
                className="downtown-panel group flex flex-col overflow-hidden"
              >
                <Link
                  href={`/downtown/historical-properties/${p.id}`}
                  className="relative aspect-[16/10] block bg-black/40"
                >
                  <SafeImg
                    src={p.heroImage?.thumbUrl}
                    fallbackSrc={p.heroImage?.url}
                    alt={p.heroImage?.title || p.name}
                    className="h-full w-full object-cover transition-opacity group-hover:opacity-90"
                  />
                  <span
                    className="absolute bottom-2 left-2 downtown-chip"
                    style={{ background: "rgba(14,20,25,0.85)" }}
                  >
                    <Landmark className="h-3 w-3" />
                    {corridorLabel}
                  </span>
                  <span
                    className="absolute bottom-2 right-2 downtown-chip"
                    style={{ background: "rgba(14,20,25,0.85)" }}
                  >
                    {townLabel}
                  </span>
                </Link>
                <div className="flex flex-1 flex-col space-y-3 p-4">
                  <div className="space-y-1.5">
                    <Link
                      href={`/downtown/historical-properties/${p.id}`}
                      className="font-serif text-xl tracking-tight hover:underline"
                      style={{ color: "var(--dt-fg)" }}
                    >
                      {p.name}
                    </Link>
                    <p
                      className="line-clamp-3 text-xs leading-relaxed"
                      style={{ color: "var(--dt-muted)" }}
                    >
                      {p.subtitle}
                    </p>
                  </div>
                  <p
                    className="flex items-start gap-1.5 text-xs"
                    style={{ color: "var(--dt-muted)" }}
                  >
                    <MapPin
                      className="mt-0.5 h-3.5 w-3.5 shrink-0"
                      style={{ color: "var(--dt-accent)" }}
                    />
                    {p.address.street}, {p.address.city}, {p.address.state}{" "}
                    {p.address.zip}
                  </p>
                  <div
                    className="grid grid-cols-2 gap-2 border border-[var(--dt-line)] p-2.5 text-xs"
                    style={{ background: "rgba(0,0,0,0.2)" }}
                  >
                    <div className="flex items-start gap-1.5">
                      <Calendar
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        style={{ color: "var(--dt-accent)" }}
                      />
                      <div>
                        <p
                          className="text-[0.6rem] uppercase tracking-[0.1em]"
                          style={{ color: "var(--dt-muted)" }}
                        >
                          Era
                        </p>
                        <p className="line-clamp-2 leading-snug">
                          {p.structureHistory.buildEra}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-1.5">
                      <Building2
                        className="mt-0.5 h-3.5 w-3.5 shrink-0"
                        style={{ color: "var(--dt-accent)" }}
                      />
                      <div>
                        <p
                          className="text-[0.6rem] uppercase tracking-[0.1em]"
                          style={{ color: "var(--dt-muted)" }}
                        >
                          Use
                        </p>
                        <p className="line-clamp-2 leading-snug">
                          {p.structureHistory.currentUse}
                        </p>
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-1.5">
                    {p.tags.slice(0, 3).map((t) => (
                      <span key={t} className="downtown-chip">
                        {t}
                      </span>
                    ))}
                  </div>
                  <div className="mt-auto pt-1">
                    <Link
                      href={`/downtown/historical-properties/${p.id}`}
                      className="downtown-chip inline-flex"
                      data-active="true"
                    >
                      Open dossier
                      <ChevronRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </article>
            );
          })}
        </div>
      )}
    </div>
  );
}
