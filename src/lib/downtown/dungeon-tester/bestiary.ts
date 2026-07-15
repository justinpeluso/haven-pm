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
import type { GearItem, GearTier } from "../party-chronicle/types";

export type DtLootPoolId = "trash" | "common" | "magic" | "rare" | "legendary";

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
  rarity?: "common" | "magic" | "rare" | "legendary";
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

export function getDtBattleLootItem(id: string): DtBattleLootItem | undefined {
  return LOOT_BY_ID[id];
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
  const ids = DT_LOOT_POOLS[poolId] ?? DT_LOOT_POOLS.common ?? [];
  if (!ids.length) return undefined;
  const id = ids[Math.floor(rng() * ids.length)]!;
  return LOOT_BY_ID[id];
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
    lootTier: ["trash", "common", "magic", "rare", "legendary"].includes(String(c.lootPool))
      ? (c.lootPool === "trash" ? "common" : (c.lootPool as GearTier))
      : tier,
  };
}

/** Wire DT packs into shared battle lookups (Neverworld catalog unchanged). */
registerExternalBestiary({
  getCreature: (id) => CREATURE_BY_ID[id] as CreatureDef | undefined,
  getBoss: (id) => BOSS_BY_ID[id] as BossDef | undefined,
  getLoot: (id) => LOOT_BY_ID[id],
});
