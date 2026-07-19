/**
 * Dungeons and Dogs — Wilderland atlas + local chapter maps.
 */
import pack from "../../../../data/dungeon-tester/maps.json";
import { CHAPTERS } from "./story";
import type { DtMapReplay, DtWorldSave } from "./types";
import { DT_START_CHAPTER_ID, DT_START_NODE_ID } from "./types";

export type { DtMapReplay };

export type DtMapPin = { x: number; y: number };

export type DtMapRegion = {
  id: string;
  name: string;
  blurb: string;
  chapterId: string;
  chapter: number;
  localMapId: string;
  pin: DtMapPin;
  terrain: string[];
};

export type DtMapLandmark = {
  id: string;
  name: string;
  x: number;
  y: number;
  kind: string;
  blurb?: string;
};

type RawPack = {
  version: number;
  title: string;
  worldMapId: string;
  regions: DtMapRegion[];
  landmarks: DtMapLandmark[];
};

const data = pack as RawPack;

export const DT_MAP_TITLE = data.title;
export const DT_WORLD_MAP_ID = data.worldMapId;
export const DT_MAP_REGIONS: DtMapRegion[] = data.regions;
export const DT_MAP_LANDMARKS: DtMapLandmark[] = data.landmarks;

const REGION_BY_ID = Object.fromEntries(DT_MAP_REGIONS.map((r) => [r.id, r]));
const REGION_BY_CHAPTER = Object.fromEntries(
  DT_MAP_REGIONS.map((r) => [r.chapterId, r])
);

export function getDtMapRegion(id: string): DtMapRegion | undefined {
  return REGION_BY_ID[id];
}

export function dtRegionForChapter(chapterId: string): DtMapRegion | undefined {
  return REGION_BY_CHAPTER[chapterId];
}

export function dtChapterNumber(chapterId: string): number {
  const fromRegion = REGION_BY_CHAPTER[chapterId]?.chapter;
  if (fromRegion) return fromRegion;
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  return ch?.chapter ?? 1;
}

export function dtFurthestChapterNumber(
  furthestChapterId: string | null | undefined
): number {
  if (!furthestChapterId) return 1;
  return dtChapterNumber(furthestChapterId);
}

/** Region is enterable if its chapter is at or before furthest march progress. */
export function dtRegionUnlocked(
  region: DtMapRegion,
  furthestChapterId: string | null | undefined
): boolean {
  return region.chapter <= dtFurthestChapterNumber(furthestChapterId);
}

export function dtWorldMapSrc(): string {
  return "/dungeon-tester/maps/wilderland.svg";
}

export function dtLocalMapSrc(localMapId: string): string {
  return `/dungeon-tester/maps/${localMapId}.svg`;
}

/** Progress along the local strip 0–1 from node index within chapter. */
export function dtLocalProgress(
  chapterId: string,
  campaignNodeId: string
): { index: number; total: number; t: number } {
  const ch = CHAPTERS.find((c) => c.id === chapterId);
  const nodes = ch?.nodeIds ?? [];
  const index = Math.max(0, nodes.indexOf(campaignNodeId));
  const total = Math.max(1, nodes.length);
  const t = total <= 1 ? 0 : index / (total - 1);
  return { index, total, t };
}

export function isDtMapReplay(world: Pick<DtWorldSave, "mapReplay">): boolean {
  return !!world.mapReplay;
}

export function enterDtMapReplay(
  world: DtWorldSave,
  regionId: string
): { world: DtWorldSave; message?: string } {
  const region = getDtMapRegion(regionId);
  if (!region) return { world, message: "Unknown region." };
  if (!dtRegionUnlocked(region, world.furthestChapterId)) {
    return { world, message: "That road is still ahead of the march." };
  }
  if (world.battle) {
    return { world, message: "Finish the battle first." };
  }

  const chapter = CHAPTERS.find((c) => c.id === region.chapterId);
  const fromNodeId = chapter?.startNodeId ?? DT_START_NODE_ID;

  // Already replaying this region — just jump to its start.
  const resumeNodeId = world.mapReplay?.resumeNodeId ?? world.campaignNodeId;
  const resumeChapterId = world.mapReplay?.resumeChapterId ?? world.chapterId;

  return {
    world: {
      ...world,
      campaignNodeId: fromNodeId,
      chapterId: region.chapterId,
      mapReplay: {
        regionId: region.id,
        chapterId: region.chapterId,
        fromNodeId,
        resumeNodeId,
        resumeChapterId,
      },
      updatedAt: new Date().toISOString(),
      log: [`Atlas: revisit ${region.name} (no story rewards).`, ...world.log].slice(
        0,
        80
      ),
    },
    message: `Revisiting ${region.name} — practice only.`,
  };
}

export function exitDtMapReplay(
  world: DtWorldSave
): { world: DtWorldSave; message?: string } {
  if (!world.mapReplay) return { world, message: "Already on the live march." };
  if (world.battle) {
    return { world, message: "Finish the battle first." };
  }
  const { resumeNodeId, resumeChapterId } = world.mapReplay;
  return {
    world: {
      ...world,
      campaignNodeId: resumeNodeId || DT_START_NODE_ID,
      chapterId: resumeChapterId || DT_START_CHAPTER_ID,
      mapReplay: null,
      updatedAt: new Date().toISOString(),
      log: ["Back on the live march.", ...world.log].slice(0, 80),
    },
    message: "Returned to the live march.",
  };
}

/** Prefer the save that has marched farther for merge. */
export function preferFurthestChapterId(
  a: string | null | undefined,
  b: string | null | undefined
): string {
  const an = dtFurthestChapterNumber(a);
  const bn = dtFurthestChapterNumber(b);
  if (bn > an) return b || DT_START_CHAPTER_ID;
  return a || DT_START_CHAPTER_ID;
}
