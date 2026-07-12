import { QUESTS, getItem, levelFromXp } from "./campaign";
import type { ChoiceOption, PlayerSave, Quest, SkillCheckOutcome, StatKey, Stats } from "./types";

export { levelFromXp };

export function rollD20(): number {
  return 1 + Math.floor(Math.random() * 20);
}

export function applyXp(save: PlayerSave, xp: number): PlayerSave {
  return { ...save, xp: Math.max(0, save.xp + xp) };
}

export function skillCheck(stat: number, dc: number, d20?: number): { roll: number; total: number; success: boolean };
export function skillCheck(
  stats: Stats,
  stat: StatKey,
  dc: number,
  d20?: number
): { d20: number; total: number; success: boolean; mod: number };
export function skillCheck(
  statsOrStat: Stats | number,
  statOrDc: StatKey | number,
  dcOrRoll?: number,
  d20 = rollD20()
):
  | { roll: number; total: number; success: boolean }
  | { d20: number; total: number; success: boolean; mod: number } {
  if (typeof statsOrStat === "number") {
    const roll = typeof dcOrRoll === "number" ? dcOrRoll : rollD20();
    const dc = typeof statOrDc === "number" ? statOrDc : 10;
    const total = roll + statsOrStat;
    return { roll, total, success: total >= dc };
  }

  const stat = statOrDc as StatKey;
  const dc = typeof dcOrRoll === "number" ? dcOrRoll : 10;
  const mod = Math.floor((statsOrStat[stat] - 10) / 2);
  const total = d20 + mod;
  return { d20, total, success: total >= dc, mod };
}

export function applyStatBump(stats: Stats, bump?: Partial<Stats>): Stats {
  if (!bump) return stats;
  const next = { ...stats };
  for (const key of Object.keys(bump) as StatKey[]) {
    const v = bump[key];
    if (typeof v === "number") next[key] = Math.min(20, (next[key] ?? 10) + v);
  }
  return next;
}

export function grantItem(inventory: string[], itemId?: string): string[] {
  if (!itemId || !getItem(itemId)) return inventory;
  if (inventory.includes(itemId)) return inventory;
  return [...inventory, itemId];
}

export function applyOutcome(
  save: PlayerSave,
  outcome: SkillCheckOutcome
): PlayerSave {
  return {
    ...save,
    xp: save.xp + (outcome.xp ?? 0),
    stats: applyStatBump(save.stats, outcome.stats),
    inventory: grantItem(save.inventory, outcome.itemId),
  };
}

export function isQuestUnlocked(save: PlayerSave, quest: Quest): boolean {
  if (!quest.unlockAfter) return true;
  return save.completedQuestIds.includes(quest.unlockAfter);
}

export const canStartQuest = isQuestUnlocked;

export function availableQuests(save: PlayerSave): Quest[] {
  return QUESTS.filter((q) => isQuestUnlocked(save, q));
}

export function deriveUnlockedQuests(quests: Quest[], save: PlayerSave): Quest[] {
  return quests.filter((q) => isQuestUnlocked(save, q));
}

export function nextIncompleteQuest(save: PlayerSave): Quest | null {
  return QUESTS.find((q) => isQuestUnlocked(save, q) && !save.completedQuestIds.includes(q.id)) ?? null;
}

export function completeQuestRewards(save: PlayerSave, quest: Quest): PlayerSave {
  let next: PlayerSave = {
    ...save,
    xp: save.xp + quest.rewards.xp,
    stats: applyStatBump(save.stats, quest.rewards.stats),
    completedQuestIds: save.completedQuestIds.includes(quest.id)
      ? save.completedQuestIds
      : [...save.completedQuestIds, quest.id],
    currentQuestId: null,
    stepIndex: 0,
    lastRoll: null,
  };
  if (quest.id === "q8-boss") {
    next = { ...next, graduated: true, title: "Lunar Foundry Apprentice" };
  }
  return next;
}

export function completeStep(
  save: PlayerSave,
  quest: Quest,
  step: Quest["steps"][number],
  optionOrAnswerId?: ChoiceOptionOrAnswer
): { save: PlayerSave; message: string; questCompleted: boolean } {
  let next = save;
  let message = "Lesson advanced.";

  if (step.type === "choice" && optionOrAnswerId && typeof optionOrAnswerId !== "string") {
    const check = skillCheck(save.stats, optionOrAnswerId.stat, optionOrAnswerId.dc);
    const outcome = check.success ? optionOrAnswerId.success : optionOrAnswerId.fail;
    next = applyOutcome(save, outcome);
    message = outcome.text;
  } else if (step.type === "challenge" && typeof optionOrAnswerId === "string") {
    const picked = step.options.find((o) => o.id === optionOrAnswerId);
    if (picked?.correct) {
      next = {
        ...save,
        xp: save.xp + step.xp,
        stats: applyStatBump(save.stats, step.stats),
        inventory: grantItem(save.inventory, step.itemId),
      };
    } else {
      next = { ...save, xp: save.xp + Math.max(3, Math.floor(step.xp / 3)) };
    }
    message = step.explanation;
  } else if (step.type === "loot") {
    next = {
      ...save,
      xp: save.xp + (step.xp ?? 0),
      inventory: grantItem(save.inventory, step.itemId),
    };
    message = step.body;
  } else if (step.type === "graduation") {
    next = { ...save, graduated: true };
    message = step.body;
  }

  const questCompleted = save.stepIndex >= quest.steps.length - 1;
  return { save: next, message, questCompleted };
}

type ChoiceOptionOrAnswer = ChoiceOption | string;
