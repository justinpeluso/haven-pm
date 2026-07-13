/**
 * Neverworld journey map — chapter waypoints for the comic minimap.
 */

import { CHAPTERS, chapterForNode, getChapter } from "./story";
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

export function isChapterVisited(world: PartyWorldSave, chapterId: string): boolean {
  if (world.chapterId === chapterId) return true;
  if (world.partyFlags.includes(visitedFlag(chapterId))) return true;
  const cur = getChapter(world.chapterId);
  const stop = JOURNEY_STOPS.find((s) => s.chapterId === chapterId);
  // Linear fallback: earlier chapter numbers count as walked if flags missing.
  if (cur && stop && stop.chapter < cur.chapter) return true;
  return false;
}

export function currentJourneyStop(world: PartyWorldSave): JourneyStop | null {
  return JOURNEY_STOPS.find((s) => s.chapterId === world.chapterId) ?? null;
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
  const here = currentJourneyStop(world);
  const stops = JOURNEY_STOPS.map((s) => {
    if (here && s.chapterId === here.chapterId) return { ...s, state: "here" as const };
    if (isChapterVisited(world, s.chapterId)) return { ...s, state: "visited" as const };
    return { ...s, state: "ahead" as const };
  });
  return { stops, here };
}

export function chapterSceneLabel(ch: ChapterDef | null): string {
  return ch?.title ?? "Unknown wilds";
}
