export type BusinessMix = {
  food: number;
  retail: number;
  services: number;
  civic: number;
  office: number;
  other: number;
};

export type DowntownBaseline = {
  vibrancy: number;
  vacancyEstimate: number;
  mix: BusinessMix;
  poiCount: number;
};

export type DowntownRecord = {
  id: string;
  name: string;
  state: "PA" | "OH";
  county: string;
  milesFromAllegheny: number;
  downtownName: string;
  center: { lat: number; lng: number };
  radiusM: number;
  tags: string[];
  baseline: DowntownBaseline;
};

export type DowntownInventoryFile = {
  generatedAt: string;
  alleghenyCenter: { lat: number; lng: number };
  radiusMiles: number;
  count: number;
  downtowns: DowntownRecord[];
};

export type DataSource = "baseline" | "osm";

export type SamplePoi = {
  name: string;
  category: string;
  street?: string;
  phone?: string;
  website?: string;
  cuisine?: string;
  brand?: string;
  hours?: string;
  note?: string;
  status?: "open" | "reported_vacant" | "unknown";
};

export type DowntownMetrics = DowntownBaseline & {
  dataSource: DataSource;
  samplePois?: SamplePoi[];
};

export type UsPeer = {
  id: string;
  name: string;
  state: string;
  vibrancy: number;
  vacancyEstimate: number;
  mix: BusinessMix;
  note: string;
};
