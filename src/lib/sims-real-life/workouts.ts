import type { WorkoutTemplate } from "./research-types";

/**
 * Strength-forward workout templates for healthy mass gain.
 * Educational framing only — progressive overload, not medical programming.
 */
export const WORKOUTS: WorkoutTemplate[] = [
  {
    id: "squat-focus-a",
    name: "Squat Focus A",
    blurb:
      "Lower-body compound day built around the squat pattern — progressive overload on the main lift, then supportive accessories for quads and posterior chain.",
    focus: "strength",
    effort: "hard",
    durationMinutes: 60,
    energyCostHint: 3,
    exercises: [
      {
        name: "Back squat",
        prescription: "4×5–6",
        notes: "Add a little load when all reps feel solid; leave 1–2 reps in reserve.",
      },
      {
        name: "Romanian deadlift",
        prescription: "3×8",
        notes: "Hinge, soft knees, control the eccentric.",
      },
      {
        name: "Walking lunges",
        prescription: "3×8/leg",
      },
      {
        name: "Leg curl or Nordic regression",
        prescription: "3×10–12",
      },
      {
        name: "Calf raise",
        prescription: "3×12–15",
      },
    ],
    pairsWithMealIds: ["mass-builder-shake", "chicken-rice-broccoli-plate"],
    questHook: "Boss fight: Descend the squat dungeon; leave stronger than you entered.",
  },
  {
    id: "bench-press-day",
    name: "Bench Press Day",
    blurb:
      "Horizontal push focus with bench as the hero lift, then rows and arms so the upper body grows in balance — not just chest day cosplay.",
    focus: "strength",
    effort: "hard",
    durationMinutes: 55,
    energyCostHint: 3,
    exercises: [
      {
        name: "Barbell bench press",
        prescription: "4×5–6",
        notes: "Plant feet, soft arch, controlled touch — progress load weekly when form holds.",
      },
      {
        name: "Barbell or dumbbell row",
        prescription: "4×8",
      },
      {
        name: "Incline dumbbell press",
        prescription: "3×8–10",
      },
      {
        name: "Face pull",
        prescription: "3×12–15",
      },
      {
        name: "Triceps pushdown or skull crusher",
        prescription: "3×10–12",
      },
    ],
    pairsWithMealIds: ["mass-builder-shake", "turkey-burrito-bowl"],
    questHook: "Raid: Press the iron gates; stack upper-body XP.",
  },
  {
    id: "deadlift-hinge-day",
    name: "Deadlift & Hinge Day",
    blurb:
      "Posterior-chain session centered on the deadlift or trap-bar pull — strength first, then hinges and carries to build a resilient back and grip.",
    focus: "strength",
    effort: "hard",
    durationMinutes: 60,
    energyCostHint: 3,
    exercises: [
      {
        name: "Conventional or trap-bar deadlift",
        prescription: "3×3–5",
        notes: "Quality reps over ego plates; reset each pull.",
      },
      {
        name: "Hip thrust or glute bridge",
        prescription: "3×8–10",
      },
      {
        name: "Single-leg RDL",
        prescription: "3×8/side",
      },
      {
        name: "Farmer carry",
        prescription: "3×40–60 seconds",
      },
      {
        name: "Back extension or reverse hyper",
        prescription: "3×10–12",
      },
    ],
    pairsWithMealIds: ["beef-stir-fry-noodles", "pasta-meat-sauce"],
    questHook: "Legendary pull: Lift the floor; claim hinge mastery.",
  },
  {
    id: "upper-pull-push-hybrid",
    name: "Upper Pull/Push Hybrid",
    blurb:
      "Balanced upper session mixing vertical pull, overhead press, and rowing — strength volume without another maximal lower day.",
    focus: "hybrid",
    effort: "moderate",
    durationMinutes: 50,
    energyCostHint: 2,
    exercises: [
      {
        name: "Pull-up or lat pulldown",
        prescription: "4×6–8",
      },
      {
        name: "Overhead press",
        prescription: "4×6–8",
        notes: "Brace hard; progress when all sets hit the top of the range cleanly.",
      },
      {
        name: "Seated cable row",
        prescription: "3×8–10",
      },
      {
        name: "Dumbbell lateral raise",
        prescription: "3×12–15",
      },
      {
        name: "Biceps curl",
        prescription: "3×10–12",
      },
    ],
    pairsWithMealIds: ["cottage-berry-shake", "tuna-wrap-plate"],
    questHook: "Dual-wield quest: Pull and press in the same dungeon run.",
  },
  {
    id: "full-body-strength",
    name: "Full-Body Strength Circuit",
    blurb:
      "One big squat or hinge, one push, one pull, plus a core finisher — efficient when you only have one training window and still want progressive overload.",
    focus: "hybrid",
    effort: "moderate",
    durationMinutes: 45,
    energyCostHint: 2,
    exercises: [
      {
        name: "Goblet squat or front squat",
        prescription: "3×8",
      },
      {
        name: "Dumbbell bench or push-up progression",
        prescription: "3×8–10",
      },
      {
        name: "One-arm dumbbell row",
        prescription: "3×8/side",
      },
      {
        name: "Romanian deadlift",
        prescription: "3×8",
      },
      {
        name: "Plank or dead bug",
        prescription: "3×30–45 seconds",
      },
    ],
    pairsWithMealIds: ["greek-yogurt-parfait", "mass-builder-shake"],
    questHook: "Speed run: Hit every major zone before the clock expires.",
  },
  {
    id: "mobility-recovery-flow",
    name: "Mobility Recovery Flow",
    blurb:
      "Hip, thoracic, and ankle mobility with easy breathing — keeps joints ready for heavy days without burning recovery budget.",
    focus: "mobility",
    effort: "easy",
    durationMinutes: 25,
    energyCostHint: 1,
    exercises: [
      {
        name: "World's greatest stretch",
        prescription: "2×5/side",
      },
      {
        name: "90/90 hip switches",
        prescription: "2×8/side",
      },
      {
        name: "Thoracic openers on foam roller",
        prescription: "2×8",
      },
      {
        name: "Ankle rocks / knee-over-toe",
        prescription: "2×10/side",
      },
      {
        name: "Cat-cow + child's pose breathing",
        prescription: "2×8 breaths",
      },
    ],
    pairsWithMealIds: ["cottage-berry-shake"],
    questHook: "Rest shrine: Stretch the armor joints; prepare for tomorrow's raid.",
  },
  {
    id: "light-zone2-walk",
    name: "Light Zone-2 Walk",
    blurb:
      "Easy conversational cardio — heart health and recovery blood flow without turning surplus calories into a deficit treadmill grind.",
    focus: "cardio-light",
    effort: "easy",
    durationMinutes: 30,
    energyCostHint: 1,
    exercises: [
      {
        name: "Brisk outdoor or treadmill walk",
        prescription: "25–30 minutes",
        notes: "You should be able to talk in full sentences; no gut-busting intervals.",
      },
      {
        name: "Optional easy bike cooldown",
        prescription: "5 minutes",
      },
    ],
    pairsWithMealIds: ["trail-mix-apple", "greek-yogurt-parfait"],
    questHook: "Scout mission: Patrol the neighborhood; keep stamina topped off.",
  },
];
