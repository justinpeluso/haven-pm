/**
 * Sims Real Life — CONTENT PACK barrel.
 * Fantasy CRPG veneer over educational nutrition / GSD-adolescent guidance.
 *
 * UI/engine should prefer `@/lib/downtown/sims-real-life` for runtime;
 * this pack is the authored catalog + campaign copy + balance numbers.
 */

export {
  NOT_MEDICAL_ADVICE,
  JUSTIN_STARTING_STATS,
  JUSTIN_DEFAULTS,
  SCOUT_DEFAULTS,
  STAT_LABELS,
  CHARACTER_BLURB,
  CHARACTER_SUBTITLE,
} from "./character";
export type { SimsStatKey, SimsStats } from "./character";

export {
  TDEE_BAND,
  SURPLUS_TARGETS,
  PROTEIN_TARGETS_G,
  WEIGHT_TICK_LB,
  WEIGHT_MILESTONES_LB,
  CHECK_DCS,
  CHECK_CATALOG,
  JUSTIN_STARTING_MODS,
  abilityMod,
} from "./mechanics";

export { MEAL_ACTIONS, MEALS } from "./meals";
export { WORKOUT_ACTIONS, WORKOUTS } from "./workouts";
export {
  SCOUT_PROFILE,
  SCOUT_FEEDING,
  DOG_DRILLS,
  DOG_CARE_ACTIONS,
  CARE_TIPS,
  RED_FLAGS,
  GSD_DISCLAIMER,
  RESEARCH_SOURCES,
} from "./dog";
export { LIFE_ACTIONS } from "./actions";
export {
  CAMPAIGN,
  CAMPAIGN_OUTLINE,
  VICTORY_BANNER,
  WIN_WEIGHT_LB,
  INTRO_CHAPTER_ID,
  FINALE_CHAPTER_ID,
  getChapter,
} from "./campaign";
export {
  NUTRITION_TIPS,
  TRAINING_TIPS,
  DOG_TIPS,
  ALL_TIPS,
  DISCLAIMERS,
} from "./tips";
