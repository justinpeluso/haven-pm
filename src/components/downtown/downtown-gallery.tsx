"use client";

import { useDeferredValue, useMemo, useState, useTransition } from "react";
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
  images: GalleryImage[];
};

type Props = {
  initial: GalleryCard[];
};

const PAGE_SIZE = 36;
const PLACEHOLDER = "/downtown-placeholder.svg";

function absHttps(u: string) {
  if (!u) return PLACEHOLDER;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("http://")) return `https://${u.slice(7)}`;
  if (u.startsWith("data:")) return PLACEHOLDER;
  return u;
}

function SafeImg({
  src,
  alt,
  className,
  fallback = PLACEHOLDER,
}: {
  src: string;
  alt: string;
  className?: string;
  fallback?: string;
}) {
  const [current, setCurrent] = useState(() => absHttps(src));
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
        const fb = absHttps(fallback);
        if (current !== fb) setCurrent(fb);
      }}
    />
  );
}

export function DowntownGallery({ initial }: Props) {
  const router = useRouter();
  const [q, setQ] = useState("");
  const [state, setState] = useState<"ALL" | "PA" | "OH">("ALL");
  const [selected, setSelected] = useState<string[]>([]);
  const [kindFilter, setKindFilter] = useState<"all" | GalleryImage["kind"]>("all");
  const [visible, setVisible] = useState(PAGE_SIZE);
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
    if (kindFilter !== "all") {
      list = list.filter((d) => d.images.some((img) => img.kind === kindFilter));
    }
    return list;
  }, [initial, state, deferredQ, kindFilter]);

  const shown = filtered.slice(0, visible);

  function toggleSelect(id: string) {
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((x) => x !== id);
      if (prev.length >= 4) return prev;
      return [...prev, id];
    });
  }

  function resetAndFilter(fn: () => void) {
    startTransition(() => {
      setVisible(PAGE_SIZE);
      fn();
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
          Prefetched Wikimedia / Wikipedia photos — recent streetscapes first, plus historic
          frames when available. Search all CBDs instantly. Select up to 4 to compare.
        </p>
      </header>

      <div className="downtown-search-wrap">
        <Search className="downtown-search-icon h-4 w-4" />
        <input
          className="downtown-input"
          placeholder="Search gallery — town, CBD, county, tag…"
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
              aria-label="Clear"
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
            {shown.length}/{filtered.length}
          </span>{" "}
          downtowns
          {selected.length > 0 && <> · {selected.length}/4 selected</>}
        </p>
        <div className="flex flex-wrap gap-2.5">
          {(["ALL", "PA", "OH"] as const).map((s) => (
            <button
              key={s}
              type="button"
              className="downtown-chip"
              data-active={state === s}
              onClick={() => resetAndFilter(() => setState(s))}
            >
              {s === "ALL" ? "All states" : s}
            </button>
          ))}
          {(["all", "streetscape", "historic", "building"] as const).map((k) => (
            <button
              key={k}
              type="button"
              className="downtown-chip"
              data-active={kindFilter === k}
              onClick={() => resetAndFilter(() => setKindFilter(k))}
            >
              {k === "all" ? "All photo types" : k}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {shown.map((d) => {
          const photos = d.images.filter((i) => i.kind !== "map");
          const images = photos.length > 0 ? photos : d.images;
          const hero = images[0];
          const isSelected = selected.includes(d.id);
          const thumbs = images.slice(0, 6);

          return (
            <article key={d.id} className="downtown-panel overflow-hidden">
              <div className="relative aspect-[16/10] bg-black/40">
                {hero && (
                  <SafeImg
                    src={hero.thumbUrl || hero.url}
                    alt={hero.title}
                    className="h-full w-full object-cover"
                  />
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
                {thumbs.length > 1 && (
                  <div className="flex gap-1.5 overflow-x-auto pb-1">
                    {thumbs.slice(1, 4).map((img) => (
                      <SafeImg
                        key={img.url + img.title}
                        src={img.thumbUrl || img.url}
                        alt={img.title}
                        className="h-14 w-20 shrink-0 rounded-sm object-cover border border-[var(--dt-line)]"
                      />
                    ))}
                  </div>
                )}
                <p className="text-[0.65rem]" style={{ color: "var(--dt-muted)" }}>
                  {photos.length || images.length} frames ·{" "}
                  {photos.filter((i) => i.kind === "historic").length} historic ·{" "}
                  {photos.filter((i) => i.kind === "streetscape" || i.kind === "building").length}{" "}
                  street/building
                </p>
              </div>
            </article>
          );
        })}
      </div>

      {visible < filtered.length && (
        <div className="flex justify-center pb-8">
          <button
            type="button"
            className="downtown-chip"
            data-active="true"
            onClick={() => setVisible((v) => v + PAGE_SIZE)}
          >
            Show more ({filtered.length - visible} left)
          </button>
        </div>
      )}

      {selected.length > 0 && (
        <div
          className="fixed bottom-4 left-1/2 z-40 flex -translate-x-1/2 items-center gap-3 border border-[var(--dt-line)] px-4 py-3 shadow-xl"
          style={{ background: "rgba(14,20,25,0.95)" }}
        >
          <Columns2 className="h-4 w-4" style={{ color: "var(--dt-accent)" }} />
          <span className="text-sm">Compare {selected.length}/4 downtowns</span>
          <button
            type="button"
            className="downtown-chip"
            data-active="true"
            disabled={selected.length < 2}
            onClick={() => router.push(`/downtown/gallery/compare?ids=${selected.join(",")}`)}
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
