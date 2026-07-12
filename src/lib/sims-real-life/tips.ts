/**
 * Sourced educational tips with light fantasy titles.
 * Not medical or veterinary advice.
 */

import { NOT_MEDICAL_ADVICE } from "./character";
import { GSD_DISCLAIMER } from "./dog";

export type TipCard = {
  id: string;
  fantasyName: string;
  subtitle: string;
  body: string;
  source: string;
  topic: "nutrition" | "training" | "dog" | "recovery";
};

export const NUTRITION_TIPS: TipCard[] = [
  { id: "surplus", fantasyName: "The Surplus Engine", subtitle: "Calorie surplus", body: "To gain weight you need consistent calories above maintenance. This game uses a fictional TDEE band (~2200–2600 kcal) — real needs vary widely.", source: "Sports-nutrition consensus on energy surplus for hypertrophy (e.g. ISSN-style summaries).", topic: "nutrition" },
  { id: "protein", fantasyName: "Sinew of the Feast", subtitle: "Protein for lean gain", body: "Higher protein alongside resistance training is associated with better lean-mass outcomes during a surplus. Soft game targets ~110–150 g/day across the 150→170 arc.", source: "ISSN / ACSM-style protein guidance summaries for training adults.", topic: "nutrition" },
  { id: "rate", fantasyName: "Slow March, True Banner", subtitle: "Rate of gain", body: "Realistic gain often lands near ~0.25–0.5% body weight per week for many intermediates; the sim clamps daily ticks for campaign feel (~0.25–0.8 lb on optimized days).", source: "Common evidence-based hypertrophy coaching heuristics.", topic: "nutrition" },
  { id: "appetite", fantasyName: "Potion When the Feast Fails", subtitle: "Liquid calories", body: "Shakes and easy carbs help hit surplus on low-appetite days without forcing huge solid meals.", source: "Practical coaching pattern; not a prescription.", topic: "nutrition" },
];

export const TRAINING_TIPS: TipCard[] = [
  { id: "progressive", fantasyName: "Progressive Overload Codex", subtitle: "Get stronger over time", body: "Add load, reps, or cleaner form over weeks. Resistance work is the main lean-gain multiplier in this sim.", source: "ACSM progressive-overload principle.", topic: "training" },
  { id: "cardio-fed", fantasyName: "Windrunner Warning", subtitle: "Cardio while underfed", body: "Lots of cardio with a calorie deficit can stall weight gain. The game lightly penalizes cardio-only underfed days.", source: "Energy-balance logic; individual programming differs.", topic: "training" },
  { id: "recovery", fantasyName: "Long Rest Doctrine", subtitle: "Sleep & rest days", body: "Adaptation happens between sessions. Aim fictionally for restorative sleep so tomorrow’s Trial of Iron counts.", source: "General S&C recovery practice (often cited 7–9 h sleep range for adults).", topic: "recovery" },
];

export const DOG_TIPS: TipCard[] = [
  { id: "adolescent", fantasyName: "Teen of the North", subtitle: "1½-year-old GSD", body: "At ~18 months Scout is adolescent: high drive, still maturing impulse control. Short reward-based sessions and a real off-switch beat endless treadmill punishment.", source: "Breed energy + modern reward-based training consensus.", topic: "dog" },
  { id: "dog-sessions", fantasyName: "Brief Scrolls", subtitle: "Short dog sessions", body: "Brief, frequent positive-reinforcement drills beat long frustrated ones — for German Shepherds and handlers.", source: "AVSAB-aligned humane training themes.", topic: "dog" },
  { id: "two-meals", fantasyName: "Twice to the Bowl", subtitle: "Adolescent feeding rhythm", body: "Twice-daily measured meals sized to body condition; count training treats. Don’t free-feed a teen Shepherd.", source: "Common large-breed companion feeding practice.", topic: "dog" },
];

export const ALL_TIPS: TipCard[] = [...NUTRITION_TIPS, ...TRAINING_TIPS, ...DOG_TIPS];
export const DISCLAIMERS = { human: NOT_MEDICAL_ADVICE, dog: GSD_DISCLAIMER } as const;
