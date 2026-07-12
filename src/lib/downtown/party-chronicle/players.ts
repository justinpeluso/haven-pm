import type { ClassId, PlayerSlot, Stats } from "./types";
import { BLANK_BASE_STATS, CREATE_STAT_POOL } from "./create";

/** Map login email → party slot. Player1 = Justin (DM). */
export const EMAIL_TO_SLOT: Record<string, PlayerSlot> = {
  "player1@havenpm.com": "justin",
  "player2@havenpm.com": "rusty",
  "player3@havenpm.com": "elisha",
};

export const SLOT_DEFAULTS: Record<
  PlayerSlot,
  { displayName: string; isDm: boolean; email: string; dogName: string; dogBreed: string; suggestedClass: ClassId }
> = {
  justin: {
    displayName: "Justin",
    isDm: true,
    email: "player1@havenpm.com",
    dogName: "Scout",
    dogBreed: "German Shepherd of the North",
    suggestedClass: "healer",
  },
  rusty: {
    displayName: "Rusty",
    isDm: false,
    email: "player2@havenpm.com",
    dogName: "Copper",
    dogBreed: "Red wolf-hound of the Misty Hills",
    suggestedClass: "ranger",
  },
  elisha: {
    displayName: "Elisha",
    isDm: false,
    email: "player3@havenpm.com",
    dogName: "Lumen",
    dogBreed: "Silver-coated shepherd of Rivendell roads",
    suggestedClass: "mage",
  },
};

/** Class resource baselines — stats are blank + point-buy at create (no presets). */
export const CLASS_DEFS: Record<
  ClassId,
  { name: string; blurb: string; hp: number; stamina: number; mana: number }
> = {
  warrior: {
    name: "Warrior",
    blurb: "Steel and shield — the front line of every hold and fellowship.",
    hp: 32,
    stamina: 28,
    mana: 6,
  },
  ranger: {
    name: "Ranger",
    blurb: "Bow, trail-craft, and a hound that answers to silent whistles.",
    hp: 26,
    stamina: 26,
    mana: 10,
  },
  mage: {
    name: "Mage",
    blurb: "Arcane fire, frost, and ward — Middle-earth lore in a Skyrim staff. Pick 2 magic.",
    hp: 18,
    stamina: 14,
    mana: 36,
  },
  rogue: {
    name: "Rogue",
    blurb: "Shadow-step, lockpick, and a dagger that finds gaps in dragonscale.",
    hp: 22,
    stamina: 30,
    mana: 8,
  },
  healer: {
    name: "Healer",
    blurb: "Oath-light and field medicine — knit the party back together. Pick 3 magic.",
    hp: 28,
    stamina: 18,
    mana: 28,
  },
  bard: {
    name: "Bard",
    blurb: "Song, spark, and silver tongue — the chronicle's own muse. Pick 4 magic.",
    hp: 22,
    stamina: 20,
    mana: 24,
  },
};

/** @deprecated Prefer BLANK_BASE_STATS — kept for older call sites. */
export const CLASS_BASE_STATS_BLANK: Stats = { ...BLANK_BASE_STATS };

export const STAT_POINT_BUY_POOL = CREATE_STAT_POOL;

export function slotFromEmail(email: string | null | undefined): PlayerSlot | null {
  if (!email) return null;
  return EMAIL_TO_SLOT[email.toLowerCase()] ?? null;
}

export function isDmEmail(email: string | null | undefined): boolean {
  return slotFromEmail(email) === "justin";
}
