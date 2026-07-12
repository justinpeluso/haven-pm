/**
 * Content-pack types for Sims Real Life (fantasy CRPG veneer).
 * Engine/UI save shapes live under `@/lib/downtown/sims-real-life/types`.
 */

export type {
  EffortTier,
  DogLifeStage,
  MealSlot,
  WorkoutFocus,
  MealTemplate,
  WorkoutTemplate,
  DogDrill,
  FeedingNorm,
  CareTip,
  RedFlag,
  ResearchSource,
} from "./research-types";

export type { ActionCard } from "./meals";
export type { WorkoutAction } from "./workouts";
export type { DogCareAction } from "./dog";
export type { LifeAction } from "./actions";
export type { CampaignChapter, CampaignStep } from "./campaign";
export type { TipCard } from "./tips";
export type { SimsStatKey, SimsStats } from "./character";

export type FantasyLabel = {
  fantasyName: string;
  subtitle: string;
};
