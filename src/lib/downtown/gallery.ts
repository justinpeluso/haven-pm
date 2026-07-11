import galleryCache from "../../../data/downtown-gallery.json";
import type { DowntownRecord } from "./types";
import { listDowntowns, getDowntownById } from "./inventory";

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

type GalleryCacheFile = {
  generatedAt: string;
  count: number;
  byId: Record<string, GalleryImage[]>;
};

const cache = galleryCache as GalleryCacheFile;
const PLACEHOLDER_URL = "/downtown-placeholder.svg";

function absHttps(u: string) {
  if (!u) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("http://")) return `https://${u.slice(7)}`;
  return u;
}

function normalizeImage(img: GalleryImage): GalleryImage {
  // Drop legacy giant data-URL placeholders
  if (img.url.startsWith("data:")) {
    return {
      ...img,
      url: PLACEHOLDER_URL,
      thumbUrl: PLACEHOLDER_URL,
      kind: "map",
      source: "Haven",
    };
  }
  return {
    ...img,
    url: absHttps(img.url),
    thumbUrl: absHttps(img.thumbUrl || img.url),
  };
}

function placeholder(d: DowntownRecord): GalleryImage {
  return {
    url: PLACEHOLDER_URL,
    thumbUrl: PLACEHOLDER_URL,
    title: `${d.name} downtown`,
    source: "Haven",
    kind: "map",
    credit: "Placeholder",
  };
}

/** Instant — reads prefetched cache. No network. */
export function getCachedImagesForDowntown(id: string): GalleryImage[] {
  const d = getDowntownById(id);
  const raw = cache.byId[id] ?? [];
  const images = raw.map(normalizeImage).filter((img) => Boolean(img.url));
  if (images.length > 0) {
    // Ensure a local fallback exists for SafeImg
    if (!images.some((i) => i.url === PLACEHOLDER_URL || i.kind === "map")) {
      return d ? [...images, placeholder(d)] : images;
    }
    return images;
  }
  if (d) return [placeholder(d)];
  return [];
}

export function listGalleryCards(): DowntownGalleryCard[] {
  return listDowntowns().map((d) => ({
    id: d.id,
    name: d.name,
    state: d.state,
    county: d.county,
    downtownName: d.downtownName,
    milesFromAllegheny: d.milesFromAllegheny,
    tags: d.tags,
    vibrancy: d.baseline.vibrancy,
    images: getCachedImagesForDowntown(d.id),
  }));
}

export function searchGalleryCards(
  cards: DowntownGalleryCard[],
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

/** Kept for API compatibility — prefers cache, no live fetch by default. */
export async function getImagesForDowntown(d: DowntownRecord): Promise<GalleryImage[]> {
  return getCachedImagesForDowntown(d.id);
}

export function getGalleryCacheMeta() {
  return {
    generatedAt: cache.generatedAt,
    count: cache.count,
  };
}
