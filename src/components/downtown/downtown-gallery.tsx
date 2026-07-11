"use client";

import { useDeferredValue, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Search, X, Columns2, Check } from "lucide-react";
import { DowntownSubnav } from "./downtown-subnav";
import type { GalleryImage } from "@/lib/downtown/gallery";

export type GalleryCard = {
  id: string;
  name: string;
  state: "PA" | "OH";
  county: string;
  downtownName: string;
  milesFromAllegheny: number;
  tags: string[];
  vibrancy: number;
  images?: GalleryImage[];
};

type Props = {
  initial: GalleryCard[];
};

export function DowntownGallery({ initial }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [state, setState] = useState<"ALL" | "PA" | "OH">("ALL");
  const [selected, setSelected] = useState<string[]>([]);
  const [imageMap, setImageMap] = useState<Record<string, GalleryImage[]>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [, startTransition] = useTransition();
  const deferredQ = useDeferredValue(q);

  const filtered = useMemo(() => {
    let list = initial;
    if (state !== "ALL") list = list.filter((d) => d.state === state);
    const query = deferredQ.trim().toLowerCase();
    if (query) {
      list = list.filter((d) =>
        [d.name, d.downtownName, d.county, d.state, ...d.tags]
          .join(" ")
          .toLowerCase()
          .includes(query)
      );
    }
    return list;
  }, [initial, state, deferredQ]);

  // Lazy-load images for visible first page of filtered results
  const visibleKey = filtered
    .slice(0, 30)
    .map((d) => d.id)
    .join(",");

  useEffect(() => {
    const need = visibleKey
      .split(",")
      .filter(Boolean)
      .filter((id) => !imageMap[id] && !loadingIds.has(id));
    if (need.length === 0) return;

    let cancelled = false;
    setLoadingIds((prev) => {
      const next = new Set(prev);
      need.forEach((id) => next.add(id));
      return next;
    });

    (async () => {
      const chunkSize = 4;
      for (let i = 0; i < need.length; i += chunkSize) {
        if (cancelled) return;
        const chunk = need.slice(i, i + chunkSize);
        await Promise.all(
          chunk.map(async (id) => {
            try {
              const res = await fetch(`/api/downtowns/gallery?id=${encodeURIComponent(id)}`);
              if (!res.ok) return;
              const data = await res.json();
              if (cancelled) return;
              setImageMap((prev) => ({ ...prev, [id]: data.images ?? [] }));
            } catch {
              // ignore
            } finally {
              setLoadingIds((prev) => {
                const next = new Set(prev);
                next.delete(id);
                return next;
              });
            }
          })
        );
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [visibleKey]); // imageMap/loading checked inside for freshness

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  return (
    <div className="downtown-shell space-y-6">
      <DowntownSubnav active="gallery" />

      <header className="space-y-3 border-b border-[var(--dt-line)] pb-5">
        <p
          className="text-[0.7rem] uppercase tracking-[0.18em]"
          style={{ color: "var(--dt-accent)" }}
        >
          Downtown Gallery
        </p>
        <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
          Main Street images across {initial.length} downtowns
        </h1>
        <p className="max-w-2xl text-sm" style={{ color: "var(--dt-muted)" }}>
          Search all CBDs, browse streetscape / historic / building photos from Wikimedia Commons
          when available, with OpenStreetMap core maps as fallback. Select up to 4 downtowns to compare.
        </p>
      </header>

      <div className="downtown-search-wrap">
        <Search className="downtown-search-icon h-4 w-4" />
        <input
          className="downtown-input"
          placeholder="Search gallery — town, CBD, county, tag…"
          value={q}
          onChange={(e) => startTransition(() => setQ(e.target.value))}
        />
        {q && (
          <div className="downtown-search-actions">
            <button type="button" className="downtown-chip" onClick={() => setQ("")} aria-label="Clear">
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        )}
      </div>

      <div className="space-y-3">
        <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
          Showing <span className="downtown-stat text-[var(--dt-fg)]">{filtered.length}</span> downtowns
          {selected.length > 0 && (
            <> · {selected.length}/4 selected for compare</>
          )}
        </p>
        <div className="flex flex-wrap gap-2.5">
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
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filtered.map((d) => {
          const images = imageMap[d.id] ?? [];
          const hero = images.find((i) => i.kind !== "map") ?? images[0];
          const isSelected = selected.includes(d.id);
          const loading = loadingIds.has(d.id) && images.length === 0;

          return (
            <article key={d.id} className="downtown-panel overflow-hidden">
              <div className="relative aspect-[16/10] bg-black/40">
                {hero ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={hero.thumbUrl || hero.url}
                    alt={hero.title}
                    className="h-full w-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <div
                    className="flex h-full items-center justify-center text-xs"
                    style={{ color: "var(--dt-muted)" }}
                  >
                    {loading ? "Loading images…" : "No image yet"}
                  </div>
                )}
                <button
                  type="button"
                  onClick={() => toggleSelect(d.id)}
                  className="absolute left-2 top-2 downtown-chip"
                  data-active={isSelected}
                  style={{ background: "rgba(14,20,25,0.85)" }}
                >
                  {isSelected ? <Check className="h-3 w-3" /> : null}
                  {isSelected ? "Selected" : "Compare"}
                </button>
                {hero && (
                  <span
                    className="absolute bottom-2 left-2 downtown-chip"
                    style={{ background: "rgba(14,20,25,0.85)" }}
                  >
                    {hero.kind}
                  </span>
                )}
              </div>
              <div className="space-y-2 p-4">
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <Link href={`/downtown/${d.id}`} className="font-medium hover:underline">
                      {d.name}, {d.state}
                    </Link>
                    <p className="mt-1 text-xs leading-relaxed" style={{ color: "var(--dt-muted)" }}>
                      {d.downtownName} · {d.county} · {d.milesFromAllegheny} mi
                    </p>
                  </div>
                  <span className="downtown-stat text-xs" style={{ color: "var(--dt-good)" }}>
                    V {d.vibrancy}
                  </span>
                </div>
                {images.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {images.slice(0, 5).map((img) => (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img
                        key={img.url}
                        src={img.thumbUrl || img.url}
                        alt={img.title}
                        title={`${img.kind}: ${img.title}`}
                        className="h-14 w-20 shrink-0 rounded-sm object-cover border border-[var(--dt-line)]"
                        loading="lazy"
                      />
                    ))}
                  </div>
                )}
                <p className="text-[0.65rem]" style={{ color: "var(--dt-muted)" }}>
                  {images.length
                    ? `${images.length} frames · ${images.filter((i) => i.kind === "historic").length} historic · ${images.filter((i) => i.kind === "streetscape" || i.kind === "building").length} street/building`
                    : "Fetching Commons / map…"}
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {selected.length > 0 && (
        <div
          className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 border border-[var(--dt-line)] px-4 py-3 shadow-xl"
          style={{ background: "rgba(14,20,25,0.95)" }}
        >
          <Columns2 className="h-4 w-4" style={{ color: "var(--dt-accent)" }} />
          <span className="text-sm">
            Compare {selected.length}/4 downtowns
          </span>
          <button
            type="button"
            className="downtown-chip"
            data-active="true"
            disabled={selected.length < 2}
            onClick={() =>
              router.push(`/downtown/gallery/compare?ids=${selected.join(",")}`)
            }
          >
            Open compare
          </button>
          <button type="button" className="downtown-chip" onClick={() => setSelected([])}>
            Clear
          </button>
        </div>
      )}
    </div>
  );
}
