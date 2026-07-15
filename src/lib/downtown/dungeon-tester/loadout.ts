/**
 * Shared wear/bag helpers for DungeonTester (camp + seal).
 */

import { equipItem } from "@/lib/downtown/party-chronicle/engine";
import { getGear } from "@/lib/downtown/party-chronicle/gear";
import type { CharacterSave, EquipSlot } from "@/lib/downtown/party-chronicle/types";
import { EQUIP_SLOTS } from "@/lib/downtown/party-chronicle/types";
import { getDtGear } from "./gear";

/** Fill empty wear slots from bag (weapon / armor / trinket). */
export function dtFillEmptyEquipSlots(char: CharacterSave): CharacterSave {
  let next = char;
  for (const id of char.inventory) {
    const gear = getGear(id) ?? getDtGear(id);
    if (!gear) continue;
    if (gear.slot === "consumable" || gear.slot === "misc") continue;
    if (!EQUIP_SLOTS.includes(gear.slot as EquipSlot)) continue;
    if (next.equipped[gear.slot as EquipSlot]) continue;
    const r = equipItem(next, id);
    if (!("error" in r)) next = r;
  }
  return next;
}
