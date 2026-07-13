/**
 * Side quest pool — cooking, animal arcs, gear hunts, hound bonds, private convos.
 * Data pack: data/party-chronicle/side-quests.json
 */

import pack from "../../../../data/party-chronicle/side-quests.json";
import expandedPack from "../../../../data/party-chronicle/side-quests-expanded.json";
import type { AlignmentScores, PlayerSlot } from "./types";

export type SideQuestKind = "animal" | "cooking" | "gear" | "hound" | "private" | "exploration";

export type SideQuestRewards = {
  xp: number;
  gold: number;
  itemIds: string[];
  flagsAdd: string[];
  alignment?: Partial<AlignmentScores>;
  slot?: PlayerSlot;
};

export type SideQuestDef = {
  id: string;
  actId: string;
  chapterId?: string;
  title: string;
  estimatedMinutes: number;
  kind: SideQuestKind;
  summary: string;
  steps: string[];
  rewards: SideQuestRewards;
  artId: string;
  sceneId: string;
  npcId: string | null;
};

const authoredSideQuests = pack.sideQuests as SideQuestDef[];
const expandedSideQuests =
  (expandedPack as { sideQuests?: SideQuestDef[] }).sideQuests ?? [];

// Generated quests extend the catalog; authored quests win any id collision.
export const SIDE_QUESTS: SideQuestDef[] = [
  ...new Map(
    [...expandedSideQuests, ...authoredSideQuests].map((quest) => [quest.id, quest])
  ).values(),
];

export const SIDE_QUEST_BY_ID: Record<string, SideQuestDef> = Object.fromEntries(
  SIDE_QUESTS.map((q) => [q.id, q])
);

export function getSideQuest(id: string): SideQuestDef | undefined {
  return SIDE_QUEST_BY_ID[id];
}

export function sideQuestsForAct(actId: string): SideQuestDef[] {
  return SIDE_QUESTS.filter((q) => q.actId === actId || q.chapterId === actId);
}

export function sideQuestsForChapter(chapterId: string): SideQuestDef[] {
  return SIDE_QUESTS.filter((q) => q.chapterId === chapterId);
}

export function sideQuestHoursSummary(): {
  totalMinutes: number;
  totalHours: number;
  count: number;
} {
  const totalMinutes = SIDE_QUESTS.reduce((s, q) => s + q.estimatedMinutes, 0);
  return {
    totalMinutes,
    totalHours: Math.round((totalMinutes / 60) * 10) / 10,
    count: SIDE_QUESTS.length,
  };
}
