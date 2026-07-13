import { EMPTY_ALIGNMENT } from "./alignment";
import {
  applyCreateKit,
  BLANK_BASE_STATS,
  CREATE_STAT_POOL,
  type CreateKitPicks,
} from "./create";
import { CLASS_DEFS, SLOT_DEFAULTS } from "./players";
import { STARTER_GEAR_BY_CLASS } from "./gear";
import { createEmptyHotbar } from "./hotbar";
import { visitedFlag } from "./journey";
import { STARTER_SKILL_POINTS } from "./skills";
import { START_CHAPTER_ID, START_NODE_ID } from "./story";
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
    encounterEnemyHp: null,
    deckEncounter: null,
    completedSideQuests: [],
    cookedRecipes: [],
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
    dogName: string;
    dogBreed: string;
    statBumps: Partial<Stats>;
    pool?: number;
    kit: CreateKitPicks;
  }
): CharacterSave | { error: string } {
  const pool = opts.pool ?? CREATE_STAT_POOL;
  const base = createBlankCharacter(char.slot, opts.classId);
  const stats = applyPointBuy(BLANK_BASE_STATS, opts.statBumps, pool);
  if (!stats) return { error: "Too many stat points spent." };

  const withKit = applyCreateKit(
    {
      ...base,
      name: opts.name.trim() || base.name,
      stats,
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
  return {
    ...world,
    activeSlot,
    alignment: world.alignment ?? { ...EMPTY_ALIGNMENT },
    campaignNodeId: world.campaignNodeId || START_NODE_ID,
    chapterId: world.chapterId || START_CHAPTER_ID,
    deckEncounter: world.deckEncounter ?? null,
    completedSideQuests: world.completedSideQuests ?? [],
    cookedRecipes: world.cookedRecipes ?? [],
    characters,
  };
}

/**
 * Merge a client POST into the canonical DB save.
 * Non-DM clients only patch their own seat — never rewind campaign progress.
 * DM clients keep any server seat that already sealed a hero (and prefer the
 * richer sealed sheet when both sides claim created).
 */
export function mergeIncomingWorld(
  existing: PartyWorldSave,
  incoming: PartyWorldSave,
  slot: PlayerSlot | null,
  isDm: boolean
): PartyWorldSave {
  if (!isDm && slot) {
    const characters = { ...existing.characters };
    const incomingChar = incoming.characters[slot];
    if (incomingChar) {
      characters[slot] = incomingChar;
    }

    // Joiners may carry a stale campaign snapshot. Only adopt their campaign
    // pointer if they are strictly ahead; otherwise keep the live server run.
    const joinerAhead = (incoming.turnIndex ?? 0) > (existing.turnIndex ?? 0);
    if (!joinerAhead) {
      return normalizeWorld({
        ...existing,
        characters,
        log: incomingChar?.created
          ? [`${incomingChar.name} sealed their hero.`, ...existing.log].slice(0, 80)
          : existing.log,
        updatedAt: new Date().toISOString(),
      });
    }

    return normalizeWorld({
      ...existing,
      activeSlot: incoming.activeSlot,
      turnIndex: incoming.turnIndex,
      campaignNodeId: incoming.campaignNodeId,
      chapterId: incoming.chapterId,
      partyFlags: incoming.partyFlags,
      alignment: incoming.alignment,
      encounterEnemyHp: incoming.encounterEnemyHp,
      deckEncounter: incoming.deckEncounter,
      completedSideQuests: incoming.completedSideQuests,
      cookedRecipes: incoming.cookedRecipes,
      log: incoming.log,
      endingId: incoming.endingId,
      characters,
    });
  }

  // DM (or unknown slot): take incoming campaign state, but never lose a sealed hero.
  const characters = { ...incoming.characters } as Record<PlayerSlot, CharacterSave>;
  for (const s of PLAYER_SLOT_ORDER) {
    const serverChar = existing.characters?.[s];
    const clientChar = incoming.characters?.[s];
    if (!serverChar?.created) continue;
    if (!clientChar?.created) {
      characters[s] = serverChar;
      continue;
    }
    // Both sealed — keep the sheet with more play evidence.
    const serverScore =
      (serverChar.choiceLog?.length ?? 0) + serverChar.xp + serverChar.level * 10;
    const clientScore =
      (clientChar.choiceLog?.length ?? 0) + clientChar.xp + clientChar.level * 10;
    if (serverScore > clientScore) characters[s] = serverChar;
  }

  return normalizeWorld({
    ...incoming,
    characters,
  });
}
