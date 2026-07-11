import intelCache from "../../../data/downtown-intel.json";
import type { DowntownRecord } from "./types";

export type DowntownIntel = {
  wikiTitle?: string;
  wikiUrl?: string;
  summary: string;
  history: string;
  demographicsNarrative: string;
  foundedYear?: number;
  population?: {
    census2020?: number;
    estimate2023?: number;
    source: string;
  };
  landAreaSqMi?: number;
  waterAreaSqMi?: number;
  densityPerSqMi?: number;
  elevationFt?: number;
  geoid?: string;
  placeName?: string;
  facts: string[];
};

type IntelCacheFile = {
  generatedAt: string;
  count: number;
  byId: Record<string, DowntownIntel>;
};

const cache = intelCache as IntelCacheFile;

function fallbackIntel(d: DowntownRecord): DowntownIntel {
  const stateFull = d.state === "PA" ? "Pennsylvania" : "Ohio";
  return {
    summary: `${d.name} is in ${d.county} County, ${stateFull}, about ${d.milesFromAllegheny} miles from Allegheny County. Market Intel isolates its commercial core as ${d.downtownName}.`,
    history: `${d.name}'s walkable business blocks formed around local trade, industry, and civic life in ${d.county} County. The CBD tracked here (${d.downtownName}) is the historic commercial cluster — distinct from highway strip retail outside the core.`,
    demographicsNarrative: `Detailed Census ACS tables are not cached for this place yet. Use the CBD metrics below with county and regional context when sizing demand.`,
    facts: [
      `${d.downtownName}`,
      `${d.county} County, ${d.state}`,
      `${d.milesFromAllegheny} mi from Allegheny`,
      ...d.tags.map((t) => t.replace(/_/g, " ")),
    ],
  };
}

/** Instant — reads prefetched Wikipedia + Census cache. */
export function getDowntownIntel(d: DowntownRecord): DowntownIntel {
  const hit = cache.byId[d.id];
  if (hit?.summary) return hit;
  return fallbackIntel(d);
}

export function getIntelCacheMeta() {
  return { generatedAt: cache.generatedAt, count: cache.count };
}
