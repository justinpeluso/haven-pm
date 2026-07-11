/** Pittsburgh housing market — free public monthly data (Zillow Research + WPRDC). */

export interface HousingMetric {
  id: string;
  label: string;
  value: number;
  priorValue: number | null;
  changePct: number | null;
  unit: "rent" | "sale";
  periodLabel: string;
  sampleSize: number | null;
  source: string;
  detail: string;
}

export interface HousingMarketSnapshot {
  locationLabel: string;
  metrics: HousingMetric[];
  fetchedAt: string;
}

const ZILLOW_CITY_ZORI =
  "https://files.zillowstatic.com/research/public_csvs/zori/City_zori_uc_sfrcondomfr_sm_month.csv";
const WPRDC_ASSESSMENTS = "65855e14-549e-4992-b5be-d629afc676fa";
const WPRDC_SQL = "https://data.wprdc.org/api/3/action/datastore_search_sql";

let cache: { at: number; data: HousingMarketSnapshot } | null = null;
const CACHE_MS = 60 * 60 * 1000; // monthly data — refresh hourly at most

function parseCsvLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const ch = line[i];
    if (ch === '"') {
      inQuotes = !inQuotes;
      continue;
    }
    if (ch === "," && !inQuotes) {
      out.push(cur);
      cur = "";
      continue;
    }
    cur += ch;
  }
  out.push(cur);
  return out;
}

function monthLabelFromIso(isoDate: string): string {
  const d = new Date(`${isoDate.slice(0, 10)}T12:00:00`);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function monthLabelFromKey(key: string): string {
  // YYYY-MM
  const [y, m] = key.split("-").map(Number);
  const d = new Date(y, m - 1, 15);
  return d.toLocaleDateString("en-US", { month: "short", year: "numeric" });
}

function pctChange(current: number, prior: number | null): number | null {
  if (prior == null || prior === 0) return null;
  return Math.round(((current - prior) / prior) * 1000) / 10;
}

async function fetchZillowTwoBedRentProxy(): Promise<HousingMetric> {
  const res = await fetch(ZILLOW_CITY_ZORI, {
    headers: { "User-Agent": "HavenPM/1.0 (local dashboard)", Accept: "text/csv" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`Zillow ZORI ${res.status}`);

  const text = await res.text();
  const lines = text.split(/\r?\n/).filter(Boolean);
  const header = parseCsvLine(lines[0]);
  const dateIdxs = header
    .map((h, i) => ({ h, i }))
    .filter(({ h }) => /^\d{4}-\d{2}-\d{2}$/.test(h));

  let row: string[] | null = null;
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const name = cols[header.indexOf("RegionName")];
    const type = cols[header.indexOf("RegionType")];
    const state = cols[header.indexOf("StateName")];
    if (name === "Pittsburgh" && type === "city" && state === "PA") {
      row = cols;
      break;
    }
  }
  if (!row) throw new Error("Pittsburgh ZORI row not found");

  const points: { date: string; value: number }[] = [];
  for (const { h, i } of dateIdxs) {
    const raw = row[i];
    if (!raw) continue;
    const value = Number(raw);
    if (Number.isFinite(value)) points.push({ date: h, value });
  }
  if (points.length < 1) throw new Error("No ZORI values");

  const latest = points[points.length - 1];
  const prior = points.length > 1 ? points[points.length - 2] : null;
  const value = Math.round(latest.value);

  return {
    id: "rent-2br",
    label: "Avg 2BR rent",
    value,
    priorValue: prior ? Math.round(prior.value) : null,
    changePct: pctChange(value, prior ? Math.round(prior.value) : null),
    unit: "rent",
    periodLabel: monthLabelFromIso(latest.date),
    sampleSize: null,
    source: "Zillow Research (ZORI)",
    detail:
      "Zillow Observed Rent Index for Pittsburgh — typical mid-market rent (1–2BR weighted).",
  };
}

function saleDateToMonthKey(saleDate: string): string | null {
  // Assessments use MM-DD-YYYY
  const parts = String(saleDate).split("-");
  if (parts.length !== 3) return null;
  const [mm, , yyyy] = parts;
  if (!/^\d{4}$/.test(yyyy) || !/^\d{2}$/.test(mm)) return null;
  return `${yyyy}-${mm}`;
}

async function wprdcSql(sql: string): Promise<Record<string, unknown>[]> {
  const url = `${WPRDC_SQL}?sql=${encodeURIComponent(sql)}`;
  const res = await fetch(url, {
    headers: { Accept: "application/json", "User-Agent": "HavenPM/1.0" },
    cache: "no-store",
  });
  if (!res.ok) throw new Error(`WPRDC ${res.status}`);
  const data = await res.json();
  if (!data?.success) throw new Error("WPRDC query failed");
  return data.result?.records ?? [];
}

async function fetchMonthlySaleAverage(opts: {
  id: string;
  label: string;
  whereExtra: string;
  detail: string;
}): Promise<HousingMetric> {
  const sql = `
    SELECT "SALEDATE", "SALEPRICE"
    FROM "${WPRDC_ASSESSMENTS}"
    WHERE "SCHOOLDESC" = 'Pittsburgh'
      AND "SALEDESC" = 'VALID SALE'
      AND "SALEPRICE" >= 40000 AND "SALEPRICE" <= 1500000
      AND ("SALEDATE" LIKE '%2024' OR "SALEDATE" LIKE '%2025' OR "SALEDATE" LIKE '%2026')
      AND ${opts.whereExtra}
  `;

  const rows = await wprdcSql(sql);
  const byMonth = new Map<string, number[]>();

  for (const row of rows) {
    const key = saleDateToMonthKey(String(row.SALEDATE ?? ""));
    const price = Number(row.SALEPRICE);
    if (!key || !Number.isFinite(price)) continue;
    const list = byMonth.get(key) ?? [];
    list.push(price);
    byMonth.set(key, list);
  }

  const months = [...byMonth.keys()].sort();
  // Prefer latest month with at least 3 sales; else merge trailing months
  let chosen = [...months].reverse().find((m) => (byMonth.get(m)?.length ?? 0) >= 3);
  let values: number[] = chosen ? (byMonth.get(chosen) ?? []) : [];
  let periodLabel = chosen ? monthLabelFromKey(chosen) : "Recent";

  if (!chosen || values.length < 3) {
    const trailing = months.slice(-3);
    values = trailing.flatMap((m) => byMonth.get(m) ?? []);
    chosen = trailing[trailing.length - 1] ?? null;
    periodLabel = trailing.length
      ? `${monthLabelFromKey(trailing[0])}–${monthLabelFromKey(trailing[trailing.length - 1])}`
      : "Recent";
  }

  if (values.length === 0) {
    throw new Error(`No sales for ${opts.label}`);
  }

  const avg = Math.round(values.reduce((a, b) => a + b, 0) / values.length);

  let priorValue: number | null = null;
  if (chosen) {
    const idx = months.indexOf(chosen);
    if (idx > 0) {
      const priorVals = byMonth.get(months[idx - 1]) ?? [];
      if (priorVals.length >= 3) {
        priorValue = Math.round(priorVals.reduce((a, b) => a + b, 0) / priorVals.length);
      }
    }
  }

  return {
    id: opts.id,
    label: opts.label,
    value: avg,
    priorValue,
    changePct: pctChange(avg, priorValue),
    unit: "sale",
    periodLabel,
    sampleSize: values.length,
    source: "Allegheny County / WPRDC",
    detail: opts.detail,
  };
}

export async function fetchPittsburghHousingMarket(): Promise<HousingMarketSnapshot> {
  if (cache && Date.now() - cache.at < CACHE_MS) {
    return cache.data;
  }

  const [rent, home3br, duplex] = await Promise.all([
    fetchZillowTwoBedRentProxy(),
    fetchMonthlySaleAverage({
      id: "sale-3br",
      label: "Avg 3BR home sale",
      whereExtra: `"USEDESC" = 'SINGLE FAMILY' AND "BEDROOMS" = 3`,
      detail: "Average valid sale price for 3-bedroom single-family homes in Pittsburgh.",
    }),
    fetchMonthlySaleAverage({
      id: "sale-duplex",
      label: "Avg duplex sale",
      whereExtra: `"USEDESC" = 'TWO FAMILY'`,
      detail: "Average valid sale price for two-family (duplex) properties in Pittsburgh.",
    }),
  ]);

  const snapshot: HousingMarketSnapshot = {
    locationLabel: "Pittsburgh, PA",
    metrics: [rent, home3br, duplex],
    fetchedAt: new Date().toISOString(),
  };

  cache = { at: Date.now(), data: snapshot };
  return snapshot;
}
