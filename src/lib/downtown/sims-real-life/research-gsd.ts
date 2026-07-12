/**
 * German Shepherd care & training research pack for Sims Real Life.
 *
 * Educational game content — not veterinary advice and not a substitute for
 * a certified trainer or behavior professional for serious issues.
 *
 * Public knowledge basis (see RESEARCH_SOURCES):
 * - AKC / major breed-club style guidance: GSDs are high-drive working dogs
 *   needing daily physical exercise plus mental work; adults typically fed
 *   measured meals (often twice daily) sized to body condition, not free-fed.
 * - Positive-reinforcement / reward-based obedience progressions widely taught
 *   in modern companion training: name → sit → down → stay → heel → recall.
 * - Enrichment (sniffing, food puzzles, training games) reduces boredom-related
 *   mischief in intelligent herding/working breeds.
 * - Socialization and consistent cues matter more than “dominance” myths.
 *
 * No claims about curing disease or fixing aggression via game quests.
 */

import type {
  CareTip,
  DogDrill,
  FeedingNorm,
  RedFlag,
  ResearchSource,
} from "./research-types";

export const GSD_DISCLAIMER =
  "Game guidance only — not veterinary or behavioral medical advice. Feeding " +
  "amounts, exercise, and training plans must be adjusted for your real dog’s " +
  "age, weight, health, and temperament. Consult a veterinarian for diet and " +
  "health questions, and a qualified trainer/behaviorist for fear, aggression, " +
  "or severe anxiety. This content does not diagnose, treat, or cure any disease.";

export const RESEARCH_SOURCES: ResearchSource[] = [
  {
    id: "akc-gsd-care",
    label: "Breed energy, training aptitude, and companion care themes",
    org: "AKC / public GSD breed materials",
  },
  {
    id: "reward-based-obedience",
    label: "Cue progression & positive reinforcement basics",
    org: "Modern companion dog training consensus (public educator materials)",
  },
  {
    id: "enrichment-working-breeds",
    label: "Mental exercise & enrichment for high-drive dogs",
    org: "Public working/herding breed care guidance",
  },
];

/** Soft profile for the in-game German Shepherd companion (matches `./data`). */
export const GSD_COMPANION_PROFILE = {
  breed: "German Shepherd Dog",
  defaultName: "Scout",
  sex: "female" as const,
  ageYears: 1.5,
  lifeStage: "adolescent" as const,
  adultWeightBandLb: { min: 50, max: 90 },
  energy: "high",
  blurb:
    "Scout is a 1½-year-old female German Shepherd — past puppy chaos, still high drive. " +
    "Wins come from routine: food, walks, training games, and downtime — not endless treadmill punishment.",
} as const;

/**
 * Daily feeding norms by life stage. Amounts are educational ranges —
 * always follow the specific food’s kcal chart and body-condition scoring.
 */
export const FEEDING_NORMS: FeedingNorm[] = [
  {
    id: "feed-puppy",
    lifeStage: "puppy",
    mealsPerDay: 3,
    dailyAmountGuidance:
      "Follow puppy-formula label by current weight; split into 3 meals. Rapid growth needs steady calories — don’t free-feed.",
    notes: [
      "Large-breed puppy formulas are commonly recommended to support controlled growth.",
      "Ask a vet before supplements; more calcium isn’t automatically better.",
    ],
    questHook: "Puppy chapter: Three measured meals — growth is a quest, not a buffet.",
  },
  {
    id: "feed-adolescent",
    lifeStage: "adolescent",
    mealsPerDay: 2,
    dailyAmountGuidance:
      "Transition toward twice-daily adult portions sized to lean body condition; teens can look ‘leggy’ before filling out.",
    notes: [
      "Watch treat calories during heavy training — they still count.",
      "Keep a consistent feeding window to help house routines.",
    ],
    questHook: "Teen arc: Two meals, tracked treats — training rewards shouldn’t replace dinner.",
  },
  {
    id: "feed-adult-active",
    lifeStage: "adult",
    weightBandLb: { min: 60, max: 90 },
    mealsPerDay: 2,
    dailyAmountGuidance:
      "Typical active adult: measured kibble or balanced fresh diet split into 2 meals. Many labels land roughly in the 3–5+ cup/day ballpark depending on kcal density and workload — verify on the bag and adjust to ribs-with-a-slight-cover body condition.",
    notes: [
      "Working/high-drive days may need a modest bump; couch days need less.",
      "Fresh water always available; elevate bowls only if your vet suggests it.",
      "Avoid vigorous exercise immediately after a large meal (bloat risk awareness for deep-chested breeds).",
    ],
    questHook: "Daily quest: Two bowls, then a pause before fetch — food settles, then play.",
  },
  {
    id: "feed-senior",
    lifeStage: "senior",
    mealsPerDay: 2,
    dailyAmountGuidance:
      "Often similar meal count with adjusted calories for lower activity; senior formulas or vet-guided plans help joints and weight.",
    notes: [
      "Keep muscle via gentle walks and easy training games.",
      "Schedule vet checks if appetite or thirst suddenly changes.",
    ],
    questHook: "Legacy quest: Softer sessions, steady meals — bond doesn’t retire.",
  },
];

export const EXERCISE_NEEDS = {
  adultDailyMinutes: { min: 60, max: 120 },
  breakdownTip:
    "Think 1–2+ hours total for many adults: walks, play, and training — not all flat-out running.",
  components: [
    {
      id: "ex-sniff-walk",
      title: "Sniffari walk",
      minutes: "20–40",
      blurb: "Let the nose lead. Mental mileage tires a GSD as much as sprint laps.",
    },
    {
      id: "ex-play",
      title: "Structured play",
      minutes: "15–30",
      blurb: "Fetch, tug with rules (drop/out), or flirt pole — impulse control included.",
    },
    {
      id: "ex-training",
      title: "Obedience / trick session",
      minutes: "10–20",
      blurb: "Short, upbeat reps beat hour-long nag sessions.",
    },
    {
      id: "ex-rest",
      title: "Off-switch / crate-or-mat calm",
      minutes: "multiple",
      blurb: "Working breeds need practiced relaxation, not only more stimulation.",
    },
  ],
  questHook:
    "Daily energy quest: Walk + play + 10 minutes of cues — then reward the off-switch.",
} as const;

/**
 * Core obedience progression for quest gating.
 * Order matters: name → sit → down → stay → heel → recall.
 */
export const OBEDIENCE_DRILLS: DogDrill[] = [
  {
    id: "drill-name",
    cue: "Name",
    name: "Name Game",
    blurb: "Your dog’s name means ‘look at me, good things follow.’",
    durationMinutes: 5,
    effort: "easy",
    bondingDeltaHint: 4,
    steps: [
      "Say the name once in a cheerful tone.",
      "Mark and reward the moment eyes or ears orient to you.",
      "Reset a few steps away; repeat in short bursts.",
    ],
    commonMistakes: [
      "Repeating the name like a broken record until it becomes background noise.",
      "Using the name only to scold — poison the cue.",
    ],
    questHook: "Intro quest: Win three clean name looks before anything else.",
  },
  {
    id: "drill-sit",
    cue: "Sit",
    name: "Sit",
    blurb: "Default polite position — the gateway cue.",
    prerequisiteCueIds: ["drill-name"],
    durationMinutes: 8,
    effort: "easy",
    bondingDeltaHint: 5,
    steps: [
      "Lure nose up so the rear settles, or capture a natural sit.",
      "Mark and pay; add the word ‘Sit’ as the pattern gets clear.",
      "Fade the lure into a hand signal, then practice with mild distractions.",
    ],
    commonMistakes: [
      "Pushing the hips down — teaches avoidance, not understanding.",
      "Paying late so the dog isn’t sure what earned the treat.",
    ],
    questHook: "Quest: Five sits on one cue — door manners unlocked.",
    linksToGameCueId: "sit",
  },
  {
    id: "drill-down",
    cue: "Down",
    name: "Down",
    blurb: "Settles energy and sets up longer stays.",
    prerequisiteCueIds: ["drill-sit"],
    durationMinutes: 10,
    effort: "moderate",
    bondingDeltaHint: 6,
    steps: [
      "From sit, lure toward the floor between the paws.",
      "Mark the elbows-down moment; release with a clear break word.",
      "Build duration slowly — seconds first, then distractions.",
    ],
    commonMistakes: [
      "Skipping release words so the dog self-releases whenever bored.",
      "Drilling on a painful surface; comfort matters for cooperation.",
    ],
    questHook: "Mid quest: Down on a mat while you prep your own meal.",
  },
  {
    id: "drill-stay",
    cue: "Stay",
    name: "Stay",
    blurb: "Hold position until released — patience as a superpower.",
    prerequisiteCueIds: ["drill-down"],
    durationMinutes: 12,
    effort: "moderate",
    bondingDeltaHint: 7,
    steps: [
      "Ask sit or down, then present a still palm + ‘Stay’.",
      "Take one step away; return and pay while they still hold.",
      "Increase distance, duration, and distraction one variable at a time.",
    ],
    commonMistakes: [
      "Raising all three Ds (distance, duration, distraction) at once.",
      "Forgetting to return to the dog to pay — teaches ‘chase me when I leave.’",
    ],
    questHook: "Boss prep: 20-second stay while you lace running shoes.",
    linksToGameCueId: "stay",
  },
  {
    id: "drill-heel",
    cue: "Heel",
    name: "Heel / Loose leash position",
    blurb: "Walk with you, not through you — position near your left (or chosen) side.",
    prerequisiteCueIds: ["drill-sit"],
    durationMinutes: 12,
    effort: "moderate",
    bondingDeltaHint: 7,
    steps: [
      "Reward at your side for matching pace indoors first.",
      "Add a cue when the pattern is reliable; change direction to keep attention.",
      "Outdoors: pay frequently early, then stretch the gaps.",
    ],
    commonMistakes: [
      "Only correcting pulls without teaching where ‘good’ is.",
      "Endless tight leash pressure that turns the walk into a tug-of-war.",
    ],
    questHook: "Street quest: One block of heel games before free sniff time.",
    linksToGameCueId: "heel",
  },
  {
    id: "drill-recall",
    cue: "Come",
    name: "Recall",
    blurb: "The life-saving cue — always worth jackpot rewards.",
    prerequisiteCueIds: ["drill-name", "drill-sit"],
    durationMinutes: 10,
    effort: "hard",
    bondingDeltaHint: 8,
    steps: [
      "Start on a long line in a low-distraction space.",
      "Say the cue once, then gently guide if needed; celebrate arrivals hard.",
      "Never call only to end fun — sometimes recall, reward, then release back to play.",
    ],
    commonMistakes: [
      "Repeating ‘come-come-come’ while the dog ignores you.",
      "Punishing after recall — teaches ‘coming back is dangerous.’",
      "Testing off-leash near roads before the cue is proofed.",
    ],
    questHook: "Finale bonus: Reliable recall in the yard — freedom with a safety net.",
    linksToGameCueId: "come",
  },
  {
    id: "drill-place",
    cue: "Place",
    name: "Place / Mat Settle",
    blurb: "Go to a mat and chill — house manners that unlock real-life dinners.",
    prerequisiteCueIds: ["drill-down", "drill-stay"],
    durationMinutes: 10,
    effort: "moderate",
    bondingDeltaHint: 6,
    steps: [
      "Toss a treat onto a defined mat or bed; mark when four paws arrive.",
      "Add ‘Place’; build duration with a release word.",
      "Practice while you cook or eat — real-world proofing.",
    ],
    commonMistakes: [
      "Nagging them back every two seconds instead of rewarding duration.",
      "Using Place only as exile after bad behavior — keep it positive.",
    ],
    questHook: "House quest: Scout on Place while you finish your own surplus plate.",
    linksToGameCueId: "place",
  },
];

export const ENRICHMENT_TIPS: CareTip[] = [
  {
    id: "enr-food-puzzle",
    title: "Food puzzles & snuffle mats",
    blurb: "Turn part of a meal into a brain hunt — slower eating, happier dog.",
    questHook: "Side quest: Feed breakfast from a puzzle instead of the bowl.",
  },
  {
    id: "enr-scent-game",
    title: "Find-it scent games",
    blurb: "Hide kibble around a room; cue ‘Find it.’ Nose work is GSD catnip.",
    questHook: "Rainy-day quest: Ten finds around the living room.",
  },
  {
    id: "enr-chew",
    title: "Appropriate chews",
    blurb: "Safe long-lasting chews for downtime — supervise and size correctly.",
    questHook: "Settle quest: Chew on the mat while you log your own calories.",
  },
  {
    id: "enr-training-tricks",
    title: "Trick training",
    blurb: "Spin, bow, chin rest — same bonding chemistry as formal obedience.",
    questHook: "Charisma quest: Teach one new trick this week.",
  },
  {
    id: "enr-social",
    title: "Quality socialization",
    blurb: "Calm exposures to people, surfaces, and sounds — quality over chaotic dog-park free-for-alls.",
    questHook: "World quest: One new friendly environment, lots of space and choice.",
  },
];

export const BONDING_TIPS: CareTip[] = [
  {
    id: "bond-routine",
    title: "Predictable daily rhythm",
    blurb: "Same rough windows for meals, walks, training, and rest build trust.",
    questHook: "Routine quest: Hit meal + walk + cue drill before midnight.",
  },
  {
    id: "bond-consent",
    title: "Consent-based handling",
    blurb: "Pause petting if they lean away; invite back in. Choice deepens the bond.",
    questHook: "Wisdom check: Three pets only while they lean in.",
  },
  {
    id: "bond-co-adventure",
    title: "Shared adventures",
    blurb: "New trails and training games beat doomscrolling beside a bored shepherd.",
    questHook: "Weekend quest: New sniff route + one obedience proofing rep.",
  },
  {
    id: "bond-celebrate",
    title: "Celebrate the try",
    blurb: "Mark effort, not just perfection — GSDs read your tone fast.",
    questHook: "Charm quest: Jackpot a slightly messy but brave recall.",
  },
];

export const COMMON_MISTAKES: RedFlag[] = [
  {
    id: "gsd-rf-under-exercise",
    title: "Under-exercising a high-drive brain",
    whyAvoid: "Bored GSDs invent hobbies: baseboards, laundry, and backyard patrols.",
    betterMove: "Daily walk + mental work + practiced off-switch — not only longer jogs.",
  },
  {
    id: "gsd-rf-late-social",
    title: "Skipping early socialization",
    whyAvoid: "Narrow worlds can grow into fear or reactivity later.",
    betterMove: "Gentle, positive exposures at the dog’s pace; protect from floods of chaos.",
  },
  {
    id: "gsd-rf-harsh",
    title: "Harsh corrections as the main tool",
    whyAvoid: "Fear can suppress behavior short-term and damage trust long-term.",
    betterMove: "Teach the wanted behavior, reward it, manage the environment.",
  },
  {
    id: "gsd-rf-inconsistent-cues",
    title: "Inconsistent cues & rules",
    whyAvoid: "Six family dialects for ‘off the couch’ confuses a literal learner.",
    betterMove: "One cue word, one release word, household agreement.",
  },
  {
    id: "gsd-rf-exercise-after-meals",
    title: "Hard play right after big meals",
    whyAvoid: "Deep-chested breeds warrant bloat-aware pacing around meals.",
    betterMove: "Train or stroll gently; save wrestle/fetch for clear of mealtime.",
  },
  {
    id: "gsd-rf-only-physical",
    title: "Miles without manners",
    whyAvoid: "A tired untrained dog is still untrained — just flopped on the floor.",
    betterMove: "Blend OBEDIENCE_DRILLS into every active day.",
  },
];

/** Compact quest blurbs the campaign layer can sprinkle into day events. */
export const QUEST_HOOK_BANK: string[] = [
  "Morning: measure breakfast, then Name Game warm-up.",
  "Midday: snuffle mat lunch portion while you eat your own Plate Special.",
  "After work: Heel games for one block, then free sniff as payment.",
  "Golden hour: Stay on a mat while you stretch — dual recovery quest.",
  "Evening: Recall jackpots in the yard, then quiet chew time.",
  "Rest day: Puzzle feeder + short Down-Stay — brains over mileage.",
  "Guest prep: Sit at the door before anyone enters — manners are XP.",
  "Storm plan: Calm mat work indoors; enrichment over cabin-fever zoomies.",
];

export function drillById(id: string): DogDrill | undefined {
  return OBEDIENCE_DRILLS.find((d) => d.id === id);
}

export function feedingByLifeStage(
  stage: FeedingNorm["lifeStage"],
): FeedingNorm | undefined {
  return FEEDING_NORMS.find((f) => f.lifeStage === stage);
}

/** Suggested unlock order for campaign gating. */
export const OBEDIENCE_PROGRESSION_IDS: string[] = OBEDIENCE_DRILLS.map((d) => d.id);
