/**
 * Neverworld journey map — chapter waypoints for the comic minimap.
 */

import { chapterForNode, getChapter } from "./story";
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

/** Hand-placed trail across a forested realm map. */
export const JOURNEY_STOPS: JourneyStop[] = [
  { chapterId: "ch1-frostford", chapter: 1, title: "Frostford Gate", short: "Frostford", sceneId: "scene-frostford-gate", x: 12, y: 72 },
  { chapterId: "ch2-goblin-road", chapter: 2, title: "Goblin Road", short: "Goblin Rd", sceneId: "scene-goblin-camp", x: 28, y: 58 },
  { chapterId: "ch3-ember-hold", chapter: 3, title: "Hold of Embers", short: "Embers", sceneId: "scene-ember-hall", x: 42, y: 42 },
  { chapterId: "ch4-dragon-whisper", chapter: 4, title: "Dragon Whisper", short: "Ruin", sceneId: "scene-dragon-ruin", x: 58, y: 30 },
  { chapterId: "ch5-misty-crossing", chapter: 5, title: "Misty Crossing", short: "Mist", sceneId: "scene-misty-bridge", x: 72, y: 38 },
  { chapterId: "ch6-crown-ash", chapter: 6, title: "Crown of Ash", short: "Ash", sceneId: "scene-ash-crown", x: 78, y: 55 },
  { chapterId: "ch7-fellowship", chapter: 7, title: "Fellowship Strain", short: "Camp", sceneId: "scene-fellowship-camp", x: 62, y: 68 },
  { chapterId: "ch8-worldeater", chapter: 8, title: "World-Eater Gate", short: "Gate", sceneId: "scene-worldeater-gate", x: 48, y: 78 },
  { chapterId: "ch9-last-council", chapter: 9, title: "Last Council", short: "Council", sceneId: "scene-last-council", x: 32, y: 85 },
  { chapterId: "ch10-endings", chapter: 10, title: "The Crowns", short: "Crown", sceneId: "scene-wild-crown", x: 16, y: 88 },
];

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
