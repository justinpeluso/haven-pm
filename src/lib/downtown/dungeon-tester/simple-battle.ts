/**
 * DungeonTester crude battle — fixed clip-art spots, no movement.
 * Player party acts first (attack / buff / heal / potion / magic);
 * enemies auto-attack from place. Haste → 2 actions that round.
 */

import { getGear } from "@/lib/downtown/party-chronicle/gear";
import type { CharacterSave, PlayerSlot } from "@/lib/downtown/party-chronicle/types";
import { PLAYER_SLOT_ORDER } from "@/lib/downtown/party-chronicle/types";
import {
  getDtBoss,
  getDtCreature,
  rollDtCreature,
  rollDtRandomFoe,
  type DtCreatureDef,
} from "./bestiary";
import { getDtGear } from "./gear";
import { rollDtEncounterForLevel } from "./encounters";
import { chapterForFrame } from "./story";
import { rollNextEncounterAtFrame } from "./persist";
import type { DtWorldSave } from "./types";

export type SimpleBattleActionId =
  | "attack"
  | "buff"
  | "heal"
  | "potion"
  | "magic";

export type SimpleBattleStatus = "active" | "victory" | "defeat";
export type SimpleBattlePhase = "player" | "enemy" | "summary";

export type SimpleMapTheme =
  | "dust-road"
  | "chain-yard"
  | "thorn-hills"
  | "cave"
  | "swamp"
  | "ruins"
  | "forest"
  | "campfire";

export type SimpleBattleUnit = {
  id: string;
  side: "hero" | "enemy";
  slot?: PlayerSlot;
  name: string;
  color: string;
  hp: number;
  maxHp: number;
  power: number;
  armor: number;
  /** Fixed spot on the field (percent). Never move. */
  x: number;
  y: number;
  haste: boolean;
  hasteRounds: number;
  /** Actions left this round (1, or 2 under Haste). */
  actionsLeft: number;
  /** Mana pool for magic (heroes). */
  mana: number;
  maxMana: number;
  /** Stamina (heroes) — shown on FF-style HUD. */
  stamina: number;
  maxStamina: number;
  /** Hero class clip-art / enemy plate id. */
  artId?: string;
  classId?: string;
};

export type SimpleBattleFx = {
  id: string;
  kind: "ray" | "float";
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
};

export type SimpleBattleState = {
  /** Stable across poll/persist merges — splash shows once per id. */
  id: string;
  status: SimpleBattleStatus;
  phase: SimpleBattlePhase;
  round: number;
  mapTheme: SimpleMapTheme;
  mapVariant: number;
  chapterId: string;
  units: SimpleBattleUnit[];
  /** Whose turn within player phase (optional UI highlight). */
  focusHeroId: string | null;
  log: string[];
  fx: SimpleBattleFx[];
  goldReward: number;
  xpReward: number;
  message: string;
  /** Set after START BATTLE splash finishes; never restart for this id. */
  splashDone?: boolean;
};

export const SIMPLE_BATTLE_ACTIONS: {
  id: SimpleBattleActionId;
  label: string;
  needsTarget: "enemy" | "ally" | "self" | "none";
}[] = [
  { id: "attack", label: "Attack", needsTarget: "enemy" },
  { id: "buff", label: "Buff (Haste)", needsTarget: "ally" },
  { id: "heal", label: "Heal", needsTarget: "ally" },
  { id: "potion", label: "Drink potion", needsTarget: "self" },
  { id: "magic", label: "Magic attack", needsTarget: "enemy" },
];

const HERO_COLORS: Record<PlayerSlot, string> = {
  justin: "#3b6ea5",
  rusty: "#b85c38",
  elisha: "#5a8f4a",
  eric: "#7a4aa0",
};

const ENEMY_COLORS = ["#8b2e2e", "#5c4033", "#4a5560", "#6b3a2a", "#3d4a2e"];

const MAGIC_COST = 6;
const HEAL_AMOUNT = 18;
const POTION_HEAL = 28;
const BUFF_ROUNDS = 3;

function uid(prefix: string): string {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`;
}

function partyLevel(world: DtWorldSave): number {
  const levels = Object.values(world.characters)
    .filter((c) => c.created)
    .map((c) => c.level ?? 1);
  if (!levels.length) return 1;
  return Math.max(1, Math.round(levels.reduce((a, b) => a + b, 0) / levels.length));
}

/** Parse chapter number from ids like `dt-ch-01-chain-road` / `ch1-trail`. */
export function chapterNumberFromId(chapterId: string): number {
  const m =
    /(?:^|-)ch-?0*(\d+)/i.exec(chapterId) ??
    /^(\d+)/.exec(chapterId);
  return m ? Math.max(1, Math.min(9, Number(m[1]))) : 1;
}

/**
 * Early chapters: fewer foes + softer HP/damage.
 * Later chapters ramp toward full bestiary stats and 1–3 packs.
 */
export function encounterSpawnTuning(
  chapterNum: number,
  battlesFought: number
): { foeCount: (rng: () => number) => number; hpMult: number; powerMult: number } {
  const firstAmbush = battlesFought <= 0;
  if (chapterNum <= 1) {
    return {
      foeCount: () => 1,
      hpMult: firstAmbush ? 0.55 : 0.65,
      powerMult: firstAmbush ? 0.5 : 0.6,
    };
  }
  if (chapterNum === 2) {
    return {
      foeCount: (rng) => (rng() < 0.75 ? 1 : 2),
      hpMult: 0.75,
      powerMult: 0.7,
    };
  }
  if (chapterNum === 3) {
    return {
      foeCount: (rng) => (rng() < 0.55 ? 1 : 2),
      hpMult: 0.85,
      powerMult: 0.8,
    };
  }
  if (chapterNum <= 5) {
    return {
      foeCount: (rng) => {
        const roll = rng();
        if (roll < 0.4) return 1;
        if (roll < 0.85) return 2;
        return 3;
      },
      hpMult: 0.95,
      powerMult: 0.9,
    };
  }
  // Ch 6–9: full pressure
  return {
    foeCount: (rng) => 1 + Math.floor(rng() * 3),
    hpMult: 1,
    powerMult: 1,
  };
}

function resolveGear(id: string | null | undefined) {
  if (!id) return undefined;
  return getDtGear(id) ?? getGear(id);
}

function heroWeaponPower(char: CharacterSave): number {
  const weaponId = char.equipped?.weapon;
  const gear = resolveGear(weaponId ?? undefined);
  const base = gear?.power ?? 4;
  const str = char.stats?.strength ?? 10;
  return Math.max(2, base + Math.floor((str - 10) / 2));
}

function heroMagicPower(char: CharacterSave): number {
  const int = char.stats?.intelligence ?? 10;
  const wis = char.stats?.wisdom ?? 10;
  return Math.max(3, 6 + Math.floor((int + wis - 20) / 2) + (char.level ?? 1));
}

function findPotion(char: CharacterSave): string | null {
  for (const id of char.inventory ?? []) {
    const g = resolveGear(id);
    if (!g) continue;
    if (g.slot === "consumable" && (g.heal ?? 0) > 0) return id;
    if (g.tags?.includes("potion") && (g.heal ?? 0) > 0) return id;
  }
  return null;
}

function removeOneInventory(char: CharacterSave, itemId: string): CharacterSave {
  const inv = [...(char.inventory ?? [])];
  const i = inv.indexOf(itemId);
  if (i >= 0) inv.splice(i, 1);
  return { ...char, inventory: inv };
}

/** Map theme from chapter id / enemy theme tags. */
export function mapThemeForWorld(world: DtWorldSave, rng: () => number = Math.random): {
  theme: SimpleMapTheme;
  variant: number;
} {
  const ch = chapterForFrame(world.campaignNodeId);
  const id = `${world.chapterId} ${(ch?.enemyThemes ?? []).join(" ")}`.toLowerCase();
  let theme: SimpleMapTheme = "dust-road";
  if (/cave|mine|tunnel|dark/.test(id)) theme = "cave";
  else if (/swamp|mire|bog|marsh/.test(id)) theme = "swamp";
  else if (/forest|wood|grove|thorn/.test(id)) theme = "forest";
  else if (/ruin|tomb|temple|stone/.test(id)) theme = "ruins";
  else if (/yard|cage|collar|chain|coffle/.test(id)) theme = "chain-yard";
  else if (/hill|orc|camp/.test(id)) theme = "thorn-hills";
  else if (/camp|rest|fire/.test(id)) theme = "campfire";
  return { theme, variant: Math.floor(rng() * 3) };
}

function resolveFoeDef(
  entryId: string,
  level: number,
  rng: () => number
): DtCreatureDef {
  const bare = entryId.replace(/^act-\d+-/, "");
  const hit = getDtCreature(bare) ?? getDtBoss(bare) ?? getDtCreature(entryId) ?? getDtBoss(entryId);
  if (hit) return hit;
  return rollDtRandomFoe(level, rng);
}

/** Fixed hero lanes — left side of the field. */
const HERO_SPOTS: { x: number; y: number }[] = [
  { x: 18, y: 28 },
  { x: 14, y: 48 },
  { x: 20, y: 68 },
  { x: 12, y: 86 },
];

/** Fixed enemy lanes — right side. */
const ENEMY_SPOTS: { x: number; y: number }[] = [
  { x: 78, y: 32 },
  { x: 84, y: 52 },
  { x: 76, y: 72 },
];

function living(units: SimpleBattleUnit[], side?: "hero" | "enemy"): SimpleBattleUnit[] {
  return units.filter((u) => u.hp > 0 && (!side || u.side === side));
}

function syncHeroHpFromUnits(
  world: DtWorldSave,
  units: SimpleBattleUnit[]
): DtWorldSave["characters"] {
  const characters = { ...world.characters };
  for (const u of units) {
    if (u.side !== "hero" || !u.slot) continue;
    const c = characters[u.slot];
    if (!c?.created) continue;
    characters[u.slot] = {
      ...c,
      hp: Math.max(0, Math.min(c.maxHp, u.hp)),
      mana: Math.max(0, Math.min(c.maxMana, u.mana)),
    };
  }
  return characters;
}

function grantRewards(
  world: DtWorldSave,
  battle: SimpleBattleState
): DtWorldSave["characters"] {
  const heroes = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (!heroes.length) return world.characters;
  const goldEach = Math.floor(battle.goldReward / heroes.length);
  const xpEach = Math.floor(battle.xpReward / heroes.length);
  const characters = { ...world.characters };
  for (const slot of heroes) {
    const c = characters[slot]!;
    characters[slot] = {
      ...c,
      gold: (c.gold ?? 0) + goldEach,
      xp: (c.xp ?? 0) + xpEach,
      hp: Math.max(1, Math.min(c.maxHp, living(battle.units, "hero").find((u) => u.slot === slot)?.hp ?? c.hp)),
      mana: Math.max(0, Math.min(c.maxMana, living(battle.units, "hero").find((u) => u.slot === slot)?.mana ?? c.mana)),
    };
  }
  return characters;
}

function softRecoverParty(world: DtWorldSave): DtWorldSave["characters"] {
  const characters = { ...world.characters };
  for (const slot of PLAYER_SLOT_ORDER) {
    const c = characters[slot];
    if (!c?.created) continue;
    characters[slot] = {
      ...c,
      hp: Math.max(1, Math.floor(c.maxHp * 0.55)),
      mana: Math.max(0, Math.floor(c.maxMana * 0.45)),
      stamina: Math.max(0, Math.floor(c.maxStamina * 0.6)),
    };
  }
  return characters;
}

function resetRoundActions(units: SimpleBattleUnit[]): SimpleBattleUnit[] {
  return units.map((u) => {
    if (u.hp <= 0) return { ...u, actionsLeft: 0 };
    return { ...u, actionsLeft: u.haste ? 2 : 1 };
  });
}

function tickHaste(units: SimpleBattleUnit[]): SimpleBattleUnit[] {
  return units.map((u) => {
    if (!u.haste) return u;
    const left = u.hasteRounds - 1;
    if (left <= 0) return { ...u, haste: false, hasteRounds: 0 };
    return { ...u, hasteRounds: left };
  });
}

function pushLog(battle: SimpleBattleState, line: string): SimpleBattleState {
  return { ...battle, log: [line, ...battle.log].slice(0, 24) };
}

function checkEnd(battle: SimpleBattleState): SimpleBattleState {
  const heroes = living(battle.units, "hero");
  const foes = living(battle.units, "enemy");
  if (!foes.length) {
    return {
      ...battle,
      status: "victory",
      phase: "summary",
      fx: [],
      message: `Victory! +${battle.goldReward}g · +${battle.xpReward} XP`,
      focusHeroId: null,
    };
  }
  if (!heroes.length) {
    return {
      ...battle,
      status: "defeat",
      phase: "summary",
      fx: [],
      message: "Defeat — limp back to the road (soft recover).",
      focusHeroId: null,
    };
  }
  return battle;
}

function heroesStillActing(units: SimpleBattleUnit[]): boolean {
  return living(units, "hero").some((u) => u.actionsLeft > 0);
}

function nextFocusHero(units: SimpleBattleUnit[], preferId?: string | null): string | null {
  const ready = living(units, "hero").filter((u) => u.actionsLeft > 0);
  if (!ready.length) return null;
  if (preferId && ready.some((u) => u.id === preferId)) return preferId;
  return ready[0]!.id;
}

/** Deterministic id for legacy saves that predate battle.id. */
export function ensureSimpleBattleId(battle: SimpleBattleState): SimpleBattleState {
  if (battle.id) return battle;
  const enemyIds = battle.units
    .filter((u) => u.side === "enemy")
    .map((u) => u.id)
    .join("|");
  return {
    ...battle,
    id: `legacy-${battle.chapterId}:${battle.mapTheme}:${battle.mapVariant}:${enemyIds}`,
  };
}

/** Combat already underway — never show START BATTLE splash. */
const COMBAT_LOG_RE =
  /\b(hits|strikes|casts|heals|drinks|grants Haste|swigs)\b|— Round /i;

/**
 * Splash only for brand-new fights (round 1, player phase, intro log only).
 * Mid-fight remounts / poll merges must never restart the intro.
 */
export function simpleBattleShouldSkipSplash(battle: SimpleBattleState): boolean {
  if (battle.splashDone) return true;
  if (battle.status !== "active" || battle.phase === "summary") return true;
  if (battle.round >= 2) return true;
  if (battle.phase === "enemy") return true;
  if (battle.log.some((line) => COMBAT_LOG_RE.test(line))) return true;
  return false;
}

/** Stamp splashDone when the fight is already past intro (load / poll / remount). */
export function ensureSimpleBattleSplashConsistency(
  battle: SimpleBattleState
): SimpleBattleState {
  const withId = ensureSimpleBattleId(battle);
  if (withId.splashDone) return withId;
  if (simpleBattleShouldSkipSplash(withId)) {
    return { ...withId, splashDone: true };
  }
  return withId;
}

/** Higher = further along; used so stale persist responses cannot roll back a turn. */
export function simpleBattleProgressScore(battle: SimpleBattleState): number {
  const phaseOrd =
    battle.phase === "summary" ? 3 : battle.phase === "enemy" ? 1 : 0;
  const statusOrd =
    battle.status === "victory" || battle.status === "defeat" ? 100 : 0;
  return (
    statusOrd +
    battle.round * 10 +
    phaseOrd +
    (battle.splashDone ? 0.5 : 0) +
    Math.min(battle.log.length, 24) * 0.01
  );
}

export function markSimpleBattleSplashDone(world: DtWorldSave): DtWorldSave {
  if (!world.battle || world.battle.splashDone) return world;
  return {
    ...world,
    battle: { ...world.battle, splashDone: true },
  };
}

export function startSimpleBattle(
  world: DtWorldSave,
  opts?: { foeId?: string; rng?: () => number }
): { world: DtWorldSave; message: string } {
  // Block while any battle overlay is open (active or summary).
  if (world.battle) {
    return { world, message: "Already in a fight." };
  }
  const rng = opts?.rng ?? Math.random;
  const lvl = partyLevel(world);
  const sealed = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (!sealed.length) return { world, message: "Seal a hero first." };

  const chapterNum = chapterNumberFromId(world.chapterId);
  const tuning = encounterSpawnTuning(chapterNum, world.battlesFought ?? 0);
  const foeCount = tuning.foeCount(rng);
  /** Cap creature level by chapter so Ch1 never rolls Night-Howlers, etc. */
  const maxCreatureLevel =
    chapterNum <= 1 ? 3 : chapterNum <= 2 ? 6 : chapterNum <= 3 ? 10 : chapterNum <= 5 ? 18 : 99;
  const foes: DtCreatureDef[] = [];
  if (opts?.foeId) {
    foes.push(resolveFoeDef(opts.foeId, lvl, rng));
    while (foes.length < foeCount) {
      foes.push(rollDtCreature(lvl, rng, { maxCreatureLevel }));
    }
  } else {
    const fromDeck = rollDtEncounterForLevel(Math.min(lvl, maxCreatureLevel), rng);
    const lead = resolveFoeDef(fromDeck.id, lvl, rng);
    // Reject leads far above chapter band (deck ids can alias tough plates).
    if ((lead.levelMin ?? 1) <= maxCreatureLevel + 2) {
      foes.push(lead);
    } else {
      foes.push(rollDtCreature(lvl, rng, { maxCreatureLevel }));
    }
    while (foes.length < foeCount) {
      foes.push(rollDtCreature(lvl, rng, { maxCreatureLevel }));
    }
  }

  const heroUnits: SimpleBattleUnit[] = sealed.map((slot, i) => {
    const c = world.characters[slot]!;
    const spot = HERO_SPOTS[i] ?? { x: 16, y: 40 + i * 18 };
    return {
      id: `hero-${slot}`,
      side: "hero",
      slot,
      name: c.name || slot,
      color: HERO_COLORS[slot],
      hp: Math.max(1, c.hp),
      maxHp: c.maxHp,
      power: heroWeaponPower(c),
      armor: 0,
      x: spot.x,
      y: spot.y,
      haste: false,
      hasteRounds: 0,
      actionsLeft: 1,
      mana: c.mana ?? 0,
      maxMana: c.maxMana ?? 0,
      stamina: c.stamina ?? 0,
      maxStamina: c.maxStamina ?? 0,
      classId: c.classId,
    };
  });

  const enemyUnits: SimpleBattleUnit[] = foes.map((f, i) => {
    const spot = ENEMY_SPOTS[i] ?? { x: 80, y: 40 + i * 16 };
    const levelScale = 1 + (lvl - 1) * 0.08;
    const hp = Math.max(6, Math.round(f.hp * levelScale * tuning.hpMult));
    const power = Math.max(1, Math.round(f.power * levelScale * tuning.powerMult));
    return {
      id: `enemy-${f.id}-${i}`,
      side: "enemy",
      name: f.name,
      color: ENEMY_COLORS[i % ENEMY_COLORS.length]!,
      hp,
      maxHp: hp,
      power,
      armor: chapterNum <= 2 ? 0 : (f.armor ?? 0),
      x: spot.x,
      y: spot.y,
      haste: false,
      hasteRounds: 0,
      actionsLeft: 1,
      mana: 0,
      maxMana: 0,
      stamina: 0,
      maxStamina: 0,
      artId: f.artId,
    };
  });

  const { theme, variant } = mapThemeForWorld(world, rng);
  const goldReward = foes.reduce((s, f) => s + (f.gold ?? 0), 0);
  const xpReward = foes.reduce((s, f) => s + (f.xp ?? 0), 0);

  const battle: SimpleBattleState = {
    id: uid("bat"),
    status: "active",
    phase: "player",
    round: 1,
    mapTheme: theme,
    mapVariant: variant,
    chapterId: world.chapterId,
    units: [...heroUnits, ...enemyUnits],
    focusHeroId: heroUnits[0]?.id ?? null,
    log: [`Ambush! ${foes.map((f) => f.name).join(", ")} — party acts first.`],
    fx: [],
    goldReward,
    xpReward,
    message: `Fight! ${foes.length} foe${foes.length === 1 ? "" : "s"} on the ${theme.replace(/-/g, " ")}.`,
    splashDone: false,
  };

  return {
    world: {
      ...world,
      battle,
      clearedBattleId: null,
      framesSinceEncounter: 0,
      nextEncounterAtFrame: rollNextEncounterAtFrame(world.framesAdvanced, rng),
      updatedAt: new Date().toISOString(),
      log: [battle.message, ...world.log].slice(0, 80),
    },
    message: battle.message,
  };
}

function applyDamage(
  units: SimpleBattleUnit[],
  targetId: string,
  raw: number
): { units: SimpleBattleUnit[]; dealt: number } {
  const next = units.map((u) => {
    if (u.id !== targetId || u.hp <= 0) return u;
    const dealt = Math.max(1, raw - (u.armor ?? 0));
    return { ...u, hp: Math.max(0, u.hp - dealt) };
  });
  const before = units.find((u) => u.id === targetId);
  const after = next.find((u) => u.id === targetId);
  const dealt = Math.max(0, (before?.hp ?? 0) - (after?.hp ?? 0));
  return { units: next, dealt };
}

function spendHeroAction(units: SimpleBattleUnit[], heroId: string): SimpleBattleUnit[] {
  return units.map((u) =>
    u.id === heroId ? { ...u, actionsLeft: Math.max(0, u.actionsLeft - 1) } : u
  );
}

/** Run one enemy's in-place attack at a random living hero. */
function enemyActInPlace(
  battle: SimpleBattleState,
  enemy: SimpleBattleUnit,
  rng: () => number
): SimpleBattleState {
  const heroes = living(battle.units, "hero");
  if (!heroes.length || enemy.hp <= 0) return battle;
  const target = heroes[Math.floor(rng() * heroes.length)]!;
  const raw = enemy.power + Math.floor(rng() * 4);
  const { units, dealt } = applyDamage(battle.units, target.id, raw);
  const fxId = uid("fx");
  let next: SimpleBattleState = {
    ...battle,
    units,
    fx: [
      { id: fxId, kind: "ray", fromId: enemy.id, toId: target.id, color: "#c44" },
      {
        id: uid("flt"),
        kind: "float",
        fromId: enemy.id,
        toId: target.id,
        label: `−${dealt}`,
        color: "#ff6b4a",
      },
    ],
  };
  next = pushLog(next, `${enemy.name} strikes ${target.name} for ${dealt}.`);
  return checkEnd(next);
}

function runEnemyPhase(
  battle: SimpleBattleState,
  rng: () => number = Math.random
): SimpleBattleState {
  let next: SimpleBattleState = { ...battle, phase: "enemy", fx: [] };
  const foes = living(next.units, "enemy");
  for (const foe of foes) {
    if (next.status !== "active") break;
    next = enemyActInPlace(next, foe, rng);
  }
  if (next.status !== "active") return next;

  // New round — tick haste, refresh actions, player first again.
  let units = tickHaste(next.units);
  units = resetRoundActions(units);
  next = {
    ...next,
    units,
    phase: "player",
    round: next.round + 1,
    focusHeroId: nextFocusHero(units),
    // Keep last enemy ray/float so the crude UI can play it out.
    message: `Round ${next.round + 1} — your party.`,
  };
  return pushLog(next, `— Round ${next.round} —`);
}

export function performSimpleBattleAction(
  world: DtWorldSave,
  heroId: string,
  action: SimpleBattleActionId,
  targetId?: string,
  rng: () => number = Math.random
): { world: DtWorldSave; message: string } {
  const battle = world.battle;
  if (!battle || battle.status !== "active") {
    return { world, message: "No active fight." };
  }
  if (battle.phase !== "player") {
    return { world, message: "Wait for the enemy turn." };
  }

  const hero = battle.units.find((u) => u.id === heroId && u.side === "hero");
  if (!hero || hero.hp <= 0) return { world, message: "That hero is down." };
  if (hero.actionsLeft <= 0) return { world, message: "That hero already acted." };

  let nextBattle: SimpleBattleState = { ...battle, fx: [], focusHeroId: heroId };
  let characters = { ...world.characters };
  let message = "";

  if (action === "attack") {
    if (!targetId) return { world, message: "Pick an enemy." };
    const foe = living(nextBattle.units, "enemy").find((u) => u.id === targetId);
    if (!foe) return { world, message: "Invalid target." };
    const raw = hero.power + Math.floor(rng() * 5);
    const { units, dealt } = applyDamage(nextBattle.units, foe.id, raw);
    nextBattle = {
      ...nextBattle,
      units: spendHeroAction(units, heroId),
      fx: [
        { id: uid("fx"), kind: "ray", fromId: heroId, toId: foe.id, color: "#f5d76e" },
        {
          id: uid("flt"),
          kind: "float",
          fromId: heroId,
          toId: foe.id,
          label: `−${dealt}`,
          color: "#ffef9a",
        },
      ],
    };
    message = `${hero.name} hits ${foe.name} for ${dealt}.`;
    nextBattle = pushLog(nextBattle, message);
  } else if (action === "magic") {
    if (!targetId) return { world, message: "Pick an enemy." };
    const foe = living(nextBattle.units, "enemy").find((u) => u.id === targetId);
    if (!foe) return { world, message: "Invalid target." };
    if (hero.mana < MAGIC_COST) return { world, message: "Not enough mana." };
    const char = hero.slot ? characters[hero.slot] : null;
    const raw = (char ? heroMagicPower(char) : hero.power + 4) + Math.floor(rng() * 6);
    const { units, dealt } = applyDamage(nextBattle.units, foe.id, raw);
    const afterMana = units.map((u) =>
      u.id === heroId ? { ...u, mana: Math.max(0, u.mana - MAGIC_COST) } : u
    );
    nextBattle = {
      ...nextBattle,
      units: spendHeroAction(afterMana, heroId),
      fx: [
        { id: uid("fx"), kind: "ray", fromId: heroId, toId: foe.id, color: "#7ec8ff" },
        {
          id: uid("flt"),
          kind: "float",
          fromId: heroId,
          toId: foe.id,
          label: `−${dealt}`,
          color: "#a8e0ff",
        },
      ],
    };
    message = `${hero.name} casts at ${foe.name} for ${dealt}.`;
    nextBattle = pushLog(nextBattle, message);
  } else if (action === "heal") {
    const allyId = targetId ?? heroId;
    const ally = living(nextBattle.units, "hero").find((u) => u.id === allyId);
    if (!ally) return { world, message: "Invalid ally." };
    const heal = HEAL_AMOUNT + Math.floor(rng() * 6);
    const units = nextBattle.units.map((u) =>
      u.id === allyId ? { ...u, hp: Math.min(u.maxHp, u.hp + heal) } : u
    );
    nextBattle = {
      ...nextBattle,
      units: spendHeroAction(units, heroId),
      fx: [
        {
          id: uid("flt"),
          kind: "float",
          fromId: heroId,
          toId: allyId,
          label: `+${heal}`,
          color: "#7dff9a",
        },
      ],
    };
    message = `${hero.name} heals ${ally.name} for ${heal}.`;
    nextBattle = pushLog(nextBattle, message);
  } else if (action === "buff") {
    const allyId = targetId ?? heroId;
    const ally = living(nextBattle.units, "hero").find((u) => u.id === allyId);
    if (!ally) return { world, message: "Invalid ally." };
    const units = nextBattle.units.map((u) => {
      if (u.id !== allyId) return u;
      return {
        ...u,
        haste: true,
        hasteRounds: BUFF_ROUNDS,
        // Extra action this round if they still had one left.
        actionsLeft: Math.max(u.actionsLeft, u.id === heroId ? u.actionsLeft : u.actionsLeft + 1),
      };
    });
    // Spend caster's action after applying buff; if self-buff, grant the haste extra after spend.
    let after = spendHeroAction(units, heroId);
    after = after.map((u) => {
      if (u.id !== allyId) return u;
      if (u.id === heroId) {
        // Self-haste: get one more action this round (net: spent 1, left with 1 if had 1).
        return { ...u, actionsLeft: Math.max(u.actionsLeft, 1), haste: true, hasteRounds: BUFF_ROUNDS };
      }
      return { ...u, haste: true, hasteRounds: BUFF_ROUNDS, actionsLeft: Math.max(u.actionsLeft, 2) };
    });
    nextBattle = {
      ...nextBattle,
      units: after,
      fx: [
        {
          id: uid("flt"),
          kind: "float",
          fromId: heroId,
          toId: allyId,
          label: "Haste!",
          color: "#ffe066",
        },
      ],
    };
    message = `${hero.name} grants Haste to ${ally.name}.`;
    nextBattle = pushLog(nextBattle, message);
  } else if (action === "potion") {
    if (!hero.slot) return { world, message: "No inventory." };
    const char = characters[hero.slot];
    if (!char) return { world, message: "Missing character." };
    const potionId = findPotion(char);
    const heal = potionId
      ? Math.max(POTION_HEAL, resolveGear(potionId)?.heal ?? POTION_HEAL)
      : Math.floor(POTION_HEAL * 0.6);
    if (potionId) {
      characters[hero.slot] = removeOneInventory(char, potionId);
    }
    const units = nextBattle.units.map((u) =>
      u.id === heroId ? { ...u, hp: Math.min(u.maxHp, u.hp + heal) } : u
    );
    nextBattle = {
      ...nextBattle,
      units: spendHeroAction(units, heroId),
      fx: [
        {
          id: uid("flt"),
          kind: "float",
          fromId: heroId,
          toId: heroId,
          label: `+${heal}`,
          color: "#ff8ec8",
        },
      ],
    };
    message = potionId
      ? `${hero.name} drinks a potion (+${heal} HP).`
      : `${hero.name} swigs a canteen (+${heal} HP).`;
    nextBattle = pushLog(nextBattle, message);
  } else {
    return { world, message: "Unknown action." };
  }

  nextBattle = checkEnd(nextBattle);
  characters = syncHeroHpFromUnits({ ...world, characters }, nextBattle.units);

  if (nextBattle.status === "victory" || nextBattle.status === "defeat") {
    return finishBattle({ ...world, characters }, nextBattle);
  }

  if (!heroesStillActing(nextBattle.units)) {
    // Hold on enemy phase with player FX still painted — UI calls
    // advanceSimpleBattleEnemyPhase after rays/floats play out.
    nextBattle = {
      ...nextBattle,
      phase: "enemy",
      focusHeroId: null,
      message: "Enemy turn…",
    };
  } else {
    nextBattle = {
      ...nextBattle,
      focusHeroId: nextFocusHero(nextBattle.units, heroId),
    };
  }

  return {
    world: {
      ...world,
      characters,
      battle: nextBattle,
      updatedAt: new Date().toISOString(),
    },
    message: nextBattle.message || message,
  };
}

/**
 * Resolve the deferred enemy phase after player VFX.
 * Safe no-op if battle is not waiting on enemies.
 */
export function advanceSimpleBattleEnemyPhase(
  world: DtWorldSave,
  rng: () => number = Math.random
): { world: DtWorldSave; message: string } {
  const battle = world.battle;
  if (!battle || battle.status !== "active" || battle.phase !== "enemy") {
    return { world, message: "" };
  }

  let nextBattle = runEnemyPhase(battle, rng);
  let characters = syncHeroHpFromUnits(world, nextBattle.units);

  if (nextBattle.status === "victory" || nextBattle.status === "defeat") {
    return finishBattle({ ...world, characters }, nextBattle);
  }

  return {
    world: {
      ...world,
      characters,
      battle: nextBattle,
      updatedAt: new Date().toISOString(),
    },
    message: nextBattle.message,
  };
}

function finishBattle(
  world: DtWorldSave,
  battle: SimpleBattleState
): { world: DtWorldSave; message: string } {
  if (battle.status === "victory") {
    const characters = grantRewards(world, battle);
    return {
      world: {
        ...world,
        characters,
        battle: { ...battle, phase: "summary", fx: [] },
        battlesFought: (world.battlesFought ?? 0) + 1,
        framesSinceEncounter: 0,
        nextEncounterAtFrame: rollNextEncounterAtFrame(world.framesAdvanced),
        updatedAt: new Date().toISOString(),
        log: [battle.message, ...world.log].slice(0, 80),
      },
      message: battle.message,
    };
  }
  // Defeat — soft recover, stay on summary until dismiss.
  const characters = softRecoverParty(world);
  return {
    world: {
      ...world,
      characters,
      battle: { ...battle, phase: "summary", fx: [] },
      battlesFought: (world.battlesFought ?? 0) + 1,
      framesSinceEncounter: 0,
      nextEncounterAtFrame: rollNextEncounterAtFrame(world.framesAdvanced),
      updatedAt: new Date().toISOString(),
      log: [battle.message, ...world.log].slice(0, 80),
    },
    message: battle.message,
  };
}

/** Clear summary overlay and return to story. */
export function dismissSimpleBattle(world: DtWorldSave): DtWorldSave {
  if (!world.battle) return world;
  if (world.battle.status === "active") return world;
  return {
    ...world,
    clearedBattleId: world.battle.id,
    battle: null,
    updatedAt: new Date().toISOString(),
  };
}

/** Clear floating FX after animation (keep battle state). */
export function clearSimpleBattleFx(world: DtWorldSave): DtWorldSave {
  if (!world.battle?.fx?.length) return world;
  return {
    ...world,
    battle: { ...world.battle, fx: [] },
  };
}

export function isSimpleBattleActive(world: DtWorldSave): boolean {
  return world.battle?.status === "active";
}

/** True for DT crude battles (drops legacy Neverworld BattleState blobs). */
export function isSimpleBattleState(raw: unknown): raw is SimpleBattleState {
  if (!raw || typeof raw !== "object") return false;
  const b = raw as Partial<SimpleBattleState>;
  return Array.isArray(b.units) && typeof b.mapTheme === "string" && typeof b.phase === "string";
}

/** Prefer keeping splashDone / same id when two active blobs race. */
export function mergeSimpleBattle(
  a: SimpleBattleState | null | undefined,
  b: SimpleBattleState | null | undefined
): SimpleBattleState | null {
  if (!a && !b) return null;
  if (a && !b) return ensureSimpleBattleSplashConsistency(a);
  if (!a && b) return ensureSimpleBattleSplashConsistency(b);
  const left = ensureSimpleBattleSplashConsistency(a!);
  const right = ensureSimpleBattleSplashConsistency(b!);
  if (left.status === "active" && right.status !== "active") return left;
  if (right.status === "active" && left.status !== "active") return right;
  if (left.status === "active" && right.status === "active") {
    // Same fight — keep further-along copy; splashDone is sticky OR once true.
    if (left.id === right.id) {
      const newer =
        simpleBattleProgressScore(right) > simpleBattleProgressScore(left)
          ? right
          : left;
      const older = newer === right ? left : right;
      return ensureSimpleBattleSplashConsistency({
        ...newer,
        splashDone: !!(left.splashDone || right.splashDone),
        units: newer.units.length ? newer.units : older.units,
      });
    }
    // Distinct ambushes — keep left (caller ordered prefer-local).
    return ensureSimpleBattleSplashConsistency({
      ...left,
      splashDone: !!(left.splashDone || right.splashDone),
    });
  }
  // Summaries — prefer higher progress.
  return simpleBattleProgressScore(right) >= simpleBattleProgressScore(left)
    ? right
    : left;
}

/**
 * Abort an active fight (flee / soft-lock escape). Soft-recovers party and clears
 * the overlay so testing can recover without victory/defeat.
 */
export function fleeSimpleBattle(world: DtWorldSave): {
  world: DtWorldSave;
  message: string;
} {
  if (!world.battle) return { world, message: "No fight to flee." };
  const wasActive = world.battle.status === "active";
  const clearedId = world.battle.id;
  const characters = softRecoverParty(world);
  return {
    world: {
      ...world,
      characters,
      battle: null,
      /** Session + persist hint: do not resurrect this fight from poll/server. */
      clearedBattleId: clearedId,
      battlesFought: (world.battlesFought ?? 0) + (wasActive ? 1 : 0),
      framesSinceEncounter: 0,
      nextEncounterAtFrame: rollNextEncounterAtFrame(world.framesAdvanced),
      updatedAt: new Date().toISOString(),
      log: ["Fled the ambush (soft recover).", ...world.log].slice(0, 80),
    },
    message: "Fled the ambush — soft recover. Story resumes.",
  };
}

/**
 * Drop a remote/active battle when the client already fled/dismissed that id.
 * Prevents poll/out-of-order POST from resurrecting a cleared fight.
 */
export function applyClearedBattleGuard(
  world: DtWorldSave,
  remoteBattle: SimpleBattleState | null | undefined
): SimpleBattleState | null {
  const cleared = world.clearedBattleId;
  if (!remoteBattle) return null;
  if (cleared && remoteBattle.id === cleared) return null;
  return ensureSimpleBattleSplashConsistency(remoteBattle);
}
