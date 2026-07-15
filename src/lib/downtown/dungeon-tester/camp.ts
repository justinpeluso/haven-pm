/**
 * DungeonTester camp / inventory bridge — Neverworld midgame + engine helpers.
 */

import {
  digForLoot,
  stumbleOnChest,
} from "@/lib/downtown/party-chronicle/exploration";
import {
  equipItem,
  salvageInventoryItem,
  unequipSlot,
  useInventoryConsumable,
} from "@/lib/downtown/party-chronicle/engine";
import {
  buyFromCampMerchant,
  campMerchantStock,
  campSleepCooldownMs,
  campSleepsRemaining,
  CAMP_SLEEP_MAX,
  CAMP_SLEEP_WINDOW_MS,
  sleepAtCamp,
} from "@/lib/downtown/party-chronicle/midgame";
import { readSpellbook } from "@/lib/downtown/party-chronicle/battle";
import { getGear } from "@/lib/downtown/party-chronicle/gear";
import type { EquipSlot, PlayerSlot } from "@/lib/downtown/party-chronicle/types";
import { applyPartyMutation, asPartyWorld, type DtWorldSave } from "./types";
import { startDtCampAmbush } from "./battle";

export {
  campMerchantStock,
  campSleepCooldownMs,
  campSleepsRemaining,
  CAMP_SLEEP_MAX,
  CAMP_SLEEP_WINDOW_MS,
};

export function dtSleepAtCamp(
  world: DtWorldSave,
  slot: PlayerSlot,
  opts?: { isDm?: boolean }
): { world: DtWorldSave; message: string } {
  const r = sleepAtCamp(asPartyWorld(world), slot, opts);
  return { world: applyPartyMutation(world, r.world), message: r.message };
}

export function dtBuyFromCampMerchant(
  world: DtWorldSave,
  slot: PlayerSlot,
  itemId: string,
  opts?: { isDm?: boolean }
): { world: DtWorldSave; message: string } {
  const r = buyFromCampMerchant(asPartyWorld(world), slot, itemId, opts);
  return { world: applyPartyMutation(world, r.world), message: r.message };
}

export function dtForceAmbush(
  world: DtWorldSave
): { world: DtWorldSave; message: string } {
  return startDtCampAmbush(world);
}

export function dtStumbleOnChest(
  world: DtWorldSave,
  slot: PlayerSlot
): { world: DtWorldSave; message: string } {
  const r = stumbleOnChest(asPartyWorld(world), slot);
  return { world: applyPartyMutation(world, r.world), message: r.message };
}

export function dtDigForLoot(
  world: DtWorldSave,
  slot: PlayerSlot
): { world: DtWorldSave; message: string } {
  const r = digForLoot(asPartyWorld(world), slot);
  return { world: applyPartyMutation(world, r.world), message: r.message };
}

export function dtEquipItem(
  world: DtWorldSave,
  slot: PlayerSlot,
  itemId: string
): { world: DtWorldSave; message: string } | { error: string } {
  const result = equipItem(world.characters[slot], itemId);
  if ("error" in result) return result;
  return {
    world: {
      ...world,
      characters: { ...world.characters, [slot]: result },
      updatedAt: new Date().toISOString(),
    },
    message: `Equipped ${getGear(itemId)?.name ?? itemId}.`,
  };
}

export function dtUnequipSlot(
  world: DtWorldSave,
  slot: PlayerSlot,
  equipSlot: EquipSlot
): { world: DtWorldSave; message: string } | { error: string } {
  const result = unequipSlot(world.characters[slot], equipSlot);
  if ("error" in result) return result;
  return {
    world: {
      ...world,
      characters: { ...world.characters, [slot]: result },
      updatedAt: new Date().toISOString(),
    },
    message: `Unequipped ${equipSlot}.`,
  };
}

export function dtUseConsumable(
  world: DtWorldSave,
  slot: PlayerSlot,
  itemId: string
): { world: DtWorldSave; message: string } | { error: string } {
  const result = useInventoryConsumable(world.characters[slot], itemId);
  if ("error" in result) return result;
  const item = getGear(itemId);
  const bits: string[] = [];
  if (item?.heal) bits.push(`+${item.heal} HP`);
  if (item?.manaRestore) bits.push(`+${item.manaRestore} Mana`);
  return {
    world: {
      ...world,
      characters: { ...world.characters, [slot]: result },
      updatedAt: new Date().toISOString(),
    },
    message: `Used ${item?.name ?? itemId}${bits.length ? ` (${bits.join(", ")})` : ""}.`,
  };
}

export function dtSalvageItem(
  world: DtWorldSave,
  slot: PlayerSlot,
  itemId: string
): { world: DtWorldSave; message: string } | { error: string } {
  const result = salvageInventoryItem(world.characters[slot], itemId);
  if ("error" in result) return result;
  return {
    world: {
      ...world,
      characters: { ...world.characters, [slot]: result.char },
      log: [`Broke down ${result.name} for ${result.gold}g.`, ...world.log].slice(0, 80),
      updatedAt: new Date().toISOString(),
    },
    message: `Broke down ${result.name} → +${result.gold}g scrap.`,
  };
}

export function dtReadSpellbook(
  world: DtWorldSave,
  slot: PlayerSlot,
  itemId: string
): { world: DtWorldSave; message: string } {
  const r = readSpellbook(asPartyWorld(world), slot, itemId);
  return { world: applyPartyMutation(world, r.world), message: r.message };
}
