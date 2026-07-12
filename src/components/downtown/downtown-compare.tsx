"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { DowntownSubnav } from "./downtown-subnav";
import { DowntownSafeImg } from "./downtown-safe-img";
import type { GalleryImage } from "@/lib/downtown/gallery";

type CompareDowntown = {
  id: string;
  name: string;
  state: string;
  county: string;
  downtownName: string;
  milesFromAllegheny: number;
  vibrancy: number;
  vacancyEstimate: number;
  images: GalleryImage[];
};

export function DowntownCompare({ ids }: { ids: string[] }) {
  const [rows, setRows] = useState<CompareDowntown[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      try {
        const res = await fetch(
          `/api/downtowns/gallery?ids=${ids.slice(0, 4).map(encodeURIComponent).join(",")}`
        );
        if (!res.ok) throw new Error("Failed to load");
        const data = await res.json();
        if (!cancelled) setRows(data.downtowns ?? []);
      } catch {
        if (!cancelled) setError("Could not load compare set.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [ids.join(",")]);

  return (
    <div className="downtown-shell space-y-6">
      <DowntownSubnav active="gallery" />
      <div className="text-sm" style={{ color: "var(--dt-muted)" }}>
        <Link href="/downtown/gallery" className="underline underline-offset-2">
          ← Gallery
        </Link>
      </div>

      <header className="space-y-2 border-b border-[var(--dt-line)] pb-5">
        <p className="text-[0.7rem] uppercase tracking-[0.18em]" style={{ color: "var(--dt-accent)" }}>
          Compare downtowns
        </p>
        <h1 className="font-serif text-3xl tracking-tight">Side-by-side gallery</h1>
        <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
          Up to 4 CBDs — streetscape, historic, and building frames when Commons has them.
        </p>
      </header>

      {loading && (
        <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
          Loading images…
        </p>
      )}
      {error && (
        <p className="text-sm" style={{ color: "var(--dt-warn)" }}>
          {error}
        </p>
      )}

      <div
        className="grid gap-4"
        style={{
          gridTemplateColumns: `repeat(${Math.max(1, rows.length)}, minmax(0, 1fr))`,
        }}
      >
        {rows.map((d) => (
          <div key={d.id} className="downtown-panel overflow-hidden">
            <div className="border-b border-[var(--dt-line)] p-4">
              <Link href={`/downtown/${d.id}`} className="font-medium hover:underline">
                {d.name}, {d.state}
              </Link>
              <p className="mt-1 text-xs" style={{ color: "var(--dt-muted)" }}>
                {d.downtownName}
              </p>
              <p className="mt-2 downtown-stat text-xs">
                V {d.vibrancy} · Vac {d.vacancyEstimate}% · {d.milesFromAllegheny} mi
              </p>
            </div>
            <div className="space-y-3 p-3">
              {d.images
                .filter((img) => img.kind !== "map" || d.images.length === 1)
                .map((img) => {
                  const primary = img.thumbUrl || img.url;
                  return (
                    <figure key={img.url + img.title} className="space-y-1.5">
                      <DowntownSafeImg
                        src={primary}
                        fallbackSrc={img.thumbUrl ? img.url : undefined}
                        alt={img.title}
                        className="w-full rounded-sm object-cover aspect-[4/3] border border-[var(--dt-line)]"
                      />
                      <figcaption
                        className="text-[0.65rem] leading-relaxed"
                        style={{ color: "var(--dt-muted)" }}
                      >
                        <span className="uppercase tracking-wide text-[var(--dt-accent)]">
                          {img.kind}
                        </span>
                        {" · "}
                        {img.title}
                        {img.credit ? ` · ${img.credit}` : ""}
                      </figcaption>
                    </figure>
                  );
                })}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
