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
};

type Downtown = (typeof inventory.downtowns)[number];

const UA = "HavenPM/1.0 (downtown gallery; https://github.com/justinpeluso/haven-pm)";
const PLACEHOLDER_URL = "/downtown-placeholder.svg";
const OUT = path.join(process.cwd(), "data", "downtown-gallery.json");

function inferKind(title: string): GalleryImage["kind"] {
  const t = title.toLowerCase();
  if (/historic|history|19\d{2}|postcard|vintage|old |archive|nrhp|historic district|nara/.test(t)) {
    return "historic";
  }
  if (/main street|downtown|streetscape|business|storefront|street|avenue|road|bridge/.test(t)) {
    return "streetscape";
  }
  if (/map|locator|diagram|satellite|iss\d|view of earth|from space|election/.test(t)) return "map";
  return "building";
}

function skipTitle(title: string) {
  return /coat of arms|locator map|flag of|seal of|logo|icon|diagram|\.svg\b|route map|county map|openstreetmap|wiki\s*mini\s*atlas|iss\d|view of earth|from space|astronaut|election|highlighted\.png|highlighted\.svg|dem\.|lidar/i.test(
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
  }>;
};

function pagesToImages(pages: ApiPage[], source: string): GalleryImage[] {
  const out: GalleryImage[] = [];
  for (const page of pages) {
    const info = page.imageinfo?.[0];
    const title = page.title || "";
    if (!info?.mime?.startsWith("image/") || info.mime.includes("svg")) continue;
    if (skipTitle(title)) continue;
    // Keep API thumb sizes exactly — rewriting to 640px breaks Wikimedia's allow-list
    const full = absHttps(info.url || info.thumburl || "");
    const thumb = absHttps(info.thumburl || info.url || "");
    if (!full || !thumb) continue;
    out.push({
      url: full,
      thumbUrl: thumb,
      title: title.replace(/^File:/, ""),
      source,
      kind: inferKind(title),
      credit: source,
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
    iiprop: "url|mime|size",
    iiurlwidth: "640",
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
      iiprop: "url|mime|size",
      iiurlwidth: "640",
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
      out.push({
        url: absHttps(summary.originalimage?.source || src),
        thumbUrl: absHttps(summary.thumbnail?.source || src),
        title: pageTitle,
        source: "Wikipedia",
        kind: inferKind(pageTitle),
        credit: "Wikipedia",
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
        iiprop: "url|mime|size",
        iiurlwidth: "640",
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
  if (img.kind === "historic") s += 2;
  if (img.kind === "building") s += 1;
  if (img.kind === "map") s -= 20;
  if (t.includes("stadium") || t.includes("penn state") || t.includes("freedom plaza")) s -= 15;
  // Wrong municipality: "in OtherTown, Other County"
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

async function imagesFor(d: Downtown): Promise<GalleryImage[]> {
  const stateFull = d.state === "PA" ? "Pennsylvania" : "Ohio";
  const radius = Math.max(1500, d.radiusM + 800);

  // Sequential sources — fewer parallel hits on Commons
  const geo = await geoImages(d, radius);
  await sleep(80);
  const wiki = await wikipediaImages(d);
  await sleep(80);
  const text = await searchFileImages([
    `"${d.name}" "${stateFull}"`,
    `"${d.name}" ${stateFull} downtown`,
    `"${d.name}" ${stateFull} street`,
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

  merged.sort((a, b) => scoreRelevance(b, d) - scoreRelevance(a, d));
  let photos = merged.slice(0, 10);

  if (photos.length < 3) {
    await sleep(100);
    const wider = await geoImages(d, 4500);
    for (const img of wider) {
      if (!keepImage(img, d)) continue;
      const key = img.title.toLowerCase().replace(/\s+/g, " ");
      if (seen.has(key)) continue;
      seen.add(key);
      photos.push(img);
      if (photos.length >= 8) break;
    }
    photos.sort((a, b) => scoreRelevance(b, d) - scoreRelevance(a, d));
    photos = photos.slice(0, 10);
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
  console.log(`Prefetching gallery for ${downtowns.length} downtowns (paced)…`);
  const byId: Record<string, GalleryImage[]> = {};

  // Resume support: keep existing good entries if re-run mid-flight
  if (fs.existsSync(OUT) && process.env.RESUME === "1") {
    try {
      const prev = JSON.parse(fs.readFileSync(OUT, "utf8"));
      Object.assign(byId, prev.byId || {});
      console.log(`Resuming with ${Object.keys(byId).length} cached entries`);
    } catch {
      /* ignore */
    }
  }

  await mapPool(downtowns, 2, async (d, i) => {
    const existing = byId[d.id];
    const existingReal = existing?.filter((x) => x.kind !== "map").length ?? 0;
    if (process.env.RESUME === "1" && existingReal >= 3) {
      return existing!;
    }

    const images = await imagesFor(d);
    byId[d.id] = images;
    if ((i + 1) % 10 === 0 || i === downtowns.length - 1) {
      const real = images.filter((x) => x.kind !== "map").length;
      console.log(`  ${i + 1}/${downtowns.length} — ${d.name}: ${real} photos`);
      writeCache(byId);
    }
    await sleep(220);
    return images;
  });

  writeCache(byId);
  const realCounts = Object.values(byId).map((x) => x.filter((i) => i.kind !== "map").length);
  const avg = realCounts.reduce((a, b) => a + b, 0) / realCounts.length;
  const bytes = fs.statSync(OUT).size;
  console.log(`Wrote ${OUT} (${(bytes / 1024).toFixed(0)} KB)`);
  console.log(
    `≥3 photos: ${realCounts.filter((n) => n >= 3).length}/${downtowns.length} · ≥5: ${realCounts.filter((n) => n >= 5).length} · avg ${avg.toFixed(1)} · 0 photos: ${realCounts.filter((n) => n === 0).length}`
  );
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
