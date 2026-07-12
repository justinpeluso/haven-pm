#!/usr/bin/env npx tsx
/**
 * Prefetch gallery images → data/downtown-gallery.json
 * Wikimedia Commons + Wikipedia only. Direct upload.wikimedia.org URLs (no size rewrite).
 * Gentle pacing + 429 retries — Commons rate-limits aggressive bots.
 */
import fs from "fs";
import path from "path";
import inventory from "../data/downtowns.json";

type GalleryImage = {
  url: string;
  thumbUrl: string;
  title: string;
  source: string;
  kind: "historic" | "streetscape" | "building" | "map";
  credit?: string;
  /** Best-effort capture/upload year for ranking */
  year?: number;
};

type Downtown = (typeof inventory.downtowns)[number];

const UA = "HavenPM/1.0 (downtown gallery; https://github.com/justinpeluso/haven-pm)";
const PLACEHOLDER_URL = "/downtown-placeholder.svg";
const OUT = path.join(process.cwd(), "data", "downtown-gallery.json");

function yearFromTitle(title: string): number | undefined {
  const years = [...title.matchAll(/\b((?:19|20)\d{2})\b/g)].map((m) => Number(m[1]));
  if (!years.length) return undefined;
  // Prefer the most recent plausible photo year in the title
  const plausible = years.filter((y) => y >= 1870 && y <= new Date().getFullYear());
  if (!plausible.length) return undefined;
  return Math.max(...plausible);
}

function yearFromTimestamp(ts?: string): number | undefined {
  if (!ts) return undefined;
  const y = Number(ts.slice(0, 4));
  if (y >= 1990 && y <= new Date().getFullYear()) return y;
  return undefined;
}

function isRecent(img: GalleryImage) {
  if (img.kind === "historic") return false;
  if (img.year && img.year >= 2010) return true;
  if (img.year && img.year < 1990) return false;
  // No year but contemporary street/building from Commons geo — treat as recent-ish
  return img.kind === "streetscape" || img.kind === "building";
}

function inferKind(title: string, year?: number): GalleryImage["kind"] {
  const t = title.toLowerCase();
  if (/map|locator|diagram|satellite|iss\d|view of earth|from space|election/.test(t)) return "map";
  // Explicit historic cues, or clearly old years
  if (
    /postcard|vintage|old |archive|nara|nrhp/.test(t) ||
    (year !== undefined && year < 1990) ||
    (/historic|history|historic district/.test(t) && (year === undefined || year < 2005))
  ) {
    return "historic";
  }
  if (/main street|downtown|streetscape|business|storefront|street|avenue|road|bridge/.test(t)) {
    return "streetscape";
  }
  return "building";
}

function skipTitle(title: string) {
  return /coat of arms|locator map|flag of|seal of|logo|icon|diagram|\.svg\b|route map|county map|openstreetmap|wiki\s*mini\s*atlas|iss\d|view of earth|from space|astronaut|election|highlighted\.png|highlighted\.svg|dem\.|lidar|enumeration district|census\b|infantry|regiment/i.test(
    title
  );
}

function placeholder(d: Downtown): GalleryImage {
  return {
    url: PLACEHOLDER_URL,
    thumbUrl: PLACEHOLDER_URL,
    title: `${d.name} downtown`,
    source: "Haven",
    kind: "map",
    credit: "Placeholder",
  };
}

function absHttps(u: string) {
  if (!u) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("http://")) return `https://${u.slice(7)}`;
  return u;
}

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string, attempt = 0): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 16000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.status === 429 || res.status === 503) {
      if (attempt >= 4) return null;
      const wait = 1200 * (attempt + 1) + Math.random() * 500;
      await sleep(wait);
      return fetchJson(url, attempt + 1);
    }
    if (!res.ok) return null;
    const text = await res.text();
    if (text.startsWith("You are making too many")) {
      if (attempt >= 4) return null;
      await sleep(1500 * (attempt + 1));
      return fetchJson(url, attempt + 1);
    }
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    if (attempt >= 2) return null;
    await sleep(800 * (attempt + 1));
    return fetchJson(url, attempt + 1);
  } finally {
    clearTimeout(t);
  }
}

type ApiPage = {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    mime?: string;
    width?: number;
    height?: number;
    timestamp?: string;
  }>;
};

function pagesToImages(pages: ApiPage[], source: string): GalleryImage[] {
  const out: GalleryImage[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const title = page.title || "";
    if (!info?.mime?.startsWith("image/") || info.mime.includes("svg")) continue;
    if (skipTitle(title)) continue;
    const full = absHttps(info.url || info.thumburl || "");
    const thumb = absHttps(info.thumburl || info.url || "");
    if (!full || !thumb) continue;
    const year = yearFromTitle(title) ?? yearFromTimestamp(info.timestamp);
    out.push({
      url: full,
      thumbUrl: thumb,
      title: title.replace(/^File:/, ""),
      source,
      kind: inferKind(title, year),
      credit: source,
      year,
    });
  }
  return out;
}

async function geoImages(d: Downtown, radius: number): Promise<GalleryImage[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "geosearch",
    ggscoord: `${d.center.lat}|${d.center.lng}`,
    ggsradius: String(radius),
    ggslimit: "25",
    ggsnamespace: "6",
    prop: "imageinfo",
    iiprop: "url|mime|size|timestamp",
    iiurlwidth: "960",
  });
  const json = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
  return pagesToImages(Object.values(json?.query?.pages ?? {}) as ApiPage[], "Wikimedia Commons");
}

async function searchFileImages(queries: string[]): Promise<GalleryImage[]> {
  const out: GalleryImage[] = [];
  const seen = new Set<string>();
  for (const q of queries) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: q,
      gsrlimit: "12",
      prop: "imageinfo",
      iiprop: "url|mime|size|timestamp",
      iiurlwidth: "960",
    });
    const json = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    for (const img of pagesToImages(
      Object.values(json?.query?.pages ?? {}) as ApiPage[],
      "Wikimedia Commons"
    )) {
      const key = img.title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push(img);
    }
    await sleep(120);
  }
  return out;
}

async function wikipediaImages(d: Downtown): Promise<GalleryImage[]> {
  const stateFull = d.state === "PA" ? "Pennsylvania" : "Ohio";
  const titles = [`${d.name}, ${stateFull}`, `${d.name} Historic District`];
  const out: GalleryImage[] = [];
  const seen = new Set<string>();

  for (const title of titles) {
    const summary = await fetchJson(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!summary || summary.type?.includes("not_found")) continue;
    const pageTitle = summary.title || title;

    const src = summary.originalimage?.source || summary.thumbnail?.source;
    if (src && !seen.has(src) && !/\.svg($|\?)/i.test(src) && !skipTitle(pageTitle)) {
      seen.add(src);
      const year = yearFromTitle(pageTitle);
      out.push({
        url: absHttps(summary.originalimage?.source || src),
        thumbUrl: absHttps(summary.thumbnail?.source || src),
        title: pageTitle,
        source: "Wikipedia",
        kind: inferKind(pageTitle, year),
        credit: "Wikipedia",
        year,
      });
    }

    const media = await fetchJson(
      `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(pageTitle)}`
    );
    const fileTitles: string[] = [];
    for (const item of media?.items ?? []) {
      if (item.type !== "image") continue;
      const t = String(item.title || "");
      if (!t.startsWith("File:") || skipTitle(t)) continue;
      fileTitles.push(t);
      if (fileTitles.length >= 10) break;
    }
    if (fileTitles.length) {
      const params = new URLSearchParams({
        action: "query",
        format: "json",
        origin: "*",
        titles: fileTitles.join("|"),
        prop: "imageinfo",
        iiprop: "url|mime|size|timestamp",
        iiurlwidth: "960",
      });
      const json = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
      for (const img of pagesToImages(
        Object.values(json?.query?.pages ?? {}) as ApiPage[],
        "Wikipedia"
      )) {
        const key = img.title.toLowerCase();
        if (seen.has(key)) continue;
        seen.add(key);
        out.push(img);
      }
    }
    if (out.length >= 6) break;
    await sleep(100);
  }
  return out;
}

function scoreRelevance(img: GalleryImage, d: Downtown) {
  const t = img.title.toLowerCase();
  const name = d.name.toLowerCase();
  const county = d.county.toLowerCase();
  const stateFull = d.state === "PA" ? "pennsylvania" : "ohio";
  let s = 0;
  if (new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")},\\s*${stateFull}\\b`, "i").test(t)) s += 12;
  else if (new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i").test(t)) s += 6;
  if (t.includes("downtown") || t.includes("main street")) s += 4;
  if (img.kind === "streetscape") s += 3;
  if (img.kind === "building") s += 2;
  if (img.kind === "historic") s += 1;
  if (img.kind === "map") s -= 20;
  // Prefer recent street photos over archival
  if (img.year && img.year >= 2020) s += 12;
  else if (img.year && img.year >= 2015) s += 9;
  else if (img.year && img.year >= 2010) s += 6;
  else if (img.year && img.year >= 2000) s += 3;
  else if (img.year && img.year < 1980) s -= 2;
  if (img.kind === "historic") s -= 1;
  if (t.includes("stadium") || t.includes("penn state") || t.includes("freedom plaza")) s -= 15;
  if (/\binfantry|sewickley|civil war|regiment\b/i.test(t) && name === "beaver") s -= 25;
  if (/sewickley/i.test(t) && name === "beaver") s -= 25;
  const located = t.match(/\bin ([a-z .'-]+), ([a-z]+) county/i);
  if (located) {
    const place = located[1].trim();
    const mentionedCounty = located[2].toLowerCase();
    if (mentionedCounty !== county && place !== name) s -= 20;
  }
  if (new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")} (meadows|falls|creek)\\b`, "i").test(t)) {
    s -= 12;
  }
  return s;
}

function keepImage(img: GalleryImage, d: Downtown) {
  if (img.kind === "map") return false;
  return scoreRelevance(img, d) >= 3;
}

/** Keep recent street/building frames first, then a few historic. */
function pickBalanced(merged: GalleryImage[], d: Downtown, limit = 10): GalleryImage[] {
  const ranked = [...merged].sort((a, b) => scoreRelevance(b, d) - scoreRelevance(a, d));
  const recent = ranked.filter(isRecent);
  const historic = ranked.filter((img) => !isRecent(img));
  const out: GalleryImage[] = [];
  const seen = new Set<string>();
  const push = (img: GalleryImage) => {
    const key = img.title.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    out.push(img);
  };
  for (const img of recent) {
    if (out.length >= Math.min(7, limit)) break;
    push(img);
  }
  for (const img of historic) {
    if (out.length >= limit) break;
    push(img);
  }
  // Fill remaining from ranked if still thin
  for (const img of ranked) {
    if (out.length >= limit) break;
    push(img);
  }
  return out;
}

async function imagesFor(d: Downtown): Promise<GalleryImage[]> {
  const stateFull = d.state === "PA" ? "Pennsylvania" : "Ohio";
  const radius = Math.max(1500, d.radiusM + 800);

  const geo = await geoImages(d, radius);
  await sleep(80);
  const wiki = await wikipediaImages(d);
  await sleep(80);
  const text = await searchFileImages([
    `"${d.name}" "${stateFull}"`,
    `"${d.name}" ${stateFull} downtown`,
    `"${d.name}" ${stateFull} street`,
    // Explicit recent-year searches
    `"${d.name}" ${stateFull} 2024 OR 2023 OR 2022`,
    `"${d.name}" ${stateFull} 2021 OR 2020 OR 2019`,
    `"${d.name}" ${stateFull} 2018 OR 2017 OR 2016`,
  ]);

  const seen = new Set<string>();
  const merged: GalleryImage[] = [];
  for (const img of [...geo, ...wiki, ...text]) {
    if (!keepImage(img, d)) continue;
    const key = img.title.toLowerCase().replace(/\s+/g, " ");
    if (seen.has(key)) continue;
    seen.add(key);
    merged.push(img);
  }

  let photos = pickBalanced(merged, d, 10);

  if (photos.filter(isRecent).length < 3) {
    await sleep(100);
    const wider = await geoImages(d, 4500);
    for (const img of wider) {
      if (!keepImage(img, d)) continue;
      const key = img.title.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      seen.add(key);
      merged.push(img);
    }
    photos = pickBalanced(merged, d, 10);
  }

  if (photos.length === 0) return [placeholder(d)];
  return [...photos, placeholder(d)];
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

function writeCache(byId: Record<string, GalleryImage[]>) {
  fs.writeFileSync(
    OUT,
    JSON.stringify({
      generatedAt: new Date().toISOString(),
      count: Object.keys(byId).length,
      byId,
    })
  );
}

async function main() {
  const downtowns = inventory.downtowns;
  const forceIds = new Set(
    (process.env.FORCE_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const target = forceIds.size
    ? downtowns.filter((d) => forceIds.has(d.id))
    : downtowns;
  console.log(
    forceIds.size
      ? `Force-refreshing ${target.length} downtowns…`
      : `Prefetching gallery for ${target.length} downtowns (paced)…`
  );
  const byId: Record<string, GalleryImage[]> = {};

  // Always seed from existing cache when force-refreshing a subset
  if (fs.existsSync(OUT) && (process.env.RESUME === "1" || forceIds.size > 0)) {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
      Object.assign(byId, prev.byId || {});
      console.log(`Loaded ${Object.keys(byId).length} cached entries`);
    } catch {
      /* ignore */
    }
  }

  await mapPool(target, 2, async (d, i) => {
    const existing = byId[d.id];
    const existingReal = existing?.filter((x) => x.kind !== "map").length ?? 0;
    if (!forceIds.size && process.env.RESUME === "1" && existingReal >= 3) {
      return existing!;
    }

    const images = await imagesFor(d);
    byId[d.id] = images;
    if ((i + 1) % 10 === 0 || i === target.length - 1) {
      const real = images.filter((x) => x.kind !== "map").length;
      const recent = images.filter((x) => x.kind !== "map" && isRecent(x)).length;
      console.log(`  ${i + 1}/${target.length} — ${d.name}: ${real} photos (${recent} recent)`);
      writeCache(byId);
    }
    await sleep(220);
    return images;
  });

  writeCache(byId);
  const real = Object.values(byId).map((x) => x.filter((i) => i.kind !== "map"));
  const realCounts = real.map((x) => x.length);
  const recentCounts = real.map((x) => x.filter(isRecent).length);
  const avg = realCounts.reduce((a, b) => a + b, 0) / realCounts.length;
  const avgRecent = recentCounts.reduce((a, b) => a + b, 0) / recentCounts.length;
  const bytes = fs.statSync(OUT).size;
  console.log(`Wrote ${OUT} (${(bytes / 1024).toFixed(0)} KB)`);
  console.log(
    `≥3 photos: ${realCounts.filter((n) => n >= 3).length}/${Object.keys(byId).length} · avg ${avg.toFixed(1)} · avg recent ${avgRecent.toFixed(1)} · 0 photos: ${realCounts.filter((n) => n === 0).length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
