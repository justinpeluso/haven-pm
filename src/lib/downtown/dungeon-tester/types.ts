/**
 * DungeonTester save + frame contracts.
 * Party seats reuse Neverworld slots (justin / rusty / elisha / eric).
 * Battle is DT-only crude combat (SimpleBattleState) — not Neverworld tactical.
 */

import type {
  BattleState,
  CharacterSave,
  PartyWorldSave,
  PlayerSlot,
} from "@/lib/downtown/party-chronicle/types";
import { PLAYER_SLOT_ORDER } from "@/lib/downtown/party-chronicle/types";
import type { SimpleBattleState } from "./simple-battle";

export { PLAYER_SLOT_ORDER };
export type { CharacterSave, PlayerSlot };
export type { SimpleBattleState };

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
 * Shared campaign save — party-chronicle character/camp shape + DT simple battle + frame clocks.
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
  /** DT crude battle only — never Neverworld BattleState. */
  battle: SimpleBattleState | null;
  /**
   * Last battle.id the client fled/dismissed — poll/server must not resurrect it.
   * Cleared when a new ambush starts.
   */
  clearedBattleId?: string | null;
  storyPlayMs: number;
  battlesFought: number;
  /** Kept for PartyWorldSave camp/merge compatibility. */
  nextEncounterAtMs: number;
  encounterEnemyHp: number | null;
  deckEncounter: null;
  completedSideQuests: string[];
  cookedRecipes: string[];
  campSleeps: string[];
  explorationFinds: number;
  lastExploration: PartyWorldSave["lastExploration"];
  log: string[];
  endingId: string | null;
  startedAt: string;
  updatedAt: string;
};

/** Frame fields that stay on the DT save when round-tripping PartyWorldSave. */
export type DtFrameClock = Pick<
  DtWorldSave,
  "framesAdvanced" | "framesSinceEncounter" | "nextEncounterAtFrame"
>;

/**
 * Coerce DT save into PartyWorldSave for camp / inventory helpers.
 * Battle is a status stub only — Neverworld combat must not run on DT saves.
 */
export function asPartyWorld(world: DtWorldSave): PartyWorldSave {
  const stubBattle =
    world.battle == null
      ? null
      : ({ status: world.battle.status } as BattleState);
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
    battle: stubBattle,
    storyPlayMs: world.storyPlayMs,
    battlesFought: world.battlesFought,
    nextEncounterAtMs: world.nextEncounterAtMs,
    completedSideQuests: world.completedSideQuests ?? [],
    activeSideQuest: null,
    cookedRecipes: world.cookedRecipes ?? [],
    campSleeps: world.campSleeps ?? [],
    explorationFinds: world.explorationFinds ?? 0,
    lastExploration: world.lastExploration ?? null,
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
  frames: DtFrameClock & {
    gameId?: typeof DT_GAME_ID;
    /** Always pass the real DT battle — PartyWorldSave only carries a stub. */
    battle: SimpleBattleState | null;
  }
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
    battle: frames.battle,
    storyPlayMs: party.storyPlayMs ?? 0,
    battlesFought: party.battlesFought ?? 0,
    nextEncounterAtMs: party.nextEncounterAtMs ?? 0,
    encounterEnemyHp: party.encounterEnemyHp ?? null,
    deckEncounter: null,
    completedSideQuests: party.completedSideQuests ?? [],
    cookedRecipes: party.cookedRecipes ?? [],
    campSleeps: party.campSleeps ?? [],
    explorationFinds: party.explorationFinds ?? 0,
    lastExploration: party.lastExploration ?? null,
    log: party.log ?? [],
    endingId: party.endingId,
    startedAt: party.startedAt,
    updatedAt: party.updatedAt,
  };
}

/** Preserve DT frame clocks + simple battle when applying camp/inventory mutations. */
export function applyPartyMutation(
  world: DtWorldSave,
  party: PartyWorldSave
): DtWorldSave {
  return fromPartyWorld(party, {
    framesAdvanced: world.framesAdvanced,
    framesSinceEncounter: world.framesSinceEncounter,
    nextEncounterAtFrame: world.nextEncounterAtFrame,
    battle: world.battle,
  });
}
