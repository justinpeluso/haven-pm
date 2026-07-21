/**
 * DungeonTester crude battle — fixed clip-art spots, no movement.
 * Player party acts first (attack / buff / heal / potion / magic);
 * enemies auto-attack from place. Haste → 2 actions that round.
 *
 * ## Battle FSM (single authority — this file owns transitions)
 *
 *   WORLD (battle=null)
 *     → startSimpleBattle → INTRO (!splashDone, phase=player, round=1)
 *     → markSimpleBattleSplashDone → PLAYER
 *     → performSimpleBattleAction (last hero spent) → ENEMY
 *     → advanceSimpleBattleEnemyPhase → PLAYER (round++) | ENDED
 *     → perform/advance kill → ENDED (summary)
 *     → dismissSimpleBattle | fleeSimpleBattle → WORLD
 *
 * Illegal: PLAYER→INTRO, INTRO→INTRO, ENEMY→INTRO, mid-fight restart.
 * UI timers may delay ENEMY resolve; they must not invent state.
 * Entry wrappers live in battle.ts; overlays never mint battles.
 */

import { getGear } from "@/lib/downtown/party-chronicle/gear";
import {
  battleArmor,
  computeEffectiveStats,
} from "@/lib/downtown/party-chronicle/stats";
import type { CharacterSave, PlayerSlot } from "@/lib/downtown/party-chronicle/types";
import { PLAYER_SLOT_ORDER } from "@/lib/downtown/party-chronicle/types";
import { resolveWeaponScaling, scaleByStat } from "./weapon-scaling";
import {
  getDtBattleLootItem,
  getDtBoss,
  getDtCreature,
  rollDtCreature,
  rollDtLootFromPool,
  rollDtRandomFoe,
  type DtCreatureDef,
  type DtLootPoolId,
} from "./bestiary";
import { getDtGear } from "./gear";
import { rollDtEncounterForLevel } from "./encounters";
import { chapterForFrame } from "./story";
import { rollNextEncounterAtFrame } from "./persist";
import type { DtWorldSave } from "./types";
import {
  dtDogAfterBattle,
  dtDogAfterWipe,
  dtDogBattlePower,
  dtDogJoinsBattle,
  normalizeDtDog,
} from "./dog";
import {
  applyFetchedCompanionXp,
  sexLabel,
} from "./fetch";
import { RACE_DEFS } from "@/lib/downtown/party-chronicle/races";
import { CLASS_DEFS } from "@/lib/downtown/party-chronicle/players";
import { normalizeDtHeroLook, type DtHeroLook } from "./look";
import { rollNightCreature } from "./night-creatures";
import {
  getDtDogPokeCard,
  getDtPokeCard,
  getDtUnarmedPokeCard,
  getDtWeaponPokeCard,
  pickDtPokeMove,
  synthesizeCompanionPokeCard,
  type DtPokeMoveDef,
} from "./poke-cards";

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
  /** Companion dog — present on field, no player action budget. */
  isDog?: boolean;
  /** Dog-fetched trail person — playable like a hero. */
  isCompanion?: boolean;
  companionId?: string;
  /** Frontier look for DT hero art (not Neverworld class plates). */
  look?: DtHeroLook;
  /** Enemy bestiary id (for loot pool). */
  foeDefId?: string;
  lootPool?: DtLootPoolId | string;
  /** Poke-card move rotation cursor. */
  moveCursor?: number;
  /** Skip actions while > 0 (decremented each new round). */
  stunRounds?: number;
  /** DoT-lite stacks; tick once per round start. */
  poisonStacks?: number;
  /** Temporary power from buff moves. */
  powerBuff?: number;
  powerBuffRounds?: number;
};

/** Visual recipe for overlay VFX — keeps actions visually distinct. */
export type SimpleBattleFxStyle =
  | "slash"
  | "magic"
  | "heal"
  | "haste"
  | "potion"
  | "enemy"
  | "dog";

export type SimpleBattleFx = {
  id: string;
  /** ray = line, bolt = traveling projectile, burst = impact ring, aura = ally pulse/shimmer, float = number/label */
  kind: "ray" | "float" | "bolt" | "burst" | "aura";
  fromId: string;
  toId: string;
  label?: string;
  color?: string;
  style?: SimpleBattleFxStyle;
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
  /** Running fight tallies (end screen). */
  combatStats?: SimpleBattleCombatStats;
  /** Items rolled on victory (defeat usually empty). */
  lootDrops?: SimpleBattleLootDrop[];
  /** True until dismiss applies gold/xp/loot to sealed heroes. */
  rewardsPending?: boolean;
  /** Camp sleep night ambush — same wipe path, night-flavored copy. */
  nightAmbush?: boolean;
  /** Foes present at ambush start (for domination half-kill math). */
  initialEnemyCount?: number;
  /** Mid-fight reinforcement — at most one spawn per battle. */
  reinforcementSpawned?: boolean;
  /** Party level stamped at start (reinforcement scaling). */
  partyLevel?: number;
};

export type SimpleBattleLootDrop = {
  itemId: string;
  name: string;
  blurb?: string;
};

export type SimpleBattleCombatStats = {
  damageDealt: number;
  damageTaken: number;
  foesDefeated: number;
  rounds: number;
};

/** High-level stage for logging / UI (intro is splashDone gate, not phase). */
export type SimpleBattleFsmStage =
  | "WORLD"
  | "INTRO"
  | "PLAYER"
  | "ENEMY"
  | "ENDED";

export function simpleBattleFsmStage(
  battle: SimpleBattleState | null | undefined
): SimpleBattleFsmStage {
  if (!battle) return "WORLD";
  if (battle.status !== "active" || battle.phase === "summary") return "ENDED";
  if (battle.phase === "enemy") return "ENEMY";
  if (!battle.splashDone && battle.round <= 1 && battle.phase === "player") {
    return "INTRO";
  }
  return "PLAYER";
}

/** DEV-only transition log — quiet in production. */
export function logSimpleBattleFsm(
  prev: SimpleBattleFsmStage,
  next: SimpleBattleFsmStage,
  via: string
): void {
  if (process.env.NODE_ENV !== "development") return;
  if (prev === next) return;
  // eslint-disable-next-line no-console -- intentional FSM debug
  console.log(`[Battle FSM] ${prev} -> ${next} (${via})`);
}

/** Stamp FSM log on every world mutation that owns battle transitions. */
function withBattleTransition(
  prevWorld: DtWorldSave,
  nextWorld: DtWorldSave,
  via: string
): DtWorldSave {
  logSimpleBattleFsm(
    simpleBattleFsmStage(prevWorld.battle),
    simpleBattleFsmStage(nextWorld.battle),
    via
  );
  return nextWorld;
}

/**
 * Repair soft-locks without reopening auto-combat:
 * - player + zero actionsLeft → defer ENEMY
 * - bare enemy (no hero spent) → snap PLAYER (poll regression guard)
 */
export function repairSimpleBattleTurnInvariant(
  battle: SimpleBattleState
): SimpleBattleState {
  if (battle.status !== "active" || battle.phase === "summary") return battle;
  const spent = simpleBattleHeroActionsSpent(battle);
  if (battle.phase === "enemy" && spent === 0) {
    return {
      ...battle,
      phase: "player",
      focusHeroId: nextFocusHero(battle.units),
    };
  }
  if (
    battle.phase === "player" &&
    !heroesStillActing(battle.units) &&
    living(battle.units, "enemy").length > 0
  ) {
    return {
      ...battle,
      phase: "enemy",
      focusHeroId: null,
      message: "Enemy turn…",
    };
  }
  return battle;
}

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
 * Early chapters: softer HP/damage; testing dial currently floors packs at 2 foes.
 * Later chapters ramp toward full bestiary stats and 2–3 packs.
 */
export function encounterSpawnTuning(
  chapterNum: number,
  battlesFought: number
): { foeCount: (rng: () => number) => number; hpMult: number; powerMult: number } {
  const firstAmbush = battlesFought <= 0;
  // Difficulty dial-in: always 2 foes from the first ambush so packs feel real.
  if (chapterNum <= 1) {
    return {
      foeCount: () => 2,
      hpMult: firstAmbush ? 0.55 : 0.65,
      powerMult: firstAmbush ? 0.5 : 0.6,
    };
  }
  if (chapterNum === 2) {
    return {
      foeCount: () => 2,
      hpMult: 0.75,
      powerMult: 0.7,
    };
  }
  if (chapterNum === 3) {
    return {
      foeCount: (rng) => (rng() < 0.65 ? 2 : 3),
      hpMult: 0.85,
      powerMult: 0.8,
    };
  }
  if (chapterNum <= 5) {
    return {
      foeCount: (rng) => (rng() < 0.7 ? 2 : 3),
      hpMult: 0.95,
      powerMult: 0.9,
    };
  }
  // Ch 6–9: full pressure, still at least a pair
  return {
    foeCount: (rng) => 2 + Math.floor(rng() * 2),
    hpMult: 1,
    powerMult: 1,
  };
}

function resolveGear(id: string | null | undefined) {
  if (!id) return undefined;
  return getDtGear(id) ?? getGear(id);
}

/** Flat weapon/gear ATK — style attribute scales at hit time (not baked STR). */
function heroWeaponPower(char: CharacterSave): number {
  return Math.max(2, computeEffectiveStats(char).atk);
}

function heroArmorRating(char: CharacterSave): number {
  return Math.max(0, Math.min(14, battleArmor(char)));
}

/** Flat magic base; INT scales at cast time via scaleByStat. */
function heroMagicBase(char: CharacterSave): number {
  return Math.max(3, 6 + (char.level ?? 1));
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

/** Dog sits slightly ahead/below their owner. */
const DOG_SPOT_OFFSET = { x: 10, y: 10 };
const COMPANION_SPOT_OFFSET = { x: -8, y: 12 };

/** Fixed enemy lanes — right side. Max living reinforcements share these. */
const ENEMY_SPOTS: { x: number; y: number }[] = [
  { x: 78, y: 32 },
  { x: 84, y: 52 },
  { x: 76, y: 72 },
];

const MAX_ENEMY_UNITS = ENEMY_SPOTS.length;

function buildEnemyUnit(
  f: DtCreatureDef,
  index: number,
  opts: {
    partyLevel: number;
    chapterNum: number;
    hpMult: number;
    powerMult: number;
    rng: () => number;
  }
): SimpleBattleUnit {
  const spot =
    ENEMY_SPOTS[index] ??
    {
      x: 80 + (index % 2) * 4,
      y: 40 + index * 12,
    };
  const levelScale = 1 + (opts.partyLevel - 1) * 0.08;
  const hp = Math.max(6, Math.round(f.hp * levelScale * opts.hpMult));
  const power = Math.max(1, Math.round(f.power * levelScale * opts.powerMult));
  return {
    id: `enemy-${f.id}-${index}-${uid("r")}`,
    side: "enemy",
    name: f.name,
    color: ENEMY_COLORS[index % ENEMY_COLORS.length]!,
    hp,
    maxHp: hp,
    power,
    armor: opts.chapterNum <= 2 ? 0 : Math.min(f.armor ?? 0, 4),
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
    foeDefId: f.id,
    lootPool: f.lootPool,
    moveCursor: Math.floor(
      opts.rng() * Math.max(1, getDtPokeCard(f.id)?.moves.length ?? 1)
    ),
    stunRounds: 0,
    poisonStacks: 0,
    powerBuff: 0,
    powerBuffRounds: 0,
  };
}

/**
 * Party is dominating when clearly ahead on the board.
 * Any one of:
 * - living enemy HP fraction ≤ 40%
 * - foes defeated ≥ half of initial pack AND no player hero down
 * - party HP% ≥ enemy HP% + 30 and enemies under 55%
 */
export function isSimpleBattleDominating(battle: SimpleBattleState): boolean {
  const heroes = livingPlayerHeroes(battle.units);
  const foes = living(battle.units, "enemy");
  if (!heroes.length || !foes.length) return false;

  const enemyHp = foes.reduce((s, u) => s + u.hp, 0);
  const enemyMax = foes.reduce((s, u) => s + u.maxHp, 0);
  const enemyPct = enemyMax > 0 ? enemyHp / enemyMax : 1;

  const partyHp = heroes.reduce((s, u) => s + u.hp, 0);
  const partyMax = heroes.reduce((s, u) => s + u.maxHp, 0);
  const partyPct = partyMax > 0 ? partyHp / partyMax : 0;

  if (enemyPct <= 0.4) return true;

  const initial = battle.initialEnemyCount ?? foes.length;
  const defeated = battle.units.filter((u) => u.side === "enemy" && u.hp <= 0).length;
  const anyHeroDown = battle.units.some(
    (u) => u.side === "hero" && !u.isDog && u.hp <= 0
  );
  if (defeated >= Math.ceil(initial / 2) && !anyHeroDown) return true;

  if (partyPct >= enemyPct + 0.3 && enemyPct < 0.55) return true;

  return false;
}

/**
 * Mid-fight reinforcement (once per battle):
 * Trigger when round ≥ 2 OR at least one foe has fallen, and the party is
 * dominating. Spawns 1 foe from the same chapter/night pool, scaled like the
 * opening ambush. Never if won/lost, already reinforced, or living foes already
 * fill every lane (no cascade).
 */
export function maybeSpawnBattleReinforcement(
  battle: SimpleBattleState,
  rng: () => number = Math.random
): SimpleBattleState {
  if (battle.status !== "active" || battle.phase === "summary") return battle;
  if (battle.reinforcementSpawned) return battle;

  const livingFoes = living(battle.units, "enemy");
  if (!livingFoes.length) return battle; // victory path owns the end
  if (livingFoes.length >= MAX_ENEMY_UNITS) return battle;

  const defeated = battle.units.filter((u) => u.side === "enemy" && u.hp <= 0).length;
  const midFight = battle.round >= 2 || defeated >= 1;
  if (!midFight) return battle;
  if (!isSimpleBattleDominating(battle)) return battle;

  const chapterNum = chapterNumberFromId(battle.chapterId);
  const lvl = Math.max(1, battle.partyLevel ?? 1);
  const tuning = encounterSpawnTuning(chapterNum, 1); // mid-fight: use non-first-ambush dial
  const maxCreatureLevel =
    chapterNum <= 1 ? 3 : chapterNum <= 2 ? 6 : chapterNum <= 3 ? 10 : chapterNum <= 5 ? 18 : 99;

  const def = battle.nightAmbush
    ? rollNightCreature(rng)
    : rollDtCreature(lvl, rng, { maxCreatureLevel });

  const index = battle.units.filter((u) => u.side === "enemy").length;
  const unit = buildEnemyUnit(def, index, {
    partyLevel: lvl,
    chapterNum,
    hpMult: tuning.hpMult,
    powerMult: tuning.powerMult,
    rng,
  });

  const pulp =
    battle.nightAmbush
      ? `Reinforcement! ${def.name} slips from the dark — the fire wasn't enough.`
      : `Reinforcement! ${def.name} answers the dust — the road won't let you stroll.`;

  let next: SimpleBattleState = {
    ...battle,
    units: [...battle.units, unit],
    reinforcementSpawned: true,
    goldReward: battle.goldReward + (def.gold ?? 0),
    xpReward: battle.xpReward + (def.xp ?? 0),
    message: pulp,
    fx: [
      {
        id: uid("fx"),
        kind: "burst",
        style: "enemy",
        fromId: unit.id,
        toId: unit.id,
        color: "#e85a3a",
      },
      {
        id: uid("flt"),
        kind: "float",
        style: "enemy",
        fromId: unit.id,
        toId: unit.id,
        label: "Reinforcement!",
        color: "#ffc4b0",
      },
    ],
  };
  next = pushLog(next, pulp);
  return next;
}

function living(units: SimpleBattleUnit[], side?: "hero" | "enemy"): SimpleBattleUnit[] {
  return units.filter((u) => u.hp > 0 && (!side || u.side === side));
}

/** Sealed player heroes only — dogs do not hold the turn or decide defeat. */
function livingPlayerHeroes(units: SimpleBattleUnit[]): SimpleBattleUnit[] {
  return living(units, "hero").filter((u) => !u.isDog);
}

function livingDogs(units: SimpleBattleUnit[]): SimpleBattleUnit[] {
  return living(units, "hero").filter((u) => !!u.isDog);
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
    if (u.isDog) {
      const dog = normalizeDtDog(c.dog);
      characters[u.slot] = {
        ...c,
        dog: {
          ...dog,
          hp: Math.max(0, Math.min(dog.maxHp, u.hp)),
        },
      };
      continue;
    }
    if (u.isCompanion) {
      const fetched = c.fetchedCompanion;
      if (!fetched || (u.companionId && fetched.id !== u.companionId)) continue;
      characters[u.slot] = {
        ...c,
        fetchedCompanion: {
          ...fetched,
          hp: Math.max(0, Math.min(fetched.maxHp, u.hp)),
          mana: Math.max(0, Math.min(fetched.maxMana, u.mana)),
        },
      };
      continue;
    }
    characters[u.slot] = {
      ...c,
      hp: Math.max(0, Math.min(c.maxHp, u.hp)),
      mana: Math.max(0, Math.min(c.maxMana, u.mana)),
    };
  }
  return characters;
}

function chapterLootPool(chapterId: string): DtLootPoolId {
  const n = chapterNumberFromId(chapterId);
  if (n <= 1) return "trash";
  if (n <= 2) return "common";
  if (n <= 4) return "magic";
  if (n <= 6) return "rare";
  return "legendary";
}

function lootName(itemId: string): string {
  return (
    getDtBattleLootItem(itemId)?.name ??
    getDtGear(itemId)?.name ??
    itemId.replace(/^dt-/, "").replace(/-/g, " ")
  );
}

/** Roll comic loot for the end screen — at least one drop on victory. */
export function rollSimpleBattleLoot(
  battle: SimpleBattleState,
  rng: () => number = Math.random
): SimpleBattleLootDrop[] {
  const fallen = battle.units.filter((u) => u.side === "enemy" && u.hp <= 0);
  const drops: SimpleBattleLootDrop[] = [];
  const seen = new Set<string>();
  const pushDrop = (itemId: string | undefined) => {
    if (!itemId || seen.has(itemId)) return;
    seen.add(itemId);
    const item = getDtBattleLootItem(itemId) ?? getDtGear(itemId);
    const blurb =
      item && "blurb" in item && (item as { blurb?: string }).blurb
        ? String((item as { blurb?: string }).blurb)
        : undefined;
    drops.push({ itemId, name: lootName(itemId), blurb });
  };

  for (const foe of fallen) {
    const pool =
      (foe.lootPool as string | undefined) ??
      getDtCreature(foe.foeDefId ?? "")?.lootPool ??
      getDtBoss(foe.foeDefId ?? "")?.lootPool ??
      chapterLootPool(battle.chapterId);
    const always = pool === "rare" || pool === "legendary";
    if (!always && rng() > 0.7) continue;
    pushDrop(rollDtLootFromPool(String(pool), rng)?.id);
  }

  for (const foe of fallen) {
    const boss = getDtBoss(foe.foeDefId ?? "");
    if (!boss?.uniqueDrops?.length) continue;
    if (rng() > 0.55) continue;
    const id = boss.uniqueDrops[Math.floor(rng() * boss.uniqueDrops.length)];
    pushDrop(id);
  }

  if (!drops.length) {
    pushDrop(rollDtLootFromPool(chapterLootPool(battle.chapterId), rng)?.id);
  }
  if (!drops.length) {
    pushDrop("dt-trail-jerky");
  }
  return drops.slice(0, 5);
}

function emptyCombatStats(rounds = 1): SimpleBattleCombatStats {
  return { damageDealt: 0, damageTaken: 0, foesDefeated: 0, rounds };
}

function withCombatDelta(
  battle: SimpleBattleState,
  delta: Partial<SimpleBattleCombatStats>
): SimpleBattleState {
  const cur = battle.combatStats ?? emptyCombatStats(battle.round);
  return {
    ...battle,
    combatStats: {
      damageDealt: cur.damageDealt + (delta.damageDealt ?? 0),
      damageTaken: cur.damageTaken + (delta.damageTaken ?? 0),
      foesDefeated: cur.foesDefeated + (delta.foesDefeated ?? 0),
      rounds: delta.rounds ?? cur.rounds,
    },
  };
}

function grantRewards(
  world: DtWorldSave,
  battle: SimpleBattleState
): DtWorldSave["characters"] {
  const heroes = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (!heroes.length) return world.characters;
  const goldEach = Math.floor(battle.goldReward / heroes.length);
  const xpEach = Math.floor(battle.xpReward / heroes.length);
  const leftovers = {
    gold: battle.goldReward - goldEach * heroes.length,
    xp: battle.xpReward - xpEach * heroes.length,
  };
  const characters = { ...world.characters };
  const drops = battle.lootDrops ?? [];
  for (let i = 0; i < heroes.length; i++) {
    const slot = heroes[i]!;
    const c = characters[slot]!;
    const itemIds = drops.filter((_, di) => di % heroes.length === i).map((d) => d.itemId);
    const heroUnit = battle.units.find(
      (u) => u.side === "hero" && u.slot === slot && !u.isDog && !u.isCompanion
    );
    const dogUnit = battle.units.find((u) => u.side === "hero" && u.slot === slot && u.isDog);
    const companionUnit = battle.units.find(
      (u) => u.side === "hero" && u.slot === slot && u.isCompanion
    );
    const dog = normalizeDtDog(c.dog);
    let fetched = c.fetchedCompanion ?? null;
    if (fetched && companionUnit) {
      fetched = applyFetchedCompanionXp(
        {
          ...fetched,
          hp: Math.max(0, Math.min(fetched.maxHp, companionUnit.hp)),
          mana: Math.max(0, Math.min(fetched.maxMana, companionUnit.mana)),
        },
        xpEach + (i === 0 ? leftovers.xp : 0)
      );
    } else if (fetched && companionUnit === undefined) {
      // Companion sat out — still share a little XP for sticking around
      fetched = applyFetchedCompanionXp(fetched, Math.floor(xpEach / 2));
    }
    characters[slot] = {
      ...c,
      gold: (c.gold ?? 0) + goldEach + (i === 0 ? leftovers.gold : 0),
      xp: (c.xp ?? 0) + xpEach + (i === 0 ? leftovers.xp : 0),
      inventory: [...(c.inventory ?? []), ...itemIds],
      hp: Math.max(1, Math.min(c.maxHp, heroUnit?.hp ?? c.hp)),
      mana: Math.max(0, Math.min(c.maxMana, heroUnit?.mana ?? c.mana)),
      dog: dogUnit
        ? { ...dog, hp: Math.max(0, Math.min(dog.maxHp, dogUnit.hp)) }
        : dog,
      fetchedCompanion: fetched,
    };
  }
  return characters;
}

export type BattleFailKind = "wipe" | "flee";
export type BattleFailContext = "road" | "night" | "sideQuest" | "scripted";

const SCAR_LIMP_FLAG = "scar:limp";

function isBagConsumable(itemId: string): boolean {
  const g = resolveGear(itemId);
  if (!g) return false;
  if (g.slot === "consumable") return true;
  return !!(g.tags?.includes("potion") || g.tags?.includes("ration") || g.tags?.includes("food"));
}

function taxGoldPercent(
  characters: DtWorldSave["characters"],
  pct: number
): { characters: DtWorldSave["characters"]; taken: number } {
  let taken = 0;
  const next = { ...characters };
  for (const slot of PLAYER_SLOT_ORDER) {
    const c = next[slot];
    if (!c?.created) continue;
    const gold = Math.max(0, c.gold ?? 0);
    const lose = Math.min(gold, Math.floor(gold * pct));
    if (lose <= 0) continue;
    taken += lose;
    next[slot] = { ...c, gold: gold - lose };
  }
  return { characters: next, taken };
}

/** Strip 1–2 bag consumables across the party (never worn gear). */
function scrapBagConsumables(
  characters: DtWorldSave["characters"],
  count: number,
  rng: () => number
): { characters: DtWorldSave["characters"]; scraped: string[] } {
  const scraped: string[] = [];
  const next = { ...characters };
  const pool: { slot: PlayerSlot; index: number; itemId: string }[] = [];
  for (const slot of PLAYER_SLOT_ORDER) {
    const c = next[slot];
    if (!c?.created) continue;
    (c.inventory ?? []).forEach((itemId, index) => {
      if (isBagConsumable(itemId)) pool.push({ slot, index, itemId });
    });
  }
  for (let n = 0; n < count && pool.length; n++) {
    const pick = Math.floor(rng() * pool.length);
    const hit = pool.splice(pick, 1)[0]!;
    const c = next[hit.slot]!;
    const inv = [...(c.inventory ?? [])];
    const at = inv.indexOf(hit.itemId);
    if (at < 0) continue;
    inv.splice(at, 1);
    next[hit.slot] = { ...c, inventory: inv };
    scraped.push(resolveGear(hit.itemId)?.name ?? hit.itemId);
    // Reindex remaining pool entries for this slot after splice.
    for (let i = pool.length - 1; i >= 0; i--) {
      const p = pool[i]!;
      if (p.slot !== hit.slot) continue;
      if (p.index > at) pool[i] = { ...p, index: p.index - 1 };
      else if (p.index === at) pool.splice(i, 1);
    }
  }
  return { characters: next, scraped };
}

function resolveFailContext(world: DtWorldSave, battle?: SimpleBattleState | null): BattleFailContext {
  if (world.sideQuest) return "sideQuest";
  if (battle?.nightAmbush) return "night";
  return "road";
}

function wipeCopy(context: BattleFailContext): string {
  if (context === "night") {
    return "Night took you. Fire wasn't enough — they left you breathing.";
  }
  if (context === "sideQuest") {
    return "The contract goes cold. They left you breathing.";
  }
  return "They took what they wanted. You're still walking.";
}

/**
 * Scarred limp failure applicator — wipe vs flee diverge.
 * Story/seals/furthest/worn gear stay; dog drain never deletes the dog.
 */
export function applyBattleFailure(
  world: DtWorldSave,
  opts: {
    kind: BattleFailKind;
    context?: BattleFailContext;
    rng?: () => number;
    /** When set, sync hero/dog vitals from these units before applying (flee). */
    units?: SimpleBattleUnit[];
  }
): { world: DtWorldSave; message: string; lines: string[] } {
  const rng = opts.rng ?? Math.random;
  const battle = world.battle;
  const context = opts.context ?? resolveFailContext(world, battle);
  let characters =
    opts.units && opts.units.length
      ? syncHeroHpFromUnits(world, opts.units)
      : { ...world.characters };
  const lines: string[] = [];

  if (opts.kind === "flee") {
    // Keep wounds — no free heal. Floor living heroes at 1 HP.
    for (const slot of PLAYER_SLOT_ORDER) {
      const c = characters[slot];
      if (!c?.created) continue;
      characters[slot] = {
        ...c,
        hp: Math.max(1, Math.min(c.maxHp, c.hp)),
        mana: Math.max(0, Math.min(c.maxMana, c.mana ?? 0)),
        stamina: Math.max(0, Math.min(c.maxStamina, c.stamina ?? 0)),
      };
    }
    const goldTax = taxGoldPercent(characters, 0.05);
    characters = goldTax.characters;
    if (goldTax.taken > 0) lines.push(`Dropped ${goldTax.taken}g running.`);

    // Persist dog HP from the fight (already synced if units passed), then hunger.
    characters = Object.fromEntries(
      PLAYER_SLOT_ORDER.map((slot) => {
        const c = characters[slot];
        if (!c?.created) return [slot, c];
        return [slot, c.dog ? dtDogAfterBattle(c) : c];
      })
    ) as DtWorldSave["characters"];

    const message = "You ran. The road doesn't forget.";
    return {
      world: {
        ...world,
        characters,
        updatedAt: new Date().toISOString(),
      },
      message,
      lines: [message, ...lines],
    };
  }

  // —— Wipe (Scarred limp) ——
  for (const slot of PLAYER_SLOT_ORDER) {
    const c = characters[slot];
    if (!c?.created) continue;
    characters[slot] = {
      ...c,
      hp: Math.max(1, Math.floor(c.maxHp * 0.2)),
      mana: Math.max(0, Math.floor(c.maxMana * 0.2)),
      stamina: Math.max(0, Math.floor(c.maxStamina * 0.2)),
    };
  }

  const goldPct = 0.1 + rng() * 0.1; // 10–20%
  const goldTax = taxGoldPercent(characters, goldPct);
  characters = goldTax.characters;
  if (goldTax.taken > 0) lines.push(`Lost ${goldTax.taken}g.`);

  const scrapCount = 1 + (rng() < 0.5 ? 1 : 0); // 1–2
  const scrap = scrapBagConsumables(characters, scrapCount, rng);
  characters = scrap.characters;
  if (scrap.scraped.length) {
    lines.push(`Scraped: ${scrap.scraped.join(", ")}.`);
  }

  const flags = [...(world.partyFlags ?? [])];
  if (!flags.includes(SCAR_LIMP_FLAG)) {
    flags.push(SCAR_LIMP_FLAG);
    lines.push("Scar: limp — camp sleep clears it.");
  }

  const foughtDogs = new Set(
    (battle?.units ?? [])
      .filter((u) => u.side === "hero" && u.isDog && u.slot)
      .map((u) => u.slot as PlayerSlot)
  );
  const dogLines: string[] = [];
  characters = Object.fromEntries(
    PLAYER_SLOT_ORDER.map((slot) => {
      const c = characters[slot];
      if (!c?.created || !c.dog) return [slot, c];
      const fought = foughtDogs.has(slot);
      const dogUnit = battle?.units?.find(
        (u) => u.side === "hero" && u.isDog && u.slot === slot
      );
      const next = dtDogAfterWipe(c, {
        fought,
        battleHp: dogUnit?.hp,
      });
      const dog = normalizeDtDog(next.dog);
      if (fought && dog.hp <= 0) {
        dogLines.push(`${dog.name} is too hurt to fight — rest them at camp.`);
      } else if (fought && (c.dog?.bond ?? 10) > dog.bond) {
        dogLines.push(`${dog.name} trusts you a little less.`);
      }
      return [slot, next];
    })
  ) as DtWorldSave["characters"];
  lines.push(...dogLines);

  let nextWorld: DtWorldSave = {
    ...world,
    characters,
    partyFlags: flags,
    updatedAt: new Date().toISOString(),
  };

  if (context === "sideQuest" && nextWorld.sideQuest) {
    // Inline fail (avoid simple-battle ↔ side-quests import cycle).
    const sq = nextWorld.sideQuest;
    const line = "The job went cold. Back on the march.";
    nextWorld = {
      ...nextWorld,
      campaignNodeId: sq.resumeNodeId || nextWorld.campaignNodeId,
      chapterId: sq.resumeChapterId || nextWorld.chapterId,
      sideQuest: null,
      updatedAt: new Date().toISOString(),
      log: [line, ...nextWorld.log].slice(0, 80),
    };
    lines.push(line);
  }

  const message = wipeCopy(context);
  return { world: nextWorld, message, lines: [message, ...lines] };
}

function resetRoundActions(units: SimpleBattleUnit[]): SimpleBattleUnit[] {
  return units.map((u) => {
    if (u.hp <= 0 || u.isDog || u.side === "enemy") {
      // Foe/dog stun decays when they skip in enemyActInPlace / dogActInPlace.
      return { ...u, actionsLeft: 0 };
    }
    const stunned = (u.stunRounds ?? 0) > 0;
    return {
      ...u,
      actionsLeft: stunned ? 0 : u.haste ? 2 : 1,
      // Hero stun: skip this player turn, then decay.
      stunRounds: stunned ? Math.max(0, (u.stunRounds ?? 0) - 1) : u.stunRounds ?? 0,
    };
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

/** Tick stun / power buff / poison at the start of a new player round. */
function tickStatusEffects(units: SimpleBattleUnit[]): {
  units: SimpleBattleUnit[];
  poisonLogs: string[];
  poisonDamageTaken: number;
} {
  const poisonLogs: string[] = [];
  let poisonDamageTaken = 0;
  const next = units.map((u) => {
    if (u.hp <= 0) return u;
    let hp = u.hp;
    let powerBuff = u.powerBuff ?? 0;
    let powerBuffRounds = u.powerBuffRounds ?? 0;
    if (powerBuffRounds > 0) {
      powerBuffRounds -= 1;
      if (powerBuffRounds <= 0) {
        powerBuff = 0;
        powerBuffRounds = 0;
      }
    }
    let poisonStacks = u.poisonStacks ?? 0;
    if (poisonStacks > 0) {
      const tick = Math.max(1, poisonStacks);
      const after = Math.max(0, hp - tick);
      const dealt = hp - after;
      hp = after;
      if (u.side === "hero") poisonDamageTaken += dealt;
      poisonLogs.push(`${u.name} suffers venom (−${dealt}).`);
      poisonStacks = Math.max(0, poisonStacks - 1);
    }
    return {
      ...u,
      hp,
      powerBuff,
      powerBuffRounds,
      poisonStacks,
    };
  });
  return { units: next, poisonLogs, poisonDamageTaken };
}

function effectivePower(unit: SimpleBattleUnit): number {
  return Math.max(1, unit.power + (unit.powerBuff ?? 0));
}

function applyHeal(
  units: SimpleBattleUnit[],
  targetId: string,
  amount: number
): SimpleBattleUnit[] {
  return units.map((u) =>
    u.id === targetId
      ? { ...u, hp: Math.min(u.maxHp, u.hp + Math.max(0, amount)) }
      : u
  );
}

function applyStun(
  units: SimpleBattleUnit[],
  targetId: string,
  rounds: number
): SimpleBattleUnit[] {
  if (rounds <= 0) return units;
  return units.map((u) =>
    u.id === targetId
      ? { ...u, stunRounds: Math.max(u.stunRounds ?? 0, rounds) }
      : u
  );
}

function applyPoison(
  units: SimpleBattleUnit[],
  targetId: string,
  stacks: number
): SimpleBattleUnit[] {
  if (stacks <= 0) return units;
  return units.map((u) =>
    u.id === targetId
      ? { ...u, poisonStacks: Math.min(6, (u.poisonStacks ?? 0) + stacks) }
      : u
  );
}

function applyPowerBuff(
  units: SimpleBattleUnit[],
  targetId: string,
  bonus: number,
  rounds: number
): SimpleBattleUnit[] {
  if (bonus <= 0 || rounds <= 0) return units;
  return units.map((u) =>
    u.id === targetId
      ? {
          ...u,
          powerBuff: (u.powerBuff ?? 0) + bonus,
          powerBuffRounds: Math.max(u.powerBuffRounds ?? 0, rounds),
        }
      : u
  );
}

function pushLog(battle: SimpleBattleState, line: string): SimpleBattleState {
  return { ...battle, log: [line, ...battle.log].slice(0, 24) };
}

function checkEnd(
  battle: SimpleBattleState,
  rng: () => number = Math.random
): SimpleBattleState {
  const units = battle.units.map((u) => (u.hp < 0 ? { ...u, hp: 0 } : u));
  const next = { ...battle, units };
  const heroes = livingPlayerHeroes(next.units);
  const foes = living(next.units, "enemy");
  const foesDefeated = next.units.filter((u) => u.side === "enemy" && u.hp <= 0).length;
  if (!foes.length) {
    const lootDrops =
      next.lootDrops && next.lootDrops.length > 0
        ? next.lootDrops
        : rollSimpleBattleLoot(next, rng);
    const combatStats: SimpleBattleCombatStats = {
      ...(next.combatStats ?? emptyCombatStats(next.round)),
      foesDefeated,
      rounds: next.round,
    };
    const lootLine =
      lootDrops.length > 0
        ? ` Loot: ${lootDrops.map((d) => d.name).join(", ")}.`
        : "";
    return {
      ...next,
      status: "victory",
      phase: "summary",
      fx: [],
      message: `You Won! +${next.goldReward}g · +${next.xpReward} XP.${lootLine}`,
      focusHeroId: null,
      lootDrops,
      combatStats,
      rewardsPending: true,
    };
  }
  if (!heroes.length) {
    const combatStats: SimpleBattleCombatStats = {
      ...(next.combatStats ?? emptyCombatStats(next.round)),
      foesDefeated,
      rounds: next.round,
    };
    return {
      ...next,
      status: "defeat",
      phase: "summary",
      fx: [],
      message: next.nightAmbush
        ? "Night took you. They left you breathing."
        : "Defeat — they left you breathing.",
      focusHeroId: null,
      lootDrops: next.lootDrops ?? [],
      combatStats,
      rewardsPending: false,
    };
  }
  return next;
}

function heroesStillActing(units: SimpleBattleUnit[]): boolean {
  return livingPlayerHeroes(units).some((u) => u.actionsLeft > 0);
}

function nextFocusHero(units: SimpleBattleUnit[], preferId?: string | null): string | null {
  const ready = livingPlayerHeroes(units).filter((u) => u.actionsLeft > 0);
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
  const stamped = withId.splashDone
    ? withId
    : simpleBattleShouldSkipSplash(withId)
      ? { ...withId, splashDone: true }
      : withId;
  return repairSimpleBattleTurnInvariant(stamped);
}

/** How many hero actions already spent this round (haste ≈ 2). */
export function simpleBattleHeroActionsSpent(battle: SimpleBattleState): number {
  let spent = 0;
  for (const u of battle.units) {
    if (u.side !== "hero" || u.isDog || u.hp <= 0) continue;
    const budget = u.haste || (u.hasteRounds ?? 0) > 0 ? 2 : 1;
    spent += Math.max(0, budget - Math.max(0, u.actionsLeft));
  }
  return spent;
}

/**
 * Higher = further along; stale persist/poll must never roll a turn back.
 * Do NOT prefer bare phase:"enemy" over idle player — that caused auto enemy
 * advances / combat loops without a click (enemy ranked above player at same
 * round even when no hero had acted).
 */
export function simpleBattleProgressScore(battle: SimpleBattleState): number {
  const statusOrd =
    battle.status === "victory" || battle.status === "defeat" ? 100_000 : 0;
  const summaryOrd = battle.phase === "summary" ? 1_000 : 0;
  const spent = simpleBattleHeroActionsSpent(battle);
  // Enemy phase only counts after at least one hero spent an action.
  // Bare enemy (spent===0) ranks BELOW idle player so poll/POST cannot
  // flip a fresh fight into auto enemy-advance.
  const enemyOrd =
    battle.phase === "enemy" ? (spent > 0 ? 5 : -1) : 0;
  return (
    statusOrd +
    summaryOrd +
    battle.round * 100 +
    spent * 10 +
    enemyOrd +
    (battle.splashDone ? 1 : 0) +
    Math.min(battle.log.length, 40) * 0.01
  );
}

export function markSimpleBattleSplashDone(world: DtWorldSave): DtWorldSave {
  if (!world.battle || world.battle.splashDone) return world;
  return withBattleTransition(
    world,
    {
      ...world,
      battle: { ...world.battle, splashDone: true },
      updatedAt: new Date().toISOString(),
    },
    "markSplashDone"
  );
}

export function startSimpleBattle(
  world: DtWorldSave,
  opts?: { foeId?: string; rng?: () => number; nightAmbush?: boolean }
): { world: DtWorldSave; message: string } {
  // Block while any battle overlay is open (active or summary).
  if (world.battle) {
    return { world, message: "Already in a fight." };
  }
  const rng = opts?.rng ?? Math.random;
  const nightAmbush = !!opts?.nightAmbush;
  const lvl = partyLevel(world);
  const sealed = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (!sealed.length) return { world, message: "Seal a hero first." };

  const chapterNum = chapterNumberFromId(world.chapterId);
  const tuning = encounterSpawnTuning(chapterNum, world.battlesFought ?? 0);
  /** Night camp attacks: usually one creature from the night pool. */
  const foeCount = nightAmbush ? (rng() < 0.22 ? 2 : 1) : tuning.foeCount(rng);
  /** Cap creature level by chapter so Ch1 never rolls Night-Howlers, etc. */
  const maxCreatureLevel =
    chapterNum <= 1 ? 3 : chapterNum <= 2 ? 6 : chapterNum <= 3 ? 10 : chapterNum <= 5 ? 18 : 99;
  const foes: DtCreatureDef[] = [];
  if (nightAmbush) {
    foes.push(opts?.foeId ? resolveFoeDef(opts.foeId, lvl, rng) : rollNightCreature(rng));
    while (foes.length < foeCount) {
      foes.push(rollNightCreature(rng));
    }
  } else if (opts?.foeId) {
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

  const dogNotes: string[] = [];
  const heroUnits: SimpleBattleUnit[] = [];
  const dogUnits: SimpleBattleUnit[] = [];
  sealed.forEach((slot, i) => {
    const c = world.characters[slot]!;
    const spot = HERO_SPOTS[i] ?? { x: 16, y: 40 + i * 18 };
    heroUnits.push({
      id: `hero-${slot}`,
      side: "hero",
      slot,
      name: c.name || slot,
      color: HERO_COLORS[slot],
      hp: Math.max(1, c.hp),
      maxHp: c.maxHp,
      power: heroWeaponPower(c),
      armor: heroArmorRating(c),
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
      look: normalizeDtHeroLook(c.dtLook, slot),
    });
    const presence = dtDogJoinsBattle(c);
    if (!presence.joins) {
      if (presence.note) dogNotes.push(presence.note);
      return;
    }
    const dog = normalizeDtDog(c.dog);
    dogUnits.push({
      id: `dog-${slot}`,
      side: "hero",
      slot,
      name: dog.name,
      color: "#8a6a3a",
      hp: Math.max(1, dog.hp),
      maxHp: dog.maxHp,
      power: dtDogBattlePower(dog, c.level ?? 1),
      armor: Math.max(0, Math.floor(dog.bond / 50)),
      x: Math.min(36, spot.x + DOG_SPOT_OFFSET.x),
      y: Math.min(92, spot.y + DOG_SPOT_OFFSET.y),
      haste: false,
      hasteRounds: 0,
      actionsLeft: 0,
      mana: 0,
      maxMana: 0,
      stamina: 0,
      maxStamina: 0,
      isDog: true,
      artId: "art-dog-companion",
      moveCursor: 0,
      stunRounds: 0,
      poisonStacks: 0,
      powerBuff: 0,
      powerBuffRounds: 0,
    });
  });

  const companionUnits: SimpleBattleUnit[] = [];
  sealed.forEach((slot, i) => {
    const c = world.characters[slot]!;
    const fetched = c.fetchedCompanion;
    if (!fetched || fetched.hp <= 0) return;
    const spot = HERO_SPOTS[i] ?? { x: 16, y: 40 + i * 18 };
    companionUnits.push({
      id: `companion-${slot}`,
      side: "hero",
      slot,
      name: fetched.name,
      color: "#5a7a8a",
      hp: Math.max(1, fetched.hp),
      maxHp: fetched.maxHp,
      power: Math.max(2, 2 + (fetched.level ?? 1)),
      armor: 0,
      x: Math.max(8, spot.x + COMPANION_SPOT_OFFSET.x),
      y: Math.min(92, spot.y + COMPANION_SPOT_OFFSET.y),
      haste: false,
      hasteRounds: 0,
      actionsLeft: 1,
      mana: fetched.mana ?? 0,
      maxMana: fetched.maxMana ?? 0,
      stamina: fetched.stamina ?? 0,
      maxStamina: fetched.maxStamina ?? 0,
      classId: fetched.classId,
      look: normalizeDtHeroLook(fetched.dtLook, slot),
      isCompanion: true,
      companionId: fetched.id,
      moveCursor: 0,
      stunRounds: 0,
      poisonStacks: 0,
      powerBuff: 0,
      powerBuffRounds: 0,
    });
  });

  const enemyUnits: SimpleBattleUnit[] = foes.map((f, i) =>
    buildEnemyUnit(f, i, {
      partyLevel: lvl,
      chapterNum,
      hpMult: tuning.hpMult,
      powerMult: tuning.powerMult,
      rng,
    })
  );

  const mapped = mapThemeForWorld(world, rng);
  const theme: SimpleMapTheme = nightAmbush ? "campfire" : mapped.theme;
  const variant = nightAmbush ? Math.floor(rng() * 3) : mapped.variant;
  const goldReward = foes.reduce((s, f) => s + (f.gold ?? 0), 0);
  const xpReward = foes.reduce((s, f) => s + (f.xp ?? 0), 0);
  const dogJoinLine =
    dogUnits.length > 0
      ? ` ${dogUnits.map((d) => d.name).join(", ")} at your side.`
      : "";
  const companionJoinLine =
    companionUnits.length > 0
      ? ` ${companionUnits.map((u) => u.name).join(", ")} fights with you.`
      : "";
  const ambushLog = [
    nightAmbush
      ? `Night ambush! ${foes.map((f) => f.name).join(", ")} slips past the firelight — party acts first.${dogJoinLine}${companionJoinLine}`
      : `Ambush! ${foes.map((f) => f.name).join(", ")} — party acts first.${dogJoinLine}${companionJoinLine}`,
    ...dogNotes,
  ];

  const battle: SimpleBattleState = {
    id: uid("bat"),
    status: "active",
    phase: "player",
    round: 1,
    mapTheme: theme,
    mapVariant: variant,
    chapterId: world.chapterId,
    units: [...heroUnits, ...companionUnits, ...dogUnits, ...enemyUnits],
    focusHeroId: heroUnits[0]?.id ?? companionUnits[0]?.id ?? null,
    log: ambushLog,
    fx: [],
    goldReward,
    xpReward,
    message: nightAmbush
      ? `Night creature! ${foes.map((f) => f.name).join(", ")} attack the camp.${
          dogNotes[0] ? ` ${dogNotes[0]}` : `${dogJoinLine}${companionJoinLine}`
        }`
      : `Fight! ${foes.length} foe${foes.length === 1 ? "" : "s"} on the ${theme.replace(/-/g, " ")}.${
          dogNotes[0] ? ` ${dogNotes[0]}` : `${dogJoinLine}${companionJoinLine}`
        }`,
    splashDone: false,
    combatStats: emptyCombatStats(1),
    lootDrops: [],
    rewardsPending: false,
    nightAmbush: nightAmbush || undefined,
    initialEnemyCount: foes.length,
    reinforcementSpawned: false,
    partyLevel: lvl,
  };

  return {
    world: withBattleTransition(
      world,
      {
        ...world,
        battle,
        clearedBattleId: null,
        framesSinceEncounter: 0,
        nextEncounterAtFrame: rollNextEncounterAtFrame(world.framesAdvanced, rng),
        updatedAt: new Date().toISOString(),
        log: [battle.message, ...world.log].slice(0, 80),
      },
      "startSimpleBattle"
    ),
    message: battle.message,
  };
}

function applyDamage(
  units: SimpleBattleUnit[],
  targetId: string,
  raw: number
): { units: SimpleBattleUnit[]; dealt: number; killed: boolean } {
  let dealt = 0;
  let killed = false;
  const next = units.map((u) => {
    if (u.id !== targetId) return u;
    if (u.hp <= 0) return { ...u, hp: 0 };
    const hit = Math.max(1, raw - (u.armor ?? 0));
    const hp = Math.max(0, u.hp - hit);
    dealt = u.hp - hp;
    killed = hp <= 0 && u.hp > 0;
    return { ...u, hp };
  });
  return { units: next, dealt, killed };
}

function spendHeroAction(units: SimpleBattleUnit[], heroId: string): SimpleBattleUnit[] {
  return units.map((u) =>
    u.id === heroId ? { ...u, actionsLeft: Math.max(0, u.actionsLeft - 1) } : u
  );
}

function resolveActorMove(
  battle: SimpleBattleState,
  actor: SimpleBattleUnit,
  move: DtPokeMoveDef,
  nextCursor: number,
  target: SimpleBattleUnit,
  style: "enemy" | "dog" | "hero",
  rng: () => number,
  opts?: { scaleDamage?: (base: number) => number }
): SimpleBattleState {
  let units = battle.units.map((u) =>
    u.id === actor.id ? { ...u, moveCursor: nextCursor } : u
  );
  const fxStyle: SimpleBattleFxStyle =
    style === "dog" ? "dog" : style === "hero" ? "slash" : "enemy";
  const colors =
    style === "dog"
      ? { ray: "#c9a24a", burst: "#d4b05a", float: "#ffe7a8" }
      : style === "hero"
        ? { ray: "#e8c547", burst: "#f5d76e", float: "#fff3c4" }
        : { ray: "#c44", burst: "#e85a3a", float: "#ffc4b0" };

  const doesDamage = move.effects.includes("damage");
  const doesBuff =
    move.effects.includes("buff") && (move.powerBonus ?? 0) > 0;
  let dealt = 0;
  let killed = false;
  let healed = 0;
  const tags: string[] = [];

  if (doesDamage) {
    const mult = move.powerMult ?? 1;
    let base = Math.max(1, Math.round(effectivePower(actor) * mult));
    // Hero weapon attacks only — foes/dogs keep raw power (no attribute scale).
    if (style === "hero" && opts?.scaleDamage) {
      base = opts.scaleDamage(base);
    }
    const raw =
      base + Math.floor(rng() * (style === "dog" ? 3 : style === "hero" ? 5 : 4));
    const hit = applyDamage(units, target.id, raw);
    units = hit.units;
    dealt = hit.dealt;
    killed = hit.killed;
    tags.push(`−${dealt}`);
  }

  if (move.effects.includes("drain") && dealt > 0) {
    const pct = Math.max(0.15, Math.min(0.6, move.drainPct ?? 0.35));
    healed = Math.max(1, Math.floor(dealt * pct));
    units = applyHeal(units, actor.id, healed);
    tags.push(`+${healed} drain`);
  }

  if (move.effects.includes("stun")) {
    const rounds = Math.max(1, move.stunRounds ?? 1);
    units = applyStun(units, target.id, rounds);
    tags.push("stun");
  }

  if (move.effects.includes("poison")) {
    const stacks = Math.max(1, move.poisonStacks ?? 1);
    units = applyPoison(units, target.id, stacks);
    tags.push("venom");
  }

  if (doesBuff) {
    units = applyPowerBuff(
      units,
      actor.id,
      move.powerBonus ?? 3,
      move.buffRounds ?? 2
    );
    tags.push("buff");
  }

  // Self-buff-only moves still need a visible target for FX — actor.
  const fxTo = doesDamage || move.effects.includes("stun") || move.effects.includes("poison")
    ? target.id
    : actor.id;

  const floatLabel =
    tags.length > 0
      ? tags[0]!.startsWith("−") || tags[0]!.startsWith("+")
        ? tags.join(" ")
        : move.name
      : move.name;

  let next: SimpleBattleState = {
    ...battle,
    units,
    fx: [
      {
        id: uid("fx"),
        kind: "ray",
        style: fxStyle,
        fromId: actor.id,
        toId: fxTo,
        color: colors.ray,
      },
      {
        id: uid("fxb"),
        kind: "burst",
        style: fxStyle,
        fromId: actor.id,
        toId: fxTo,
        color: colors.burst,
      },
      {
        id: uid("flt"),
        kind: "float",
        style: fxStyle,
        fromId: actor.id,
        toId: fxTo,
        label: killed ? "DEAD" : floatLabel,
        color: colors.float,
      },
    ],
  };

  if (style === "dog" || style === "hero") {
    next = withCombatDelta(next, {
      damageDealt: dealt,
      foesDefeated: killed ? 1 : 0,
    });
  } else {
    next = withCombatDelta(next, { damageTaken: dealt });
  }

  const verb = doesBuff && !doesDamage ? "uses" : "hits with";
  const targetBit =
    fxTo === actor.id
      ? ""
      : ` on ${target.name}`;
  const detail = tags.length ? ` (${tags.join(", ")})` : "";
  next = pushLog(
    next,
    `${actor.name} ${verb} ${move.name}${targetBit}${detail}.`
  );
  return checkEnd(next, rng);
}

/** Run one enemy's signature move at a random living hero. */
function enemyActInPlace(
  battle: SimpleBattleState,
  enemy: SimpleBattleUnit,
  rng: () => number
): SimpleBattleState {
  if (enemy.hp <= 0) return battle;
  if ((enemy.stunRounds ?? 0) > 0) {
    const units = battle.units.map((u) =>
      u.id === enemy.id
        ? { ...u, stunRounds: Math.max(0, (u.stunRounds ?? 0) - 1) }
        : u
    );
    return pushLog({ ...battle, units }, `${enemy.name} is stunned — skips.`);
  }
  const heroes = living(battle.units, "hero");
  if (!heroes.length) return battle;

  const card = getDtPokeCard(enemy.foeDefId);
  const { move, nextCursor } = card
    ? pickDtPokeMove(card, enemy.moveCursor ?? 0, {
        alreadyBuffed: (enemy.powerBuffRounds ?? 0) > 0,
        rng,
      })
    : {
        move: {
          id: "strike",
          name: "Strike",
          effects: ["damage"] as const,
          powerMult: 1,
        } satisfies DtPokeMoveDef,
        nextCursor: 0,
      };

  const needsTarget =
    move.effects.includes("damage") ||
    move.effects.includes("stun") ||
    move.effects.includes("poison");
  const target = needsTarget
    ? heroes[Math.floor(rng() * heroes.length)]!
    : enemy;

  return resolveActorMove(
    battle,
    enemy,
    move,
    nextCursor,
    target,
    "enemy",
    rng
  );
}

/** Dog companions use signature moves before foes swing. */
function dogActInPlace(
  battle: SimpleBattleState,
  dog: SimpleBattleUnit,
  rng: () => number
): SimpleBattleState {
  if (dog.hp <= 0) return battle;
  if ((dog.stunRounds ?? 0) > 0) {
    const units = battle.units.map((u) =>
      u.id === dog.id
        ? { ...u, stunRounds: Math.max(0, (u.stunRounds ?? 0) - 1) }
        : u
    );
    return pushLog({ ...battle, units }, `${dog.name} is stunned — skips.`);
  }
  const foes = living(battle.units, "enemy");
  if (!foes.length) return battle;

  const card = getDtDogPokeCard();
  const { move, nextCursor } = pickDtPokeMove(card, dog.moveCursor ?? 0, {
    alreadyBuffed: (dog.powerBuffRounds ?? 0) > 0,
    rng,
  });

  const needsTarget =
    move.effects.includes("damage") ||
    move.effects.includes("stun") ||
    move.effects.includes("poison");
  const target = needsTarget
    ? foes[Math.floor(rng() * foes.length)]!
    : dog;

  return resolveActorMove(battle, dog, move, nextCursor, target, "dog", rng);
}

function runEnemyPhase(
  battle: SimpleBattleState,
  rng: () => number = Math.random
): SimpleBattleState {
  let next: SimpleBattleState = { ...battle, phase: "enemy", fx: [] };
  for (const dog of livingDogs(next.units)) {
    if (next.status !== "active") break;
    next = dogActInPlace(next, dog, rng);
  }
  // After dogs: if party still dominating mid-fight, one foe may join and swing.
  if (next.status === "active") {
    next = maybeSpawnBattleReinforcement(next, rng);
  }
  const foes = living(next.units, "enemy");
  for (const foe of foes) {
    if (next.status !== "active") break;
    next = enemyActInPlace(next, foe, rng);
  }
  if (next.status !== "active") return next;

  // New round — tick statuses/haste, refresh actions, player first again.
  let units = tickHaste(next.units);
  const statusTick = tickStatusEffects(units);
  units = resetRoundActions(statusTick.units);
  next = {
    ...next,
    units,
    phase: "player",
    round: next.round + 1,
    focusHeroId: nextFocusHero(units),
    combatStats: {
      ...(next.combatStats ?? emptyCombatStats(next.round)),
      rounds: next.round + 1,
      damageTaken:
        (next.combatStats?.damageTaken ?? 0) + statusTick.poisonDamageTaken,
    },
    message: `Round ${next.round + 1} — your party.`,
  };
  for (const line of statusTick.poisonLogs) {
    next = pushLog(next, line);
  }
  next = pushLog(next, `— Round ${next.round} —`);
  // Entire party stunned → don't soft-lock on an empty player phase.
  if (
    next.status === "active" &&
    !heroesStillActing(next.units) &&
    living(next.units, "enemy").length > 0
  ) {
    next = {
      ...next,
      phase: "enemy",
      focusHeroId: null,
      message: "Stunned — enemy turn…",
    };
  }
  return next;
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
  if (hero.isDog) return { world, message: "Your dog acts on their own." };
  if (hero.isCompanion && action !== "attack" && action !== "buff") {
    return { world, message: "Trail companions use Attack (or brace buff) for now." };
  }
  if (hero.actionsLeft <= 0) return { world, message: "That hero already acted." };

  let nextBattle: SimpleBattleState = { ...battle, fx: [], focusHeroId: heroId };
  let characters = { ...world.characters };
  let message = "";

  if (action === "attack") {
    const livingFoes = living(nextBattle.units, "enemy");
    if (!livingFoes.length) {
      nextBattle = checkEnd(nextBattle, rng);
      message = "No foes left — victory!";
    } else {
      let foe = targetId ? livingFoes.find((u) => u.id === targetId) : livingFoes[0];
      let retargetNote = "";
      if (!foe) {
        foe = livingFoes[0]!;
        retargetNote = " (switched target)";
      }
      const char = hero.slot ? characters[hero.slot] : null;
      const fetched =
        hero.isCompanion && char?.fetchedCompanion ? char.fetchedCompanion : null;
      const weaponId = fetched
        ? fetched.equipped?.weapon ?? null
        : char?.equipped?.weapon ?? null;
      const weapon = resolveGear(weaponId);
      const scaling = resolveWeaponScaling(
        weapon ?? null,
        fetched?.stats ?? char?.stats
      );
      const weaponCard = fetched
        ? synthesizeCompanionPokeCard({
            id: fetched.id,
            name: fetched.name,
            sexLabel: sexLabel(fetched.sex),
            raceName: RACE_DEFS[fetched.raceId]?.name ?? fetched.raceId,
            className: CLASS_DEFS[fetched.classId]?.name ?? fetched.classId,
            level: fetched.level,
          })
        : getDtWeaponPokeCard(weaponId) ?? getDtUnarmedPokeCard();
      const { move, nextCursor } = pickDtPokeMove(
        weaponCard,
        hero.moveCursor ?? 0,
        {
          alreadyBuffed: (hero.powerBuffRounds ?? 0) > 0,
          rng,
        }
      );
      nextBattle = resolveActorMove(
        nextBattle,
        hero,
        move,
        nextCursor,
        foe,
        "hero",
        rng,
        { scaleDamage: scaling.scale }
      );
      nextBattle = {
        ...nextBattle,
        units: spendHeroAction(nextBattle.units, heroId),
      };
      const afterHero = nextBattle.units.find((u) => u.id === heroId);
      const afterFoe = nextBattle.units.find((u) => u.id === foe!.id);
      const killed = !!afterFoe && afterFoe.hp <= 0;
      message = killed
        ? `${hero.name}'s ${move.name} fells ${foe.name}${retargetNote}!`
        : `${hero.name} uses ${move.name} on ${foe.name}${retargetNote}.`;
      if (
        afterHero &&
        (afterHero.powerBuffRounds ?? 0) > (hero.powerBuffRounds ?? 0)
      ) {
        message += " (powered up)";
      }
    }
  } else if (action === "magic") {
    if (hero.mana < MAGIC_COST) return { world, message: "Not enough mana." };
    const livingFoes = living(nextBattle.units, "enemy");
    if (!livingFoes.length) {
      nextBattle = checkEnd(nextBattle, rng);
      message = "No foes left — victory!";
    } else {
      let foe = targetId ? livingFoes.find((u) => u.id === targetId) : livingFoes[0];
      let retargetNote = "";
      if (!foe) {
        foe = livingFoes[0]!;
        retargetNote = " (switched target)";
      }
      const char = hero.slot ? characters[hero.slot] : null;
      const int = char?.stats?.intelligence ?? 10;
      const base = char ? heroMagicBase(char) : hero.power + 4;
      const raw = scaleByStat(base, int) + Math.floor(rng() * 6);
      const { units, dealt, killed } = applyDamage(nextBattle.units, foe.id, raw);
      const afterMana = units.map((u) =>
        u.id === heroId ? { ...u, mana: Math.max(0, u.mana - MAGIC_COST) } : u
      );
      nextBattle = withCombatDelta(
        {
          ...nextBattle,
          units: spendHeroAction(afterMana, heroId),
          fx: [
            {
              id: uid("fx"),
              kind: "ray",
              style: "magic",
              fromId: heroId,
              toId: foe.id,
              color: "#c45c28",
            },
            {
              id: uid("fxbolt"),
              kind: "bolt",
              style: "magic",
              fromId: heroId,
              toId: foe.id,
              color: "#e07a3a",
            },
            {
              id: uid("fxb"),
              kind: "burst",
              style: "magic",
              fromId: heroId,
              toId: foe.id,
              color: "#f0a05a",
            },
            {
              id: uid("flt"),
              kind: "float",
              style: "magic",
              fromId: heroId,
              toId: foe.id,
              label: killed ? "DEAD" : `−${dealt}`,
              color: killed ? "#ffd0a0" : "#ffe0b8",
            },
          ],
        },
        { damageDealt: dealt, foesDefeated: killed ? 1 : 0 }
      );
      message = killed
        ? `${hero.name} blasts ${foe.name} (−${dealt})${retargetNote}!`
        : `${hero.name} casts at ${foe.name} for ${dealt}${retargetNote}.`;
      nextBattle = pushLog(nextBattle, message);
    }
  } else if (action === "heal") {
    const allyId = targetId ?? heroId;
    const ally = living(nextBattle.units, "hero").find((u) => u.id === allyId);
    if (!ally) return { world, message: "Invalid ally." };
    const char = hero.slot ? characters[hero.slot] : null;
    const wis = char?.stats?.wisdom ?? 10;
    const heal = scaleByStat(HEAL_AMOUNT, wis) + Math.floor(rng() * 6);
    const units = nextBattle.units.map((u) =>
      u.id === allyId ? { ...u, hp: Math.min(u.maxHp, u.hp + heal) } : u
    );
    nextBattle = {
      ...nextBattle,
      units: spendHeroAction(units, heroId),
      fx: [
        {
          id: uid("fxr"),
          kind: "ray",
          style: "heal",
          fromId: heroId,
          toId: allyId,
          color: "#6a9e5a",
        },
        {
          id: uid("fxa"),
          kind: "aura",
          style: "heal",
          fromId: heroId,
          toId: allyId,
          color: "#8bc47a",
        },
        {
          id: uid("flt"),
          kind: "float",
          style: "heal",
          fromId: heroId,
          toId: allyId,
          label: `+${heal}`,
          color: "#d8f0c4",
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
          id: uid("fxa"),
          kind: "aura",
          style: "haste",
          fromId: heroId,
          toId: allyId,
          color: "#e8c547",
        },
        {
          id: uid("fxb"),
          kind: "burst",
          style: "haste",
          fromId: heroId,
          toId: allyId,
          color: "#f5d76e",
        },
        {
          id: uid("flt"),
          kind: "float",
          style: "haste",
          fromId: heroId,
          toId: allyId,
          label: "Haste!",
          color: "#ffe9a0",
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
          id: uid("fxb"),
          kind: "burst",
          style: "potion",
          fromId: heroId,
          toId: heroId,
          color: "#c45c70",
        },
        {
          id: uid("fxa"),
          kind: "aura",
          style: "potion",
          fromId: heroId,
          toId: heroId,
          color: "#d47888",
        },
        {
          id: uid("flt"),
          kind: "float",
          style: "potion",
          fromId: heroId,
          toId: heroId,
          label: `+${heal}`,
          color: "#f2b4c2",
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

  nextBattle = checkEnd(nextBattle, rng);
  characters = syncHeroHpFromUnits({ ...world, characters }, nextBattle.units);

  if (nextBattle.status === "victory" || nextBattle.status === "defeat") {
    return finishBattle({ ...world, characters }, nextBattle);
  }

  if (!heroesStillActing(nextBattle.units)) {
    // Hold on enemy phase with player FX still painted — UI calls
    // advanceSimpleBattleEnemyPhase after rays/floats play out.
    // Reinforcement (if any) spawns inside runEnemyPhase so player rays stay.
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
    world: withBattleTransition(
      world,
      {
        ...world,
        characters,
        battle: nextBattle,
        updatedAt: new Date().toISOString(),
      },
      nextBattle.phase === "enemy" ? "perform→ENEMY" : "perform→PLAYER"
    ),
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
  let battle = world.battle;
  if (!battle || battle.status !== "active") {
    return { world, message: "" };
  }
  battle = repairSimpleBattleTurnInvariant(battle);
  if (battle !== world.battle) {
    world = { ...world, battle };
  }
  if (battle.phase !== "enemy") {
    return { world, message: "" };
  }

  let nextBattle = runEnemyPhase(battle, rng);
  let characters = syncHeroHpFromUnits(world, nextBattle.units);

  if (nextBattle.status === "victory" || nextBattle.status === "defeat") {
    return finishBattle({ ...world, characters }, nextBattle);
  }

  return {
    world: withBattleTransition(
      world,
      {
        ...world,
        characters,
        battle: nextBattle,
        updatedAt: new Date().toISOString(),
      },
      "advanceEnemy→PLAYER"
    ),
    message: nextBattle.message,
  };
}

function finishBattle(
  world: DtWorldSave,
  battle: SimpleBattleState
): { world: DtWorldSave; message: string } {
  // Grant gold/xp/loot as soon as victory hits so the end screen can show
  // a live inventory for equip. rewardsPending stays false after grant so
  // dismiss/poll cannot double-pay.
  if (battle.status === "victory") {
    const pending = battle.rewardsPending !== false;
    let characters = pending ? grantRewards(world, battle) : world.characters;
    characters = Object.fromEntries(
      PLAYER_SLOT_ORDER.map((slot) => {
        const c = characters[slot];
        return [slot, c?.created ? dtDogAfterBattle(c) : c];
      })
    ) as DtWorldSave["characters"];
    return {
      world: withBattleTransition(
        world,
        {
          ...world,
          characters,
          battle: {
            ...battle,
            phase: "summary",
            fx: [],
            rewardsPending: false,
          },
          battlesFought: (world.battlesFought ?? 0) + 1,
          framesSinceEncounter: 0,
          nextEncounterAtFrame: rollNextEncounterAtFrame(world.framesAdvanced),
          updatedAt: new Date().toISOString(),
          log: [battle.message, ...world.log].slice(0, 80),
        },
        "finish→VICTORY"
      ),
      message: battle.message,
    };
  }
  const failed = applyBattleFailure(world, {
    kind: "wipe",
    context: resolveFailContext(world, battle),
  });
  const defeatMessage = [...failed.lines].join(" ");
  return {
    world: withBattleTransition(
      world,
      {
        ...failed.world,
        battle: {
          ...battle,
          phase: "summary",
          fx: [],
          rewardsPending: false,
          lootDrops: battle.lootDrops ?? [],
          message: defeatMessage,
        },
        battlesFought: (world.battlesFought ?? 0) + 1,
        framesSinceEncounter: 0,
        nextEncounterAtFrame: rollNextEncounterAtFrame(world.framesAdvanced),
        updatedAt: new Date().toISOString(),
        log: [defeatMessage, ...failed.world.log].slice(0, 80),
      },
      "finish→DEFEAT"
    ),
    message: defeatMessage,
  };
}

/** Clear summary overlay and return to story. */
export function dismissSimpleBattle(world: DtWorldSave): DtWorldSave {
  if (!world.battle) return world;
  if (world.battle.status === "active" && world.battle.phase !== "summary") {
    return world;
  }
  const battle = world.battle;
  let characters = world.characters;
  if (battle.status === "victory" && battle.rewardsPending !== false) {
    characters = grantRewards(world, battle);
  }
  return withBattleTransition(
    world,
    {
      ...world,
      characters,
      clearedBattleId: battle.id,
      battle: null,
      updatedAt: new Date().toISOString(),
    },
    "dismiss→WORLD"
  );
}

/**
 * Apply victory gold/xp/loot while keeping the end screen open so the player
 * can equip immediately. Idempotent via rewardsPending.
 */
export function claimSimpleBattleVictoryRewards(world: DtWorldSave): DtWorldSave {
  const battle = world.battle;
  if (!battle || battle.status !== "victory" || battle.rewardsPending === false) {
    return world;
  }
  return {
    ...world,
    characters: grantRewards(world, battle),
    battle: { ...battle, rewardsPending: false },
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
  // NEVER undo victory/defeat with a stale active poll/POST — that soft-locked kills.
  if (left.status !== "active" && right.status === "active") {
    return left.id === right.id || simpleBattleProgressScore(left) >= simpleBattleProgressScore(right)
      ? left
      : ensureSimpleBattleSplashConsistency(right);
  }
  if (right.status !== "active" && left.status === "active") {
    return right.id === left.id || simpleBattleProgressScore(right) >= simpleBattleProgressScore(left)
      ? right
      : ensureSimpleBattleSplashConsistency(left);
  }
  if (left.status === "active" && right.status === "active") {
    const scoreL = simpleBattleProgressScore(left);
    const scoreR = simpleBattleProgressScore(right);
    let pick = scoreR > scoreL ? right : left;
    if (left.id === right.id && Math.abs(scoreL - scoreR) < 6) {
      const leftEnemyHp = left.units
        .filter((u) => u.side === "enemy")
        .reduce((sum, u) => sum + Math.max(0, u.hp), 0);
      const rightEnemyHp = right.units
        .filter((u) => u.side === "enemy")
        .reduce((sum, u) => sum + Math.max(0, u.hp), 0);
      if (rightEnemyHp < leftEnemyHp) pick = right;
      else if (leftEnemyHp < rightEnemyHp) pick = left;
    }
    const other = pick === right ? left : right;
    return ensureSimpleBattleSplashConsistency({
      ...pick,
      id: pick.id || other.id,
      splashDone: !!(left.splashDone || right.splashDone),
      units: pick.units.length ? pick.units : other.units,
      combatStats: pick.combatStats ?? other.combatStats,
      lootDrops: (pick.lootDrops?.length ? pick.lootDrops : other.lootDrops) ?? [],
      rewardsPending: !!(pick.rewardsPending || other.rewardsPending),
    });
  }
  const pick =
    simpleBattleProgressScore(right) >= simpleBattleProgressScore(left) ? right : left;
  const other = pick === right ? left : right;
  return {
    ...pick,
    lootDrops: (pick.lootDrops?.length ? pick.lootDrops : other.lootDrops) ?? [],
    combatStats: pick.combatStats ?? other.combatStats,
    rewardsPending: pick.rewardsPending ?? other.rewardsPending,
  };
}

/**
 * Abort an active fight (flee / soft-lock escape). Keeps wounds + light gold tax.
 * Flee from summary aliases dismiss with no second tax.
 */
export function fleeSimpleBattle(world: DtWorldSave): {
  world: DtWorldSave;
  message: string;
} {
  if (!world.battle) return { world, message: "No fight to flee." };
  if (world.battle.status !== "active" || world.battle.phase === "summary") {
    return {
      world: dismissSimpleBattle(world),
      message: "Back to the road.",
    };
  }
  const clearedId = world.battle.id;
  const failed = applyBattleFailure(world, {
    kind: "flee",
    context: resolveFailContext(world, world.battle),
    units: world.battle.units,
  });
  const fleeLine = failed.lines.join(" ");
  return {
    world: withBattleTransition(
      world,
      {
        ...failed.world,
        battle: null,
        /** Session + persist hint: do not resurrect this fight from poll/server. */
        clearedBattleId: clearedId,
        battlesFought: (world.battlesFought ?? 0) + 1,
        framesSinceEncounter: 0,
        nextEncounterAtFrame: rollNextEncounterAtFrame(world.framesAdvanced),
        updatedAt: new Date().toISOString(),
        log: [fleeLine, ...failed.world.log].slice(0, 80),
      },
      "flee→WORLD"
    ),
    message: fleeLine,
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
