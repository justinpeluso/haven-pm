/**
 * Neverworld bestiary + battle loot loaders (JSON packs under data/party-chronicle/).
 */

import creaturesPack from "../../../../data/party-chronicle/creatures.json";
import bossesPack from "../../../../data/party-chronicle/bosses.json";
import lootPack from "../../../../data/party-chronicle/battle-loot.json";
import spellbooksPack from "../../../../data/party-chronicle/spellbooks.json";
import type { AbilityDef, GearItem, GearTier } from "./types";

export type LootPoolId = "trash" | "common" | "magic" | "rare" | "legendary";

export type CreatureDef = {
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
  lootPool?: LootPoolId | string;
};

export type BossUniqueSkill = {
  id: string;
  name: string;
  blurb: string;
  power: number;
  manaCost?: number;
};

export type BossDef = CreatureDef & {
  uniqueSkill: BossUniqueSkill;
  uniqueDrops: string[];
};

export type BattleLootItem = GearItem & {
  rarity?: "common" | "magic" | "rare" | "legendary";
  manaRestore?: number;
  staminaRestore?: number;
  bossId?: string;
};

export type SpellbookDef = {
  id: string;
  name: string;
  blurb: string;
  teachesAbilityId: string;
  ability: AbilityDef;
};

export const CREATURES: CreatureDef[] = (creaturesPack as { creatures: CreatureDef[] }).creatures;
export const BOSSES: BossDef[] = (bossesPack as { bosses: BossDef[] }).bosses;
export const SPELLBOOKS: SpellbookDef[] = (spellbooksPack as { spellbooks: SpellbookDef[] }).spellbooks;

const lootRaw = lootPack as {
  pools: Record<string, string[]>;
  items: BattleLootItem[];
  bossUniques: BattleLootItem[];
};

export const LOOT_POOLS: Record<string, string[]> = lootRaw.pools ?? {};
export const BATTLE_LOOT_ITEMS: BattleLootItem[] = [
  ...(lootRaw.items ?? []),
  ...(lootRaw.bossUniques ?? []),
];

const CREATURE_BY_ID = Object.fromEntries(CREATURES.map((c) => [c.id, c]));
const BOSS_BY_ID = Object.fromEntries(BOSSES.map((b) => [b.id, b]));
const LOOT_BY_ID = Object.fromEntries(BATTLE_LOOT_ITEMS.map((i) => [i.id, i]));
const SPELLBOOK_BY_ID = Object.fromEntries(SPELLBOOKS.map((s) => [s.id, s]));
const SPELL_ABILITY_BY_ID = Object.fromEntries(
  SPELLBOOKS.map((s) => [s.ability.id, s.ability])
);

export function getCreature(id: string): CreatureDef | undefined {
  return CREATURE_BY_ID[id];
}

export function getBoss(id: string): BossDef | undefined {
  return BOSS_BY_ID[id];
}

export function getBattleLootItem(id: string): BattleLootItem | undefined {
  return LOOT_BY_ID[id];
}

export function getSpellbook(id: string): SpellbookDef | undefined {
  return SPELLBOOK_BY_ID[id];
}

export function getSpellbookAbility(id: string): AbilityDef | undefined {
  return SPELL_ABILITY_BY_ID[id];
}

export function isSpellbookItem(id: string): boolean {
  return !!SPELLBOOK_BY_ID[id] || (LOOT_BY_ID[id]?.tags ?? []).includes("spellbook");
}

export function bestiaryStats() {
  return {
    creatures: CREATURES.length,
    bosses: BOSSES.length,
    spellbooks: SPELLBOOKS.length,
    lootItems: BATTLE_LOOT_ITEMS.length,
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

/** Regular creature for party level (no bosses). */
export function rollCreature(
  partyLevel: number,
  rng: () => number = Math.random
): CreatureDef {
  const band = CREATURES.filter(
    (c) => partyLevel >= c.levelMin - 2 && partyLevel <= c.levelMax + 5
  );
  const pool = band.length ? band : CREATURES;
  return weightedPick(pool, rng);
}

/** ~12% chance of a boss in-band, else creature. */
export function rollRandomFoe(
  partyLevel: number,
  rng: () => number = Math.random
): { kind: "creature"; foe: CreatureDef } | { kind: "boss"; foe: BossDef } {
  const bossChance = 0.12;
  if (rng() < bossChance) {
    const band = BOSSES.filter(
      (b) => partyLevel >= b.levelMin - 5 && partyLevel <= b.levelMax + 10
    );
    const pool = band.length ? band : BOSSES;
    return { kind: "boss", foe: weightedPick(pool, rng) };
  }
  return { kind: "creature", foe: rollCreature(partyLevel, rng) };
}

export function pickFromPool(
  poolId: string,
  rng: () => number = Math.random
): string | null {
  const pool = LOOT_POOLS[poolId];
  if (!pool?.length) return null;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

/**
 * Standard drop + 25% chance of rare or legendary bonus drop.
 * Bosses always include their unique drops.
 */
export function rollBattleLoot(
  opts: {
    lootPool: string;
    isBoss: boolean;
    uniqueDrops?: string[];
  },
  rng: () => number = Math.random
): { itemId: string; rarity: "common" | "magic" | "rare" | "legendary" }[] {
  const drops: { itemId: string; rarity: "common" | "magic" | "rare" | "legendary" }[] = [];

  const baseId = pickFromPool(opts.lootPool, rng) ?? pickFromPool("trash", rng);
  if (baseId) {
    const item = LOOT_BY_ID[baseId];
    const rarity =
      (item?.rarity as "common" | "magic" | "rare" | "legendary" | undefined) ??
      (opts.lootPool === "magic" ? "magic" : "common");
    drops.push({ itemId: baseId, rarity });
  }

  // 25% rare or legendary
  if (rng() < 0.25) {
    const rarePool = rng() < 0.35 ? "legendary" : "rare";
    const bonusId = pickFromPool(rarePool, rng);
    if (bonusId) {
      drops.push({
        itemId: bonusId,
        rarity: rarePool === "legendary" ? "legendary" : "rare",
      });
    }
  }

  if (opts.isBoss && opts.uniqueDrops?.length) {
    for (const id of opts.uniqueDrops) {
      if (!drops.some((d) => d.itemId === id)) {
        const item = LOOT_BY_ID[id];
        drops.push({
          itemId: id,
          rarity:
            (item?.rarity as "common" | "magic" | "rare" | "legendary" | undefined) ??
            "legendary",
        });
      }
    }
  }

  return drops;
}

export function battleLootAsGear(item: BattleLootItem): GearItem {
  const tier: GearTier =
    item.tier === "legendary" || item.rarity === "legendary"
      ? "legendary"
      : item.tier === "rare" || item.rarity === "rare"
        ? "rare"
        : item.tier === "magic" || item.rarity === "magic"
          ? "magic"
          : "common";
  return {
    id: item.id,
    name: item.name,
    blurb: item.blurb,
    tier,
    slot: item.slot,
    power: item.power,
    armor: item.armor,
    heal: item.heal,
    cookBonus: item.cookBonus,
    manaRestore: item.manaRestore,
    staminaRestore: item.staminaRestore,
    tags: item.tags ?? [],
    properties: item.properties,
    setId: item.setId,
    rarity: item.rarity ?? tier,
  };
}
