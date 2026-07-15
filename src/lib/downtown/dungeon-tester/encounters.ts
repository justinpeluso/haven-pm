/**
 * DungeonTester encounter decks — level-scaled, loaded from data/dungeon-tester/.
 * Schema mirrors Neverworld encounter packs so the shell can reuse roll helpers.
 */

import pack from "../../../../data/dungeon-tester/encounters.json";
import type { GearTier } from "../party-chronicle/types";

export type DtEncounterTemplate = {
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

export type DtEncounterDeck = {
  id: string;
  actId: string;
  levelMin: number;
  levelMax: number;
  themes?: string[];
  entries: DtEncounterTemplate[];
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
  themes?: string[];
  entries: RawEntry[];
};

function lootTierFromIds(lootIds: string[]): GearTier | undefined {
  if (lootIds.some((id) => id.includes("oathblade") || id.includes("crown") || id.includes("liberators"))) {
    return "legendary";
  }
  if (lootIds.some((id) => id.includes("ash-veil") || id.includes("bone-drum") || id.includes("pale-host"))) {
    return "rare";
  }
  if (lootIds.some((id) => ["moonsteel", "widow", "ember", "warg-fang", "ringmail"].some((k) => id.includes(k)))) {
    return "magic";
  }
  if (lootIds.length) return "common";
  return undefined;
}

export const DT_ENCOUNTER_DECKS: DtEncounterDeck[] = (pack.decks as RawDeck[]).map((deck) => ({
  id: deck.id,
  actId: deck.actId,
  levelMin: deck.levelMin,
  levelMax: deck.levelMax,
  themes: deck.themes,
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

export const DT_DECK_BY_ID: Record<string, DtEncounterDeck> = Object.fromEntries(
  DT_ENCOUNTER_DECKS.map((d) => [d.id, d])
);

export const DT_ENCOUNTER_DECK: DtEncounterTemplate[] = DT_ENCOUNTER_DECKS.flatMap((d) => d.entries);

export function getDtEncounterDeck(deckId: string): DtEncounterDeck | undefined {
  return DT_DECK_BY_ID[deckId];
}

export function dtDeckForAct(actId: string): DtEncounterDeck | undefined {
  return DT_ENCOUNTER_DECKS.find((d) => d.actId === actId);
}

export function dtEncountersForLevel(level: number): DtEncounterTemplate[] {
  return DT_ENCOUNTER_DECK.filter(
    (e) => level >= e.levelMin && level <= e.levelMax && !e.tags.includes("boss")
  );
}

export function dtBossesForLevel(level: number): DtEncounterTemplate[] {
  return DT_ENCOUNTER_DECK.filter(
    (e) => level >= e.levelMin && level <= e.levelMax && e.tags.includes("boss")
  );
}

export function getDtEncounter(id: string): DtEncounterTemplate | undefined {
  return DT_ENCOUNTER_DECK.find((e) => e.id === id);
}

/** Map chapter id (`ch1-trail`) → pack deck (`deck-act-1`). */
export function dtDeckIdForChapter(chapterId: string): string {
  const m = /^ch(\d+)/.exec(chapterId);
  const n = m ? Number(m[1]) : 1;
  return `deck-act-${Math.min(9, Math.max(1, n))}`;
}

export function rollDtEncounter(
  actIdOrDeckId: string,
  rng: () => number = Math.random
): DtEncounterTemplate {
  const mapped =
    actIdOrDeckId.startsWith("ch") ? dtDeckIdForChapter(actIdOrDeckId) : actIdOrDeckId;
  const deck =
    DT_DECK_BY_ID[mapped] ??
    DT_DECK_BY_ID[actIdOrDeckId] ??
    DT_ENCOUNTER_DECKS.find((d) => d.actId === mapped || d.actId === actIdOrDeckId) ??
    DT_ENCOUNTER_DECKS[0]!;
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

/** Level-band pick for random encounters every 10–20 frames. */
export function rollDtEncounterForLevel(
  level: number,
  rng: () => number = Math.random
): DtEncounterTemplate {
  const band = DT_ENCOUNTER_DECKS.find((d) => level >= d.levelMin && level <= d.levelMax);
  if (band) return rollDtEncounter(band.id, rng);
  const nearest =
    DT_ENCOUNTER_DECKS.find((d) => level <= d.levelMax) ??
    DT_ENCOUNTER_DECKS[DT_ENCOUNTER_DECKS.length - 1]!;
  return rollDtEncounter(nearest.id, rng);
}

export function dtEncounterStats() {
  return {
    decks: DT_ENCOUNTER_DECKS.length,
    entries: DT_ENCOUNTER_DECK.length,
    bosses: DT_ENCOUNTER_DECK.filter((e) => e.tags.includes("boss")).length,
  };
}
