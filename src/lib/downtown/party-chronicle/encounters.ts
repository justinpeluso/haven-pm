/**
 * Encounter decks by act — procedural filler for the ~50h campaign curve.
 * Authored story beats remain primary; decks pad mid-levels with XP + loot.
 */

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
  tags: string[];
};

export const ENCOUNTER_DECK: EncounterTemplate[] = [
  {
    id: "enc-goblin-scout",
    name: "Goblin Scout",
    blurb: "Green eyes in the reed bank.",
    levelMin: 1,
    levelMax: 12,
    hp: 18,
    power: 4,
    xp: 20,
    gold: 8,
    lootTier: "common",
    tags: ["goblin", "melee"],
  },
  {
    id: "enc-goblin-band",
    name: "Goblin Band",
    blurb: "Three spears, one drum, no manners.",
    levelMin: 5,
    levelMax: 20,
    hp: 36,
    power: 7,
    xp: 45,
    gold: 18,
    lootTier: "common",
    tags: ["goblin", "aoe"],
  },
  {
    id: "enc-warg",
    name: "Misty Warg",
    blurb: "A wolf that learned cruelty from riders.",
    levelMin: 10,
    levelMax: 35,
    hp: 48,
    power: 10,
    xp: 70,
    gold: 22,
    lootTier: "magic",
    tags: ["beast", "melee"],
  },
  {
    id: "enc-draugr",
    name: "Barrow Draugr",
    blurb: "Cold steel from a forgotten hold.",
    levelMin: 20,
    levelMax: 50,
    hp: 70,
    power: 14,
    xp: 110,
    gold: 40,
    lootTier: "magic",
    tags: ["undead", "melee"],
  },
  {
    id: "enc-drake",
    name: "Young Drake",
    blurb: "Wings still soft — teeth already legendary.",
    levelMin: 35,
    levelMax: 70,
    hp: 120,
    power: 22,
    xp: 200,
    gold: 80,
    lootTier: "legendary",
    tags: ["dragon", "fire"],
  },
  {
    id: "enc-ash-shade",
    name: "Ash Shade",
    blurb: "Hunger wearing a crown-shaped silhouette.",
    levelMin: 50,
    levelMax: 85,
    hp: 140,
    power: 26,
    xp: 260,
    gold: 100,
    lootTier: "legendary",
    tags: ["demon", "magic"],
  },
  {
    id: "enc-gate-herald",
    name: "Gate Herald",
    blurb: "A mouth of the World-Eater, polite and endless.",
    levelMin: 80,
    levelMax: 100,
    hp: 200,
    power: 34,
    xp: 400,
    gold: 160,
    lootTier: "legendary",
    tags: ["demon", "boss"],
  },
];

export function encountersForLevel(level: number): EncounterTemplate[] {
  return ENCOUNTER_DECK.filter((e) => level >= e.levelMin && level <= e.levelMax);
}

export function pickEncounter(level: number, salt = 0): EncounterTemplate {
  const pool = encountersForLevel(level);
  if (pool.length === 0) return ENCOUNTER_DECK[ENCOUNTER_DECK.length - 1]!;
  return pool[(level + salt) % pool.length]!;
}

/** Rough XP needed from L1→L100 for pacing (~50h with 3 players). */
export function estimatedEncounterRunsToLevel(targetLevel: number): number {
  // Soft estimate: ~2–4 deck clears per level band on average
  return Math.max(0, (targetLevel - 1) * 3);
}
