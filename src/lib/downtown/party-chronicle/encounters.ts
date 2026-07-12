/**
 * Encounter decks by act / level band — dense mid-game filler for ~50h.
 * Thin legacy deck kept for simple level picks; ACT_ENCOUNTER_DECKS is the full pack.
 */

import pack from "../../../../data/party-chronicle/encounters.json";
import type { GearTier } from "./types";

export type EncounterTemplate = {
  id: string;
  name: string;
  blurb: string;
  levelMin: number;
  levelMax: number;
  hp: number;
  power: number;
  xp: number;
  gold: number;
  lootTier?: GearTier;
  lootIds?: string[];
  artId?: string;
  enemyArtId?: string;
  tags: string[];
  weight?: number;
};

export type EncounterDeck = {
  id: string;
  actId: string;
  levelMin: number;
  levelMax: number;
  entries: EncounterTemplate[];
};

type RawEntry = {
  id: string;
  name: string;
  artId: string;
  enemyArtId: string;
  hp: number;
  power: number;
  lootIds: string[];
  xp: number;
  gold: number;
  tags: string[];
  weight: number;
};

type RawDeck = {
  id: string;
  actId: string;
  levelMin: number;
  levelMax: number;
  entries: RawEntry[];
};

function lootTierFromIds(lootIds: string[]): GearTier | undefined {
  if (lootIds.some((id) => id.includes("chronicle") || id.includes("crown") || id.includes("cloak-of-fellowship"))) {
    return "legendary";
  }
  if (lootIds.some((id) => ["frostbite", "elven", "ember", "amulet", "mail"].some((k) => id.includes(k)))) {
    return "magic";
  }
  if (lootIds.length) return "common";
  return undefined;
}

export const ACT_ENCOUNTER_DECKS: EncounterDeck[] = (pack.decks as RawDeck[]).map((deck) => ({
  id: deck.id,
  actId: deck.actId,
  levelMin: deck.levelMin,
  levelMax: deck.levelMax,
  entries: deck.entries.map((e) => ({
    id: e.id,
    name: e.name,
    blurb: e.tags.includes("boss") ? `Boss of ${deck.actId}: ${e.name}.` : `${e.name} bars the road.`,
    levelMin: deck.levelMin,
    levelMax: deck.levelMax,
    hp: e.hp,
    power: e.power,
    xp: e.xp,
    gold: e.gold,
    lootIds: e.lootIds,
    lootTier: lootTierFromIds(e.lootIds),
    artId: e.artId,
    enemyArtId: e.enemyArtId,
    tags: e.tags,
    weight: e.weight,
  })),
}));

export const ACT_DECK_BY_ID: Record<string, EncounterDeck> = Object.fromEntries(
  ACT_ENCOUNTER_DECKS.map((d) => [d.id, d])
);

/** Flat deck for level-band picks (includes bosses at low weight). */
export const ENCOUNTER_DECK: EncounterTemplate[] = ACT_ENCOUNTER_DECKS.flatMap((d) => d.entries);

export function getEncounterDeck(deckId: string): EncounterDeck | undefined {
  return ACT_DECK_BY_ID[deckId];
}

export function deckForAct(actId: string): EncounterDeck | undefined {
  return ACT_ENCOUNTER_DECKS.find((d) => d.actId === actId);
}

export function encountersForLevel(level: number): EncounterTemplate[] {
  return ENCOUNTER_DECK.filter(
    (e) => level >= e.levelMin && level <= e.levelMax && !e.tags.includes("boss")
  );
}

export function bossesForLevel(level: number): EncounterTemplate[] {
  return ENCOUNTER_DECK.filter(
    (e) => level >= e.levelMin && level <= e.levelMax && e.tags.includes("boss")
  );
}

export function getEncounter(id: string): EncounterTemplate | undefined {
  return ENCOUNTER_DECK.find((e) => e.id === id);
}

/** Map chapter id (`ch1-frostford`) → pack deck (`deck-act-1` / `act-1`). */
export function deckIdForChapter(chapterId: string): string {
  const m = /^ch(\d+)/.exec(chapterId);
  const n = m ? Number(m[1]) : 1;
  return `deck-act-${Math.min(10, Math.max(1, n))}`;
}

export function rollEncounter(
  actIdOrDeckId: string,
  rng: () => number = Math.random
): EncounterTemplate {
  const mapped =
    actIdOrDeckId.startsWith("ch") ? deckIdForChapter(actIdOrDeckId) : actIdOrDeckId;
  const deck =
    ACT_DECK_BY_ID[mapped] ??
    ACT_DECK_BY_ID[actIdOrDeckId] ??
    ACT_ENCOUNTER_DECKS.find((d) => d.actId === mapped || d.actId === actIdOrDeckId) ??
    ACT_ENCOUNTER_DECKS[0]!;
  const pool = deck.entries.filter((e) => !e.tags.includes("boss"));
  const weighted = pool.length ? pool : deck.entries;
  const total = weighted.reduce((s, e) => s + (e.weight ?? 1), 0);
  let tick = rng() * total;
  for (const e of weighted) {
    tick -= e.weight ?? 1;
    if (tick <= 0) return e;
  }
  return weighted[weighted.length - 1]!;
}

export function pickEncounter(level: number, salt = 0): EncounterTemplate {
  const pool = encountersForLevel(level);
  if (pool.length === 0) return ENCOUNTER_DECK[ENCOUNTER_DECK.length - 1]!;
  return pool[(level + salt) % pool.length]!;
}

/** Simple strike resolution for deck fights (engine may override with hotbar). */
export function resolveBasicAttack(
  attackerPower: number,
  defenderArmor: number,
  rng: () => number = Math.random
): { damage: number; crit: boolean } {
  const roll = 1 + Math.floor(rng() * 6);
  const crit = roll === 6;
  const raw = attackerPower + roll + (crit ? attackerPower : 0);
  const damage = Math.max(1, raw - Math.max(0, defenderArmor));
  return { damage, crit };
}

/** Rough XP needed from L1→L100 for pacing (~50h with 3 players). */
export function estimatedEncounterRunsToLevel(targetLevel: number): number {
  return Math.max(0, (targetLevel - 1) * 3);
}

export function encounterDeckStats(): {
  decks: number;
  enemies: number;
  bosses: number;
} {
  return {
    decks: ACT_ENCOUNTER_DECKS.length,
    enemies: ENCOUNTER_DECK.length,
    bosses: ENCOUNTER_DECK.filter((e) => e.tags.includes("boss")).length,
  };
}
