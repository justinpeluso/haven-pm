/**
 * Combat hotbar — assign learned abilities, fire combat use payloads.
 * Extends boss CharacterSave (hotbar: ability id | null, HOTBAR_SIZE ≥ 3).
 */

import {
  ABILITIES,
  CLASS_STARTER_ABILITIES,
  CLASS_STARTER_NODES,
  STARTER_SKILL_POINTS,
  getAbility,
  unlockSkillNode,
} from "./skills";
import type {
  AbilityDef,
  AbilityTarget,
  CharacterSave,
  ClassId,
  CombatUsePayload,
  HotbarSlot,
} from "./types";
import { HOTBAR_SIZE } from "./types";

export type HotbarMutateResult =
  | { ok: true; character: CharacterSave }
  | { ok: false; reason: string };

export type HotbarUseResult =
  | { ok: true; payload: CombatUsePayload; character: CharacterSave }
  | { ok: false; reason: string };

export function createEmptyHotbar(size = HOTBAR_SIZE): HotbarSlot[] {
  const n = Math.max(3, size);
  return Array.from({ length: n }, () => null);
}

export function inferAbilityTarget(ability: AbilityDef): AbilityTarget {
  if (ability.target) return ability.target;
  const tags = new Set(ability.tags);
  if (tags.has("aoe")) return "aoe";
  if (tags.has("dog") && ability.kind === "hound") {
    if (tags.has("melee") || ability.power > 0) return "enemy";
    return "dog";
  }
  if (ability.kind === "heal" || tags.has("heal")) {
    if (tags.has("party")) return "party";
    return "ally";
  }
  if (ability.kind === "cook") return tags.has("party") ? "party" : "self";
  if (tags.has("defend") || tags.has("buff")) {
    return tags.has("party") ? "party" : "self";
  }
  if (tags.has("social") || tags.has("speech")) return "enemy";
  if (ability.power > 0) return "enemy";
  return "self";
}

export function buildCombatUsePayload(
  abilityId: string,
  slotIndex: number
): CombatUsePayload | null {
  const ability = getAbility(abilityId);
  if (!ability) return null;
  const target = inferAbilityTarget(ability);
  return {
    abilityId: ability.id,
    slotIndex,
    name: ability.name,
    kind: ability.kind,
    tree: ability.tree,
    blurb: ability.blurb,
    cost: { ...(ability.cost ?? {}) },
    power: ability.power,
    tags: [...ability.tags],
    target,
    flavor: combatFlavor(ability, target),
  };
}

function combatFlavor(ability: AbilityDef, target: AbilityTarget): string {
  switch (ability.kind) {
    case "spell":
      return target === "aoe"
        ? `${ability.name} blooms across the fray.`
        : `You loose ${ability.name} — the air tastes of aether.`;
    case "shout":
      return `Your voice carries like a war-horn: ${ability.name}!`;
    case "cook":
      return `You feed the road with ${ability.name}.`;
    case "heal":
      return `${ability.name} knits flesh and hope.`;
    case "hound":
      return `Your companion answers — ${ability.name}.`;
    default:
      return `You ready ${ability.name} and strike true.`;
  }
}

export function assignHotbarSlot(
  character: CharacterSave,
  slotIndex: number,
  abilityId: string | null
): HotbarMutateResult {
  if (slotIndex < 0 || slotIndex >= character.hotbar.length) {
    return { ok: false, reason: "Invalid hotbar slot." };
  }

  if (abilityId === null) {
    const hotbar = character.hotbar.map((id, i) => (i === slotIndex ? null : id));
    return { ok: true, character: { ...character, hotbar } };
  }

  const ability = getAbility(abilityId);
  if (!ability) return { ok: false, reason: "Unknown ability." };
  if (!character.abilities.includes(abilityId)) {
    return { ok: false, reason: "Ability not learned yet." };
  }

  // One ability → one slot; clear duplicates.
  const hotbar = character.hotbar.map((id, i) => {
    if (i === slotIndex) return abilityId;
    if (id === abilityId) return null;
    return id;
  });

  return { ok: true, character: { ...character, hotbar } };
}

export function clearHotbarSlot(
  character: CharacterSave,
  slotIndex: number
): HotbarMutateResult {
  return assignHotbarSlot(character, slotIndex, null);
}

export function fillHotbarFromAbilities(
  character: CharacterSave,
  preferredAbilityIds: string[]
): CharacterSave {
  let next = {
    ...character,
    hotbar: character.hotbar.length >= 3 ? [...character.hotbar] : createEmptyHotbar(),
  };
  let slot = 0;
  for (const id of preferredAbilityIds) {
    if (slot >= next.hotbar.length) break;
    if (!next.abilities.includes(id)) continue;
    const result = assignHotbarSlot(next, slot, id);
    if (result.ok) {
      next = result.character;
      slot += 1;
    }
  }
  return next;
}

/**
 * Spend skill points along the class starter path, grant abilities, fill ≥3 hotbar slots.
 */
export function applyClassStarterSkills(
  character: CharacterSave,
  classId: ClassId = character.classId
): CharacterSave {
  let next: CharacterSave = {
    ...character,
    skillPoints: Math.max(character.skillPoints, STARTER_SKILL_POINTS),
    hotbar: character.hotbar?.length >= 3 ? [...character.hotbar] : createEmptyHotbar(),
  };

  for (const nodeId of CLASS_STARTER_NODES[classId]) {
    const result = unlockSkillNode(next, nodeId);
    if (result.ok) next = result.character;
  }

  return fillHotbarFromAbilities(next, CLASS_STARTER_ABILITIES[classId]);
}

export function useHotbarSlot(
  character: CharacterSave,
  slotIndex: number
): HotbarUseResult {
  if (slotIndex < 0 || slotIndex >= character.hotbar.length) {
    return { ok: false, reason: "Invalid hotbar slot." };
  }

  const abilityId = character.hotbar[slotIndex];
  if (!abilityId) return { ok: false, reason: "Empty hotbar slot." };
  if (!character.abilities.includes(abilityId)) {
    return { ok: false, reason: "Ability no longer known." };
  }

  const ability = getAbility(abilityId);
  if (!ability) return { ok: false, reason: "Unknown ability." };

  const staminaCost = ability.cost?.stamina ?? 0;
  const manaCost = ability.cost?.mana ?? 0;
  if (character.stamina < staminaCost) {
    return { ok: false, reason: "Not enough stamina." };
  }
  if (character.mana < manaCost) {
    return { ok: false, reason: "Not enough mana." };
  }

  const payload = buildCombatUsePayload(abilityId, slotIndex);
  if (!payload) return { ok: false, reason: "Could not build combat payload." };

  const next: CharacterSave = {
    ...character,
    stamina: Math.max(0, character.stamina - staminaCost),
    mana: Math.max(0, character.mana - manaCost),
  };

  return { ok: true, payload, character: next };
}

/** HUD-friendly snapshot of each slot. */
export function describeHotbar(character: CharacterSave): Array<{
  index: number;
  abilityId: string | null;
  name: string | null;
  kind: string | null;
  tree: string | null;
  power: number;
  ready: boolean;
  cost: { stamina?: number; mana?: number };
}> {
  return character.hotbar.map((abilityId, index) => {
    const ability = abilityId ? getAbility(abilityId) : undefined;
    const staminaCost = ability?.cost?.stamina ?? 0;
    const manaCost = ability?.cost?.mana ?? 0;
    const ready = Boolean(
      ability &&
        character.abilities.includes(ability.id) &&
        character.stamina >= staminaCost &&
        character.mana >= manaCost
    );
    return {
      index,
      abilityId,
      name: ability?.name ?? null,
      kind: ability?.kind ?? null,
      tree: ability?.tree ?? null,
      power: ability?.power ?? 0,
      ready,
      cost: { ...(ability?.cost ?? {}) },
    };
  });
}

export function listAssignableAbilities(character: CharacterSave): AbilityDef[] {
  return ABILITIES.filter((a) => character.abilities.includes(a.id));
}
