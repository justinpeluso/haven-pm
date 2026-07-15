/**
 * DungeonTester gear catalog — frontier + fantasy mix.
 * Prefixed `dt-` ids avoid collisions with Neverworld GEAR_CATALOG.
 * Shell may import shared `party-chronicle/gear` and call `mergeDtGear(shared)`.
 */

import gearPack from "../../../../data/dungeon-tester/gear.json";
import { registerGearItems } from "@/lib/downtown/party-chronicle/gear";
import type { GearItem } from "../party-chronicle/types";

type GearPack = {
  version: number;
  flavor?: string;
  pools: Record<string, string[]>;
  items: GearItem[];
};

const pack = gearPack as GearPack;

/** DT-only catalog (all ids start with `dt-`). */
export const DT_GEAR_CATALOG: GearItem[] = pack.items ?? [];

export const DT_GEAR_POOLS: Record<string, string[]> = pack.pools ?? {};

const DT_BY_ID = Object.fromEntries(DT_GEAR_CATALOG.map((i) => [i.id, i]));

/** Make `getGear` resolve frontier ids for equip / inventory / consumables. */
registerGearItems(DT_GEAR_CATALOG);

/**
 * Merge shared Neverworld gear with DT additions.
 * DT items win on id collision (should not collide thanks to `dt-` prefix).
 */
export function mergeDtGear(shared: GearItem[]): GearItem[] {
  const map = new Map<string, GearItem>();
  for (const item of shared) map.set(item.id, item);
  for (const item of DT_GEAR_CATALOG) map.set(item.id, item);
  return [...map.values()];
}

export function getDtGear(id: string): GearItem | undefined {
  return DT_BY_ID[id];
}

/** Prefer DT catalog, then an optional shared list. */
export function getDtOrSharedGear(id: string, shared: GearItem[] = []): GearItem | undefined {
  return DT_BY_ID[id] ?? shared.find((g) => g.id === id);
}

export function dtGearBySlot(slot: GearItem["slot"]): GearItem[] {
  return DT_GEAR_CATALOG.filter((g) => g.slot === slot);
}

export function dtGearByTier(tier: GearItem["tier"]): GearItem[] {
  return DT_GEAR_CATALOG.filter((g) => g.tier === tier);
}

/** Starting kit for solo frontier gunslinger MVP. */
export const DT_STARTER_LOADOUT: string[] = [
  "dt-frontier-revolver",
  "dt-hide-duster",
  "dt-sun-hat",
  "dt-spur-boots",
  "dt-work-gloves",
  "dt-trail-jerky",
  "dt-dust-poultice",
  "dt-copper-spur",
];

export function dtStarterGear(): GearItem[] {
  return DT_STARTER_LOADOUT.map((id) => DT_BY_ID[id]).filter(Boolean) as GearItem[];
}

export function dtGearStats() {
  return {
    items: DT_GEAR_CATALOG.length,
    weapons: DT_GEAR_CATALOG.filter((g) => g.slot === "weapon").length,
    armorPieces: DT_GEAR_CATALOG.filter((g) =>
      ["head", "chest", "hands", "legs", "offhand"].includes(g.slot)
    ).length,
  };
}
