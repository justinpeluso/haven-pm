/**
 * DungeonTester gear display helpers — rarity labels + combat sheet.
 */

import { computeEffectiveStats, itemProperties } from "@/lib/downtown/party-chronicle/stats";
import type { CharacterSave, GearItem, GearProperty, GearTier } from "@/lib/downtown/party-chronicle/types";

/** Display label for rarity ladder (magic → Uncommon for DT). */
export function formatGearTier(tier: GearTier | string | undefined): string {
  const t = tier ?? "common";
  if (t === "magic") return "Uncommon";
  return t.charAt(0).toUpperCase() + t.slice(1);
}

/** Canonical DT rarity for CSS `data-tier` (normalize magic → uncommon). */
export function gearTierAttr(tier: GearTier | string | undefined): string {
  const t = tier ?? "common";
  return t === "magic" ? "uncommon" : t;
}

/** Up to 5 combat-facing affixes for inventory cards / tips. */
export function displayItemStats(item: GearItem, limit = 5): GearProperty[] {
  return itemProperties(item).slice(0, limit);
}

export function resolveDtCombatSheet(char: CharacterSave) {
  return computeEffectiveStats(char);
}
