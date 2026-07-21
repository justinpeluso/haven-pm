/**
 * Shared RPG primitives used by Dungeons and Dogs (True Grit / dungeon-tester).
 * Party Chronicle / Neverworld game shell has been removed; this package remains
 * as the shared character/gear/combat foundation.
 *
 * Skill trees + combat hotbar:
 *   SKILL_TREES, ABILITIES, HOTBAR_SIZE (≥5),
 *   unlockSkillNode, applyCreateKit, useHotbarSlot, buildCombatUsePayload
 */

export * from "./types";
export * from "./skills";
export * from "./hotbar";
export * from "./create";
export * from "./players";
export * from "./progression";
export * from "./alignment";
export * from "./gear";
export * from "./stats";
export * from "./roc";
export * from "./pathway";
export * from "./races";
export * from "./art";
export * from "./story";
export * from "./spine";
export * from "./campaign";
export * from "./encounters";
export * from "./bestiary";
export * from "./battle";
export * from "./side-quests";
export * from "./recipes";
export * from "./midgame";
export * from "./quest-run";
export * from "./engine";
export * from "./persist";
