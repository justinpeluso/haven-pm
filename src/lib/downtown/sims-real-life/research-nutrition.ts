/**
 * Healthy weight-gain research pack for Sims Real Life (~150 → 170 lb adult).
 *
 * Educational game content — not personalized medical advice.
 *
 * Public knowledge basis (see RESEARCH_SOURCES):
 * - NIH / NIDDK: energy balance — surplus calories → weight gain; deficit → loss.
 * - USDA Dietary Guidelines for Americans: nutrient-dense patterns, protein foods,
 *   dairy/fortified alternatives, whole grains, fruits/vegetables.
 * - ACSM-style resistance training guidance: progressive overload, multi-joint
 *   lifts, 2–3+ strength sessions/week for adults seeking muscle/strength.
 * - Common sports-nutrition consensus ranges often cited publicly for muscle-
 *   oriented gain: ~1.6–2.2 g protein / kg body weight / day; modest surplus
 *   (~250–500 kcal/day) favors gradual gain vs aggressive “dirty bulk.”
 *
 * Player framing: supportive adult surplus + strength-first, not disordered
 * eating content. No claims about curing disease.
 */

import type {
  MealTemplate,
  RedFlag,
  ResearchSource,
  WorkoutTemplate,
} from "./research-types";

export const NUTRITION_DISCLAIMER =
  "Game guidance only — not medical advice. Calorie and protein numbers are " +
  "approximate educational ranges for a fictional adult working toward a " +
  "healthy weight-gain goal. Real needs vary by age, sex, height, activity, " +
  "medications, and health history. Talk with a clinician or registered " +
  "dietitian before big diet or training changes, especially with existing " +
  "conditions. This content does not diagnose, treat, or cure any disease.";

/** Alias aligned with `./data` naming for UI footers. */
export const NOT_MEDICAL_ADVICE = NUTRITION_DISCLAIMER;

export const RESEARCH_SOURCES: ResearchSource[] = [
  {
    id: "nih-niddk-energy",
    label: "Energy balance & healthy weight concepts",
    org: "NIH / NIDDK (public consumer materials)",
  },
  {
    id: "usda-dga",
    label: "Nutrient-dense eating patterns & protein foods",
    org: "USDA Dietary Guidelines for Americans",
  },
  {
    id: "acsm-resistance",
    label: "Adult resistance training frequency & progressive overload",
    org: "ACSM-aligned public exercise guidance",
  },
];

/** Campaign target for Justin’s Sims Real Life arc. */
export const WEIGHT_GOAL = {
  startLb: 150,
  targetLb: 170,
  gainLb: 20,
} as const;

/**
 * Rough planning frame for gradual gain with strength training.
 * ~0.5–1 lb/week is a common public “steady” framing; 20 lb ≈ several months
 * of consistent surplus + lifting — not an overnight bulk.
 */
export const SURPLUS_RANGES = {
  /** Soft surplus: slower scale climb, easier recovery. */
  modestKcalPerDay: { min: 250, max: 350 },
  /** Standard educational surplus band for intentional gain. */
  standardKcalPerDay: { min: 350, max: 500 },
  /** Upper band — more scale speed, more fat gain risk if lifts stall. */
  aggressiveKcalPerDay: { min: 500, max: 750 },
  /** Illustrative maintenance estimate for a moderately active ~150 lb adult.
   *  Real TDEE varies widely — treat as a game baseline, not a prescription. */
  illustrativeMaintenanceKcal: 2400,
  illustrativeGainTargetKcal: { min: 2750, max: 2900 },
} as const;

/**
 * Protein targets for a ~150–170 lb (≈68–77 kg) adult oriented toward
 * muscle-supporting gain. Uses ~1.6–2.2 g/kg publicly discussed ranges.
 */
export const PROTEIN_TARGETS = {
  perKgGrams: { min: 1.6, max: 2.2 },
  at150LbGramsPerDay: { min: 110, max: 150 },
  at170LbGramsPerDay: { min: 125, max: 170 },
  /** Easy game rule of thumb. */
  playerTip:
    "Aim for a solid protein hit each meal (roughly 25–40 g) plus a snack " +
    "or shake so the day lands near 120–160 g while you climb toward 170.",
} as const;

export const GAIN_PACING_TIPS: string[] = [
  "Track weekly average weight, not single weigh-ins after salty meals.",
  "Pair every surplus day with a strength session or recovery walk — surplus without stimulus mostly pads the midsection.",
  "If strength stalls and the scale races, dial surplus toward the modest band.",
  "Sleep and consistent meal timing beat perfect macros you abandon on day three.",
  "Whole-food meals first; shakes fill gaps — they are not magic XP potions.",
];

export const MEAL_TEMPLATES: MealTemplate[] = [
  {
    id: "meal-oats-egg-berries",
    name: "Builder Oats & Eggs",
    blurb: "Warm oats, eggs, and berries — calm morning surplus that sticks.",
    slot: "breakfast",
    caloriesApprox: 650,
    proteinGramsApprox: 35,
    tags: ["high-protein", "fiber", "beginner-friendly"],
    ingredients: [
      "rolled oats cooked in milk or fortified alt-milk",
      "2–3 eggs or egg + whites",
      "berries",
      "spoon of peanut butter or Greek yogurt",
    ],
    questHook: "Quest: Fuel the morning weigh-in — finish Builder Oats before your first lift.",
    linksToGameId: "oats-eggs",
  },
  {
    id: "meal-greek-parfait",
    name: "Parfait Power Stack",
    blurb: "Greek yogurt tower with granola and fruit — snack that still counts.",
    slot: "snack",
    caloriesApprox: 450,
    proteinGramsApprox: 30,
    tags: ["high-protein", "quick", "portable"],
    ingredients: [
      "plain Greek yogurt",
      "granola",
      "banana or mixed fruit",
      "honey drizzle (optional)",
    ],
    questHook: "Side quest: Between meetings, stack the parfait — no skipping lunch energy.",
    linksToGameId: "greek-yogurt-bowl",
  },
  {
    id: "meal-chicken-rice-veg",
    name: "Plate Special: Chicken, Rice & Greens",
    blurb: "The classic hypertrophy plate — boring in the best way.",
    slot: "lunch",
    caloriesApprox: 750,
    proteinGramsApprox: 45,
    tags: ["high-protein", "balanced", "meal-prep"],
    ingredients: [
      "grilled or roasted chicken",
      "rice or potatoes",
      "mixed vegetables",
      "olive oil or avocado",
    ],
    questHook: "Main quest beat: Prep two Plate Specials — future-you thanks present-you.",
    linksToGameId: "chicken-rice",
  },
  {
    id: "meal-salmon-potato",
    name: "River Run Salmon Bowl",
    blurb: "Salmon, potatoes, and a crunchy salad — recovery-friendly dinner.",
    slot: "dinner",
    caloriesApprox: 800,
    proteinGramsApprox: 42,
    tags: ["high-protein", "omega-3", "evening"],
    ingredients: [
      "salmon fillet",
      "roasted potatoes",
      "leafy salad + olive oil",
      "yogurt or cottage cheese side (optional)",
    ],
    questHook: "Evening quest: River Run dinner after strength day — protein clocks in.",
    linksToGameId: "salmon-potato",
  },
  {
    id: "meal-beef-stirfry",
    name: "Skillet Beef Stir-Fry",
    blurb: "Beef, noodles or rice, and a pile of veg — surplus with crunch.",
    slot: "dinner",
    caloriesApprox: 850,
    proteinGramsApprox: 48,
    tags: ["high-protein", "iron", "hearty"],
    ingredients: [
      "lean beef strips",
      "stir-fry vegetables",
      "rice or noodles",
      "soy/garlic sauce (go easy on sodium if it bloats the scale story)",
    ],
    questHook: "Quest hook: Cook the skillet on a rest day — surplus without the gym guilt.",
  },
  {
    id: "meal-turkey-wrap",
    name: "Charisma Turkey Wrap",
    blurb: "Tortilla, turkey, cheese, hummus — eat with one hand, train the dog with the other.",
    slot: "lunch",
    caloriesApprox: 600,
    proteinGramsApprox: 38,
    tags: ["high-protein", "portable", "quick"],
    ingredients: [
      "whole-grain tortilla",
      "turkey slices",
      "cheese",
      "hummus or avocado",
      "spinach / tomato",
    ],
    questHook: "Dual quest: Wrap in hand, leash in the other — walk + lunch combo.",
  },
  {
    id: "meal-shake-mass",
    name: "Foundry Shake",
    blurb: "Milk, protein powder, banana, oat — when chewing more food feels like a raid boss.",
    slot: "shake",
    caloriesApprox: 550,
    proteinGramsApprox: 40,
    tags: ["high-protein", "convenient", "surplus-helper"],
    ingredients: [
      "milk or fortified alt-milk",
      "protein powder",
      "banana",
      "rolled oats",
      "peanut butter",
    ],
    questHook: "Fail-forward tip: Missed a meal? Foundry Shake keeps the surplus quest alive.",
    linksToGameId: "shake-pb",
  },
  {
    id: "meal-cottage-toast",
    name: "Cottage Toast Outpost",
    blurb: "Toast, cottage cheese, fruit — late snack that respects tomorrow’s lift.",
    slot: "snack",
    caloriesApprox: 400,
    proteinGramsApprox: 28,
    tags: ["high-protein", "evening", "simple"],
    ingredients: [
      "whole-grain toast",
      "cottage cheese",
      "fruit or jam",
      "optional drizzle of olive oil",
    ],
    questHook: "Nightly micro-quest: Cottage Toast before lights-out — quiet surplus XP.",
  },
];

export const WORKOUT_TEMPLATES: WorkoutTemplate[] = [
  {
    id: "wo-full-body-a",
    name: "Full-Body Strength A",
    blurb: "Squat pattern, push, hinge, pull — the surplus’s best friend.",
    focus: "strength",
    effort: "hard",
    durationMinutes: 45,
    energyCostHint: 28,
    exercises: [
      { name: "Goblet or back squat", prescription: "3×8–10", notes: "Stop 1–2 reps shy of failure." },
      { name: "Bench press or push-ups", prescription: "3×8–12" },
      { name: "Romanian deadlift", prescription: "3×8–10" },
      { name: "One-arm row or cable row", prescription: "3×10/side" },
      { name: "Plank", prescription: "3×30–45s" },
    ],
    pairsWithMealIds: ["meal-chicken-rice-veg", "meal-shake-mass"],
    questHook: "Strength quest: Clear Full-Body A, then eat — stimulus before surplus.",
    linksToGameId: "squat-session",
  },
  {
    id: "wo-full-body-b",
    name: "Full-Body Strength B",
    blurb: "Alternate pattern day so joints and boredom both recover.",
    focus: "strength",
    effort: "hard",
    durationMinutes: 45,
    energyCostHint: 28,
    exercises: [
      { name: "Split squat or lunge", prescription: "3×8/side" },
      { name: "Overhead press", prescription: "3×8–10" },
      { name: "Hip hinge (trap-bar or DB RDL)", prescription: "3×8" },
      { name: "Lat pulldown or assisted pull-up", prescription: "3×8–12" },
      { name: "Farmer carry", prescription: "3×30–40m" },
    ],
    pairsWithMealIds: ["meal-beef-stirfry", "meal-salmon-potato"],
    questHook: "Quest: Swap to Strength B midweek — progressive overload, not hero WOD chaos.",
    linksToGameId: "bench-press",
  },
  {
    id: "wo-upper-pump",
    name: "Upper Builder",
    blurb: "Extra push/pull volume when legs need a quieter day.",
    focus: "strength",
    effort: "moderate",
    durationMinutes: 35,
    energyCostHint: 20,
    exercises: [
      { name: "Incline press", prescription: "3×10" },
      { name: "Chest-supported row", prescription: "3×10" },
      { name: "Lateral raise", prescription: "2×12–15" },
      { name: "Biceps + triceps pair", prescription: "2×12 each" },
    ],
    pairsWithMealIds: ["meal-turkey-wrap", "meal-shake-mass"],
    questHook: "Optional dungeon: Upper Builder on a busy workday — still counts.",
    linksToGameId: "row-pull",
  },
  {
    id: "wo-walk-zone2",
    name: "Zone-2 Walk (Keep It Supporting)",
    blurb: "Easy aerobic work that doesn’t eat your surplus alive.",
    focus: "cardio-light",
    effort: "easy",
    durationMinutes: 30,
    energyCostHint: 12,
    exercises: [
      {
        name: "Brisk walk or easy bike",
        prescription: "25–40 min",
        notes: "Conversational pace — not a calorie-punishment march.",
      },
    ],
    pairsWithMealIds: ["meal-greek-parfait", "meal-cottage-toast"],
    questHook: "Dog dual-quest: Zone-2 Walk doubles as GSD enrichment mileage.",
    linksToGameId: "zone2-walk",
  },
  {
    id: "wo-mobility",
    name: "Joint Maintenance Circuit",
    blurb: "Hips, T-spine, shoulders — stay in the game long enough to hit 170.",
    focus: "mobility",
    effort: "easy",
    durationMinutes: 15,
    energyCostHint: 6,
    exercises: [
      { name: "World’s greatest stretch", prescription: "2×5/side" },
      { name: "Cat-cow + thoracic openers", prescription: "2×8" },
      { name: "Hip flexor stretch", prescription: "2×30s/side" },
      { name: "Ankle rocks", prescription: "2×10/side" },
    ],
    questHook: "Rest-day quest: Mobility circuit — tomorrow’s squat depends on it.",
    linksToGameId: "mobility-focus",
  },
];

export const EXERCISE_PAIRING_RULES: string[] = [
  "Strength-first: schedule 2–4 resistance sessions/week before piling on long cardio.",
  "After hard lifts, prioritize a protein + carb meal or Foundry Shake within a comfortable window — consistency > stopwatch myths.",
  "Use Zone-2 walks for recovery, dog time, and mood — not as the main fat-loss weapon while you’re trying to gain.",
  "Progressive overload: add a rep or a small load when form stays clean.",
  "If energy crashes, cut workout volume before you cut food — under-eating kills the 150→170 quest.",
];

export const RED_FLAGS: RedFlag[] = [
  {
    id: "rf-dirty-bulk-only",
    title: "All junk, no training",
    whyAvoid:
      "A huge surplus with zero strength work mostly adds fat and leaves energy sluggish.",
    betterMove:
      "Keep surplus in the modest–standard band and lock Full-Body A/B into the week.",
  },
  {
    id: "rf-cardio-only",
    title: "Cardio-only grind while chasing gain",
    whyAvoid:
      "Lots of hard cardio without lifting burns the surplus you need for the weight goal.",
    betterMove:
      "Bias resistance training; keep walks easy and purposeful (dog + recovery).",
  },
  {
    id: "rf-skip-protein",
    title: "Calories without protein",
    whyAvoid:
      "High calories with tiny protein make the scale move without much useful tissue.",
    betterMove: "Hit the daily protein band first, then top up calories with carbs/fats.",
  },
  {
    id: "rf-miracle-supp",
    title: "Supplement-as-strategy",
    whyAvoid:
      "Pills and powders don’t replace meals, sleep, or progressive lifting.",
    betterMove:
      "Food pattern + training first; shakes only bridge gaps you already planned.",
  },
  {
    id: "rf-crash-cut-mindset",
    title: "Starve / binge pendulum",
    whyAvoid:
      "Extreme restriction then overshoot wrecks energy, mood, and dog-care consistency.",
    betterMove:
      "Steady surplus days, planned meals, fail-forward shakes — no punishment cardio.",
  },
  {
    id: "rf-ignore-pain",
    title: "Train through sharp pain",
    whyAvoid:
      "Pushing through joint pain risks downtime that stalls both weight and dog quests.",
    betterMove:
      "Swap to mobility / lighter patterns and get real-world care if pain persists.",
  },
];

/** Weekly skeleton the game can turn into calendar quests. */
export const SAMPLE_WEEK_PLAN = {
  title: "Sample surplus + strength week",
  days: [
    { day: "Mon", lift: "wo-full-body-a", mealFocus: "meal-chicken-rice-veg", note: "Lift + Plate Special" },
    { day: "Tue", lift: "wo-walk-zone2", mealFocus: "meal-shake-mass", note: "Walk/dog + shake gap-fill" },
    { day: "Wed", lift: "wo-full-body-b", mealFocus: "meal-salmon-potato", note: "Lift + River Run" },
    { day: "Thu", lift: "wo-mobility", mealFocus: "meal-turkey-wrap", note: "Mobility + portable lunch" },
    { day: "Fri", lift: "wo-full-body-a", mealFocus: "meal-beef-stirfry", note: "Repeat A, add load if ready" },
    { day: "Sat", lift: "wo-upper-pump", mealFocus: "meal-oats-egg-berries", note: "Optional upper + big breakfast" },
    { day: "Sun", lift: "wo-walk-zone2", mealFocus: "meal-cottage-toast", note: "Easy mileage + evening snack" },
  ],
} as const;

export function mealById(id: string): MealTemplate | undefined {
  return MEAL_TEMPLATES.find((m) => m.id === id);
}

export function workoutById(id: string): WorkoutTemplate | undefined {
  return WORKOUT_TEMPLATES.find((w) => w.id === id);
}
