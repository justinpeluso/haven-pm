/**
 * Hound of the North — Scout (♀, 1½y adolescent GSD) care & drills.
 * Educational game content; not veterinary advice.
 */

import type { CareTip, DogDrill, FeedingNorm, RedFlag, ResearchSource } from "./research-types";

export const GSD_DISCLAIMER =
  "Game guidance only — not veterinary or behavioral advice. Adjust food, exercise, and training for your real dog’s age, health, and temperament. See a vet for diet/health questions and a qualified trainer for fear or aggression.";

export const SCOUT_PROFILE = {
  name: "Scout",
  breed: "German Shepherd",
  sex: "female" as const,
  ageYears: 1.5,
  lifeStage: "adolescent" as const,
  fantasyTitle: "Hound of the North",
  subtitle: "1½-year-old female German Shepherd",
  blurb:
    "Scout is past puppy chaos but still adolescent-high drive: sharp, loyal, and bored without a job. Wins come from measured meals, walks, short reward-based drills, and practiced off-switch — not endless punishment laps.",
  adultWeightBandLb: { min: 50, max: 90 },
} as const;

export const RESEARCH_SOURCES: ResearchSource[] = [
  { id: "akc-gsd", label: "Breed energy, trainability, companion exercise themes", org: "AKC / public GSD materials" },
  { id: "reward-based", label: "Reward-based obedience & short session structure", org: "Modern companion-training consensus (e.g. AVSAB-aligned)" },
  { id: "large-breed-feed", label: "Measured meals, body-condition feeding, deep-chest meal timing awareness", org: "General large-breed companion feeding practice" },
];

export const SCOUT_FEEDING: FeedingNorm = {
  id: "feed-scout-adolescent",
  lifeStage: "adolescent",
  weightBandLb: { min: 50, max: 85 },
  mealsPerDay: 2,
  dailyAmountGuidance:
    "Twice-daily measured portions sized to lean body condition (ribs with a slight cover). Follow the bag’s kcal chart — teens can look leggy before filling out. Count training treats toward the day.",
  notes: [
    "Prefer quality large-breed / adolescent-appropriate formulas; don’t free-feed.",
    "Avoid hard sprint play right after a big meal (deep-chested breed awareness).",
    "Water always available; consistency beats random grazing.",
  ],
  questHook: "Hound’s larder: two bowls, tracked treats — rewards don’t replace dinner.",
};

export const DOG_DRILLS: (DogDrill & { fantasyName: string; subtitle: string; dc: number })[] = [
  {
    id: "drill-name", fantasyName: "True Name Glance", subtitle: "Name game", cue: "Name", name: "True Name Glance",
    blurb: "Her name means ‘look at me — good things follow.’ Foundation for every later cue.",
    durationMinutes: 5, effort: "easy", bondingDeltaHint: 4, dc: 8,
    steps: ["Say her name once, cheerfully.", "Mark and reward the instant eyes/ears orient.", "Reset a few steps; keep bursts short."],
    commonMistakes: ["Repeating the name until it becomes noise.", "Using the name only to scold."],
    questHook: "Scroll I: three clean name looks.",
  },
  {
    id: "drill-sit", fantasyName: "Seat of Courtesy", subtitle: "Sit", cue: "Sit", name: "Seat of Courtesy",
    blurb: "Default polite pause — gateway cue for doors and greetings.",
    prerequisiteCueIds: ["drill-name"], durationMinutes: 8, effort: "easy", bondingDeltaHint: 5, dc: 10,
    steps: ["Lure nose up so the rear settles, or capture a natural sit.", "Mark and pay; add the word as the pattern clears.", "Fade the lure; add mild distractions for an adolescent brain."],
    commonMistakes: ["Pushing hips down.", "Paying late so the criteria blur."],
    questHook: "Scroll II: five sits on one cue.", linksToGameCueId: "sit",
  },
  {
    id: "drill-down", fantasyName: "Low Guard", subtitle: "Down", cue: "Down", name: "Low Guard",
    blurb: "Settles adolescent energy and sets up longer stays.",
    prerequisiteCueIds: ["drill-sit"], durationMinutes: 10, effort: "moderate", bondingDeltaHint: 6, dc: 11,
    steps: ["From sit, lure toward the floor between the paws.", "Mark elbows-down; use a clear release word.", "Build seconds first, then mild distractions."],
    commonMistakes: ["No release word.", "Drilling on an uncomfortable surface."],
    questHook: "Scroll III: calm downs before the evening walk.",
  },
  {
    id: "drill-stay", fantasyName: "Stillness Charm", subtitle: "Stay", cue: "Stay", name: "Stillness Charm",
    blurb: "Impulse control for a 1½-year-old working breed — patience over volume.",
    prerequisiteCueIds: ["drill-sit"], durationMinutes: 10, effort: "moderate", bondingDeltaHint: 6, dc: 12,
    steps: ["Ask sit or down, then a clear stay cue.", "Start with one step away and one second; pay in position.", "Add distance/duration separately — not both at once."],
    commonMistakes: ["Adding distance and duration together.", "Repeating ‘stay’ like a mantra."],
    questHook: "Scroll IV: hold still while the handler turns away once.", linksToGameCueId: "stay",
  },
  {
    id: "drill-come", fantasyName: "Call of the Hound", subtitle: "Come / recall", cue: "Come", name: "Call of the Hound",
    blurb: "Reliable recall — the cue that keeps northern adventures safe.",
    prerequisiteCueIds: ["drill-name", "drill-sit"], durationMinutes: 12, effort: "moderate", bondingDeltaHint: 7, dc: 13,
    steps: ["Practice on a long line in a low-distraction yard first.", "Cheerful cue; jackpot when she arrives — never punish the recall.", "Proof gradually: backyard → quiet street edge → busier scenes."],
    commonMistakes: ["Calling only to end fun.", "Off-leash proofing too early."],
    questHook: "Scroll V: three joyful recalls on the long line.", linksToGameCueId: "come",
  },
  {
    id: "drill-heel", fantasyName: "Northroad Heel", subtitle: "Heel / loose leash", cue: "Heel", name: "Northroad Heel",
    blurb: "Walk with you, not through you — polish for sidewalk quests.",
    prerequisiteCueIds: ["drill-sit"], durationMinutes: 12, effort: "hard", bondingDeltaHint: 7, dc: 14,
    steps: ["Reinforce position at your side in short stretches.", "Stop and reset when the leash goes tight — criteria clear.", "Keep sessions short; adolescent Shepherds fatigue mentally fast."],
    commonMistakes: ["Nagging corrections instead of resetting.", "Hour-long leash lectures."],
    questHook: "Scroll VI: one quiet block with a soft leash.", linksToGameCueId: "heel",
  },
  {
    id: "drill-place", fantasyName: "Mat of Sanctuary", subtitle: "Place / settle", cue: "Place", name: "Mat of Sanctuary",
    blurb: "Settle on a mat — house manners gold for a high-drive teen.",
    prerequisiteCueIds: ["drill-down", "drill-stay"], durationMinutes: 10, effort: "moderate", bondingDeltaHint: 6, dc: 12,
    steps: ["Send to a defined mat/bed; mark four paws on.", "Feed for staying; release clearly.", "Practice while you eat Daybreak Rations — dual quest complete."],
    commonMistakes: ["Vague boundaries.", "Never practicing the off-switch."],
    questHook: "House quest: Place while you finish your own plate.", linksToGameCueId: "place",
  },
];

export const CARE_TIPS: (CareTip & { fantasyName?: string })[] = [
  { id: "short-sessions", fantasyName: "Brief Scrolls Win Wars", title: "Short sessions", blurb: "Adolescent GSDs learn fast and frustrate faster. Five to twelve focused minutes beat marathon nag sessions.", questHook: "End on a win — release before either of you gets spicy." },
  { id: "job-not-punishment", fantasyName: "Give the Hound a Job", title: "Mental work counts", blurb: "Sniff walks, food puzzles, and training games tire a Shepherd as much as raw mileage — especially at 1½ years.", questHook: "Pair Windrunner’s Pace with one cue drill." },
  { id: "two-meals", fantasyName: "Twice to the Bowl", title: "Two measured meals", blurb: "Twice-daily feeding supports routine for adolescents. Track treats so training pay doesn’t silently overfeed." },
  { id: "off-switch", fantasyName: "Practice the Quiet", title: "Off-switch skill", blurb: "Working breeds need practiced relaxation. Mat/crate calm is training too — not only more stimulation." },
];

export const RED_FLAGS: RedFlag[] = [
  { id: "free-feed", title: "Free-feeding a teen Shepherd", whyAvoid: "Easy to overshoot calories and muddy house-training rhythm.", betterMove: "Measured twice-daily meals + counted training treats." },
  { id: "punish-recall", title: "Punishing the recall", whyAvoid: "She learns coming back ends the fun or brings trouble.", betterMove: "Jackpot the arrival; use a long line while proofing." },
  { id: "all-cardio-no-brain", title: "Only running her out", whyAvoid: "A fitter bored GSD invents worse hobbies.", betterMove: "Walk + play + short cues + settle practice." },
];

export type DogCareAction = {
  id: string; fantasyName: string; subtitle: string; blurb: string;
  kind: "feed" | "walk" | "train" | "play" | "rest";
  energyCostHint: number; dogEnergyCostHint: number; bondDeltaHint: number; trainingDeltaHint: number;
  cueId?: string; xpHint: number; stat?: "wisdom" | "charisma" | "constitution" | "dexterity"; dc?: number;
};

export const DOG_CARE_ACTIONS: DogCareAction[] = [
  { id: "feed", fantasyName: "Fill the Hound’s Bowl", subtitle: "Feed Scout", blurb: "Measured adolescent meal. Keeps energy honest and bond steady.", kind: "feed", energyCostHint: 3, dogEnergyCostHint: -25, bondDeltaHint: 2, trainingDeltaHint: 0, xpHint: 4 },
  { id: "walk", fantasyName: "Patrol of the North Path", subtitle: "Neighborhood walk", blurb: "Shepherd legs need miles and nose work. You get steps; she gets purpose.", kind: "walk", energyCostHint: 10, dogEnergyCostHint: 18, bondDeltaHint: 4, trainingDeltaHint: 1, xpHint: 8, stat: "constitution", dc: 8 },
  { id: "train-sit", fantasyName: "Seat of Courtesy Drill", subtitle: "Train: Sit", blurb: "Foundation cue. Short sessions beat marathon drills.", kind: "train", energyCostHint: 8, dogEnergyCostHint: 10, bondDeltaHint: 3, trainingDeltaHint: 4, cueId: "sit", xpHint: 10, stat: "wisdom", dc: 10 },
  { id: "train-stay", fantasyName: "Stillness Charm Drill", subtitle: "Train: Stay", blurb: "Impulse control for a teen working dog. Reward calm, not drama.", kind: "train", energyCostHint: 9, dogEnergyCostHint: 12, bondDeltaHint: 3, trainingDeltaHint: 5, cueId: "stay", xpHint: 12, stat: "wisdom", dc: 12 },
  { id: "train-come", fantasyName: "Call of the Hound Drill", subtitle: "Train: Come", blurb: "Recall — the cue that keeps adventures safe.", kind: "train", energyCostHint: 10, dogEnergyCostHint: 14, bondDeltaHint: 4, trainingDeltaHint: 6, cueId: "come", xpHint: 14, stat: "charisma", dc: 13 },
  { id: "train-heel", fantasyName: "Northroad Heel Drill", subtitle: "Train: Heel", blurb: "Loose-leash polish. Shepherd pride on the sidewalk.", kind: "train", energyCostHint: 11, dogEnergyCostHint: 15, bondDeltaHint: 5, trainingDeltaHint: 7, cueId: "heel", xpHint: 15, stat: "charisma", dc: 14 },
  { id: "play-tug", fantasyName: "Tug of War Banner", subtitle: "Play tug", blurb: "Fun with rules. Ends on your cue, not chaos — perfect for adolescent drive.", kind: "play", energyCostHint: 7, dogEnergyCostHint: 16, bondDeltaHint: 5, trainingDeltaHint: 2, xpHint: 7, stat: "dexterity", dc: 9 },
  { id: "dog-rest", fantasyName: "Quiet Kennel Vigil", subtitle: "Crate / settle time", blurb: "Downtime. Scout recovers; you check the campaign log.", kind: "rest", energyCostHint: 2, dogEnergyCostHint: -30, bondDeltaHint: 1, trainingDeltaHint: 0, xpHint: 2 },
];
