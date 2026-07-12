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
    blurb: "Bow, trail-craft, and a hound that answers to silent whistles. (Hunter)",
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
    blurb: "Shadow-step, lockpick, and a dagger that finds gaps in dragonscale. (Thief)",
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
  paladin: {
    name: "Paladin",
    blurb: "Holy plate and righteous steel — vow-bound defender of the chronicle.",
    hp: 30,
    stamina: 24,
    mana: 14,
  },
  priest: {
    name: "Priest",
    blurb: "Divine light and shadow mend — sanctuary for the wounded road. Pick 3 magic.",
    hp: 24,
    stamina: 16,
    mana: 32,
  },
  deathknight: {
    name: "Death Knight",
    blurb: "Rune-blade and unholy frost — the fallen knight who still stands.",
    hp: 34,
    stamina: 26,
    mana: 10,
  },
  shaman: {
    name: "Shaman",
    blurb: "Totem, storm, and spirit-walk — elements answer the chronicle's call.",
    hp: 26,
    stamina: 20,
    mana: 26,
  },
  warlock: {
    name: "Warlock",
    blurb: "Pact-fire and shadow-bolt — power borrowed, never free. Pick 2 magic.",
    hp: 20,
    stamina: 14,
    mana: 34,
  },
  monk: {
    name: "Monk",
    blurb: "Iron palm and mist-step — healer's chi on the long road. Pick 3 magic.",
    hp: 26,
    stamina: 24,
    mana: 22,
  },
  druid: {
    name: "Druid",
    blurb: "Wild shape and moon-heal — grove law written in bark and bone. Pick 3 magic.",
    hp: 26,
    stamina: 18,
    mana: 30,
  },
  demonhunter: {
    name: "Demon Hunter",
    blurb: "Twin glaives and fel-sight — hunt what crawled through the rift.",
    hp: 24,
    stamina: 28,
    mana: 12,
  },
  evoker: {
    name: "Evoker",
    blurb: "Dragon-breath and arcane weave — the chronicle's living spellbook. Pick 4 magic.",
    hp: 20,
    stamina: 16,
    mana: 30,
  },
  assassin: {
    name: "Assassin",
    blurb: "Silent blade and poisoned patience — contracts paid in shadow.",
    hp: 20,
    stamina: 32,
    mana: 8,
  },
  battlemage: {
    name: "Battlemage",
    blurb: "Spell and steel in equal measure — warded plate, burning edge. Pick 2 magic.",
    hp: 24,
    stamina: 18,
    mana: 28,
  },
  spellsword: {
    name: "Spellsword",
    blurb: "Enchanted steel and quick cantrips — Skyrim's duelist mage. Pick 2 magic.",
    hp: 26,
    stamina: 22,
    mana: 24,
  },
  nightblade: {
    name: "Nightblade",
    blurb: "Shadow-magic and quick steel — darkness that cuts and burns.",
    hp: 22,
    stamina: 28,
    mana: 14,
  },
  sorcerer: {
    name: "Sorcerer",
    blurb: "Innate storm and wild surge — magic born in the blood. Pick 2 magic.",
    hp: 18,
    stamina: 12,
    mana: 38,
  },
  warden: {
    name: "Warden",
    blurb: "Nature's wrath and guardian's bow — Skyrim's green sentinel.",
    hp: 28,
    stamina: 24,
    mana: 16,
  },
  necromancer: {
    name: "Necromancer",
    blurb: "Bone-raise and soul-drain — the forbidden arts of the ash roads. Pick 2 magic.",
    hp: 20,
    stamina: 12,
    mana: 36,
  },
  barbarian: {
    name: "Barbarian",
    blurb: "Rage and raw muscle — no plate, no pause, only the charge.",
    hp: 34,
    stamina: 30,
    mana: 4,
  },
  knight: {
    name: "Knight",
    blurb: "Heavy lance and sworn honor — Skyrim's armored champion.",
    hp: 32,
    stamina: 22,
    mana: 10,
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
