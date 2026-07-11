"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import Link from "next/link";
import { Search, RefreshCw, Newspaper, ExternalLink } from "lucide-react";
import { DowntownSubnav } from "./downtown-subnav";
import type { CbdNewsStory } from "@/lib/downtown/news";

type TownOption = {
  id: string;
  name: string;
  state: "PA" | "OH";
  county: string;
};

type Props = {
  towns: TownOption[];
};

const INTERVAL_SEC = 45;

export function DowntownNews({ towns }: Props) {
  const [q, setQ] = useState("");
  const [state, setState] = useState<"ALL" | "PA" | "OH">("ALL");
  const [downtownId, setDowntownId] = useState<string>("");
  const [stories, setStories] = useState<CbdNewsStory[]>([]);
  const [fetchedAt, setFetchedAt] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(INTERVAL_SEC);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [pulse, setPulse] = useState(false);
  const [, startTransition] = useTransition();

  const townOptions = useMemo(() => {
    let list = towns;
    if (state !== "ALL") list = list.filter((t) => t.state === state);
    return list;
  }, [towns, state]);

  const load = useCallback(
    async (force = false) => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams();
        if (q.trim()) params.set("q", q.trim());
        if (state !== "ALL") params.set("state", state);
        if (downtownId) params.set("downtownId", downtownId);
        if (force) params.set("force", "1");
        const res = await fetch(`/api/downtowns/news?${params.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("News refresh failed");
        const data = await res.json();
        setStories(data.stories ?? []);
        setFetchedAt(data.fetchedAt ?? new Date().toISOString());
        setSecondsLeft(data.nextRefreshSec ?? INTERVAL_SEC);
        setPulse(true);
        setTimeout(() => setPulse(false), 700);
      } catch {
        setError("Could not refresh local CBD news. Retrying on the next cycle.");
      } finally {
        setLoading(false);
      }
    },
    [q, state, downtownId]
  );

  useEffect(() => {
    void load(true);
  }, [load]);

  useEffect(() => {
    const tick = window.setInterval(() => {
      setSecondsLeft((s) => {
        if (s <= 1) {
          void load(true);
          return INTERVAL_SEC;
        }
        return s - 1;
      });
    }, 1000);
    return () => window.clearInterval(tick);
  }, [load]);

  const lastLabel = fetchedAt
    ? new Date(fetchedAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit", second: "2-digit" })
    : "—";

  return (
    <div className="downtown-shell space-y-6">
      <DowntownSubnav active="news" />

      <header className="space-y-3 border-b border-[var(--dt-line)] pb-5">
        <p
          className="text-[0.7rem] uppercase tracking-[0.18em]"
          style={{ color: "var(--dt-accent)" }}
        >
          Local CBD News
        </p>
        <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
          Daily stories across downtowns
        </h1>
        <p className="max-w-2xl text-sm" style={{ color: "var(--dt-muted)" }}>
          Free Google News RSS for boroughs and cities in the Allegheny 40-mile ring. Search a town,
          filter by state, or pin one CBD. Auto-refreshes every {INTERVAL_SEC}s.
        </p>
      </header>

      <div
        className="downtown-panel flex flex-wrap items-center gap-3 p-4"
        data-pulse={pulse ? "true" : "false"}
      >
        <span
          className="inline-flex h-2.5 w-2.5 rounded-full"
          style={{
            background: pulse ? "var(--dt-good)" : "var(--dt-accent)",
            boxShadow: pulse ? "0 0 0 4px rgba(196,163,90,0.25)" : "none",
          }}
        />
        <div className="text-sm">
          <span className="downtown-stat">Updater</span>
          <span style={{ color: "var(--dt-muted)" }}>
            {" "}
            · last {lastLabel} · next in {secondsLeft}s
          </span>
        </div>
        <div className="ml-auto flex items-center gap-2">
          {loading && (
            <span className="text-xs" style={{ color: "var(--dt-muted)" }}>
              Fetching…
            </span>
          )}
          <button
            type="button"
            className="downtown-chip"
            data-active="true"
            onClick={() => void load(true)}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${loading ? "animate-spin" : ""}`} />
            Refresh now
          </button>
        </div>
      </div>

      <div className="downtown-search-wrap">
        <Search className="downtown-search-icon h-4 w-4" />
        <input
          className="downtown-input"
          placeholder="Search towns, counties, tags…"
          value={q}
          onChange={(e) => startTransition(() => setQ(e.target.value))}
        />
      </div>

      <div className="flex flex-wrap gap-2.5">
        {(["ALL", "PA", "OH"] as const).map((s) => (
          <button
            key={s}
            type="button"
            className="downtown-chip"
            data-active={state === s}
            onClick={() => {
              setState(s);
              setDowntownId("");
            }}
          >
            {s === "ALL" ? "All states" : s}
          </button>
        ))}
        <select
          className="downtown-input max-w-xs py-2 text-sm"
          value={downtownId}
          onChange={(e) => setDowntownId(e.target.value)}
        >
          <option value="">All CBDs in filter</option>
          {townOptions.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}, {t.state} · {t.county}
            </option>
          ))}
        </select>
      </div>

      {error && (
        <p className="text-sm" style={{ color: "var(--dt-warn)" }}>
          {error}
        </p>
      )}

      <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
        Showing <span className="downtown-stat text-[var(--dt-fg)]">{stories.length}</span> stories
      </p>

      <div className="grid gap-3">
        {stories.map((s) => (
          <article key={s.id} className="downtown-panel p-4">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div className="space-y-2 min-w-0 flex-1">
                <div className="flex flex-wrap gap-2">
                  <span className="downtown-chip" data-active="true">
                    <Newspaper className="mr-1 h-3 w-3" />
                    {s.source}
                  </span>
                  {s.downtownId !== "regional" ? (
                    <Link href={`/downtown/${s.downtownId}`} className="downtown-chip">
                      {s.downtownName}, {s.state}
                    </Link>
                  ) : (
                    <span className="downtown-chip">
                      {s.downtownName}, {s.state}
                    </span>
                  )}
                  <span className="downtown-chip">{s.county} County</span>
                </div>
                <a
                  href={s.link}
                  target="_blank"
                  rel="noreferrer"
                  className="block font-medium leading-snug hover:underline"
                >
                  {s.title}
                </a>
                {s.snippet && (
                  <p className="text-sm leading-relaxed" style={{ color: "var(--dt-muted)" }}>
                    {s.snippet}
                  </p>
                )}
                <p className="text-[0.65rem]" style={{ color: "var(--dt-muted)" }}>
                  {s.publishedAt
                    ? new Date(s.publishedAt).toLocaleString()
                    : "Publish time unavailable"}
                </p>
              </div>
              <a
                href={s.link}
                target="_blank"
                rel="noreferrer"
                className="downtown-chip shrink-0"
                aria-label="Open story"
              >
                <ExternalLink className="h-3.5 w-3.5" />
              </a>
            </div>
          </article>
        ))}
        {!loading && stories.length === 0 && (
          <div className="downtown-panel p-8 text-sm" style={{ color: "var(--dt-muted)" }}>
            No stories matched this filter. Try another town or clear search.
          </div>
        )}
      </div>
    </div>
  );
}
