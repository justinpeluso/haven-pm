/**
 * HoMM-style grid tactics for Neverworld battles.
 * Pure helpers — battle.ts owns damage / XP / loot.
 */

import type {
  BattleEnemyState,
  BattleHeroState,
  BattleState,
  BattleTacticalState,
  BattleTacticalUnit,
  CharacterSave,
  ClassId,
  PartyWorldSave,
  PlayerSlot,
} from "./types";

/** Wide enough for 4 heroes west + up to 8 foes east without stacking. */
export const TACTICAL_COLS = 10;
export const TACTICAL_ROWS = 8;

const RANGED_CLASSES = new Set<ClassId>([
  "ranger",
  "mage",
  "warlock",
  "sorcerer",
  "priest",
  "evoker",
  "necromancer",
  "battlemage",
  "warden",
]);

export function chebyshev(ax: number, ay: number, bx: number, by: number): number {
  return Math.max(Math.abs(ax - bx), Math.abs(ay - by));
}

export function manhattan(ax: number, ay: number, bx: number, by: number): number {
  return Math.abs(ax - bx) + Math.abs(ay - by);
}

export function inBounds(
  x: number,
  y: number,
  cols = TACTICAL_COLS,
  rows = TACTICAL_ROWS
): boolean {
  return x >= 0 && y >= 0 && x < cols && y < rows;
}

/** Combatant ids for enemy tokens (`enemy`, `enemy-1`, …). */
export function isEnemyCombatantId(id: string): boolean {
  return id === "enemy" || /^enemy-\d+$/.test(id);
}

export function enemyUnitIdForIndex(index: number): string {
  return index === 0 ? "enemy" : `enemy-${index}`;
}

function heroSpeed(char: CharacterSave | undefined): number {
  const dex = char?.stats.dexterity ?? 10;
  return Math.max(2, Math.min(4, 2 + Math.floor(dex / 6)));
}

function heroRange(char: CharacterSave | undefined): number {
  if (!char) return 1;
  if (RANGED_CLASSES.has(char.classId)) return 2;
  return 1;
}

function enemySpeed(power: number): number {
  return Math.max(2, Math.min(4, 2 + Math.floor(power / 12)));
}

function enemyRange(isBoss: boolean, power: number): number {
  if (isBoss && power >= 18) return 2;
  return 1;
}

function occupiedSet(units: BattleTacticalUnit[], exceptId?: string): Set<string> {
  const s = new Set<string>();
  for (const u of units) {
    if (exceptId && u.id === exceptId) continue;
    s.add(`${u.x},${u.y}`);
  }
  return s;
}

function normalizeEnemies(
  enemy: BattleState["enemy"],
  enemies?: BattleEnemyState[]
): BattleEnemyState[] {
  if (enemies?.length) return enemies;
  return [{ ...enemy, unitId: enemy.unitId ?? "enemy" }];
}

/** Spread `count` units across `rows` without overlapping y when possible. */
function spacedRows(count: number, rows: number): number[] {
  if (count <= 0) return [];
  if (count === 1) return [Math.floor((rows - 1) / 2)];
  if (count >= rows) return Array.from({ length: count }, (_, i) => i % rows);
  const out: number[] = [];
  for (let i = 0; i < count; i++) {
    out.push(Math.round((i * (rows - 1)) / (count - 1)));
  }
  return out;
}

/**
 * East-side foe slots: fill the rear column first, then stagger one column west
 * so up to 8 units never share a tile.
 */
function eastSlots(
  count: number,
  cols = TACTICAL_COLS,
  rows = TACTICAL_ROWS
): { x: number; y: number }[] {
  const rearX = cols - 2;
  const frontX = cols - 3;
  const ys = spacedRows(Math.min(count, rows), rows);
  const slots: { x: number; y: number }[] = [];
  for (let i = 0; i < count; i++) {
    if (i < rows) {
      slots.push({ x: rearX, y: ys[i] ?? i % rows });
    } else {
      // Second wave: stagger west, offset y by 1 when possible for a zigzag.
      const y = (ys[i - rows] ?? (i - rows) % rows + 1) % rows;
      slots.push({ x: frontX, y });
    }
  }
  // Deduplicate any collisions by walking north.
  const used = new Set<string>();
  return slots.map((s) => {
    let { x, y } = s;
    let guard = 0;
    while (used.has(`${x},${y}`) && guard++ < cols * rows) {
      y = (y + 1) % rows;
      if (guard === rows) x = Math.max(cols - 4, x - 1);
    }
    used.add(`${x},${y}`);
    return { x, y };
  });
}

/** Place party on the west edge, foes on the east (no stacked tiles). */
export function createTacticalState(
  heroes: BattleHeroState[],
  enemyOrPack: BattleState["enemy"] | BattleEnemyState[],
  world: PartyWorldSave,
  enemiesOpt?: BattleEnemyState[]
): BattleTacticalState {
  const living = heroes.filter((h) => h.hp > 0);
  const units: BattleTacticalUnit[] = [];
  const heroYs = spacedRows(living.length, TACTICAL_ROWS);

  living.forEach((h, i) => {
    const char = world.characters[h.slot];
    units.push({
      id: h.id,
      side: "party",
      heroSlot: h.slot,
      x: 1,
      y: heroYs[i] ?? Math.min(TACTICAL_ROWS - 1, i),
      speed: heroSpeed(char),
      range: heroRange(char),
    });
  });

  const pack = Array.isArray(enemyOrPack)
    ? enemyOrPack
    : normalizeEnemies(enemyOrPack, enemiesOpt);

  const livingFoes = pack.filter((e) => e.hp > 0);
  const foeSlots = eastSlots(livingFoes.length);

  livingFoes.forEach((e, i) => {
    const unitId = e.unitId ?? enemyUnitIdForIndex(i);
    const slot = foeSlots[i] ?? {
      x: TACTICAL_COLS - 2,
      y: i % TACTICAL_ROWS,
    };
    units.push({
      id: unitId,
      side: "enemy",
      x: slot.x,
      y: slot.y,
      speed: enemySpeed(e.power),
      range: enemyRange(e.isBoss, e.power),
    });
  });

  return {
    cols: TACTICAL_COLS,
    rows: TACTICAL_ROWS,
    units,
    phase: "move",
  };
}

/** Hydrate missing tactical layer (legacy in-progress battles). */
export function ensureTactical(
  battle: BattleState,
  world: PartyWorldSave
): BattleState {
  if (
    battle.tactical &&
    battle.tactical.cols > 0 &&
    battle.tactical.rows > 0 &&
    battle.tactical.units?.length
  ) {
    return battle;
  }
  const pack = normalizeEnemies(battle.enemy, battle.enemies);
  return {
    ...battle,
    enemies: pack,
    tactical: createTacticalState(battle.heroes, pack, world),
    log: [
      "The field stretches into a chessboard of grass — choose your steps.",
      ...battle.log,
    ].slice(0, 40),
  };
}

export function getUnit(
  tactical: BattleTacticalState,
  id: string
): BattleTacticalUnit | undefined {
  return tactical.units.find((u) => u.id === id);
}

export function unitAt(
  tactical: BattleTacticalState,
  x: number,
  y: number
): BattleTacticalUnit | undefined {
  return tactical.units.find((u) => u.x === x && u.y === y);
}

/** BFS reachable tiles within `speed` steps (4-dir), blocked by other units. */
export function legalMoves(
  tactical: BattleTacticalState,
  unitId: string
): { x: number; y: number }[] {
  const unit = getUnit(tactical, unitId);
  if (!unit || unit.speed <= 0) return [];
  const blocked = occupiedSet(tactical.units, unitId);
  const seen = new Set<string>([`${unit.x},${unit.y}`]);
  const out: { x: number; y: number }[] = [];
  const q: { x: number; y: number; d: number }[] = [{ x: unit.x, y: unit.y, d: 0 }];

  while (q.length) {
    const cur = q.shift()!;
    if (cur.d >= unit.speed) continue;
    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = cur.x + dx;
      const ny = cur.y + dy;
      const key = `${nx},${ny}`;
      if (!inBounds(nx, ny, tactical.cols, tactical.rows)) continue;
      if (seen.has(key)) continue;
      if (blocked.has(key)) continue;
      seen.add(key);
      out.push({ x: nx, y: ny });
      q.push({ x: nx, y: ny, d: cur.d + 1 });
    }
  }
  return out;
}

export function canStrike(
  attacker: BattleTacticalUnit,
  target: BattleTacticalUnit
): boolean {
  return chebyshev(attacker.x, attacker.y, target.x, target.y) <= attacker.range;
}

export function moveUnit(
  tactical: BattleTacticalState,
  unitId: string,
  x: number,
  y: number
): BattleTacticalState | null {
  const moves = legalMoves(tactical, unitId);
  if (!moves.some((m) => m.x === x && m.y === y)) return null;
  return {
    ...tactical,
    units: tactical.units.map((u) => (u.id === unitId ? { ...u, x, y } : u)),
    phase: "act",
  };
}

export function setPhase(
  tactical: BattleTacticalState,
  phase: BattleTacticalState["phase"]
): BattleTacticalState {
  return { ...tactical, phase };
}

export function resetPhaseForTurn(tactical: BattleTacticalState): BattleTacticalState {
  return { ...tactical, phase: "move" };
}

/** Pick nearest living party unit for AI. */
export function nearestPartyTarget(
  tactical: BattleTacticalState,
  from: BattleTacticalUnit,
  livingHeroIds: Set<string>
): BattleTacticalUnit | null {
  let best: BattleTacticalUnit | null = null;
  let bestDist = Infinity;
  for (const u of tactical.units) {
    if (u.side !== "party" || !livingHeroIds.has(u.id)) continue;
    const d = manhattan(from.x, from.y, u.x, u.y);
    if (d < bestDist) {
      bestDist = d;
      best = u;
    }
  }
  return best;
}

/** Nearest living enemy token (for default Attack targeting). */
export function nearestEnemyTarget(
  tactical: BattleTacticalState,
  from: BattleTacticalUnit,
  livingEnemyIds: Set<string>
): BattleTacticalUnit | null {
  let best: BattleTacticalUnit | null = null;
  let bestDist = Infinity;
  for (const u of tactical.units) {
    if (u.side !== "enemy" || !livingEnemyIds.has(u.id)) continue;
    const d = manhattan(from.x, from.y, u.x, u.y);
    if (d < bestDist) {
      bestDist = d;
      best = u;
    }
  }
  return best;
}

/**
 * Greedy step toward target: choose legal tile that minimizes distance,
 * preferring closer Chebyshev for attack setup.
 */
export function aiChooseMove(
  tactical: BattleTacticalState,
  enemyId: string,
  target: BattleTacticalUnit
): { x: number; y: number } | null {
  const enemy = getUnit(tactical, enemyId);
  if (!enemy) return null;
  if (canStrike(enemy, target)) return null; // already in range — stay
  const moves = legalMoves(tactical, enemyId);
  if (!moves.length) return null;

  let best = moves[0]!;
  let bestScore = Infinity;
  for (const m of moves) {
    const dist = manhattan(m.x, m.y, target.x, target.y);
    const cheb = chebyshev(m.x, m.y, target.x, target.y);
    // Prefer tiles that enter attack range, then closer Manhattan.
    const inRangeBonus = cheb <= enemy.range ? -100 : 0;
    const score = dist * 10 + cheb + inRangeBonus;
    if (score < bestScore) {
      bestScore = score;
      best = m;
    }
  }
  return best;
}

export function applyAiMove(
  tactical: BattleTacticalState,
  enemyId: string,
  target: BattleTacticalUnit
): BattleTacticalState {
  const dest = aiChooseMove(tactical, enemyId, target);
  if (!dest) return { ...tactical, phase: "act" };
  const moved = moveUnit(tactical, enemyId, dest.x, dest.y);
  return moved ?? { ...tactical, phase: "act" };
}

export function removeDeadHeroUnits(
  tactical: BattleTacticalState,
  heroes: BattleHeroState[]
): BattleTacticalState {
  const living = new Set(heroes.filter((h) => h.hp > 0).map((h) => h.id));
  return {
    ...tactical,
    units: tactical.units.filter((u) => u.side === "enemy" || living.has(u.id)),
  };
}

export function removeDeadEnemyUnits(
  tactical: BattleTacticalState,
  enemies: BattleEnemyState[]
): BattleTacticalState {
  const living = new Set(
    enemies
      .filter((e) => e.hp > 0)
      .map((e, i) => e.unitId ?? enemyUnitIdForIndex(i))
  );
  return {
    ...tactical,
    units: tactical.units.filter((u) => u.side === "party" || living.has(u.id)),
  };
}

export function slotOfActiveHero(battle: BattleState): PlayerSlot | null {
  const h = battle.heroes.find((x) => x.id === battle.activeId);
  return h?.slot ?? null;
}
