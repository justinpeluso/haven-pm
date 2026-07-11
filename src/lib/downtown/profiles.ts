import type { BusinessMix, DowntownRecord } from "./types";
import { getDowntownIntel, type DowntownIntel } from "./intel";

export type SampleBusiness = {
  name: string;
  category: keyof BusinessMix | "other";
  street?: string;
  note?: string;
  status?: "open" | "reported_vacant" | "unknown";
};

export type DowntownProfile = {
  isolationBrief: string;
  primaryCorridors: string[];
  landmarks: string[];
  sampleBusinesses: SampleBusiness[];
  marketNotes: string;
  /** Expanded place overview (Wikipedia lead + CBD framing). */
  overview: string;
  history: string;
  demographicsNarrative: string;
  demographics: {
    population2020?: number;
    population2023?: number;
    landAreaSqMi?: number;
    waterAreaSqMi?: number;
    densityPerSqMi?: number;
    elevationFt?: number;
    foundedYear?: number;
    placeName?: string;
    source?: string;
  };
  facts: string[];
  wikiUrl?: string;
  wikiTitle?: string;
};

const FOOD = [
  "Riverbend Cafe",
  "Third Street Grill",
  "Millhouse Bakery",
  "Station Coffee Co.",
  "Bridgeview Pizza",
  "Market Street Diner",
  "Oak & Vine",
  "Harbor Spoon",
];
const RETAIL = [
  "Main Street Mercantile",
  "Heritage Books & Gifts",
  "Corner Hardware",
  "Riverfront Outfitters",
  "Vintage Block Shop",
  "Borough Boutique",
  "Keystone Supply",
];
const SERVICES = [
  "Liberty Barbers",
  "Allegheny Family Dental",
  "First National Branch",
  "Summit Insurance",
  "Town Square Salon",
  "Penn Care Pharmacy",
];
const CIVIC = [
  "Borough Building",
  "Public Library",
  "Community Theatre",
  "Historic Society Museum",
  "United Methodist Church",
];
const OFFICE = [
  "Chartiers Law Offices",
  "Monongahela Accounting",
  "River City Realty",
  "Keystone Title Co.",
];

function hash(s: string) {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function pick<T>(arr: T[], h: number, i: number): T {
  return arr[(h + i * 17) % arr.length]!;
}

function streetFor(d: DowntownRecord, h: number) {
  const base = d.downtownName.split(/[/·]/)[0]?.trim() || "Main Street";
  const num = 100 + (h % 80) * 2;
  return `${num} ${base.replace(/Downtown|Business District|Corridor|Village/gi, "").trim() || "Main Street"}`;
}

/** Deterministic sample directory so every CBD has named businesses without OSM. */
export function generateSampleBusinesses(d: DowntownRecord): SampleBusiness[] {
  const h = hash(d.id);
  const mix = d.baseline.mix;
  const out: SampleBusiness[] = [];
  const plan: [keyof BusinessMix, number, string[]][] = [
    ["food", Math.max(2, Math.round(mix.food / 12)), FOOD],
    ["retail", Math.max(2, Math.round(mix.retail / 12)), RETAIL],
    ["services", Math.max(2, Math.round(mix.services / 14)), SERVICES],
    ["civic", Math.max(1, Math.round(mix.civic / 16)), CIVIC],
    ["office", Math.max(1, Math.round(mix.office / 16)), OFFICE],
  ];
  let i = 0;
  for (const [cat, count, pool] of plan) {
    for (let n = 0; n < count; n++) {
      out.push({
        name: `${pick(pool, h, i)} of ${d.name}`,
        category: cat,
        street: streetFor(d, h + i),
        status: (h + i) % 11 === 0 ? "reported_vacant" : "open",
        note:
          cat === "civic"
            ? "Anchor civic use in the CBD core"
            : cat === "food"
              ? "Foot-traffic generator on the primary corridor"
              : undefined,
      });
      i++;
    }
  }
  return out.slice(0, 14);
}

function defaultProfile(d: DowntownRecord): Omit<
  DowntownProfile,
  | "overview"
  | "history"
  | "demographicsNarrative"
  | "demographics"
  | "facts"
  | "wikiUrl"
  | "wikiTitle"
> {
  const corridors = [d.downtownName];
  if (!/main street/i.test(d.downtownName)) corridors.push("Main Street");
  return {
    isolationBrief: `${d.name}'s commercial core is isolated as ${d.downtownName} — a roughly ${(d.radiusM / 1609.34).toFixed(2)}-mile walkable district centered on the historic business block. Tags: ${d.tags.map((t) => t.replace(/_/g, " ")).join(", ")}.`,
    primaryCorridors: corridors.slice(0, 3),
    landmarks: [`${d.name} Municipal Building`, `${d.county} County presence`],
    sampleBusinesses: generateSampleBusinesses(d),
    marketNotes: `${d.milesFromAllegheny} mi from Allegheny County center. Baseline vibrancy ${d.baseline.vibrancy} with an estimated storefront vacancy near ${d.baseline.vacancyEstimate}%.`,
  };
}

function enrichWithIntel(
  d: DowntownRecord,
  base: Omit<
    DowntownProfile,
    | "overview"
    | "history"
    | "demographicsNarrative"
    | "demographics"
    | "facts"
    | "wikiUrl"
    | "wikiTitle"
  >
): DowntownProfile {
  const intel: DowntownIntel = getDowntownIntel(d);
  const overview = [base.isolationBrief, intel.summary].filter(Boolean).join("\n\n");
  return {
    ...base,
    overview,
    history: intel.history,
    demographicsNarrative: intel.demographicsNarrative,
    demographics: {
      population2020: intel.population?.census2020,
      population2023: intel.population?.estimate2023,
      landAreaSqMi: intel.landAreaSqMi,
      waterAreaSqMi: intel.waterAreaSqMi,
      densityPerSqMi: intel.densityPerSqMi,
      elevationFt: intel.elevationFt,
      foundedYear: intel.foundedYear,
      placeName: intel.placeName,
      source: intel.population?.source,
    },
    facts: intel.facts?.length ? intel.facts : [
      `${d.downtownName}`,
      `${d.county} County, ${d.state}`,
      `${d.milesFromAllegheny} mi from Allegheny`,
    ],
    wikiUrl: intel.wikiUrl,
    wikiTitle: intel.wikiTitle,
  };
}

type CuratedBase = Omit<
  DowntownProfile,
  | "overview"
  | "history"
  | "demographicsNarrative"
  | "demographics"
  | "facts"
  | "wikiUrl"
  | "wikiTitle"
>;

/** Hand-curated isolation briefs for key downtowns (e.g. Beaver). */
const CURATED: Record<string, CuratedBase> = {
  "beaver-pa": {
    isolationBrief:
      "Beaver Borough’s downtown is isolated along Third Street between the Beaver County Courthouse block and the Ohio River bluff. The CBD is a compact county-seat main street: civic buildings, professional offices, restaurants, and specialty retail in a walkable grid—not the highway commercial strips outside the borough.",
    primaryCorridors: [
      "Third Street (primary retail spine)",
      "Insurance Street / Court area",
      "River Road edge approaches",
    ],
    landmarks: [
      "Beaver County Courthouse",
      "Beaver Area Memorial Library vicinity",
      "Historic district storefronts on Third",
    ],
    sampleBusinesses: [
      {
        name: "Cafe 123",
        category: "food",
        street: "Third Street",
        note: "Long-running downtown cafe / meeting spot",
        status: "open",
      },
      {
        name: "The Wooden Angel",
        category: "food",
        street: "Third Street",
        note: "Destination dining drawing regional traffic",
        status: "open",
      },
      {
        name: "Beaver County Courthouse offices",
        category: "civic",
        street: "Third Street / Court",
        note: "Weekday foot traffic anchor",
        status: "open",
      },
      {
        name: "First National Bank branch",
        category: "services",
        street: "Third Street",
        status: "open",
      },
      {
        name: "Beaver Bookstore & Gifts",
        category: "retail",
        street: "Third Street",
        status: "open",
      },
      {
        name: "Town Square Barbers",
        category: "services",
        street: "Insurance Street",
        status: "open",
      },
      {
        name: "River City Realty",
        category: "office",
        street: "Third Street",
        status: "open",
      },
      {
        name: "Vacant storefront (reported)",
        category: "other",
        street: "Third Street mid-block",
        status: "reported_vacant",
        note: "Track for re-tenanting / facade opportunity",
      },
      {
        name: "Beaver Pharmacy",
        category: "services",
        street: "Third Street",
        status: "open",
      },
      {
        name: "Mill Street Antiques",
        category: "retail",
        street: "Near Third / Mill",
        status: "open",
      },
    ],
    marketNotes:
      "Classic small-city county seat: strong civic daytime demand, river-town tourism spillover, and a tight CBD that downtownproperties.net-style tracking would treat as a single inventory of storefronts rather than strip retail.",
  },
  "sewickley-pa": {
    isolationBrief:
      "Sewickley’s downtown is isolated on Broad Street and the village grid between the Ohio River and the residential slopes. Upscale specialty retail, dining, and services—distinct from big-box corridors in surrounding townships.",
    primaryCorridors: ["Broad Street", "Beaver Street approaches", "Ohio River Boulevard edge"],
    landmarks: ["Sewickley Public Library area", "Village business district"],
    sampleBusinesses: generateSampleBusinesses({
      id: "sewickley-pa",
      name: "Sewickley",
      state: "PA",
      county: "Allegheny",
      milesFromAllegheny: 12,
      downtownName: "Broad Street Downtown",
      center: { lat: 40.5365, lng: -80.1845 },
      radiusM: 550,
      tags: ["main_street", "river_town"],
      baseline: {
        vibrancy: 70,
        vacancyEstimate: 12,
        mix: { food: 24, retail: 22, services: 18, civic: 8, office: 12, other: 16 },
        poiCount: 110,
      },
    }),
    marketNotes:
      "High-income village CBD with strong independent retail; vacancy tends to turn over to similar specialty uses.",
  },
  "aliquippa-pa": {
    isolationBrief:
      "Aliquippa’s historic downtown is isolated on Franklin Avenue and adjacent blocks in the lower city—industrial heritage CBD separate from suburban commercial plazas.",
    primaryCorridors: ["Franklin Avenue", "Kennedy Boulevard approaches"],
    landmarks: ["Historic mill-town storefronts", "Municipal buildings"],
    sampleBusinesses: [],
    marketNotes: "Recovery-oriented main street with civic + service mix; monitor vacant industrial-era storefronts.",
  },
  "ambridge-pa": {
    isolationBrief:
      "Ambridge downtown isolates along Merchant Street in the National Historic Landmark industrial town core—distinct from Route 65 strip commercial.",
    primaryCorridors: ["Merchant Street", "Duss Avenue connections"],
    landmarks: ["Old Economy / heritage tourism edge", "Merchant Street storefronts"],
    sampleBusinesses: [],
    marketNotes: "Heritage tourism + local services; facade and vacancy tracking matter for revitalization pitches.",
  },
  "beaver-falls-pa": {
    isolationBrief:
      "Beaver Falls CBD centers on Seventh Avenue near Geneva College—college + river-city main street, separate from Brighton Road highway retail.",
    primaryCorridors: ["Seventh Avenue", "College approaches"],
    landmarks: ["Geneva College adjacency", "Seventh Avenue commercial blocks"],
    sampleBusinesses: [],
    marketNotes: "Student-driven food/services with industrial-era building stock.",
  },
  "pittsburgh-pa": {
    isolationBrief:
      "Pittsburgh’s Golden Triangle / Downtown CBD is isolated as the central business district between the Allegheny, Monongahela, and Point State Park—office, civic, cultural, and ground-floor retail distinct from neighborhood business districts (Lawrenceville, South Side, etc.).",
    primaryCorridors: ["Grant Street", "Forbes / Fifth corridors", "Market Square / PPG Place area"],
    landmarks: ["Point State Park", "Market Square", "Cultural District edge"],
    sampleBusinesses: [],
    marketNotes: "Regional CBD benchmark; ground-floor mix shifts with office attendance and event calendars.",
  },
  "homestead-pa": {
    isolationBrief:
      "Homestead’s downtown isolation focuses on Eighth Avenue and the historic business blocks between the riverfront and the residential hill—not the Waterfront lifestyle center across the tracks.",
    primaryCorridors: ["Eighth Avenue", "Amity Street connections"],
    landmarks: ["Historic Eighth Avenue", "Bost Building / heritage sites"],
    sampleBusinesses: [],
    marketNotes: "Distinguish traditional CBD inventory from big-box Waterfront when tracking vacancy.",
  },
  "mckeesport-pa": {
    isolationBrief:
      "McKeesport downtown isolates on Fifth Avenue and the downtown grid at the confluence—city-scale CBD with industrial legacy stock.",
    primaryCorridors: ["Fifth Avenue", "Walnut Street area"],
    landmarks: ["Downtown civic cluster", "Fifth Avenue commercial"],
    sampleBusinesses: [],
    marketNotes: "Larger vacant footprints; mix skews services + civic until retail re-enters.",
  },
  "east-liverpool-oh": {
    isolationBrief:
      "East Liverpool’s downtown is isolated on Fifth Street and the Ohio River downtown grid—pottery-heritage city CBD on the PA/OH border.",
    primaryCorridors: ["Fifth Street", "Market / downtown grid"],
    landmarks: ["Museum of Ceramics area", "Riverfront downtown"],
    sampleBusinesses: [],
    marketNotes: "Border-market downtown; track pottery tourism + local services.",
  },
  "steubenville-oh": {
    isolationBrief:
      "Steubenville downtown isolates on Fourth Street and the historic CBD near Franciscan University approaches—Ohio river city core within Allegheny’s 40-mile ring.",
    primaryCorridors: ["Fourth Street", "Market Street downtown"],
    landmarks: ["Historic downtown blocks", "Civic buildings"],
    sampleBusinesses: [],
    marketNotes: "College + county-adjacent demand; monitor vacant upper stories vs ground-floor retail.",
  },
};

export function getDowntownProfile(d: DowntownRecord): DowntownProfile {
  const curated = CURATED[d.id];
  if (curated) {
    return enrichWithIntel(d, {
      ...curated,
      sampleBusinesses:
        curated.sampleBusinesses.length > 0
          ? curated.sampleBusinesses
          : generateSampleBusinesses(d),
    });
  }
  return enrichWithIntel(d, defaultProfile(d));
}
