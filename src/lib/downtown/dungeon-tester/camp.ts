/**
 * DungeonTester camp + inventory — sleep, merchant, trail luck, equip.
 * Own frontier stock/loot (not a Neverworld midgame clone).
 */

import {
  campSleepCooldownMs,
  campSleepsRemaining,
  CAMP_SLEEP_MAX,
  CAMP_SLEEP_WINDOW_MS,
  sleepAtCamp,
} from "@/lib/downtown/party-chronicle/midgame";
import {
  equipItem,
  salvageInventoryItem,
  unequipSlot,
  useInventoryConsumable,
} from "@/lib/downtown/party-chronicle/engine";
import { readSpellbook } from "@/lib/downtown/party-chronicle/battle";
import { getGear } from "@/lib/downtown/party-chronicle/gear";
import { formatProperty, itemProperties } from "@/lib/downtown/party-chronicle/stats";
import { levelFromXp, skillPointsForLevelGain } from "@/lib/downtown/party-chronicle/progression";
import type {
  CharacterSave,
  EquipSlot,
  GearTier,
  PlayerSlot,
} from "@/lib/downtown/party-chronicle/types";
import { EQUIP_SLOTS, PLAYER_SLOT_ORDER } from "@/lib/downtown/party-chronicle/types";
import { DT_GEAR_POOLS, getDtGear } from "./gear";
import { dtBagItemUpgradeCue, type DtUpgradeCue } from "./gear-display";
import { dtFillEmptyEquipSlots } from "./loadout";
import { startDtCampAmbush, startDtNightAmbush } from "./battle";
import { NIGHT_AMBUSH_CHANCE } from "./night-creatures";
import { dtBeMeanToDog, dtFeedDog, normalizeDtDog } from "./dog";
import { applyPartyMutation, asPartyWorld, type DtWorldSave } from "./types";

export {
  campSleepCooldownMs,
  campSleepsRemaining,
  CAMP_SLEEP_MAX,
  CAMP_SLEEP_WINDOW_MS,
};

export type DtCampMerchantOffer = {
  itemId: string;
  name: string;
  blurb: string;
  price: number;
  tier: string;
};

/** Frontier peddler — DT catalog only. */
const DT_MERCHANT_STOCK: { itemId: string; price: number }[] = [
  { itemId: "dt-trail-jerky", price: 6 },
  { itemId: "dt-dust-poultice", price: 16 },
  { itemId: "dt-mana-cider", price: 22 },
  { itemId: "dt-greater-poultice", price: 48 },
  { itemId: "dt-iron-hatchet", price: 28 },
  { itemId: "dt-ranch-carbine", price: 42 },
  { itemId: "dt-plank-shield", price: 24 },
  { itemId: "dt-hide-jerkin", price: 30 },
];

export function campMerchantStock(): DtCampMerchantOffer[] {
  return DT_MERCHANT_STOCK.map((row) => {
    const gear = getDtGear(row.itemId) ?? getGear(row.itemId);
    return {
      itemId: row.itemId,
      name: gear?.name ?? row.itemId,
      blurb: gear?.blurb ?? "Trail goods.",
      price: row.price,
      tier: gear?.tier ?? "common",
    };
  });
}

function nextPlayableSlot(world: DtWorldSave, current: PlayerSlot): PlayerSlot {
  const sealed = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (!sealed.length) {
    const i = PLAYER_SLOT_ORDER.indexOf(current);
    return PLAYER_SLOT_ORDER[(i + 1) % PLAYER_SLOT_ORDER.length]!;
  }
  const from = sealed.indexOf(current);
  if (from < 0) return sealed[0]!;
  return sealed[(from + 1) % sealed.length]!;
}

function advanceDtTurn(world: DtWorldSave): DtWorldSave {
  const next = nextPlayableSlot(world, world.activeSlot);
  return {
    ...world,
    activeSlot: next,
    turnIndex: world.turnIndex + 1,
    log: [`Turn ${world.turnIndex + 1}: ${next}'s move.`, ...world.log].slice(0, 80),
    updatedAt: new Date().toISOString(),
  };
}

function applyXp(char: CharacterSave, xp: number): CharacterSave {
  const before = char.level;
  const newXp = char.xp + xp;
  const after = levelFromXp(newXp);
  const pts = skillPointsForLevelGain(before, after);
  const hpBump = Math.max(0, after - before) * 2;
  return {
    ...char,
    xp: newXp,
    level: after,
    skillPoints: char.skillPoints + pts,
    maxHp: char.maxHp + hpBump,
    hp: Math.min(char.maxHp + hpBump, char.hp + hpBump),
  };
}

function grantLoot(char: CharacterSave, lootIds: string[]): CharacterSave {
  const inventory = [...char.inventory];
  for (const id of lootIds) {
    if (!inventory.includes(id)) inventory.push(id);
  }
  return dtFillEmptyEquipSlots({ ...char, inventory });
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Parse `dt-ch-01-…` / `ch1` style chapter ids into act 1–N. */
function dtActNumber(chapterId: string): number {
  const dt = chapterId.match(/dt-ch-0*(\d+)/i);
  if (dt) return Math.max(1, Number(dt[1]));
  const ch = chapterId.match(/^ch(\d+)/i);
  if (ch) return Math.max(1, Number(ch[1]));
  return 1;
}

function poolTiersForAct(act: number, kind: "chest" | "dig"): GearTier[] {
  if (kind === "chest") {
    if (act <= 2) return ["common", "common", "uncommon"];
    if (act <= 5) return ["common", "uncommon", "uncommon", "rare"];
    if (act <= 8) return ["uncommon", "rare", "rare", "epic"];
    return ["rare", "epic", "epic", "legendary"];
  }
  if (act <= 2) return ["common", "common", "common"];
  if (act <= 5) return ["common", "common", "uncommon"];
  if (act <= 8) return ["common", "uncommon", "uncommon", "rare"];
  return ["uncommon", "rare", "epic", "legendary"];
}

function pickDtLoot(
  tier: GearTier,
  rng: () => number,
  owned: Set<string>
): string | null {
  const aliases: Record<string, string[]> = {
    common: ["common"],
    uncommon: ["uncommon", "magic"],
    magic: ["magic", "uncommon"],
    rare: ["rare"],
    epic: ["epic"],
    legendary: ["legendary"],
  };
  const keys = aliases[tier] ?? [tier];
  const fromPools = [
    ...keys.flatMap((k) => DT_GEAR_POOLS[k] ?? []),
    ...(tier === "common" ? DT_GEAR_POOLS.trash ?? [] : []),
  ];
  const candidates = [...new Set(fromPools)].filter((id) => {
    if (owned.has(id)) return false;
    const g = getDtGear(id) ?? getGear(id);
    return Boolean(g) && g!.slot !== "misc";
  });
  if (!candidates.length) return null;
  return candidates[Math.floor(rng() * candidates.length)] ?? null;
}

const CHEST_BLURBS = [
  "A mossy chest half-swallowed by trail dust.",
  "Iron bands, a crooked lock, and a comic-panel sparkle.",
  "Someone hid this under a mile-marker years ago.",
  "The latch gives with a satisfying *click*.",
];

const DIG_BLURBS = [
  "The dogs start pawing — soft ground, wrong for a root.",
  "A hollow *thunk* under the shovel.",
  "Mud, then metal, then luck.",
  "You dig where the raven kept staring.",
];

function exploreTrail(
  world: DtWorldSave,
  slot: PlayerSlot,
  kind: "chest" | "dig"
): { world: DtWorldSave; message: string } {
  if (world.activeSlot !== slot) return { world, message: "Not your turn." };
  if (world.endingId) return { world, message: "March already closed." };
  if (world.battle) return { world, message: "Finish the battle first." };

  const act = dtActNumber(world.chapterId);
  const seed =
    world.turnIndex * 7919 +
    act * 97 +
    (kind === "chest" ? 11 : 29) +
    slot.length * 13 +
    (world.explorationFinds ?? 0) * 17;
  const rng = mulberry32(seed);
  const tiers = poolTiersForAct(act, kind);
  const owned = new Set(world.characters[slot].inventory);
  const itemCount =
    kind === "chest"
      ? 2 + (rng() > 0.55 ? 1 : 0)
      : 1 + (rng() > 0.45 ? 1 : 0);

  const itemIds: string[] = [];
  for (let i = 0; i < itemCount; i++) {
    const tier = tiers[Math.floor(rng() * tiers.length)] ?? "common";
    const id = pickDtLoot(tier, rng, owned);
    if (id) {
      itemIds.push(id);
      owned.add(id);
    }
  }
  if (!itemIds.length) {
    const fallback = pickDtLoot("common", rng, owned);
    if (fallback) itemIds.push(fallback);
  }

  const goldBase = kind === "chest" ? 12 : 6;
  const gold = goldBase + act * (kind === "chest" ? 4 : 2) + Math.floor(rng() * 10);
  const xp = (kind === "chest" ? 8 : 5) + act * 2 + Math.floor(rng() * 4);
  const blurbs = kind === "chest" ? CHEST_BLURBS : DIG_BLURBS;
  const blurb = blurbs[Math.floor(rng() * blurbs.length)]!;
  const itemNames = itemIds.map(
    (id) => getDtGear(id)?.name ?? getGear(id)?.name ?? id
  );
  const title = kind === "chest" ? "Treasure chest!" : "Buried cache!";

  let char = applyXp(world.characters[slot], xp);
  char = { ...char, gold: char.gold + gold };
  char = grantLoot(char, itemIds);

  const lootLine = itemNames.length ? itemNames.join(", ") : "dusty nothing";
  const message = `${title} ${blurb} — ${char.name} finds ${lootLine} (+${gold}g, +${xp} XP).`;

  return {
    world: advanceDtTurn({
      ...world,
      characters: { ...world.characters, [slot]: char },
      explorationFinds: (world.explorationFinds ?? 0) + 1,
      lastExploration: {
        kind,
        title,
        blurb,
        gold,
        xp,
        itemIds,
        itemNames,
      },
      log: [message, ...world.log].slice(0, 80),
    }),
    message,
  };
}

export function dtSleepAtCamp(
  world: DtWorldSave,
  slot: PlayerSlot,
  opts?: { isDm?: boolean; rng?: () => number }
): { world: DtWorldSave; message: string } {
  const sleepsBefore = world.campSleeps?.length ?? 0;
  const r = sleepAtCamp(asPartyWorld(world), slot, opts);
  let next = applyPartyMutation(world, r.world);
  const slept =
    (next.campSleeps?.length ?? 0) > sleepsBefore || /sleeps at camp/i.test(r.message);
  if (!slept || next.battle) {
    return { world: next, message: r.message };
  }
  // Successful rest clears Scarred limp.
  if (next.partyFlags?.includes("scar:limp")) {
    next = {
      ...next,
      partyFlags: next.partyFlags.filter((f) => f !== "scar:limp"),
    };
  }
  const rng = opts?.rng ?? Math.random;
  if (rng() >= NIGHT_AMBUSH_CHANCE) {
    return { world: next, message: r.message };
  }
  const ambush = startDtNightAmbush(next, rng);
  return {
    world: ambush.world,
    message: `${r.message} Something stalks the dark — ${ambush.message}`,
  };
}

export function dtBuyFromCampMerchant(
  world: DtWorldSave,
  slot: PlayerSlot,
  itemId: string,
  opts?: { isDm?: boolean }
): { world: DtWorldSave; message: string } {
  if (world.activeSlot !== slot && !opts?.isDm) {
    return { world, message: "Not your turn." };
  }
  if (world.endingId) return { world, message: "March already closed." };
  if (world.battle?.status === "active") {
    return { world, message: "Finish the battle first." };
  }

  const offer = campMerchantStock().find((o) => o.itemId === itemId);
  if (!offer) return { world, message: "The peddler doesn't sell that." };

  const buyer = world.characters[slot];
  if (!buyer?.created) return { world, message: "Seal your hero first." };
  if (buyer.gold < offer.price) {
    return { world, message: `Need ${offer.price}g — you have ${buyer.gold}g.` };
  }

  const gear = getDtGear(itemId) ?? getGear(itemId);
  if (buyer.inventory.includes(itemId) && gear && gear.slot !== "consumable") {
    return { world, message: `You already carry ${offer.name}.` };
  }

  const inventory = [...buyer.inventory];
  if (!inventory.includes(itemId) || gear?.slot === "consumable") {
    inventory.push(itemId);
  }

  let char: CharacterSave = {
    ...buyer,
    gold: buyer.gold - offer.price,
    inventory,
  };
  char = dtFillEmptyEquipSlots(char);
  const autoNote =
    gear &&
    gear.slot !== "consumable" &&
    gear.slot !== "misc" &&
    char.equipped[gear.slot as EquipSlot] === itemId &&
    !buyer.equipped[gear.slot as EquipSlot]
      ? " · auto-equipped"
      : "";

  const message = `${char.name} buys ${offer.name} for ${offer.price}g (${char.gold}g left)${autoNote}.`;

  return {
    world: advanceDtTurn({
      ...world,
      characters: { ...world.characters, [slot]: char },
      log: [message, ...world.log].slice(0, 80),
    }),
    message,
  };
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
  return exploreTrail(world, slot, "chest");
}

export function dtDigForLoot(
  world: DtWorldSave,
  slot: PlayerSlot
): { world: DtWorldSave; message: string } {
  return exploreTrail(world, slot, "dig");
}

export function dtEquipItem(
  world: DtWorldSave,
  slot: PlayerSlot,
  itemId: string
): { world: DtWorldSave; message: string } | { error: string } {
  const result = equipItem(world.characters[slot], itemId);
  if ("error" in result) return result;
  const name = getDtGear(itemId)?.name ?? getGear(itemId)?.name ?? itemId;
  return {
    world: {
      ...world,
      characters: { ...world.characters, [slot]: result },
      updatedAt: new Date().toISOString(),
    },
    message: `Equipped ${name}.`,
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
  const item = getDtGear(itemId) ?? getGear(itemId);
  const bits: string[] = [];
  if (item?.heal) bits.push(`+${item.heal} HP`);
  if (item?.manaRestore) bits.push(`+${item.manaRestore} Mana`);
  if (item?.tags?.includes("dog")) bits.push("dog fed");
  return {
    world: {
      ...world,
      characters: { ...world.characters, [slot]: result },
      updatedAt: new Date().toISOString(),
    },
    message: `Used ${item?.name ?? itemId}${bits.length ? ` (${bits.join(", ")})` : ""}.`,
  };
}

/** Share scraps without spending an item — keeps the dog in ambushes. */
export function dtCampFeedDog(
  world: DtWorldSave,
  slot: PlayerSlot
): { world: DtWorldSave; message: string } | { error: string } {
  const c = world.characters[slot];
  if (!c?.created) return { error: "Seal your hero first." };
  if (world.battle?.status === "active") return { error: "Finish the battle first." };
  const next = dtFeedDog(c, { bond: 3 });
  const dog = normalizeDtDog(next.dog);
  return {
    world: {
      ...world,
      characters: { ...world.characters, [slot]: next },
      updatedAt: new Date().toISOString(),
      log: [`${c.name} feeds ${dog.name} — hunger cleared.`, ...world.log].slice(0, 80),
    },
    message: `${dog.name} eats trail scraps — ready for the next fight.`,
  };
}

/** Mean treatment — dog sulks and hides at camp until fed. */
export function dtCampMeanToDog(
  world: DtWorldSave,
  slot: PlayerSlot
): { world: DtWorldSave; message: string } | { error: string } {
  const c = world.characters[slot];
  if (!c?.created) return { error: "Seal your hero first." };
  if (world.battle?.status === "active") return { error: "Finish the battle first." };
  const next = dtBeMeanToDog(c);
  const dog = normalizeDtDog(next.dog);
  return {
    world: {
      ...world,
      characters: { ...world.characters, [slot]: next },
      updatedAt: new Date().toISOString(),
      log: [`${c.name} shoved ${dog.name} away — the dog sulks.`, ...world.log].slice(0, 80),
    },
    message: `${dog.name} runs to hide at camp. Feed them before they'll fight again.`,
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

/** Equipped + bag snapshot for Camp UI. */
export function dtLoadoutSummary(char: CharacterSave): {
  worn: { slot: EquipSlot; id: string; name: string; tier: string }[];
  bag: {
    id: string;
    name: string;
    slot: string;
    tier: string;
    stats: string[];
    equippable: boolean;
    equipped: boolean;
    consumable: boolean;
    /** Same-slot combat-score upgrade vs worn piece (see dtBagItemUpgradeCue). */
    upgrade: DtUpgradeCue | null;
  }[];
} {
  const wornIds = new Set(
    EQUIP_SLOTS.map((s) => char.equipped[s]).filter(Boolean) as string[]
  );
  const worn = EQUIP_SLOTS.flatMap((slot) => {
    const id = char.equipped[slot];
    if (!id) return [];
    const g = getDtGear(id) ?? getGear(id);
    const tier = g?.rarity ?? g?.tier ?? "common";
    return [{ slot, id, name: g?.name ?? id, tier }];
  });
  const bag = char.inventory.map((id) => {
    const g = getDtGear(id) ?? getGear(id);
    const slot = g?.slot ?? "misc";
    const equippable =
      !!g && slot !== "consumable" && slot !== "misc" && EQUIP_SLOTS.includes(slot as EquipSlot);
    const tier = g?.rarity ?? g?.tier ?? "common";
    const equipped = wornIds.has(id);
    const stats = g
      ? itemProperties(g)
          .slice(0, 5)
          .map((p) => formatProperty(p))
      : [];
    if (g?.heal) stats.push(`+${g.heal} HP`);
    if (g?.manaRestore) stats.push(`+${g.manaRestore} MP`);
    if (g?.staminaRestore) stats.push(`+${g.staminaRestore} ST`);
    return {
      id,
      name: g?.name ?? id,
      slot,
      tier: tier === "magic" ? "uncommon" : tier,
      stats: stats.slice(0, 5),
      equippable,
      equipped,
      consumable: slot === "consumable",
      upgrade: dtBagItemUpgradeCue(char, id, { alreadyEquipped: equipped }),
    };
  });
  return { worn, bag };
}
