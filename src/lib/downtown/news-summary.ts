import { createHash } from "crypto";
import { promises as fs } from "fs";
import path from "path";

export type NewsSummaryPayload = {
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

type CacheRecord = Omit<NewsSummaryPayload, "cached">;

const UA =
  "Mozilla/5.0 (compatible; HavenPM/1.0; +https://github.com/justinpeluso/haven-pm) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36";
const FETCH_TIMEOUT_MS = 14000;
const CACHE_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const FALLBACK_TTL_MS = 6 * 60 * 60 * 1000;
const CACHE_DIR = process.env.VERCEL
  ? path.join("/tmp", "haven-pm-news-cache")
  : path.join(process.cwd(), ".cache");
const CACHE_FILE = path.join(CACHE_DIR, "news-summaries.json");

const memCache = new Map<string, CacheRecord>();
let fileLoaded = false;
let writeQueue: Promise<void> = Promise.resolve();

export function storyIdFromUrl(url: string) {
  return createHash("sha1").update(url.split("&")[0] || url).digest("hex").slice(0, 16);
}

function decodeEntities(s: string) {
  return s
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, "<")
    .replace(/&gt;/gi, ">")
    .replace(/&#(\d+);/g, (_, n) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-f]+);/gi, (_, h) => String.fromCharCode(parseInt(h, 16)));
}

function stripTags(html: string) {
  return decodeEntities(
    html
      .replace(/<script[\s\S]*?<\/script>/gi, " ")
      .replace(/<style[\s\S]*?<\/style>/gi, " ")
      .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ")
      .replace(/<!--[\s\S]*?-->/g, " ")
      .replace(/<[^>]+>/g, " ")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function pickMeta(html: string, key: string) {
  const prop = html.match(
    new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]+content=["']([^"']+)["']`, "i")
  );
  if (prop?.[1]) return decodeEntities(prop[1]);
  const rev = html.match(
    new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+(?:property|name)=["']${key}["']`, "i")
  );
  return rev?.[1] ? decodeEntities(rev[1]) : "";
}

function pickTitle(html: string) {
  return (
    pickMeta(html, "og:title") ||
    pickMeta(html, "twitter:title") ||
    stripTags(html.match(/<title[^>]*>([\s\S]*?)<\/title>/i)?.[1] ?? "")
  );
}

function extractRegion(html: string, tag: string) {
  const m = html.match(new RegExp(`<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`, "i"));
  return m?.[1] ?? "";
}

function extractParagraphs(html: string): string[] {
  const cleaned = html
    .replace(/<script[\s\S]*?<\/script>/gi, " ")
    .replace(/<style[\s\S]*?<\/style>/gi, " ")
    .replace(/<noscript[\s\S]*?<\/noscript>/gi, " ");

  const region =
    extractRegion(cleaned, "article") ||
    extractRegion(cleaned, "main") ||
    cleaned.match(/<body[^>]*>([\s\S]*?)<\/body>/i)?.[1] ||
    cleaned;

  const fromP = [...region.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)]
    .map((m) => stripTags(m[1] ?? ""))
    .map((t) => t.replace(/\s+/g, " ").trim())
    .filter((t) => t.length >= 40)
    .filter(
      (t) =>
        !/cookie|subscribe|sign up|newsletter|advertisement|all rights reserved|enable javascript/i.test(
          t
        )
    );

  if (fromP.length >= 2) return dedupeNear(fromP).slice(0, 12);

  // Fallback: split long text blocks
  const text = stripTags(region);
  const chunks = text
    .split(/(?<=[.!?])\s+/)
    .reduce<string[]>((acc, sentence) => {
      const last = acc[acc.length - 1];
      if (!last || last.length > 280) acc.push(sentence);
      else acc[acc.length - 1] = `${last} ${sentence}`;
      return acc;
    }, [])
    .map((t) => t.trim())
    .filter((t) => t.length >= 50);

  return dedupeNear(chunks).slice(0, 10);
}

function dedupeNear(items: string[]) {
  const out: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase().slice(0, 80);
    if (out.some((o) => o.toLowerCase().slice(0, 80) === key)) continue;
    out.push(item);
  }
  return out;
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s'-]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length > 3)
    .filter(
      (w) =>
        ![
          "that",
          "this",
          "with",
          "from",
          "have",
          "were",
          "been",
          "they",
          "their",
          "which",
          "about",
          "would",
          "could",
          "there",
          "when",
          "where",
          "while",
          "after",
          "before",
          "into",
          "over",
          "also",
          "said",
          "says",
          "will",
          "than",
          "then",
          "them",
          "some",
          "more",
          "most",
          "other",
          "only",
          "just",
          "like",
          "such",
          "through",
          "during",
          "under",
        ].includes(w)
    );
}

function extractiveSummary(paragraphs: string[]): { paragraphs: string[]; bullets: string[] } {
  if (paragraphs.length === 0) return { paragraphs: [], bullets: [] };

  const lead = paragraphs.slice(0, 2);
  const allText = paragraphs.join(" ");
  const freq = new Map<string, number>();
  for (const w of tokenize(allText)) freq.set(w, (freq.get(w) ?? 0) + 1);

  const sentences = paragraphs
    .flatMap((p) => p.split(/(?<=[.!?])\s+/))
    .map((s) => s.trim())
    .filter((s) => s.length >= 50 && s.length <= 320);

  const scored = sentences
    .map((s, i) => {
      const words = tokenize(s);
      const score =
        words.reduce((sum, w) => sum + (freq.get(w) ?? 0), 0) / Math.max(words.length, 1) +
        (i < 3 ? 1.5 : 0);
      return { s, score, i };
    })
    .sort((a, b) => b.score - a.score);

  const picked: string[] = [];
  for (const row of scored) {
    if (picked.length >= 4) break;
    if (picked.some((p) => p.slice(0, 48).toLowerCase() === row.s.slice(0, 48).toLowerCase())) {
      continue;
    }
    // Prefer chronological among top scores: keep original order later
    picked.push(row.s);
  }

  const bullets = picked
    .map((s) => ({ s, idx: sentences.indexOf(s) }))
    .sort((a, b) => a.idx - b.idx)
    .map((x) => x.s);

  const summaryParas =
    lead.length > 0
      ? lead
      : bullets.length
        ? [bullets.join(" ")]
        : paragraphs.slice(0, 2);

  return {
    paragraphs: summaryParas.slice(0, 3),
    bullets: (bullets.length ? bullets : summaryParas).slice(0, 5),
  };
}

function looksBlocked(html: string, textLen: number) {
  if (textLen < 220) return true;
  return /subscribe to continue|sign in to read|enable cookies|attention required|captcha|access denied|paywall/i.test(
    html
  );
}

async function fetchHtml(url: string): Promise<{ html: string; finalUrl: string } | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      redirect: "follow",
      headers: {
        "User-Agent": UA,
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        "Accept-Language": "en-US,en;q=0.9",
        Cookie: "CONSENT=YES+; SOCS=CAESEwgDEgk0ODE3Nzk3MjQaAmVuIAEaBgiA_LyaBg",
      },
      cache: "no-store",
    });
    const html = await res.text();
    // Soft-fail: some publishers return 403/404 shells that still contain article text
    if (!html || html.length < 400) return null;
    if (!res.ok && extractParagraphs(html).join(" ").length < 220) return null;
    return { html, finalUrl: res.url || url };
  } catch {
    return null;
  } finally {
    clearTimeout(t);
  }
}

function isGoogleNewsUrl(url: string) {
  try {
    const u = new URL(url);
    return u.hostname.includes("news.google.com") && /\/articles\//.test(u.pathname);
  } catch {
    return false;
  }
}

function googleArticleId(url: string) {
  try {
    const parts = new URL(url).pathname.split("/").filter(Boolean);
    return parts[parts.length - 1] || "";
  } catch {
    return "";
  }
}

/** Resolve post-2024 Google News CBMi… article IDs to the publisher URL. */
async function resolveGoogleNewsUrl(articleUrl: string): Promise<string | null> {
  const articleId = googleArticleId(articleUrl);
  if (!articleId) return null;

  const pageUrl = `https://news.google.com/articles/${articleId}?hl=en-US&gl=US&ceid=US:en`;
  const page = await fetchHtml(pageUrl);
  if (!page) return null;

  const sig = page.html.match(/data-n-a-sg="([^"]+)"/)?.[1];
  const ts = page.html.match(/data-n-a-ts="([^"]+)"/)?.[1];
  if (!sig || !ts) return null;

  const inner = JSON.stringify([
    "garturlreq",
    [
      ["X", "X", ["X", "X"], null, null, 1, 1, "US:en", null, 1, null, null, null, null, null, 0, 1],
      "X",
      "X",
      1,
      [1, 1, 1],
      1,
      1,
      null,
      0,
      0,
      null,
      0,
    ],
    articleId,
    Number(ts),
    sig,
  ]);
  const fReq = JSON.stringify([[["Fbv4je", inner, null, "generic"]]]);

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), FETCH_TIMEOUT_MS);
  try {
    const rpc = await fetch(
      "https://news.google.com/_/DotsSplashUi/data/batchexecute?rpcids=Fbv4je",
      {
        method: "POST",
        signal: ctrl.signal,
        headers: {
          "Content-Type": "application/x-www-form-urlencoded;charset=UTF-8",
          "User-Agent": UA,
        },
        body: new URLSearchParams({ "f.req": fReq }),
        cache: "no-store",
      }
    );
    if (!rpc.ok) return null;
    const text = (await rpc.text()).replace(/^\)\]\}'\s*/, "");
    for (const line of text.split("\n").filter(Boolean)) {
      try {
        const parsed = JSON.parse(line) as unknown;
        if (!Array.isArray(parsed)) continue;
        for (const env of parsed) {
          if (!Array.isArray(env) || env[0] !== "wrb.fr" || env[1] !== "Fbv4je") continue;
          const payload = JSON.parse(String(env[2])) as unknown;
          if (Array.isArray(payload) && payload[0] === "garturlres" && typeof payload[1] === "string") {
            return payload[1];
          }
        }
      } catch {
        // keep scanning lines
      }
    }
    return null;
  } catch {
    return null;
  } finally {
    clearTimeout(timer);
  }
}

async function resolveArticleUrl(url: string): Promise<string> {
  if (!isGoogleNewsUrl(url)) return url;
  const resolved = await resolveGoogleNewsUrl(url);
  return resolved || url;
}

async function loadFileCache() {
  if (fileLoaded) return;
  fileLoaded = true;
  try {
    const raw = await fs.readFile(CACHE_FILE, "utf8");
    const parsed = JSON.parse(raw) as { byId?: Record<string, CacheRecord> };
    for (const [id, rec] of Object.entries(parsed.byId ?? {})) {
      if (rec?.id && rec.cachedAt) memCache.set(id, rec);
    }
  } catch {
    // no cache yet
  }
}

function persistFileCache() {
  writeQueue = writeQueue.then(async () => {
    try {
      await fs.mkdir(CACHE_DIR, { recursive: true });
      const byId: Record<string, CacheRecord> = {};
      for (const [id, rec] of memCache.entries()) byId[id] = rec;
      await fs.writeFile(CACHE_FILE, JSON.stringify({ byId }, null, 2), "utf8");
    } catch {
      // Vercel serverless FS may be read-only outside /tmp — ignore
    }
  });
  return writeQueue;
}

function isFresh(rec: CacheRecord) {
  const age = Date.now() - Date.parse(rec.cachedAt);
  if (Number.isNaN(age)) return false;
  return age < (rec.mode === "extracted" ? CACHE_TTL_MS : FALLBACK_TTL_MS);
}

function fallbackPayload(opts: {
  id: string;
  url: string;
  title: string;
  source: string;
  publishedAt: string | null;
  snippet: string;
  note: string;
}): CacheRecord {
  const cleaned = opts.snippet
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, "&")
    .replace(/<[^>]+>/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  // Prefer a readable blurb; if feed only echoed the title, say so plainly
  const blurb =
    cleaned && cleaned.toLowerCase() !== opts.title.trim().toLowerCase()
      ? cleaned
      : opts.title.trim()
        ? `${opts.title.trim()}${opts.source ? ` — ${opts.source}` : ""}`
        : "";
  const paragraphs = blurb ? [blurb] : [];
  return {
    id: opts.id,
    url: opts.url,
    canonicalUrl: opts.url,
    title: opts.title || "News story",
    source: opts.source || "News",
    publishedAt: opts.publishedAt,
    paragraphs,
    bullets: paragraphs,
    mode: "feed_fallback",
    cachedAt: new Date().toISOString(),
    note: opts.note,
  };
}

export async function getNewsSummary(opts: {
  url: string;
  id?: string;
  title?: string;
  source?: string;
  publishedAt?: string | null;
  snippet?: string;
  force?: boolean;
}): Promise<NewsSummaryPayload> {
  const url = opts.url.trim();
  if (!url || !/^https?:\/\//i.test(url)) {
    throw new Error("A valid article URL is required");
  }

  const id = opts.id || storyIdFromUrl(url);
  await loadFileCache();

  if (!opts.force) {
    const hit = memCache.get(id);
    if (hit && isFresh(hit)) {
      return { ...hit, cached: true };
    }
  }

  const feedTitle = opts.title?.trim() || "";
  const feedSource = opts.source?.trim() || "";
  const feedSnippet = opts.snippet?.trim() || "";
  const publishedAt = opts.publishedAt ?? null;

  const targetUrl = await resolveArticleUrl(url);
  const first = await fetchHtml(targetUrl);
  if (!first || isGoogleNewsUrl(first.finalUrl)) {
    const fb = fallbackPayload({
      id,
      url,
      title: feedTitle,
      source: feedSource,
      publishedAt,
      snippet: feedSnippet,
      note: "Couldn’t load full article; here’s the headline blurb from the feed.",
    });
    if (targetUrl && !isGoogleNewsUrl(targetUrl)) fb.canonicalUrl = targetUrl;
    memCache.set(id, fb);
    void persistFileCache();
    return { ...fb, cached: false };
  }

  const html = first.html;
  const canonicalUrl = first.finalUrl || targetUrl;

  const paragraphs = extractParagraphs(html);
  const textLen = paragraphs.join(" ").length;
  const title = feedTitle || pickTitle(html) || "News story";
  const source =
    feedSource ||
    pickMeta(html, "og:site_name") ||
    (() => {
      try {
        return new URL(canonicalUrl).hostname.replace(/^www\./, "");
      } catch {
        return "News";
      }
    })();

  if (looksBlocked(html, textLen) || paragraphs.length === 0) {
    const fb = fallbackPayload({
      id,
      url,
      title,
      source,
      publishedAt,
      snippet: feedSnippet || paragraphs[0] || "",
      note: "Couldn’t load full article; here’s the headline blurb from the feed.",
    });
    fb.canonicalUrl = canonicalUrl;
    memCache.set(id, fb);
    void persistFileCache();
    return { ...fb, cached: false };
  }

  const summarized = extractiveSummary(paragraphs);
  const rec: CacheRecord = {
    id,
    url,
    canonicalUrl,
    title,
    source,
    publishedAt,
    paragraphs: summarized.paragraphs,
    bullets: summarized.bullets,
    mode: "extracted",
    cachedAt: new Date().toISOString(),
  };
  memCache.set(id, rec);
  void persistFileCache();
  return { ...rec, cached: false };
}
