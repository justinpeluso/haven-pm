"use client";

import { useState, type ReactNode } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Landmark,
  MapPin,
  ExternalLink,
  BookOpen,
  Shield,
  Users,
  Building2,
  ScrollText,
  Clock,
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

function Section({
  eyebrow,
  title,
  icon,
  children,
}: {
  eyebrow: string;
  title: string;
  icon?: ReactNode;
  children: ReactNode;
}) {
  return (
    <section className="downtown-panel space-y-4 p-5 md:p-6">
      <header className="space-y-2 border-b border-[var(--dt-line)] pb-4">
        <p
          className="flex items-center gap-2 text-[0.7rem] uppercase tracking-[0.18em]"
          style={{ color: "var(--dt-accent)" }}
        >
          {icon}
          {eyebrow}
        </p>
        <h2 className="font-serif text-2xl tracking-tight">{title}</h2>
      </header>
      <div className="space-y-3 text-sm leading-relaxed" style={{ color: "var(--dt-fg)" }}>
        {children}
      </div>
    </section>
  );
}

function BulletList({ items }: { items: string[] }) {
  return (
    <ul className="space-y-2 pl-5">
      {items.map((item) => (
        <li key={item.slice(0, 64)} className="list-disc" style={{ color: "var(--dt-muted)" }}>
          <span style={{ color: "var(--dt-fg)" }}>{item}</span>
        </li>
      ))}
    </ul>
  );
}

function MetaGrid({ rows }: { rows: [string, string][] }) {
  return (
    <dl className="grid gap-3 sm:grid-cols-2">
      {rows.map(([k, v]) => (
        <div key={k} className="space-y-1">
          <dt
            className="text-[0.65rem] uppercase tracking-[0.12em]"
            style={{ color: "var(--dt-muted)" }}
          >
            {k}
          </dt>
          <dd>{v}</dd>
        </div>
      ))}
    </dl>
  );
}

function sourceHost(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "Source";
  }
}

type Props = {
  property: HistoricalProperty;
};

export function DowntownHistoricalDossier({ property: p }: Props) {
  const town = historicalPropertyTown(p);
  const corridor = historicalPropertyCorridor(p);

  return (
    <div className="downtown-shell space-y-6">
      <DowntownSubnav active="historical" />

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/downtown/historical-properties" className="downtown-chip">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          All historical properties
        </Link>
        <span className="downtown-chip" data-active="true">
          <Landmark className="h-3 w-3" />
          {town}
        </span>
        <span className="downtown-chip">{corridor}</span>
      </div>

      <header className="space-y-4 border-b border-[var(--dt-line)] pb-6">
        <div className="space-y-3">
          <p
            className="text-[0.7rem] uppercase tracking-[0.18em]"
            style={{ color: "var(--dt-accent)" }}
          >
            Historical dossier
          </p>
          <h1 className="font-serif text-3xl tracking-tight md:text-5xl">{p.name}</h1>
          <p className="max-w-3xl text-sm md:text-base" style={{ color: "var(--dt-muted)" }}>
            {p.subtitle}
          </p>
          <p className="flex flex-wrap items-center gap-2 text-sm" style={{ color: "var(--dt-muted)" }}>
            <MapPin className="h-4 w-4" style={{ color: "var(--dt-accent)" }} />
            {p.address.street}
            {p.address.streetAlt ? ` · ${p.address.streetAlt}` : null}
            {" · "}
            {p.address.borough}, {p.address.county}, {p.address.state} {p.address.zip}
          </p>
        </div>
        <div className="relative aspect-[21/9] max-h-[360px] overflow-hidden border border-[var(--dt-line)] bg-black/40">
          <SafeImg
            src={p.heroImage?.url}
            fallbackSrc={p.heroImage?.thumbUrl}
            alt={p.heroImage?.title || p.name}
            className="h-full w-full object-cover"
          />
          {(p.heroImage?.credit || p.heroImage?.title) && (
            <span
              className="absolute bottom-2 right-2 downtown-chip max-w-[80%] truncate"
              style={{ background: "rgba(14,20,25,0.85)" }}
            >
              {p.heroImage.credit || p.heroImage.title}
            </span>
          )}
        </div>
      </header>

      <div
        className="grid gap-3 border border-[var(--dt-line)] p-4 sm:grid-cols-3"
        style={{ background: "rgba(0,0,0,0.22)" }}
      >
        {[
          ["Build era", p.structureHistory.buildEra],
          ["Original use", p.structureHistory.originalUse],
          ["Current use", p.structureHistory.currentUse],
        ].map(([label, value]) => (
          <div key={label} className="space-y-1">
            <p
              className="text-[0.65rem] uppercase tracking-[0.12em]"
              style={{ color: "var(--dt-muted)" }}
            >
              {label}
            </p>
            <p className="text-sm font-medium">{value}</p>
          </div>
        ))}
      </div>

      {p.images.length > 1 && (
        <section className="space-y-3">
          <p
            className="text-[0.7rem] uppercase tracking-[0.18em]"
            style={{ color: "var(--dt-accent)" }}
          >
            Gallery
          </p>
          <div className="flex gap-2 overflow-x-auto pb-1">
            {p.images.map((img) => (
              <figure
                key={img.url}
                className="relative h-28 w-40 shrink-0 overflow-hidden border border-[var(--dt-line)]"
              >
                <SafeImg
                  src={img.thumbUrl}
                  fallbackSrc={img.url}
                  alt={img.title}
                  className="h-full w-full object-cover"
                />
                <figcaption
                  className="absolute inset-x-0 bottom-0 truncate px-1.5 py-1 text-[0.6rem]"
                  style={{
                    background: "rgba(14,20,25,0.82)",
                    color: "var(--dt-muted)",
                  }}
                >
                  {img.kind || img.credit || "Photo"}
                </figcaption>
              </figure>
            ))}
          </div>
        </section>
      )}

      <Section eyebrow="Identity" title="Address & parcel identity" icon={<Building2 className="h-3.5 w-3.5" />}>
        <p>{p.parcelIdentity.summary}</p>
        <MetaGrid
          rows={[
            ["Municipality", p.parcelIdentity.municipality],
            ["CBD corridor", p.parcelIdentity.cbdCorridor],
            ["Historic district", p.parcelIdentity.historicDistrict],
            ["ZIP", `${p.address.zip} (${p.address.city}, ${p.address.state})`],
          ]}
        />
        {p.address.zipNote && (
          <p
            className="border border-[var(--dt-line)] p-3 text-xs leading-relaxed"
            style={{ color: "var(--dt-warn)", background: "rgba(196,122,61,0.08)" }}
          >
            Address note: {p.address.zipNote}
          </p>
        )}
        {p.parcelIdentity.localHarb && (
          <p style={{ color: "var(--dt-muted)" }}>{p.parcelIdentity.localHarb}</p>
        )}
        {p.parcelIdentity.knownOccupants.length > 0 && (
          <div className="space-y-2">
            <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
              Known occupants (public sources)
            </p>
            <ul className="space-y-2">
              {p.parcelIdentity.knownOccupants.map((o) => (
                <li key={o.name} className="border-l-2 border-[var(--dt-accent)] pl-3">
                  <span className="font-medium">{o.name}</span>
                  <span style={{ color: "var(--dt-muted)" }}>
                    {" "}
                    — {o.role} ({o.era})
                  </span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {p.parcelIdentity.caveats && p.parcelIdentity.caveats.length > 0 && (
          <div className="space-y-2">
            <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
              Caveats
            </p>
            <BulletList items={p.parcelIdentity.caveats} />
          </div>
        )}
      </Section>

      <Section eyebrow="Structure" title="Structure history" icon={<Landmark className="h-3.5 w-3.5" />}>
        <MetaGrid
          rows={[
            ["Build era", p.structureHistory.buildEra],
            ["Original use", p.structureHistory.originalUse],
            ["Current use", p.structureHistory.currentUse],
          ]}
        />
        <p>{p.structureHistory.styleNotes}</p>
        {p.structureHistory.districtFabric && (
          <p style={{ color: "var(--dt-muted)" }}>{p.structureHistory.districtFabric}</p>
        )}
        <div className="space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
            Alterations & treatments
          </p>
          <BulletList items={p.structureHistory.alterations} />
        </div>
      </Section>

      <Section eyebrow="Land" title="Lot, plat & CBD context" icon={<ScrollText className="h-3.5 w-3.5" />}>
        <p>{p.landLotPlat.summary}</p>
        <p>
          Surveyor <span className="downtown-stat">{p.landLotPlat.surveyor}</span> · plat{" "}
          <span className="downtown-stat">{p.landLotPlat.platYear}</span>
        </p>
        <p style={{ color: "var(--dt-muted)" }}>{p.landLotPlat.lotTypes}</p>
        <p>{p.landLotPlat.thirdStreetRole}</p>
        <div className="space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
            Public squares nearby
          </p>
          <BulletList items={p.landLotPlat.publicSquaresNearby} />
        </div>
        <div className="space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
            Third Street CBD evolution
          </p>
          <BulletList items={p.landLotPlat.cbdEvolution} />
        </div>
      </Section>

      <Section eyebrow="Occupancy" title="Early owners & notable occupants" icon={<Users className="h-3.5 w-3.5" />}>
        <p>{p.earlyOwnersOccupants.summary}</p>
        <BulletList items={p.earlyOwnersOccupants.notableContextOccupantsOnCorridor} />
        <div className="space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
            Research gaps
          </p>
          <BulletList items={p.earlyOwnersOccupants.researchGaps} />
        </div>
      </Section>

      <Section eyebrow="Before settlement" title="Indigenous peoples of the confluence" icon={<Users className="h-3.5 w-3.5" />}>
        <p>{p.indigenousPeoples.summary}</p>
        <ul className="space-y-3">
          {p.indigenousPeoples.peoples.map((people) => (
            <li key={people.name} className="border border-[var(--dt-line)] p-3">
              <p className="font-medium" style={{ color: "var(--dt-accent)" }}>
                {people.name}
              </p>
              <p className="mt-1" style={{ color: "var(--dt-muted)" }}>
                {people.notes}
              </p>
            </li>
          ))}
        </ul>
        <BulletList items={p.indigenousPeoples.placesAndNames} />
        {p.indigenousPeoples.ethicalNote && (
          <p
            className="border border-[var(--dt-line)] p-3 text-xs leading-relaxed"
            style={{ color: "var(--dt-muted)" }}
          >
            {p.indigenousPeoples.ethicalNote}
          </p>
        )}
      </Section>

      <Section eyebrow="Frontier" title="Nearby forts & wars" icon={<Shield className="h-3.5 w-3.5" />}>
        <p>{p.fortsAndWars.summary}</p>
        <div className="space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
            French & Indian War / Ohio Country
          </p>
          <BulletList items={p.fortsAndWars.frenchAndIndianWar} />
        </div>
        <div className="space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
            Revolutionary War frontier & Fort McIntosh
          </p>
          <BulletList items={p.fortsAndWars.revolutionaryWarFrontier} />
        </div>
        <div className="space-y-2">
          <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
            Nearby
          </p>
          <BulletList items={p.fortsAndWars.nearby} />
        </div>
      </Section>

      <Section eyebrow="District" title={p.historicDistrict.name} icon={<Landmark className="h-3.5 w-3.5" />}>
        <MetaGrid
          rows={[
            ["Name", p.historicDistrict.name],
            ["NRHP ref", p.historicDistrict.nrhpRef],
            ["Listed", p.historicDistrict.listed],
            ["Area", `${p.historicDistrict.areaAcres} acres`],
          ]}
        />
        <p>{p.historicDistrict.periodOfSignificance}</p>
        <p style={{ color: "var(--dt-muted)" }}>{p.historicDistrict.resources}</p>
        <p style={{ color: "var(--dt-muted)" }}>{p.historicDistrict.boundariesNote}</p>
        <div className="flex flex-wrap gap-2">
          {p.historicDistrict.styles.map((s) => (
            <span key={s} className="downtown-chip">
              {s}
            </span>
          ))}
        </div>
        {p.historicDistrict.localOrdinance && <p>{p.historicDistrict.localOrdinance}</p>}
        <p>{p.historicDistrict.relevanceToProperty}</p>
      </Section>

      <Section eyebrow="Chronology" title="Timeline" icon={<Clock className="h-3.5 w-3.5" />}>
        <ol className="space-y-0">
          {p.timeline.map((row) => (
            <li
              key={`${row.year}-${row.event.slice(0, 24)}`}
              className="grid grid-cols-[7.5rem_1fr] gap-4 border-b border-[var(--dt-line)] py-3 last:border-0"
            >
              <span className="downtown-stat text-xs" style={{ color: "var(--dt-accent)" }}>
                {row.year}
              </span>
              <span style={{ color: "var(--dt-muted)" }}>{row.event}</span>
            </li>
          ))}
        </ol>
      </Section>

      <Section eyebrow="Citations" title="Sources" icon={<BookOpen className="h-3.5 w-3.5" />}>
        <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
          Public secondary sources cached for this dossier. Titles link out; raw URLs are not
          shown as primary UI.
        </p>
        <ul className="space-y-3">
          {p.sources.map((s) => (
            <li key={s.url} className="border border-[var(--dt-line)] p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0 space-y-1">
                  <p className="font-medium" style={{ color: "var(--dt-fg)" }}>
                    {s.title}
                  </p>
                  <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                    {[s.publisher, sourceHost(s.url)].filter(Boolean).join(" · ")}
                  </p>
                </div>
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="downtown-chip shrink-0"
                  data-active="true"
                >
                  Open
                  <ExternalLink className="h-3.5 w-3.5" />
                </a>
              </div>
              {s.notes && (
                <p className="mt-2 text-xs leading-relaxed" style={{ color: "var(--dt-muted)" }}>
                  {s.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Section>

      <div className="flex flex-wrap gap-2 pb-4">
        {p.tags.map((t) => (
          <span key={t} className="downtown-chip">
            {t}
          </span>
        ))}
      </div>
    </div>
  );
}
