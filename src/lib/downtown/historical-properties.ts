import cache from "../../../data/historical-properties.json";

export type HistoricalImage = {
  url: string;
  thumbUrl: string;
  title: string;
  credit?: string;
  kind?: "streetscape" | "building" | "historic" | "map";
  sourceUrl?: string;
};

export type HistoricalSource = {
  title: string;
  url: string;
  publisher?: string;
  notes?: string;
};

export type HistoricalProperty = {
  id: string;
  slug: string;
  name: string;
  subtitle: string;
  status: string;
  heroImage: HistoricalImage;
  images: HistoricalImage[];
  address: {
    street: string;
    streetAlt?: string;
    city: string;
    borough: string;
    county: string;
    state: string;
    zip: string;
    zipNote?: string;
    coordinates?: { lat: number; lon: number; precision?: string };
  };
  parcelIdentity: {
    summary: string;
    municipality: string;
    cbdCorridor: string;
    historicDistrict: string;
    localHarb?: string;
    knownOccupants: { name: string; role: string; era: string }[];
    caveats?: string[];
  };
  structureHistory: {
    buildEra: string;
    originalUse: string;
    currentUse: string;
    styleNotes: string;
    alterations: string[];
    districtFabric?: string;
  };
  landLotPlat: {
    summary: string;
    platYear: number;
    surveyor: string;
    lotTypes: string;
    thirdStreetRole: string;
    publicSquaresNearby: string[];
    cbdEvolution: string[];
  };
  earlyOwnersOccupants: {
    summary: string;
    notableContextOccupantsOnCorridor: string[];
    researchGaps: string[];
  };
  indigenousPeoples: {
    summary: string;
    peoples: { name: string; notes: string }[];
    placesAndNames: string[];
    ethicalNote?: string;
  };
  fortsAndWars: {
    summary: string;
    frenchAndIndianWar: string[];
    revolutionaryWarFrontier: string[];
    nearby: string[];
  };
  historicDistrict: {
    name: string;
    nrhpRef: string;
    listed: string;
    areaAcres: number;
    periodOfSignificance: string;
    styles: string[];
    resources: string;
    boundariesNote: string;
    phmcMarker?: string;
    localOrdinance?: string;
    relevanceToProperty: string;
  };
  timeline: { year: string; event: string }[];
  sources: HistoricalSource[];
  tags: string[];
};

type CacheFile = {
  generatedAt: string;
  count: number;
  properties: HistoricalProperty[];
};

const data = cache as CacheFile;

/** Instant — reads prefetched cache. No network. */
export function listHistoricalProperties(): HistoricalProperty[] {
  return data.properties ?? [];
}

export function getHistoricalProperty(id: string): HistoricalProperty | null {
  return data.properties.find((p) => p.id === id || p.slug === id) ?? null;
}

export function historicalPropertiesGeneratedAt(): string {
  return data.generatedAt;
}
