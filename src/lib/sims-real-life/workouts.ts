/**
 * Training grounds — fantasy names + plain subtitles.
 * IDs align with downtown EXERCISES where possible.
 */
import type { WorkoutTemplate } from "./research-types";

export type WorkoutAction = WorkoutTemplate & {
  fantasyName: string;
  subtitle: string;
  kind: "resistance" | "cardio" | "hybrid";
  dc: number;
  xpHint: number;
  stat: "strength" | "dexterity" | "constitution" | "magic";
  strengthBumpHint?: number;
  constitutionBumpHint?: number;
};

export const WORKOUT_ACTIONS: WorkoutAction[] = [
  { id: "squat-session", fantasyName: "Trial of Iron — Lower", subtitle: "Squat session", name: "Trial of Iron — Lower", blurb: "Squat session. Best lean-gain multiplier when fed.", focus: "strength", effort: "hard", durationMinutes: 45, energyCostHint: 22, kind: "resistance", dc: 11, xpHint: 14, stat: "strength", strengthBumpHint: 1, exercises: [{ name: "Squat", prescription: "3×6–10" }, { name: "RDL", prescription: "3×8–10" }, { name: "Lunge", prescription: "2×8/side" }], pairsWithMealIds: ["chicken-rice", "shake-pb"], questHook: "Enter the iron circle.", linksToGameId: "squat-session" },
  { id: "bench-press", fantasyName: "Trial of Iron — Press", subtitle: "Bench / push day", name: "Trial of Iron — Press", blurb: "Bench / push day. Pressing volume that rewards surplus.", focus: "strength", effort: "moderate", durationMinutes: 40, energyCostHint: 18, kind: "resistance", dc: 10, xpHint: 12, stat: "strength", strengthBumpHint: 1, exercises: [{ name: "Bench or push-ups", prescription: "3×6–10" }, { name: "OHP", prescription: "3×8" }], pairsWithMealIds: ["oats-eggs", "shake-pb"], linksToGameId: "bench-press" },
  { id: "row-pull", fantasyName: "Backbanner Pulls", subtitle: "Rows & pulls", name: "Backbanner Pulls", blurb: "Rows & pulls. Posture, grip, balanced strength.", focus: "strength", effort: "moderate", durationMinutes: 35, energyCostHint: 16, kind: "resistance", dc: 10, xpHint: 12, stat: "strength", exercises: [{ name: "Row", prescription: "3×8–10" }, { name: "Pulldown/pull-up", prescription: "3×6–10" }], linksToGameId: "row-pull" },
  { id: "zone2-walk", fantasyName: "Windrunner’s Pace", subtitle: "Zone-2 walk", name: "Windrunner’s Pace", blurb: "Easy aerobic base. Great with Scout; weak alone if underfed.", focus: "cardio-light", effort: "easy", durationMinutes: 35, energyCostHint: 12, kind: "cardio", dc: 8, xpHint: 8, stat: "constitution", constitutionBumpHint: 1, exercises: [{ name: "Brisk walk", prescription: "30–40 min" }], questHook: "Patrol the northern path.", linksToGameId: "zone2-walk" },
  { id: "intervals", fantasyName: "Stormstride Intervals", subtitle: "Short intervals", name: "Stormstride Intervals", blurb: "Harder cardio. Conditioning up; lean mass not the main win.", focus: "cardio-light", effort: "hard", durationMinutes: 25, energyCostHint: 20, kind: "cardio", dc: 12, xpHint: 10, stat: "dexterity", exercises: [{ name: "Hard effort", prescription: "6–8 × 45s" }], linksToGameId: "intervals" },
  { id: "farmers-carry", fantasyName: "Burden of the Caravan", subtitle: "Farmer’s carries", name: "Burden of the Caravan", blurb: "Loaded walks — hybrid strength and grit.", focus: "hybrid", effort: "moderate", durationMinutes: 20, energyCostHint: 15, kind: "hybrid", dc: 11, xpHint: 11, stat: "constitution", strengthBumpHint: 1, exercises: [{ name: "Farmer’s carry", prescription: "4 × 40–60m" }], linksToGameId: "farmers-carry" },
  { id: "mobility-focus", fantasyName: "Circle of Clarity", subtitle: "Mobility & focus ritual", name: "Circle of Clarity", blurb: "Breath, stretch, notebook. Magic = focus, not fireballs.", focus: "mobility", effort: "easy", durationMinutes: 20, energyCostHint: 8, kind: "hybrid", dc: 9, xpHint: 7, stat: "magic", exercises: [{ name: "Breath", prescription: "5 min" }, { name: "Mobility", prescription: "10 min" }, { name: "Journal", prescription: "5 min" }], questHook: "Draw the circle.", linksToGameId: "mobility-focus" },
];

export const WORKOUTS: WorkoutTemplate[] = WORKOUT_ACTIONS;
