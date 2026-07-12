#!/usr/bin/env npx tsx
/**
 * Prefetch historical documents / scans per downtown → data/downtown-documents.json
 * Sources: Library of Congress, Internet Archive, Wikimedia Commons.
 * Resume-safe via .tmp-documents/progress.json.
 */
import fs from "fs";
import path from "path";
import inventory from "../data/downtowns.json";

type Downtown = (typeof inventory.downtowns)[number];

export type DocKind = "founding" | "courthouse" | "plat_map" | "sanborn" | "plan" | "other";

export type DowntownDocument = {
  title: string;
  url: string;
  thumbUrl: string;
  kind: DocKind;
  year?: number;
  source: string;
  credit?: string;
};

type OutFile = {
  generatedAt: string;
  count: number;
  byId: Record<string, DowntownDocument[]>;
};

const UA = "HavenPM/1.0 (downtown documents; https://github.com/justinpeluso/haven-pm)";
const OUT = path.join(process.cwd(), "data", "downtown-documents.json");
const TMP_DIR = path.join(process.cwd(), ".tmp-documents");
const PROGRESS = path.join(TMP_DIR, "progress.json");
const TARGET_MIN = 3;
const TARGET_MAX = 8;

const JUNK =
  /\b(flag of|coat of arms|seal of|logo|icon|\.svg\b|locator map|openstreetmap|wiki\s*mini\s*atlas|zillow|redfin|realtor|for sale|real estate listing|mls\b|yellow pages|white pages|usteledirec|federal register|phone.?book|telephone director|infantry|regiment|election|highlighted\.(png|svg)|view of earth|from space|astronaut|iss\d|residence of|farm consisting|our old homestead|advertisement to|flower pot|terra cotta|hotel of|orphan school|\bres\.?\s+of\b|file works|insurance commissioner|pennsylvania archives|annual report of|national union fire|\bv\.\s+[A-Za-z]|aloja petroleum|mercado v|pavilion hotel|greenhouse of)\b/i;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stateFull(state: string) {
  return state === "PA" ? "Pennsylvania" : state === "OH" ? "Ohio" : state;
}

function absHttps(u: string) {
  if (!u) return u;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("http://")) return `https://${u.slice(7)}`;
  // LOC thumbs often append #h=..&w=..
  const hash = u.indexOf("#");
  return hash >= 0 ? u.slice(0, hash) : u;
}

function yearFromText(...parts: Array<string | number | undefined | null>): number | undefined {
  for (const p of parts) {
    if (typeof p === "number" && p >= 1600 && p <= new Date().getFullYear()) return p;
    if (typeof p === "string") {
      const n = Number(p);
      if (n >= 1600 && n <= new Date().getFullYear()) return n;
      const years = [...p.matchAll(/\b((?:16|17|18|19|20)\d{2})\b/g)].map((m) => Number(m[1]));
      const plausible = years.filter((y) => y >= 1600 && y <= new Date().getFullYear());
      if (plausible.length) return Math.min(...plausible);
    }
  }
  return undefined;
}

function inferKind(title: string, desc = ""): DocKind {
  const t = `${title} ${desc}`.toLowerCase();
  if (/\bsanborn\b/.test(t)) return "sanborn";
  if (/\b(plat\s*map|plat of|cadastral|township map|borough map|plot\s*plan)\b/.test(t)) return "plat_map";
  if (/\b(city\s*plan|town\s*plan|downtown\s*plan|urban\s*plan|site\s*plan|plan of the)\b/.test(t)) return "plan";
  if (/\b(court\s*house|courthouse|county\s*seat)\b/.test(t)) return "courthouse";
  if (
    /\b(founding|settlement|pioneer|centennial|history of|early\s+(history|years|settlers)|incorporated|incorporation)\b/.test(
      t
    )
  ) {
    return "founding";
  }
  if (/\b(map|atlas|plat)\b/.test(t)) return "plat_map";
  return "other";
}

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function scoreDoc(doc: DowntownDocument, d: Downtown): number {
  const title = doc.title || "";
  const blob = title.toLowerCase();
  if (JUNK.test(title)) return -1000;

  const name = d.name.toLowerCase();
  const county = d.county.toLowerCase();
  const full = stateFull(d.state).toLowerCase();
  const abbr = d.state.toLowerCase();
  let s = 0;

  const nameRe = new RegExp(`\\b${escapeRe(name)}\\b`, "i");
  // "Beaver County" alone should not count as a hit for borough Beaver when another place is primary
  const nameOnlyAsCounty = new RegExp(
    `\\b${escapeRe(name)}\\s+county\\b`,
    "i"
  );
  const titleWithoutCounty = title.replace(nameOnlyAsCounty, " ");
  const hasTownName = nameRe.test(titleWithoutCounty);
  const isCountyHistory =
    /\bhistory of\b/i.test(title) &&
    new RegExp(`\\b${escapeRe(county)}\\s+county\\b`, "i").test(title) &&
    blob.includes(full);

  // Ambiguous US place names must include the state
  const AMBIGUOUS = new Set([
    "washington",
    "franklin",
    "madison",
    "jefferson",
    "jackson",
    "clinton",
    "union",
    "springfield",
    "georgetown",
    "bedford",
    "butler",
    "warren",
    "greene",
    "perry",
    "wayne",
    "monroe",
    "salem",
    "chester",
    "lancaster",
    "york",
    "columbia",
    "bristol",
    "newport",
    "plymouth",
    "milton",
    "marion",
    "center",
    "centre",
    "independence",
    "liberty",
  ]);
  if (AMBIGUOUS.has(name) && !blob.includes(full) && !new RegExp(`\\b${abbr}\\b`, "i").test(title)) {
    return -1000;
  }
  if (/\bwashington,?\s*d\.?\s*c\.?\b/i.test(title)) return -1000;
  if (/\bgovernment printing office\b/i.test(title)) return -1000;
  if (
    /\b(military departments? of washington|oregon,\s*washington|british columbia|washington print|confederate and federal|mine run|rapidan)\b/i.test(
      title
    )
  ) {
    return -1000;
  }

  // Ambiguous names: require the title to be about the place, not a publisher imprint
  if (AMBIGUOUS.has(name)) {
    const aboutPlace =
      new RegExp(`\\bfrom\\s+${escapeRe(name)}\\s*,`, "i").test(title) ||
      new RegExp(`\\b${escapeRe(name)},\\s+${escapeRe(county)}\\s+county\\b`, "i").test(title) ||
      new RegExp(`\\b${escapeRe(name)}\\s+${escapeRe(county)}\\s+county\\b`, "i").test(title) ||
      new RegExp(`\\bhistory of\\s+${escapeRe(name)}\\b`, "i").test(title) ||
      new RegExp(`\\b${escapeRe(name)}\\s+(borough|city|historic)\\b`, "i").test(title) ||
      new RegExp(`\\b(court\\s*house|courthouse).{0,40}${escapeRe(name)}|${escapeRe(name)}.{0,40}(court\\s*house|courthouse)`, "i").test(
        title
      ) ||
      isCountyHistory;
    if (!aboutPlace) return -1000;
  }

  // Must mention the town, or be a county history for this county
  if (!hasTownName && !isCountyHistory) return -1000;

  if (hasTownName) s += 40;
  else if (isCountyHistory) s += 25;
  else if (blob.includes(name)) s += 12;

  if (blob.includes(full) || new RegExp(`\\b${abbr}\\b`, "i").test(title)) s += 20;
  if (blob.includes(county)) s += 10;

  // Prefer place-qualified titles: "Name, State"
  if (new RegExp(`${escapeRe(name)}[,\\s]+(${full}|${abbr}|pa\\.?|oh\\.?)`, "i").test(titleWithoutCounty)) {
    s += 15;
  }

  // Sanborn "from ExactTown," is required — other towns in same county are rejected
  const sanbornFrom = title.match(/\bfrom\s+([^,]+),\s*[^,]+County/i);
  if (doc.kind === "sanborn") {
    if (sanbornFrom) {
      const place = sanbornFrom[1].trim().toLowerCase();
      if (place === name) s += 40;
      else return -1000;
    } else if (!hasTownName) {
      return -1000;
    }
  }

  // Compound place names that contain ours (Beaver Falls vs Beaver)
  const compound = new RegExp(
    `\\b${escapeRe(name)}\\s+(falls|creek|meadows|heights|hills|park|valley|township|boro|borough)\\b`,
    "i"
  );
  if (compound.test(title) && !new RegExp(`\\bfrom\\s+${escapeRe(name)}[,\\s]`, "i").test(title)) {
    s -= 40;
  }

  switch (doc.kind) {
    case "sanborn":
      s += 55;
      break;
    case "plat_map":
      s += 40;
      break;
    case "courthouse":
      // Require the town (not just county) for courthouse hits
      if (!hasTownName && !new RegExp(`\\b${escapeRe(name)}\\b.*\\b(court\\s*house|courthouse)`, "i").test(title)) {
        return -1000;
      }
      s += 35;
      break;
    case "plan":
      s += 30;
      break;
    case "founding":
      s += 28;
      break;
    default:
      if (!hasTownName) return -1000;
      s += 5;
  }

  // Prefer real histories / maps over ephemeral serials
  if (/\b(journal|gazette|advertiser|newspaper)\b/i.test(title) && doc.kind !== "courthouse") s -= 25;
  if (/\b(history of|sanborn|plat|atlas|map|courthouse|court house)\b/i.test(title)) s += 8;

  if (doc.year && doc.year < 1950) s += 12;
  else if (doc.year && doc.year < 1980) s += 6;
  else if (doc.year && doc.year >= 2000 && doc.kind === "other") s -= 10;

  // Penalize wrong-place hits for common names
  if (/\b(missouri|texas|washington state|california|new york|indiana|illinois|georgia)\b/i.test(title)) {
    if (d.state === "PA" && !/\bpennsylvania\b|\bpa\b/i.test(title)) s -= 40;
  }
  if (d.state === "PA" && /\bohio\b/i.test(title) && !/\bpennsylvania\b/i.test(title) && name !== "ohio") {
    if (!/\bohio\s+river\b/i.test(title)) s -= 25;
  }
  if (d.state === "OH" && /\bpennsylvania\b/i.test(title) && !/\bohio\b/i.test(title)) s -= 25;

  // Farm ads / unrelated atlas insets without town name near the start
  if (/\b(farm|residence of|advertisement|hotel of|orphan school)\b/i.test(title) && !hasTownName) s -= 40;
  const leadPlace = title.match(/^([A-Z][A-Za-z .'-]{1,40})\.\s*\(to accompany\)/);
  if (leadPlace) {
    const lead = leadPlace[1].trim().toLowerCase();
    if (lead !== name && !lead.startsWith(name + " ")) return -1000;
  }
  // Caldwell-style plates that lead with another place
  if (/\(to accompany\)\s*Caldwell/i.test(title) && !hasTownName) return -1000;

  // County histories are OK for founding even without exact borough name in first words
  if (doc.kind === "founding" && blob.includes(county) && /\bhistory of\b/i.test(title)) s += 15;

  if (!doc.thumbUrl || !/^https:\/\//i.test(doc.thumbUrl)) s -= 50;

  return s;
}

async function fetchJson(url: string, attempt = 0): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 20000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
      redirect: "follow",
    });
    if (res.status === 429 || res.status === 503) {
      if (attempt >= 5) return null;
      await sleep(1500 * (attempt + 1) + Math.random() * 800);
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

async function searchLoc(d: Downtown): Promise<DowntownDocument[]> {
  const full = stateFull(d.state);
  const queries = [
    `"${d.name}" "${full}" Sanborn`,
    `"${d.name}" "${full}" (courthouse OR "court house" OR plat OR atlas OR history)`,
  ];
  const out: DowntownDocument[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    const url = `https://www.loc.gov/search/?q=${encodeURIComponent(q)}&fo=json&c=8`;
    const json = await fetchJson(url);
    await sleep(120 + Math.floor(Math.random() * 80));
    for (const r of json?.results ?? []) {
      const title = String(r.title || "").trim();
      if (!title || JUNK.test(title)) continue;
      const landing = absHttps(String(r.url || r.id || "").trim());
      if (!landing || !landing.includes("loc.gov")) continue;
      const imgs: string[] = Array.isArray(r.image_url)
        ? r.image_url.map(String)
        : r.image_url
          ? [String(r.image_url)]
          : [];
      const thumb = absHttps(imgs.find((u) => /^https?:\/\//i.test(u)) || "");
      if (!thumb) continue;
      if (seen.has(landing)) continue;
      seen.add(landing);

      const dateRaw = r.date || r.dates?.[0] || r.item?.date;
      const year = yearFromText(title, Array.isArray(dateRaw) ? dateRaw[0] : dateRaw);
      out.push({
        title,
        url: landing.endsWith("/") ? landing : `${landing}/`,
        thumbUrl: thumb,
        kind: inferKind(title, String(r.description || "")),
        year,
        source: "Library of Congress",
        credit: "Library of Congress",
      });
    }
    if (out.filter((x) => x.kind === "sanborn").length >= 2 && out.length >= 4) break;
  }
  return out;
}

async function searchInternetArchive(d: Downtown): Promise<DowntownDocument[]> {
  const full = stateFull(d.state);
  // Prefer maps/texts with place + archival keywords
  const q = [
    `(title:("${d.name}") OR description:("${d.name}, ${full}") OR title:("History of ${d.county}"))`,
    `AND (${full} OR ${d.state})`,
    `AND (sanborn OR plat OR courthouse OR "court house" OR "city plan" OR "fire insurance" OR "history of" OR atlas)`,
    `AND (mediatype:texts OR mediatype:image OR mediatype:maps)`,
    `AND NOT title:(advertisement "residence of" "farm consisting")`,
  ].join(" ");

  const url =
    `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}` +
    `&fl[]=identifier&fl[]=title&fl[]=year&fl[]=mediatype&fl[]=description&fl[]=creator` +
    `&rows=12&page=1&output=json`;

  const json = await fetchJson(url);
  await sleep(150 + Math.floor(Math.random() * 100));
  const out: DowntownDocument[] = [];
  for (const r of json?.response?.docs ?? []) {
    const id = String(r.identifier || "").trim();
    const title = String(Array.isArray(r.title) ? r.title[0] : r.title || "").trim();
    if (!id || !title || JUNK.test(title)) continue;
    const desc = String(Array.isArray(r.description) ? r.description[0] : r.description || "");
    const nameRe = new RegExp(`\\b${escapeRe(d.name)}\\b`, "i");
    const countyHist = new RegExp(`history of\\s+${escapeRe(d.county)}`, "i");
    const titleSansCounty = title.replace(new RegExp(`\\b${escapeRe(d.name)}\\s+county\\b`, "i"), " ");
    const okPlace =
      nameRe.test(titleSansCounty) ||
      countyHist.test(title) ||
      new RegExp(`\\b${escapeRe(d.county)}\\s+county\\b.*\\bhistory\\b`, "i").test(title);
    if (!okPlace) continue;
    // Drop Caldwell commercial plates unless the town leads the title
    if (/\(to accompany\)\s*Caldwell/i.test(title)) {
      const lead = title.slice(0, 80).toLowerCase();
      if (!nameRe.test(lead.replace(new RegExp(`\\b${escapeRe(d.name)}\\s+county\\b`, "i"), " "))) continue;
    }
    const year = yearFromText(r.year, title);
    out.push({
      title,
      url: `https://archive.org/details/${id}`,
      thumbUrl: `https://archive.org/services/img/${id}`,
      kind: inferKind(title, desc),
      year,
      source: "Internet Archive",
      credit: r.creator
        ? String(Array.isArray(r.creator) ? r.creator[0] : r.creator)
        : "Internet Archive",
    });
  }
  return out;
}

type CommonsPage = {
  title?: string;
  imageinfo?: Array<{
    url?: string;
    thumburl?: string;
    descriptionurl?: string;
    mime?: string;
    timestamp?: string;
  }>;
};

async function searchCommons(d: Downtown): Promise<DowntownDocument[]> {
  const full = stateFull(d.state);
  const queries = [
    `"${d.name}" "${full}" (Sanborn OR courthouse OR plat OR "fire insurance")`,
  ];
  const out: DowntownDocument[] = [];
  const seen = new Set<string>();

  for (const q of queries) {
    const params = new URLSearchParams({
      action: "query",
      format: "json",
      origin: "*",
      generator: "search",
      gsrnamespace: "6",
      gsrsearch: q,
      gsrlimit: "12",
      prop: "imageinfo",
      iiprop: "url|mime|size|timestamp",
      iiurlwidth: "960",
    });
    const json = await fetchJson(`https://commons.wikimedia.org/w/api.php?${params}`);
    await sleep(100 + Math.floor(Math.random() * 80));
    const pages = Object.values(json?.query?.pages ?? {}) as CommonsPage[];
    for (const page of pages) {
      const fileTitle = String(page.title || "");
      const info = page.imageinfo?.[0];
      if (!info?.mime?.startsWith("image/") || info.mime.includes("svg")) continue;
      if (JUNK.test(fileTitle)) continue;
      const title = fileTitle.replace(/^File:/, "");
      const landing = absHttps(
        info.descriptionurl || `https://commons.wikimedia.org/wiki/${encodeURIComponent(fileTitle)}`
      );
      const thumb = absHttps(info.thumburl || info.url || "");
      if (!thumb || !landing) continue;
      const key = title.toLowerCase();
      if (seen.has(key)) continue;
      seen.add(key);
      out.push({
        title,
        url: landing,
        thumbUrl: thumb,
        kind: inferKind(title),
        year: yearFromText(title, info.timestamp),
        source: "Wikimedia Commons",
        credit: "Wikimedia Commons",
      });
    }
  }
  return out;
}

function pickDocs(candidates: DowntownDocument[], d: Downtown): DowntownDocument[] {
  const ranked = candidates
    .map((doc) => ({ doc, score: scoreDoc(doc, d) }))
    .filter((x) => x.score >= 35)
    .sort((a, b) => b.score - a.score);

  const out: DowntownDocument[] = [];
  const seenUrl = new Set<string>();
  const seenTitle = new Set<string>();
  const kindCount: Record<string, number> = {};
  const sanbornYears = new Set<number>();

  const push = (doc: DowntownDocument) => {
    const uk = doc.url.replace(/\/$/, "").toLowerCase();
    const tk = doc.title.toLowerCase().replace(/\s+/g, " ").slice(0, 120);
    if (seenUrl.has(uk) || seenTitle.has(tk)) return false;
    // Prefer distinct Sanborn years over many plates of the same year
    if (doc.kind === "sanborn" && doc.year && sanbornYears.has(doc.year) && (kindCount.sanborn || 0) >= 1) {
      return false;
    }
    seenUrl.add(uk);
    seenTitle.add(tk);
    kindCount[doc.kind] = (kindCount[doc.kind] || 0) + 1;
    if (doc.kind === "sanborn" && doc.year) sanbornYears.add(doc.year);
    out.push(doc);
    return true;
  };

  // Diversify kinds first
  for (const kind of ["sanborn", "courthouse", "plat_map", "plan", "founding", "other"] as DocKind[]) {
    for (const { doc } of ranked) {
      if (out.length >= TARGET_MAX) break;
      if (doc.kind !== kind) continue;
      if ((kindCount[kind] || 0) >= (kind === "sanborn" ? 3 : 2)) continue;
      push(doc);
    }
  }
  // Fill remaining
  for (const { doc } of ranked) {
    if (out.length >= TARGET_MAX) break;
    push(doc);
  }
  return out.slice(0, TARGET_MAX);
}

async function searchCountyHistory(d: Downtown): Promise<DowntownDocument[]> {
  const full = stateFull(d.state);
  const q = `"History of ${d.county} County" ${full}`;
  const url = `https://www.loc.gov/search/?q=${encodeURIComponent(q)}&fo=json&c=6`;
  const json = await fetchJson(url);
  await sleep(100);
  const out: DowntownDocument[] = [];
  for (const r of json?.results ?? []) {
    const title = String(r.title || "").trim();
    if (!title || JUNK.test(title)) continue;
    if (!new RegExp(`\\b${escapeRe(d.county)}\\b`, "i").test(title)) continue;
    if (!/\bhistory\b/i.test(title)) continue;
    const landing = absHttps(String(r.url || r.id || "").trim());
    const imgs: string[] = Array.isArray(r.image_url)
      ? r.image_url.map(String)
      : r.image_url
        ? [String(r.image_url)]
        : [];
    const thumb = absHttps(imgs.find((u) => /^https?:\/\//i.test(u)) || "");
    if (!landing?.includes("loc.gov") || !thumb) continue;
    const dateRaw = r.date || r.dates?.[0];
    out.push({
      title,
      url: landing.endsWith("/") ? landing : `${landing}/`,
      thumbUrl: thumb,
      kind: "founding",
      year: yearFromText(title, Array.isArray(dateRaw) ? dateRaw[0] : dateRaw),
      source: "Library of Congress",
      credit: "Library of Congress",
    });
  }
  return out;
}

async function docsFor(d: Downtown): Promise<DowntownDocument[]> {
  const skipLoc = process.env.SKIP_LOC === "1";
  // Parallel primary sources (LOC optional — Cloudflare often blocks)
  const [loc, ia] = await Promise.all([
    skipLoc ? Promise.resolve([] as DowntownDocument[]) : searchLoc(d),
    searchInternetArchive(d),
  ]);
  let picked = pickDocs([...loc, ...ia], d);
  if (picked.length < TARGET_MIN) {
    const commons = await searchCommons(d);
    picked = pickDocs([...loc, ...ia, ...commons], d);
  }
  if (picked.length < TARGET_MIN && !skipLoc) {
    const hist = await searchCountyHistory(d);
    picked = pickDocs([...picked, ...hist, ...loc, ...ia], d);
  }
  return picked;
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>) {
  const out: R[] = new Array(items.length);
  let idx = 0;
  async function worker() {
    while (idx < items.length) {
      const i = idx++;
      out[i] = await fn(items[i]!, i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return out;
}

function loadProgress(): OutFile {
  for (const p of [PROGRESS, OUT]) {
    if (!fs.existsSync(p)) continue;
    try {
      return JSON.parse(fs.readFileSync(p, "utf8")) as OutFile;
    } catch {
      /* continue */
    }
  }
  return { generatedAt: new Date().toISOString(), count: 0, byId: {} };
}

function saveProgress(byId: Record<string, DowntownDocument[]>) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const payload: OutFile = {
    generatedAt: new Date().toISOString(),
    count: Object.keys(byId).length,
    byId,
  };
  const body = JSON.stringify(payload, null, 2);
  const outTmp = `${OUT}.tmp`;
  const progTmp = `${PROGRESS}.tmp`;
  fs.writeFileSync(outTmp, body);
  fs.renameSync(outTmp, OUT);
  fs.writeFileSync(progTmp, body);
  fs.renameSync(progTmp, PROGRESS);
}

async function main() {
  const downtowns = inventory.downtowns as Downtown[];
  const forceIds = new Set(
    (process.env.FORCE_IDS || "")
      .split(",")
      .map((s) => s.trim())
      .filter(Boolean)
  );
  const limit = process.env.LIMIT ? Number(process.env.LIMIT) : undefined;
  const offset = process.env.OFFSET ? Number(process.env.OFFSET) : 0;
  const onlyMissing = process.env.ONLY_MISSING === "1";
  const concurrency = Math.max(1, Math.min(8, Number(process.env.CONCURRENCY || 1) || 1));

  let targets = forceIds.size ? downtowns.filter((d) => forceIds.has(d.id)) : downtowns;
  if (offset && Number.isFinite(offset)) targets = targets.slice(offset);
  if (limit && Number.isFinite(limit)) targets = targets.slice(0, limit);

  const progress = loadProgress();
  const byId: Record<string, DowntownDocument[]> = { ...progress.byId };

  const work = targets.filter((d) => {
    if (forceIds.size) return true;
    const existing = byId[d.id];
    if (existing === undefined) return true; // never attempted
    const n = existing.length;
    if (n >= TARGET_MIN) return false;
    if (n === 0) return process.env.RETRY_EMPTY === "1";
    // 1–2 docs: only retry when explicitly requested
    return process.env.RETRY_WEAK === "1";
  });

  console.log(
    `Prefetching documents for ${work.length}/${targets.length} downtowns (cached: ${Object.keys(byId).length}, concurrency=${concurrency}${process.env.SKIP_LOC === "1" ? ", skipLoc" : ""})…`
  );

  let done = 0;
  let withAny = Object.values(byId).filter((x) => x.length >= 1).length;
  let with3 = Object.values(byId).filter((x) => x.length >= 3).length;
  let cursor = 0;

  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= work.length) return;
      const d = work[idx];
      try {
        const docs = await docsFor(d);
        // Never clobber non-empty cache with an empty force/retry result
        if (docs.length === 0 && (byId[d.id]?.length ?? 0) > 0) {
          done += 1;
          console.log(`  ${done}/${work.length} ~ ${d.id} → keep ${byId[d.id].length} cached (fresh empty)`);
        } else {
          byId[d.id] = docs;
          if (docs.length >= 1) withAny += 1;
          if (docs.length >= 3) with3 += 1;
          const kinds = docs.map((x) => x.kind).join(",");
          done += 1;
          console.log(
            `  ${done}/${work.length} ${docs.length ? "✓" : "✗"} ${d.id} → ${docs.length} docs [${kinds}]`
          );
        }
      } catch (e) {
        const msg = e instanceof Error ? e.message : String(e);
        done += 1;
        console.warn(`  ${done}/${work.length} ! ${d.id} error: ${msg.slice(0, 120)}`);
        if (!byId[d.id]) byId[d.id] = [];
      }
      if (done % 3 === 0 || done === work.length) saveProgress(byId);
      await sleep(80 + Math.floor(Math.random() * 120));
    }
  }

  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  saveProgress(byId);

  // Final coverage over full inventory
  const all = downtowns.map((d) => byId[d.id]?.length ?? 0);
  const ge1 = all.filter((n) => n >= 1).length;
  const ge3 = all.filter((n) => n >= 3).length;
  const avg = all.reduce((a, b) => a + b, 0) / all.length;
  console.log(`Wrote ${OUT}`);
  console.log(`coverage ≥1: ${ge1}/${downtowns.length} · ≥3: ${ge3}/${downtowns.length} · avg ${avg.toFixed(2)}`);
  if (byId["beaver-pa"]) {
    console.log(`sample beaver-pa (${byId["beaver-pa"].length}):`);
    console.log(JSON.stringify(byId["beaver-pa"], null, 2));
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
