/**
 * Neverworld turn-based battle engine — HoMM-style grid tactics.
 * Actions: Move, Attack, Wait, Power Up, Eat, Spell, Drink HP/Mana.
 * Clocks: 30s idle → foe acts; 10 min hard cap → defeat.
 */

import {
  getBattleLootItem,
  getBoss,
  getCreature,
  getSpellbook,
  getSpellbookAbility,
  isSpellbookItem,
  rollBattleLoot,
  rollCreature,
  rollRandomFoe,
  type BossDef,
  type CreatureDef,
} from "./bestiary";
import { getGear } from "./gear";
import { battleArmor, battleAttackPower, battleMaxHp, battleMaxMana, computeEffectiveStats } from "./stats";
import { levelFromXp, skillPointsForLevelGain } from "./progression";
import { battleAbilityRole, getAbility } from "./skills";
import { getStoryNode } from "./story";
import {
  NEVERWORLD_HERITAGE,
  leadingPathway,
  type PathwayScores,
} from "./pathway";
import {
  resolveDefenseRoc,
  resolveRoc,
  rocDamageFromMargin,
  type RocResult,
} from "./roc";
import {
  applyAiMove,
  canSpellStrike,
  canStrike,
  createTacticalState,
  ensureTactical,
  enemyUnitIdForIndex,
  getUnit,
  isEnemyCombatantId,
  isFlanking,
  isPetCombatantId,
  moveUnit,
  nearestEnemyTarget,
  nearestPartyTarget,
  ownerSlotOfPetId,
  petUnitId,
  removeDeadEnemyUnits,
  removeDeadHeroUnits,
  resetPhaseForTurn,
  setPhase,
  spellStrikeRange,
} from "./tactical";
import type {
  BattleActionId,
  BattleClockMode,
  BattleEnemyState,
  BattleFxEvent,
  BattleFxTone,
  BattleLootDrop,
  BattlePetState,
  BattleStatus,
  BattleState,
  BattleSummary,
  CharacterSave,
  PartyWorldSave,
  PlayerSlot,
} from "./types";
import { PLAYER_SLOT_ORDER } from "./types";

export {
  canSpellStrike,
  canStrike,
  ensureTactical,
  getUnit,
  isEnemyCombatantId,
  isFlanking,
  isPetCombatantId,
  legalMoves,
  nearestEnemyTarget,
  ownerSlotOfPetId,
  petUnitId,
  rangeTiles,
  spellStrikeRange,
  threatenedTiles,
  unitAt,
  TACTICAL_COLS,
  TACTICAL_ROWS,
} from "./tactical";

/** Hard cap — every battle ends (defeat) after this. */
export const BATTLE_MAX_MS = 10 * 60 * 1000;
/** If a hero does nothing this long, the foe strikes. */
export const TURN_IDLE_MS = 30 * 1000;
/** 3 → 2 → 1 → BATTLE START (~1s each) before combat unlocks. */
export const BATTLE_INTRO_MS = 4_000;

const POWER_UP_TURNS = 3;
/** Was 1.5 — too swingy with high ATK + ROC severity. */
const POWER_UP_MULT = 1.25;

/**
 * Soft-scale weapon ATK into strike power so legendaries stay special
 * without 200+ one-shots (sqrt curve, then mild power-up).
 */
function combatStrikePower(rawAtk: number, poweredUp: boolean): number {
  // Slightly softer curve so 2× foe packs aren't deleted in one hero round.
  const scaled = 5 + Math.round(Math.pow(Math.max(1, rawAtk), 0.6) * 2.15);
  const mult = poweredUp ? POWER_UP_MULT : 1;
  return Math.max(2, Math.floor(scaled * mult));
}

/** Cap a single hit — packs need multi-hit clears, not one-shots. */
function clampOutgoingDamage(damage: number, enemyMaxHp: number): number {
  if (damage <= 0) return 0;
  const cap = Math.max(12, Math.floor(enemyMaxHp * 0.34));
  return Math.min(damage, cap);
}

/** Random ambush / forced fight size: 2 foes per sealed hero (min 2). */
export function encounterPackSize(sealedHeroCount: number): number {
  return Math.max(2, sealedHeroCount * 2);
}

/** Random road ambushes every 90s of eligible story play time. */
export const AMBUSH_INTERVAL_MS = 90_000;
/** @deprecated Use AMBUSH_INTERVAL_MS — kept for older imports. */
export const FIRST_ENCOUNTER_MIN_MS = AMBUSH_INTERVAL_MS;
/** @deprecated Use AMBUSH_INTERVAL_MS */
export const FIRST_ENCOUNTER_MAX_MS = AMBUSH_INTERVAL_MS;
/** @deprecated Use AMBUSH_INTERVAL_MS */
export const NEXT_ENCOUNTER_MIN_MS = AMBUSH_INTERVAL_MS;
/** @deprecated Use AMBUSH_INTERVAL_MS */
export const NEXT_ENCOUNTER_MAX_MS = AMBUSH_INTERVAL_MS;

export function rollNextEncounterThreshold(
  _battlesFought?: number,
  _rng?: () => number
): number {
  return AMBUSH_INTERVAL_MS;
}

function applyXp(char: CharacterSave, xp: number): CharacterSave {
  const before = char.level;
  const newXp = char.xp + xp;
  const after = levelFromXp(newXp);
  const pts = skillPointsForLevelGain(before, after);
  const hpBump = Math.max(0, after - before) * 2;
  const manaBump = Math.max(0, after - before);
  return {
    ...char,
    xp: newXp,
    level: after,
    skillPoints: char.skillPoints + pts,
    maxHp: char.maxHp + hpBump,
    hp: Math.min(char.maxHp + hpBump, char.hp + hpBump),
    maxMana: char.maxMana + manaBump,
    mana: Math.min(char.maxMana + manaBump, char.mana + manaBump),
  };
}

function partyLevel(world: PartyWorldSave): number {
  const sealed = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (!sealed.length) return 1;
  const sum = sealed.reduce((a, s) => a + world.characters[s].level, 0);
  return Math.max(1, Math.round(sum / sealed.length));
}

function sealedSlots(world: PartyWorldSave): PlayerSlot[] {
  return PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
}

/** Full enemy pack (legacy single-foe → `[enemy]`). */
export function battleEnemyPack(battle: BattleState): BattleEnemyState[] {
  if (battle.enemies?.length) return battle.enemies;
  return [{ ...battle.enemy, unitId: battle.enemy.unitId ?? "enemy" }];
}

export function getEnemyByUnitId(
  battle: BattleState,
  unitId: string
): BattleEnemyState | undefined {
  return battleEnemyPack(battle).find(
    (e, i) => (e.unitId ?? enemyUnitIdForIndex(i)) === unitId
  );
}

function livingEnemies(battle: BattleState): BattleEnemyState[] {
  return battleEnemyPack(battle).filter((e) => e.hp > 0);
}

/** Keep `enemy` mirrored to first living foe (else first) for legacy UI. */
function syncLeadEnemy(battle: BattleState): BattleState {
  const pack = battleEnemyPack(battle);
  const lead = pack.find((e) => e.hp > 0) ?? pack[0]!;
  return { ...battle, enemy: lead, enemies: pack };
}

/**
 * Level-scale bestiary HP/power toward party level within the creature's band,
 * then soften dense packs (2 foes / hero) so total threat stays spicy without
 * wiping the party when 4–8 enemies act in a row.
 *
 * Targets (approx): pack 2 → 90% HP / 88% pow; pack 4 → 78% / 78%; pack 8 → 54% / 58%.
 */
function scaleFoeStats(
  foe: { levelMin: number; levelMax: number; hp: number; power: number; armor: number; xp: number; gold: number },
  partyLvl: number,
  packSize: number
): { hp: number; power: number; armor: number; xp: number; gold: number } {
  const mid = (foe.levelMin + foe.levelMax) / 2;
  const delta = partyLvl - mid;
  const levelHp = 1 + Math.max(-0.25, Math.min(0.55, delta * 0.035));
  const levelPow = 1 + Math.max(-0.2, Math.min(0.45, delta * 0.025));
  const packHp =
    packSize <= 2 ? 0.9 : Math.max(0.5, 0.9 - (packSize - 2) * 0.06);
  const packPow =
    packSize <= 2 ? 0.88 : Math.max(0.55, 0.88 - (packSize - 2) * 0.05);
  const packReward =
    packSize <= 2 ? 0.95 : Math.max(0.5, 0.9 - (packSize - 2) * 0.05);
  const packArmor =
    packSize <= 2 ? 0.95 : Math.max(0.7, 0.95 - (packSize - 2) * 0.04);
  return {
    hp: Math.max(10, Math.round(foe.hp * levelHp * packHp)),
    power: Math.max(2, Math.round(foe.power * levelPow * packPow)),
    armor: Math.max(
      0,
      Math.round((foe.armor ?? 0) * packArmor * Math.min(1.15, levelPow))
    ),
    xp: Math.max(1, Math.round(foe.xp * Math.max(0.85, levelHp) * packReward)),
    gold: Math.max(0, Math.round(foe.gold * packReward)),
  };
}

function heroFromChar(slot: PlayerSlot, c: CharacterSave) {
  const maxHp = battleMaxHp(c);
  const maxMana = battleMaxMana(c);
  return {
    id: slot,
    slot,
    name: c.name,
    hp: Math.min(c.hp, maxHp),
    maxHp,
    mana: Math.min(c.mana, maxMana),
    maxMana,
    power: battleAttackPower(c),
    armor: battleArmor(c),
    powerUpTurns: 0,
  };
}

/**
 * Dog companion combat stats — useful flankers, weaker than heroes.
 * Scales lightly with owner level + bond.
 */
function petFromChar(slot: PlayerSlot, c: CharacterSave): BattlePetState | null {
  const dog = c.dog;
  if (!dog || dog.maxHp <= 0) return null;
  if (dog.hp <= 0) return null;
  const lvl = Math.max(1, c.level);
  const bond = Math.max(0, dog.bond ?? 0);
  const maxHp = Math.max(
    8,
    Math.min(dog.maxHp + lvl * 2, Math.floor(dog.maxHp * 1.5) + lvl)
  );
  const hp = Math.min(maxHp, Math.max(1, dog.hp + Math.floor(lvl * 0.5)));
  return {
    id: petUnitId(slot),
    ownerSlot: slot,
    name: dog.name || "Companion",
    breed: dog.breed || "hound",
    hp,
    maxHp,
    power: Math.max(2, Math.floor(3 + lvl * 0.85 + bond / 25)),
    armor: Math.max(0, Math.floor(bond / 45) + Math.floor(lvl / 8)),
  };
}

function petsForHeroes(
  heroes: { slot: PlayerSlot }[],
  world: PartyWorldSave
): BattlePetState[] {
  const pets: BattlePetState[] = [];
  for (const h of heroes) {
    const char = world.characters[h.slot];
    if (!char) continue;
    const pet = petFromChar(h.slot, char);
    if (pet) pets.push(pet);
  }
  return pets;
}

/** Hero → their dog → next hero… then all foes. */
function buildTurnQueue(
  heroes: { id: string; slot: PlayerSlot }[],
  pets: BattlePetState[],
  enemies: BattleEnemyState[]
): string[] {
  const petByOwner = new Map(pets.map((p) => [p.ownerSlot, p.id]));
  const party: string[] = [];
  for (const h of heroes) {
    party.push(h.id);
    const petId = petByOwner.get(h.slot);
    if (petId) party.push(petId);
  }
  return [
    ...party,
    ...enemies.map((e, i) => e.unitId ?? enemyUnitIdForIndex(i)),
  ];
}

export function getPetByUnitId(
  battle: BattleState,
  unitId: string
): BattlePetState | undefined {
  return (battle.pets ?? []).find((p) => p.id === unitId);
}

function livingPets(battle: BattleState): BattlePetState[] {
  return (battle.pets ?? []).filter((p) => p.hp > 0);
}

function syncDogHpFromBattle(
  characters: PartyWorldSave["characters"],
  battle: BattleState
): PartyWorldSave["characters"] {
  const next = { ...characters };
  for (const pet of battle.pets ?? []) {
    const c = next[pet.ownerSlot];
    if (!c?.dog) continue;
    next[pet.ownerSlot] = {
      ...c,
      dog: {
        ...c.dog,
        hp: Math.max(0, Math.min(c.dog.maxHp, pet.hp)),
      },
    };
  }
  return next;
}

function consumeOne(inv: string[], itemId: string): string[] | null {
  const i = inv.indexOf(itemId);
  if (i < 0) return null;
  const next = [...inv];
  next.splice(i, 1);
  return next;
}

export function foodItemIds(inv: string[]): string[] {
  return inv.filter((id) => {
    const g = getGear(id);
    return !!g && (g.tags.includes("food") || (g.heal != null && g.tags.includes("food")));
  });
}

export function hpPotionIds(inv: string[]): string[] {
  return inv.filter((id) => {
    const g = getGear(id);
    return !!g && g.tags.includes("potion") && g.tags.includes("heal");
  });
}

export function manaPotionIds(inv: string[]): string[] {
  return inv.filter((id) => {
    const g = getGear(id);
    if (!g) return false;
    if (g.tags.includes("potion") && g.tags.includes("mana")) return true;
    return (g.manaRestore ?? 0) > 0;
  });
}

export function battleSpellIds(char: CharacterSave): string[] {
  return char.abilities.filter((id) => {
    const ab = getAbility(id) ?? getSpellbookAbility(id);
    if (!ab) return false;
    const role = battleAbilityRole(ab);
    if (role === "damage") {
      return (
        ab.kind === "spell" ||
        ab.tags.includes("spell") ||
        ab.tags.includes("damage") ||
        (ab.cost?.mana ?? 0) > 0
      );
    }
    if (role === "heal" || role === "buff") {
      return (
        ab.kind === "heal" ||
        ab.kind === "spell" ||
        (ab.cost?.mana ?? 0) > 0 ||
        ab.tags.includes("heal") ||
        ab.tags.includes("buff") ||
        ab.tags.includes("ward")
      );
    }
    return false;
  });
}

function syncHeroFromChar(
  battle: BattleState,
  slot: PlayerSlot,
  char: CharacterSave
): BattleState {
  const heroes = battle.heroes.map((h) =>
    h.slot === slot
      ? {
          ...h,
          hp: Math.min(char.hp, battleMaxHp(char)),
          maxHp: battleMaxHp(char),
          mana: Math.min(char.mana, battleMaxMana(char)),
          maxMana: battleMaxMana(char),
          power: battleAttackPower(char),
          armor: battleArmor(char),
        }
      : h
  );
  return { ...battle, heroes };
}

function advanceBattleTurn(battle: BattleState): BattleState {
  if (battle.status !== "active") return battle;
  const n = battle.turnQueue.length;
  if (n === 0) return battle;
  let idx = (battle.turnIndex + 1) % n;
  // Skip dead heroes / pets / fallen foes
  for (let guard = 0; guard < n; guard++) {
    const id = battle.turnQueue[idx]!;
    if (isEnemyCombatantId(id)) {
      const foe = getEnemyByUnitId(battle, id);
      if (foe && foe.hp > 0) break;
    } else if (isPetCombatantId(id)) {
      const pet = getPetByUnitId(battle, id);
      if (pet && pet.hp > 0) break;
    } else {
      const hero = battle.heroes.find((h) => h.id === id);
      if (hero && hero.hp > 0) break;
    }
    idx = (idx + 1) % n;
  }
  const now = new Date().toISOString();
  let tactical = battle.tactical
    ? removeDeadHeroUnits(battle.tactical, battle.heroes, battle.pets ?? [])
    : battle.tactical;
  if (tactical) {
    tactical = removeDeadEnemyUnits(tactical, battleEnemyPack(battle));
  }
  if (tactical) tactical = resetPhaseForTurn(tactical);
  const next: BattleState = {
    ...battle,
    turnIndex: idx,
    activeId: battle.turnQueue[idx]!,
    turnStartedAt: now,
    tactical,
  };
  return tickHeroStatuses(next);
}

function pushLog(battle: BattleState, line: string): BattleState {
  return { ...battle, log: [line, ...battle.log].slice(0, 40) };
}

function pushFx(
  battle: BattleState,
  kind: BattleFxEvent["kind"],
  amount: number,
  target: string,
  meta?: {
    source?: string;
    tone?: BattleFxTone;
    cellX?: number;
    cellY?: number;
  }
): BattleState {
  if ((kind === "damage" || kind === "heal" || kind === "crit") && amount <= 0) {
    return battle;
  }
  const fx: BattleFxEvent = {
    id: `fx-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    kind,
    amount: amount > 0 ? Math.round(amount) : undefined,
    target,
    source: meta?.source,
    tone: meta?.tone,
    cellX: meta?.cellX,
    cellY: meta?.cellY,
    at: new Date().toISOString(),
  };
  return {
    ...battle,
    fxEvents: [fx, ...(battle.fxEvents ?? [])].slice(0, 40),
  };
}

function isCritTier(roc: RocResult): boolean {
  return (
    roc.tier.id === "critical" ||
    roc.tier.id === "legendary" ||
    roc.tier.id === "divine" ||
    roc.tier.id === "immortality"
  );
}

function upsertHeroStatus(
  battle: BattleState,
  heroId: string,
  status: BattleStatus
): BattleState {
  return {
    ...battle,
    heroes: battle.heroes.map((h) => {
      if (h.id !== heroId) return h;
      const rest = (h.statuses ?? []).filter((s) => s.id !== status.id);
      return { ...h, statuses: [...rest, status] };
    }),
  };
}

function tickHeroStatuses(battle: BattleState): BattleState {
  return {
    ...battle,
    heroes: battle.heroes.map((h) => {
      const powered: BattleStatus[] =
        h.powerUpTurns > 0 ? [{ id: "powered", turns: h.powerUpTurns }] : [];
      const others = (h.statuses ?? [])
        .filter((s) => s.id !== "powered")
        .map((s) => ({ ...s, turns: s.turns - 1 }))
        .filter((s) => s.turns > 0);
      return { ...h, statuses: [...powered, ...others] };
    }),
  };
}

function pushStrikeVfx(
  battle: BattleState,
  sourceId: string,
  targetId: string,
  tone: BattleFxTone,
  melee: boolean
): BattleState {
  let b = battle;
  if (melee) {
    b = pushFx(b, "swing", 0, sourceId, { source: sourceId, tone });
  }
  b = pushFx(b, "beam", 0, targetId, { source: sourceId, tone });
  return b;
}

/** True while the opening countdown is on screen — both sides frozen. */
export function isBattleIntroActive(
  battle: BattleState,
  nowMs = Date.now()
): boolean {
  if (!battle.introEndsAt) return false;
  const end = Date.parse(battle.introEndsAt);
  if (!Number.isFinite(end)) return false;
  return nowMs < end;
}

export function battleIntroRemainingMs(
  battle: BattleState,
  nowMs = Date.now()
): number {
  if (!battle.introEndsAt) return 0;
  const end = Date.parse(battle.introEndsAt);
  if (!Number.isFinite(end)) return 0;
  return Math.max(0, end - nowMs);
}

function freshBattleTimestamps(nowMs = Date.now()): {
  startedAt: string;
  turnStartedAt: string;
  introEndsAt: string;
} {
  const introEndsAt = new Date(nowMs + BATTLE_INTRO_MS).toISOString();
  // Combat clocks start when the intro ends so idle / hard-cap don't burn during countdown.
  return { startedAt: introEndsAt, turnStartedAt: introEndsAt, introEndsAt };
}

function buildSummary(
  battle: BattleState,
  victory: boolean,
  loot: BattleLootDrop[],
  xp: number,
  gold: number
): BattleSummary {
  return {
    victory,
    enemyName: battle.enemy.name,
    isBoss: battle.enemy.isBoss,
    damageDealt: battle.stats.damageDealt,
    damageTaken: battle.stats.damageTaken,
    xp,
    gold,
    loot,
    turns: battle.stats.turns,
    bestRoc: battle.stats.bestRoc,
    lastRocLabel: battle.lastRocLabel ?? undefined,
  };
}

function recordRoc(battle: BattleState, roc: RocResult): BattleState {
  return {
    ...battle,
    lastRocLabel: roc.label,
    stats: {
      ...battle.stats,
      bestRoc: Math.max(battle.stats.bestRoc ?? 0, roc.total),
    },
  };
}

function pathwayOf(world: PartyWorldSave): PathwayScores {
  return world.pathway ?? { giver: 0, taker: 0 };
}

function pathwaySituational(world: PartyWorldSave): number {
  const p = pathwayOf(world);
  const lead = leadingPathway(p);
  if (lead === "giver") return 3;
  if (lead === "taker") return 5;
  return 0;
}

function foeFromRoll(
  roll: ReturnType<typeof rollRandomFoe>,
  opts: { partyLevel: number; packSize: number; index: number }
): BattleEnemyState {
  const foe = roll.foe;
  const isBoss = roll.kind === "boss";
  const boss = isBoss ? (foe as BossDef) : undefined;
  const scaled = scaleFoeStats(foe, opts.partyLevel, opts.packSize);
  const unitId = enemyUnitIdForIndex(opts.index);
  return {
    id: foe.id,
    unitId,
    name: foe.name,
    blurb: foe.blurb,
    hp: scaled.hp,
    maxHp: scaled.hp,
    power: scaled.power,
    armor: scaled.armor,
    mana: boss ? 40 : 0,
    maxMana: boss ? 40 : 0,
    artId: foe.artId,
    isBoss,
    xp: scaled.xp,
    gold: scaled.gold,
    lootPool: foe.lootPool ?? (isBoss ? "magic" : "trash"),
    uniqueDrops: boss?.uniqueDrops,
    uniqueSkill: boss?.uniqueSkill,
  };
}

/** Spawn 2 foes per sealed hero (min 2); pack softens each unit by density. */
function rollEnemyPack(
  partyLvl: number,
  packSize: number,
  rng: () => number
): BattleEnemyState[] {
  const enemies: BattleEnemyState[] = [];
  for (let i = 0; i < packSize; i++) {
    // Only the lead roll can be a boss — extras stay regular creatures.
    const roll =
      i === 0
        ? rollRandomFoe(partyLvl, rng)
        : ({ kind: "creature" as const, foe: rollCreature(partyLvl, rng) });
    enemies.push(foeFromRoll(roll, { partyLevel: partyLvl, packSize, index: i }));
  }
  return enemies;
}

function packTitle(enemies: BattleEnemyState[]): string {
  if (enemies.length <= 1) return enemies[0]?.name ?? "Foe";
  const names = enemies.map((e) => e.name);
  const uniq = [...new Set(names)];
  if (uniq.length === 1) return `${uniq[0]} ×${enemies.length}`;
  return `${enemies[0]!.name} and ${enemies.length - 1} more`;
}

export type StartBattleOpts = {
  /**
   * `"off"` disables 30s idle force-hit and 10 min hard-cap (DungeonTester).
   * Default `"on"` preserves Neverworld pressure clocks.
   */
  clockMode?: BattleClockMode;
  /**
   * Optional pack-filler roller (DungeonTester uses its own bestiary).
   * Lead foe still comes from `foeId` / random Neverworld rolls.
   */
  rollFiller?: (partyLevel: number, rng: () => number) => CreatureDef;
};

function battleClockBlurb(clockMode: BattleClockMode | undefined): string {
  if (clockMode === "off") {
    return "No turn clocks — take your time.";
  }
  return "Idle 30s → foe acts. Cap 10 min.";
}

export function startRandomBattle(
  world: PartyWorldSave,
  rng: () => number = Math.random,
  opts?: StartBattleOpts
): { world: PartyWorldSave; message: string } {
  if (world.battle?.status === "active") {
    return { world, message: "Already in battle." };
  }
  if (world.endingId) return { world, message: "Chronicle closed." };

  const slots = sealedSlots(world);
  if (!slots.length) return { world, message: "No sealed heroes to fight." };

  const clockMode = opts?.clockMode ?? "on";
  const lvl = partyLevel(world);
  const packSize = encounterPackSize(slots.length);
  const enemies = rollEnemyPack(lvl, packSize, rng);
  const lead = enemies[0]!;
  const heroes = slots.map((slot) => heroFromChar(slot, world.characters[slot]));
  const pets = petsForHeroes(heroes, world);

  const turnQueue = buildTurnQueue(heroes, pets, enemies);
  const clocks = freshBattleTimestamps();
  const title = packTitle(enemies);
  const petNote = pets.length
    ? ` Companions join: ${pets.map((p) => p.name).join(", ")}.`
    : "";
  const battle: BattleState = {
    id: `battle-${Date.now()}`,
    status: "active",
    clockMode,
    enemy: lead,
    enemies,
    heroes,
    pets,
    turnQueue,
    turnIndex: 0,
    activeId: turnQueue[0]!,
    log: [
      `Ambush! ${title} bars the path.`,
      `Tactical field — ${packSize} foe${packSize > 1 ? "s" : ""} vs ${heroes.length} hero${heroes.length > 1 ? "es" : ""}${pets.length ? ` + ${pets.length} companion${pets.length > 1 ? "s" : ""}` : ""}. ${battleClockBlurb(clockMode)}${petNote}`,
    ],
    stats: { damageDealt: 0, damageTaken: 0, turns: 0, bestRoc: 0 },
    lastRocLabel: null,
    summary: null,
    fxEvents: [],
    tactical: createTacticalState(heroes, enemies, world, undefined, pets),
    ...clocks,
  };

  return {
    world: {
      ...world,
      battle,
      log: [`Random battle — ${title}!`, ...world.log].slice(0, 80),
    },
    message: `${title} engages!`,
  };
}

export function startBattleVs(
  world: PartyWorldSave,
  foeId: string,
  opts?: StartBattleOpts
): { world: PartyWorldSave; message: string } {
  const boss = getBoss(foeId);
  const creature = getCreature(foeId);
  if (!boss && !creature) return { world, message: "Unknown foe." };
  const slots = sealedSlots(world);
  if (!slots.length) return { world, message: "No sealed heroes." };

  const clockMode = opts?.clockMode ?? "on";
  const lvl = partyLevel(world);
  const packSize = encounterPackSize(slots.length);
  const leadRoll = boss
    ? ({ kind: "boss" as const, foe: boss })
    : ({ kind: "creature" as const, foe: creature! });
  const enemies: BattleEnemyState[] = [
    foeFromRoll(leadRoll, { partyLevel: lvl, packSize, index: 0 }),
  ];
  for (let i = 1; i < packSize; i++) {
    const filler = opts?.rollFiller
      ? opts.rollFiller(lvl, Math.random)
      : rollCreature(lvl, Math.random);
    enemies.push(
      foeFromRoll(
        { kind: "creature", foe: filler },
        { partyLevel: lvl, packSize, index: i }
      )
    );
  }

  const lead = enemies[0]!;
  const heroes = slots.map((slot) => heroFromChar(slot, world.characters[slot]));
  const pets = petsForHeroes(heroes, world);
  const turnQueue = buildTurnQueue(heroes, pets, enemies);
  const clocks = freshBattleTimestamps();
  const title = packTitle(enemies);
  const petNote = pets.length
    ? ` Companions join: ${pets.map((p) => p.name).join(", ")}.`
    : "";
  const battle: BattleState = {
    id: `battle-${Date.now()}`,
    status: "active",
    clockMode,
    enemy: lead,
    enemies,
    heroes,
    pets,
    turnQueue,
    turnIndex: 0,
    activeId: turnQueue[0]!,
    log: [
      `${title} challenges the party.`,
      `Tactical field — ${packSize} foe${packSize > 1 ? "s" : ""} vs ${heroes.length} hero${heroes.length > 1 ? "es" : ""}${pets.length ? ` + ${pets.length} companion${pets.length > 1 ? "s" : ""}` : ""}. ${battleClockBlurb(clockMode)}${petNote}`,
    ],
    stats: { damageDealt: 0, damageTaken: 0, turns: 0, bestRoc: 0 },
    lastRocLabel: null,
    summary: null,
    fxEvents: [],
    tactical: createTacticalState(heroes, enemies, world, undefined, pets),
    ...clocks,
  };
  return {
    world: { ...world, battle, log: [`Battle — ${title}!`, ...world.log].slice(0, 80) },
    message: `${title} engages!`,
  };
}

function dealToEnemy(
  battle: BattleState,
  raw: number,
  targetUnitId: string,
  opts?: {
    sourceId?: string;
    floater?: "damage" | "crit" | false;
    tone?: BattleFxTone;
  }
): { battle: BattleState; damage: number; fallen: boolean } {
  const pack = battleEnemyPack(battle);
  const idx = pack.findIndex(
    (e, i) => (e.unitId ?? enemyUnitIdForIndex(i)) === targetUnitId
  );
  if (idx < 0) return { battle, damage: 0, fallen: false };
  const target = pack[idx]!;
  const damage = Math.max(1, raw - target.armor);
  const hp = Math.max(0, target.hp - damage);
  const nextPack = pack.map((e, i) => (i === idx ? { ...e, hp } : e));
  let next: BattleState = syncLeadEnemy({
    ...battle,
    enemies: nextPack,
    enemy: nextPack[idx]!,
    stats: {
      ...battle.stats,
      damageDealt: battle.stats.damageDealt + damage,
      turns: battle.stats.turns + 1,
    },
  });
  const tok = next.tactical ? getUnit(next.tactical, targetUnitId) : null;
  const floater = opts?.floater ?? "damage";
  if (floater) {
    next = pushFx(next, floater, damage, targetUnitId, {
      source: opts?.sourceId,
      tone: opts?.tone ?? "melee",
    });
  }
  if (hp <= 0) {
    next = pushFx(next, "ko", 0, targetUnitId, {
      source: opts?.sourceId,
      cellX: tok?.x,
      cellY: tok?.y,
    });
    if (next.tactical) {
      next = {
        ...next,
        tactical: removeDeadEnemyUnits(next.tactical, nextPack),
      };
    }
  }
  return { damage, battle: next, fallen: hp <= 0 };
}

function finishVictory(
  world: PartyWorldSave,
  battle: BattleState,
  rewardSlot: PlayerSlot,
  rng: () => number
): PartyWorldSave {
  const pack = battleEnemyPack(battle);
  const lootLead =
    pack.find((e) => e.isBoss) ?? pack[0] ?? battle.enemy;
  const uniqueDrops = [
    ...new Set(pack.flatMap((e) => e.uniqueDrops ?? [])),
  ];
  const lootRolls = rollBattleLoot(
    {
      lootPool: lootLead.lootPool,
      isBoss: pack.some((e) => e.isBoss),
      uniqueDrops: uniqueDrops.length ? uniqueDrops : lootLead.uniqueDrops,
    },
    rng
  );
  const loot: BattleLootDrop[] = lootRolls.map((r) => {
    const item = getGear(r.itemId) ?? getBattleLootItem(r.itemId);
    return {
      itemId: r.itemId,
      name: item?.name ?? r.itemId,
      rarity: r.rarity,
    };
  });

  const totalXp = pack.reduce((s, e) => s + e.xp, 0);
  const totalGold = pack.reduce((s, e) => s + e.gold, 0);

  let char = world.characters[rewardSlot];
  char = applyXp(char, totalXp);
  char = { ...char, gold: char.gold + totalGold };
  const inventory = [...char.inventory];
  for (const drop of loot) {
    inventory.push(drop.itemId);
  }
  char = { ...char, inventory };

  // Sync all hero HP/mana from battle (clamp to effective max from gear)
  let characters = { ...world.characters };
  for (const h of battle.heroes) {
    const c = characters[h.slot];
    if (!c) continue;
    const sheet = h.slot === rewardSlot ? char : c;
    const maxHp = battleMaxHp(sheet);
    const maxMana = battleMaxMana(sheet);
    characters[h.slot] = {
      ...sheet,
      hp: Math.max(1, Math.min(maxHp, h.hp)),
      mana: Math.max(0, Math.min(maxMana, h.mana)),
    };
  }
  characters[rewardSlot] = {
    ...characters[rewardSlot]!,
    inventory: char.inventory,
    gold: char.gold,
    xp: char.xp,
    level: char.level,
    skillPoints: char.skillPoints,
    maxHp: char.maxHp,
    maxMana: char.maxMana,
  };
  characters = syncDogHpFromBattle(characters, battle);

  const title = packTitle(pack);
  const summary = buildSummary(battle, true, loot, totalXp, totalGold);
  const nextBattle = {
    ...pushLog(battle, `${title} falls!`),
    status: "victory" as const,
    summary: { ...summary, enemyName: title },
  };

  const fought = (world.battlesFought ?? 0) + 1;
  const path = pathwayOf(world);
  const pathFlavor =
    leadingPathway(path) === "taker"
      ? NEVERWORLD_HERITAGE.battleVictoryTaker
      : NEVERWORLD_HERITAGE.battleVictoryGiver;

  // If this fight was a side-quest battle step, mark it won so Continue advances the quest.
  let activeSideQuest = world.activeSideQuest;
  if (activeSideQuest?.status === "active") {
    const step = activeSideQuest.steps[activeSideQuest.stepIndex];
    if (step?.kind === "battle") {
      activeSideQuest = {
        ...activeSideQuest,
        steps: activeSideQuest.steps.map((s, i) =>
          i === activeSideQuest!.stepIndex
            ? { ...s, battleWon: true, battleStarted: true }
            : s
        ),
      };
    }
  }

  return {
    ...world,
    characters,
    battle: nextBattle,
    activeSideQuest: activeSideQuest ?? world.activeSideQuest,
    battlesFought: fought,
    nextEncounterAtMs: (world.storyPlayMs ?? 0) + rollNextEncounterThreshold(fought),
    log: [
      `Victory vs ${title} (+${totalXp} XP, +${totalGold}g). ${pathFlavor}`,
      ...world.log,
    ].slice(0, 80),
  };
}

function finishDefeat(
  world: PartyWorldSave,
  battle: BattleState,
  reason?: string
): PartyWorldSave {
  let characters = { ...world.characters };
  for (const h of battle.heroes) {
    const c = characters[h.slot];
    if (!c) continue;
    const maxHp = battleMaxHp(c);
    const maxMana = battleMaxMana(c);
    characters[h.slot] = {
      ...c,
      hp: Math.max(1, Math.floor(maxHp * 0.25)),
      mana: Math.max(0, Math.floor(maxMana * 0.25)),
    };
  }
  characters = syncDogHpFromBattle(characters, battle);
  // Soft-heal dogs after a wipe so companions aren't permanently KO'd.
  for (const pet of battle.pets ?? []) {
    const c = characters[pet.ownerSlot];
    if (!c?.dog) continue;
    characters[pet.ownerSlot] = {
      ...c,
      dog: {
        ...c.dog,
        hp: Math.max(1, Math.floor(c.dog.maxHp * 0.35)),
      },
    };
  }
  const summary = buildSummary(battle, false, [], 0, 0);
  const fought = (world.battlesFought ?? 0) + 1;
  const line = reason ?? "The party is defeated…";
  const title = packTitle(battleEnemyPack(battle));
  return {
    ...world,
    characters,
    battle: {
      ...pushLog(battle, line),
      status: "defeat",
      summary: { ...summary, enemyName: title },
    },
    battlesFought: fought,
    nextEncounterAtMs: (world.storyPlayMs ?? 0) + rollNextEncounterThreshold(fought),
    log: [`Defeat vs ${title}.`, ...world.log].slice(0, 80),
  };
}

function maybeResolveEnd(
  world: PartyWorldSave,
  battle: BattleState,
  rewardSlot: PlayerSlot,
  rng: () => number
): PartyWorldSave {
  if (livingEnemies(battle).length === 0) {
    return finishVictory(world, battle, rewardSlot, rng);
  }
  if (battle.heroes.every((h) => h.hp <= 0)) {
    return finishDefeat(world, battle);
  }
  return { ...world, battle: syncLeadEnemy(battle) };
}

function runEnemyTurn(
  world: PartyWorldSave,
  battle: BattleState,
  rng: () => number
): PartyWorldSave {
  const unitId = battle.activeId;
  if (battle.status !== "active" || !isEnemyCombatantId(unitId)) {
    return { ...world, battle };
  }
  const foeState = getEnemyByUnitId(battle, unitId);
  if (!foeState || foeState.hp <= 0) {
    return { ...world, battle: advanceBattleTurn(battle) };
  }
  const livingHeroes = battle.heroes.filter((h) => h.hp > 0);
  if (!livingHeroes.length) return finishDefeat(world, battle);
  const petsAlive = livingPets(battle);

  type PartyTarget =
    | { kind: "hero"; id: string; name: string; armor: number; power: number; maxHp: number; slot: PlayerSlot }
    | { kind: "pet"; id: string; name: string; armor: number; power: number; maxHp: number; ownerSlot: PlayerSlot };

  const partyTargets: PartyTarget[] = [
    ...livingHeroes.map((h) => ({
      kind: "hero" as const,
      id: h.id,
      name: h.name,
      armor: h.armor,
      power: h.power,
      maxHp: h.maxHp,
      slot: h.slot,
    })),
    ...petsAlive.map((p) => ({
      kind: "pet" as const,
      id: p.id,
      name: p.name,
      armor: p.armor,
      power: p.power,
      maxHp: p.maxHp,
      ownerSlot: p.ownerSlot,
    })),
  ];

  let b = ensureTactical(battle, world);
  const livingIds = new Set(partyTargets.map((t) => t.id));
  const foeUnit = b.tactical ? getUnit(b.tactical, unitId) : null;

  // Move toward nearest party unit (hero or pet) when not already in strike range.
  if (b.tactical && foeUnit) {
    const targetUnit = nearestPartyTarget(b.tactical, foeUnit, livingIds);
    if (targetUnit) {
      const before = getUnit(b.tactical, unitId)!;
      const nextTac = applyAiMove(b.tactical, unitId, targetUnit);
      const after = getUnit(nextTac, unitId)!;
      b = { ...b, tactical: nextTac };
      if (after.x !== before.x || after.y !== before.y) {
        b = pushLog(
          b,
          `${foeState.name} advances to (${after.x + 1},${after.y + 1}).`
        );
      }
    }
  }

  const foeNow = b.tactical ? getUnit(b.tactical, unitId) : null;
  let target = partyTargets[Math.floor(rng() * partyTargets.length)]!;
  if (b.tactical && foeNow) {
    const inRange = partyTargets
      .map((t) => ({ t, u: getUnit(b.tactical!, t.id) }))
      .filter(({ u }) => u && canStrike(foeNow, u));
    if (inRange.length) {
      // Prefer pets slightly (distract) when both in range — 55% chance if any pet in range.
      const petHits = inRange.filter((x) => x.t.kind === "pet");
      const pool =
        petHits.length && rng() < 0.55 ? petHits : inRange;
      target = pool[Math.floor(rng() * pool.length)]!.t;
    } else {
      // Could not close to attack — end turn after reposition.
      b = {
        ...b,
        tactical: b.tactical ? setPhase(b.tactical, "move") : b.tactical,
        stats: { ...b.stats, turns: b.stats.turns + 1 },
      };
      b = pushLog(b, `${foeState.name} watches for an opening…`);
      b = advanceBattleTurn(b);
      return { ...world, battle: b };
    }
  }

  const ownerSlot = target.kind === "hero" ? target.slot : target.ownerSlot;
  const targetChar = world.characters[ownerSlot];
  let skillBoost = foeState.power * 2;
  let line = `${foeState.name} strikes ${target.name}`;
  let actingFoe = foeState;

  const skill = foeState.uniqueSkill;
  if (foeState.isBoss && skill && rng() < 0.45) {
    const cost = skill.manaCost ?? 0;
    if (foeState.mana >= cost) {
      skillBoost = skill.power * 2.5;
      actingFoe = { ...foeState, mana: Math.max(0, foeState.mana - cost) };
      const pack = battleEnemyPack(b).map((e, i) =>
        (e.unitId ?? enemyUnitIdForIndex(i)) === unitId ? actingFoe : e
      );
      b = syncLeadEnemy({ ...b, enemies: pack, enemy: actingFoe });
      line = `${foeState.name} uses ${skill.name} on ${target.name}`;
    }
  }

  const offense = resolveRoc({
    attributeScore: 12,
    skillValue: Math.round(skillBoost),
    situational: actingFoe.isBoss ? 8 : 2,
    rng,
  });
  const defense = resolveRoc({
    attributeScore:
      target.kind === "pet"
        ? 8 + Math.floor((targetChar?.dog?.bond ?? 10) / 20)
        : targetChar?.stats.constitution ?? 10,
    skillValue: target.armor * 3 + Math.floor(target.power * 0.5),
    situational: livingEnemies(b).length >= 4 ? 3 : 0,
    rng,
  });
  const { damage: rawHit } = rocDamageFromMargin(
    Math.max(2, actingFoe.power),
    offense,
    defense.total,
    { armor: target.armor, minHit: offense.tier.success ? 1 : 0 }
  );
  // Dense packs act many times per round — cap each swing so they pressure, not wipe.
  const hitCap = Math.max(
    4,
    Math.floor(target.maxHp * (actingFoe.isBoss ? 0.26 : target.kind === "pet" ? 0.28 : 0.16))
  );
  const mitigated = Math.min(rawHit, hitCap);
  b = recordRoc(b, offense);

  const usedSkill = line.includes("uses ");
  b = pushStrikeVfx(b, unitId, target.id, usedSkill ? "spell" : "melee", !usedSkill);

  let heroes = b.heroes;
  let pets = b.pets ?? [];
  const characters = { ...world.characters };

  if (target.kind === "hero") {
    heroes = b.heroes.map((h) =>
      h.id === target.id ? { ...h, hp: Math.max(0, h.hp - mitigated) } : h
    );
    const hit = heroes.find((h) => h.id === target.id)!;
    characters[target.slot] = {
      ...characters[target.slot]!,
      hp: hit.hp,
    };
  } else {
    pets = pets.map((p) =>
      p.id === target.id ? { ...p, hp: Math.max(0, p.hp - mitigated) } : p
    );
    const hitPet = pets.find((p) => p.id === target.id)!;
    const owner = characters[hitPet.ownerSlot];
    if (owner?.dog) {
      characters[hitPet.ownerSlot] = {
        ...owner,
        dog: { ...owner.dog, hp: Math.max(0, Math.min(owner.dog.maxHp, hitPet.hp)) },
      };
    }
  }

  b = {
    ...b,
    heroes,
    pets,
    stats: {
      ...b.stats,
      damageTaken: b.stats.damageTaken + mitigated,
      turns: b.stats.turns + 1,
    },
  };
  const targetTok = b.tactical ? getUnit(b.tactical, target.id) : null;
  if (b.tactical) {
    b = { ...b, tactical: removeDeadHeroUnits(b.tactical, heroes, pets) };
  }
  if (mitigated > 0) {
    if (isCritTier(offense)) {
      b = pushFx(b, "crit", mitigated, target.id, { source: unitId, tone: "melee" });
    } else {
      b = pushFx(b, "damage", mitigated, target.id, { source: unitId, tone: "melee" });
    }
    const fallen =
      target.kind === "hero"
        ? (heroes.find((h) => h.id === target.id)?.hp ?? 1) <= 0
        : (pets.find((p) => p.id === target.id)?.hp ?? 1) <= 0;
    if (fallen) {
      b = pushFx(b, "ko", 0, target.id, {
        source: unitId,
        cellX: targetTok?.x,
        cellY: targetTok?.y,
      });
    }
  } else {
    b = pushFx(b, "miss", 0, target.id, { source: unitId, tone: "melee" });
  }
  b = pushLog(
    b,
    mitigated > 0
      ? `${line} — ${offense.label} vs DCF ${defense.total} → ${mitigated} dmg.`
      : `${line} — ${offense.label} (wiffs).`
  );

  if (heroes.every((h) => h.hp <= 0)) {
    return finishDefeat({ ...world, characters }, b);
  }

  b = advanceBattleTurn(b);
  return { ...world, characters, battle: b };
}

/** Auto-resolve consecutive enemy turns until a living party combatant is active. */
function resolveEnemyPhase(
  world: PartyWorldSave,
  battle: BattleState,
  rng: () => number
): PartyWorldSave {
  let nextWorld: PartyWorldSave = { ...world, battle };
  let guard = 0;
  while (
    nextWorld.battle?.status === "active" &&
    isEnemyCombatantId(nextWorld.battle.activeId) &&
    guard++ < 16
  ) {
    nextWorld = runEnemyTurn(nextWorld, nextWorld.battle, rng);
  }
  return nextWorld;
}

export type BattleActionOpts = {
  spellId?: string;
  itemId?: string;
  /** Grid destination for `move`. */
  x?: number;
  y?: number;
  /**
   * Combatant id for attack / damage spells (enemy unit id) or
   * heal/buff spells (hero slot / combatant id, including self).
   */
  targetId?: string;
};

function livingEnemyUnitIds(battle: BattleState): string[] {
  return battleEnemyPack(battle)
    .map((e, i) => ({ e, id: e.unitId ?? enemyUnitIdForIndex(i) }))
    .filter(({ e }) => e.hp > 0)
    .map(({ id }) => id);
}

function resolveAttackTargetId(
  battle: BattleState,
  actorId: string,
  preferred?: string
): string | null {
  const livingIds = livingEnemyUnitIds(battle);
  if (!livingIds.length) return null;
  if (preferred && livingIds.includes(preferred)) return preferred;

  if (!battle.tactical) return livingIds[0]!;

  const attacker = getUnit(battle.tactical, actorId);
  if (!attacker) return livingIds[0]!;

  const idSet = new Set(livingIds);
  const inRange = livingIds
    .map((id) => getUnit(battle.tactical!, id))
    .filter((u): u is NonNullable<typeof u> => !!u && canStrike(attacker, u));
  if (inRange.length) return inRange[0]!.id;

  const nearest = nearestEnemyTarget(battle.tactical, attacker, idSet);
  return nearest?.id ?? livingIds[0]!;
}

function resolveAllyTargetId(
  battle: BattleState,
  actorSlot: PlayerSlot,
  preferred?: string
): string {
  const living = battle.heroes.filter((h) => h.hp > 0);
  if (preferred) {
    const hit = living.find((h) => h.id === preferred || h.slot === preferred);
    if (hit) return hit.id;
  }
  return actorSlot;
}

/** Companion turn — move / bite / wait (owner clicks for their dog). */
function performPetBattleAction(
  world: PartyWorldSave,
  battleIn: BattleState,
  actorSlot: PlayerSlot,
  pet: BattlePetState,
  action: BattleActionId,
  opts: BattleActionOpts,
  rng: () => number
): { world: PartyWorldSave; message: string } {
  let b = battleIn;
  const phase = b.tactical?.phase ?? "act";
  let message = "";

  if (
    action === "powerUp" ||
    action === "eat" ||
    action === "drinkHp" ||
    action === "drinkMana" ||
    action === "spell"
  ) {
    return {
      world: { ...world, battle: b },
      message: `${pet.name} can only move, bite, or wait.`,
    };
  }

  if (action === "move") {
    if (phase !== "move") return { world: { ...world, battle: b }, message: "Already moved." };
    if (opts.x == null || opts.y == null) {
      return { world: { ...world, battle: b }, message: "Pick a tile." };
    }
    if (!b.tactical) return { world, message: "No battlefield." };
    const nextTac = moveUnit(b.tactical, pet.id, opts.x, opts.y);
    if (!nextTac) return { world: { ...world, battle: b }, message: "Cannot reach that tile." };
    b = {
      ...b,
      tactical: nextTac,
      stats: { ...b.stats, turns: b.stats.turns + 1 },
    };
    message = `${pet.name} bounds to (${opts.x + 1},${opts.y + 1}).`;
    b = pushLog(b, message);
    return { world: { ...world, battle: b }, message };
  }

  if (action === "wait") {
    if (phase === "move" && b.tactical) {
      b = { ...b, tactical: setPhase(b.tactical, "act") };
      message = `${pet.name} holds, ears pricked.`;
      b = pushLog(b, message);
      return { world: { ...world, battle: b }, message };
    }
    message = `${pet.name} waits.`;
    b = { ...b, stats: { ...b.stats, turns: b.stats.turns + 1 } };
    b = pushLog(b, message);
  } else if (action === "attack") {
    const targetId = resolveAttackTargetId(b, pet.id, opts.targetId);
    if (!targetId) return { world, message: "No foes left." };
    const foeState = getEnemyByUnitId(b, targetId);
    if (!foeState || foeState.hp <= 0) {
      return { world: { ...world, battle: b }, message: "That foe is down." };
    }
    const attacker = b.tactical ? getUnit(b.tactical, pet.id) : null;
    const foeTok = b.tactical ? getUnit(b.tactical, targetId) : null;
    if (attacker && foeTok && !canStrike(attacker, foeTok)) {
      return {
        world: { ...world, battle: b },
        message: `Out of range — ${pet.name} needs to close in.`,
      };
    }
    const flanking =
      !!attacker && !!foeTok && b.tactical
        ? isFlanking(b.tactical, attacker, foeTok)
        : false;
    const strike = combatStrikePower(pet.power, false);
    const bond = world.characters[actorSlot]?.dog?.bond ?? 10;
    const offense = resolveRoc({
      attributeScore: 10 + Math.floor(bond / 15),
      skillValue: Math.round(pet.power * 0.9) + (flanking ? 8 : 0),
      situational: pathwaySituational(world) + (flanking ? 10 : 2),
      rng,
    });
    const defense = resolveDefenseRoc({
      armor: foeState.armor,
      power: foeState.power,
      level: partyLevel(world),
      rng,
    });
    const { damage: rawDmg } = rocDamageFromMargin(
      strike * (flanking ? 1.2 : 1),
      offense,
      defense.total,
      { armor: foeState.armor, minHit: offense.tier.success ? 1 : 0 }
    );
    const damage = clampOutgoingDamage(rawDmg, foeState.maxHp);
    b = recordRoc(b, offense);
    b = pushStrikeVfx(b, pet.id, targetId, "melee", true);
    if (flanking) {
      b = pushFx(b, "flank", 0, targetId, { source: pet.id, tone: "melee" });
    }
    if (damage > 0) {
      const dealt = dealToEnemy(b, damage, targetId, {
        sourceId: pet.id,
        floater: isCritTier(offense) ? "crit" : "damage",
        tone: "melee",
      });
      b = dealt.battle;
      message = `${pet.name} bites ${foeState.name}${flanking ? " (flank!)" : ""} — ${offense.label} vs DCF ${defense.total} → ${dealt.damage} dmg.`;
      if (dealt.fallen) message += ` ${foeState.name} falls!`;
    } else {
      b = pushFx(b, "miss", 0, targetId, { source: pet.id, tone: "melee" });
      message = `${pet.name} snaps at air — ${offense.label}.`;
    }
    b = pushLog(b, message);
  } else {
    return { world: { ...world, battle: b }, message: "Unknown action." };
  }

  let nextWorld: PartyWorldSave = { ...world, battle: b };
  nextWorld = maybeResolveEnd(nextWorld, nextWorld.battle!, actorSlot, rng);
  if (nextWorld.battle?.status !== "active") {
    return { world: nextWorld, message };
  }

  let nb = advanceBattleTurn(nextWorld.battle!);
  nextWorld = { ...nextWorld, battle: nb };
  if (isEnemyCombatantId(nb.activeId)) {
    nextWorld = resolveEnemyPhase(nextWorld, nextWorld.battle!, rng);
  }
  return { world: nextWorld, message };
}

export function performBattleAction(
  world: PartyWorldSave,
  actorSlot: PlayerSlot,
  action: BattleActionId,
  opts: BattleActionOpts = {},
  rng: () => number = Math.random
): { world: PartyWorldSave; message: string } {
  let battle = world.battle;
  if (!battle || battle.status !== "active") {
    return { world, message: "No active battle." };
  }
  if (isBattleIntroActive(battle)) {
    return { world, message: "Battle starting…" };
  }
  battle = ensureTactical(battle, world);

  const activePet =
    isPetCombatantId(battle.activeId)
      ? getPetByUnitId(battle, battle.activeId)
      : undefined;
  const controllingPet =
    !!activePet && activePet.ownerSlot === actorSlot && activePet.hp > 0;

  if (battle.activeId !== actorSlot && !controllingPet) {
    return { world, message: "Not your battle turn." };
  }

  // —— Pet turn: move / bite / wait only ——
  if (controllingPet && activePet) {
    return performPetBattleAction(world, battle, actorSlot, activePet, action, opts, rng);
  }

  let char = world.characters[actorSlot];
  let b = battle;
  const hero = b.heroes.find((h) => h.slot === actorSlot);
  if (!hero || hero.hp <= 0) return { world, message: "You cannot act." };

  const phase = b.tactical?.phase ?? "act";
  let message = "";
  let endTurn = true;

  if (action === "move") {
    if (phase !== "move") return { world: { ...world, battle: b }, message: "Already moved." };
    if (opts.x == null || opts.y == null) {
      return { world: { ...world, battle: b }, message: "Pick a tile." };
    }
    if (!b.tactical) return { world, message: "No battlefield." };
    const nextTac = moveUnit(b.tactical, actorSlot, opts.x, opts.y);
    if (!nextTac) return { world: { ...world, battle: b }, message: "Cannot reach that tile." };
    b = {
      ...b,
      tactical: nextTac,
      stats: { ...b.stats, turns: b.stats.turns + 1 },
    };
    message = `${char.name} moves to (${opts.x + 1},${opts.y + 1}).`;
    b = pushLog(b, message);
    endTurn = false;
    return {
      world: { ...world, characters: { ...world.characters, [actorSlot]: char }, battle: b },
      message,
    };
  }

  if (action === "wait") {
    if (phase === "move" && b.tactical) {
      // Skip move → act phase (still can attack / use items).
      b = { ...b, tactical: setPhase(b.tactical, "act") };
      message = `${char.name} holds position.`;
      b = pushLog(b, message);
      endTurn = false;
      return {
        world: { ...world, characters: { ...world.characters, [actorSlot]: char }, battle: b },
        message,
      };
    }
    message = `${char.name} waits.`;
    b = { ...b, stats: { ...b.stats, turns: b.stats.turns + 1 } };
    b = pushLog(b, message);
  } else if (action === "attack") {
    const targetId = resolveAttackTargetId(b, actorSlot, opts.targetId);
    if (!targetId) return { world, message: "No foes left." };
    const foeState = getEnemyByUnitId(b, targetId);
    if (!foeState || foeState.hp <= 0) {
      return { world: { ...world, battle: b }, message: "That foe is down." };
    }
    const attacker = b.tactical ? getUnit(b.tactical, actorSlot) : null;
    const foeTok = b.tactical ? getUnit(b.tactical, targetId) : null;
    if (attacker && foeTok && !canStrike(attacker, foeTok)) {
      return {
        world: { ...world, battle: b },
        message: `Out of range — close to within ${attacker.range} tile${attacker.range > 1 ? "s" : ""}.`,
      };
    }
    const powered = hero.powerUpTurns > 0;
    const flanking =
      !!attacker && !!foeTok && b.tactical
        ? isFlanking(b.tactical, attacker, foeTok)
        : false;
    const strike = combatStrikePower(hero.power, powered);
    const eff = computeEffectiveStats(char);
    // Keep ROC juicy without letting ATK dominate the chart.
    const skillValue =
      Math.round(hero.power * 0.75 + eff.crit * 0.35) +
      (powered ? 8 : 0) +
      (flanking ? 6 : 0);
    const offense = resolveRoc({
      attributeScore: eff.stats.dexterity,
      skillValue,
      situational:
        pathwaySituational(world) +
        Math.floor(eff.atk * 0.12) +
        (flanking ? 8 : 0),
      rng,
    });
    const defense = resolveDefenseRoc({
      armor: foeState.armor,
      power: foeState.power,
      level: partyLevel(world),
      rng,
    });
    const { damage: rawDmg } = rocDamageFromMargin(
      strike * (flanking ? 1.15 : 1),
      offense,
      defense.total,
      { armor: foeState.armor, minHit: offense.tier.success ? 1 : 0 }
    );
    const damage = clampOutgoingDamage(rawDmg, foeState.maxHp);
    b = recordRoc(b, offense);
    b = pushStrikeVfx(b, actorSlot, targetId, "melee", true);
    if (flanking) {
      b = pushFx(b, "flank", 0, targetId, { source: actorSlot, tone: "melee" });
    }
    if (damage > 0) {
      const dealt = dealToEnemy(b, damage, targetId, {
        sourceId: actorSlot,
        floater: isCritTier(offense) ? "crit" : "damage",
        tone: "melee",
      });
      b = dealt.battle;
      message = `${char.name} attacks ${foeState.name}${flanking ? " (flank!)" : ""} — ${offense.label} vs DCF ${defense.total} → ${dealt.damage} dmg.`;
      if (dealt.fallen) message += ` ${foeState.name} falls!`;
    } else if (offense.tier.severity < 0) {
      const self = Math.max(1, Math.round(Math.abs(offense.tier.severity) * 4));
      char = { ...char, hp: Math.max(1, char.hp - self) };
      b = syncHeroFromChar(b, actorSlot, char);
      b = pushFx(b, "damage", self, actorSlot);
      message = `${char.name} fumbles — ${offense.label} (−${self} HP).`;
    } else {
      b = pushFx(b, "miss", 0, targetId, { source: actorSlot, tone: "melee" });
      message = `${char.name} misses — ${offense.label}.`;
    }
    if (offense.tier.xpBonus > 0) {
      char = applyXp(char, offense.tier.xpBonus);
    }
    if (offense.tier.flagsAdd?.length) {
      char = {
        ...char,
        flags: Array.from(new Set([...char.flags, ...offense.tier.flagsAdd])),
      };
    }
    b = {
      ...b,
      heroes: b.heroes.map((h) =>
        h.slot === actorSlot
          ? { ...h, powerUpTurns: Math.max(0, h.powerUpTurns - 1) }
          : h
      ),
    };
    b = pushLog(b, message);
  } else if (action === "powerUp") {
    b = {
      ...b,
      heroes: b.heroes.map((h) =>
        h.slot === actorSlot ? { ...h, powerUpTurns: POWER_UP_TURNS } : h
      ),
      stats: { ...b.stats, turns: b.stats.turns + 1 },
    };
    b = upsertHeroStatus(b, actorSlot, { id: "powered", turns: POWER_UP_TURNS });
    b = pushFx(b, "buff", 0, actorSlot, { source: actorSlot, tone: "buff" });
    message = `${char.name} powers up! (+${Math.round((POWER_UP_MULT - 1) * 100)}% dmg, ${POWER_UP_TURNS} turns)`;
    b = pushLog(b, message);
  } else if (action === "eat") {
    const foods = foodItemIds(char.inventory);
    if (!opts.itemId) return { world, message: "Pick a food item." };
    const itemId = foods.includes(opts.itemId) ? opts.itemId : null;
    if (!itemId) return { world, message: "No food in inventory." };
    const gear = getGear(itemId)!;
    const inv = consumeOne(char.inventory, itemId);
    if (!inv) return { world, message: "Food missing." };
    const heal = gear.heal ?? 8;
    const beforeHp = char.hp;
    char = {
      ...char,
      inventory: inv,
      hp: Math.min(battleMaxHp(char), char.hp + heal),
    };
    b = syncHeroFromChar(b, actorSlot, char);
    b = upsertHeroStatus(b, actorSlot, { id: "healed", turns: 1 });
    b = pushFx(b, "buff", 0, actorSlot, { source: actorSlot, tone: "heal" });
    b = pushFx(b, "heal", char.hp - beforeHp, actorSlot);
    b = { ...b, stats: { ...b.stats, turns: b.stats.turns + 1 } };
    message = `${char.name} eats ${gear.name} (+${heal} HP).`;
    b = pushLog(b, message);
  } else if (action === "drinkHp") {
    const pots = hpPotionIds(char.inventory);
    if (!opts.itemId) return { world, message: "Pick an HP potion." };
    const itemId = pots.includes(opts.itemId) ? opts.itemId : null;
    if (!itemId) return { world, message: "No HP potion." };
    const gear = getGear(itemId)!;
    const inv = consumeOne(char.inventory, itemId);
    if (!inv) return { world, message: "Potion missing." };
    const heal = gear.heal ?? 25;
    const beforeHp = char.hp;
    char = {
      ...char,
      inventory: inv,
      hp: Math.min(battleMaxHp({ ...char, inventory: inv }), char.hp + heal),
    };
    b = syncHeroFromChar(b, actorSlot, char);
    b = upsertHeroStatus(b, actorSlot, { id: "healed", turns: 1 });
    b = pushFx(b, "buff", 0, actorSlot, { source: actorSlot, tone: "heal" });
    b = pushFx(b, "heal", char.hp - beforeHp, actorSlot);
    b = { ...b, stats: { ...b.stats, turns: b.stats.turns + 1 } };
    message = `${char.name} drinks ${gear.name} (+${heal} HP).`;
    b = pushLog(b, message);
  } else if (action === "drinkMana") {
    const pots = manaPotionIds(char.inventory);
    if (!opts.itemId) return { world, message: "Pick a mana potion." };
    const itemId = pots.includes(opts.itemId) ? opts.itemId : null;
    if (!itemId) return { world, message: "No mana potion." };
    const gear = getGear(itemId)!;
    const inv = consumeOne(char.inventory, itemId);
    if (!inv) return { world, message: "Potion missing." };
    const restore = gear.manaRestore ?? 20;
    char = {
      ...char,
      inventory: inv,
      mana: Math.min(battleMaxMana({ ...char, inventory: inv }), char.mana + restore),
    };
    b = syncHeroFromChar(b, actorSlot, char);
    b = { ...b, stats: { ...b.stats, turns: b.stats.turns + 1 } };
    message = `${char.name} drinks ${gear.name} (+${restore} Mana).`;
    b = pushLog(b, message);
  } else if (action === "spell") {
    const spells = battleSpellIds(char);
    if (!opts.spellId) return { world, message: "Pick a spell." };
    const spellId = spells.includes(opts.spellId) ? opts.spellId : null;
    if (!spellId) return { world, message: "No spells known." };
    const ab = getAbility(spellId) ?? getSpellbookAbility(spellId);
    if (!ab) return { world, message: "Unknown spell." };
    const manaCost = ab.cost?.mana ?? 0;
    if (char.mana < manaCost) return { world, message: "Not enough mana." };
    char = { ...char, mana: char.mana - manaCost };

    const role = battleAbilityRole(ab);
    if (role === "damage") {
      const targetId = resolveAttackTargetId(b, actorSlot, opts.targetId);
      if (!targetId) return { world, message: "No foes left." };
      const foeState = getEnemyByUnitId(b, targetId);
      if (!foeState || foeState.hp <= 0) {
        return { world: { ...world, battle: b }, message: "That foe is down." };
      }
      const attacker = b.tactical ? getUnit(b.tactical, actorSlot) : null;
      const foeTok = b.tactical ? getUnit(b.tactical, targetId) : null;
      if (attacker && foeTok && !canSpellStrike(attacker, foeTok)) {
        const need = spellStrikeRange(attacker);
        return {
          world: { ...world, battle: b },
          message: `Spell out of range (need ≤${need} tiles).`,
        };
      }
      const powered = hero.powerUpTurns > 0;
      const strike = combatStrikePower(Math.max(ab.power, 4), powered);
      const eff = computeEffectiveStats(char);
      const offense = resolveRoc({
        attributeScore: eff.stats.intelligence,
        skillValue: ab.power * 1.1 + Math.floor(eff.atk * 0.2),
        situational: pathwaySituational(world) + (powered ? 6 : 0),
        rng,
      });
      const defense = resolveDefenseRoc({
        armor: foeState.armor,
        power: foeState.power,
        level: partyLevel(world),
        rng,
      });
      const { damage: rawDmg } = rocDamageFromMargin(
        strike,
        offense,
        defense.total,
        { armor: Math.floor(foeState.armor * 0.5), minHit: offense.tier.success ? 1 : 0 }
      );
      const damage = clampOutgoingDamage(rawDmg, foeState.maxHp);
      b = recordRoc(b, offense);
      b = pushStrikeVfx(b, actorSlot, targetId, "spell", false);
      if (damage > 0) {
        const dealt = dealToEnemy(b, damage, targetId, {
          sourceId: actorSlot,
          floater: isCritTier(offense) ? "crit" : "damage",
          tone: "spell",
        });
        b = dealt.battle;
        message = `${char.name} casts ${ab.name} on ${foeState.name} — ${offense.label} vs DCF ${defense.total} → ${dealt.damage} dmg.`;
        if (dealt.fallen) message += ` ${foeState.name} falls!`;
      } else {
        b = pushFx(b, "miss", 0, targetId, { source: actorSlot, tone: "spell" });
        message = `${char.name} casts ${ab.name} — ${offense.label} (fizzles).`;
      }
      if (offense.tier.xpBonus > 0) char = applyXp(char, offense.tier.xpBonus);
      if (offense.tier.flagsAdd?.length) {
        char = {
          ...char,
          flags: Array.from(new Set([...char.flags, ...offense.tier.flagsAdd])),
        };
      }
      b = syncHeroFromChar(b, actorSlot, char);
      b = {
        ...b,
        heroes: b.heroes.map((h) =>
          h.slot === actorSlot
            ? { ...h, powerUpTurns: Math.max(0, h.powerUpTurns - 1), mana: char.mana }
            : h
        ),
      };
      b = pushLog(b, message);
    } else if (role === "heal" || role === "buff") {
      const allyId = resolveAllyTargetId(b, actorSlot, opts.targetId);
      const allyHero = b.heroes.find((h) => h.id === allyId);
      if (!allyHero || allyHero.hp <= 0) {
        return { world: { ...world, battle: b }, message: "No living ally there." };
      }
      const allyChar =
        allyHero.slot === actorSlot ? char : world.characters[allyHero.slot];
      if (!allyChar) {
        return { world: { ...world, battle: b }, message: "Ally missing." };
      }

      const eff = computeEffectiveStats(char);
      const roc = resolveRoc({
        attributeScore: eff.stats.wisdom,
        skillValue: Math.max(ab.power, 4) * 2,
        situational: pathwaySituational(world),
        rng,
      });
      b = recordRoc(b, roc);
      b = pushFx(b, "buff", 0, allyId, {
        source: actorSlot,
        tone: role === "heal" ? "heal" : "buff",
      });

      if (role === "heal") {
        const heal = Math.max(
          1,
          Math.round(ab.power * Math.max(0.4, roc.tier.severity + 0.3))
        );
        const beforeHp = allyChar.hp;
        const healedChar = {
          ...allyChar,
          hp: Math.min(battleMaxHp(allyChar), allyChar.hp + heal),
        };
        if (allyHero.slot === actorSlot) {
          char = healedChar;
          if (roc.tier.xpBonus > 0) char = applyXp(char, roc.tier.xpBonus);
        } else if (roc.tier.xpBonus > 0) {
          char = applyXp(char, roc.tier.xpBonus);
        }
        b = syncHeroFromChar(b, allyHero.slot, healedChar);
        b = syncHeroFromChar(b, actorSlot, char);
        b = upsertHeroStatus(b, allyId, { id: "healed", turns: 1 });
        b = pushFx(b, "heal", healedChar.hp - beforeHp, allyId);
        message = `${char.name} casts ${ab.name} on ${allyHero.name} — ${roc.label} → +${heal} HP.`;
      } else {
        // Ward / buff: short Power Up + status icon on the target.
        const turns = Math.max(1, Math.min(3, Math.round(ab.power / 4) || 2));
        b = {
          ...b,
          heroes: b.heroes.map((h) =>
            h.id === allyId
              ? { ...h, powerUpTurns: Math.max(h.powerUpTurns, turns) }
              : h
          ),
        };
        b = upsertHeroStatus(b, allyId, {
          id: ab.tags.includes("ward") || ab.tags.includes("defend") ? "warded" : "powered",
          turns,
        });
        if (roc.tier.xpBonus > 0) char = applyXp(char, roc.tier.xpBonus);
        b = syncHeroFromChar(b, actorSlot, char);
        message = `${char.name} casts ${ab.name} on ${allyHero.name} — ${roc.label} (+${turns} turn buff).`;
      }
      b = { ...b, stats: { ...b.stats, turns: b.stats.turns + 1 } };
      b = pushLog(b, message);
    } else {
      return { world, message: "That ability cannot be used in battle." };
    }
  } else {
    return { world, message: "Unknown action." };
  }

  if (!endTurn) {
    return {
      world: { ...world, characters: { ...world.characters, [actorSlot]: char }, battle: b },
      message,
    };
  }

  let nextWorld: PartyWorldSave = {
    ...world,
    characters: { ...world.characters, [actorSlot]: char },
    battle: b,
  };
  nextWorld = maybeResolveEnd(nextWorld, nextWorld.battle!, actorSlot, rng);
  if (nextWorld.battle?.status !== "active") {
    return { world: nextWorld, message };
  }

  // Advance to next; if enemy pack, auto-resolve all consecutive foe turns
  let nb = advanceBattleTurn(nextWorld.battle!);
  nextWorld = { ...nextWorld, battle: nb };
  if (isEnemyCombatantId(nb.activeId)) {
    nextWorld = resolveEnemyPhase(nextWorld, nextWorld.battle!, rng);
  }

  return { world: nextWorld, message };
}

export function dismissBattleSummary(world: PartyWorldSave): PartyWorldSave {
  if (!world.battle || world.battle.status === "active") return world;
  return {
    ...world,
    battle: null,
    log: [`Battle ended — returning to the road.`, ...world.log].slice(0, 80),
  };
}

export function battleRemainingMs(battle: BattleState, nowMs = Date.now()): number {
  const started = Date.parse(battle.startedAt) || nowMs;
  if (nowMs < started) return BATTLE_MAX_MS;
  return Math.max(0, BATTLE_MAX_MS - (nowMs - started));
}

export function turnIdleRemainingMs(battle: BattleState, nowMs = Date.now()): number {
  const started = Date.parse(battle.turnStartedAt ?? battle.startedAt) || nowMs;
  if (nowMs < started) return TURN_IDLE_MS;
  return Math.max(0, TURN_IDLE_MS - (nowMs - started));
}

/**
 * DM clock tick during active battle:
 * - 10 min hard cap → defeat
 * - 30s idle on a hero turn → skip that hero; foe strikes
 */
export function tickBattleTimers(
  world: PartyWorldSave,
  nowMs = Date.now(),
  rng: () => number = Math.random
): { world: PartyWorldSave; message?: string } {
  let battle = world.battle;
  if (!battle || battle.status !== "active") return { world };

  // DungeonTester (and other clockMode:"off" callers): keep intro, skip pressure clocks.
  if (battle.clockMode === "off") return { world };

  // Freeze both sides during the opening countdown.
  if (isBattleIntroActive(battle, nowMs)) return { world };

  battle = ensureTactical(battle, world);
  if (battle !== world.battle) {
    world = { ...world, battle };
  }

  if (battleRemainingMs(battle, nowMs) <= 0) {
    const next = finishDefeat(
      world,
      battle,
      "Time! The clash hits the 10-minute hard cap — the party breaks."
    );
    return { world: next, message: "Battle timed out (10 min)." };
  }

  // Only idle-skip hero turns (enemy pack already auto-resolves after player acts).
  if (isEnemyCombatantId(battle.activeId)) return { world };

  if (turnIdleRemainingMs(battle, nowMs) > 0) return { world };

  const hesitator =
    battle.heroes.find((h) => h.id === battle.activeId)?.name ??
    getPetByUnitId(battle, battle.activeId)?.name ??
    "A companion";
  const packLabel = packTitle(battleEnemyPack(battle));
  let nextWorld: PartyWorldSave = {
    ...world,
    battle: pushLog(
      battle,
      `${hesitator} hesitates too long — ${packLabel} seizes the opening!`
    ),
  };
  let nb = advanceBattleTurn(nextWorld.battle!);
  // Jump to first living enemy if advance landed on another party unit — force foe strike on idle.
  if (!isEnemyCombatantId(nb.activeId)) {
    const enemyIdx = nb.turnQueue.findIndex(
      (id) =>
        isEnemyCombatantId(id) &&
        (getEnemyByUnitId(nb, id)?.hp ?? 0) > 0
    );
    if (enemyIdx >= 0) {
      nb = {
        ...nb,
        turnIndex: enemyIdx,
        activeId: nb.turnQueue[enemyIdx]!,
        turnStartedAt: new Date(nowMs).toISOString(),
      };
    }
  }
  nextWorld = { ...nextWorld, battle: nb };
  if (isEnemyCombatantId(nb.activeId)) {
    nextWorld = resolveEnemyPhase(nextWorld, nextWorld.battle!, rng);
  }
  return {
    world: nextWorld,
    message: `${packLabel} strikes while the party idles.`,
  };
}

/** Read a spellbook from inventory — teaches the spell. */
export function readSpellbook(
  world: PartyWorldSave,
  slot: PlayerSlot,
  itemId: string
): { world: PartyWorldSave; message: string } {
  if (!isSpellbookItem(itemId)) return { world, message: "Not a spellbook." };
  const char = world.characters[slot];
  if (!char.inventory.includes(itemId)) return { world, message: "Not in inventory." };
  const book = getSpellbook(itemId);
  if (!book) return { world, message: "Unknown spellbook." };
  if (char.abilities.includes(book.teachesAbilityId)) {
    return { world, message: `Already know ${book.ability.name}.` };
  }
  const inv = consumeOne(char.inventory, itemId);
  if (!inv) return { world, message: "Spellbook missing." };
  const abilities = [...char.abilities, book.teachesAbilityId];
  let hotbar = [...char.hotbar];
  const empty = hotbar.findIndex((s) => s == null);
  if (empty >= 0) hotbar[empty] = book.teachesAbilityId;
  const next: CharacterSave = { ...char, inventory: inv, abilities, hotbar };
  return {
    world: {
      ...world,
      characters: { ...world.characters, [slot]: next },
      log: [`${char.name} reads ${book.name} — learns ${book.ability.name}!`, ...world.log].slice(
        0,
        80
      ),
    },
    message: `Learned ${book.ability.name}!`,
  };
}

export function ensureEncounterSchedule(world: PartyWorldSave): PartyWorldSave {
  const fought = world.battlesFought ?? 0;
  const storyPlayMs = world.storyPlayMs ?? 0;
  const nextAt = world.nextEncounterAtMs;
  // Missing / zero schedule, or leftover waits from older longer cadences → cap at 90s.
  if (
    nextAt == null ||
    nextAt <= 0 ||
    nextAt - storyPlayMs > AMBUSH_INTERVAL_MS
  ) {
    return {
      ...world,
      storyPlayMs,
      battlesFought: fought,
      nextEncounterAtMs: storyPlayMs + AMBUSH_INTERVAL_MS,
    };
  }
  return {
    ...world,
    storyPlayMs,
    battlesFought: fought,
  };
}

/**
 * Pause ambush clock during fights / battle summary — not during conversation or path
 * choices (those are eligible story play; pausing them starved ambushes after the
 * dialogue-pause change).
 */
export function isAmbushTimerPaused(world: PartyWorldSave): boolean {
  if (world.battle) return true;
  if (world.deckEncounter) return true;
  // Only pause while a road/story foe still has HP (0 must not stick the clock).
  if (world.encounterEnemyHp != null && world.encounterEnemyHp > 0) return true;
  const node = getStoryNode(world.campaignNodeId);
  return node?.kind === "encounter";
}

export function tickStoryPlay(
  world: PartyWorldSave,
  deltaMs: number
): { world: PartyWorldSave; shouldStartBattle: boolean } {
  if (world.battle?.status === "active") {
    return { world, shouldStartBattle: false };
  }
  if (world.battle?.status === "victory" || world.battle?.status === "defeat") {
    return { world, shouldStartBattle: false };
  }
  if (world.endingId) return { world, shouldStartBattle: false };
  if (isAmbushTimerPaused(world)) {
    return { world, shouldStartBattle: false };
  }

  let next = ensureEncounterSchedule(world);
  const storyPlayMs = (next.storyPlayMs ?? 0) + Math.max(0, deltaMs);
  next = { ...next, storyPlayMs };
  const due = storyPlayMs >= (next.nextEncounterAtMs ?? Number.POSITIVE_INFINITY);
  return { world: next, shouldStartBattle: due };
}
