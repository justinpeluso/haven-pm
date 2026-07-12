/**
 * Sims Real Life — game-balance numbers (fun, not clinical).
 * Educational life-sim; see NOT_MEDICAL_ADVICE in character.ts.
 */

/** Fictional maintenance band used by the weight model. */
export const TDEE_BAND = {
  min: 2200,
  mid: 2400,
  max: 2600,
} as const;

/** Daily surplus targets above mid-TDEE for balance pacing. */
export const SURPLUS_TARGETS = {
  lean: 350,
  standard: 500,
  aggressive: 750,
  minimumUseful: 200,
} as const;

/** Approximate daily protein soft targets (g) at start/mid/end weight. */
export const PROTEIN_TARGETS_G = {
  at150lb: 130,
  at160lb: 140,
  at170lb: 150,
  helpfulFloor: 110,
} as const;

/**
 * Daily weight-change clamps (lb). Optimized surplus + resistance
 * should land near the upper band for satisfying campaign pace.
 */
export const WEIGHT_TICK_LB = {
  stallOrUnderfed: -0.05,
  maintenanceNoise: 0.05,
  leanDay: 0.25,
  optimizedDay: 0.55,
  hardCap: 0.8,
} as const;

/** Campaign win + mid checkpoints. */
export const WEIGHT_MILESTONES_LB = {
  start: 150,
  midCheck: 158,
  win: 170,
} as const;

/** D&D-style: ability mod = floor((score - 10) / 2). */
export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export const CHECK_DCS = {
  trivial: 8,
  easy: 10,
  medium: 12,
  hard: 14,
  veryHard: 16,
  heroic: 18,
} as const;

export type CheckCatalogEntry = {
  id: string;
  label: string;
  fantasyName: string;
  subtitle: string;
  stat:
    | "strength"
    | "dexterity"
    | "constitution"
    | "intelligence"
    | "wisdom"
    | "charisma"
    | "computer"
    | "magic";
  dc: number;
  notes: string;
};

export const CHECK_CATALOG: CheckCatalogEntry[] = [
  {
    id: "meal-prep",
    label: "Meal prep",
    fantasyName: "Ration Alchemy",
    subtitle: "Batch cook / plan macros",
    stat: "computer",
    dc: CHECK_DCS.easy,
    notes: "INT/Computer flavor: spreadsheets & timers. WIS alternate OK.",
  },
  {
    id: "heavy-lift",
    label: "Heavy compound lift",
    fantasyName: "Trial of Iron",
    subtitle: "Squats / presses under load",
    stat: "strength",
    dc: CHECK_DCS.medium,
    notes: "Fail-forward: still logs session at reduced XP.",
  },
  {
    id: "conditioning",
    label: "Conditioning",
    fantasyName: "Windrunner Circuit",
    subtitle: "Intervals or loaded carry",
    stat: "constitution",
    dc: CHECK_DCS.medium,
    notes: "Cardio-only underfed days soften weight gain.",
  },
  {
    id: "dog-recall",
    label: "Recall training",
    fantasyName: "Call of the Hound",
    subtitle: "Come / reliable recall",
    stat: "charisma",
    dc: CHECK_DCS.hard,
    notes: "Reward-based; short sessions.",
  },
  {
    id: "dog-impulse",
    label: "Impulse control",
    fantasyName: "Stillness Charm",
    subtitle: "Stay / place",
    stat: "wisdom",
    dc: CHECK_DCS.medium,
    notes: "Patience beats volume.",
  },
  {
    id: "focus-ritual",
    label: "Magic focus",
    fantasyName: "Circle of Clarity",
    subtitle: "Breath, stretch, notebook — focus recovery",
    stat: "magic",
    dc: CHECK_DCS.easy,
    notes: "Magic = focus/ritual flavor, not spellcasting.",
  },
  {
    id: "social-evening",
    label: "Social",
    fantasyName: "Tavern Compact",
    subtitle: "Friend / partner check-in without derailing surplus",
    stat: "charisma",
    dc: CHECK_DCS.easy,
    notes: "Mood buff; optional light calorie bump.",
  },
];

export const JUSTIN_STARTING_MODS = {
  strength: abilityMod(12),
  dexterity: abilityMod(14),
  constitution: abilityMod(12),
  intelligence: abilityMod(12),
  wisdom: abilityMod(16),
  charisma: abilityMod(16),
  computer: abilityMod(17),
  magic: abilityMod(16),
} as const;
