import { STARTING_STATS } from "./campaign";
import type { PlayerSave, Stats } from "./types";

export const SAVE_KEY = "haven-code-school-v1";

export function createNewSave(name = "JP"): PlayerSave {
  const now = new Date().toISOString();
  return {
    version: 1,
    name,
    title: "Apprentice Systems Builder",
    stats: { ...STARTING_STATS },
    xp: 0,
    inventory: [],
    completedQuestIds: [],
    currentQuestId: null,
    stepIndex: 0,
    lastRoll: null,
    choiceLog: [],
    graduated: false,
    startedAt: now,
    updatedAt: now,
  };
}

export function loadSave(): PlayerSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerSave;
    if (!parsed || parsed.version !== 1) return null;
    return {
      ...createNewSave(parsed.name || "JP"),
      ...parsed,
      stats: { ...STARTING_STATS, ...parsed.stats } as Stats,
      inventory: Array.isArray(parsed.inventory) ? parsed.inventory : [],
      completedQuestIds: Array.isArray(parsed.completedQuestIds) ? parsed.completedQuestIds : [],
      choiceLog: Array.isArray(parsed.choiceLog) ? parsed.choiceLog : [],
    };
  } catch {
    return null;
  }
}

export function writeSave(save: PlayerSave): void {
  if (typeof window === "undefined") return;
  const next = { ...save, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
}

export function clearSave(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SAVE_KEY);
}
