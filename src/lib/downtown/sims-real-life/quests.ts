import {
  DEFAULT_DOG_NAME,
  DOG_CUES_WIN,
  DOG_TRAINING_WIN,
  REQUIRED_WIN_CUES,
  REQUIRED_WIN_TRAINING,
  WIN_WEIGHT_LB,
} from "./data";
import type { PlayerSave, Quest, Stats } from "./types";

export { STAT_KEYS } from "./types";

export const STAT_LABELS: Record<keyof Stats, string> = {
  strength: "Strength",
  dexterity: "Dexterity",
  constitution: "Constitution",
  intelligence: "Intelligence",
  wisdom: "Wisdom",
  charisma: "Charisma",
  computer: "Computer",
  magic: "Magic",
};

/** Justin’s sheet: people + focus + screens strong; bulk stats are the arc. */
export const STARTING_STATS: Stats = {
  strength: 12,
  dexterity: 14,
  constitution: 12,
  intelligence: 12,
  wisdom: 16,
  charisma: 16,
  computer: 17,
  magic: 16,
};

export const TARGET_WEIGHT_LB = WIN_WEIGHT_LB;

export const VICTORY_BANNER = {
  title: "Campaign Victory",
  subtitle: "Heroes of Haven — scale & hound",
  body: `The chronicle closes on a triumph: Justin stands at **${WIN_WEIGHT_LB} lb**, forged by Daybreak Rations, Trials of Iron, Long Rests, and stubborn kindness.

Scout — Hound of the North, female German Shepherd, 1½ years — walks at heel with cues earned, not forced.

The party did not cast a miracle. They kept the quest log. Fail-forward days still counted. The keep is quieter; the bond is louder.`,
  optionalMasteryLine:
    "Mastery ribbon: high training + multiple cues — her banner flies beside yours.",
} as const;

export const QUESTS: Quest[] = [
  {
    id: "q1-intro",
    chapter: 1,
    title: "Scroll of First Light",
    tagline: "Name the goal. Break Daybreak Rations. Meet the Hound.",
    synopsis: `Justin, 38, starts light at ~150 lb with a target of **${WIN_WEIGHT_LB} lb**. Scout — a female German Shepherd, 1½ years — needs a partner who can keep the routine. Eat once and train once to leave intro.`,
    phase: "intro",
    unlockAfter: null,
    rewards: { xp: 30, stats: { wisdom: 1 }, money: 10 },
    steps: [
      {
        id: "q1-n1",
        kind: "narrative",
        title: "Mirror of the Keep",
        body: `Haven’s downtown morning light hits the mirror. You’re **Justin** — good with people, screens, and focus rituals (call it Magic if you want). The body goal is simple fiction for this game: climb toward **${WIN_WEIGHT_LB} lb** with food, lifting, and rest — not overnight magic.

Scout thumps a tail — adolescent Shepherd energy, sharp and loyal. She needs a partner, not a roommate.`,
      },
      {
        id: "q1-eat",
        kind: "flag",
        title: "Unroll Daybreak Rations",
        body: "Log at least one meal. Surplus starts with showing up at the table.",
        requireFlags: ["ate_once"],
      },
      {
        id: "q1-train",
        kind: "flag",
        title: "Enter the Iron Circle",
        body: "Complete one exercise — Trials of Iron preferred, anything counts for intro.",
        requireFlags: ["trained_once"],
      },
      {
        id: "q1-n2",
        kind: "narrative",
        title: "The Pact of Two Quests",
        body: `Intro cleared. From here it’s **routine**: eat enough, lift when you can, walk Scout, sleep. Failures still advance the day — fail-forward.

Disclaimer: this is a life-sim, not a care plan.`,
      },
    ],
  },
  {
    id: "q2-routine-fuel",
    chapter: 2,
    title: "Daybreak Rations Chronicle",
    tagline: "Hit calories. Respect protein. Stock the hearth.",
    synopsis: "Build the habit of eating on purpose. Ration Alchemy (meal prep) helps busy days.",
    phase: "routine",
    unlockAfter: "q1-intro",
    rewards: { xp: 40, stats: { constitution: 1 } },
    steps: [
      {
        id: "q2-n1",
        kind: "narrative",
        title: "Maintenance Is Not the Banner",
        body: "At your fictional TDEE band, maintenance keeps you stuck. Stack meals until the day log shows surplus — protein makes the surplus more ‘lean’ in the model.",
      },
      {
        id: "q2-flags",
        kind: "flag",
        title: "Three Fed Dawns",
        body: "Accumulate three days where you ate enough to matter (engine sets fed_day).",
        requireFlags: ["fed_days_3"],
      },
      {
        id: "q2-prep",
        kind: "flag",
        title: "Ration Alchemy",
        body: "Use or create meal prep at least once.",
        requireFlags: ["meal_prep_used"],
      },
    ],
  },
  {
    id: "q3-iron-habit",
    chapter: 3,
    title: "Trials of Iron",
    tagline: "Resistance multiplies the surplus.",
    synopsis: "Cardio alone while underfed stalls. Squats and presses tell the model you’re building.",
    phase: "routine",
    unlockAfter: "q2-routine-fuel",
    rewards: { xp: 45, stats: { strength: 1 } },
    steps: [
      {
        id: "q3-n1",
        kind: "narrative",
        title: "Earn the Feast",
        body: "Resistance days multiply how much of your surplus becomes weight on the scale in this game. Underfed cardio-only days get a soft penalty.",
      },
      {
        id: "q3-lift",
        kind: "flag",
        title: "Four Iron Trials",
        body: "Log resistance (or hybrid) training four times across the campaign.",
        requireFlags: ["resistance_4"],
      },
      {
        id: "q3-weight",
        kind: "check",
        title: "Midroad Scale Rite",
        body: "Reach at least 158 lb — proof the routine is working.",
        checkId: "weight_158",
      },
    ],
  },
  {
    id: "q4-scout-partner",
    chapter: 4,
    title: "Hound of the North Training Grounds",
    subtitle: "Scout partnership",
    tagline: "Feed, walk, train — bond is a stat too.",
    synopsis: `${DEFAULT_DOG_NAME} (♀, 1½y) needs consistency. Learn cues; keep her energy honest.`,
    phase: "routine",
    unlockAfter: "q3-iron-habit",
    rewards: { xp: 50, stats: { charisma: 1, wisdom: 1 } },
    steps: [
      {
        id: "q4-n1",
        kind: "narrative",
        title: "Shepherd Contract",
        body: "A tired, trained Shepherd is a joy. A bored one invents hobbies you won’t like. Walk her, feed her, keep training blocks short and kind.",
      },
      {
        id: "q4-care",
        kind: "flag",
        title: "Reliable Handler",
        body: "Feed and walk on the same day at least three times; teach her Sit and Stay.",
        requireFlags: ["dog_care_days_3", "cue_sit", "cue_stay"],
      },
      {
        id: "q4-bond",
        kind: "check",
        title: "Bond of the Banner",
        body: "Scout’s bond reaches 40.",
        checkId: "dog_bond_40",
      },
    ],
  },
  {
    id: "q5-finale",
    chapter: 5,
    title: "Ascension of the Scale",
    tagline: `Hit ${WIN_WEIGHT_LB}. Keep Scout at heel. Graduate.`,
    synopsis: `Push to ${WIN_WEIGHT_LB} lb with partnership intact. Optional dog training mastery bonus at graduation.`,
    phase: "finale",
    unlockAfter: "q4-scout-partner",
    rewards: { xp: 80, stats: { strength: 1, constitution: 1, wisdom: 1 }, money: 40 },
    dogMasteryBonus: { minTraining: 40, minCues: 3, xp: 40, bond: 10 },
    steps: [
      {
        id: "q5-n1",
        kind: "narrative",
        title: "Last March",
        body: `The number on the wall is **${WIN_WEIGHT_LB}**. Keep surplus + resistance. Walk Scout so the win doesn’t cost the partnership.`,
      },
      {
        id: "q5-weight",
        kind: "check",
        title: "Heroes’ Threshold",
        body: `Reach ${WIN_WEIGHT_LB} lb.`,
        checkId: "weight_win",
      },
      {
        id: "q5-dog",
        kind: "check",
        title: "Hound at Heel",
        body: `Scout needs training ≥ ${REQUIRED_WIN_TRAINING} and win cues (${REQUIRED_WIN_CUES.join(", ")}) before the banner rises.`,
        checkId: "dog_partner_ready",
      },
      {
        id: "q5-grad",
        kind: "narrative",
        title: "Victory Banner",
        body: `${VICTORY_BANNER.body}

Optional mastery: high training + multiple cues grants a graduation bonus.

This was never medical advice. It was a game about showing up.`,
      },
    ],
  },
];

export const INTRO_QUEST_ID = "q1-intro";
export const FINALE_QUEST_ID = "q5-finale";

export function getQuest(id: string): Quest | undefined {
  return QUESTS.find((q) => q.id === id);
}

export function isQuestUnlocked(save: PlayerSave, quest: Quest): boolean {
  if (!quest.unlockAfter) return true;
  return save.completedQuestIds.includes(quest.unlockAfter);
}

export function availableQuests(save: PlayerSave): Quest[] {
  return QUESTS.filter((q) => isQuestUnlocked(save, q));
}

export function nextIncompleteQuest(save: PlayerSave): Quest | null {
  return (
    QUESTS.find((q) => isQuestUnlocked(save, q) && !save.completedQuestIds.includes(q.id)) ?? null
  );
}

export function questCheckPasses(save: PlayerSave, checkId: string): boolean {
  switch (checkId) {
    case "weight_158":
      return save.weightLb >= 158;
    case "weight_win":
      return save.weightLb >= WIN_WEIGHT_LB;
    case "dog_bond_40":
      return save.dog.bond >= 40;
    case "dog_partner_ready":
      return (
        save.dog.training >= REQUIRED_WIN_TRAINING &&
        REQUIRED_WIN_CUES.every((c) => save.dog.cuesLearned.includes(c))
      );
    default:
      return false;
  }
}

export function hasFlags(save: PlayerSave, flags: string[] | undefined): boolean {
  if (!flags || flags.length === 0) return true;
  return flags.every((f) => save.flags.includes(f));
}
