import { rollNextEncounterThreshold } from "./battle";
import { EMPTY_ALIGNMENT } from "./alignment";
import { EMPTY_PATHWAY } from "./pathway";
import { applyRaceToStats, RACE_DEFS, type RaceId } from "./races";
import {
  applyCreateKit,
  BLANK_BASE_STATS,
  CREATE_STAT_POOL,
  type CreateKitPicks,
} from "./create";
import { CLASS_DEFS, SLOT_DEFAULTS } from "./players";
import { STARTER_GEAR_BY_CLASS } from "./gear";
import { createEmptyHotbar } from "./hotbar";
import {
  campaignProgressScore,
  chapterIdForWorld,
  preferCampaignProgress,
  unionPartyFlags,
  visitedFlag,
} from "./journey";
import { STARTER_SKILL_POINTS } from "./skills";
import { chapterForNode, START_CHAPTER_ID, START_NODE_ID } from "./story";
import type {
  CharacterSave,
  ClassId,
  PartyWorldSave,
  PlayerSlot,
  Stats,
} from "./types";
import { CLASS_IDS, PLAYER_SLOT_ORDER } from "./types";

function nextSealedSlot(world: PartyWorldSave, current: PlayerSlot): PlayerSlot {
  const sealed = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (sealed.length === 0) {
    const i = PLAYER_SLOT_ORDER.indexOf(current);
    return PLAYER_SLOT_ORDER[(i + 1) % PLAYER_SLOT_ORDER.length]!;
  }
  const from = sealed.indexOf(current);
  if (from < 0) return sealed[0]!;
  return sealed[(from + 1) % sealed.length]!;
}

export const SAVE_KEY = "haven-party-chronicle-v1";
/** Postgres Setting.key for shared multiplayer campaign state. */
export const WORLD_SETTING_KEY = "party_chronicle_world_v1";

function coerceClassId(raw: string | undefined): ClassId {
  if (raw && (CLASS_IDS as readonly string[]).includes(raw)) return raw as ClassId;
  // Legacy paladin → healer
  if (raw === "paladin") return "healer";
  return "warrior";
}

/** Blank sheet — no preset stats, no preloaded hotbar kit. */
export function createBlankCharacter(slot: PlayerSlot, classId?: ClassId): CharacterSave {
  const def = SLOT_DEFAULTS[slot];
  const cls = classId ?? def.suggestedClass;
  const classDef = CLASS_DEFS[cls];
  const starter = STARTER_GEAR_BY_CLASS[cls] ?? STARTER_GEAR_BY_CLASS.warrior!;
  return {
    slot,
    name: def.displayName,
    classId: cls,
    level: 1,
    xp: 0,
    skillPoints: STARTER_SKILL_POINTS,
    stats: { ...BLANK_BASE_STATS },
    hp: classDef.hp,
    maxHp: classDef.hp,
    stamina: classDef.stamina,
    maxStamina: classDef.stamina,
    mana: classDef.mana,
    maxMana: classDef.mana,
    dog: {
      name: def.dogName,
      breed: def.dogBreed,
      bond: 10,
      hp: 20,
      maxHp: 20,
    },
    unlockedNodes: [],
    abilities: [],
    hotbar: createEmptyHotbar(),
    inventory: [...starter],
    equipped: {},
    gold: 25,
    flags: [],
    choiceLog: [],
    created: false,
  };
}

export function createNewWorld(): PartyWorldSave {
  const now = new Date().toISOString();
  const characters = {} as Record<PlayerSlot, CharacterSave>;
  for (const slot of PLAYER_SLOT_ORDER) {
    characters[slot] = createBlankCharacter(slot);
  }
  return {
    version: 1,
    activeSlot: "justin",
    turnIndex: 1,
    campaignNodeId: START_NODE_ID,
    chapterId: START_CHAPTER_ID,
    partyFlags: [visitedFlag(START_CHAPTER_ID)],
    alignment: { ...EMPTY_ALIGNMENT },
    pathway: { ...EMPTY_PATHWAY },
    encounterEnemyHp: null,
    deckEncounter: null,
    battle: null,
    storyPlayMs: 0,
    battlesFought: 0,
    nextEncounterAtMs: rollNextEncounterThreshold(0),
    completedSideQuests: [],
    activeSideQuest: null,
    cookedRecipes: [],
    campSleeps: [],
    explore: null,
    log: ["Neverworld unrolls. Justin's turn begins."],
    endingId: null,
    characters,
    startedAt: now,
    updatedAt: now,
  };
}

export function loadWorld(): PartyWorldSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as PartyWorldSave;
    if (parsed?.version !== 1) return null;
    if (!parsed.alignment) {
      parsed.alignment = { ...EMPTY_ALIGNMENT };
    }
    return normalizeWorld(parsed);
  } catch {
    return null;
  }
}

export function writeWorld(world: PartyWorldSave): void {
  if (typeof window === "undefined") return;
  const next = { ...world, updatedAt: new Date().toISOString() };
  localStorage.setItem(SAVE_KEY, JSON.stringify(next));
}

export function clearWorld(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(SAVE_KEY);
}

/** True when a campaign has real progress worth continuing. */
export function worldHasProgress(world: PartyWorldSave | null | undefined): boolean {
  if (!world) return false;
  if (PLAYER_SLOT_ORDER.some((s) => world.characters?.[s]?.created)) return true;
  if ((world.turnIndex ?? 0) > 1) return true;
  if (world.campaignNodeId && world.campaignNodeId !== START_NODE_ID) return true;
  if ((world.partyFlags?.length ?? 0) > 0) return true;
  if (world.endingId) return true;
  return false;
}

/** Prefer the richer of two saves (characters created, then turn, then updatedAt). */
export function pickRicherWorld(
  a: PartyWorldSave | null,
  b: PartyWorldSave | null
): PartyWorldSave | null {
  if (!a) return b;
  if (!b) return a;
  const aCreated = PLAYER_SLOT_ORDER.filter((s) => a.characters[s]?.created).length;
  const bCreated = PLAYER_SLOT_ORDER.filter((s) => b.characters[s]?.created).length;
  if (aCreated !== bCreated) return aCreated > bCreated ? a : b;
  if (a.turnIndex !== b.turnIndex) return a.turnIndex > b.turnIndex ? a : b;
  const aAt = Date.parse(a.updatedAt || a.startedAt || "") || 0;
  const bAt = Date.parse(b.updatedAt || b.startedAt || "") || 0;
  return aAt >= bAt ? a : b;
}

export function saveSummary(world: PartyWorldSave): string {
  const created = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created)
    .map((s) => world.characters[s].name)
    .join(", ");
  const ch = world.chapterId?.replace(/^ch\d+-/, "") ?? "campaign";
  const when = world.updatedAt ? new Date(world.updatedAt).toLocaleString() : "unknown";
  return `${created || "No heroes yet"} · ${ch} · turn ${world.turnIndex} · saved ${when}`;
}

export function applyPointBuy(base: Stats, bumps: Partial<Stats>, pool: number): Stats | null {
  let spent = 0;
  const out = { ...base };
  for (const k of Object.keys(bumps) as (keyof Stats)[]) {
    const add = bumps[k] ?? 0;
    if (add < 0) return null;
    spent += add;
    out[k] = Math.min(20, base[k] + add);
  }
  if (spent > pool) return null;
  return out;
}

export function completeCharacterCreation(
  char: CharacterSave,
  opts: {
    name: string;
    classId: ClassId;
    raceId?: RaceId;
    dogName: string;
    dogBreed: string;
    statBumps: Partial<Stats>;
    pool?: number;
    kit: CreateKitPicks;
  }
): CharacterSave | { error: string } {
  const pool = opts.pool ?? CREATE_STAT_POOL;
  const raceId = opts.raceId ?? "human";
  const race = RACE_DEFS[raceId];
  const base = createBlankCharacter(char.slot, opts.classId);
  const bought = applyPointBuy(BLANK_BASE_STATS, opts.statBumps, pool);
  if (!bought) return { error: "Too many stat points spent." };
  const stats = applyRaceToStats(bought, raceId);

  const withKit = applyCreateKit(
    {
      ...base,
      name: opts.name.trim() || base.name,
      raceId,
      stats,
      hp: base.hp + race.hpBonus,
      maxHp: base.maxHp + race.hpBonus,
      mana: Math.max(0, base.mana + race.manaBonus),
      maxMana: Math.max(0, base.maxMana + race.manaBonus),
      dog: {
        ...base.dog,
        name: opts.dogName.trim() || base.dog.name,
        breed: opts.dogBreed.trim() || base.dog.breed,
      },
    },
    opts.kit
  );
  if ("error" in withKit) return withKit;

  return { ...withKit, created: true };
}

export function normalizeWorld(world: PartyWorldSave): PartyWorldSave {
  const characters = { ...world.characters } as Record<PlayerSlot, CharacterSave>;
  for (const slot of PLAYER_SLOT_ORDER) {
    if (!characters[slot]) {
      characters[slot] = createBlankCharacter(slot);
      continue;
    }
    const c = characters[slot];
    const classId = coerceClassId(c.classId as string);
    let next = classId !== c.classId ? { ...c, classId } : c;
    if (!next.hotbar || next.hotbar.length < 3) {
      next = { ...next, hotbar: createEmptyHotbar() };
    }
    characters[slot] = next;
  }
  let activeSlot = world.activeSlot;
  const withChars = { ...world, characters };
  if (!characters[activeSlot]?.created) {
    activeSlot = nextSealedSlot(withChars, activeSlot);
  }
  const campaignNodeId = world.campaignNodeId || START_NODE_ID;
  // Keep map pin aligned with the live story node (spine/authored).
  const chapterId =
    chapterForNode(campaignNodeId)?.id ?? world.chapterId ?? START_CHAPTER_ID;
  return {
    ...world,
    activeSlot,
    alignment: world.alignment ?? { ...EMPTY_ALIGNMENT },
    pathway: world.pathway ?? { ...EMPTY_PATHWAY },
    campaignNodeId,
    chapterId,
    deckEncounter: world.deckEncounter ?? null,
    battle: world.battle ?? null,
    storyPlayMs: world.storyPlayMs ?? 0,
    battlesFought: world.battlesFought ?? 0,
    nextEncounterAtMs:
      world.nextEncounterAtMs ??
      (world.storyPlayMs ?? 0) + rollNextEncounterThreshold(world.battlesFought ?? 0),
    completedSideQuests: world.completedSideQuests ?? [],
    activeSideQuest: world.activeSideQuest ?? null,
    cookedRecipes: world.cookedRecipes ?? [],
    campSleeps: world.campSleeps ?? [],
    explore: world.explore ?? null,
    characters,
  };
}

/**
 * Prefer farther overworld progress so poll/POST never rewind the map pin.
 */
export function preferExploreState(
  existing: PartyWorldSave["explore"],
  incoming: PartyWorldSave["explore"]
): PartyWorldSave["explore"] {
  if (!existing) return incoming ?? null;
  if (!incoming) return existing;
  const eMoves = existing.moves ?? 0;
  const iMoves = incoming.moves ?? 0;
  if (iMoves > eMoves) return incoming;
  if (eMoves > iMoves) return existing;
  if (incoming.pendingWanderer && !existing.pendingWanderer) return incoming;
  if (existing.pendingWanderer && !incoming.pendingWanderer) return existing;
  if (incoming.x !== existing.x || incoming.y !== existing.y) return incoming;
  return incoming;
}

/**
 * Prefer the fresher battle overlay so non-DM turns persist without turnIndex bumps.
 * Active/summary beats null; same id prefers more progress; else newer startedAt.
 */
export function preferBattleState(
  existing: PartyWorldSave["battle"],
  incoming: PartyWorldSave["battle"],
  opts?: { existingUpdatedAt?: string; incomingUpdatedAt?: string }
): PartyWorldSave["battle"] {
  if (!existing) return incoming ?? null;
  if (!incoming) {
    // Never drop an active fight from a stale null snapshot.
    if (existing.status === "active") return existing;
    const eAt = Date.parse(opts?.existingUpdatedAt || "") || 0;
    const iAt = Date.parse(opts?.incomingUpdatedAt || "") || 0;
    // Allow dismiss of summary when incoming is at least as new.
    if (iAt >= eAt) return null;
    return existing;
  }

  if (existing.id === incoming.id) {
    if (existing.status === "active" && incoming.status !== "active") return incoming;
    if (incoming.status === "active" && existing.status !== "active") return existing;
    if (incoming.stats.turns !== existing.stats.turns) {
      return incoming.stats.turns > existing.stats.turns ? incoming : existing;
    }
    if (incoming.stats.damageDealt !== existing.stats.damageDealt) {
      return incoming.stats.damageDealt > existing.stats.damageDealt ? incoming : existing;
    }
    if (incoming.enemy.hp !== existing.enemy.hp) {
      return incoming.enemy.hp < existing.enemy.hp ? incoming : existing;
    }
    return incoming;
  }

  const eStart = Date.parse(existing.startedAt || "") || 0;
  const iStart = Date.parse(incoming.startedAt || "") || 0;
  if (iStart !== eStart) return iStart > eStart ? incoming : existing;
  if (incoming.status === "active" && existing.status !== "active") return incoming;
  if (existing.status === "active" && incoming.status !== "active") return existing;
  return incoming;
}

/**
 * Merge ambush clocks — prefer higher battlesFought, else higher storyPlayMs.
 * Never let a stale poll/POST rewind eligible play time when fight counts match.
 */
export function preferAmbushClocks(
  existing: PartyWorldSave,
  incoming: PartyWorldSave
): Pick<PartyWorldSave, "storyPlayMs" | "battlesFought" | "nextEncounterAtMs"> {
  const eFought = existing.battlesFought ?? 0;
  const iFought = incoming.battlesFought ?? 0;
  const eMs = existing.storyPlayMs ?? 0;
  const iMs = incoming.storyPlayMs ?? 0;
  if (iFought > eFought) {
    const storyPlayMs = Math.max(iMs, eMs);
    return {
      battlesFought: iFought,
      storyPlayMs,
      nextEncounterAtMs:
        incoming.nextEncounterAtMs ??
        existing.nextEncounterAtMs ??
        storyPlayMs + rollNextEncounterThreshold(iFought),
    };
  }
  if (eFought > iFought) {
    const storyPlayMs = Math.max(eMs, iMs);
    return {
      battlesFought: eFought,
      storyPlayMs,
      nextEncounterAtMs:
        existing.nextEncounterAtMs ??
        incoming.nextEncounterAtMs ??
        storyPlayMs + rollNextEncounterThreshold(eFought),
    };
  }
  if (iMs > eMs) {
    return {
      battlesFought: eFought,
      storyPlayMs: iMs,
      nextEncounterAtMs: incoming.nextEncounterAtMs ?? existing.nextEncounterAtMs ?? iMs,
    };
  }
  if (eMs > iMs) {
    return {
      battlesFought: eFought,
      storyPlayMs: eMs,
      nextEncounterAtMs: existing.nextEncounterAtMs ?? incoming.nextEncounterAtMs ?? eMs,
    };
  }
  // Equal progress — keep the sooner scheduled ambush when both sides have one.
  const eNext = existing.nextEncounterAtMs;
  const iNext = incoming.nextEncounterAtMs;
  let nextEncounterAtMs = eNext ?? iNext ?? eMs;
  if (eNext != null && iNext != null) nextEncounterAtMs = Math.min(eNext, iNext);
  return {
    battlesFought: eFought,
    storyPlayMs: eMs,
    nextEncounterAtMs,
  };
}

/**
 * Prefer the fresher side-quest run so poll/POST races never wipe an active trail.
 * Active beats null; same questId prefers further step progress; else newer startedAt.
 */
export function preferActiveSideQuest(
  existing: PartyWorldSave["activeSideQuest"],
  incoming: PartyWorldSave["activeSideQuest"],
  opts?: { existingUpdatedAt?: string; incomingUpdatedAt?: string }
): PartyWorldSave["activeSideQuest"] {
  if (!existing) return incoming ?? null;
  if (!incoming) {
    const eAt = Date.parse(opts?.existingUpdatedAt || "") || 0;
    const iAt = Date.parse(opts?.incomingUpdatedAt || "") || 0;
    // Fresher null = abandon / dismiss. Older null = stale poll — keep the run.
    if (iAt > eAt) return null;
    if (existing.status === "active") return existing;
    if (iAt >= eAt) return null;
    return existing;
  }

  if (existing.questId === incoming.questId) {
    if (existing.status === "active" && incoming.status !== "active") return incoming;
    if (incoming.status === "active" && existing.status !== "active") return existing;
    if (incoming.stepIndex !== existing.stepIndex) {
      return incoming.stepIndex > existing.stepIndex ? incoming : existing;
    }
    const eDone = existing.steps.filter((s) => s.done || s.battleWon).length;
    const iDone = incoming.steps.filter((s) => s.done || s.battleWon).length;
    if (iDone !== eDone) return iDone > eDone ? incoming : existing;
    return incoming;
  }

  const eStart = Date.parse(existing.startedAt || "") || 0;
  const iStart = Date.parse(incoming.startedAt || "") || 0;
  if (iStart !== eStart) return iStart > eStart ? incoming : existing;
  return incoming;
}

/**
 * Apply battle + ambush clock merge onto a base world (server or local poll).
 * Optionally sync other heroes' vitals from a resolved battle on `incoming`.
 */
export function mergeBattleAndAmbush(
  base: PartyWorldSave,
  incoming: PartyWorldSave,
  actorSlot?: PlayerSlot | null
): PartyWorldSave {
  const battle = preferBattleState(base.battle, incoming.battle, {
    existingUpdatedAt: base.updatedAt,
    incomingUpdatedAt: incoming.updatedAt,
  });
  const clocks = preferAmbushClocks(base, incoming);
  const activeSideQuest = preferActiveSideQuest(base.activeSideQuest, incoming.activeSideQuest, {
    existingUpdatedAt: base.updatedAt,
    incomingUpdatedAt: incoming.updatedAt,
  });
  const explore = preferExploreState(base.explore, incoming.explore);
  const characters = { ...base.characters };

  if (actorSlot && incoming.characters[actorSlot]) {
    characters[actorSlot] = incoming.characters[actorSlot]!;
  }

  // When a fight resolves, pull vitals (and reward-sheet fields) for every hero in it.
  if (battle && battle.status !== "active") {
    for (const h of battle.heroes) {
      const inc = incoming.characters[h.slot];
      if (!inc) continue;
      const cur = characters[h.slot];
      if (!cur) {
        characters[h.slot] = inc;
        continue;
      }
      if (actorSlot && h.slot === actorSlot) {
        characters[h.slot] = inc;
        continue;
      }
      characters[h.slot] = {
        ...cur,
        hp: inc.hp,
        mana: inc.mana,
        maxHp: Math.max(cur.maxHp, inc.maxHp),
        maxMana: Math.max(cur.maxMana, inc.maxMana),
      };
    }
  } else if (battle?.status === "active") {
    // Mid-fight: keep actor sheet from incoming; vitals live on battle.heroes.
  }

  return {
    ...base,
    characters,
    battle,
    activeSideQuest,
    explore,
    ...clocks,
  };
}

/** Campaign + map fields that move with story progress (not seat sheets). */
function takeCampaignSlice(from: PartyWorldSave): Pick<
  PartyWorldSave,
  | "campaignNodeId"
  | "chapterId"
  | "partyFlags"
  | "alignment"
  | "pathway"
  | "encounterEnemyHp"
  | "deckEncounter"
  | "completedSideQuests"
  | "cookedRecipes"
  | "activeSideQuest"
  | "explore"
  | "log"
  | "endingId"
  | "activeSlot"
> {
  return {
    campaignNodeId: from.campaignNodeId,
    chapterId: chapterIdForWorld(from),
    partyFlags: from.partyFlags,
    alignment: from.alignment,
    pathway: from.pathway,
    encounterEnemyHp: from.encounterEnemyHp,
    deckEncounter: from.deckEncounter,
    completedSideQuests: from.completedSideQuests,
    cookedRecipes: from.cookedRecipes,
    activeSideQuest: from.activeSideQuest,
    explore: from.explore,
    log: from.log,
    endingId: from.endingId,
    activeSlot: from.activeSlot,
  };
}

/**
 * Merge a client POST into the canonical DB save.
 * Non-DM clients only patch their own seat — never rewind campaign progress.
 * Narrative Continue advances chapter/node without turnIndex — treat that as ahead.
 * Battle + ambush clocks merge even when turnIndex does not advance.
 * DM clients keep any server seat that already sealed a hero (and prefer the
 * richer sealed sheet when both sides claim created). Never rewind the map.
 */
export function mergeIncomingWorld(
  existing: PartyWorldSave,
  incoming: PartyWorldSave,
  slot: PlayerSlot | null,
  isDm: boolean
): PartyWorldSave {
  if (!isDm && slot) {
    const turnAhead = (incoming.turnIndex ?? 0) > (existing.turnIndex ?? 0);
    const rescuedRoad =
      (incoming.partyFlags ?? []).includes("rescued-from-early-ending") &&
      incoming.endingId == null &&
      !!existing.endingId;
    const campaignAhead =
      rescuedRoad ||
      campaignProgressScore(incoming) > campaignProgressScore(existing);
    const joinerAhead = turnAhead || campaignAhead;

    if (!joinerAhead) {
      const withBattle = mergeBattleAndAmbush(existing, incoming, slot);
      return normalizeWorld({
        ...withBattle,
        partyFlags: unionPartyFlags(existing.partyFlags, incoming.partyFlags),
        log: incoming.characters[slot]?.created && !existing.characters[slot]?.created
          ? [`${incoming.characters[slot]!.name} sealed their hero.`, ...existing.log].slice(0, 80)
          : existing.log,
        updatedAt: new Date().toISOString(),
      });
    }

    const campaign = takeCampaignSlice(preferCampaignProgress(incoming, existing));
    const withBattle = mergeBattleAndAmbush(
      {
        ...existing,
        ...campaign,
        partyFlags: unionPartyFlags(existing.partyFlags, incoming.partyFlags),
        activeSlot: turnAhead || campaignAhead ? incoming.activeSlot : existing.activeSlot,
        turnIndex: Math.max(incoming.turnIndex ?? 0, existing.turnIndex ?? 0),
        // Prefer longer completion lists so side-quest progress isn't lost.
        completedSideQuests:
          (incoming.completedSideQuests?.length ?? 0) >=
          (existing.completedSideQuests?.length ?? 0)
            ? incoming.completedSideQuests
            : existing.completedSideQuests,
        cookedRecipes:
          (incoming.cookedRecipes?.length ?? 0) >= (existing.cookedRecipes?.length ?? 0)
            ? incoming.cookedRecipes
            : existing.cookedRecipes,
        log: incoming.log?.length ? incoming.log : existing.log,
      },
      incoming,
      slot
    );

    return normalizeWorld({
      ...withBattle,
      updatedAt: new Date().toISOString(),
    });
  }

  // DM (or unknown slot): take the further campaign, but never lose a sealed hero.
  const campaignWinner = preferCampaignProgress(incoming, existing);
  const characters = {
    ...(campaignWinner === incoming ? incoming.characters : existing.characters),
  } as Record<PlayerSlot, CharacterSave>;
  // Overlay the other side's sealed sheets when richer / missing.
  for (const s of PLAYER_SLOT_ORDER) {
    const serverChar = existing.characters?.[s];
    const clientChar = incoming.characters?.[s];
    const preferred = characters[s];
    if (serverChar?.created && !clientChar?.created) {
      characters[s] = serverChar;
      continue;
    }
    if (clientChar?.created && !serverChar?.created) {
      characters[s] = clientChar;
      continue;
    }
    if (!serverChar?.created || !clientChar?.created) continue;
    const serverScore =
      (serverChar.choiceLog?.length ?? 0) + serverChar.xp + serverChar.level * 10;
    const clientScore =
      (clientChar.choiceLog?.length ?? 0) + clientChar.xp + clientChar.level * 10;
    if (serverScore > clientScore) characters[s] = serverChar;
    else if (clientScore > serverScore) characters[s] = clientChar;
    else if (!preferred?.created) characters[s] = clientChar;
  }

  // Still reconcile battle / side quest if DM somehow posts stale null over an
  // active fight or trail from a peer that landed first (rare race).
  const battle = preferBattleState(existing.battle, incoming.battle, {
    existingUpdatedAt: existing.updatedAt,
    incomingUpdatedAt: incoming.updatedAt,
  });
  const clocks = preferAmbushClocks(existing, incoming);
  const activeSideQuest = preferActiveSideQuest(
    existing.activeSideQuest,
    incoming.activeSideQuest,
    {
      existingUpdatedAt: existing.updatedAt,
      incomingUpdatedAt: incoming.updatedAt,
    }
  );
  const explore = preferExploreState(existing.explore, incoming.explore);
  const campaign = takeCampaignSlice(campaignWinner);

  return normalizeWorld({
    ...campaignWinner,
    ...campaign,
    characters,
    battle,
    activeSideQuest,
    explore,
    ...clocks,
    partyFlags: unionPartyFlags(existing.partyFlags, incoming.partyFlags),
    turnIndex: Math.max(existing.turnIndex ?? 0, incoming.turnIndex ?? 0),
    updatedAt: new Date().toISOString(),
  });
}
