import { listDowntowns } from "./inventory";

export type CbdNewsStory = {
  id: string;
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
  snippet: string;
  downtownId: string;
  downtownName: string;
  state: "PA" | "OH";
  county: string;
};

export type CbdNewsPayload = {
  fetchedAt: string;
  nextRefreshSec: number;
  query: string;
  count: number;
  stories: CbdNewsStory[];
};

const UA = "HavenPM/1.0 (local CBD news; https://github.com/justinpeluso/haven-pm)";
const REFRESH_SEC = 45;

type CacheEntry = { at: number; stories: CbdNewsStory[] };
const memCache = new Map<string, CacheEntry>();

function stripHtml(s: string) {
  return s
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/\s+/g, " ")
    .trim();
}

function pickTag(block: string, tag: string) {
  const cdata = block.match(new RegExp(`<${tag}><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>`, "i"));
  if (cdata?.[1]) return cdata[1].trim();
  const plain = block.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return plain?.[1]?.trim() ?? "";
}

function parseRssItems(xml: string): Array<{
  title: string;
  link: string;
  source: string;
  publishedAt: string | null;
  snippet: string;
}> {
  const items = xml.match(/<item[\s\S]*?<\/item>/gi) ?? [];
  return items.slice(0, 20).map((block) => {
    const title = stripHtml(pickTag(block, "title"));
    const link = stripHtml(pickTag(block, "link"));
    const source =
      stripHtml(pickTag(block, "source")) ||
      stripHtml(pickTag(block, "dc:creator")) ||
      "News";
    const pub = stripHtml(pickTag(block, "pubDate"));
    const snippet = stripHtml(pickTag(block, "description")).slice(0, 280);
    let publishedAt: string | null = null;
    if (pub) {
      const d = new Date(pub);
      if (!Number.isNaN(d.getTime())) publishedAt = d.toISOString();
    }
    return { title, link, source, publishedAt, snippet };
  });
}

async function fetchRss(url: string): Promise<string | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 12000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/rss+xml, application/xml, text/xml, */*" },
      next: { revalidate: 0 },
    });
    if (!res.ok) return null;
    return await res.text();
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function hashId(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return (h >>> 0).toString(16);
}

function googleNewsRss(query: string) {
  return `https://news.google.com/rss/search?q=${encodeURIComponent(query)}&hl=en-US&gl=US&ceid=US:en`;
}

function buildQueries(opts: {
  q: string;
  downtownId?: string;
  state?: "ALL" | "PA" | "OH";
}) {
  const towns = listDowntowns();
  let selected = towns;
  if (opts.downtownId) {
    selected = towns.filter((t) => t.id === opts.downtownId);
  } else if (opts.state && opts.state !== "ALL") {
    selected = towns.filter((t) => t.state === opts.state);
  }

  const free = opts.q.trim().toLowerCase();
  if (free) {
    selected = selected.filter((t) =>
      [t.name, t.downtownName, t.county, t.state, ...t.tags].join(" ").toLowerCase().includes(free)
    );
    // If free text doesn't match a town, still search the phrase against regional news
    if (selected.length === 0) {
      return [
        {
          downtown: null as (typeof towns)[number] | null,
          query: `${opts.q} (Pennsylvania OR Ohio) (downtown OR "main street" OR borough OR city)`,
        },
      ];
    }
  }

  // Rotate a slice of towns so polling stays fresh without hammering 258 feeds
  const tick = Math.floor(Date.now() / (REFRESH_SEC * 1000));
  const pool = selected.length > 0 ? selected : towns;
  const batchSize = opts.downtownId ? 1 : Math.min(8, pool.length);
  const start = pool.length ? (tick * batchSize) % pool.length : 0;
  const batch = Array.from({ length: batchSize }, (_, i) => pool[(start + i) % pool.length]!);

  return batch.map((d) => {
    const stateFull = d.state === "PA" ? "Pennsylvania" : "Ohio";
    const extras = d.tags.includes("county_seat")
      ? "courthouse OR downtown"
      : "downtown OR \"main street\" OR revitalization OR borough";
    return {
      downtown: d,
      query: `"${d.name}" ${stateFull} (${extras})`,
    };
  });
}

export async function getCbdNews(opts: {
  q?: string;
  downtownId?: string;
  state?: "ALL" | "PA" | "OH";
  force?: boolean;
}): Promise<CbdNewsPayload> {
  const q = opts.q ?? "";
  const state = opts.state ?? "ALL";
  const downtownId = opts.downtownId;
  const cacheKey = `${downtownId || "all"}|${state}|${q.trim().toLowerCase()}`;
  const cached = memCache.get(cacheKey);
  const age = cached ? Date.now() - cached.at : Infinity;

  if (!opts.force && cached && age < REFRESH_SEC * 1000) {
    return {
      fetchedAt: new Date(cached.at).toISOString(),
      nextRefreshSec: Math.max(1, Math.ceil((REFRESH_SEC * 1000 - age) / 1000)),
      query: q,
      count: cached.stories.length,
      stories: cached.stories,
    };
  }

  const queries = buildQueries({ q, downtownId, state });
  const stories: CbdNewsStory[] = [];
  const seen = new Set<string>();

  for (const item of queries) {
    const xml = await fetchRss(googleNewsRss(item.query));
    if (!xml) continue;
    const parsed = parseRssItems(xml);
    for (const p of parsed) {
      if (!p.title || !p.link) continue;
      const key = p.link.split("&")[0] || p.title;
      if (seen.has(key)) continue;
      seen.add(key);
      const d = item.downtown;
      stories.push({
        id: hashId(key),
        title: p.title,
        link: p.link,
        source: p.source,
        publishedAt: p.publishedAt,
        snippet: p.snippet,
        downtownId: d?.id ?? "regional",
        downtownName: d?.name ?? "Regional",
        state: d?.state ?? (/\bOH\b|Ohio/i.test(p.title) ? "OH" : "PA"),
        county: d?.county ?? "—",
      });
    }
  }

  stories.sort((a, b) => {
    const ta = a.publishedAt ? Date.parse(a.publishedAt) : 0;
    const tb = b.publishedAt ? Date.parse(b.publishedAt) : 0;
    return tb - ta;
  });

  const trimmed = stories.slice(0, 48);
  const at = Date.now();
  memCache.set(cacheKey, { at, stories: trimmed });

  return {
    fetchedAt: new Date(at).toISOString(),
    nextRefreshSec: REFRESH_SEC,
    query: q,
    count: trimmed.length,
    stories: trimmed,
  };
}

export const CBD_NEWS_REFRESH_SEC = REFRESH_SEC;
