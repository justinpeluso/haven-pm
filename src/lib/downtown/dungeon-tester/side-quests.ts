/**
 * Dungeons and Dogs — atlas side quests (Lost Brothers).
 *
 * Unlock bands map 9 march chapters ≈ campaign quarters:
 *   band 1 → furthest chapter >= 1  (first ~25%)
 *   band 2 → furthest chapter >= 3  (~25–50%)
 *   band 3 → furthest chapter >= 5  (~50–75%)
 *   band 4 → furthest chapter >= 7  (final ~25%)
 *
 * Progress 0–1 (optional) uses the same quarter thresholds: 0, 0.25, 0.5, 0.75.
 * Values in [0, 1) are progress; values >= 1 are chapter numbers (so `1` = ch1).
 */
import questsPack from "../../../../data/dungeon-tester/side-quests.json";
import framesPack from "../../../../data/dungeon-tester/side-quest-frames.json";
import type { DtFrame, DtWorldSave } from "./types";
import { DT_START_CHAPTER_ID, DT_START_NODE_ID } from "./types";

/** Local chapter# parse — avoids importing maps/story (init cycle). */
function furthestChapterNumber(furthestChapterId: string | null | undefined): number {
  if (!furthestChapterId) return 1;
  const m = /ch-0?(\d+)/i.exec(furthestChapterId) || /ch0?(\d+)/i.exec(furthestChapterId);
  if (m) return Math.max(1, Number(m[1]) || 1);
  return 1;
}

export type DtSideQuestBand = 1 | 2 | 3 | 4;

export type DtSideQuest = {
  id: string;
  title: string;
  blurb: string;
  pin: { x: number; y: number };
  /** 1–4 bands: 1 = first 25% of campaign, 2 = 25–50%, etc. */
  unlockBand: DtSideQuestBand;
  startNodeId: string;
  regionHint?: string;
  rewardHint?: string;
};

type QuestsFile = {
  version: number;
  title: string;
  note?: string;
  quests: DtSideQuest[];
};

type FramesFile = {
  version: number;
  title: string;
  note?: string;
  frames: DtFrame[];
};

const questsData = questsPack as QuestsFile;
const framesData = framesPack as FramesFile;

export const DT_SIDE_QUESTS: readonly DtSideQuest[] = questsData.quests;

const QUEST_BY_ID = new Map(DT_SIDE_QUESTS.map((q) => [q.id, q]));
const FRAME_BY_ID = new Map(framesData.frames.map((f) => [f.id, f]));

/** Furthest chapter number required to enter each unlock band. */
export const DT_SIDE_QUEST_BAND_MIN_CHAPTER: Record<DtSideQuestBand, number> = {
  1: 1,
  2: 3,
  3: 5,
  4: 7,
};

/** Progress 0–1 thresholds (9 chapters ≈ equal quarters). */
export const DT_SIDE_QUEST_BAND_MIN_PROGRESS: Record<DtSideQuestBand, number> = {
  1: 0,
  2: 0.25,
  3: 0.5,
  4: 0.75,
};

export const DT_SIDE_QUEST_BAND_LABEL: Record<DtSideQuestBand, string> = {
  1: "Band 1 — early march",
  2: "Band 2 — mid road",
  3: "Band 3 — deep east",
  4: "Band 4 — late war",
};

export function getDtSideQuest(id: string): DtSideQuest | undefined {
  return QUEST_BY_ID.get(id);
}

export function getDtSideQuestFrame(id: string): DtFrame | undefined {
  return FRAME_BY_ID.get(id);
}

/** Main spine first, then side-quest frames (lazy spine import — avoid init cycles). */
export function getPlayableFrame(id: string): DtFrame | undefined {
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./story") as {
      getSpineFrame: (frameId: string) => DtFrame | undefined;
    };
    const spine = mod.getSpineFrame(id);
    if (spine) return spine;
  } catch {
    /* ignore */
  }
  return getDtSideQuestFrame(id);
}

export function listDtSideQuestsForBand(band: DtSideQuestBand): DtSideQuest[] {
  return DT_SIDE_QUESTS.filter((q) => q.unlockBand === band);
}

/**
 * Side quest unlock helper.
 * - Pass furthest chapter number (1–9+), OR
 * - Pass campaign progress in [0, 1) (fraction of march).
 *
 * `v >= 1` is always a chapter number (so `1` = chapter 1, not 100% progress).
 * Band 4 unlocks at chapter >= 7 or progress >= 0.75.
 */
export function dtSideQuestUnlocked(
  quest: Pick<DtSideQuest, "unlockBand">,
  furthestChapterNumberOrProgress: number
): boolean {
  const v = furthestChapterNumberOrProgress;
  if (!Number.isFinite(v) || v < 0) return false;

  const minChapter = DT_SIDE_QUEST_BAND_MIN_CHAPTER[quest.unlockBand];
  const minProgress = DT_SIDE_QUEST_BAND_MIN_PROGRESS[quest.unlockBand];

  // Progress mode: [0, 1) only — avoids colliding with chapter 1.
  if (v < 1) {
    return v >= minProgress;
  }

  return Math.floor(v) >= minChapter;
}

/** Convenience: unlock check from a world save. */
export function dtSideQuestUnlockedForWorld(
  quest: Pick<DtSideQuest, "unlockBand">,
  world: Pick<DtWorldSave, "furthestChapterId">
): boolean {
  return dtSideQuestUnlocked(quest, furthestChapterNumber(world.furthestChapterId));
}

export function isDtSideQuest(world: Pick<DtWorldSave, "sideQuest">): boolean {
  return !!world.sideQuest;
}

/** Pause the live march and walk a side-quest pin. Clears mapReplay. */
export function enterDtSideQuest(
  world: DtWorldSave,
  questId: string
): { world: DtWorldSave; message?: string } {
  const quest = getDtSideQuest(questId);
  if (!quest) return { world, message: "Unknown side quest." };
  if (world.battle) {
    return { world, message: "Finish the battle first." };
  }
  if (!dtSideQuestUnlockedForWorld(quest, world)) {
    return { world, message: "That side job is still ahead of the march." };
  }

  const fromNodeId = quest.startNodeId || DT_START_NODE_ID;
  if (!getDtSideQuestFrame(fromNodeId)) {
    return { world, message: `Missing side-quest start ${fromNodeId}.` };
  }

  // Park live march; if already paused, keep the original resume cursor.
  const resumeNodeId =
    world.sideQuest?.resumeNodeId ??
    world.mapReplay?.resumeNodeId ??
    world.campaignNodeId;
  const resumeChapterId =
    world.sideQuest?.resumeChapterId ??
    world.mapReplay?.resumeChapterId ??
    world.chapterId;

  return {
    world: {
      ...world,
      campaignNodeId: fromNodeId,
      // Keep resume chapter for local-map strip; side frames resolve by node id.
      chapterId: resumeChapterId || world.chapterId,
      mapReplay: null,
      sideQuest: {
        questId: quest.id,
        fromNodeId,
        resumeNodeId,
        resumeChapterId,
      },
      updatedAt: new Date().toISOString(),
      log: [`Side quest: ${quest.title} (main story paused).`, ...world.log].slice(
        0,
        80
      ),
    },
    message: `Side quest — ${quest.title}. Main story paused.`,
  };
}

export function exitDtSideQuest(
  world: DtWorldSave
): { world: DtWorldSave; message?: string } {
  if (!world.sideQuest) return { world, message: "Already on the live march." };
  if (world.battle) {
    return { world, message: "Finish the battle first." };
  }

  const { resumeNodeId, resumeChapterId, questId } = world.sideQuest;
  const quest = getDtSideQuest(questId);
  const doneFlag = `sq-done-${questId}`;
  const frame = getDtSideQuestFrame(world.campaignNodeId);
  const terminal = !!frame && !frame.next && !frame.choices?.length;
  const already = world.completedSideQuests ?? [];
  const shouldComplete =
    (terminal || world.partyFlags?.includes(doneFlag)) &&
    !already.includes(questId);
  const completed = shouldComplete
    ? [questId, ...already].slice(0, 120)
    : already;

  return {
    world: {
      ...world,
      campaignNodeId: resumeNodeId || DT_START_NODE_ID,
      chapterId: resumeChapterId || DT_START_CHAPTER_ID,
      sideQuest: null,
      completedSideQuests: completed,
      updatedAt: new Date().toISOString(),
      log: [
        quest
          ? `Returned to main story from ${quest.title}.`
          : "Returned to the live march.",
        ...world.log,
      ].slice(0, 80),
    },
    message: "Returned to the live march.",
  };
}

export function dtSideQuestStats() {
  return {
    sideQuests: DT_SIDE_QUESTS.length,
    sideQuestFrames: framesData.frames.length,
    byBand: {
      1: listDtSideQuestsForBand(1).length,
      2: listDtSideQuestsForBand(2).length,
      3: listDtSideQuestsForBand(3).length,
      4: listDtSideQuestsForBand(4).length,
    },
  };
}
