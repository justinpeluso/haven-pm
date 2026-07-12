export const STAT_KEYS = ["logic", "craft", "charm", "grit", "debug"] as const;
export type StatKey = (typeof STAT_KEYS)[number];

export type Stats = Record<StatKey, number>;

export type InventoryItem = {
  id: string;
  name: string;
  blurb: string;
  icon: "terminal" | "cad" | "filament" | "badge" | "notes" | "key";
};

export type SkillCheckOutcome = {
  text: string;
  xp?: number;
  stats?: Partial<Stats>;
  itemId?: string;
};

export type NarrativeStep = {
  id: string;
  type: "narrative";
  title?: string;
  body: string;
};

export type ChoiceOption = {
  id: string;
  label: string;
  approach: string;
  stat: StatKey;
  dc: number;
  success: SkillCheckOutcome;
  fail: SkillCheckOutcome;
};

export type ChoiceStep = {
  id: string;
  type: "choice";
  title: string;
  prompt: string;
  options: ChoiceOption[];
};

export type ChallengeStep = {
  id: string;
  type: "challenge";
  title: string;
  prompt: string;
  codeHint?: string;
  options: { id: string; label: string; correct: boolean }[];
  explanation: string;
  xp: number;
  stats?: Partial<Stats>;
  itemId?: string;
};

export type LootStep = {
  id: string;
  type: "loot";
  title: string;
  body: string;
  itemId: string;
  xp?: number;
};

export type GraduationStep = {
  id: string;
  type: "graduation";
  title: string;
  body: string;
};

export type QuestStep =
  | NarrativeStep
  | ChoiceStep
  | ChallengeStep
  | LootStep
  | GraduationStep;

export type Quest = {
  id: string;
  chapter: number;
  title: string;
  tagline: string;
  synopsis: string;
  focus: string[];
  unlockAfter?: string | null;
  rewards: { xp: number; stats?: Partial<Stats> };
  steps: QuestStep[];
};

export type PlayerSave = {
  version: 1;
  name: string;
  title: string;
  stats: Stats;
  xp: number;
  inventory: string[];
  completedQuestIds: string[];
  currentQuestId: string | null;
  stepIndex: number;
  lastRoll: { d20: number; total: number; success: boolean; optionId: string } | null;
  choiceLog: { questId: string; stepId: string; optionId: string; success: boolean }[];
  graduated: boolean;
  startedAt: string;
  updatedAt: string;
};
