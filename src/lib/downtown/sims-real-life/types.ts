export const STAT_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
  "computer",
  "magic",
] as const;

export type StatKey = (typeof STAT_KEYS)[number];

/** D&D-style ability scores on a 3–20 scale. Magic = focus / ritual flavor. */
export type Stats = Record<StatKey, number>;

export type GamePhase = "intro" | "routine" | "finale" | "graduated";

export type DogSave = {
  name: string;
  /** Always female companion in this campaign. */
  sex: "female";
  /** Years; campaign default is 1.5 (adolescent / young adult). */
  ageYears: number;
  lifeStage: "adolescent";
  energy: number;
  maxEnergy: number;
  bond: number;
  training: number;
  fedToday: boolean;
  walkedToday: boolean;
  cuesLearned: string[];
};

export type LastRoll = {
  d20: number;
  total: number;
  success: boolean;
  mod: number;
  stat: StatKey;
  label?: string;
} | null;

export type PlayerSave = {
  version: 1;
  name: string;
  age: number;
  day: number;
  turn: number;
  weightLb: number;
  targetWeightLb: number;
  hp: number;
  maxHp: number;
  energy: number;
  maxEnergy: number;
  money: number;
  mealPrep: number;
  dog: DogSave;
  stats: Stats;
  xp: number;
  log: string[];
  completedQuestIds: string[];
  activeQuestId: string | null;
  /** Index into the active quest's steps. */
  questStepIndex: number;
  phase: GamePhase;
  lastRoll: LastRoll;
  startedAt: string;
  updatedAt: string;
  graduated: boolean;
  /** Narrative / quest flags checked by the engine. */
  flags: string[];
  /** Soft daily trackers for weight model (reset on advanceDay). */
  dayCalories: number;
  dayProteinG: number;
  dayResistance: boolean;
  dayCardioOnly: boolean;
};

export type MealId = string;
export type ExerciseId = string;
export type DogActionId = string;

export type Meal = {
  id: MealId;
  /** Fantasy CRPG name shown as the primary label. */
  name: string;
  /** Plain English subtitle for clarity. */
  subtitle?: string;
  blurb: string;
  calories: number;
  proteinG: number;
  cost: number;
  energyCost: number;
  mealPrepBonus?: number;
  tags: string[];
};

export type Exercise = {
  id: ExerciseId;
  name: string;
  subtitle?: string;
  blurb: string;
  kind: "resistance" | "cardio" | "hybrid";
  energyCost: number;
  xp: number;
  stat?: StatKey;
  dc?: number;
  strengthBump?: number;
  constitutionBump?: number;
};

export type DogAction = {
  id: DogActionId;
  name: string;
  subtitle?: string;
  blurb: string;
  kind: "feed" | "walk" | "train" | "play" | "rest";
  energyCost: number;
  dogEnergyCost: number;
  bondDelta: number;
  trainingDelta: number;
  cueId?: string;
  xp: number;
  stat?: StatKey;
  dc?: number;
};

export type Tip = {
  id: string;
  title: string;
  subtitle?: string;
  body: string;
  source: string;
};

export type DogCue = {
  id: string;
  name: string;
  subtitle?: string;
  blurb: string;
  trainingRequired: number;
};

export type QuestStepKind = "narrative" | "flag" | "check";

export type QuestStep = {
  id: string;
  kind: QuestStepKind;
  title: string;
  /** Plain English subtitle under fantasy step titles. */
  subtitle?: string;
  body: string;
  /** When kind is "flag", all listed flags must be present. */
  requireFlags?: string[];
  /** When kind is "check", engine verifies via predicate id. */
  checkId?: string;
};

export type Quest = {
  id: string;
  chapter: number;
  title: string;
  /** Plain English chapter subtitle. */
  subtitle?: string;
  tagline: string;
  synopsis: string;
  phase: GamePhase;
  unlockAfter?: string | null;
  rewards: { xp: number; stats?: Partial<Stats>; money?: number };
  steps: QuestStep[];
  /** Optional graduation bonus if dog training mastery is met. */
  dogMasteryBonus?: { minTraining: number; minCues: number; xp: number; bond: number };
};

export type ActionResult = {
  save: PlayerSave;
  message: string;
  success: boolean;
  roll?: NonNullable<LastRoll>;
};
