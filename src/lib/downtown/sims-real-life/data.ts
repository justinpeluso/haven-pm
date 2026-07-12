import type { DogAction, DogCue, Exercise, Meal, Tip } from "./types";

/** Win condition: lean bulk to this body weight (lb). */
export const WIN_WEIGHT_LB = 170;

/** Default name — player can rename in character creation. */
export const DEFAULT_DOG_NAME = "Scout";
export const DEFAULT_DOG_BREED = "German Shepherd";
export const DOG_SEX = "female" as const;
export const DEFAULT_DOG_SEX = DOG_SEX;
/** ~18 months — adolescent / young adult, not puppy or senior. */
export const DOG_AGE_YEARS = 1.5;
export const DEFAULT_DOG_AGE_YEARS = DOG_AGE_YEARS;
export const DOG_LIFE_STAGE = "adolescent" as const;

/**
 * Soft win partnership gates (with weight). Heel stays optional mastery.
 * Tuned so a focused run graduates without empty grind.
 */
export const REQUIRED_WIN_CUES = ["sit", "stay", "come"] as const;
export const REQUIRED_WIN_TRAINING = 20;
/** Aliases used by the engine win check. */
export const DOG_TRAINING_WIN = REQUIRED_WIN_TRAINING;
export const DOG_CUES_WIN = REQUIRED_WIN_CUES.length;

/** Soft maintenance band — 3–4 solid meals should clear surplus on a lifting day. */
export const TDEE_MIN = 2000;
export const TDEE_MAX = 2400;

export const NOT_MEDICAL_ADVICE =
  "Educational game fiction only — not medical, veterinary, or nutrition advice. Talk to qualified professionals before changing diet, training, or pet care.";

export const MEALS: Meal[] = [
  {
    id: "oats-eggs",
    name: "Daybreak Rations",
    subtitle: "Oats & eggs",
    blurb: "Oats & eggs. Carbs for the morning Trial of Iron; eggs for protein.",
    calories: 520,
    proteinG: 32,
    cost: 4,
    energyCost: 1,
    tags: ["breakfast", "high-protein", "surplus"],
  },
  {
    id: "chicken-rice",
    name: "Hearthfire Platter",
    subtitle: "Chicken, rice & greens",
    blurb: "Chicken, rice & greens. Classic surplus fuel — easy to batch in the keep kitchen.",
    calories: 680,
    proteinG: 48,
    cost: 7,
    energyCost: 2,
    mealPrepBonus: 1,
    tags: ["lunch", "dinner", "meal-prep", "surplus"],
  },
  {
    id: "greek-yogurt-bowl",
    name: "Wayfarer's Curds",
    subtitle: "Greek yogurt bowl",
    blurb: "Greek yogurt bowl with fruit and honey — fast protein between quests.",
    calories: 380,
    proteinG: 28,
    cost: 5,
    energyCost: 0,
    tags: ["snack", "high-protein"],
  },
  {
    id: "salmon-potato",
    name: "Riverlord's Feast",
    subtitle: "Salmon & potato",
    blurb: "Salmon & potato. Recovery dinner — protein plus starchy carbs.",
    calories: 720,
    proteinG: 42,
    cost: 11,
    energyCost: 2,
    tags: ["dinner", "surplus"],
  },
  {
    id: "shake-pb",
    name: "Potion of Appetite",
    subtitle: "PB protein shake",
    blurb: "PB protein shake. When appetite dips, liquid calories still feed the surplus.",
    calories: 450,
    proteinG: 36,
    cost: 6,
    energyCost: 0,
    tags: ["snack", "shake", "surplus"],
  },
  {
    id: "meal-prep-box",
    name: "Stored Provisions",
    subtitle: "Meal-prep box",
    blurb: "Meal-prep box from yesterday's batch. Spend prep stock; save energy and coin.",
    calories: 640,
    proteinG: 45,
    cost: 0,
    energyCost: 1,
    tags: ["meal-prep", "lunch", "dinner", "surplus"],
  },
  {
    id: "burger-fries",
    name: "Tavern Board",
    subtitle: "Burger & fries run",
    blurb: "Downtown burger run. Convenient surplus — thinner protein density, still calories.",
    calories: 900,
    proteinG: 28,
    cost: 14,
    energyCost: 1,
    tags: ["dinner", "convenience", "surplus"],
  },
  {
    id: "pasta-meat",
    name: "Guildhall Pasta",
    subtitle: "Pasta & meat sauce",
    blurb: "Comfort carbs with enough protein to keep the surplus honest.",
    calories: 700,
    proteinG: 35,
    cost: 8,
    energyCost: 1,
    tags: ["dinner", "surplus", "comfort"],
  },
];

export const EXERCISES: Exercise[] = [
  {
    id: "squat-session",
    name: "Trial of Iron — Lower",
    subtitle: "Squat session",
    blurb: "Squat session. Compound lower-body work — best lean-gain multiplier when fed.",
    kind: "resistance",
    energyCost: 22,
    xp: 14,
    stat: "strength",
    dc: 11,
    strengthBump: 1,
  },
  {
    id: "bench-press",
    name: "Trial of Iron — Press",
    subtitle: "Bench / push day",
    blurb: "Bench / push day. Pressing volume that rewards consistent surplus.",
    kind: "resistance",
    energyCost: 18,
    xp: 12,
    stat: "strength",
    dc: 10,
    strengthBump: 1,
  },
  {
    id: "row-pull",
    name: "Backbanner Pulls",
    subtitle: "Rows & pulls",
    blurb: "Rows & pulls. Posture, grip, and balanced strength for the long campaign.",
    kind: "resistance",
    energyCost: 16,
    xp: 12,
    stat: "strength",
    dc: 10,
  },
  {
    id: "zone2-walk",
    name: "Windrunner's Pace",
    subtitle: "Zone-2 walk",
    blurb: "Easy aerobic base. Great with her; weak alone if underfed.",
    kind: "cardio",
    energyCost: 12,
    xp: 8,
    stat: "constitution",
    dc: 8,
    constitutionBump: 1,
  },
  {
    id: "intervals",
    name: "Stormstride Intervals",
    subtitle: "Short intervals",
    blurb: "Harder cardio. Conditioning rises; lean mass is not the main prize.",
    kind: "cardio",
    energyCost: 20,
    xp: 10,
    stat: "dexterity",
    dc: 12,
  },
  {
    id: "farmers-carry",
    name: "Burden of the Caravan",
    subtitle: "Farmer's carries",
    blurb: "Loaded walks — hybrid strength and grit across the courtyard.",
    kind: "hybrid",
    energyCost: 15,
    xp: 11,
    stat: "constitution",
    dc: 11,
    strengthBump: 1,
  },
  {
    id: "mobility-focus",
    name: "Circle of Clarity",
    subtitle: "Mobility & focus ritual",
    blurb: "Breath, stretch, notebook. Magic-flavored recovery — soft gains, sharp mind.",
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
    name: "Fill the Hound's Bowl",
    subtitle: "Feed Scout",
    blurb: "Measured adolescent meal. Keeps energy honest and bond steady.",
    kind: "feed",
    energyCost: 3,
    dogEnergyCost: -25,
    bondDelta: 2,
    trainingDelta: 0,
    xp: 4,
  },
  {
    id: "walk",
    name: "Patrol of the North Path",
    subtitle: "Neighborhood walk",
    blurb: "Shepherd legs need miles and nose work. You get steps; she gets purpose.",
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
    name: "Seat of Courtesy Drill",
    subtitle: "Train: Sit",
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
    name: "Stillness Charm Drill",
    subtitle: "Train: Stay",
    blurb: "Impulse control for a teen working dog. Reward calm, not drama.",
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
    name: "Call of the Hound Drill",
    subtitle: "Train: Come",
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
    name: "Northroad Heel Drill",
    subtitle: "Train: Heel",
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
    name: "Tug of War Banner",
    subtitle: "Play tug",
    blurb: "Fun with rules. Ends on your cue, not chaos — perfect for adolescent drive.",
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
    name: "Quiet Kennel Vigil",
    subtitle: "Crate / settle time",
    blurb: "Downtime. She recovers; you check the campaign log.",
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
  { id: "stay", name: "Stay", blurb: "Hold position until released.", trainingRequired: 6 },
  { id: "come", name: "Come", blurb: "Reliable recall.", trainingRequired: 12 },
  { id: "heel", name: "Heel", blurb: "Walk with you, not through you.", trainingRequired: 20 },
  { id: "place", name: "Place", blurb: "Settle on a mat — house manners gold.", trainingRequired: 28 },
];

export const NUTRITION_TIPS: Tip[] = [
  {
    id: "surplus",
    title: "The Surplus Engine",
    subtitle: "Calorie surplus",
    body: "To gain weight you need consistent calories above maintenance. Game model uses a fictional TDEE band (~2000–2400 kcal) — real needs vary.",
    source: "General sports-nutrition consensus (ISSN position stands on energy surplus for hypertrophy).",
  },
  {
    id: "protein",
    title: "Sinew of the Feast",
    subtitle: "Protein for lean gain",
    body: "Higher protein intake alongside resistance training is associated with better retention/gain of lean mass during surplus.",
    source: "ISSN & ACSM guidance summaries on protein distribution for training adults.",
  },
  {
    id: "rate",
    title: "Slow March, True Banner",
    subtitle: "Rate of gain",
    body: "Realistic body-weight gain often lands near ~0.25–0.5% body weight per week for intermediate trainees; the game clamps daily ticks for feel.",
    source: "Common coaching heuristics from evidence-based hypertrophy literature.",
  },
  {
    id: "appetite",
    title: "Potion When the Feast Fails",
    subtitle: "Liquid calories",
    body: "Shakes and easy carbs can help hit surplus on low-appetite days without forcing huge solid meals.",
    source: "Practical coaching pattern; not a prescription.",
  },
];

export const TRAINING_TIPS: Tip[] = [
  {
    id: "progressive",
    title: "Progressive Overload Codex",
    subtitle: "Get stronger over time",
    body: "Add load, reps, or better form over time. Resistance work is the main lean-gain multiplier in this sim.",
    source: "ACSM resistance-training guidelines (progressive overload principle).",
  },
  {
    id: "cardio-fed",
    title: "Windrunner Warning",
    subtitle: "Cardio while underfed",
    body: "Lots of cardio with a calorie deficit can stall weight gain. The game lightly penalizes cardio-only underfed days.",
    source: "Energy-balance logic; individual programming differs.",
  },
  {
    id: "recovery",
    title: "Long Rest Doctrine",
    subtitle: "Sleep & rest days",
    body: "Adaptation happens between sessions. Rest restores energy so tomorrow’s lift counts.",
    source: "General recovery guidance in strength & conditioning practice.",
  },
  {
    id: "dog-sessions",
    title: "Brief Scrolls",
    subtitle: "Short dog sessions (adolescent GSD)",
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
