/**
 * DungeonTester bestiary + battle loot (JSON under data/dungeon-tester/).
 * Used by DT simple battle (and optional external lookups). Neverworld packs stay separate.
 */

import creaturesPack from "../../../../data/dungeon-tester/creatures.json";
import bossesPack from "../../../../data/dungeon-tester/bosses.json";
import lootPack from "../../../../data/dungeon-tester/battle-loot.json";
import {
  registerExternalBestiary,
  type BossDef,
  type CreatureDef,
} from "../party-chronicle/bestiary";
import type { CharacterSave, GearItem, GearTier } from "../party-chronicle/types";
import { DT_GEAR_POOLS, getDtGear } from "./gear";
import { dtLootUpgradeBiasScore } from "./gear-display";

export type DtLootPoolId =
  | "trash"
  | "common"
  | "uncommon"
  | "magic"
  | "rare"
  | "epic"
  | "legendary";

export type DtCreatureDef = {
  id: string;
  name: string;
  blurb: string;
  levelMin: number;
  levelMax: number;
  hp: number;
  power: number;
  armor: number;
  xp: number;
  gold: number;
  tags: string[];
  artId: string;
  weight: number;
  lootPool?: DtLootPoolId | string;
};

export type DtBossUniqueSkill = {
  id: string;
  name: string;
  blurb: string;
  power: number;
  manaCost?: number;
};

export type DtBossDef = DtCreatureDef & {
  uniqueSkill: DtBossUniqueSkill;
  uniqueDrops: string[];
};

export type DtBattleLootItem = GearItem & {
  rarity?: GearTier;
};

export const DT_CREATURES: DtCreatureDef[] = (creaturesPack as { creatures: DtCreatureDef[] }).creatures;
export const DT_BOSSES: DtBossDef[] = (bossesPack as { bosses: DtBossDef[] }).bosses;

const lootRaw = lootPack as {
  pools: Record<string, string[]>;
  items: DtBattleLootItem[];
  bossUniques: DtBattleLootItem[];
};

export const DT_LOOT_POOLS: Record<string, string[]> = lootRaw.pools ?? {};
export const DT_BATTLE_LOOT_ITEMS: DtBattleLootItem[] = [
  ...(lootRaw.items ?? []),
  ...(lootRaw.bossUniques ?? []),
];

const CREATURE_BY_ID = Object.fromEntries(DT_CREATURES.map((c) => [c.id, c]));
const BOSS_BY_ID = Object.fromEntries(DT_BOSSES.map((b) => [b.id, b]));
const LOOT_BY_ID = Object.fromEntries(DT_BATTLE_LOOT_ITEMS.map((i) => [i.id, i]));

export function getDtCreature(id: string): DtCreatureDef | undefined {
  return CREATURE_BY_ID[id];
}

export function getDtBoss(id: string): DtBossDef | undefined {
  return BOSS_BY_ID[id];
}

function gearAsBattleLoot(id: string): DtBattleLootItem | undefined {
  const g = getDtGear(id);
  if (!g) return undefined;
  return { ...g, rarity: g.tier };
}

export function getDtBattleLootItem(id: string): DtBattleLootItem | undefined {
  return LOOT_BY_ID[id] ?? gearAsBattleLoot(id);
}

const TIER_ORDER: DtLootPoolId[] = [
  "trash",
  "common",
  "uncommon",
  "magic",
  "rare",
  "epic",
  "legendary",
];

/** UI label for tier ids (keeps data id `magic`). */
export function dtLootTierLabel(tier: string): string {
  if (tier === "magic") return "Enchanted";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

/**
 * Curated battle-loot pool only — do not dump the full gear catalog.
 * Thin tiers get a small named/procedural pad from gear.
 */
export function dtLootPoolIds(poolId: string): string[] {
  const curated = DT_LOOT_POOLS[poolId] ?? [];
  if (curated.length >= 10) return curated;
  const fromGear = DT_GEAR_POOLS[poolId] ?? [];
  const named = fromGear.filter(
    (id) => /^dt-[a-z]/.test(id) && !/^dt-[wg]-/.test(id)
  );
  const procedural = fromGear.filter((id) => /^dt-[wg]-/.test(id));
  const step = Math.max(1, Math.floor(procedural.length / 6));
  const procPad = procedural.filter((_, i) => i % step === 0).slice(0, 6);
  const merged = [...new Set([...curated, ...named, ...procPad])];
  if (merged.length) return merged;
  return DT_LOOT_POOLS.common ?? ["dt-trail-jerky"];
}

/** Chapter → weighted rarity mix (ceiling baked into which tiers appear). */
export const DT_CHAPTER_LOOT_WEIGHTS: Record<
  number,
  Partial<Record<DtLootPoolId, number>>
> = {
  1: { trash: 55, common: 35, uncommon: 10 },
  2: { trash: 35, common: 45, uncommon: 20 },
  3: { common: 30, uncommon: 40, magic: 25, rare: 5 },
  4: { uncommon: 25, magic: 40, rare: 30, epic: 5 },
  5: { magic: 30, rare: 50, epic: 15, legendary: 5 },
  6: { rare: 35, epic: 50, legendary: 15 },
  7: { rare: 20, epic: 45, legendary: 35 },
  8: { epic: 40, legendary: 60 },
  9: { epic: 35, legendary: 65 },
};

function chapterNumber(chapterId: string): number {
  const m = chapterId.match(/(\d+)/);
  return m ? Math.max(1, Math.min(9, parseInt(m[1]!, 10))) : 1;
}

function pickWeightedTier(
  weights: Partial<Record<DtLootPoolId, number>>,
  rng: () => number
): DtLootPoolId {
  const entries = TIER_ORDER.filter((t) => (weights[t] ?? 0) > 0).map((t) => ({
    tier: t,
    weight: weights[t]!,
  }));
  if (!entries.length) return "common";
  return weightedPick(entries, rng).tier;
}

/** Shift chapter weights one step toward a foe's preferred pool. */
function biasWeights(
  base: Partial<Record<DtLootPoolId, number>>,
  biasPool?: string
): Partial<Record<DtLootPoolId, number>> {
  if (!biasPool || !TIER_ORDER.includes(biasPool as DtLootPoolId)) return base;
  const bias = biasPool as DtLootPoolId;
  const next = { ...base };
  next[bias] = (next[bias] ?? 0) + 20;
  return next;
}

export function dtBestiaryStats() {
  return {
    creatures: DT_CREATURES.length,
    bosses: DT_BOSSES.length,
    lootItems: DT_BATTLE_LOOT_ITEMS.length,
  };
}

function weightedPick<T extends { weight?: number }>(pool: T[], rng: () => number): T {
  const total = pool.reduce((s, e) => s + (e.weight ?? 1), 0);
  let tick = rng() * total;
  for (const e of pool) {
    tick -= e.weight ?? 1;
    if (tick <= 0) return e;
  }
  return pool[pool.length - 1]!;
}

export function rollDtCreature(
  partyLevel: number,
  rng: () => number = Math.random,
  opts?: { maxCreatureLevel?: number }
): DtCreatureDef {
  const maxLv = opts?.maxCreatureLevel ?? partyLevel + 4;
  const band = DT_CREATURES.filter(
    (c) =>
      !c.tags.includes("night") &&
      c.levelMin <= maxLv &&
      partyLevel >= c.levelMin - 2 &&
      partyLevel <= c.levelMax + 5
  );
  const pool = band.length
    ? band
    : DT_CREATURES.filter((c) => c.levelMin <= Math.max(3, maxLv)).slice(0, 8);
  return weightedPick(pool.length ? pool : DT_CREATURES, rng);
}

/** ~12% chance of a boss in-band, else creature. */
export function rollDtRandomFoe(
  partyLevel: number,
  rng: () => number = Math.random
): DtCreatureDef | DtBossDef {
  if (rng() < 0.12) {
    const bosses = DT_BOSSES.filter(
      (b) => partyLevel >= b.levelMin - 3 && partyLevel <= b.levelMax + 5
    );
    if (bosses.length) return weightedPick(bosses, rng);
  }
  return rollDtCreature(partyLevel, rng);
}

export function rollDtLootFromPool(
  poolId: string,
  rng: () => number = Math.random
): DtBattleLootItem | undefined {
  const ids = dtLootPoolIds(poolId);
  if (!ids.length) return undefined;
  // Prefer named ids (~70%) over procedural filler.
  const named = ids.filter((id) => /^dt-[a-z]/.test(id) && !/^dt-[wg]-/.test(id));
  const pool = named.length && rng() < 0.7 ? named : ids;
  for (let attempt = 0; attempt < 8; attempt++) {
    const id = pool[Math.floor(rng() * pool.length)]!;
    const item = getDtBattleLootItem(id);
    if (item) return item;
  }
  return getDtBattleLootItem(ids[0]!);
}

/**
 * Weighted chapter drop. Optional foe bias + avoid-duplicate pass.
 * When `party` is provided, reroll a few times and prefer empty-slot /
 * better-than-equipped gear (~upgrade bias).
 */
export function rollDtWeightedBattleDrop(
  chapterId: string,
  rng: () => number = Math.random,
  opts?: {
    biasPool?: string;
    avoidIds?: Set<string>;
    party?: CharacterSave[];
  }
): DtBattleLootItem | undefined {
  const n = chapterNumber(chapterId);
  const weights = biasWeights(
    DT_CHAPTER_LOOT_WEIGHTS[n] ?? DT_CHAPTER_LOOT_WEIGHTS[1]!,
    opts?.biasPool
  );
  const party = opts?.party?.filter((c) => c?.created) ?? [];
  const candidates: DtBattleLootItem[] = [];
  const tries = party.length ? 14 : 10;
  for (let attempt = 0; attempt < tries; attempt++) {
    const tier = pickWeightedTier(weights, rng);
    const item = rollDtLootFromPool(tier, rng);
    if (!item) continue;
    if (opts?.avoidIds?.has(item.id) && attempt < tries - 2) continue;
    if (!party.length) return item;
    candidates.push(item);
    // Early exit on a strong empty-slot fill.
    if (dtLootUpgradeBiasScore(item.id, party) >= 3 && rng() < 0.65) {
      return item;
    }
  }
  if (!candidates.length) {
    return rollDtLootFromPool("common", rng) ?? getDtBattleLootItem("dt-trail-jerky");
  }
  if (!party.length) return candidates[0];
  // Weighted pick: empty=3, upgrade=2, other=1.
  const scored = candidates.map((item) => ({
    item,
    weight: 1 + dtLootUpgradeBiasScore(item.id, party),
  }));
  return weightedPick(scored, rng).item;
}

export function dtCreatureAsEncounter(c: DtCreatureDef): {
  id: string;
  name: string;
  hp: number;
  power: number;
  xp: number;
  gold: number;
  artId: string;
  tags: string[];
  lootTier?: GearTier;
} {
  const tier = (c.lootPool as GearTier | undefined) ?? "common";
  return {
    id: c.id,
    name: c.name,
    hp: c.hp,
    power: c.power,
    xp: c.xp,
    gold: c.gold,
    artId: c.artId,
    tags: c.tags,
    lootTier: [
      "trash",
      "common",
      "uncommon",
      "magic",
      "rare",
      "epic",
      "legendary",
    ].includes(String(c.lootPool))
      ? c.lootPool === "trash"
        ? "common"
        : c.lootPool === "magic"
          ? "uncommon"
          : (c.lootPool as GearTier)
      : tier,
  };
}

/** Wire DT packs into shared battle lookups (Neverworld catalog unchanged). */
registerExternalBestiary({
  getCreature: (id) => CREATURE_BY_ID[id] as CreatureDef | undefined,
  getBoss: (id) => BOSS_BY_ID[id] as BossDef | undefined,
  getLoot: (id) => getDtBattleLootItem(id),
});
