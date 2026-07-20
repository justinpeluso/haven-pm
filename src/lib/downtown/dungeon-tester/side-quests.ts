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
 *
 * Completing a side job (exit while terminal / sq-done) grants a light reward —
 * gold or one DT gear/consumable — mapped from rewardHint where possible.
 */
import questsPack from "../../../../data/dungeon-tester/side-quests.json";
import framesPack from "../../../../data/dungeon-tester/side-quest-frames.json";
import { DT_GEAR_POOLS, getDtGear } from "./gear";
import { dtFillEmptyEquipSlots } from "./loadout";
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

/** Light reward rolled when a side job is first completed. */
export type DtSideQuestRewardGrant = {
  gold: number;
  itemId: string | null;
  itemName: string | null;
  /** Short label for UI — e.g. "18g" or "Dust Poultice". */
  claimLabel: string;
  flavor: string;
  message: string;
};

type HintMapRule = {
  re: RegExp;
  itemIds?: string[];
  preferGold?: boolean;
};

/** Map rewardHint flavor → real DT gear ids (or gold). First match wins. */
const REWARD_HINT_RULES: HintMapRule[] = [
  { re: /cleaver/i, itemIds: ["dt-orc-cleaver", "dt-bone-drum-cleaver", "dt-iron-hatchet"] },
  { re: /knife|paring|saber|blade/i, itemIds: ["dt-iron-hatchet", "dt-moonsteel-saber"] },
  {
    re: /stim|ampule|vial|flask|poultice|cider|pale-?lite|fog ampule|biolume/i,
    itemIds: ["dt-dust-poultice", "dt-greater-poultice", "dt-mana-cider", "dt-trail-jerky"],
  },
  { re: /tooth|fang|canine/i, itemIds: ["dt-warg-fang-charm"] },
  {
    re: /bolt|shot|plasma|carbine|revolver|bow/i,
    itemIds: ["dt-frontier-revolver", "dt-ranch-carbine", "dt-yew-shortbow", "dt-ashwood-longbow"],
  },
  { re: /knuckle|wrap|gauntlet|glove/i, itemIds: ["dt-work-gloves", "dt-liberation-gauntlets"] },
  { re: /scale|greaves|boot/i, itemIds: ["dt-ridge-scale-greaves", "dt-spur-boots", "dt-mist-striders"] },
  { re: /fur|jerky|dog/i, itemIds: ["dt-trail-jerky", "dt-warg-fang-charm"] },
  { re: /whip|coil|rope|wire|string|mandolin/i, itemIds: ["dt-stock-whip", "dt-chain-scarf"] },
  {
    re: /spur|charm|token|badge|ring|scar|plate|bead|lens|shard|nail|keycard|chip|dial|tattoo|collar/i,
    itemIds: ["dt-copper-spur", "dt-chain-scarf", "dt-warg-fang-charm"],
  },
  { re: /purse|coin|scrap chrome|crate of stims|pit purse/i, preferGold: true },
  { re: /memo|pamphlet|ash|paper|slate|fragment|callsign/i, preferGold: true },
];

const LIGHT_FALLBACK_IDS = [
  ...(DT_GEAR_POOLS.trash ?? []),
  ...(DT_GEAR_POOLS.common ?? []),
].filter((id, i, arr) => arr.indexOf(id) === i);

function hashSeed(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function goldForBand(band: DtSideQuestBand, rng: () => number): number {
  const base = { 1: 12, 2: 18, 3: 26, 4: 36 }[band];
  const spread = { 1: 8, 2: 10, 3: 12, 4: 14 }[band];
  return base + Math.floor(rng() * (spread + 1));
}

function pickMappedItem(
  candidates: string[],
  owned: Set<string>,
  rng: () => number
): string | null {
  const fresh = candidates.filter((id) => {
    const g = getDtGear(id);
    if (!g) return false;
    // Consumables may stack; unique gear prefers unowned.
    if (g.slot === "consumable") return true;
    return !owned.has(id);
  });
  const pool = fresh.length ? fresh : candidates.filter((id) => getDtGear(id));
  if (!pool.length) return null;
  return pool[Math.floor(rng() * pool.length)] ?? null;
}

/**
 * Deterministic light reward for a side quest (preview matches grant).
 * Does not mutate the world.
 */
export function resolveDtSideQuestReward(
  quest: Pick<DtSideQuest, "id" | "unlockBand" | "rewardHint" | "title">,
  world: Pick<DtWorldSave, "activeSlot" | "characters" | "turnIndex">
): DtSideQuestRewardGrant {
  const flavor = quest.rewardHint?.trim() || "Trail scrap and a quieter debt.";
  const rng = mulberry32(
    hashSeed(`${quest.id}:${world.activeSlot}:${world.turnIndex}`)
  );
  const slot = world.activeSlot;
  const char = world.characters[slot];
  const owned = new Set(char?.inventory ?? []);

  let preferGold = false;
  let mappedIds: string[] | undefined;
  for (const rule of REWARD_HINT_RULES) {
    if (!rule.re.test(flavor)) continue;
    if (rule.preferGold) preferGold = true;
    if (rule.itemIds?.length) mappedIds = rule.itemIds;
    break;
  }

  const wantItem = !preferGold && rng() < (mappedIds?.length ? 0.72 : 0.45);
  let itemId: string | null = null;
  if (wantItem) {
    if (mappedIds?.length) {
      itemId = pickMappedItem(mappedIds, owned, rng);
    }
    if (!itemId) {
      itemId = pickMappedItem(LIGHT_FALLBACK_IDS, owned, rng);
    }
  }

  const gold = itemId ? 0 : goldForBand(quest.unlockBand, rng);
  const itemName = itemId ? getDtGear(itemId)?.name ?? itemId : null;
  const claimLabel = itemId ? itemName! : `${gold}g`;
  const flavorClean = flavor.replace(/[.!?]+\s*$/, "");
  const message = `Side job done — claimed ${claimLabel}${
    flavorClean ? ` (${flavorClean})` : ""
  }.`;

  return { gold, itemId, itemName, claimLabel, flavor, message };
}

/** Apply a resolved side-quest reward to the active hero. */
export function applyDtSideQuestReward(
  world: DtWorldSave,
  reward: DtSideQuestRewardGrant
): DtWorldSave {
  const slot = world.activeSlot;
  const char = world.characters[slot];
  if (!char?.created) return world;

  let next = { ...char, gold: (char.gold ?? 0) + (reward.gold || 0) };
  if (reward.itemId) {
    const g = getDtGear(reward.itemId);
    const inv = [...(next.inventory ?? [])];
    if (g?.slot === "consumable" || !inv.includes(reward.itemId)) {
      inv.push(reward.itemId);
    }
    next = dtFillEmptyEquipSlots({ ...next, inventory: inv });
  }

  return {
    ...world,
    characters: { ...world.characters, [slot]: next },
  };
}

/** True when the current side-quest frame is a terminal complete beat. */
export function isDtSideQuestTerminal(
  world: Pick<DtWorldSave, "sideQuest" | "campaignNodeId" | "partyFlags">
): boolean {
  if (!world.sideQuest) return false;
  const questId = world.sideQuest.questId;
  const doneFlag = `sq-done-${questId}`;
  const frame = getDtSideQuestFrame(world.campaignNodeId);
  const terminal = !!frame && !frame.next && !frame.choices?.length;
  return terminal || !!(world.partyFlags?.includes(doneFlag));
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
): { world: DtWorldSave; message?: string; reward?: DtSideQuestRewardGrant } {
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

  // Light reward only on first completion — does not touch furthest / resume.
  const reward =
    shouldComplete && quest
      ? resolveDtSideQuestReward(quest, world)
      : undefined;
  const rewardedWorld = reward ? applyDtSideQuestReward(world, reward) : world;

  const returnLine = quest
    ? `Returned to main story from ${quest.title}.`
    : "Returned to the live march.";
  const logHead = reward ? [reward.message, returnLine] : [returnLine];

  return {
    world: {
      ...rewardedWorld,
      campaignNodeId: resumeNodeId || DT_START_NODE_ID,
      chapterId: resumeChapterId || DT_START_CHAPTER_ID,
      // Furthest march markers stay parked — only resume cursor restores.
      sideQuest: null,
      completedSideQuests: completed,
      updatedAt: new Date().toISOString(),
      log: [...logHead, ...rewardedWorld.log].slice(0, 80),
    },
    message: reward?.message ?? "Returned to the live march.",
    reward,
  };
}

/**
 * Wipe while on a side job — return to resume march without completing or rewarding.
 * Allowed while a defeat summary battle is still open.
 */
export function failDtSideQuest(world: DtWorldSave): {
  world: DtWorldSave;
  message: string;
} {
  if (!world.sideQuest) {
    return { world, message: "Already on the live march." };
  }
  const { resumeNodeId, resumeChapterId, questId } = world.sideQuest;
  const quest = getDtSideQuest(questId);
  const line = quest
    ? `The job went cold — ${quest.title}. Back on the march.`
    : "The job went cold. Back on the march.";
  return {
    world: {
      ...world,
      campaignNodeId: resumeNodeId || DT_START_NODE_ID,
      chapterId: resumeChapterId || DT_START_CHAPTER_ID,
      sideQuest: null,
      // completedSideQuests untouched — wipe is not a clear.
      updatedAt: new Date().toISOString(),
      log: [line, ...world.log].slice(0, 80),
    },
    message: line,
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
