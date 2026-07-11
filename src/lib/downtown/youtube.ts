import youtubeCache from "../../../data/downtown-youtube.json";

export type DowntownYoutube = {
  videoId: string;
  title: string;
  channelTitle: string;
  url: string;
  query: string;
};

type YoutubeCacheFile = {
  generatedAt: string;
  count: number;
  byId: Record<string, DowntownYoutube>;
};

const cache = youtubeCache as YoutubeCacheFile;

/** Instant — reads prefetched cache. Returns null if missing. */
export function getDowntownYoutube(id: string): DowntownYoutube | null {
  const hit = cache.byId?.[id];
  if (!hit?.videoId) return null;
  return hit;
}

export function getYoutubeCacheMeta() {
  return { generatedAt: cache.generatedAt, count: cache.count };
}
