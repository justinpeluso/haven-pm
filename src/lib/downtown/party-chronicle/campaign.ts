/**
 * Long-form campaign scaffold targeting 100–300 hours of play.
 * Hours assume 3-player turn rotation (Justin → Rusty → Elisha),
 * side quests, encounter decks, cooking/exploration loops.
 */

import { CHAPTERS } from "./story";
import type { ChapterDef } from "./types";

export type ActDef = ChapterDef & {
  estimatedHours: number;
  bossId: string;
  encounterDeckId: string;
  sideQuestIds: string[];
};

export const TARGET_PLAYTIME_HOURS = 300;

const HOURS: Record<string, number> = {
  "ch1-frostford": 18,
  "ch2-goblin-road": 24,
  "ch3-ember-hold": 30,
  "ch4-dragon-whisper": 30,
  "ch5-misty-crossing": 36,
  "ch6-crown-ash": 36,
  "ch7-fellowship": 30,
  "ch8-worldeater": 30,
  "ch9-last-council": 30,
  "ch10-endings": 36,
};

const BOSSES: Record<string, string> = {
  "ch1-frostford": "boss-bridge-goblin",
  "ch2-goblin-road": "boss-goblin-chief",
  "ch3-ember-hold": "boss-house-champion",
  "ch4-dragon-whisper": "boss-young-drake",
  "ch5-misty-crossing": "boss-mist-wraith",
  "ch6-crown-ash": "boss-ash-guardian",
  "ch7-fellowship": "boss-doubt-shade",
  "ch8-worldeater": "boss-gate-herald",
  "ch9-last-council": "boss-mirror-self",
  "ch10-endings": "boss-worldeater",
};

const SIDE_QUESTS: Record<string, string[]> = {
  "ch1-frostford": ["sq-pip-crumbs", "sq-scout-first-heel", "sq-justin-private"],
  "ch2-goblin-road": ["sq-camp-stew", "sq-rusty-trail", "sq-copper-flank"],
  "ch3-ember-hold": ["sq-jarl-rumor", "sq-elisha-tome", "sq-lumen-ward"],
  "ch4-dragon-whisper": ["sq-scale-hunt", "sq-corv-oath", "sq-legendary-ember-blade"],
  "ch5-misty-crossing": ["sq-elven-bread", "sq-dwarven-ale", "sq-ulfric-pack"],
  "ch6-crown-ash": ["sq-crown-lore", "sq-refuse-temptation", "sq-legendary-cloak"],
  "ch7-fellowship": ["sq-mend-trust", "sq-private-rusty", "sq-private-elisha"],
  "ch8-worldeater": ["sq-gate-runes", "sq-hound-legend", "sq-hotbar-mastery"],
  "ch9-last-council": ["sq-final-feast", "sq-three-vows"],
  "ch10-endings": ["sq-codex-seal"],
};

const HAS_CHAPTER_ESTIMATES = CHAPTERS.some((chapter) => chapter.estimatedHours != null);

export const ACTS: ActDef[] = CHAPTERS.map((ch) => ({
  ...ch,
  estimatedHours:
    ch.estimatedHours ??
    (HAS_CHAPTER_ESTIMATES
      ? 0 // Authored landmarks occur inside the generated spine's hour budget.
      : HOURS[ch.id] ?? TARGET_PLAYTIME_HOURS / CHAPTERS.length),
  bossId: BOSSES[ch.id] ?? `boss-${ch.id}`,
  encounterDeckId: `deck-${ch.id}`,
  sideQuestIds: SIDE_QUESTS[ch.id] ?? [],
  splashArtId: ch.splashArtId ?? `splash-${ch.id}`,
  sceneId: ch.sceneId ?? `scene-${ch.id}`,
}));

export function getAct(id: string): ActDef | undefined {
  return ACTS.find((a) => a.id === id);
}

export function actForLevel(level: number): ActDef {
  const found = ACTS.find((a) => level >= a.levelMin && level <= a.levelMax);
  return found ?? ACTS[ACTS.length - 1]!;
}

export function hoursSummary(): {
  totalHours: number;
  acts: { id: string; title: string; estimatedHours: number; levelMin: number; levelMax: number }[];
  note: string;
} {
  const acts = ACTS.map((a) => ({
    id: a.id,
    title: a.title,
    estimatedHours: a.estimatedHours,
    levelMin: a.levelMin,
    levelMax: a.levelMax,
  }));
  const totalHours = acts.reduce((s, a) => s + a.estimatedHours, 0);
  return {
    totalHours,
    acts,
    note:
      "Designed for roughly 100–300 hours. Estimates assume four players rotating Justin → Rusty → Elisha → Eric with side quests, exploration, cooking, encounter decks, and legendary hunts; focused or solo play lands nearer the lower bound.",
  };
}
