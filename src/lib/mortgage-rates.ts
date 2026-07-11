/** U.S. mortgage rates from Freddie Mac PMMS — free weekly public data. */

import * as XLSX from "xlsx";

export interface MortgageRateSnapshot {
  rate30: number;
  rate15: number;
  prior30: number | null;
  prior15: number | null;
  change30: number | null;
  change15: number | null;
  weekOf: string;
  fetchedAt: string;
  source: string;
}

const PMMS_URL = "https://www.freddiemac.com/pmms/docs/historicalweeklydata.xlsx";

let cache: { at: number; data: MortgageRateSnapshot } | null = null;
const CACHE_MS = 6 * 60 * 60 * 1000; // weekly data

function excelSerialToDate(serial: number): Date {
  // Excel epoch (with 1900 leap-year bug) ≈ days since 1899-12-30
  const ms = Date.UTC(1899, 11, 30) + serial * 24 * 60 * 60 * 1000;
  return new Date(ms);
}

export async function fetchMortgageRates(): Promise<MortgageRateSnapshot> {
  if (cache && Date.now() - cache.at < CACHE_MS) return cache.data;

  const res = await fetch(PMMS_URL, {
    headers: {
      Accept: "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
      "User-Agent": "HavenPM/1.0 (local dashboard)",
    },
    next: { revalidate: 21600 },
  });
  if (!res.ok) throw new Error(`Freddie Mac PMMS ${res.status}`);

  const buffer = Buffer.from(await res.arrayBuffer());
  const workbook = XLSX.read(buffer, { type: "buffer" });
  const sheet = workbook.Sheets[workbook.SheetNames[0]];
  const rows = XLSX.utils.sheet_to_json<(string | number | null)[]>(sheet, {
    header: 1,
    defval: null,
  });

  const dataRows = rows.filter((row) => {
    const week = row?.[0];
    const rate30 = row?.[1];
    return typeof week === "number" && typeof rate30 === "number" && rate30 > 1 && rate30 < 20;
  });

  if (dataRows.length < 1) throw new Error("No PMMS rate rows found");

  const latest = dataRows[dataRows.length - 1];
  const prior = dataRows.length > 1 ? dataRows[dataRows.length - 2] : null;

  const rate30 = Number(latest[1]);
  const rate15 = typeof latest[3] === "number" ? Number(latest[3]) : rate30;
  const prior30 = prior && typeof prior[1] === "number" ? Number(prior[1]) : null;
  const prior15 = prior && typeof prior[3] === "number" ? Number(prior[3]) : null;

  const weekOf = excelSerialToDate(Number(latest[0])).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });

  const snapshot: MortgageRateSnapshot = {
    rate30: Math.round(rate30 * 100) / 100,
    rate15: Math.round(rate15 * 100) / 100,
    prior30,
    prior15,
    change30:
      prior30 != null ? Math.round((rate30 - prior30) * 100) / 100 : null,
    change15:
      prior15 != null ? Math.round((rate15 - prior15) * 100) / 100 : null,
    weekOf,
    fetchedAt: new Date().toISOString(),
    source: "Freddie Mac PMMS",
  };

  cache = { at: Date.now(), data: snapshot };
  return snapshot;
}
