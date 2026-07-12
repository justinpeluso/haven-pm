import type { ClassId, PlayerSlot, Stats } from "./types";

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
    suggestedClass: "paladin",
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

export const CLASS_DEFS: Record<
  ClassId,
  { name: string; blurb: string; baseStats: Stats; hp: number; stamina: number; mana: number }
> = {
  warrior: {
    name: "Warrior",
    blurb: "Steel and shield — the front line of every hold and fellowship.",
    baseStats: { strength: 16, dexterity: 12, constitution: 15, intelligence: 8, wisdom: 10, charisma: 10 },
    hp: 32,
    stamina: 28,
    mana: 6,
  },
  ranger: {
    name: "Ranger",
    blurb: "Bow, trail-craft, and a hound that answers to silent whistles.",
    baseStats: { strength: 12, dexterity: 16, constitution: 13, intelligence: 10, wisdom: 14, charisma: 10 },
    hp: 26,
    stamina: 26,
    mana: 10,
  },
  mage: {
    name: "Mage",
    blurb: "Arcane fire, frost, and ward — Middle-earth lore in a Skyrim staff.",
    baseStats: { strength: 8, dexterity: 12, constitution: 10, intelligence: 16, wisdom: 14, charisma: 12 },
    hp: 18,
    stamina: 14,
    mana: 36,
  },
  rogue: {
    name: "Rogue",
    blurb: "Shadow-step, lockpick, and a dagger that finds gaps in dragonscale.",
    baseStats: { strength: 10, dexterity: 16, constitution: 12, intelligence: 12, wisdom: 11, charisma: 13 },
    hp: 22,
    stamina: 30,
    mana: 8,
  },
  paladin: {
    name: "Paladin",
    blurb: "Oath-bound steel and healing light — DM of the party, shield of friends.",
    baseStats: { strength: 14, dexterity: 10, constitution: 14, intelligence: 10, wisdom: 14, charisma: 15 },
    hp: 30,
    stamina: 22,
    mana: 18,
  },
};

export const STAT_POINT_BUY_POOL = 8;

export function slotFromEmail(email: string | null | undefined): PlayerSlot | null {
  if (!email) return null;
  return EMAIL_TO_SLOT[email.toLowerCase()] ?? null;
}

export function isDmEmail(email: string | null | undefined): boolean {
  return slotFromEmail(email) === "justin";
}
