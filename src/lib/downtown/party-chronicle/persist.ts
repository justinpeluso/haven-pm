import { EMPTY_ALIGNMENT } from "./alignment";
import { CLASS_DEFS, SLOT_DEFAULTS } from "./players";
import { STARTER_GEAR_BY_CLASS } from "./gear";
import { applyClassStarterSkills, createEmptyHotbar } from "./hotbar";
import { STARTER_SKILL_POINTS } from "./skills";
import { START_CHAPTER_ID, START_NODE_ID } from "./story";
import type {
  CharacterSave,
  ClassId,
  PartyWorldSave,
  PlayerSlot,
  Stats,
} from "./types";
import { PLAYER_SLOT_ORDER } from "./types";

export const SAVE_KEY = "haven-party-chronicle-v1";
/** Postgres Setting.key for shared multiplayer campaign state. */
export const WORLD_SETTING_KEY = "party_chronicle_world_v1";

export function createBlankCharacter(slot: PlayerSlot, classId?: ClassId): CharacterSave {
  const def = SLOT_DEFAULTS[slot];
  const cls = classId ?? def.suggestedClass;
  const classDef = CLASS_DEFS[cls];
  const starter = STARTER_GEAR_BY_CLASS[cls] ?? STARTER_GEAR_BY_CLASS.warrior!;
  const blank: CharacterSave = {
    slot,
    name: def.displayName,
    classId: cls,
    level: 1,
    xp: 0,
    skillPoints: STARTER_SKILL_POINTS,
    stats: { ...classDef.baseStats },
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
  // Pre-load class kit (trees + ≥3 hotbar skills) — still editable before created=true.
  return applyClassStarterSkills(blank, cls);
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
    partyFlags: [],
    alignment: { ...EMPTY_ALIGNMENT },
    encounterEnemyHp: null,
    deckEncounter: null,
    completedSideQuests: [],
    cookedRecipes: [],
    log: ["The Party Chronicle unrolls. Justin's turn begins."],
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
    return parsed;
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
    pool: number;
  }
): CharacterSave | { error: string } {
  const base = createBlankCharacter(char.slot, opts.classId);
  const stats = applyPointBuy(CLASS_DEFS[opts.classId].baseStats, opts.statBumps, opts.pool);
  if (!stats) return { error: "Too many stat points spent." };
  return {
    ...base,
    name: opts.name.trim() || base.name,
    stats,
    dog: {
      ...base.dog,
      name: opts.dogName.trim() || base.dog.name,
      breed: opts.dogBreed.trim() || base.dog.breed,
    },
    created: true,
  };
}

export function normalizeWorld(world: PartyWorldSave): PartyWorldSave {
  const characters = { ...world.characters } as Record<PlayerSlot, CharacterSave>;
  for (const slot of PLAYER_SLOT_ORDER) {
    if (!characters[slot]) characters[slot] = createBlankCharacter(slot);
    if (!characters[slot].hotbar || characters[slot].hotbar.length < 3) {
      characters[slot] = { ...characters[slot], hotbar: createEmptyHotbar() };
    }
  }
  return {
    ...world,
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
 * Non-DM clients only receive redacted co-player sheets on GET; without this merge,
 * their next POST would wipe other characters' inventory, gold, and skills.
 */
export function mergeIncomingWorld(
  existing: PartyWorldSave,
  incoming: PartyWorldSave,
  slot: PlayerSlot | null,
  isDm: boolean
): PartyWorldSave {
  if (isDm || !slot) {
    return normalizeWorld(incoming);
  }

  const characters = { ...existing.characters };
  characters[slot] = incoming.characters[slot];

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
