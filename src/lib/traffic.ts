/** Pittsburgh traffic via 511PA (PennDOT) — free, no API key. https://www.511pa.com */

export type TrafficKind =
  | "incident"
  | "closure"
  | "condition"
  | "roadwork"
  | "sign";

export interface TrafficUpdate {
  id: string;
  kind: TrafficKind;
  title: string;
  description: string;
  roadway: string | null;
  lat: number;
  lon: number;
  milesFromDowntown: number;
  updatedAt: string | null;
}

export interface TrafficSnapshot {
  locationLabel: string;
  updates: TrafficUpdate[];
  fetchedAt: string;
  source: string;
}

const BASE = "https://www.511pa.com";
const DOWNTOWN = { lat: 40.4406, lon: -79.9959 };
const BBOX = { latMin: 40.2, latMax: 40.6, lonMin: -80.3, lonMax: -79.6 };

const LAYERS: { layer: string; kind: TrafficKind; priority: number; limit: number }[] = [
  { layer: "MajorRouteIncident", kind: "incident", priority: 1, limit: 8 },
  { layer: "Incidents", kind: "incident", priority: 1, limit: 8 },
  { layer: "OtherRouteIncident", kind: "incident", priority: 2, limit: 6 },
  { layer: "MajorRouteClosure", kind: "closure", priority: 1, limit: 8 },
  { layer: "Closures", kind: "closure", priority: 1, limit: 8 },
  { layer: "OtherRouteClosure", kind: "closure", priority: 2, limit: 6 },
  { layer: "RoadConditionIncident", kind: "condition", priority: 3, limit: 4 },
  { layer: "ActiveRoadwork", kind: "roadwork", priority: 4, limit: 4 },
  { layer: "MessageSigns", kind: "sign", priority: 2, limit: 6 },
];

type IconItem = { itemId: string; lat: number; lon: number; layer: string; kind: TrafficKind; priority: number };

let cache: { at: number; data: TrafficSnapshot } | null = null;
const CACHE_MS = 15_000;

function haversineMiles(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const toRad = (d: number) => (d * Math.PI) / 180;
  const R = 3958.8;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function inBbox(lat: number, lon: number): boolean {
  return (
    lat >= BBOX.latMin &&
    lat <= BBOX.latMax &&
    lon >= BBOX.lonMin &&
    lon <= BBOX.lonMax
  );
}

function cleanSignMessage(raw: unknown): string {
  if (typeof raw !== "string") return "";
  if (!raw || raw === "NO_MESSAGE") return "";
  return raw
    .replace(/\[np\]/gi, " · ")
    .replace(/\[[^\]]+\]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

async function fetchJson(path: string): Promise<unknown> {
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      Accept: "application/json",
      "User-Agent": "HavenPM/1.0 (local dashboard)",
    },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`511PA ${path} → ${res.status}`);
  return res.json();
}

async function fetchIcons(layer: string, kind: TrafficKind, priority: number): Promise<IconItem[]> {
  try {
    const data = (await fetchJson(`/map/mapIcons/${layer}`)) as {
      item2?: { itemId: string | number; location?: number[] }[];
    };
    const items = data.item2 ?? [];
    return items
      .map((it) => {
        const loc = it.location;
        if (!loc || loc.length < 2) return null;
        const lat = Number(loc[0]);
        const lon = Number(loc[1]);
        if (!Number.isFinite(lat) || !Number.isFinite(lon) || !inBbox(lat, lon)) return null;
        return {
          itemId: String(it.itemId),
          lat,
          lon,
          layer,
          kind,
          priority,
        };
      })
      .filter((x): x is IconItem => x != null);
  } catch {
    return [];
  }
}

function titleFor(kind: TrafficKind, roadway: string | null, eventType: string | null): string {
  const road = roadway?.replace(/\s+/g, " ").trim() || "Local road";
  if (kind === "sign") return `${road} message sign`;
  if (kind === "closure") return `${road} closure`;
  if (kind === "roadwork") return `${road} roadwork`;
  if (kind === "condition") return `${road} conditions`;
  if (eventType) return `${road} · ${eventType}`;
  return `${road} incident`;
}

async function fetchDetail(item: IconItem): Promise<TrafficUpdate | null> {
  try {
    const data = (await fetchJson(`/map/data/${item.layer}/${item.itemId}`)) as Record<
      string,
      unknown
    >;

    let description = "";
    let roadway: string | null = null;
    let eventType: string | null = null;
    let updatedAt: string | null = null;

    if (item.kind === "sign") {
      description = cleanSignMessage(data.messages);
      if (!description) return null;
      roadway =
        (typeof data.roadwayName === "string" && data.roadwayName) ||
        (typeof data.description === "string" && data.description) ||
        null;
      updatedAt =
        (typeof data.lastUpdate === "string" && data.lastUpdate) ||
        (typeof data.lastComm === "string" && data.lastComm) ||
        null;
    } else {
      description =
        (typeof data.description === "string" && data.description.trim()) ||
        (typeof data.title === "string" && data.title.trim()) ||
        "";
      if (!description) return null;
      roadway =
        (typeof data.roadway === "string" && data.roadway.trim()) ||
        (typeof data.roadwayName === "string" && data.roadwayName.trim()) ||
        null;
      eventType =
        (typeof data.eventType === "string" && data.eventType) ||
        (typeof data.atisType === "string" && data.atisType) ||
        null;
      updatedAt =
        (typeof data.lastUpdate === "string" && data.lastUpdate) ||
        (typeof data.startDate === "string" && data.startDate) ||
        null;
    }

    return {
      id: `${item.layer}-${item.itemId}`,
      kind: item.kind,
      title: titleFor(item.kind, roadway, eventType),
      description,
      roadway,
      lat: item.lat,
      lon: item.lon,
      milesFromDowntown: Math.round(haversineMiles(DOWNTOWN.lat, DOWNTOWN.lon, item.lat, item.lon) * 10) / 10,
      updatedAt,
    };
  } catch {
    return null;
  }
}

export async function fetchPittsburghTraffic(): Promise<TrafficSnapshot> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  const iconLists = await Promise.all(
    LAYERS.map((l) => fetchIcons(l.layer, l.kind, l.priority))
  );

  const candidates: IconItem[] = [];
  LAYERS.forEach((cfg, i) => {
    const sorted = iconLists[i]
      .map((it) => ({
        ...it,
        dist: haversineMiles(DOWNTOWN.lat, DOWNTOWN.lon, it.lat, it.lon),
      }))
      .sort((a, b) => a.dist - b.dist)
      .slice(0, cfg.limit);
    candidates.push(...sorted);
  });

  // Prefer closer / higher-priority items; cap detail fetches
  candidates.sort((a, b) => {
    if (a.priority !== b.priority) return a.priority - b.priority;
    return (
      haversineMiles(DOWNTOWN.lat, DOWNTOWN.lon, a.lat, a.lon) -
      haversineMiles(DOWNTOWN.lat, DOWNTOWN.lon, b.lat, b.lon)
    );
  });

  const toFetch = candidates.slice(0, 24);
  const details = await Promise.all(toFetch.map(fetchDetail));
  const updates = details
    .filter((u): u is TrafficUpdate => u != null)
    .sort((a, b) => {
      const kindRank: Record<TrafficKind, number> = {
        incident: 0,
        closure: 1,
        sign: 2,
        condition: 3,
        roadwork: 4,
      };
      if (kindRank[a.kind] !== kindRank[b.kind]) return kindRank[a.kind] - kindRank[b.kind];
      return a.milesFromDowntown - b.milesFromDowntown;
    })
    .slice(0, 12);

  const snapshot: TrafficSnapshot = {
    locationLabel: "Pittsburgh, PA",
    updates,
    fetchedAt: new Date().toISOString(),
    source: "511PA",
  };

  cache = { at: Date.now(), data: snapshot };
  return snapshot;
}
