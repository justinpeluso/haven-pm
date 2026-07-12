import type { DogAction, DogCue, Exercise, Meal, Tip } from "./types";

/** Win condition: lean bulk to this body weight (lb). */
export const WIN_WEIGHT_LB = 170;

/** Default name — player can rename in character creation. */
export const DEFAULT_DOG_NAME = "Scout";
export const DEFAULT_DOG_BREED = "German Shepherd";
export const DOG_SEX = "female" as const;
/** ~18 months — adolescent / young adult, not puppy or senior. */
export const DOG_AGE_YEARS = 1.5;
export const DOG_LIFE_STAGE = "adolescent" as const;

/** Cues required (with weight) to graduate Sims Real Life. */
export const REQUIRED_WIN_CUES = ["sit", "stay", "come", "heel"] as const;
export const REQUIRED_WIN_TRAINING = 28;
export const DEFAULT_DOG_SEX = "female" as const;
/** Adolescent companion — past puppy, still high drive. */
export const DEFAULT_DOG_AGE_YEARS = 1.5;

/** Soft win gates so the Shepherd partnership matters at graduation. */
export const DOG_TRAINING_WIN = 20;
export const DOG_CUES_WIN = 2;

export const TDEE_MIN = 2200;
export const TDEE_MAX = 2600;

export const NOT_MEDICAL_ADVICE =
  "Educational game fiction only — not medical, veterinary, or nutrition advice. Talk to qualified professionals before changing diet, training, or pet care.";

export const MEALS: Meal[] = [
  {
    id: "oats-eggs",
    name: "Oats & Eggs",
    blurb: "Simple morning plate — carbs for training, eggs for protein.",
    calories: 520,
    proteinG: 32,
    cost: 4,
    energyCost: 4,
    tags: ["breakfast", "high-protein"],
  },
  {
    id: "chicken-rice",
    name: "Chicken, Rice & Greens",
    blurb: "Classic surplus fuel. Easy to batch; easy to eat when tired.",
    calories: 680,
    proteinG: 48,
    cost: 7,
    energyCost: 5,
    mealPrepBonus: 1,
    tags: ["lunch", "dinner", "meal-prep"],
  },
  {
    id: "greek-yogurt-bowl",
    name: "Greek Yogurt Bowl",
    blurb: "Fast protein snack with fruit and a drizzle of honey.",
    calories: 380,
    proteinG: 28,
    cost: 5,
    energyCost: 2,
    tags: ["snack", "high-protein"],
  },
  {
    id: "salmon-potato",
    name: "Salmon & Potato",
    blurb: "Dinner that supports recovery — protein plus starchy carbs.",
    calories: 720,
    proteinG: 42,
    cost: 11,
    energyCost: 6,
    tags: ["dinner"],
  },
  {
    id: "shake-pb",
    name: "PB Protein Shake",
    blurb: "When appetite is low: liquid calories still count toward surplus.",
    calories: 450,
    proteinG: 36,
    cost: 6,
    energyCost: 1,
    tags: ["snack", "shake"],
  },
  {
    id: "meal-prep-box",
    name: "Meal-Prep Box",
    blurb: "Pull from yesterday’s batch. Spend prep stock, save energy and cash.",
    calories: 640,
    proteinG: 45,
    cost: 0,
    energyCost: 2,
    tags: ["meal-prep", "lunch", "dinner"],
  },
  {
    id: "burger-fries",
    name: "Downtown Burger Run",
    blurb: "Convenient surplus — less protein density, still calories.",
    calories: 900,
    proteinG: 28,
    cost: 14,
    energyCost: 3,
    tags: ["dinner", "convenience"],
  },
];

export const EXERCISES: Exercise[] = [
  {
    id: "squat-session",
    name: "Squat Session",
    blurb: "Compound lower-body work. Best lean-gain multiplier when fed.",
    kind: "resistance",
    energyCost: 22,
    xp: 14,
    stat: "strength",
    dc: 11,
    strengthBump: 1,
  },
  {
    id: "bench-press",
    name: "Bench / Push Day",
    blurb: "Pressing volume that rewards consistent surplus.",
    kind: "resistance",
    energyCost: 18,
    xp: 12,
    stat: "strength",
    dc: 10,
    strengthBump: 1,
  },
  {
    id: "row-pull",
    name: "Rows & Pulls",
    blurb: "Back work — posture, grip, and balanced strength.",
    kind: "resistance",
    energyCost: 16,
    xp: 12,
    stat: "strength",
    dc: 10,
  },
  {
    id: "zone2-walk",
    name: "Zone-2 Walk",
    blurb: "Easy aerobic base. Great with Scout; weak alone if underfed.",
    kind: "cardio",
    energyCost: 12,
    xp: 8,
    stat: "constitution",
    dc: 8,
    constitutionBump: 1,
  },
  {
    id: "intervals",
    name: "Short Intervals",
    blurb: "Harder cardio. Conditioning up; lean mass not the main win.",
    kind: "cardio",
    energyCost: 20,
    xp: 10,
    stat: "dexterity",
    dc: 12,
  },
  {
    id: "farmers-carry",
    name: "Farmer’s Carries",
    blurb: "Loaded walks — hybrid strength + grit.",
    kind: "hybrid",
    energyCost: 15,
    xp: 11,
    stat: "constitution",
    dc: 11,
    strengthBump: 1,
  },
  {
    id: "mobility-focus",
    name: "Mobility & Focus Ritual",
    blurb: "Magic-flavored recovery: breath, stretch, notebook. Soft gains.",
    kind: "hybrid",
    energyCost: 8,
    xp: 7,
    stat: "magic",
    dc: 9,
  },
];

export const DOG_ACTIONS: DogAction[] = [
  {
    id: "feed",
    name: "Feed Scout",
    blurb: "Measured meal. Keeps energy up and bond steady.",
    kind: "feed",
    energyCost: 3,
    dogEnergyCost: -25,
    bondDelta: 2,
    trainingDelta: 0,
    xp: 4,
  },
  {
    id: "walk",
    name: "Neighborhood Walk",
    blurb: "German Shepherd legs need miles. You get steps; Scout gets purpose.",
    kind: "walk",
    energyCost: 10,
    dogEnergyCost: 18,
    bondDelta: 4,
    trainingDelta: 1,
    xp: 8,
    stat: "constitution",
    dc: 8,
  },
  {
    id: "train-sit",
    name: "Train: Sit",
    blurb: "Foundation cue. Short sessions beat marathon drills.",
    kind: "train",
    energyCost: 8,
    dogEnergyCost: 10,
    bondDelta: 3,
    trainingDelta: 4,
    cueId: "sit",
    xp: 10,
    stat: "wisdom",
    dc: 10,
  },
  {
    id: "train-stay",
    name: "Train: Stay",
    blurb: "Impulse control. Reward calm, not drama.",
    kind: "train",
    energyCost: 9,
    dogEnergyCost: 12,
    bondDelta: 3,
    trainingDelta: 5,
    cueId: "stay",
    xp: 12,
    stat: "wisdom",
    dc: 12,
  },
  {
    id: "train-come",
    name: "Train: Come",
    blurb: "Recall — the cue that keeps adventures safe.",
    kind: "train",
    energyCost: 10,
    dogEnergyCost: 14,
    bondDelta: 4,
    trainingDelta: 6,
    cueId: "come",
    xp: 14,
    stat: "charisma",
    dc: 13,
  },
  {
    id: "train-heel",
    name: "Train: Heel",
    blurb: "Loose-leash polish. Shepherd pride on the sidewalk.",
    kind: "train",
    energyCost: 11,
    dogEnergyCost: 15,
    bondDelta: 5,
    trainingDelta: 7,
    cueId: "heel",
    xp: 15,
    stat: "charisma",
    dc: 14,
  },
  {
    id: "play-tug",
    name: "Play Tug",
    blurb: "Fun + rules. Ends on your cue, not chaos.",
    kind: "play",
    energyCost: 7,
    dogEnergyCost: 16,
    bondDelta: 5,
    trainingDelta: 2,
    xp: 7,
    stat: "dexterity",
    dc: 9,
  },
  {
    id: "dog-rest",
    name: "Quiet Crate Time",
    blurb: "Downtime. Scout recovers energy; you check notes.",
    kind: "rest",
    energyCost: 2,
    dogEnergyCost: -30,
    bondDelta: 1,
    trainingDelta: 0,
    xp: 2,
  },
];

export const DOG_CUES: DogCue[] = [
  { id: "sit", name: "Sit", blurb: "Default polite pause.", trainingRequired: 0 },
  { id: "stay", name: "Stay", blurb: "Hold position until released.", trainingRequired: 8 },
  { id: "come", name: "Come", blurb: "Reliable recall.", trainingRequired: 18 },
  { id: "heel", name: "Heel", blurb: "Walk with you, not through you.", trainingRequired: 28 },
  { id: "place", name: "Place", blurb: "Settle on a mat — house manners gold.", trainingRequired: 36 },
];

export const NUTRITION_TIPS: Tip[] = [
  {
    id: "surplus",
    title: "Surplus is the engine",
    body: "To gain weight you need consistent calories above maintenance. Game model uses a fictional TDEE band (~2200–2600 kcal) — real needs vary.",
    source: "General sports-nutrition consensus (ISSN position stands on energy surplus for hypertrophy).",
  },
  {
    id: "protein",
    title: "Protein supports lean gain",
    body: "Higher protein intake alongside resistance training is associated with better retention/gain of lean mass during surplus.",
    source: "ISSN & ACSM guidance summaries on protein distribution for training adults.",
  },
  {
    id: "rate",
    title: "Slow gain > crash bulk",
    body: "Realistic body-weight gain often lands near ~0.25–0.5% body weight per week for intermediate trainees; the game clamps daily ticks for feel.",
    source: "Common coaching heuristics from evidence-based hypertrophy literature.",
  },
  {
    id: "appetite",
    title: "Liquid calories when appetite dips",
    body: "Shakes and easy carbs can help hit surplus on low-appetite days without forcing huge solid meals.",
    source: "Practical coaching pattern; not a prescription.",
  },
];

export const TRAINING_TIPS: Tip[] = [
  {
    id: "progressive",
    title: "Progressive overload",
    body: "Add load, reps, or better form over time. Resistance work is the main lean-gain multiplier in this sim.",
    source: "ACSM resistance-training guidelines (progressive overload principle).",
  },
  {
    id: "cardio-fed",
    title: "Cardio when underfed",
    body: "Lots of cardio with a calorie deficit can stall weight gain. The game lightly penalizes cardio-only underfed days.",
    source: "Energy-balance logic; individual programming differs.",
  },
  {
    id: "recovery",
    title: "Sleep & rest days",
    body: "Adaptation happens between sessions. Rest restores energy so tomorrow’s lift counts.",
    source: "General recovery guidance in strength & conditioning practice.",
  },
  {
    id: "dog-sessions",
    title: "Short dog sessions",
    body: "Brief, frequent positive-reinforcement sessions beat long frustrated drills — for German Shepherds and humans.",
    source: "Modern reward-based training consensus (e.g. AVSAB position statements on humane training).",
  },
];

export function getMeal(id: string): Meal | undefined {
  return MEALS.find((m) => m.id === id);
}

export function getExercise(id: string): Exercise | undefined {
  return EXERCISES.find((e) => e.id === id);
}

export function getDogAction(id: string): DogAction | undefined {
  return DOG_ACTIONS.find((a) => a.id === id);
}

export function getDogCue(id: string): DogCue | undefined {
  return DOG_CUES.find((c) => c.id === id);
}
