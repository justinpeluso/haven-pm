/**
 * Sims Real Life — Justin + Scout character defaults.
 * Educational life-sim; not medical or veterinary advice.
 */

export const NOT_MEDICAL_ADVICE =
  "Educational game content only — not medical, dietary, or veterinary advice. Talk to a clinician or veterinarian before changing real-world diet, training, or care.";

export type SimsStatKey =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma"
  | "computer"
  | "magic";

export type SimsStats = Record<SimsStatKey, number>;

/** D&D 3–20 scale. Magic = focus / ritual flavor (not spellcasting). */
export const JUSTIN_STARTING_STATS: SimsStats = {
  strength: 12,
  dexterity: 14,
  constitution: 12,
  intelligence: 12,
  wisdom: 16,
  charisma: 16,
  computer: 17,
  magic: 16,
};

export const STAT_LABELS: Record<SimsStatKey, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
  computer: "Computer",
  magic: "Magic",
};

export const JUSTIN_DEFAULTS = {
  name: "Justin",
  age: 38,
  weightLb: 150,
  targetWeightLb: 170,
  hp: 30,
  maxHp: 30,
  energy: 100,
  maxEnergy: 100,
  money: 80,
  mealPrep: 0,
  xp: 0,
  phase: "intro" as const,
} as const;

export const SCOUT_DEFAULTS = {
  name: "Scout",
  breed: "German Shepherd",
  sex: "female" as const,
  ageYears: 1.5,
  role: "adolescent companion",
  energy: 80,
  maxEnergy: 100,
  bond: 20,
  training: 0,
  fedToday: false,
  walkedToday: false,
  cuesLearned: [] as string[],
  trainingMasteryMin: 20,
  cuesMasteryMin: 2,
} as const;

export const CHARACTER_BLURB =
  "Hero of Haven: Justin forges a stronger frame (150 → 170 lb) beside Scout — Hound of the North, a 1½-year-old female German Shepherd. Days are turns: Daybreak Rations, Trials of Iron, northern walks, Long Rest, Circle of Clarity.";

export const CHARACTER_SUBTITLE =
  "CRPG life-sim — educational surplus + adolescent GSD partnership (not medical advice).";
