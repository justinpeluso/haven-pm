/**
 * Campaign scrolls — Baldur’s Gate / HoMM flavored chapters.
 * Win: Justin reaches 170 lb. Optional Scout mastery bonus.
 */

import { WEIGHT_MILESTONES_LB } from "./mechanics";
import { NOT_MEDICAL_ADVICE } from "./character";

export type CampaignStepKind = "narrative" | "flag" | "check";

export type CampaignStep = {
  id: string;
  kind: CampaignStepKind;
  title: string;
  subtitle: string;
  body: string;
  requireFlags?: string[];
  checkId?: string;
};

export type CampaignChapter = {
  id: string;
  chapter: number;
  title: string;
  subtitle: string;
  tagline: string;
  synopsis: string;
  phase: "intro" | "routine" | "finale" | "graduated";
  unlockAfter?: string | null;
  rewards: {
    xp: number;
    stats?: Partial<Record<"strength"|"dexterity"|"constitution"|"intelligence"|"wisdom"|"charisma"|"computer"|"magic", number>>;
    money?: number;
  };
  steps: CampaignStep[];
  dogMasteryBonus?: { minTraining: number; minCues: number; xp: number; bond: number };
};

export const WIN_WEIGHT_LB = WEIGHT_MILESTONES_LB.win;

export const VICTORY_BANNER = {
  title: "Campaign Victory",
  subtitle: "Heroes of Haven — scale & hound",
  body: `The chronicle closes on a triumph: Justin stands at **${WIN_WEIGHT_LB} lb**, forged by Daybreak Rations, Trials of Iron, Long Rests, and stubborn kindness.

Scout — Hound of the North, female German Shepherd, 1½ years — walks at heel with cues earned, not forced.

The party did not cast a miracle. They kept the quest log. Fail-forward days still counted. The keep is quieter; the bond is louder.

${NOT_MEDICAL_ADVICE}`,
  optionalMasteryLine:
    "Mastery ribbon: high training + multiple cues — Scout’s banner flies beside yours.",
} as const;

export const CAMPAIGN: CampaignChapter[] = [
  {
    id: "q1-intro", chapter: 1, title: "Scroll of First Light", subtitle: "Intro — wake-up & pact",
    tagline: "Name the goal. Break Daybreak Rations. Meet the Hound.",
    synopsis: `Justin, 38, begins at ~${WEIGHT_MILESTONES_LB.start} lb. The campaign win is **${WIN_WEIGHT_LB} lb**. Scout (♀, 1½y) waits by the door — adolescent drive, partnership required. Eat once and train once to leave intro.`,
    phase: "intro", unlockAfter: null, rewards: { xp: 30, stats: { wisdom: 1 }, money: 10 },
    steps: [
      { id: "q1-n1", kind: "narrative", title: "Mirror of the Keep", subtitle: "Bathroom scale", body: `Haven’s morning light hits the mirror. You are **Justin** — strong in Computer, Charisma, Wisdom, and Magic (focus). The body quest is game fiction: climb toward **${WIN_WEIGHT_LB} lb** with surplus, resistance, sleep — not overnight spells.\n\nScout thumps a tail — Hound of the North, female, adolescent. Partnership required.` },
      { id: "q1-eat", kind: "flag", title: "Unroll Daybreak Rations", subtitle: "First meal", body: "Log at least one meal. Surplus starts at the table.", requireFlags: ["ate_once"] },
      { id: "q1-train", kind: "flag", title: "Enter the Iron Circle", subtitle: "First workout", body: "Complete one exercise — Trial of Iron preferred; anything counts for intro.", requireFlags: ["trained_once"] },
      { id: "q1-n2", kind: "narrative", title: "The Pact of Two Quests", subtitle: "Intro cleared", body: `Intro cleared. Routine chapters await: eat enough, lift when you can, walk Scout, Long Rest. Failures still advance the day — fail-forward.\n\n${NOT_MEDICAL_ADVICE}` },
    ],
  },
  {
    id: "q2-routine-fuel", chapter: 2, title: "Daybreak Rations Chronicle", subtitle: "Fuel the surplus",
    tagline: "Hit calories. Respect protein. Stock the hearth.",
    synopsis: "Build the habit of eating on purpose. Ration Alchemy (meal prep) helps busy days.",
    phase: "routine", unlockAfter: "q1-intro", rewards: { xp: 40, stats: { constitution: 1 } },
    steps: [
      { id: "q2-n1", kind: "narrative", title: "Maintenance Is Not the Banner", subtitle: "Why surplus", body: "At the fictional TDEE band (~2200–2600), maintenance keeps the scale stuck. Stack plates until the day log shows surplus — protein makes the surplus leaner in this model." },
      { id: "q2-flags", kind: "flag", title: "Three Fed Dawns", subtitle: "Three solid food days", body: "Accumulate three days where you ate enough to matter (engine: fed_day).", requireFlags: ["fed_days_3"] },
      { id: "q2-prep", kind: "flag", title: "Ration Alchemy", subtitle: "Use meal prep", body: "Create or spend meal-prep stock at least once.", requireFlags: ["meal_prep_used"] },
    ],
  },
  {
    id: "q3-iron-habit", chapter: 3, title: "Trials of Iron", subtitle: "Resistance habit",
    tagline: "Iron multiplies the surplus. Cardio alone while underfed stalls.",
    synopsis: "Squats and presses tell the model you’re building. Underfed cardio-only days soften gains.",
    phase: "routine", unlockAfter: "q2-routine-fuel", rewards: { xp: 45, stats: { strength: 1 } },
    steps: [
      { id: "q3-n1", kind: "narrative", title: "Earn the Feast", subtitle: "Why lift", body: "Resistance days multiply how much surplus becomes weight on the scale in this game. Stormstride-only underfed days take a soft penalty." },
      { id: "q3-lift", kind: "flag", title: "Four Iron Trials", subtitle: "Four resistance sessions", body: "Log resistance (or hybrid) training four times across the campaign.", requireFlags: ["resistance_4"] },
      { id: "q3-weight", kind: "check", title: "Midroad Scale Rite", subtitle: "Reach 158 lb", body: `Reach at least ${WEIGHT_MILESTONES_LB.midCheck} lb — proof the routine is working.`, checkId: "weight_158" },
    ],
  },
  {
    id: "q4-scout-partner", chapter: 4, title: "Hound of the North Training Grounds", subtitle: "Scout partnership",
    tagline: "Feed, walk, train — bond is a stat too.",
    synopsis: "Scout (♀, 1½y) needs adolescent-appropriate consistency: two meals, miles, short reward-based cues.",
    phase: "routine", unlockAfter: "q3-iron-habit", rewards: { xp: 50, stats: { charisma: 1, wisdom: 1 } },
    steps: [
      { id: "q4-n1", kind: "narrative", title: "Shepherd Contract", subtitle: "Why the hound matters", body: "A tired, trained adolescent Shepherd is a joy. A bored one invents side quests you will not enjoy. Walk, feed, brief scrolls of cues." },
      { id: "q4-care", kind: "flag", title: "Reliable Handler", subtitle: "Care days + Sit/Stay", body: "Feed and walk on the same day at least three times; learn Sit and Stay.", requireFlags: ["dog_care_days_3", "cue_sit", "cue_stay"] },
      { id: "q4-bond", kind: "check", title: "Bond of the Banner", subtitle: "Bond ≥ 40", body: "Scout’s bond reaches 40.", checkId: "dog_bond_40" },
    ],
  },
  {
    id: "q5-finale", chapter: 5, title: "Ascension of the Scale", subtitle: "Finale — hit 170",
    tagline: `Tip the scale to ${WIN_WEIGHT_LB}. Graduate the campaign.`,
    synopsis: `Push to ${WIN_WEIGHT_LB} lb. Optional dog training mastery ribbon at victory.`,
    phase: "finale", unlockAfter: "q4-scout-partner",
    rewards: { xp: 80, stats: { strength: 1, constitution: 1, wisdom: 1 }, money: 40 },
    dogMasteryBonus: { minTraining: 40, minCues: 3, xp: 40, bond: 10 },
    steps: [
      { id: "q5-n1", kind: "narrative", title: "Last March", subtitle: "Final stretch", body: `The number on the keep wall is **${WIN_WEIGHT_LB}**. Keep surplus + Trials of Iron. Walk Scout so victory does not cost the partnership.` },
      { id: "q5-weight", kind: "check", title: "Heroes’ Threshold", subtitle: `Weight ≥ ${WIN_WEIGHT_LB}`, body: `Reach ${WIN_WEIGHT_LB} lb.`, checkId: "weight_win" },
      { id: "q5-grad", kind: "narrative", title: "Victory Banner", subtitle: "Graduation", body: VICTORY_BANNER.body },
    ],
  },
];

export const INTRO_CHAPTER_ID = "q1-intro";
export const FINALE_CHAPTER_ID = "q5-finale";
export function getChapter(id: string): CampaignChapter | undefined {
  return CAMPAIGN.find((c) => c.id === id);
}
export const CAMPAIGN_OUTLINE = CAMPAIGN.map((c) => ({
  chapter: c.chapter, id: c.id, title: c.title, subtitle: c.subtitle, phase: c.phase,
  winCheck: c.id === "q5-finale" ? `weight >= ${WIN_WEIGHT_LB}` : undefined,
}));
