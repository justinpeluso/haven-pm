import { parseOverpassElements, poisToMetrics, type OsmPoi } from "./metrics";
import { getDowntownProfile } from "./profiles";
import type { DowntownBaseline, DowntownRecord, DowntownMetrics } from "./types";

const cache = new Map<string, { at: number; metrics: DowntownMetrics }>();
const TTL_MS = 1000 * 60 * 60 * 12;

const OVERPASS_URLS = [
  "https://overpass-api.de/api/interpreter",
  "https://overpass.kumi.systems/api/interpreter",
];

function buildQuery(d: DowntownRecord) {
  const { lat, lng } = d.center;
  const r = d.radiusM;
  return `
[out:json][timeout:20];
(
  node["shop"](around:${r},${lat},${lng});
  way["shop"](around:${r},${lat},${lng});
  node["amenity"~"restaurant|cafe|fast_food|bar|pub|bank|pharmacy|library|townhall|place_of_worship|theatre|clinic|community_centre|dentist"](around:${r},${lat},${lng});
  way["amenity"~"restaurant|cafe|fast_food|bar|pub|bank|pharmacy|library|townhall|place_of_worship|theatre|clinic|community_centre"](around:${r},${lat},${lng});
  node["office"](around:${r},${lat},${lng});
  node["craft"](around:${r},${lat},${lng});
  node["tourism"="museum"](around:${r},${lat},${lng});
  node["abandoned"="yes"](around:${r},${lat},${lng});
  node["disused"="yes"](around:${r},${lat},${lng});
);
out center tags 180;
`.trim();
}

async function fetchOverpass(query: string): Promise<OsmPoi[] | null> {
  for (const url of OVERPASS_URLS) {
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 14000);
      const res = await fetch(url, {
        method: "POST",
        body: `data=${encodeURIComponent(query)}`,
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        signal: ctrl.signal,
        next: { revalidate: 3600 },
      });
      clearTimeout(t);
      if (!res.ok) continue;
      const json = (await res.json()) as { elements?: Array<{ tags?: Record<string, string> }> };
      return parseOverpassElements(json.elements ?? []);
    } catch {
      // try next mirror
    }
  }
  return null;
}

function baselineMetrics(downtown: DowntownRecord): DowntownMetrics {
  const profile = getDowntownProfile(downtown);
  return {
    ...downtown.baseline,
    dataSource: "baseline",
    samplePois: profile.sampleBusinesses.map((b) => ({
      name: b.name,
      category: b.category,
      street: b.street,
      note: b.note,
      status: b.status ?? "open",
    })),
  };
}

export async function getDowntownMetrics(
  downtown: DowntownRecord,
  opts?: { refresh?: boolean }
): Promise<DowntownMetrics> {
  const cached = cache.get(downtown.id);
  if (!opts?.refresh && cached && Date.now() - cached.at < TTL_MS) {
    return cached.metrics;
  }

  const baseline: DowntownBaseline = downtown.baseline;
  const fallback = baselineMetrics(downtown);
  const pois = await fetchOverpass(buildQuery(downtown));
  if (!pois || pois.length < 5) {
    cache.set(downtown.id, { at: Date.now(), metrics: fallback });
    return fallback;
  }

  const computed = poisToMetrics(pois, baseline);
  // Prefer OSM names; if thin on names, merge profile samples
  const profile = getDowntownProfile(downtown);
  let samplePois = computed.samplePois;
  if (samplePois.filter((p) => p.name && p.name !== "Unnamed").length < 8) {
    const seen = new Set(samplePois.map((p) => p.name.toLowerCase()));
    for (const b of profile.sampleBusinesses) {
      if (seen.has(b.name.toLowerCase())) continue;
      samplePois.push({
        name: b.name,
        category: b.category,
        street: b.street,
        note: b.note,
        status: b.status ?? "open",
      });
      if (samplePois.length >= 24) break;
    }
  }

  const metrics: DowntownMetrics = {
    vibrancy: computed.vibrancy,
    vacancyEstimate: computed.vacancyEstimate,
    mix: computed.mix,
    poiCount: Math.max(computed.poiCount, downtown.baseline.poiCount),
    dataSource: "osm",
    samplePois,
  };
  cache.set(downtown.id, { at: Date.now(), metrics });
  return metrics;
}
