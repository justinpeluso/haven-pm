/**
 * DungeonTester gear display helpers — rarity labels + combat sheet.
 */

import { GEAR_CATALOG, getGear } from "@/lib/downtown/party-chronicle/gear";
import { computeEffectiveStats, itemProperties } from "@/lib/downtown/party-chronicle/stats";
import type {
  CharacterSave,
  EquipSlot,
  GearItem,
  GearProperty,
  GearTier,
} from "@/lib/downtown/party-chronicle/types";
import { EQUIP_SLOTS } from "@/lib/downtown/party-chronicle/types";
import { getDtGear } from "./gear";

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

/**
 * Same-slot upgrade compare (Camp / Gear / victory bag).
 *
 * Score = sum of all `itemProperties` values (power→ATK and armor→DEF already
 * folded in). Consumables / misc / non-equip slots are skipped. A bag item is
 * an upgrade when its score is strictly greater than the worn piece in the
 * same slot, or when that slot is empty.
 */
export type DtUpgradeCue = "upgrade" | "empty";

export function dtGearCombatScore(item: GearItem): number {
  return itemProperties(item).reduce((sum, p) => sum + p.value, 0);
}

export function dtResolveGear(id: string | null | undefined): GearItem | null {
  if (!id) return null;
  return (
    getDtGear(id) ??
    getGear(id) ??
    GEAR_CATALOG.find((g) => g.id === id) ??
    null
  );
}

export function dtBagItemUpgradeCue(
  char: CharacterSave,
  itemId: string,
  opts?: { alreadyEquipped?: boolean }
): DtUpgradeCue | null {
  if (opts?.alreadyEquipped) return null;
  const candidate = dtResolveGear(itemId);
  if (!candidate) return null;
  if (candidate.slot === "consumable" || candidate.slot === "misc") return null;
  if (!EQUIP_SLOTS.includes(candidate.slot as EquipSlot)) return null;

  const wornId = char.equipped[candidate.slot as EquipSlot] ?? null;
  if (wornId === itemId) return null;
  if (!wornId) return "empty";

  const worn = dtResolveGear(wornId);
  if (!worn) return "empty";

  return dtGearCombatScore(candidate) > dtGearCombatScore(worn) ? "upgrade" : null;
}

/**
 * Score a drop for the sealed party: prefer empty slots, then strict
 * same-slot upgrades. Consumables / non-upgrades score 0.
 */
export function dtLootUpgradeBiasScore(
  itemId: string,
  party: CharacterSave[]
): number {
  let best = 0;
  for (const char of party) {
    if (!char?.created) continue;
    const cue = dtBagItemUpgradeCue(char, itemId);
    if (cue === "empty") best = Math.max(best, 3);
    else if (cue === "upgrade") best = Math.max(best, 2);
  }
  return best;
}
