/**
 * Shared content shapes for Sims Real Life research modules.
 * Boss/game wiring imports these; keep fields stable and serializable.
 */

/** Rough game-facing intensity for workouts and drills. */
export type EffortTier = "easy" | "moderate" | "hard";

/** Life-stage buckets used for GSD care guidance. */
export type DogLifeStage =
  | "puppy"
  | "adolescent"
  | "adult"
  | "senior";

export type MealSlot = "breakfast" | "lunch" | "dinner" | "snack" | "shake";

export type WorkoutFocus =
  | "strength"
  | "hybrid"
  | "mobility"
  | "cardio-light";

export type MealTemplate = {
  id: string;
  name: string;
  /** Short player-facing description. */
  blurb: string;
  slot: MealSlot;
  /** Approximate kcal per serving — educational ranges, not lab assays. */
  caloriesApprox: number;
  /** Approximate protein grams per serving. */
  proteinGramsApprox: number;
  tags: string[];
  ingredients: string[];
  /** Optional one-liner the quest layer can surface. */
  questHook?: string;
  /** When set, matches an id in `./data` MEALS for engine wiring. */
  linksToGameId?: string;
};

export type WorkoutExercise = {
  name: string;
  /** e.g. "3×8–10" or "2×8/side". */
  prescription: string;
  notes?: string;
};

export type WorkoutTemplate = {
  id: string;
  name: string;
  blurb: string;
  focus: WorkoutFocus;
  effort: EffortTier;
  durationMinutes: number;
  /** Soft game hint: energy drained when completing this session. */
  energyCostHint: number;
  exercises: WorkoutExercise[];
  /** Meal ids that pair well post-session (protein + carbs). */
  pairsWithMealIds?: string[];
  questHook?: string;
  /** When set, matches an id in `./data` EXERCISES for engine wiring. */
  linksToGameId?: string;
};

export type DogDrill = {
  id: string;
  /** Spoken cue string, e.g. "Sit". */
  cue: string;
  name: string;
  blurb: string;
  /** Earlier drills that should feel solid first. */
  prerequisiteCueIds?: string[];
  durationMinutes: number;
  effort: EffortTier;
  /** Soft game hint for bonding meter. */
  bondingDeltaHint: number;
  steps: string[];
  commonMistakes: string[];
  questHook: string;
  /** When set, matches `cueId` / DOG_CUES id in `./data`. */
  linksToGameCueId?: string;
};

export type FeedingNorm = {
  id: string;
  lifeStage: DogLifeStage;
  /** Adult body-weight band this row targets (lb), when relevant. */
  weightBandLb?: { min: number; max: number };
  mealsPerDay: number;
  /** Educational daily amount range — always check kibble label + vet. */
  dailyAmountGuidance: string;
  notes: string[];
  questHook?: string;
};

export type CareTip = {
  id: string;
  title: string;
  blurb: string;
  questHook?: string;
};

export type RedFlag = {
  id: string;
  title: string;
  whyAvoid: string;
  betterMove: string;
};

export type ResearchSource = {
  id: string;
  label: string;
  /** Public org / guideline family — cited in comments at module top too. */
  org: string;
};
