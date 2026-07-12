/** Level 1 → 100 XP scaffold for Party Chronicle */

export const MAX_LEVEL = 100;
export const MIN_LEVEL = 1;

/** Cumulative XP required to *reach* each level (index = level). Level 1 = 0. */
export const XP_TO_REACH_LEVEL: number[] = (() => {
  const arr = [0, 0]; // unused 0 + level 1
  let total = 0;
  for (let lvl = 2; lvl <= MAX_LEVEL; lvl++) {
    // Gentle early curve, steeper mid, plateau-friendly late game
    const band =
      lvl <= 10 ? 40 + lvl * 8 : lvl <= 40 ? 120 + lvl * 14 : lvl <= 70 ? 400 + lvl * 22 : 900 + lvl * 35;
    total += band;
    arr[lvl] = total;
  }
  return arr;
})();

export function levelFromXp(xp: number): number {
  let level = 1;
  for (let lvl = 2; lvl <= MAX_LEVEL; lvl++) {
    if (xp >= (XP_TO_REACH_LEVEL[lvl] ?? Infinity)) level = lvl;
    else break;
  }
  return Math.min(MAX_LEVEL, Math.max(MIN_LEVEL, level));
}

export function xpProgress(xp: number): {
  level: number;
  into: number;
  need: number;
  pct: number;
  totalForNext: number;
} {
  const level = levelFromXp(xp);
  if (level >= MAX_LEVEL) {
    return { level: MAX_LEVEL, into: 0, need: 1, pct: 100, totalForNext: XP_TO_REACH_LEVEL[MAX_LEVEL]! };
  }
  const floor = XP_TO_REACH_LEVEL[level] ?? 0;
  const ceil = XP_TO_REACH_LEVEL[level + 1] ?? floor + 100;
  const into = xp - floor;
  const need = Math.max(1, ceil - floor);
  return {
    level,
    into,
    need,
    pct: Math.min(100, Math.round((into / need) * 100)),
    totalForNext: ceil,
  };
}

/** Skill points granted when leveling from `fromLevel` to `toLevel` (inclusive of each new level). */
export function skillPointsForLevelGain(fromLevel: number, toLevel: number): number {
  if (toLevel <= fromLevel) return 0;
  let pts = 0;
  for (let l = fromLevel + 1; l <= toLevel; l++) {
    pts += l % 10 === 0 ? 2 : 1;
  }
  return pts;
}

/** Milestone chapters at level bands (story scaffold hooks). */
export const LEVEL_MILESTONES: { level: number; title: string; chapterHint: string }[] = [
  { level: 1, title: "First Torch", chapterHint: "ch1-frostford" },
  { level: 5, title: "Goblin Road", chapterHint: "ch2-goblin-road" },
  { level: 10, title: "Hold of Embers", chapterHint: "ch3-ember-hold" },
  { level: 20, title: "Dragon Whisper", chapterHint: "ch4-dragon-whisper" },
  { level: 35, title: "Misty Crossing", chapterHint: "ch5-misty-crossing" },
  { level: 50, title: "Crown of Ash", chapterHint: "ch6-crown-ash" },
  { level: 65, title: "Fellowship Strain", chapterHint: "ch7-fellowship" },
  { level: 80, title: "World-Eater Gate", chapterHint: "ch8-worldeater" },
  { level: 90, title: "Last Council", chapterHint: "ch9-last-council" },
  { level: 100, title: "Chronicle's End", chapterHint: "ch10-endings" },
];
