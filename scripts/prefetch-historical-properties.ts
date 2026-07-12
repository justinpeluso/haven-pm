#!/usr/bin/env npx tsx
/**
 * Prefetch Historical Properties dossiers → data/historical-properties.json
 * + mirror hero/gallery JPEGs under public/historical/.
 *
 * Keeps hand-built rich dossiers (PRESERVE_IDS). Builds shorter hybrid dossiers
 * for curated NRHP / landmark seeds within ~25 miles of Beaver CBD using
 * Wikipedia / Commons / NRHP public sources. Paces Wikimedia (429 retries).
 *
 * Usage:
 *   npx tsx scripts/prefetch-historical-properties.ts
 *   npx tsx scripts/prefetch-historical-properties.ts --force-images
 */
import fs from "fs";
import path from "path";
import { execFileSync } from "child_process";
import type { HistoricalProperty, HistoricalImage } from "../src/lib/downtown/historical-properties";

const UA =
  "HavenPM/1.0 (historical properties; https://github.com/justinpeluso/haven-pm)";
const OUT_JSON = path.join(process.cwd(), "data", "historical-properties.json");
const OUT_IMG = path.join(process.cwd(), "public", "historical");
const CENTER = { lat: 40.6953, lon: -80.3048 }; // beaver-pa downtown inventory
const RADIUS_MI = 25;
const FORCE_IMAGES = process.argv.includes("--force-images");

/** Hand-built dossiers — never overwrite content; only keep as-is. */
const PRESERVE_IDS = new Set([
  "1147-third-st-beaver-pa",
  "beaver-county-courthouse-beaver-pa",
  "matthew-s-quay-house-beaver-pa",
  "first-presbyterian-church-252-college-ave",
  "fort-mcintosh-site-beaver-pa",
]);

type Seed = {
  wikiTitle: string;
  /** Override slug if needed */
  slug?: string;
  town?: string;
  corridor?: string;
  street?: string;
  zip?: string;
  borough?: string;
  county?: string;
  tags?: string[];
};

/**
 * Curated NRHP / notable landmarks within ~25 mi of Beaver CBD.
 * Prefer sites with Wikipedia pages + Commons photos.
 */
const SEEDS: Seed[] = [
  {
    wikiTitle: "Bridgewater Historic District (Bridgewater, Pennsylvania)",
    slug: "bridgewater-historic-district",
    town: "Bridgewater",
    corridor: "Market Street riverfront",
    street: "Bridge Street / Market Street area",
    zip: "15009",
    borough: "Bridgewater Borough",
    tags: ["NRHP", "historic district", "Bridgewater"],
  },
  {
    wikiTitle: "William B. Dunlap Mansion",
    slug: "william-b-dunlap-mansion",
    town: "Bridgewater",
    corridor: "Market Street riverfront",
    street: "1298 Market Street",
    zip: "15009",
    borough: "Bridgewater Borough",
    tags: ["NRHP", "mansion", "Bridgewater"],
  },
  {
    wikiTitle: "Merrick Art Gallery",
    slug: "merrick-art-gallery",
    town: "New Brighton",
    corridor: "Third Avenue civic",
    street: "1100 Fifth Avenue",
    zip: "15066",
    borough: "New Brighton Borough",
    tags: ["NRHP", "museum", "New Brighton"],
  },
  {
    wikiTitle: "Captain William Vicary House",
    slug: "captain-william-vicary-house",
    town: "Freedom",
    corridor: "Third Avenue Freedom",
    street: "1235 Third Avenue",
    zip: "15042",
    borough: "Freedom Borough",
    tags: ["NRHP", "mansion", "Freedom"],
  },
  {
    wikiTitle: "Merrill Lock No. 6",
    slug: "merrill-lock-no-6",
    town: "Industry",
    corridor: "Ohio River industrial",
    street: "Ohio River (Lock No. 6 site)",
    zip: "15052",
    borough: "Industry Borough",
    tags: ["NRHP", "canal", "Ohio River"],
  },
  {
    wikiTitle: "Carnegie Free Library of Beaver Falls",
    slug: "carnegie-free-library-beaver-falls",
    town: "Beaver Falls",
    corridor: "Seventh Avenue downtown",
    street: "1301 Seventh Avenue",
    zip: "15010",
    borough: "Beaver Falls City",
    tags: ["NRHP", "Carnegie library", "Beaver Falls"],
  },
  {
    wikiTitle: "Old Main (Geneva College)",
    slug: "old-main-geneva-college",
    town: "Beaver Falls",
    corridor: "College Hill campus",
    street: "3200 College Avenue (Geneva College)",
    zip: "15010",
    borough: "Beaver Falls City",
    tags: ["Geneva College", "campus landmark", "Beaver Falls"],
  },
  {
    wikiTitle: "Aliquippa station",
    slug: "aliquippa-station",
    town: "Aliquippa",
    corridor: "Franklin Avenue / rail",
    street: "111 Station Street",
    zip: "15001",
    borough: "Aliquippa City",
    tags: ["NRHP", "railroad", "Aliquippa"],
  },
  {
    wikiTitle: "B.F. Jones Memorial Library",
    slug: "bf-jones-memorial-library",
    town: "Aliquippa",
    corridor: "Franklin Avenue civic",
    street: "663 Franklin Avenue",
    zip: "15001",
    borough: "Aliquippa City",
    tags: ["NRHP", "library", "Aliquippa"],
  },
  {
    wikiTitle: "Legionville",
    slug: "legionville",
    town: "Harmony Township",
    corridor: "Ohio River bluff",
    street: "Legionville historic site (Duss Avenue vicinity)",
    zip: "15003",
    borough: "Harmony Township",
    tags: ["NRHP", "Legion of the United States", "Wayne"],
  },
  {
    wikiTitle: "Old Economy Village",
    slug: "old-economy-village",
    town: "Ambridge",
    corridor: "Harmony Society / 14th Street",
    street: "270 16th Street",
    zip: "15003",
    borough: "Ambridge Borough",
    tags: ["NRHP", "NHL", "Harmony Society", "Ambridge"],
  },
  {
    wikiTitle: "James Beach Clow House",
    slug: "james-beach-clow-house",
    town: "New Sewickley",
    corridor: "Freedom Road rural",
    street: "Clow Road / rural New Sewickley",
    zip: "15042",
    borough: "New Sewickley Township",
    tags: ["NRHP", "farmhouse", "New Sewickley"],
  },
  {
    wikiTitle: "Greersburg Academy",
    slug: "greersburg-academy",
    town: "Darlington",
    corridor: "Market Street Darlington",
    street: "Market Street",
    zip: "16115",
    borough: "Darlington Borough",
    tags: ["NRHP", "academy", "Darlington"],
  },
  {
    wikiTitle: "Elmridge",
    slug: "elmridge-leetsdale",
    town: "Leetsdale",
    corridor: "Beaver Road corridor",
    street: "1 Elmridge Road",
    zip: "15056",
    borough: "Leetsdale Borough",
    tags: ["NRHP", "estate", "Leetsdale"],
  },
  {
    wikiTitle: "David Littell House",
    slug: "david-littell-house",
    town: "Independence",
    corridor: "Independence Township rural",
    street: "Rural Independence Township",
    zip: "15026",
    borough: "Independence Township",
    tags: ["NRHP", "farmhouse", "Independence"],
  },
  {
    wikiTitle: "David Shields House",
    slug: "david-shields-house",
    town: "Edgeworth",
    corridor: "Beaver Road corridor",
    street: "Shields Lane & Beaver Road",
    zip: "15143",
    borough: "Edgeworth Borough",
    tags: ["NRHP", "Newington", "Edgeworth"],
  },
  {
    wikiTitle: "Nicholas Way House",
    slug: "nicholas-way-house",
    town: "Edgeworth",
    corridor: "Beaver Road corridor",
    street: "108 Beaver Road",
    zip: "15143",
    borough: "Edgeworth Borough",
    tags: ["NRHP", "Edgeworth"],
  },
  {
    wikiTitle: "United States Post Office-Sewickley Branch",
    slug: "sewickley-post-office",
    town: "Sewickley",
    corridor: "Broad Street downtown",
    street: "200 Broad Street",
    zip: "15143",
    borough: "Sewickley Borough",
    tags: ["NRHP", "post office", "Sewickley"],
  },
  {
    wikiTitle: "Wilpen Hall",
    slug: "wilpen-hall",
    town: "Sewickley Heights",
    corridor: "Blackburn / Scaife estate belt",
    street: "889–895 Blackburn Road",
    zip: "15143",
    borough: "Sewickley Heights Borough",
    tags: ["NRHP", "estate", "Sewickley Heights"],
  },
  {
    wikiTitle: "Mooncrest Historic District",
    slug: "mooncrest-historic-district",
    town: "Moon",
    corridor: "Mooncrest WWII housing",
    street: "Mooncrest Drive area",
    zip: "15108",
    borough: "Moon Township",
    tags: ["NRHP", "WWII housing", "Moon"],
  },
  {
    wikiTitle: "Coraopolis Armory",
    slug: "coraopolis-armory",
    town: "Coraopolis",
    corridor: "Fifth Avenue civic",
    street: "835 Fifth Avenue",
    zip: "15108",
    borough: "Coraopolis Borough",
    tags: ["NRHP", "armory", "Coraopolis"],
  },
  {
    wikiTitle: "Coraopolis station",
    slug: "coraopolis-station",
    town: "Coraopolis",
    corridor: "rail / downtown edge",
    street: "Coraopolis station (Mill Street vicinity)",
    zip: "15108",
    borough: "Coraopolis Borough",
    tags: ["NRHP", "railroad", "Coraopolis"],
  },
  {
    wikiTitle: "Beginning Point of the U.S. Public Land Survey",
    slug: "beginning-point-us-public-land-survey",
    town: "East Liverpool",
    corridor: "Ohio–PA survey baseline",
    street: "Survey marker site (OH/PA line near East Liverpool)",
    zip: "43920",
    borough: "Near East Liverpool / PA line",
    county: "Beaver / Columbiana",
    tags: ["NRHP", "NHL", "Public Land Survey", "Seven Ranges"],
  },
  {
    wikiTitle: "Watts Mill Bridge",
    slug: "watts-mill-bridge",
    town: "Independence",
    corridor: "Little Traverse Creek",
    street: "Watts Mill Road over Little Traverse Creek",
    zip: "15026",
    borough: "Independence Township area",
    tags: ["NRHP", "bridge", "truss"],
  },
  {
    wikiTitle: "Beaver Bridge (Ohio River)",
    slug: "beaver-bridge-ohio-river",
    town: "Beaver",
    corridor: "River Road bluff",
    street: "CSX / Ohio River crossing at Beaver",
    zip: "15009",
    borough: "Beaver Borough / Bridgewater",
    tags: ["rail bridge", "Ohio River", "Beaver"],
  },
  {
    wikiTitle: "Rochester-Beaver Railroad Bridge",
    slug: "rochester-beaver-railroad-bridge",
    town: "Rochester",
    corridor: "Beaver River crossing",
    street: "Railroad bridge over Beaver River",
    zip: "15074",
    borough: "Rochester Borough",
    tags: ["rail bridge", "Beaver River", "Rochester"],
  },
  {
    wikiTitle: "Sewickley Public Library",
    slug: "sewickley-public-library",
    town: "Sewickley",
    corridor: "Broad Street downtown",
    street: "500 Thorn Street",
    zip: "15143",
    borough: "Sewickley Borough",
    tags: ["library", "Sewickley", "civic"],
  },
  {
    wikiTitle: "St. Luke's Anglican Church (Georgetown, Pennsylvania)",
    slug: "st-lukes-georgetown",
    town: "Georgetown",
    corridor: "Market Street Georgetown",
    street: "Market Street",
    zip: "15043",
    borough: "Georgetown Borough",
    tags: ["church", "Georgetown", "Ohio River"],
  },
  {
    wikiTitle: "Davis Island Lock and Dam Site",
    slug: "davis-island-lock-and-dam",
    town: "Avalon",
    corridor: "Ohio River navigation",
    street: "Davis Island Lock and Dam site",
    zip: "15202",
    borough: "Avalon Borough vicinity",
    county: "Allegheny",
    tags: ["NRHP", "Ohio River", "lock and dam"],
  },
  {
    wikiTitle: "Woodville (Heidelberg, Pennsylvania)",
    slug: "woodville-neville-house",
    town: "Collier",
    corridor: "Washington Pike Neville estate",
    street: "1375 Washington Pike",
    zip: "15071",
    borough: "Collier Township / Heidelberg vicinity",
    county: "Allegheny",
    tags: ["NRHP", "NHL", "Neville House", "Woodville"],
  },
  {
    wikiTitle: "Evergreen Hamlet",
    slug: "evergreen-hamlet",
    town: "Ross",
    corridor: "Evergreen planned community",
    street: "Evergreen Hamlet historic district",
    zip: "15237",
    borough: "Ross Township",
    county: "Allegheny",
    tags: ["NRHP", "planned community", "Ross"],
  },
  {
    wikiTitle: "Isaac Lightner House",
    slug: "isaac-lightner-house",
    town: "Shaler",
    corridor: "Shaler Township rural",
    street: "Shaler Township",
    zip: "15209",
    borough: "Shaler Township",
    county: "Allegheny",
    tags: ["NRHP", "Greek Revival", "Shaler"],
  },
  {
    wikiTitle: "Walker-Ewing Log House",
    slug: "walker-ewing-log-house",
    town: "Collier",
    corridor: "Collier Township rural",
    street: "Collier Township",
    zip: "15071",
    borough: "Collier Township",
    county: "Allegheny",
    tags: ["NRHP", "log house", "Collier"],
  },
  {
    wikiTitle: "Thornburg Historic District",
    slug: "thornburg-historic-district",
    town: "Thornburg",
    corridor: "Thornburg village",
    street: "Thornburg Historic District",
    zip: "15205",
    borough: "Thornburg Borough",
    county: "Allegheny",
    tags: ["NRHP", "historic district", "Thornburg"],
  },
  {
    wikiTitle: "Andrew Carnegie Free Library & Music Hall (Carnegie, Pennsylvania)",
    slug: "andrew-carnegie-free-library-carnegie",
    town: "Carnegie",
    corridor: "East Main Street civic",
    street: "300 Beechwood Avenue",
    zip: "15106",
    borough: "Carnegie Borough",
    county: "Allegheny",
    tags: ["NRHP", "Carnegie library", "music hall"],
  },
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function haversineMi(
  lat1: number,
  lon1: number,
  lat2: number,
  lon2: number
): number {
  const R = 3958.8;
  const p = Math.PI / 180;
  const a =
    0.5 -
    Math.cos((lat2 - lat1) * p) / 2 +
    (Math.cos(lat1 * p) *
      Math.cos(lat2 * p) *
      (1 - Math.cos((lon2 - lon1) * p))) /
      2;
  return 2 * R * Math.asin(Math.sqrt(a));
}

function slugify(s: string): string {
  return s
    .toLowerCase()
    .replace(/&/g, " and ")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(0, 72);
}

function absHttps(u: string) {
  if (!u) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("http://")) return `https://${u.slice(7)}`;
  return u;
}

function clip(s: string, n: number): string {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= n) return t;
  return t.slice(0, n - 1).replace(/\s+\S*$/, "") + "…";
}

function firstSentence(s: string, max = 280): string {
  const clean = s.replace(/\s+/g, " ").trim();
  const m = clean.match(/^(.+?[.!?])\s/);
  return clip(m ? m[1] : clean, max);
}

async function fetchJson(url: string, attempt = 0): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.status === 429 || res.status === 503) {
      if (attempt >= 5) return null;
      const wait = 1500 * (attempt + 1) + Math.random() * 800;
      console.warn(`  rate-limit ${res.status}, wait ${Math.round(wait)}ms`);
      await sleep(wait);
      return fetchJson(url, attempt + 1);
    }
    if (!res.ok) return null;
    const text = await res.text();
    if (text.startsWith("You are making too many")) {
      if (attempt >= 5) return null;
      await sleep(2000 * (attempt + 1));
      return fetchJson(url, attempt + 1);
    }
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    if (attempt >= 3) return null;
    await sleep(900 * (attempt + 1));
    return fetchJson(url, attempt + 1);
  } finally {
    clearTimeout(t);
  }
}

async function fetchBuffer(url: string, attempt = 0): Promise<Buffer | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 45000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA },
    });
    if (res.status === 429 || res.status === 503) {
      if (attempt >= 4) return null;
      await sleep(1800 * (attempt + 1));
      return fetchBuffer(url, attempt + 1);
    }
    if (!res.ok) return null;
    return Buffer.from(await res.arrayBuffer());
  } catch {
    if (attempt >= 2) return null;
    await sleep(1000 * (attempt + 1));
    return fetchBuffer(url, attempt + 1);
  } finally {
    clearTimeout(t);
  }
}

function skipImageTitle(title: string) {
  return /coat of arms|locator map|flag of|seal of|logo|icon|diagram|\.svg\b|route map|county map|openstreetmap|wiki\s*mini\s*atlas|iss\d|view of earth|from space|astronaut|election|dem\.|lidar|census\b/i.test(
    title
  );
}

function resizeJpeg(srcPath: string, destPath: string, maxWidth: number) {
  try {
    execFileSync(
      "/usr/bin/sips",
      ["-s", "format", "jpeg", "-Z", String(maxWidth), srcPath, "--out", destPath],
      { stdio: "pipe" }
    );
    return true;
  } catch {
    try {
      fs.copyFileSync(srcPath, destPath);
      return true;
    } catch {
      return false;
    }
  }
}

async function mirrorImage(
  remoteUrl: string,
  baseName: string,
  sourcePageUrl?: string,
  title?: string,
  credit?: string
): Promise<HistoricalImage | null> {
  fs.mkdirSync(OUT_IMG, { recursive: true });
  const fullPath = path.join(OUT_IMG, `${baseName}.jpg`);
  const thumbPath = path.join(OUT_IMG, `${baseName}-960.jpg`);

  if (!FORCE_IMAGES && fs.existsSync(fullPath) && fs.existsSync(thumbPath)) {
    return {
      url: `/historical/${baseName}.jpg`,
      thumbUrl: `/historical/${baseName}-960.jpg`,
      title: title || baseName,
      credit: credit || "Wikimedia Commons",
      sourceUrl: sourcePageUrl,
    };
  }

  const buf = await fetchBuffer(absHttps(remoteUrl));
  if (!buf || buf.length < 2000) return null;

  const tmp = path.join(OUT_IMG, `${baseName}.tmp`);
  fs.writeFileSync(tmp, buf);
  // Normalize to jpeg via sips
  try {
    execFileSync(
      "/usr/bin/sips",
      ["-s", "format", "jpeg", tmp, "--out", fullPath],
      { stdio: "pipe" }
    );
  } catch {
    fs.copyFileSync(tmp, fullPath);
  }
  try {
    fs.unlinkSync(tmp);
  } catch {
    /* ignore */
  }
  if (!resizeJpeg(fullPath, thumbPath, 960)) {
    fs.copyFileSync(fullPath, thumbPath);
  }

  return {
    url: `/historical/${baseName}.jpg`,
    thumbUrl: `/historical/${baseName}-960.jpg`,
    title: title || baseName,
    credit: credit || "Wikimedia Commons",
    sourceUrl: sourcePageUrl,
  };
}

type WikiBundle = {
  title: string;
  extract: string;
  description?: string;
  lat?: number;
  lon?: number;
  wikiUrl: string;
  imageUrl?: string;
  imageTitle?: string;
  gallery: { url: string; title: string; fileTitle: string }[];
  nrhpHint?: string;
};

async function loadWiki(seed: Seed): Promise<WikiBundle | null> {
  const summary = await fetchJson(
    `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(seed.wikiTitle)}`
  );
  if (!summary || summary.type?.includes("not_found")) {
    console.warn(`  missing summary: ${seed.wikiTitle}`);
    return null;
  }
  await sleep(200);

  const title = summary.title || seed.wikiTitle;
  const params = new URLSearchParams({
    action: "query",
    format: "json",
    origin: "*",
    titles: title,
    prop: "extracts|coordinates|pageimages|info",
    exintro: "1",
    explaintext: "1",
    piprop: "original|thumbnail|name",
    pithumbsize: "960",
    inprop: "url",
  });
  const q = await fetchJson(`https://en.wikipedia.org/w/api.php?${params}`);
  await sleep(250);
  const page = Object.values(q?.query?.pages ?? {})[0] as any;
  if (!page || page.missing) return null;

  const coords = page.coordinates?.[0];
  const lat = coords?.lat;
  const lon = coords?.lon;
  if (lat != null && lon != null) {
    const dist = haversineMi(CENTER.lat, CENTER.lon, lat, lon);
    if (dist > RADIUS_MI + 0.5) {
      console.warn(`  skip ${title}: ${dist.toFixed(1)} mi > ${RADIUS_MI}`);
      return null;
    }
  }

  const extract: string = page.extract || summary.extract || "";
  const imageUrl = absHttps(
    page.original?.source ||
      summary.originalimage?.source ||
      page.thumbnail?.source ||
      summary.thumbnail?.source ||
      ""
  );
  const imageTitle = page.pageimage
    ? `File:${page.pageimage}`
    : summary.originalimage
      ? undefined
      : undefined;

  const gallery: WikiBundle["gallery"] = [];
  const media = await fetchJson(
    `https://en.wikipedia.org/api/rest_v1/page/media-list/${encodeURIComponent(title)}`
  );
  await sleep(200);
  for (const item of media?.items ?? []) {
    if (item.type !== "image") continue;
    const ft = String(item.title || "");
    if (!ft.startsWith("File:") || skipImageTitle(ft)) continue;
    gallery.push({
      url: "",
      title: ft.replace(/^File:/, ""),
      fileTitle: ft,
    });
    if (gallery.length >= 4) break;
  }

  // Resolve gallery file URLs in one Commons query
  if (gallery.length) {
    const titles = gallery.map((g) => g.fileTitle).join("|");
    const ip = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      titles,
      prop: "imageinfo",
      iiprop: "url|mime|size",
      iiurlwidth: "1280",
    });
    const ij = await fetchJson(`https://commons.wikimedia.org/w/api.php?${ip}`);
    await sleep(300);
    const pages = Object.values(ij?.query?.pages ?? {}) as any[];
    const byTitle = new Map(pages.map((p) => [p.title, p]));
    for (const g of gallery) {
      const p = byTitle.get(g.fileTitle);
      const info = p?.imageinfo?.[0];
      if (!info?.mime?.startsWith("image/") || info.mime.includes("svg")) {
        g.url = "";
        continue;
      }
      g.url = absHttps(info.thumburl || info.url || "");
    }
  }

  const nrhp =
    /national register|nrhp|listed on the national/i.test(extract) ||
    /national historic landmark/i.test(extract)
      ? "Mentioned in Wikipedia extract as NRHP / NHL-related"
      : undefined;

  return {
    title,
    extract,
    description: summary.description,
    lat,
    lon,
    wikiUrl:
      page.fullurl ||
      summary.content_urls?.desktop?.page ||
      `https://en.wikipedia.org/wiki/${encodeURIComponent(title.replace(/ /g, "_"))}`,
    imageUrl: imageUrl || undefined,
    imageTitle,
    gallery: gallery.filter((g) => g.url),
    nrhpHint: nrhp,
  };
}

function buildHybrid(seed: Seed, wiki: WikiBundle, images: HistoricalImage[]): HistoricalProperty {
  const slug = seed.slug || slugify(wiki.title);
  const town = seed.town || "Beaver County";
  const county = seed.county || (town.match(/East Liverpool|Avalon|Ross|Shaler|Collier|Thornburg|Carnegie|Moon|Sewickley|Edgeworth|Leetsdale|Coraopolis/) ? "Allegheny" : "Beaver");
  const countyLabel = county.includes("/")
    ? county
    : `${county} County`;
  const corridor = seed.corridor || `${town} historic core`;
  const street = seed.street || wiki.title;
  const zip = seed.zip || "15009";
  const borough = seed.borough || `${town}`;
  const hero = images[0];
  const gallery = images.map((img, i) => ({
    ...img,
    kind: (i === 0 ? "building" : i === 1 ? "historic" : "streetscape") as HistoricalImage["kind"],
  }));

  const summaryLead = firstSentence(wiki.extract, 320);
  const longer = clip(wiki.extract, 720);
  const subtitle =
    wiki.description
      ? clip(`${wiki.description} — public-source hybrid dossier`, 160)
      : clip(`${summaryLead}`, 160);

  const isDistrict = /historic district|village|hamlet/i.test(wiki.title);
  const isBridge = /bridge/i.test(wiki.title);
  const isChurch = /church|cathedral|chapel/i.test(wiki.title);
  const isLibrary = /library/i.test(wiki.title);
  const isStation = /station/i.test(wiki.title) && !/power/i.test(wiki.title);

  const buildEra = isDistrict
    ? "District period of significance — see Wikipedia / NRHP materials"
    : isBridge
      ? "Bridge construction era — see Wikipedia for span date(s)"
      : "Construction / significance era summarized from public sources (exact year may be unverified here)";

  const originalUse = isDistrict
    ? "Mixed historic district fabric"
    : isBridge
      ? "Transportation crossing"
      : isChurch
        ? "Religious congregation"
        : isLibrary
          ? "Public library"
          : isStation
            ? "Railroad passenger / freight station"
            : "See Wikipedia extract for original use";

  const currentUse = isDistrict
    ? "Historic district / preserved streetscape (varied occupancy)"
    : isBridge
      ? "Active or extant bridge structure (verify current status)"
      : "Extant landmark — verify current occupancy from local sources";

  const timeline: { year: string; event: string }[] = [];
  const yearHits = [...wiki.extract.matchAll(/\b((?:1[7-9]|20)\d{2})\b/g)].map((m) => m[1]);
  const uniqYears = Array.from(new Set(yearHits)).slice(0, 6);
  for (const y of uniqYears) {
    timeline.push({
      year: y,
      event: `Year ${y} appears in the Wikipedia summary for ${wiki.title}; confirm against NRHP nomination / primary sources.`,
    });
  }
  if (!timeline.length) {
    timeline.push({
      year: "n/d",
      event: "No clear construction year extracted from the short Wikipedia intro; treat dating as a research gap.",
    });
  }
  timeline.push({
    year: "hybrid cache",
    event: "Dossier auto-filled from public Wikipedia / Commons sources for Haven PM Historical Properties.",
  });

  const tags = Array.from(
    new Set([
      ...(seed.tags || []),
      town,
      "Beaver County region",
      "public-source hybrid",
      ...(wiki.nrhpHint ? ["NRHP"] : []),
    ])
  );

  return {
    id: slug,
    slug,
    name: wiki.title.replace(/\s*\([^)]*Pennsylvania[^)]*\)\s*$/i, "").trim() || wiki.title,
    subtitle,
    status: "hybrid",
    town,
    heroImage: hero || {
      url: "/downtown-placeholder.svg",
      thumbUrl: "/downtown-placeholder.svg",
      title: wiki.title,
      credit: "Placeholder",
    },
    images: gallery.length
      ? gallery
      : [
          {
            url: "/downtown-placeholder.svg",
            thumbUrl: "/downtown-placeholder.svg",
            title: wiki.title,
            credit: "Placeholder",
            kind: "building",
          },
        ],
    address: {
      street,
      city: town.split(" ")[0] === "East" ? town : town.replace(/ Township| Borough| City| Heights| vicinity/gi, "").trim() || town,
      borough,
      county: countyLabel,
      state: county.includes("Columbiana") ? "OH/PA" : "PA",
      zip,
      coordinates:
        wiki.lat != null && wiki.lon != null
          ? {
              lat: wiki.lat,
              lon: wiki.lon,
              precision: "wikipedia_coordinates",
            }
          : {
              lat: CENTER.lat,
              lon: CENTER.lon,
              precision: "beaver_cbd_fallback_unverified",
            },
    },
    parcelIdentity: {
      summary: longer || summaryLead,
      municipality: borough,
      cbdCorridor: corridor,
      historicDistrict: wiki.nrhpHint
        ? `${wiki.title} (NRHP / NHL context per Wikipedia)`
        : `${wiki.title} — district status not confirmed in this hybrid fill`,
      knownOccupants: [],
      caveats: [
        "Hybrid dossier: shorter public-source fill (Wikipedia / Commons). Not a substitute for the NRHP nomination or deed research.",
        "Do not treat this as a verified chain of title or HARB determination.",
      ],
    },
    structureHistory: {
      buildEra,
      originalUse,
      currentUse,
      styleNotes: clip(
        wiki.extract ||
          "Architectural style not fully extracted; consult NRHP nomination or local survey for character-defining features.",
        420
      ),
      alterations: [
        "Alteration chronology not compiled in this hybrid pass — research gap.",
      ],
      districtFabric: isDistrict
        ? clip(wiki.extract, 360)
        : `Sits within the broader ${town} / Ohio River valley historic landscape within ~${RADIUS_MI} miles of Beaver CBD.`,
    },
    landLotPlat: {
      summary:
        "Specific lot / plat survey for this parcel was not researched in the hybrid pass. Beaver’s 1792 Daniel Leet plan applies only inside Beaver Borough; other municipalities have separate plats.",
      platYear: 0,
      surveyor: "unknown (research gap)",
      lotTypes: "unknown",
      thirdStreetRole:
        town === "Beaver"
          ? "Related to Beaver’s Third Street / river-town setting where applicable."
          : `Not on Beaver Third Street — ${corridor} in ${town}.`,
      publicSquaresNearby: [],
      cbdEvolution: [
        "Municipal CBD / corridor evolution not reconstructed here; see local histories and NRHP context statements.",
      ],
    },
    earlyOwnersOccupants: {
      summary:
        "Early owners and occupants were not chained from deed books in this hybrid build. Wikipedia may name a namesake builder or family; treat as leads only.",
      notableContextOccupantsOnCorridor: [],
      researchGaps: [
        "County deed / will index chain not scraped.",
        "City directory occupancy sequence not compiled.",
        "Tax assessment parcel ID not verified.",
        ...(wiki.extract ? [] : ["Wikipedia extract missing — content thin."]),
      ],
    },
    indigenousPeoples: {
      summary:
        "This corridor lies in the upper Ohio River valley historically used by Lenape (Delaware), Shawnee, Seneca, and other Indigenous nations before and during colonial displacement. Site-specific Indigenous archaeology is not asserted here.",
      peoples: [
        {
          name: "Lenape (Delaware), Shawnee, Seneca / Iroquoian nations",
          notes:
            "Regional presence in the Ohio Country; displacement accelerated after Fort McIntosh-era treaties and subsequent settlement. Local nuance varies by site.",
        },
      ],
      placesAndNames: [
        "Ohio River confluence landscape",
        "Fort McIntosh / Beaver treaty landscape (regional context)",
      ],
      ethicalNote:
        "Hybrid text is regional context only — not a claim of site-specific Indigenous occupancy without archaeological or tribal consultation sources.",
    },
    fortsAndWars: {
      summary:
        "Regional military landscape includes Fort McIntosh (Beaver), Legionville (Harmony Township), and Ohio River logistics corridors. Site-specific battle claims are not invented here.",
      frenchAndIndianWar: [
        "Upper Ohio contested among Indigenous nations, France, and Britain; confirm any local engagement before asserting it for this property.",
      ],
      revolutionaryWarFrontier: [
        "Western Pennsylvania frontier violence and postwar settlement pressure shaped land claims; Fort McIntosh (1785 treaty) is the nearest well-documented fort landscape for Beaver CBD.",
      ],
      nearby: [
        "Fort McIntosh Site, Beaver",
        "Legionville (Wayne’s Legion cantonment), Harmony Township",
      ],
    },
    historicDistrict: {
      name: isDistrict ? wiki.title : `${town} / listed resource context`,
      nrhpRef: wiki.nrhpHint ? "See NRHP / Wikipedia for reference number" : "not confirmed in hybrid fill",
      listed: wiki.nrhpHint ? "Listed or discussed as NRHP/NHL in public secondary sources" : "unknown",
      areaAcres: 0,
      periodOfSignificance: "See NRHP nomination — not restated here without the form",
      styles: [],
      resources: isDistrict
        ? "Contributing / noncontributing counts not copied from nomination in this pass"
        : "Single resource or complex — verify in NRIS / nomination",
      boundariesNote:
        "District or parcel boundaries not digitized in this hybrid cache.",
      relevanceToProperty: summaryLead,
    },
    timeline,
    sources: [
      {
        title: wiki.title,
        url: wiki.wikiUrl,
        publisher: "Wikipedia",
        notes: "Primary hybrid prose source (intro extract).",
      },
      {
        title: "National Register of Historic Places (context)",
        url: "https://www.nps.gov/subjects/nationalregister/index.htm",
        publisher: "National Park Service",
        notes: "Use NRIS / nomination PDFs for authoritative listing data.",
      },
      {
        title: "Wikimedia Commons (media)",
        url: hero?.sourceUrl || "https://commons.wikimedia.org/",
        publisher: "Wikimedia Commons",
        notes: "Hero/gallery mirrored locally under /historical/; sourceUrl retained for attribution.",
      },
    ],
    tags,
  };
}

async function imagesForSeed(
  seed: Seed,
  wiki: WikiBundle
): Promise<HistoricalImage[]> {
  const base = seed.slug || slugify(wiki.title);
  const out: HistoricalImage[] = [];
  const seen = new Set<string>();

  const tryAdd = async (
    remote: string | undefined,
    name: string,
    title: string,
    fileTitle?: string
  ) => {
    if (!remote || seen.has(remote)) return;
    seen.add(remote);
    const sourceUrl = fileTitle
      ? `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle)}`
      : wiki.wikiUrl;
    const img = await mirrorImage(
      remote,
      name,
      sourceUrl,
      title,
      "Wikimedia Commons / Wikipedia"
    );
    if (img) out.push(img);
    await sleep(350);
  };

  if (wiki.imageUrl) {
    await tryAdd(wiki.imageUrl, base, wiki.title, wiki.imageTitle);
  }

  let i = 0;
  for (const g of wiki.gallery) {
    if (out.length >= 3) break;
    i += 1;
    await tryAdd(g.url, `${base}-${i}`, g.title, g.fileTitle);
  }

  // Fallback: Commons search
  if (!out.length) {
    const q = `${wiki.title} Pennsylvania`;
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: q,
      gsrlimit: "8",
      prop: "imageinfo",
      iiprop: "url|mime",
      iiurlwidth: "1280",
    });
    const json = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    await sleep(400);
    const pages = Object.values(json?.query?.pages ?? {}) as any[];
    for (const p of pages) {
      if (out.length >= 2) break;
      const title = p.title || "";
      if (skipImageTitle(title)) continue;
      const info = p.imageinfo?.[0];
      if (!info?.mime?.startsWith("image/") || info.mime.includes("svg")) continue;
      const url = absHttps(info.thumburl || info.url || "");
      await tryAdd(url, `${base}-commons`, title.replace(/^File:/, ""), title);
    }
  }

  return out;
}

async function main() {
  console.log("Historical Properties prefetch");
  console.log(`  center Beaver CBD ${CENTER.lat}, ${CENTER.lon}`);
  console.log(`  radius ${RADIUS_MI} mi · seeds ${SEEDS.length}`);

  let existing: HistoricalProperty[] = [];
  if (fs.existsSync(OUT_JSON)) {
    const raw = JSON.parse(fs.readFileSync(OUT_JSON, "utf8"));
    existing = (raw.properties || []) as HistoricalProperty[];
  }
  const preserved = existing.filter((p) => PRESERVE_IDS.has(p.id));
  console.log(`  preserving ${preserved.length} rich dossiers`);

  const hybrids: HistoricalProperty[] = [];
  for (const seed of SEEDS) {
    const slug = seed.slug || slugify(seed.wikiTitle);
    console.log(`→ ${seed.wikiTitle}`);
    const wiki = await loadWiki(seed);
    if (!wiki) {
      console.warn(`  FAILED wiki load`);
      continue;
    }
    if (wiki.lat != null && wiki.lon != null) {
      const d = haversineMi(CENTER.lat, CENTER.lon, wiki.lat, wiki.lon);
      console.log(`  ${d.toFixed(1)} mi · ${wiki.title}`);
    }
    const imgs = await imagesForSeed(seed, wiki);
    console.log(`  images mirrored: ${imgs.length}`);
    const dossier = buildHybrid(seed, wiki, imgs);
    // ensure id/slug match seed
    dossier.id = slug;
    dossier.slug = slug;
    hybrids.push(dossier);
    await sleep(400);
  }

  const byId = new Map<string, HistoricalProperty>();
  for (const p of preserved) byId.set(p.id, p);
  for (const p of hybrids) {
    if (PRESERVE_IDS.has(p.id)) continue;
    byId.set(p.id, p);
  }

  // Stable order: preserved first (original order), then hybrids by distance if known
  const preservedOrdered = preserved;
  const hybridOrdered = hybrids
    .filter((p) => !PRESERVE_IDS.has(p.id))
    .sort((a, b) => {
      const da =
        a.address.coordinates &&
        a.address.coordinates.precision !== "beaver_cbd_fallback_unverified"
          ? haversineMi(
              CENTER.lat,
              CENTER.lon,
              a.address.coordinates.lat,
              a.address.coordinates.lon
            )
          : 999;
      const db =
        b.address.coordinates &&
        b.address.coordinates.precision !== "beaver_cbd_fallback_unverified"
          ? haversineMi(
              CENTER.lat,
              CENTER.lon,
              b.address.coordinates.lat,
              b.address.coordinates.lon
            )
          : 999;
      return da - db;
    });

  const properties = [...preservedOrdered, ...hybridOrdered];
  const payload = {
    generatedAt: new Date().toISOString(),
    count: properties.length,
    center: { ...CENTER, label: "Beaver CBD (beaver-pa downtown inventory)" },
    radiusMiles: RADIUS_MI,
    properties,
  };

  fs.writeFileSync(OUT_JSON, JSON.stringify(payload, null, 2) + "\n");
  console.log(`\nWrote ${properties.length} dossiers → ${OUT_JSON}`);
  const towns = Array.from(
    new Set(properties.map((p) => p.town || p.address.city))
  ).sort();
  console.log(`Towns (${towns.length}): ${towns.join(", ")}`);
  const missingHero = properties.filter(
    (p) => !p.heroImage?.url?.startsWith("/historical/")
  );
  if (missingHero.length) {
    console.warn(
      `WARN ${missingHero.length} without local /historical/ hero:`,
      missingHero.map((p) => p.id).join(", ")
    );
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
