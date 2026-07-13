/**
 * Neverworld journey map — chapter waypoints for the comic minimap.
 */

import { TARGET_PLAYTIME_HOURS, hoursSummary } from "./campaign";
import { CHAPTERS, chapterForNode, getChapter, getStoryNode } from "./story";
import type { ChapterDef, PartyWorldSave } from "./types";

export type JourneyStop = {
  chapterId: string;
  chapter: number;
  title: string;
  short: string;
  sceneId: string;
  /** 0–100 map coordinates */
  x: number;
  y: number;
};

function shortTitle(title: string): string {
  const compact = title.replace(/^(the|a|an)\s+/i, "").trim();
  return compact.length > 15 ? `${compact.slice(0, 14).trimEnd()}…` : compact;
}

/**
 * Lay any number of chapters onto a serpentine trail. The row count grows with
 * the campaign, keeping a 50-chapter spine separated instead of stacking dots.
 */
export const JOURNEY_STOPS: JourneyStop[] = CHAPTERS.map((chapter, index, all) => {
  const columns = Math.max(5, Math.ceil(Math.sqrt(all.length * 1.35)));
  const rows = Math.max(1, Math.ceil(all.length / columns));
  const row = Math.floor(index / columns);
  const column = index % columns;
  const trailColumn = row % 2 === 0 ? column : columns - 1 - column;
  const x = 8 + (trailColumn / Math.max(1, columns - 1)) * 84;
  const baseY = rows === 1 ? 50 : 10 + (row / (rows - 1)) * 80;
  const curve = Math.sin((trailColumn / Math.max(1, columns - 1)) * Math.PI) * 3;

  return {
    chapterId: chapter.id,
    chapter: chapter.chapter,
    title: chapter.title,
    short: shortTitle(chapter.title),
    sceneId: chapter.sceneId ?? `scene-${chapter.id}`,
    x: Math.round(x * 10) / 10,
    y: Math.round((baseY + (row % 2 === 0 ? -curve : curve)) * 10) / 10,
  };
});

export function visitedFlag(chapterId: string): string {
  return `visited:${chapterId}`;
}

/** Chapter that owns the live story node — map pin source of truth. */
export function chapterIdForWorld(world: PartyWorldSave): string {
  return chapterForNode(world.campaignNodeId)?.id ?? world.chapterId;
}

/**
 * Rank story-map progress. Narrative "Continue" advances chapter/node without
 * bumping turnIndex, so merges must compare this — not turns alone.
 */
export function campaignProgressScore(world: PartyWorldSave): number {
  const ch = chapterForNode(world.campaignNodeId) ?? getChapter(world.chapterId);
  const chapterNum = ch?.chapter ?? 0;
  const nodeIdx = ch ? Math.max(0, ch.nodeIds.indexOf(world.campaignNodeId)) : 0;
  const visited = (world.partyFlags ?? []).filter((f) => f.startsWith("visited:")).length;
  const ending = world.endingId ? 1_000_000 : 0;
  return ending + chapterNum * 10_000 + nodeIdx * 10 + visited;
}

/** Prefer the save further along the journey (then newer updatedAt). */
export function preferCampaignProgress(
  a: PartyWorldSave,
  b: PartyWorldSave
): PartyWorldSave {
  const aScore = campaignProgressScore(a);
  const bScore = campaignProgressScore(b);
  if (aScore !== bScore) return aScore > bScore ? a : b;
  const aAt = Date.parse(a.updatedAt || a.startedAt || "") || 0;
  const bAt = Date.parse(b.updatedAt || b.startedAt || "") || 0;
  return aAt >= bAt ? a : b;
}

export function unionPartyFlags(a: string[] = [], b: string[] = []): string[] {
  return Array.from(new Set([...a, ...b]));
}

export function isChapterVisited(world: PartyWorldSave, chapterId: string): boolean {
  const hereId = chapterIdForWorld(world);
  if (hereId === chapterId) return true;
  if (world.partyFlags.includes(visitedFlag(chapterId))) return true;
  const cur = getChapter(hereId);
  const stop = JOURNEY_STOPS.find((s) => s.chapterId === chapterId);
  // Linear fallback: earlier chapter numbers count as walked if flags missing.
  if (cur && stop && stop.chapter < cur.chapter) return true;
  return false;
}

export function currentJourneyStop(world: PartyWorldSave): JourneyStop | null {
  const id = chapterIdForWorld(world);
  return JOURNEY_STOPS.find((s) => s.chapterId === id) ?? null;
}

export function markChapterVisited(world: PartyWorldSave, chapterId?: string): PartyWorldSave {
  const id = chapterId ?? world.chapterId;
  if (!id) return world;
  const flag = visitedFlag(id);
  if (world.partyFlags.includes(flag)) return world;
  // Also stamp the chapter for the active node when known.
  const fromNode = chapterForNode(world.campaignNodeId);
  const flags = [...world.partyFlags, flag];
  if (fromNode && fromNode.id !== id && !flags.includes(visitedFlag(fromNode.id))) {
    flags.push(visitedFlag(fromNode.id));
  }
  return { ...world, partyFlags: flags };
}

export function journeyTrail(world: PartyWorldSave): {
  stops: Array<JourneyStop & { state: "visited" | "here" | "ahead" }>;
  here: JourneyStop | null;
} {
  const hereId = chapterIdForWorld(world);
  const here = JOURNEY_STOPS.find((s) => s.chapterId === hereId) ?? null;
  const stops = JOURNEY_STOPS.map((s) => {
    if (s.chapterId === hereId) return { ...s, state: "here" as const };
    if (isChapterVisited(world, s.chapterId)) return { ...s, state: "visited" as const };
    return { ...s, state: "ahead" as const };
  });
  return { stops, here };
}

export function chapterSceneLabel(ch: ChapterDef | null): string {
  return ch?.title ?? "Unknown wilds";
}

export type CampaignProgressReport = {
  chapterNum: number;
  chapterTotal: number;
  chapterTitle: string;
  nodeIndex: number;
  nodeTotal: number;
  nodeTitle: string;
  /** 0–100 lived progress toward the long chronicle. */
  percent: number;
  hoursDone: number;
  hoursTarget: number;
  battlesFought: number;
  sideQuestsDone: number;
  explorationFinds: number;
  /** Short HUD line (progress bar caption). */
  label: string;
  /** One-line status under the bar / in Camp. */
  detail: string;
  /** Compact Camp blurb without repeating the bar caption. */
  campBlurb: string;
};

/** Targets sized for the ~100–300h party test chronicle. */
const BATTLE_TARGET = 200;
const TURN_TARGET = 900;
const DEED_TARGET = 250;

function formatPlayTime(hours: number): string {
  if (hours < 0.05) return "just started";
  if (hours < 1) return `~${Math.max(1, Math.round(hours * 60))}m played`;
  return `~${hours}h played`;
}

/** Overall main-quest progress for HUD — lived play, not estimated chapter budgets. */
export function campaignProgressReport(world: PartyWorldSave): CampaignProgressReport {
  const chapter = chapterForNode(world.campaignNodeId) ?? getChapter(world.chapterId);
  const chapterTotal = Math.max(1, CHAPTERS.length);
  const chapterOrd = Math.max(
    0,
    CHAPTERS.findIndex((c) => c.id === chapter?.id)
  );
  const chapterNum = chapterOrd >= 0 ? chapterOrd + 1 : chapter?.chapter ?? 1;
  const nodeIds = chapter?.nodeIds ?? [];
  const nodeTotal = Math.max(1, nodeIds.length);
  const rawIdx = nodeIds.indexOf(world.campaignNodeId);
  const nodeIndex = rawIdx >= 0 ? rawIdx + 1 : 1;
  const node = getStoryNode(world.campaignNodeId);
  const nodeTitle = node?.title ?? "Unknown beat";

  const hours = hoursSummary();
  const hoursTarget = Math.max(hours.totalHours, TARGET_PLAYTIME_HOURS);

  const battlesFought = world.battlesFought ?? 0;
  const sideQuestsDone = world.completedSideQuests?.length ?? 0;
  const explorationFinds = world.explorationFinds ?? 0;
  const recipes = world.cookedRecipes?.length ?? 0;
  const turns = world.turnIndex ?? 0;
  const deeds = battlesFought + sideQuestsDone * 2 + explorationFinds + recipes;
  const playHours = (world.storyPlayMs ?? 0) / 3_600_000;
  const hoursDone = Math.round(playHours * 10) / 10;
  const playLabel = formatPlayTime(hoursDone);

  const lived = Math.min(
    1,
    (playHours / hoursTarget) * 0.35 +
      (battlesFought / BATTLE_TARGET) * 0.4 +
      Math.min(1, turns / TURN_TARGET) * 0.15 +
      Math.min(1, deeds / DEED_TARGET) * 0.1
  );
  const percent = Math.min(100, Math.round(lived * 1000) / 10);

  const chapterTitle = chapter?.title ?? "The road";
  const questBits = [
    `${battlesFought} battle${battlesFought === 1 ? "" : "s"}`,
    `${sideQuestsDone} side quest${sideQuestsDone === 1 ? "" : "s"}`,
  ].join(" · ");

  return {
    chapterNum,
    chapterTotal,
    chapterTitle,
    nodeIndex,
    nodeTotal,
    nodeTitle,
    percent,
    hoursDone,
    hoursTarget,
    battlesFought,
    sideQuestsDone,
    explorationFinds,
    label: `${percent}% of the chronicle · Act ${chapterNum} of ${chapterTotal}`,
    detail: `${nodeTitle} · ${playLabel} · ${questBits}`,
    campBlurb: `${chapterTitle} · ${questBits}`,
  };
}
