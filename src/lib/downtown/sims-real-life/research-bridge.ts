/**
 * Bridges research packs → playable game ids (meals, workouts, cues).
 */
import { GSD_DISCLAIMER, GSD_COMPANION_PROFILE, OBEDIENCE_DRILLS } from "./research-gsd";
import {
  NUTRITION_DISCLAIMER,
  MEAL_TEMPLATES,
  WORKOUT_TEMPLATES,
  WEIGHT_GOAL,
} from "./research-nutrition";

export { GSD_DISCLAIMER, NUTRITION_DISCLAIMER, GSD_COMPANION_PROFILE, WEIGHT_GOAL };

export const COMBINED_DISCLAIMER = `${NUTRITION_DISCLAIMER} ${GSD_DISCLAIMER}`;

export function researchHookForMeal(gameMealId: string): string | undefined {
  return MEAL_TEMPLATES.find((m) => m.linksToGameId === gameMealId)?.questHook;
}

export function researchHookForWorkout(gameExerciseId: string): string | undefined {
  return WORKOUT_TEMPLATES.find((w) => w.linksToGameId === gameExerciseId)?.questHook;
}

export function researchHookForCue(cueId: string): string | undefined {
  return OBEDIENCE_DRILLS.find((d) => d.linksToGameCueId === cueId)?.questHook;
}

export function researchStepsForCue(cueId: string): string[] {
  return OBEDIENCE_DRILLS.find((d) => d.linksToGameCueId === cueId)?.steps ?? [];
}

/** Rotating one-liners for empty moments / juice. */
export const FLAVOR_LINES = [
  "The scale is a quest marker, not a villain.",
  "Her ears are radar dishes set to ‘treat?’",
  "Magic here means breath, focus, and choosing the next good rep.",
  "A bored Shepherd invents hobbies. A trained one invents high-fives.",
  "Surplus is patience wearing a fork.",
  "Fail-forward is still forward — the d20 just gossiped.",
  "1½ years old: all the drama of a teenager, all the loyalty of a legend.",
  "Daybreak Rations taste better after Trials of Iron.",
  "Loose leash is a love language.",
  "Natural 20s are rare. Showing up is legendary.",
  "Campfire weigh-ins never lie — they just take their time.",
  "Charisma opens doors. Protein fills the doorway.",
] as const;
