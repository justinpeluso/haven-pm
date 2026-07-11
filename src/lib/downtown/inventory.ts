import inventoryJson from "../../../data/downtowns.json";
import type { DowntownInventoryFile, DowntownRecord } from "./types";

const inventory = inventoryJson as DowntownInventoryFile;

export function getDowntownInventory(): DowntownInventoryFile {
  return inventory;
}

export function listDowntowns(): DowntownRecord[] {
  return inventory.downtowns;
}

export function getDowntownById(id: string): DowntownRecord | undefined {
  return inventory.downtowns.find((d) => d.id === id);
}

export function getInventoryStats() {
  const all = inventory.downtowns;
  const avgVibrancy =
    all.reduce((s, d) => s + d.baseline.vibrancy, 0) / Math.max(1, all.length);
  const medianVacancy = (() => {
    const vals = all.map((d) => d.baseline.vacancyEstimate).sort((a, b) => a - b);
    const mid = Math.floor(vals.length / 2);
    return vals.length % 2 ? vals[mid]! : (vals[mid - 1]! + vals[mid]!) / 2;
  })();
  const pa = all.filter((d) => d.state === "PA").length;
  const oh = all.filter((d) => d.state === "OH").length;
  return {
    count: all.length,
    avgVibrancy: Math.round(avgVibrancy * 10) / 10,
    medianVacancy: Math.round(medianVacancy * 10) / 10,
    pa,
    oh,
  };
}
