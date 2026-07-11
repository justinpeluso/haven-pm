import type { BusinessMix, DowntownBaseline, SamplePoi } from "./types";

export type OsmPoi = {
  name: string;
  category: keyof BusinessMix | "other";
  street?: string;
  phone?: string;
  website?: string;
  cuisine?: string;
  brand?: string;
  hours?: string;
  status: "open" | "reported_vacant" | "unknown";
  raw: string;
};

function bucket(tags: Record<string, string>): keyof BusinessMix | "other" {
  const shop = tags.shop;
  const amenity = tags.amenity;
  const office = tags.office;
  const craft = tags.craft;
  const tourism = tags.tourism;

  if (
    amenity === "restaurant" ||
    amenity === "cafe" ||
    amenity === "fast_food" ||
    amenity === "bar" ||
    amenity === "pub" ||
    amenity === "ice_cream" ||
    shop === "bakery" ||
    shop === "coffee" ||
    shop === "convenience"
  ) {
    return "food";
  }
  if (shop || craft) return "retail";
  if (
    amenity === "bank" ||
    amenity === "pharmacy" ||
    amenity === "clinic" ||
    amenity === "dentist" ||
    amenity === "hairdresser" ||
    amenity === "car_repair" ||
    shop === "hairdresser" ||
    shop === "beauty"
  ) {
    return "services";
  }
  if (
    amenity === "townhall" ||
    amenity === "library" ||
    amenity === "place_of_worship" ||
    amenity === "community_centre" ||
    amenity === "theatre" ||
    tourism === "museum"
  ) {
    return "civic";
  }
  if (office) return "office";
  return "other";
}

function toSample(p: OsmPoi): SamplePoi {
  return {
    name: p.name,
    category: p.category,
    street: p.street,
    phone: p.phone,
    website: p.website,
    cuisine: p.cuisine,
    brand: p.brand,
    hours: p.hours,
    status: p.status,
  };
}

export function poisToMetrics(
  pois: OsmPoi[],
  fallback: DowntownBaseline
): DowntownBaseline & { samplePois: SamplePoi[] } {
  const named = pois.filter((p) => p.name && p.name !== "Unnamed");
  const forDisplay = (named.length >= 6 ? named : pois).slice(0, 40);

  if (pois.length < 8) {
    return {
      ...fallback,
      samplePois: forDisplay.map(toSample),
    };
  }

  const counts: Record<keyof BusinessMix, number> = {
    food: 0,
    retail: 0,
    services: 0,
    civic: 0,
    office: 0,
    other: 0,
  };
  for (const p of pois) {
    counts[p.category === "other" ? "other" : p.category] += 1;
  }
  const total = Math.max(1, pois.length);
  const mix: BusinessMix = {
    food: Math.round((counts.food / total) * 100),
    retail: Math.round((counts.retail / total) * 100),
    services: Math.round((counts.services / total) * 100),
    civic: Math.round((counts.civic / total) * 100),
    office: Math.round((counts.office / total) * 100),
    other: 0,
  };
  mix.other = Math.max(
    0,
    100 - mix.food - mix.retail - mix.services - mix.civic - mix.office
  );

  const diversity = Object.values(counts).filter((c) => c > 0).length / 6;
  const foodRetail = (counts.food + counts.retail) / total;
  const densityScore = Math.min(40, pois.length / 3);
  const vibrancy = Math.round(
    Math.max(25, Math.min(95, densityScore + diversity * 35 + foodRetail * 30 + 10))
  );

  const vacantish = pois.filter((p) => p.status === "reported_vacant").length;
  const vacancyEstimate =
    Math.round(
      Math.max(
        4,
        Math.min(36, 18 - densityScore * 0.15 + (vacantish / total) * 40 + (1 - diversity) * 8)
      ) * 10
    ) / 10;

  return {
    vibrancy,
    vacancyEstimate,
    mix,
    poiCount: pois.length,
    samplePois: forDisplay.map(toSample),
  };
}

function streetFromTags(tags: Record<string, string>) {
  const num = tags["addr:housenumber"];
  const st = tags["addr:street"];
  if (num && st) return `${num} ${st}`;
  if (st) return st;
  return undefined;
}

export function parseOverpassElements(
  elements: Array<{ tags?: Record<string, string> }>
): OsmPoi[] {
  const out: OsmPoi[] = [];
  for (const el of elements) {
    const tags = el.tags ?? {};
    const vacant = tags.abandoned === "yes" || tags.disused === "yes" || tags.vacant === "yes";
    if (vacant) {
      out.push({
        name: tags.name || tags.brand || "Vacant / disused storefront",
        category: "other",
        street: streetFromTags(tags),
        status: "reported_vacant",
        raw: JSON.stringify(tags),
      });
      continue;
    }
    if (!tags.shop && !tags.amenity && !tags.office && !tags.craft && !tags.tourism) {
      continue;
    }
    out.push({
      name: tags.name || tags.brand || tags.shop || tags.amenity || tags.office || "Unnamed",
      category: bucket(tags),
      street: streetFromTags(tags),
      phone: tags.phone || tags["contact:phone"],
      website: tags.website || tags["contact:website"],
      cuisine: tags.cuisine,
      brand: tags.brand,
      hours: tags.opening_hours,
      status: "open",
      raw: JSON.stringify(tags),
    });
  }
  return out;
}
