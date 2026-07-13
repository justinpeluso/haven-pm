/**
 * Camp exploration: stumble on treasure chests + dig for buried loot.
 * Pulls real gear IDs from catalog / loot pools.
 */

import { LOOT_POOLS } from "./bestiary";
import { allGearItems, getGear } from "./gear";
import { levelFromXp, skillPointsForLevelGain } from "./progression";
import type { CharacterSave, GearItem, GearTier, PartyWorldSave, PlayerSlot } from "./types";
import { PLAYER_SLOT_ORDER } from "./types";

export type ExplorationFindKind = "chest" | "dig";

export type ExplorationFind = {
  kind: ExplorationFindKind;
  title: string;
  blurb: string;
  gold: number;
  xp: number;
  itemIds: string[];
  itemNames: string[];
};

function nextPlayableSlot(world: PartyWorldSave, current: PlayerSlot): PlayerSlot {
  const sealed = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (sealed.length === 0) {
    const i = PLAYER_SLOT_ORDER.indexOf(current);
    return PLAYER_SLOT_ORDER[(i + 1) % PLAYER_SLOT_ORDER.length]!;
  }
  const from = sealed.indexOf(current);
  if (from < 0) return sealed[0]!;
  return sealed[(from + 1) % sealed.length]!;
}

function advanceTurn(world: PartyWorldSave): PartyWorldSave {
  const next = nextPlayableSlot(world, world.activeSlot);
  return {
    ...world,
    activeSlot: next,
    turnIndex: world.turnIndex + 1,
    log: [`Turn ${world.turnIndex + 1}: ${next}'s move.`, ...world.log].slice(0, 80),
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
  return { ...char, inventory };
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function actNumber(chapterId: string): number {
  const m = chapterId.match(/^ch(\d+)/);
  return m ? Number(m[1]) : 1;
}

function poolForAct(act: number, kind: ExplorationFindKind): GearTier[] {
  if (kind === "chest") {
    if (act <= 2) return ["common", "common", "magic"];
    if (act <= 5) return ["common", "magic", "magic", "rare"];
    if (act <= 8) return ["magic", "magic", "rare", "rare"];
    return ["magic", "rare", "rare", "legendary"];
  }
  // Digging is riskier / muddier — more commons, occasional jackpot
  if (act <= 2) return ["common", "common", "common"];
  if (act <= 5) return ["common", "common", "magic"];
  if (act <= 8) return ["common", "magic", "magic", "rare"];
  return ["magic", "magic", "rare", "legendary"];
}

function heroLootCandidates(tier: GearTier): GearItem[] {
  return allGearItems().filter((g) => {
    if (g.tags.includes("animal-gear") || g.tags.includes("animal")) return false;
    if (g.slot === "misc") return false;
    if (g.tier !== tier && g.rarity !== tier) return false;
    return true;
  });
}

function pickFromPool(tier: GearTier, rng: () => number, owned: Set<string>): string | null {
  const fromPools = LOOT_POOLS[tier] ?? [];
  const catalog = heroLootCandidates(tier).map((g) => g.id);
  const pool = [...new Set([...fromPools, ...catalog])].filter((id) => {
    if (owned.has(id)) return false;
    const g = getGear(id);
    return Boolean(g) && !g!.tags.includes("animal-gear");
  });
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

const CHEST_BLURBS = [
  "A mossy chest half-swallowed by roots.",
  "Iron bands, a crooked lock, and a comic-panel sparkle.",
  "Someone hid this under a mile-marker years ago.",
  "The latch gives with a satisfying *click*.",
  "Trail dust and old coin shine inside.",
];

const DIG_BLURBS = [
  "The dogs start pawing — soft ground, wrong for a root.",
  "A hollow *thunk* under the shovel.",
  "Mud, then metal, then luck.",
  "You dig where the raven kept staring.",
  "A buried satchel, still dry somehow.",
];

function rollFind(
  world: PartyWorldSave,
  slot: PlayerSlot,
  kind: ExplorationFindKind
): ExplorationFind {
  const act = actNumber(world.chapterId);
  const seed =
    world.turnIndex * 7919 +
    act * 97 +
    (kind === "chest" ? 11 : 29) +
    slot.length * 13 +
    (world.explorationFinds ?? 0) * 17;
  const rng = mulberry32(seed);
  const tiers = poolForAct(act, kind);
  const owned = new Set(world.characters[slot].inventory);
  const itemCount =
    kind === "chest"
      ? 2 + (rng() > 0.55 ? 1 : 0) + (rng() > 0.85 ? 1 : 0)
      : 1 + (rng() > 0.45 ? 1 : 0) + (rng() > 0.9 ? 1 : 0);

  const itemIds: string[] = [];
  for (let i = 0; i < itemCount; i++) {
    const tier = tiers[Math.floor(rng() * tiers.length)] ?? "common";
    const id = pickFromPool(tier, rng, owned);
    if (id) {
      itemIds.push(id);
      owned.add(id);
    }
  }

  // Guarantee at least one real item if pools exist
  if (!itemIds.length) {
    const fallback = pickFromPool("common", rng, owned) ?? pickFromPool("magic", rng, owned);
    if (fallback) itemIds.push(fallback);
  }

  const goldBase = kind === "chest" ? 12 : 6;
  const gold = goldBase + act * (kind === "chest" ? 4 : 2) + Math.floor(rng() * 10);
  const xp = (kind === "chest" ? 8 : 5) + act * 2 + Math.floor(rng() * 4);
  const blurbs = kind === "chest" ? CHEST_BLURBS : DIG_BLURBS;
  const blurb = blurbs[Math.floor(rng() * blurbs.length)]!;
  const itemNames = itemIds.map((id) => getGear(id)?.name ?? id);

  return {
    kind,
    title: kind === "chest" ? "Treasure chest!" : "Buried cache!",
    blurb,
    gold,
    xp,
    itemIds,
    itemNames,
  };
}

export function exploreForLoot(
  world: PartyWorldSave,
  slot: PlayerSlot,
  kind: ExplorationFindKind
): { world: PartyWorldSave; message: string; find?: ExplorationFind } {
  if (world.activeSlot !== slot) return { world, message: "Not your turn." };
  if (world.endingId) return { world, message: "Chronicle already closed." };
  if (world.battle) return { world, message: "Finish the battle first." };
  if (world.deckEncounter && (world.encounterEnemyHp ?? 0) > 0) {
    return { world, message: "Finish or flee the road fight first." };
  }

  const find = rollFind(world, slot, kind);
  let char = applyXp(world.characters[slot], find.xp);
  char = { ...char, gold: char.gold + find.gold };
  char = grantLoot(char, find.itemIds);

  const lootLine =
    find.itemNames.length > 0
      ? find.itemNames.join(", ")
      : "dusty nothing (somehow)";
  const message = `${find.title} ${find.blurb} — ${char.name} finds ${lootLine} (+${find.gold}g, +${find.xp} XP).`;

  return {
    world: advanceTurn({
      ...world,
      characters: { ...world.characters, [slot]: char },
      explorationFinds: (world.explorationFinds ?? 0) + 1,
      lastExploration: find,
      log: [message, ...world.log].slice(0, 80),
    }),
    message,
    find,
  };
}

export function stumbleOnChest(world: PartyWorldSave, slot: PlayerSlot) {
  return exploreForLoot(world, slot, "chest");
}

export function digForLoot(world: PartyWorldSave, slot: PlayerSlot) {
  return exploreForLoot(world, slot, "dig");
}
