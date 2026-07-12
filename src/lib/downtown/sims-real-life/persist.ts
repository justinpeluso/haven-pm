import { DEFAULT_DOG_NAME, WIN_WEIGHT_LB } from "./data";
import { INTRO_QUEST_ID, STARTING_STATS } from "./quests";
import type { DogSave, PlayerSave, Stats } from "./types";

export const SAVE_KEY = "haven-sims-real-life-v1";

const START_MAX_HP = 30;
const START_MAX_ENERGY = 100;
const START_DOG_MAX_ENERGY = 100;

export function createStartingDog(name = DEFAULT_DOG_NAME): DogSave {
  return {
    name,
    energy: START_DOG_MAX_ENERGY,
    maxEnergy: START_DOG_MAX_ENERGY,
    bond: 20,
    training: 0,
    fedToday: false,
    walkedToday: false,
    cuesLearned: [],
  };
}

export function createNewSave(name = "Justin"): PlayerSave {
  const now = new Date().toISOString();
  return {
    version: 1,
    name,
    age: 38,
    day: 1,
    turn: 0,
    weightLb: 150,
    targetWeightLb: WIN_WEIGHT_LB,
    hp: START_MAX_HP,
    maxHp: START_MAX_HP,
    energy: START_MAX_ENERGY,
    maxEnergy: START_MAX_ENERGY,
    money: 80,
    mealPrep: 0,
    dog: createStartingDog(),
    stats: { ...STARTING_STATS },
    xp: 0,
    log: [
      "Day 1. Scale reads 150. Target 170. Scout — female German Shepherd, 1½ years — waits by the door.",
    ],
    completedQuestIds: [],
    activeQuestId: INTRO_QUEST_ID,
    questStepIndex: 0,
    phase: "intro",
    lastRoll: null,
    startedAt: now,
    updatedAt: now,
    graduated: false,
    flags: [],
    dayCalories: 0,
    dayProteinG: 0,
    dayResistance: false,
    dayCardioOnly: false,
  };
}

function clampStatBlock(stats: Partial<Stats> | undefined): Stats {
  const base = { ...STARTING_STATS };
  if (!stats) return base;
  for (const key of Object.keys(base) as (keyof Stats)[]) {
    const v = stats[key];
    if (typeof v === "number" && Number.isFinite(v)) {
      base[key] = Math.min(20, Math.max(3, Math.round(v)));
    }
  }
  return base;
}

function normalizeDog(dog: Partial<DogSave> | undefined): DogSave {
  const fresh = createStartingDog(dog?.name || DEFAULT_DOG_NAME);
  if (!dog) return fresh;
  return {
    ...fresh,
    ...dog,
    name: dog.name || DEFAULT_DOG_NAME,
    energy: Math.max(0, Math.min(fresh.maxEnergy, dog.energy ?? fresh.energy)),
    maxEnergy: dog.maxEnergy ?? fresh.maxEnergy,
    bond: Math.max(0, dog.bond ?? fresh.bond),
    training: Math.max(0, dog.training ?? fresh.training),
    fedToday: Boolean(dog.fedToday),
    walkedToday: Boolean(dog.walkedToday),
    cuesLearned: Array.isArray(dog.cuesLearned) ? dog.cuesLearned.filter((c) => typeof c === "string") : [],
  };
}

export function loadSave(): PlayerSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PlayerSave;
    if (!parsed || parsed.version !== 1) return null;
    const base = createNewSave(parsed.name || "Justin");
    return {
      ...base,
      ...parsed,
      version: 1,
      name: parsed.name || "Justin",
      age: typeof parsed.age === "number" ? parsed.age : 38,
      targetWeightLb: WIN_WEIGHT_LB,
      stats: clampStatBlock(parsed.stats),
      dog: normalizeDog(parsed.dog),
      log: Array.isArray(parsed.log) ? parsed.log.map(String) : base.log,
      completedQuestIds: Array.isArray(parsed.completedQuestIds)
        ? parsed.completedQuestIds.filter((id) => typeof id === "string")
        : [],
      flags: Array.isArray(parsed.flags) ? parsed.flags.filter((f) => typeof f === "string") : [],
      activeQuestId: parsed.activeQuestId ?? INTRO_QUEST_ID,
      questStepIndex: typeof parsed.questStepIndex === "number" ? parsed.questStepIndex : 0,
      phase: parsed.phase ?? "intro",
      lastRoll: parsed.lastRoll ?? null,
    };
  } catch {
    return null;
  }
}

export function writeSave(save: PlayerSave): void {
  if (typeof window === "undefined") return;
  const next: PlayerSave = { ...save, updatedAt: new Date().toISOString() };
  window.localStorage.setItem(SAVE_KEY, JSON.stringify(next));
}

export function clearSave(): void {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem(SAVE_KEY);
}
