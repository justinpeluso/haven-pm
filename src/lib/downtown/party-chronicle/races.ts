/**
 * Seven playable races of the sealed NeverWorld (heritage homage).
 */

import type { Stats } from "./types";

export const RACE_IDS = [
  "human",
  "elf",
  "dwarf",
  "giant",
  "wolfihn",
  "grobber",
  "metamorphoun",
] as const;
export type RaceId = (typeof RACE_IDS)[number];

export type RaceDef = {
  id: RaceId;
  name: string;
  blurb: string;
  /** Applied once at character create (point-buy base still applies). */
  statBonus: Partial<Stats>;
  hpBonus: number;
  manaBonus: number;
};

export const RACE_DEFS: Record<RaceId, RaceDef> = {
  human: {
    id: "human",
    name: "Human",
    blurb: "Hold-born generalists — adaptable rebels who crack sealed gates.",
    statBonus: { charisma: 1, wisdom: 1 },
    hpBonus: 2,
    manaBonus: 0,
  },
  elf: {
    id: "elf",
    name: "Elf",
    blurb: "Long-lived keepers of pre-war song; science is a riddle they refuse to solve.",
    statBonus: { dexterity: 2, intelligence: 1 },
    hpBonus: 0,
    manaBonus: 4,
  },
  dwarf: {
    id: "dwarf",
    name: "Dwarf",
    blurb: "Stone-rooted craftfolk — myth is law, and metal remembers.",
    statBonus: { constitution: 2, strength: 1 },
    hpBonus: 4,
    manaBonus: 0,
  },
  giant: {
    id: "giant",
    name: "Giant",
    blurb: "Skyline walkers from isolated ranges; soft steps when they choose mercy.",
    statBonus: { strength: 3, constitution: 1 },
    hpBonus: 8,
    manaBonus: -2,
  },
  wolfihn: {
    id: "wolfihn",
    name: "Wolfihn",
    blurb: "Pack-kin of mist and moon — kinship first, then the hunt.",
    statBonus: { dexterity: 2, wisdom: 1 },
    hpBonus: 2,
    manaBonus: 0,
  },
  grobber: {
    id: "grobber",
    name: "Grobber",
    blurb: "Scrap-smart tunnelers; laughter sharp as their scavenged blades.",
    statBonus: { dexterity: 1, charisma: 1, intelligence: 1 },
    hpBonus: 1,
    manaBonus: 0,
  },
  metamorphoun: {
    id: "metamorphoun",
    name: "Metamorphoun",
    blurb: "Shape-touched wanderers — identity is a pathway, not a prison.",
    statBonus: { intelligence: 1, wisdom: 1, charisma: 1 },
    hpBonus: 0,
    manaBonus: 3,
  },
};

export function applyRaceToStats(base: Stats, raceId: RaceId): Stats {
  const bonus = RACE_DEFS[raceId].statBonus;
  const out = { ...base };
  for (const k of Object.keys(bonus) as (keyof Stats)[]) {
    out[k] = Math.min(20, out[k] + (bonus[k] ?? 0));
  }
  return out;
}
