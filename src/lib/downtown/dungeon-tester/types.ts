/**
 * DungeonTester save + frame contracts.
 * Party seats reuse Neverworld slots (justin / rusty / elisha / eric).
 */

import type {
  BattleState,
  CharacterSave,
  PartyWorldSave,
  PlayerSlot,
} from "@/lib/downtown/party-chronicle/types";
import { PLAYER_SLOT_ORDER } from "@/lib/downtown/party-chronicle/types";

export { PLAYER_SLOT_ORDER };
export type { CharacterSave, PlayerSlot, BattleState };

export const DT_GAME_ID = "dungeon-tester" as const;
/** Matches data/dungeon-tester/story-spine.json chapter 1. */
export const DT_START_CHAPTER_ID = "dt-ch-01-chain-road";
export const DT_START_NODE_ID = "dt-ch01-001";
/** Target campaign wall-clock for HUD. */
export const DT_TARGET_PLAYTIME_HOURS = 30;
/** Random road encounters fire every N story frames advanced. */
export const DT_ENCOUNTER_MIN_FRAMES = 10;
export const DT_ENCOUNTER_MAX_FRAMES = 20;

export type DtFrameKind = "narrative" | "choice" | "encounter" | "ending";

export type DtStatKey =
  | "strength"
  | "dexterity"
  | "constitution"
  | "intelligence"
  | "wisdom"
  | "charisma";

export type DtFrameChoice = {
  id: string;
  label: string;
  /** Target frame id (reconverges onto shared spine). */
  next: string;
  /** Optional approach line for dusty UI. */
  approach?: string;
  flagsAdd?: string[];
  /** Optional D&D-style check (engine may ignore until wired). */
  stat?: DtStatKey;
  dc?: number;
  /** Fail-branch frame when a check is present. Defaults to `next`. */
  nextFail?: string;
  failFlagsAdd?: string[];
  failDamage?: number;
};

export type DtFrame = {
  id: string;
  chapterId: string;
  title?: string;
  /** 2–3 short sentences for Oregon Trail / comic panel. */
  body: string;
  kind?: DtFrameKind;
  speaker?: string;
  sceneId?: string;
  artId?: string;
  /** Linear continue. Ignored when choices present. */
  next?: string;
  choices?: DtFrameChoice[];
  /** Scripted fight fires when landing on / continuing from this frame. */
  battleFoeId?: string;
  /** Chapter enemy-theme tag (for random decks). */
  enemyTheme?: string;
  flagsAdd?: string[];
  endingId?: string;
};

/**
 * Shared campaign save — party-chronicle character/battle shape + frame ambush clocks.
 * `storyPlayMs` drives the visible ~30h HUD (not battle pressure).
 */
export type DtWorldSave = {
  version: 1;
  gameId: typeof DT_GAME_ID;
  activeSlot: PlayerSlot;
  turnIndex: number;
  campaignNodeId: string;
  chapterId: string;
  framesAdvanced: number;
  framesSinceEncounter: number;
  nextEncounterAtFrame: number;
  partyFlags: string[];
  characters: Record<PlayerSlot, CharacterSave>;
  battle: BattleState | null;
  storyPlayMs: number;
  battlesFought: number;
  /** Kept for PartyWorldSave battle helpers / merge compatibility. */
  nextEncounterAtMs: number;
  encounterEnemyHp: number | null;
  deckEncounter: null;
  log: string[];
  endingId: string | null;
  startedAt: string;
  updatedAt: string;
};

/** Coerce DT save into PartyWorldSave for shared battle/create helpers. */
export function asPartyWorld(world: DtWorldSave): PartyWorldSave {
  return {
    version: 1,
    activeSlot: world.activeSlot,
    turnIndex: world.turnIndex,
    campaignNodeId: world.campaignNodeId,
    chapterId: world.chapterId,
    partyFlags: world.partyFlags,
    alignment: { animal: 0, human: 0, demon: 0 },
    pathway: { giver: 0, taker: 0 },
    encounterEnemyHp: world.encounterEnemyHp,
    deckEncounter: world.deckEncounter,
    battle: world.battle,
    storyPlayMs: world.storyPlayMs,
    battlesFought: world.battlesFought,
    nextEncounterAtMs: world.nextEncounterAtMs,
    completedSideQuests: [],
    activeSideQuest: null,
    cookedRecipes: [],
    explore: null,
    log: world.log,
    endingId: world.endingId,
    startedAt: world.startedAt,
    updatedAt: world.updatedAt,
    characters: world.characters,
  };
}

export function fromPartyWorld(
  party: PartyWorldSave,
  frames: Pick<
    DtWorldSave,
    "framesAdvanced" | "framesSinceEncounter" | "nextEncounterAtFrame"
  > & { gameId?: typeof DT_GAME_ID }
): DtWorldSave {
  return {
    version: 1,
    gameId: DT_GAME_ID,
    activeSlot: party.activeSlot,
    turnIndex: party.turnIndex,
    campaignNodeId: party.campaignNodeId,
    chapterId: party.chapterId,
    framesAdvanced: frames.framesAdvanced,
    framesSinceEncounter: frames.framesSinceEncounter,
    nextEncounterAtFrame: frames.nextEncounterAtFrame,
    partyFlags: party.partyFlags ?? [],
    characters: party.characters,
    battle: party.battle,
    storyPlayMs: party.storyPlayMs ?? 0,
    battlesFought: party.battlesFought ?? 0,
    nextEncounterAtMs: party.nextEncounterAtMs ?? 0,
    encounterEnemyHp: party.encounterEnemyHp ?? null,
    deckEncounter: null,
    log: party.log ?? [],
    endingId: party.endingId,
    startedAt: party.startedAt,
    updatedAt: party.updatedAt,
  };
}
