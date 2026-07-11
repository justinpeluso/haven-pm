#!/usr/bin/env npx tsx
/**
 * Prefetch Market Intel for every CBD → data/downtown-intel.json
 * Sources: Wikipedia (summary/history/demographics) + Census gazetteer/pop estimates.
 */
import fs from "fs";
import path from "path";
import { execSync } from "child_process";
import inventory from "../data/downtowns.json";

type Downtown = (typeof inventory.downtowns)[number];

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

const UA = "HavenPM/1.0 (downtown market intel; https://github.com/justinpeluso/haven-pm)";
const OUT = path.join(process.cwd(), "data", "downtown-intel.json");
const TMP = path.join(process.cwd(), ".tmp-intel");

async function sleep(ms: number) {
  await new Promise((r) => setTimeout(r, ms));
}

async function fetchJson(url: string, attempt = 0): Promise<any | null> {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 18000);
  try {
    const res = await fetch(url, {
      signal: ctrl.signal,
      headers: { "User-Agent": UA, Accept: "application/json" },
    });
    if (res.status === 429 || res.status === 503) {
      if (attempt >= 4) return null;
      await sleep(1400 * (attempt + 1));
      return fetchJson(url, attempt + 1);
    }
    if (!res.ok) return null;
    const text = await res.text();
    if (text.startsWith("You are making too many")) {
      if (attempt >= 4) return null;
      await sleep(1600 * (attempt + 1));
      return fetchJson(url, attempt + 1);
    }
    try {
      return JSON.parse(text);
    } catch {
      return null;
    }
  } catch {
    if (attempt >= 2) return null;
    await sleep(700 * (attempt + 1));
    return fetchJson(url, attempt + 1);
  } finally {
    clearTimeout(t);
  }
}

function ensureTmp() {
  fs.mkdirSync(TMP, { recursive: true });
}

function download(url: string, dest: string) {
  if (fs.existsSync(dest) && fs.statSync(dest).size > 1000) return;
  console.log(`  downloading ${path.basename(dest)}…`);
  execSync(`curl -sL -o "${dest}" "${url}"`, { stdio: "inherit" });
}

type GazRow = {
  usps: string;
  geoid: string;
  name: string;
  landSqMi: number;
  waterSqMi: number;
  lat: number;
  lng: number;
};

type PopRow = {
  geoid: string;
  name: string;
  state: string;
  base2020: number;
  est2023: number;
};

function loadGazetteer(): GazRow[] {
  ensureTmp();
  const zip = path.join(TMP, "2024_Gaz_place_national.zip");
  download(
    "https://www2.census.gov/geo/docs/maps-data/data/gazetteer/2024_Gazetteer/2024_Gaz_place_national.zip",
    zip
  );
  const dir = path.join(TMP, "gaz");
  fs.mkdirSync(dir, { recursive: true });
  execSync(`unzip -o -q "${zip}" -d "${dir}"`);
  const txt = fs.readdirSync(dir).find((f) => f.endsWith(".txt"));
  if (!txt) throw new Error("gazetteer txt missing");
  const lines = fs.readFileSync(path.join(dir, txt), "utf8").split(/\r?\n/).filter(Boolean);
  const rows: GazRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split("\t");
    if (cols.length < 12) continue;
    const usps = cols[0]!.trim();
    if (usps !== "PA" && usps !== "OH") continue;
    rows.push({
      usps,
      geoid: cols[1]!.trim(),
      name: cols[3]!.trim(),
      landSqMi: Number(cols[8]),
      waterSqMi: Number(cols[9]),
      lat: Number(cols[10]),
      lng: Number(cols[11]),
    });
  }
  return rows;
}

function loadPopest(stateFips: "42" | "39"): PopRow[] {
  ensureTmp();
  const dest = path.join(TMP, `sub-est2023_${stateFips}.csv`);
  download(
    `https://www2.census.gov/programs-surveys/popest/datasets/2020-2023/cities/totals/sub-est2023_${stateFips}.csv`,
    dest
  );
  const lines = fs.readFileSync(dest, "utf8").split(/\r?\n/).filter(Boolean);
  const header = lines[0]!.split(",");
  const idx = (name: string) => header.indexOf(name);
  const iSumlev = idx("SUMLEV");
  const iState = idx("STATE");
  const iPlace = idx("PLACE");
  const iName = idx("NAME");
  const iSt = idx("STNAME");
  const iBase = idx("ESTIMATESBASE2020");
  const i23 = idx("POPESTIMATE2023");
  const out: PopRow[] = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = lines[i]!.split(",");
    if (cols[iSumlev] !== "162") continue; // incorporated place
    const place = cols[iPlace]!.padStart(5, "0");
    const state = cols[iState]!.padStart(2, "0");
    out.push({
      geoid: `${state}${place}`,
      name: cols[iName]!,
      state: cols[iSt]!,
      base2020: Number(cols[iBase]),
      est2023: Number(cols[i23]),
    });
  }
  return out;
}

function haversineMi(a: { lat: number; lng: number }, b: { lat: number; lng: number }) {
  const R = 3958.8;
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const la1 = (a.lat * Math.PI) / 180;
  const la2 = (b.lat * Math.PI) / 180;
  const h =
    Math.sin(dLat / 2) ** 2 + Math.cos(la1) * Math.cos(la2) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

function placeBaseName(gazName: string) {
  return gazName.replace(/\s+(borough|city|township|village|CDP|municipality)$/i, "").trim().toLowerCase();
}

function matchGazetteer(d: Downtown, gaz: GazRow[]): GazRow | null {
  const state = d.state;
  const name = d.name.toLowerCase();
  const candidates = gaz
    .filter((g) => g.usps === state)
    .map((g) => ({ g, mi: haversineMi(d.center, g), base: placeBaseName(g.name) }));

  // Exact municipality name (Beaver ≠ Beaver Falls)
  const exact = candidates
    .filter((x) => x.base === name && x.mi < 10)
    .sort((a, b) => {
      const rank = (n: string) =>
        /city/i.test(n) ? 0 : /borough/i.test(n) ? 1 : /village/i.test(n) ? 2 : 3;
      const rd = rank(a.g.name) - rank(b.g.name);
      if (rd !== 0) return rd;
      return a.mi - b.mi;
    });
  if (exact[0]) return exact[0].g;

  // Fallback: nearest place within 2.5 miles
  const near = candidates.filter((x) => x.mi < 2.5).sort((a, b) => a.mi - b.mi);
  return near[0]?.g ?? null;
}

function cleanWikiText(s: string) {
  return s
    .replace(/\n{3,}/g, "\n\n")
    .replace(/\[\d+\]/g, "")
    .replace(/\s+\n/g, "\n")
    .trim();
}

function sectionAfter(text: string, heading: string) {
  const re = new RegExp(`==\\s*${heading}\\s*==\\s*([\\s\\S]*?)(?=\\n==\\s|$)`, "i");
  const m = text.match(re);
  return m ? cleanWikiText(m[1]!) : "";
}

async function wikiBundle(d: Downtown) {
  const stateFull = d.state === "PA" ? "Pennsylvania" : "Ohio";
  const titles = [
    `${d.name}, ${stateFull}`,
    `${d.name} (${stateFull})`,
    `${d.name}, ${d.state}`,
  ];

  for (const title of titles) {
    const summary = await fetchJson(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title)}`
    );
    if (!summary || summary.type?.includes("not_found") || summary.type === "disambiguation") {
      continue;
    }
    const pageTitle = summary.title || title;
    const extractJson = await fetchJson(
      `https://en.wikipedia.org/w/api.php?action=query&format=json&prop=extracts|pageprops&explaintext=1&exchars=14000&titles=${encodeURIComponent(pageTitle)}`
    );
    const page = Object.values(extractJson?.query?.pages ?? {})[0] as {
      extract?: string;
      pageprops?: { wikibase_item?: string };
      missing?: string;
    };
    if (!page || page.missing != null) continue;

    const full = page.extract || "";
    const history =
      sectionAfter(full, "History") ||
      sectionAfter(full, "Historical") ||
      "";
    const demographics =
      [
        sectionAfter(full, "Demographics"),
        sectionAfter(full, "2020 census"),
        sectionAfter(full, "2010 census"),
        sectionAfter(full, "Census"),
      ]
        .filter(Boolean)
        .join("\n\n") || "";

    let foundedYear: number | undefined;
    let elevationFt: number | undefined;
    const qid = page.pageprops?.wikibase_item;
    if (qid) {
      const wd = await fetchJson(`https://www.wikidata.org/wiki/Special:EntityData/${qid}.json`);
      const ent = wd?.entities?.[qid];
      const inception = ent?.claims?.P571?.[0]?.mainsnak?.datavalue?.value?.time;
      if (inception) {
        const y = Number(String(inception).replace(/^\+/, "").slice(0, 4));
        if (y >= 1600 && y <= 2100) foundedYear = y;
      }
      const elev = ent?.claims?.P2044?.[0]?.mainsnak?.datavalue?.value;
      if (elev?.amount) {
        const amount = Number(elev.amount);
        // meters → feet if unit is metre
        const unit = String(elev.unit || "");
        elevationFt = unit.includes("Q11573") ? Math.round(amount * 3.28084) : Math.round(amount);
      }
    }

    // Fallback founded from history text
    if (!foundedYear) {
      const m = (history || summary.extract || "").match(
        /\b(?:founded|laid out|incorporated|established)\b[^\d]{0,24}\b((?:17|18|19|20)\d{2})\b/i
      );
      if (m) foundedYear = Number(m[1]);
    }

    return {
      wikiTitle: pageTitle,
      wikiUrl: summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(pageTitle.replace(/ /g, "_"))}`,
      summary: cleanWikiText(summary.extract || full.split("\n\n")[0] || ""),
      history: history.slice(0, 4200),
      demographicsNarrative: demographics.slice(0, 4200),
      foundedYear,
      elevationFt,
    };
  }

  return null;
}

function buildFacts(d: Downtown, intel: Partial<DowntownIntel>): string[] {
  const facts: string[] = [];
  facts.push(`${d.downtownName} · ~${Math.round(d.radiusM)} m CBD radius`);
  facts.push(`${d.county} County, ${d.state}`);
  facts.push(`${d.milesFromAllegheny} mi from Allegheny County center`);
  if (intel.foundedYear) facts.push(`Founded / laid out around ${intel.foundedYear}`);
  if (intel.population?.estimate2023) {
    facts.push(`2023 pop. estimate ${intel.population.estimate2023.toLocaleString()}`);
  } else if (intel.population?.census2020) {
    facts.push(`2020 Census population ${intel.population.census2020.toLocaleString()}`);
  }
  if (intel.landAreaSqMi) facts.push(`${intel.landAreaSqMi.toFixed(2)} sq mi land area`);
  if (intel.densityPerSqMi) {
    facts.push(`~${Math.round(intel.densityPerSqMi).toLocaleString()} people / sq mi`);
  }
  for (const t of d.tags) facts.push(t.replace(/_/g, " "));
  return facts.slice(0, 10);
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

async function main() {
  console.log("Loading Census gazetteer + population estimates…");
  const gaz = loadGazetteer();
  const popPA = loadPopest("42");
  const popOH = loadPopest("39");
  const popByGeoid = new Map<string, PopRow>();
  for (const p of [...popPA, ...popOH]) popByGeoid.set(p.geoid, p);
  console.log(`Gazetteer places: ${gaz.length} · popest places: ${popByGeoid.size}`);

  const byId: Record<string, DowntownIntel> = {};
  const downtowns = inventory.downtowns;
  console.log(`Prefetching intel for ${downtowns.length} downtowns…`);

  await mapPool(downtowns, 2, async (d, i) => {
    const gazHit = matchGazetteer(d, gaz);
    const pop = gazHit ? popByGeoid.get(gazHit.geoid) : undefined;
    const wiki = await wikiBundle(d);

    const land = gazHit?.landSqMi;
    const pop2020 = pop?.base2020;
    const pop2023 = pop?.est2023;
    const density =
      land && land > 0 && (pop2023 || pop2020) ? (pop2023 || pop2020)! / land : undefined;

    const summary =
      wiki?.summary ||
      `${d.name} is a ${d.tags.includes("city") ? "city" : "community"} in ${d.county} County, ${d.state === "PA" ? "Pennsylvania" : "Ohio"}, about ${d.milesFromAllegheny} miles from Allegheny County. Its commercial core is tracked here as ${d.downtownName}.`;

    const history =
      wiki?.history ||
      `${d.name}'s downtown (${d.downtownName}) sits in ${d.county} County’s ${d.tags.map((t) => t.replace(/_/g, " ")).join(", ")} fabric. Local settlement and industrial eras shaped the walkable business blocks that Market Intel isolates as the CBD — separate from highway strip retail outside the core.`;

    const demographicsNarrative =
      wiki?.demographicsNarrative ||
      (pop2023
        ? `The U.S. Census Bureau estimated ${d.name}'s population at ${pop2023.toLocaleString()} in 2023 (2020 Census base ${pop2020?.toLocaleString() ?? "n/a"}). Land area is about ${land?.toFixed(2) ?? "n/a"} square miles${density ? `, or roughly ${Math.round(density).toLocaleString()} people per square mile` : ""}.`
        : `Detailed ACS tables are limited for this place in our offline cache; population and land area are shown when Census gazetteer / estimates match the municipality.`);

    const intel: DowntownIntel = {
      wikiTitle: wiki?.wikiTitle,
      wikiUrl: wiki?.wikiUrl,
      summary,
      history: history.slice(0, 4200),
      demographicsNarrative: demographicsNarrative.slice(0, 4200),
      foundedYear: wiki?.foundedYear,
      population:
        pop2020 || pop2023
          ? {
              census2020: pop2020,
              estimate2023: pop2023,
              source: "U.S. Census Bureau Population Estimates (subcounty 2023)",
            }
          : undefined,
      landAreaSqMi: land,
      waterAreaSqMi: gazHit?.waterSqMi,
      densityPerSqMi: density,
      elevationFt: wiki?.elevationFt,
      geoid: gazHit?.geoid,
      placeName: gazHit?.name || pop?.name,
      facts: [],
    };
    intel.facts = buildFacts(d, intel);
    byId[d.id] = intel;

    if ((i + 1) % 10 === 0 || i === downtowns.length - 1) {
      console.log(`  ${i + 1}/${downtowns.length} — ${d.name}: wiki=${Boolean(wiki?.history)} pop=${pop2023 ?? "—"}`);
      fs.writeFileSync(
        OUT,
        JSON.stringify({ generatedAt: new Date().toISOString(), count: Object.keys(byId).length, byId })
      );
    }
    await sleep(180);
    return intel;
  });

  fs.writeFileSync(
    OUT,
    JSON.stringify({ generatedAt: new Date().toISOString(), count: Object.keys(byId).length, byId })
  );
  const withHist = Object.values(byId).filter((x) => x.history.length > 200).length;
  const withPop = Object.values(byId).filter((x) => x.population?.estimate2023).length;
  const withDemo = Object.values(byId).filter((x) => x.demographicsNarrative.length > 120).length;
  console.log(`Wrote ${OUT} (${(fs.statSync(OUT).size / 1024).toFixed(0)} KB)`);
  console.log(`history≥200ch: ${withHist}/${downtowns.length} · pop: ${withPop} · demographics text: ${withDemo}`);
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
