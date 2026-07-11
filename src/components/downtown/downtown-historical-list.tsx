"use client";

import { useState } from "react";
import Link from "next/link";
import { Landmark, MapPin, ChevronRight } from "lucide-react";
import { DowntownSubnav } from "./downtown-subnav";
import type { HistoricalProperty } from "@/lib/downtown/historical-properties";

const PLACEHOLDER = "/downtown-placeholder.svg";

function SafeImg({
  src,
  alt,
  className,
}: {
  src: string;
  alt: string;
  className?: string;
}) {
  const [current, setCurrent] = useState(src || PLACEHOLDER);
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
        if (current !== PLACEHOLDER) setCurrent(PLACEHOLDER);
      }}
    />
  );
}

type Props = {
  properties: HistoricalProperty[];
  generatedAt: string;
};

export function DowntownHistoricalList({ properties, generatedAt }: Props) {
  const when = generatedAt
    ? new Date(generatedAt).toLocaleDateString(undefined, {
        year: "numeric",
        month: "short",
        day: "numeric",
      })
    : null;

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
        <p className="max-w-2xl text-sm" style={{ color: "var(--dt-muted)" }}>
          Prefetched public-source histories — structure, plat, Indigenous and fort
          context, historic district, and citations. Starting with Beaver&apos;s Third
          Street spine.
          {when ? ` Cache ${when}.` : null}
        </p>
      </header>

      <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
        <span className="downtown-stat text-[var(--dt-fg)]">{properties.length}</span>{" "}
        {properties.length === 1 ? "property" : "properties"}
      </p>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {properties.map((p) => (
          <article key={p.id} className="downtown-panel overflow-hidden">
            <div className="relative aspect-[16/10] bg-black/40">
              <SafeImg
                src={p.heroImage?.thumbUrl || p.heroImage?.url || PLACEHOLDER}
                alt={p.heroImage?.title || p.name}
                className="h-full w-full object-cover"
              />
              <span
                className="absolute bottom-2 left-2 downtown-chip"
                style={{ background: "rgba(14,20,25,0.85)" }}
              >
                <Landmark className="h-3 w-3" />
                Dossier
              </span>
            </div>
            <div className="space-y-3 p-4">
              <div>
                <Link
                  href={`/downtown/historical-properties/${p.id}`}
                  className="font-medium hover:underline"
                >
                  {p.name}
                </Link>
                <p
                  className="mt-1.5 text-xs leading-relaxed"
                  style={{ color: "var(--dt-muted)" }}
                >
                  {p.subtitle}
                </p>
              </div>
              <p
                className="flex items-start gap-1.5 text-xs"
                style={{ color: "var(--dt-muted)" }}
              >
                <MapPin className="mt-0.5 h-3.5 w-3.5 shrink-0" style={{ color: "var(--dt-accent)" }} />
                {p.address.street}, {p.address.city}, {p.address.state} {p.address.zip}
              </p>
              <div className="flex flex-wrap gap-1.5">
                {p.tags.slice(0, 4).map((t) => (
                  <span key={t} className="downtown-chip">
                    {t}
                  </span>
                ))}
              </div>
              <Link
                href={`/downtown/historical-properties/${p.id}`}
                className="downtown-chip inline-flex"
                data-active="true"
              >
                Open dossier
                <ChevronRight className="h-3.5 w-3.5" />
              </Link>
            </div>
          </article>
        ))}
      </div>
    </div>
  );
}
