/**
 * Dog-fetched trail companions — random person cards that stick until disbanded.
 */

import { CLASS_DEFS } from "@/lib/downtown/party-chronicle/players";
import { BLANK_BASE_STATS } from "@/lib/downtown/party-chronicle/create";
import { applyRaceToStats, RACE_DEFS, RACE_IDS } from "@/lib/downtown/party-chronicle/races";
import { levelFromXp, skillPointsForLevelGain } from "@/lib/downtown/party-chronicle/progression";
import type {
  CharacterSave,
  ClassId,
  DtFetchedCompanion,
  FetchedSex,
  Stats,
} from "@/lib/downtown/party-chronicle/types";
import { CLASS_IDS, FETCHED_SEXES } from "@/lib/downtown/party-chronicle/types";
import {
  DT_HAIR_COLORS,
  DT_HAIR_STYLES,
  DT_HATS,
  DT_OUTFITS,
  DT_SKIN_TONES,
  type DtHeroLook,
} from "./look";
import { DT_DOG_BOND_MEAN, normalizeDtDog } from "./dog";

const FEMALE_NAMES = [
  "Lyra",
  "Mira",
  "Sable",
  "Quill",
  "Nessa",
  "Vesper",
  "Rowan",
  "Ash",
  "Cinder",
  "Pepper",
  "Juniper",
  "Wren",
];
const MALE_NAMES = [
  "Cade",
  "Holt",
  "Rook",
  "Silas",
  "Tor",
  "Bram",
  "Finn",
  "Gage",
  "Nox",
  "Reed",
  "Kai",
  "Orin",
];
const NB_NAMES = [
  "River",
  "Sage",
  "Sol",
  "Echo",
  "Indigo",
  "Moss",
  "Sky",
  "Onyx",
  "Fern",
  "Halo",
  "Pix",
  "North",
];

/** Bond needed before the dog will bring someone back. */
export const DT_FETCH_BOND_MIN = 8;

function pick<T>(arr: readonly T[], rng: () => number): T {
  return arr[Math.floor(rng() * arr.length) % arr.length]!;
}

function randomStats(rng: () => number): Stats {
  const stats: Stats = { ...BLANK_BASE_STATS };
  let pool = 18;
  const keys = Object.keys(stats) as (keyof Stats)[];
  let guard = 0;
  while (pool > 0 && guard++ < 200) {
    const open = keys.filter((k) => stats[k] < 14);
    if (!open.length) break;
    const k = pick(open, rng);
    const room = 14 - stats[k];
    const add = Math.min(pool, room, 1 + Math.floor(rng() * 2));
    stats[k] += add;
    pool -= add;
  }
  return stats;
}

function randomLook(rng: () => number): DtHeroLook {
  return {
    skin: pick(DT_SKIN_TONES, rng),
    hair: pick(DT_HAIR_STYLES, rng),
    hairColor: pick(DT_HAIR_COLORS, rng),
    outfit: pick(DT_OUTFITS, rng),
    hat: pick(DT_HATS, rng),
  };
}

function nameForSex(sex: FetchedSex, rng: () => number): string {
  if (sex === "female") return pick(FEMALE_NAMES, rng);
  if (sex === "male") return pick(MALE_NAMES, rng);
  return pick(NB_NAMES, rng);
}

export function sexLabel(sex: FetchedSex): string {
  if (sex === "nonbinary") return "non-binary";
  return sex;
}

export function dtDogCanFetch(char: CharacterSave | null | undefined): {
  ok: boolean;
  reason?: string;
} {
  if (!char?.created) return { ok: false, reason: "Seal your hero first." };
  if (char.fetchedCompanion) {
    return {
      ok: false,
      reason: `${char.fetchedCompanion.name} is already with you — disband them first.`,
    };
  }
  const dog = normalizeDtDog(char.dog);
  if (dog.sulking || dog.bond < DT_DOG_BOND_MEAN) {
    return { ok: false, reason: `${dog.name} won't fetch while trust is thin.` };
  }
  if ((dog.hunger ?? 0) >= 2) {
    return { ok: false, reason: `${dog.name} is too hungry to run the trail.` };
  }
  if (dog.hp <= 0) {
    return { ok: false, reason: `${dog.name} is too hurt to fetch.` };
  }
  if (dog.bond < DT_FETCH_BOND_MIN) {
    return {
      ok: false,
      reason: `${dog.name} needs more bond (at least ${DT_FETCH_BOND_MIN}) before fetching people.`,
    };
  }
  return { ok: true };
}

/** Roll a brand-new trail companion card. */
export function rollDtFetchedCompanion(
  ownerLevel: number,
  rng: () => number = Math.random
): DtFetchedCompanion {
  const sex = pick(FETCHED_SEXES, rng);
  const raceId = pick(RACE_IDS, rng);
  const classId = pick(CLASS_IDS, rng) as ClassId;
  const classDef = CLASS_DEFS[classId];
  const race = RACE_DEFS[raceId];
  const level = Math.max(1, Math.min(ownerLevel + Math.floor(rng() * 2), ownerLevel + 1));
  let stats = applyRaceToStats(randomStats(rng), raceId);
  const maxHp = Math.max(
    8,
    (classDef?.hp ?? 20) + (race?.hpBonus ?? 0) + (level - 1) * 2
  );
  const maxMana = Math.max(0, (classDef?.mana ?? 8) + (race?.manaBonus ?? 0));
  const maxStamina = Math.max(6, classDef?.stamina ?? 12);
  const name = nameForSex(sex, rng);
  const id = `fetch-${Date.now().toString(36)}-${Math.floor(rng() * 1e6).toString(36)}`;

  return {
    id,
    name,
    sex,
    raceId,
    classId,
    level,
    xp: 0,
    skillPoints: 0,
    stats,
    hp: maxHp,
    maxHp,
    mana: maxMana,
    maxMana,
    stamina: maxStamina,
    maxStamina,
    inventory: [],
    equipped: {},
    dtLook: randomLook(rng),
    foundAt: new Date().toISOString(),
  };
}

export function dtDogFetchCompanion(
  char: CharacterSave,
  rng: () => number = Math.random
): { char: CharacterSave; companion: DtFetchedCompanion } | { error: string } {
  const gate = dtDogCanFetch(char);
  if (!gate.ok) return { error: gate.reason ?? "Can't fetch." };
  const companion = rollDtFetchedCompanion(char.level ?? 1, rng);
  const dog = normalizeDtDog(char.dog);
  return {
    companion,
    char: {
      ...char,
      fetchedCompanion: companion,
      dog: {
        ...dog,
        hunger: (dog.hunger ?? 0) + 1,
        bond: Math.min(100, dog.bond + 1),
      },
    },
  };
}

export function dtDisbandFetchedCompanion(
  char: CharacterSave
): { char: CharacterSave; name: string } | { error: string } {
  const c = char.fetchedCompanion;
  if (!c) return { error: "No trail companion to disband." };
  return {
    name: c.name,
    char: { ...char, fetchedCompanion: null },
  };
}

/** Apply battle XP and recompute level / vitals growth. */
export function applyFetchedCompanionXp(
  companion: DtFetchedCompanion,
  xpGain: number
): DtFetchedCompanion {
  const xp = Math.max(0, (companion.xp ?? 0) + Math.max(0, xpGain));
  const prev = companion.level ?? 1;
  const level = levelFromXp(xp);
  const gained = skillPointsForLevelGain(prev, level);
  const levelsUp = Math.max(0, level - prev);
  const maxHp = companion.maxHp + levelsUp * 2;
  return {
    ...companion,
    xp,
    level,
    skillPoints: (companion.skillPoints ?? 0) + gained,
    maxHp,
    hp: Math.min(maxHp, companion.hp + levelsUp * 2),
  };
}
