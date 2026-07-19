import { rollNextEncounterThreshold } from "@/lib/downtown/party-chronicle/battle";
import {
  completeCharacterCreation,
  createBlankCharacter,
} from "@/lib/downtown/party-chronicle/persist";
import type { CreateKitPicks } from "@/lib/downtown/party-chronicle/create";
import type { CharacterSave, ClassId, Stats } from "@/lib/downtown/party-chronicle/types";
import type { RaceId } from "@/lib/downtown/party-chronicle/races";
import { DT_STARTER_LOADOUT } from "./gear";
import { dtFillEmptyEquipSlots } from "./loadout";
import { normalizeDtHeroLook, type DtHeroLook } from "./look";
import { preferFurthestChapterId } from "./maps";
import {
  ensureSimpleBattleSplashConsistency,
  mergeSimpleBattle,
} from "./simple-battle";
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

function normalizeBattle(raw: unknown): SimpleBattleState | null {
  if (!isSimpleBattleBlob(raw)) return null;
  // Mid-fight loads (round≥2 / combat log / enemy phase) stamp splashDone so
  // remounts never restart START BATTLE.
  return ensureSimpleBattleSplashConsistency(raw);
}

/** Save slots — each holds an independent Wilderland campaign world. */
export const DT_SLOT_IDS = ["1", "2", "3"] as const;
export type DtSaveSlotId = (typeof DT_SLOT_IDS)[number];

export const DT_DEFAULT_SLOT_ID: DtSaveSlotId = "1";

/** Legacy single-world Setting key (migrated → slot 1). */
export const DT_LEGACY_WORLD_SETTING_KEY = "dungeon_tester_world_v1";
/** @deprecated Prefer dtWorldSettingKey(slotId). Kept for import compatibility. */
export const DT_WORLD_SETTING_KEY = DT_LEGACY_WORLD_SETTING_KEY;

export function dtWorldSettingKey(slotId: DtSaveSlotId): string {
  return `dungeon_tester_world_slot_${slotId}`;
}

export function isDtSaveSlotId(raw: unknown): raw is DtSaveSlotId {
  return typeof raw === "string" && (DT_SLOT_IDS as readonly string[]).includes(raw);
}

export function parseDtSaveSlotId(raw: unknown): DtSaveSlotId {
  return isDtSaveSlotId(raw) ? raw : DT_DEFAULT_SLOT_ID;
}

/** Legacy localStorage key (migrated → slot 1). */
export const DT_LEGACY_SAVE_KEY = "haven-dungeon-tester-v1";
/** @deprecated Prefer dtLocalSaveKey(slotId). */
export const DT_SAVE_KEY = DT_LEGACY_SAVE_KEY;

export const DT_ACTIVE_SLOT_KEY = "haven-dungeon-tester-active-slot";

export function dtLocalSaveKey(slotId: DtSaveSlotId): string {
  return `haven-dungeon-tester-v1-slot-${slotId}`;
}

export function slotLabel(slotId: DtSaveSlotId): string {
  return `Slot ${slotId}`;
}

export type DtSlotSummary = {
  id: DtSaveSlotId;
  label: string;
  hasSave: boolean;
  sealedCount: number;
  heroNames: string[];
  framesAdvanced: number;
  storyPlayMs: number;
  chapterId: string | null;
  updatedAt: string | null;
  startedAt: string | null;
};

export function summarizeDtWorld(
  slotId: DtSaveSlotId,
  world: DtWorldSave | null
): DtSlotSummary {
  if (!world) {
    return {
      id: slotId,
      label: slotLabel(slotId),
      hasSave: false,
      sealedCount: 0,
      heroNames: [],
      framesAdvanced: 0,
      storyPlayMs: 0,
      chapterId: null,
      updatedAt: null,
      startedAt: null,
    };
  }
  const heroNames = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created).map(
    (s) => world.characters[s]!.name
  );
  return {
    id: slotId,
    label: slotLabel(slotId),
    hasSave: true,
    sealedCount: heroNames.length,
    heroNames,
    framesAdvanced: world.framesAdvanced ?? 0,
    storyPlayMs: world.storyPlayMs ?? 0,
    chapterId: world.chapterId ?? null,
    updatedAt: world.updatedAt ?? null,
    startedAt: world.startedAt ?? null,
  };
}

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
    furthestChapterId: DT_START_CHAPTER_ID,
    furthestCampaignNodeId: DT_START_NODE_ID,
    mapReplay: null,
    framesAdvanced: 0,
    framesSinceEncounter: 0,
    nextEncounterAtFrame: rollNextEncounterAtFrame(0),
    partyFlags: ["ch1-started"],
    characters,
    battle: null,
    clearedBattleId: null,
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
    log: ["Dungeons and Dogs opens in the amnesia woods. Seal your heroes."],
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
    furthestChapterId:
      (typeof w.furthestChapterId === "string" && w.furthestChapterId) ||
      w.chapterId ||
      DT_START_CHAPTER_ID,
    furthestCampaignNodeId:
      (typeof w.furthestCampaignNodeId === "string" && w.furthestCampaignNodeId) ||
      w.campaignNodeId ||
      DT_START_NODE_ID,
    mapReplay: (() => {
      if (!w.mapReplay || typeof w.mapReplay !== "object") return null;
      const raw = w.mapReplay as {
        regionId?: string;
        chapterId?: string;
        fromNodeId?: string;
        resumeNodeId?: string;
        resumeChapterId?: string;
      };
      const regionId = String(raw.regionId ?? "");
      if (!regionId) return null;
      return {
        regionId,
        chapterId: String(raw.chapterId ?? w.chapterId ?? DT_START_CHAPTER_ID),
        fromNodeId: String(raw.fromNodeId ?? w.campaignNodeId ?? DT_START_NODE_ID),
        resumeNodeId: String(
          raw.resumeNodeId ?? w.campaignNodeId ?? DT_START_NODE_ID
        ),
        resumeChapterId: String(
          raw.resumeChapterId ?? w.chapterId ?? DT_START_CHAPTER_ID
        ),
      };
    })(),
    framesAdvanced: Math.max(0, Number(w.framesAdvanced) || 0),
    framesSinceEncounter: Math.max(0, Number(w.framesSinceEncounter) || 0),
    nextEncounterAtFrame:
      typeof w.nextEncounterAtFrame === "number"
        ? w.nextEncounterAtFrame
        : rollNextEncounterAtFrame(Math.max(0, Number(w.framesAdvanced) || 0)),
    partyFlags: Array.isArray(w.partyFlags) ? w.partyFlags : base.partyFlags,
    // Drop legacy Neverworld tactical battles; keep DT simple battle only.
    // ensureSimpleBattleSplashConsistency stamps splashDone for mid-fight loads.
    battle: normalizeBattle(w.battle),
    clearedBattleId:
      typeof w.clearedBattleId === "string" ? w.clearedBattleId : w.clearedBattleId === null ? null : undefined,
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
    /** Frontier look — required for new seals so battle art isn’t a class comic plate. */
    look?: DtHeroLook;
  }
): DtWorldSave | { error: string } {
  const base = world.characters[slot];
  const result = completeCharacterCreation(base, opts);
  if ("error" in result) return result;

  // Blend frontier kit onto create picks; fill empty wear slots.
  const inventory = [...result.inventory];
  for (const id of DT_STARTER_LOADOUT) {
    if (!inventory.includes(id)) inventory.push(id);
  }
  const sealed = dtFillEmptyEquipSlots({
    ...result,
    inventory,
    dtLook: normalizeDtHeroLook(opts.look ?? result.dtLook, slot),
  });

  const characters = { ...world.characters, [slot]: sealed };
  return {
    ...world,
    characters,
    updatedAt: new Date().toISOString(),
    log: [`${sealed.name} sealed for the road.`, ...world.log].slice(0, 80),
  };
}

/**
 * Progress score for sealed sheets — Neverworld-style (choices / xp / level).
 * Do NOT include inventory length: consuming potions shrinks the bag and would
 * make a fresh heal look "poorer" than a stale copy, resurrecting the potion.
 */
function sealedSheetScore(c: CharacterSave | null | undefined): number {
  if (!c?.created) return -1;
  return (c.choiceLog?.length ?? 0) + (c.xp ?? 0) + (c.level ?? 1) * 10;
}

function inventoryCounts(inv: string[] | undefined): Map<string, number> {
  const m = new Map<string, number>();
  for (const id of inv ?? []) m.set(id, (m.get(id) ?? 0) + 1);
  return m;
}

/** True when `after.inventory` is a multiset subset of `before.inventory`. */
function inventoryIsSubset(after: string[] | undefined, before: string[] | undefined): boolean {
  const a = inventoryCounts(after);
  const b = inventoryCounts(before);
  for (const [id, n] of a) {
    if ((b.get(id) ?? 0) < n) return false;
  }
  return true;
}

/**
 * Detect "used a consumable / salvaged" relative to an older sheet so merges
 * never resurrect a potion or rewind HP after a local Use.
 */
function isConsumableOrSalvageAdvance(after: CharacterSave, before: CharacterSave): boolean {
  const afterLen = after.inventory?.length ?? 0;
  const beforeLen = before.inventory?.length ?? 0;
  if (afterLen >= beforeLen) return false;
  if (!inventoryIsSubset(after.inventory, before.inventory)) return false;
  const healed =
    after.hp > before.hp ||
    after.mana > before.mana ||
    after.stamina > before.stamina ||
    (after.dog?.hp ?? 0) > (before.dog?.hp ?? 0);
  const salvaged = (after.gold ?? 0) > (before.gold ?? 0);
  return healed || salvaged;
}

/**
 * On equal progress scores, prefer a sheet that clearly consumed/salvaged
 * relative to the other; otherwise honor seatTie bias.
 */
function preferSheetOnTie(
  ea: CharacterSave,
  ib: CharacterSave,
  seatTie: "incoming" | "existing"
): CharacterSave {
  if (isConsumableOrSalvageAdvance(ib, ea)) return ib;
  if (isConsumableOrSalvageAdvance(ea, ib)) return ea;
  return seatTie === "incoming" ? ib : ea;
}

export type MergeDtWorldOpts = {
  /**
   * When progress scores tie for the editor's seat:
   * - `incoming` — server POST (client payload wins over DB)
   * - `existing` — client poll / POST-response (keep local bag/HP while sync races)
   */
  seatTie?: "incoming" | "existing";
};

/** Pick richer campaign progress for client boot (sealed count → frames → playtime → updatedAt). */
export function pickRicherDtWorld(
  a: DtWorldSave | null,
  b: DtWorldSave | null
): DtWorldSave | null {
  if (!a) return b;
  if (!b) return a;
  const aCreated = PLAYER_SLOT_ORDER.filter((s) => a.characters[s]?.created).length;
  const bCreated = PLAYER_SLOT_ORDER.filter((s) => b.characters[s]?.created).length;
  if (aCreated !== bCreated) return aCreated > bCreated ? a : b;
  if ((a.framesAdvanced ?? 0) !== (b.framesAdvanced ?? 0)) {
    return (a.framesAdvanced ?? 0) > (b.framesAdvanced ?? 0) ? a : b;
  }
  if ((a.storyPlayMs ?? 0) !== (b.storyPlayMs ?? 0)) {
    return (a.storyPlayMs ?? 0) > (b.storyPlayMs ?? 0) ? a : b;
  }
  const aAt = Date.parse(a.updatedAt || a.startedAt || "") || 0;
  const bAt = Date.parse(b.updatedAt || b.startedAt || "") || 0;
  return aAt >= bAt ? a : b;
}

/**
 * Prefer higher frames / storyPlayMs when merging client ↔ server.
 * Never wipe a richer sealed sheet (Neverworld-style score).
 * Never resurrect consumables / rewind HP via inventory-length scoring.
 */
export function mergeDtWorld(
  existing: DtWorldSave,
  incoming: DtWorldSave,
  editorSlot: PlayerSlot | null,
  isDm: boolean,
  opts?: MergeDtWorldOpts
): DtWorldSave {
  const seatTie = opts?.seatTie ?? "incoming";
  const a = normalizeDtWorld(existing);
  const b = normalizeDtWorld(incoming);

  const characters = { ...a.characters };
  for (const slot of PLAYER_SLOT_ORDER) {
    const ea = a.characters[slot];
    const ib = b.characters[slot];
    const eaCreated = !!ea?.created;
    const ibCreated = !!ib?.created;

    if (!eaCreated && !ibCreated) {
      characters[slot] = ib ?? ea;
      continue;
    }
    if (eaCreated && !ibCreated) {
      characters[slot] = ea;
      continue;
    }
    if (!eaCreated && ibCreated) {
      characters[slot] = ib;
      continue;
    }

    // Both sealed — prefer richer sheet; editor/DM own-seat ties use seatTie +
    // consumable-aware pick so potion Use cannot be clobbered by a stale peer.
    const scoreA = sealedSheetScore(ea!);
    const scoreB = sealedSheetScore(ib!);
    if (isDm || editorSlot === slot) {
      if (scoreB > scoreA) characters[slot] = ib;
      else if (scoreA > scoreB) characters[slot] = ea;
      else characters[slot] = preferSheetOnTie(ea!, ib!, seatTie);
    } else if (scoreB > scoreA) {
      characters[slot] = ib;
    } else if (scoreA > scoreB) {
      characters[slot] = ea;
    } else {
      characters[slot] = preferSheetOnTie(ea!, ib!, "existing");
    }
  }

  const preferIncoming =
    (b.framesAdvanced ?? 0) > (a.framesAdvanced ?? 0) ||
    ((b.framesAdvanced ?? 0) === (a.framesAdvanced ?? 0) &&
      (b.storyPlayMs ?? 0) >= (a.storyPlayMs ?? 0));

  const base = preferIncoming ? b : a;
  const other = preferIncoming ? a : b;

  // Battles: sticky splashDone + stable id; prefer active; never mint a new fight here.
  // Never resurrect a fight the client already fled/dismissed (clearedBattleId).
  let battle = mergeSimpleBattle(base.battle, other.battle);
  const cleared = base.clearedBattleId || other.clearedBattleId || null;
  if (cleared && battle?.id === cleared) {
    battle = null;
  }

  const campSleeps = [
    ...new Set([...(a.campSleeps ?? []), ...(b.campSleeps ?? [])]),
  ].sort();
  const explorationFinds = Math.max(a.explorationFinds ?? 0, b.explorationFinds ?? 0);
  const lastExploration =
    (a.explorationFinds ?? 0) >= (b.explorationFinds ?? 0)
      ? a.lastExploration ?? b.lastExploration
      : b.lastExploration ?? a.lastExploration;

  return normalizeDtWorld({
    ...base,
    characters,
    battle,
    clearedBattleId: cleared,
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
    furthestChapterId:
      (b.furthestChapterId &&
      preferFurthestChapterId(a.furthestChapterId, b.furthestChapterId) ===
        b.furthestChapterId
        ? b.furthestChapterId
        : a.furthestChapterId) ||
      base.furthestChapterId ||
      DT_START_CHAPTER_ID,
    furthestCampaignNodeId:
      preferFurthestChapterId(a.furthestChapterId, b.furthestChapterId) ===
      (b.furthestChapterId || "")
        ? b.furthestCampaignNodeId || base.furthestCampaignNodeId
        : a.furthestCampaignNodeId || base.furthestCampaignNodeId,
    // Don't carry a peer's mid-replay cursor across devices — prefer live march.
    mapReplay: preferIncoming ? b.mapReplay ?? null : a.mapReplay ?? null,
    campSleeps,
    explorationFinds,
    lastExploration: lastExploration ?? null,
    cookedRecipes: Array.from(
      new Set([...(a.cookedRecipes ?? []), ...(b.cookedRecipes ?? [])])
    ),
    updatedAt: new Date().toISOString(),
  });
}

export function readActiveDtSlotId(): DtSaveSlotId {
  if (typeof window === "undefined") return DT_DEFAULT_SLOT_ID;
  try {
    return parseDtSaveSlotId(window.localStorage.getItem(DT_ACTIVE_SLOT_KEY));
  } catch {
    return DT_DEFAULT_SLOT_ID;
  }
}

export function writeActiveDtSlotId(slotId: DtSaveSlotId): void {
  if (typeof window === "undefined") return;
  try {
    window.localStorage.setItem(DT_ACTIVE_SLOT_KEY, slotId);
  } catch {
    /* quota */
  }
}

function migrateLegacyLocalToSlot1(): void {
  if (typeof window === "undefined") return;
  try {
    const slot1Key = dtLocalSaveKey("1");
    if (window.localStorage.getItem(slot1Key)) return;
    const legacy = window.localStorage.getItem(DT_LEGACY_SAVE_KEY);
    if (!legacy) return;
    window.localStorage.setItem(slot1Key, legacy);
  } catch {
    /* ignore */
  }
}

export function readLocalDtWorld(slotId?: DtSaveSlotId): DtWorldSave | null {
  if (typeof window === "undefined") return null;
  const id = slotId ?? readActiveDtSlotId();
  migrateLegacyLocalToSlot1();
  try {
    const raw = window.localStorage.getItem(dtLocalSaveKey(id));
    if (!raw) return null;
    return normalizeDtWorld(JSON.parse(raw));
  } catch {
    return null;
  }
}

export function writeLocalDtWorld(world: DtWorldSave, slotId?: DtSaveSlotId): void {
  if (typeof window === "undefined") return;
  const id = slotId ?? readActiveDtSlotId();
  try {
    window.localStorage.setItem(
      dtLocalSaveKey(id),
      JSON.stringify({ ...world, updatedAt: new Date().toISOString() })
    );
  } catch {
    /* quota */
  }
}

export function clearLocalDtWorld(slotId?: DtSaveSlotId): void {
  if (typeof window === "undefined") return;
  const id = slotId ?? readActiveDtSlotId();
  try {
    window.localStorage.removeItem(dtLocalSaveKey(id));
  } catch {
    /* ignore */
  }
}

export function listLocalDtSlotSummaries(): DtSlotSummary[] {
  return DT_SLOT_IDS.map((id) => summarizeDtWorld(id, readLocalDtWorld(id)));
}
