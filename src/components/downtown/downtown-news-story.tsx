"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Newspaper } from "lucide-react";
import { DowntownSubnav } from "./downtown-subnav";

type SummaryPayload = {
  id: string;
  url: string;
  canonicalUrl: string;
  title: string;
  source: string;
  publishedAt: string | null;
  paragraphs: string[];
  bullets: string[];
  mode: "extracted" | "feed_fallback";
  cached: boolean;
  cachedAt: string;
  note?: string;
};

type Props = {
  id: string;
  url: string;
  title: string;
  source: string;
  publishedAt: string | null;
  snippet: string;
  downtownName: string;
  state: string;
};

export function DowntownNewsStory({
  id,
  url,
  title,
  source,
  publishedAt,
  snippet,
  downtownName,
  state,
}: Props) {
  const [data, setData] = useState<SummaryPayload | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const query = useMemo(() => {
    const params = new URLSearchParams();
    params.set("url", url);
    if (id) params.set("id", id);
    if (title) params.set("title", title);
    if (source) params.set("source", source);
    if (publishedAt) params.set("publishedAt", publishedAt);
    if (snippet) params.set("snippet", snippet);
    return params.toString();
  }, [id, url, title, source, publishedAt, snippet]);

  useEffect(() => {
    let cancelled = false;
    async function run() {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch(`/api/downtowns/news/summary?${query}`, {
          cache: "no-store",
        });
        if (!res.ok) throw new Error("Summary request failed");
        const json = (await res.json()) as SummaryPayload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) {
          setError("Couldn’t build a summary right now.");
          setData({
            id,
            url,
            canonicalUrl: url,
            title: title || "News story",
            source: source || "News",
            publishedAt,
            paragraphs: snippet ? [snippet] : [],
            bullets: snippet ? [snippet] : [],
            mode: "feed_fallback",
            cached: false,
            cachedAt: new Date().toISOString(),
            note: "Couldn’t load full article; here’s the headline blurb from the feed.",
          });
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void run();
    return () => {
      cancelled = true;
    };
  }, [query, id, url, title, source, publishedAt, snippet]);

  const display = data;
  const when = display?.publishedAt
    ? new Date(display.publishedAt).toLocaleString()
    : publishedAt
      ? new Date(publishedAt).toLocaleString()
      : null;

  return (
    <div className="downtown-shell space-y-6">
      <DowntownSubnav active="news" />

      <div className="flex flex-wrap items-center gap-3">
        <Link href="/downtown/news" className="downtown-chip">
          <ArrowLeft className="mr-1.5 h-3.5 w-3.5" />
          Back to news
        </Link>
        {downtownName && (
          <span className="downtown-chip">
            {downtownName}
            {state ? `, ${state}` : ""}
          </span>
        )}
      </div>

      <article className="downtown-panel space-y-5 p-5 md:p-7">
        <header className="space-y-3 border-b border-[var(--dt-line)] pb-5">
          <div className="flex flex-wrap gap-2">
            <span className="downtown-chip" data-active="true">
              <Newspaper className="mr-1 h-3 w-3" />
              {display?.source || source || "News"}
            </span>
            {when && <span className="downtown-chip">{when}</span>}
            {display?.cached && (
              <span className="downtown-chip" style={{ color: "var(--dt-good)" }}>
                Cached
              </span>
            )}
          </div>
          <h1 className="font-serif text-3xl tracking-tight md:text-4xl">
            {display?.title || title || "News story"}
          </h1>
          <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
            In-app summary · Haven PM does not open the publisher site by default
          </p>
        </header>

        {loading && (
          <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
            Fetching and summarizing article…
          </p>
        )}

        {error && (
          <p className="text-sm" style={{ color: "var(--dt-warn)" }}>
            {error}
          </p>
        )}

        {display?.note && (
          <p className="text-sm" style={{ color: "var(--dt-warn)" }}>
            {display.note}
          </p>
        )}

        {!loading && display && (
          <div className="space-y-5">
            {display.bullets.length > 0 && (
              <div className="space-y-3">
                <p
                  className="text-[0.7rem] uppercase tracking-[0.18em]"
                  style={{ color: "var(--dt-accent)" }}
                >
                  Summary
                </p>
                <ul className="space-y-2.5 pl-5">
                  {display.bullets.map((b) => (
                    <li
                      key={b.slice(0, 48)}
                      className="list-disc text-sm leading-relaxed"
                      style={{ color: "var(--dt-fg)" }}
                    >
                      {b}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {display.paragraphs.length > 0 && display.mode === "extracted" && (
              <div className="space-y-3 border-t border-[var(--dt-line)] pt-5">
                <p
                  className="text-[0.7rem] uppercase tracking-[0.18em]"
                  style={{ color: "var(--dt-muted)" }}
                >
                  Lead
                </p>
                {display.paragraphs.map((p) => (
                  <p
                    key={p.slice(0, 48)}
                    className="text-sm leading-relaxed"
                    style={{ color: "var(--dt-muted)" }}
                  >
                    {p}
                  </p>
                ))}
              </div>
            )}

            {!display.bullets.length && !display.paragraphs.length && (
              <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
                No summary text available for this story.
              </p>
            )}
          </div>
        )}

        {(display?.canonicalUrl || url) && (
          <footer className="border-t border-[var(--dt-line)] pt-4">
            <a
              href={display?.canonicalUrl || url}
              target="_blank"
              rel="noreferrer"
              className="text-[0.7rem] underline-offset-2 hover:underline"
              style={{ color: "var(--dt-muted)" }}
            >
              Original source
            </a>
          </footer>
        )}
      </article>
    </div>
  );
}
