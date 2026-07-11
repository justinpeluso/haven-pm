import type { DowntownRecord } from "./types";
import { listDowntowns } from "./inventory";

export type GalleryImageKind = "historic" | "streetscape" | "building" | "map";

export type GalleryImage = {
  url: string;
  thumbUrl: string;
  title: string;
  source: string;
  kind: GalleryImageKind;
  credit?: string;
};

export type DowntownGalleryCard = {
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

const memoryCache = new Map<string, { at: number; images: GalleryImage[] }>();
const TTL_MS = 1000 * 60 * 60 * 24;

function mapFallback(d: DowntownRecord): GalleryImage {
  const center = `${d.center.lat},${d.center.lng}`;
  const url = `https://staticmap.openstreetmap.de/staticmap.php?center=${center}&zoom=16&size=800x520&maptype=mapnik&markers=${center},red-pushpin`;
  return {
    url,
    thumbUrl: `https://staticmap.openstreetmap.de/staticmap.php?center=${center}&zoom=16&size=480x320&maptype=mapnik&markers=${center},red-pushpin`,
    title: `${d.name} downtown core map`,
    source: "OpenStreetMap",
    kind: "map",
    credit: "© OpenStreetMap contributors",
  };
}

function inferKind(title: string): GalleryImageKind {
  const t = title.toLowerCase();
  if (/historic|history|1900|1910|1920|1930|1940|1950|postcard|vintage|old /.test(t)) {
    return "historic";
  }
  if (/main street|downtown|streetscape|business district|storefront/.test(t)) {
    return "streetscape";
  }
  return "building";
}

type WikiPage = {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    mime?: string;
    extmetadata?: {
      Artist?: { value?: string };
      LicenseShortName?: { value?: string };
      ImageDescription?: { value?: string };
    };
  }>;
};

function stripHtml(s: string) {
  return s.replace(/<[^>]+>/g, "").trim();
}

async function searchCommons(query: string, limit = 6): Promise<GalleryImage[]> {
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    generator: "search",
    gsrnamespace: "6",
    gsrsearch: query,
    gsrlimit: String(limit),
    prop: "imageinfo",
    iiprop: "url|mime|extmetadata|size",
    iiurlwidth: "800",
  });

  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 9000);
  try {
    const res = await fetch(`https://commons.wikimedia.org/w/api.php?${params}`, {
      signal: ctrl.signal,
      next: { revalidate: 86400 },
      headers: { "User-Agent": "HavenPM/1.0 (downtown gallery; local property intel)" },
    });
    if (!res.ok) return [];
    const json = (await res.json()) as { query?: { pages?: Record<string, WikiPage> } };
    const pages = Object.values(json.query?.pages ?? {});
    const out: GalleryImage[] = [];
    for (const page of pages) {
      const info = page.imageinfo?.[0];
      if (!info?.url || !info.mime?.startsWith("image/")) continue;
      if (info.mime.includes("svg")) continue;
      const title = (page.title || "").replace(/^File:/, "");
      // Skip diagrams / maps / coats of arms when possible
      if (/coat of arms|locator map|flag of|seal of|logo|icon|svg/i.test(title)) continue;
      const credit = info.extmetadata?.Artist?.value
        ? stripHtml(info.extmetadata.Artist.value)
        : "Wikimedia Commons";
      out.push({
        url: info.url,
        thumbUrl: info.thumburl || info.url,
        title,
        source: "Wikimedia Commons",
        kind: inferKind(title),
        credit,
      });
    }
    return out;
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function getImagesForDowntown(d: DowntownRecord): Promise<GalleryImage[]> {
  const cached = memoryCache.get(d.id);
  if (cached && Date.now() - cached.at < TTL_MS) return cached.images;

  const stateName = d.state === "PA" ? "Pennsylvania" : "Ohio";
  const queries = [
    `"${d.name}" ${stateName} downtown`,
    `"${d.name}" ${stateName} "Main Street"`,
    `"${d.name}" ${stateName} historic`,
  ];

  const collected: GalleryImage[] = [];
  const seen = new Set<string>();
  for (const q of queries) {
    const batch = await searchCommons(q, 5);
    for (const img of batch) {
      if (seen.has(img.url)) continue;
      seen.add(img.url);
      collected.push(img);
      if (collected.length >= 8) break;
    }
    if (collected.length >= 8) break;
  }

  // Prefer streetscape/historic/building ordering
  collected.sort((a, b) => {
    const rank = (k: GalleryImageKind) =>
      k === "streetscape" ? 0 : k === "historic" ? 1 : k === "building" ? 2 : 3;
    return rank(a.kind) - rank(b.kind);
  });

  const images = [...collected, mapFallback(d)].slice(0, 9);
  memoryCache.set(d.id, { at: Date.now(), images });
  return images;
}

export function listGalleryCards(): Omit<DowntownGalleryCard, "images">[] {
  return listDowntowns().map((d) => ({
    id: d.id,
    name: d.name,
    state: d.state,
    county: d.county,
    downtownName: d.downtownName,
    milesFromAllegheny: d.milesFromAllegheny,
    tags: d.tags,
    vibrancy: d.baseline.vibrancy,
  }));
}

export function searchGalleryCards(
  cards: Omit<DowntownGalleryCard, "images">[],
  q: string,
  state?: "ALL" | "PA" | "OH"
) {
  let list = cards;
  if (state && state !== "ALL") list = list.filter((c) => c.state === state);
  const query = q.trim().toLowerCase();
  if (!query) return list;
  return list.filter((c) =>
    [c.name, c.downtownName, c.county, c.state, ...c.tags].join(" ").toLowerCase().includes(query)
  );
}
