/**
 * Neverworld character creation — blank stats + class kit picks.
 * Player assigns all stats; chooses 1 weapon, 1 skill, and N magic (by class).
 */

import { CREATE_WEAPONS_BY_CLASS, STARTER_GEAR_BY_CLASS, getGear } from "./gear";
import { fillHotbarFromAbilities, createEmptyHotbar } from "./hotbar";
import {
  CREATE_MAGIC_ABILITIES,
  CREATE_SKILL_ABILITIES,
  getAbility,
  getNode,
} from "./skills";
import type { AbilityDef, CharacterSave, ClassId, GearItem, Stats } from "./types";
import { HOTBAR_SIZE, STAT_KEYS } from "./types";

/** Flat blank sheet — no class preset STR/CHA/etc. */
export const BLANK_BASE_STATS: Stats = {
  strength: 8,
  dexterity: 8,
  constitution: 8,
  intelligence: 8,
  wisdom: 8,
  charisma: 8,
};

/** Full point-buy from the blank 8s. */
export const CREATE_STAT_POOL = 27;

export type CreateKitPicks = {
  weaponId: string;
  skillAbilityId: string;
  magicAbilityIds: string[];
};

export function magicSlotsForClass(classId: ClassId): number {
  switch (classId) {
    case "mage":
    case "warlock":
    case "sorcerer":
    case "battlemage":
    case "spellsword":
      return 2;
    case "healer":
    case "priest":
    case "druid":
    case "monk":
      return 3;
    case "bard":
    case "evoker":
      return 4;
    default:
      return 1;
  }
}

export function weaponsForClass(classId: ClassId): GearItem[] {
  const ids = CREATE_WEAPONS_BY_CLASS[classId] ?? CREATE_WEAPONS_BY_CLASS.warrior ?? [];
  return ids.map((id) => getGear(id)).filter((g): g is GearItem => Boolean(g));
}

/** Class-filtered starter weapons (UI alias). */
export function listCreateWeapons(classId: ClassId): GearItem[] {
  return weaponsForClass(classId);
}

export function listCreateSkills(): AbilityDef[] {
  return CREATE_SKILL_ABILITIES.map((id) => getAbility(id)).filter(
    (a): a is AbilityDef => Boolean(a)
  );
}

export function listCreateMagic(): AbilityDef[] {
  return CREATE_MAGIC_ABILITIES.map((id) => getAbility(id)).filter(
    (a): a is AbilityDef => Boolean(a)
  );
}

/** Free-unlock a skill node + ability, including unmet prereqs (create only). */
export function grantAbilityAtCreate(
  character: CharacterSave,
  abilityId: string
): CharacterSave {
  const ability = getAbility(abilityId);
  if (!ability) return character;

  let next = { ...character };
  const unlockChain = (nodeId: string) => {
    const node = getNode(nodeId);
    if (!node) return;
    for (const req of node.requires) unlockChain(req);
    if (!next.unlockedNodes.includes(nodeId)) {
      next = {
        ...next,
        unlockedNodes: [...next.unlockedNodes, nodeId],
      };
    }
    if (node.grantsAbilityId && !next.abilities.includes(node.grantsAbilityId)) {
      next = {
        ...next,
        abilities: [...next.abilities, node.grantsAbilityId],
      };
    }
  };

  unlockChain(ability.nodeId);
  if (!next.abilities.includes(abilityId)) {
    next = { ...next, abilities: [...next.abilities, abilityId] };
  }
  return next;
}

export function validateCreateKit(
  classId: ClassId,
  picks: CreateKitPicks
): { ok: true } | { ok: false; reason: string } {
  const needed = magicSlotsForClass(classId);
  const weapons = CREATE_WEAPONS_BY_CLASS[classId] ?? [];
  if (!weapons.includes(picks.weaponId)) {
    return { ok: false, reason: "Pick a starter weapon for your class." };
  }
  if (!(CREATE_SKILL_ABILITIES as readonly string[]).includes(picks.skillAbilityId)) {
    return { ok: false, reason: "Pick one skill." };
  }
  if (picks.magicAbilityIds.length !== needed) {
    return {
      ok: false,
      reason: `Pick exactly ${needed} magic abilit${needed === 1 ? "y" : "ies"}.`,
    };
  }
  const unique = new Set(picks.magicAbilityIds);
  if (unique.size !== picks.magicAbilityIds.length) {
    return { ok: false, reason: "Magic picks must be unique." };
  }
  for (const id of picks.magicAbilityIds) {
    if (!(CREATE_MAGIC_ABILITIES as readonly string[]).includes(id)) {
      return { ok: false, reason: "Unknown magic pick." };
    }
  }
  return { ok: true };
}

/** Apply weapon + skill + magic picks; equip weapon; fill hotbar from skill/magic. */
export function applyCreateKit(
  character: CharacterSave,
  picks: CreateKitPicks
): CharacterSave | { error: string } {
  const gate = validateCreateKit(character.classId, picks);
  if (!gate.ok) return { error: gate.reason };

  const weapon = getGear(picks.weaponId);
  if (!weapon || weapon.slot !== "weapon") return { error: "Invalid weapon." };

  const kit =
    STARTER_GEAR_BY_CLASS[character.classId] ?? STARTER_GEAR_BY_CLASS.warrior ?? [];
  let next: CharacterSave = {
    ...character,
    abilities: [],
    unlockedNodes: [],
    hotbar: createEmptyHotbar(Math.max(HOTBAR_SIZE, 5)),
    inventory: Array.from(new Set([picks.weaponId, ...kit])),
    equipped: { ...character.equipped, weapon: picks.weaponId },
  };

  next = grantAbilityAtCreate(next, picks.skillAbilityId);
  for (const id of picks.magicAbilityIds) {
    next = grantAbilityAtCreate(next, id);
  }

  const hotbarOrder = [picks.skillAbilityId, ...picks.magicAbilityIds];
  next = fillHotbarFromAbilities(next, hotbarOrder);
  return next;
}

export function sumStatBumps(bumps: Partial<Stats>): number {
  return STAT_KEYS.reduce((s, k) => s + (bumps[k] ?? 0), 0);
}
