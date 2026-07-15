import { rollNextEncounterThreshold } from "@/lib/downtown/party-chronicle/battle";
import {
  completeCharacterCreation,
  createBlankCharacter,
} from "@/lib/downtown/party-chronicle/persist";
import type { CreateKitPicks } from "@/lib/downtown/party-chronicle/create";
import type { ClassId, Stats } from "@/lib/downtown/party-chronicle/types";
import type { RaceId } from "@/lib/downtown/party-chronicle/races";
import {
  DT_ENCOUNTER_MAX_FRAMES,
  DT_ENCOUNTER_MIN_FRAMES,
  DT_GAME_ID,
  DT_START_CHAPTER_ID,
  DT_START_NODE_ID,
  PLAYER_SLOT_ORDER,
  type DtWorldSave,
  type PlayerSlot,
  type SimpleBattleState,
} from "./types";

function isSimpleBattleBlob(raw: unknown): raw is SimpleBattleState {
  if (!raw || typeof raw !== "object") return false;
  const b = raw as Record<string, unknown>;
  return (
    (b.status === "active" || b.status === "victory" || b.status === "defeat") &&
    Array.isArray(b.units) &&
    typeof b.mapTheme === "string" &&
    typeof b.round === "number"
  );
}

export const DT_SAVE_KEY = "haven-dungeon-tester-v1";
export const DT_WORLD_SETTING_KEY = "dungeon_tester_world_v1";

export function rollNextEncounterAtFrame(
  framesAdvanced: number,
  rng: () => number = Math.random
): number {
  const span = DT_ENCOUNTER_MAX_FRAMES - DT_ENCOUNTER_MIN_FRAMES + 1;
  const gap = DT_ENCOUNTER_MIN_FRAMES + Math.floor(rng() * span);
  return framesAdvanced + gap;
}

export function createNewDtWorld(): DtWorldSave {
  const now = new Date().toISOString();
  const characters = {} as DtWorldSave["characters"];
  for (const slot of PLAYER_SLOT_ORDER) {
    characters[slot] = createBlankCharacter(slot);
  }
  return {
    version: 1,
    gameId: DT_GAME_ID,
    activeSlot: "justin",
    turnIndex: 1,
    campaignNodeId: DT_START_NODE_ID,
    chapterId: DT_START_CHAPTER_ID,
    framesAdvanced: 0,
    framesSinceEncounter: 0,
    nextEncounterAtFrame: rollNextEncounterAtFrame(0),
    partyFlags: ["ch1-started"],
    characters,
    battle: null,
    storyPlayMs: 0,
    battlesFought: 0,
    nextEncounterAtMs: rollNextEncounterThreshold(0),
    encounterEnemyHp: null,
    deckEncounter: null,
    completedSideQuests: [],
    cookedRecipes: [],
    campSleeps: [],
    explorationFinds: 0,
    lastExploration: null,
    log: ["DungeonTester opens on the Wilderland road. Seal your heroes."],
    endingId: null,
    startedAt: now,
    updatedAt: now,
  };
}

function nextSealedSlot(world: DtWorldSave, current: PlayerSlot): PlayerSlot {
  const sealed = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (!sealed.length) return current;
  const from = sealed.indexOf(current);
  if (from < 0) return sealed[0]!;
  return sealed[(from + 1) % sealed.length]!;
}

export function normalizeDtWorld(raw: unknown): DtWorldSave {
  const base = createNewDtWorld();
  if (!raw || typeof raw !== "object") return base;
  const w = raw as Partial<DtWorldSave>;
  const characters = { ...base.characters };
  for (const slot of PLAYER_SLOT_ORDER) {
    const c = w.characters?.[slot];
    characters[slot] = c ? { ...createBlankCharacter(slot), ...c, slot } : createBlankCharacter(slot);
  }
  let activeSlot = (w.activeSlot as PlayerSlot) || "justin";
  const draft: DtWorldSave = {
    ...base,
    ...w,
    version: 1,
    gameId: DT_GAME_ID,
    characters,
    activeSlot,
    campaignNodeId: w.campaignNodeId || DT_START_NODE_ID,
    chapterId: w.chapterId || DT_START_CHAPTER_ID,
    framesAdvanced: Math.max(0, Number(w.framesAdvanced) || 0),
    framesSinceEncounter: Math.max(0, Number(w.framesSinceEncounter) || 0),
    nextEncounterAtFrame:
      typeof w.nextEncounterAtFrame === "number"
        ? w.nextEncounterAtFrame
        : rollNextEncounterAtFrame(Math.max(0, Number(w.framesAdvanced) || 0)),
    partyFlags: Array.isArray(w.partyFlags) ? w.partyFlags : base.partyFlags,
    // Drop legacy Neverworld tactical battles; keep DT simple battle only.
    battle: isSimpleBattleBlob(w.battle) ? w.battle : null,
    storyPlayMs: Math.max(0, Number(w.storyPlayMs) || 0),
    battlesFought: Math.max(0, Number(w.battlesFought) || 0),
    nextEncounterAtMs: Math.max(0, Number(w.nextEncounterAtMs) || 0),
    encounterEnemyHp: w.encounterEnemyHp ?? null,
    deckEncounter: null,
    completedSideQuests: Array.isArray(w.completedSideQuests)
      ? w.completedSideQuests
      : [],
    cookedRecipes: Array.isArray(w.cookedRecipes) ? w.cookedRecipes : [],
    campSleeps: Array.isArray(w.campSleeps) ? w.campSleeps : [],
    explorationFinds: Math.max(0, Number(w.explorationFinds) || 0),
    lastExploration: w.lastExploration ?? null,
    log: Array.isArray(w.log) ? w.log : base.log,
    endingId: w.endingId ?? null,
    startedAt: w.startedAt || base.startedAt,
    updatedAt: w.updatedAt || new Date().toISOString(),
  };
  if (!draft.characters[activeSlot]?.created) {
    activeSlot = nextSealedSlot(draft, activeSlot);
  }
  return { ...draft, activeSlot };
}

export function sealDtCharacter(
  world: DtWorldSave,
  slot: PlayerSlot,
  opts: {
    name: string;
    classId: ClassId;
    raceId?: RaceId;
    dogName: string;
    dogBreed: string;
    statBumps: Partial<Stats>;
    kit: CreateKitPicks;
  }
): DtWorldSave | { error: string } {
  const base = world.characters[slot];
  const result = completeCharacterCreation(base, opts);
  if ("error" in result) return result;
  const characters = { ...world.characters, [slot]: result };
  return {
    ...world,
    characters,
    updatedAt: new Date().toISOString(),
    log: [`${result.name} sealed for the road.`, ...world.log].slice(0, 80),
  };
}

/** Prefer higher frames / storyPlayMs / sealed counts when merging client ↔ server. */
export function mergeDtWorld(
  existing: DtWorldSave,
  incoming: DtWorldSave,
  editorSlot: PlayerSlot | null,
  isDm: boolean
): DtWorldSave {
  const a = normalizeDtWorld(existing);
  const b = normalizeDtWorld(incoming);

  const characters = { ...a.characters };
  for (const slot of PLAYER_SLOT_ORDER) {
    const ea = a.characters[slot];
    const ib = b.characters[slot];
    if (isDm || editorSlot === slot) {
      // Editor / DM can overwrite their seat (and DM any).
      if (ib?.created || !ea?.created) characters[slot] = ib;
      else characters[slot] = ea;
    } else if (ib?.created && !ea?.created) {
      characters[slot] = ib;
    } else if (ea?.created) {
      characters[slot] = ea;
    } else {
      characters[slot] = ib ?? ea;
    }
  }

  const preferIncoming =
    (b.framesAdvanced ?? 0) > (a.framesAdvanced ?? 0) ||
    ((b.framesAdvanced ?? 0) === (a.framesAdvanced ?? 0) &&
      (b.storyPlayMs ?? 0) >= (a.storyPlayMs ?? 0));

  const base = preferIncoming ? b : a;
  const other = preferIncoming ? a : b;

  // Battles: prefer active battle if either has one; else newer summary.
  let battle = base.battle;
  if (other.battle?.status === "active" && base.battle?.status !== "active") {
    battle = other.battle;
  } else if (base.battle?.status === "active") {
    battle = base.battle;
  } else if (other.battle && !base.battle) {
    battle = other.battle;
  }

  return normalizeDtWorld({
    ...base,
    characters,
    battle,
    partyFlags: Array.from(new Set([...(a.partyFlags ?? []), ...(b.partyFlags ?? [])])),
    storyPlayMs: Math.max(a.storyPlayMs ?? 0, b.storyPlayMs ?? 0),
    battlesFought: Math.max(a.battlesFought ?? 0, b.battlesFought ?? 0),
    framesAdvanced: Math.max(a.framesAdvanced ?? 0, b.framesAdvanced ?? 0),
    framesSinceEncounter: preferIncoming
      ? b.framesSinceEncounter
      : a.framesSinceEncounter,
    nextEncounterAtFrame: Math.max(
      a.nextEncounterAtFrame ?? 0,
      b.nextEncounterAtFrame ?? 0
    ),
    updatedAt: new Date().toISOString(),
  });
}

export function readLocalDtWorld(): DtWorldSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = window.localStorage.getItem(DT_SAVE_KEY);
    if (!raw) return null;
    return normalizeDtWorld(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeLocalDtWorld(world: DtWorldSave): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(
      DT_SAVE_KEY,
      JSON.stringify({ ...world, updatedAt: new Date().toISOString() })
    );
  } catch {
    /* quota */
  }
}

export function clearLocalDtWorld(): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.removeItem(DT_SAVE_KEY);
  } catch {
    /* ignore */
  }
}
