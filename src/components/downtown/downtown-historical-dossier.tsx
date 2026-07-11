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
} from "lucide-react";
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

type Props = {
  property: HistoricalProperty;
};

export function DowntownHistoricalDossier({ property: p }: Props) {
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
          {p.id}
        </span>
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
            {p.address.street}, {p.address.borough}, {p.address.county}, {p.address.state}{" "}
            {p.address.zip}
          </p>
        </div>
        <div className="relative aspect-[21/9] max-h-[320px] overflow-hidden border border-[var(--dt-line)] bg-black/40">
          <SafeImg
            src={p.heroImage?.url || PLACEHOLDER}
            alt={p.heroImage?.title || p.name}
            className="h-full w-full object-cover"
          />
          {p.heroImage?.credit && (
            <span
              className="absolute bottom-2 right-2 downtown-chip"
              style={{ background: "rgba(14,20,25,0.85)" }}
            >
              {p.heroImage.credit}
            </span>
          )}
        </div>
      </header>

      {p.images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-1">
          {p.images.map((img) => (
            <div
              key={img.url}
              className="relative h-24 w-36 shrink-0 overflow-hidden border border-[var(--dt-line)]"
            >
              <SafeImg
                src={img.thumbUrl || img.url}
                alt={img.title}
                className="h-full w-full object-cover"
              />
            </div>
          ))}
        </div>
      )}

      <Section eyebrow="Identity" title="Address & parcel identity" icon={<Building2 className="h-3.5 w-3.5" />}>
        <p>{p.parcelIdentity.summary}</p>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ["Municipality", p.parcelIdentity.municipality],
            ["CBD corridor", p.parcelIdentity.cbdCorridor],
            ["Historic district", p.parcelIdentity.historicDistrict],
            ["ZIP", `${p.address.zip} (${p.address.city}, ${p.address.state})`],
          ].map(([k, v]) => (
            <div key={k} className="space-y-1">
              <dt className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
                {k}
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        {p.address.zipNote && (
          <p
            className="border border-[var(--dt-line)] p-3 text-xs leading-relaxed"
            style={{ color: "var(--dt-warn)", background: "rgba(196,122,61,0.08)" }}
          >
            ZIP note: {p.address.zipNote}
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
          <BulletList items={p.parcelIdentity.caveats} />
        )}
      </Section>

      <Section eyebrow="Structure" title="Structure history" icon={<Landmark className="h-3.5 w-3.5" />}>
        <dl className="grid gap-3 sm:grid-cols-3">
          {[
            ["Build era", p.structureHistory.buildEra],
            ["Original use", p.structureHistory.originalUse],
            ["Current use", p.structureHistory.currentUse],
          ].map(([k, v]) => (
            <div key={k} className="space-y-1">
              <dt className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
                {k}
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
        <p>{p.structureHistory.styleNotes}</p>
        {p.structureHistory.districtFabric && <p style={{ color: "var(--dt-muted)" }}>{p.structureHistory.districtFabric}</p>}
        <BulletList items={p.structureHistory.alterations} />
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

      <Section eyebrow="District" title="Beaver Historic District" icon={<Landmark className="h-3.5 w-3.5" />}>
        <dl className="grid gap-3 sm:grid-cols-2">
          {[
            ["Name", p.historicDistrict.name],
            ["NRHP ref", p.historicDistrict.nrhpRef],
            ["Listed", p.historicDistrict.listed],
            ["Area", `${p.historicDistrict.areaAcres} acres`],
          ].map(([k, v]) => (
            <div key={k} className="space-y-1">
              <dt className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
                {k}
              </dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
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

      <Section eyebrow="Chronology" title="Timeline" icon={<BookOpen className="h-3.5 w-3.5" />}>
        <ol className="space-y-0">
          {p.timeline.map((row) => (
            <li
              key={`${row.year}-${row.event.slice(0, 24)}`}
              className="grid grid-cols-[7rem_1fr] gap-4 border-b border-[var(--dt-line)] py-3 last:border-0"
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
        <ul className="space-y-3">
          {p.sources.map((s) => (
            <li key={s.url} className="border border-[var(--dt-line)] p-3">
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-start gap-2 font-medium hover:underline"
                style={{ color: "var(--dt-accent)" }}
              >
                {s.title}
                <ExternalLink className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              </a>
              {s.publisher && (
                <p className="mt-1 text-xs" style={{ color: "var(--dt-muted)" }}>
                  {s.publisher}
                </p>
              )}
              {s.notes && (
                <p className="mt-1.5 text-xs leading-relaxed" style={{ color: "var(--dt-muted)" }}>
                  {s.notes}
                </p>
              )}
            </li>
          ))}
        </ul>
      </Section>
    </div>
  );
}
