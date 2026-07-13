/**
 * Neverworld turn-based battle engine.
 * Actions: Attack, Power Up, Eat, Spell, Drink HP, Drink Mana.
 * Clocks: 30s idle → foe strikes; 10 min hard cap → defeat.
 */

import {
  getBattleLootItem,
  getBoss,
  getCreature,
  getSpellbook,
  getSpellbookAbility,
  isSpellbookItem,
  rollBattleLoot,
  rollRandomFoe,
  type BossDef,
} from "./bestiary";
import { getGear } from "./gear";
import { battleArmor, battleAttackPower, battleMaxHp, battleMaxMana, computeEffectiveStats } from "./stats";
import { levelFromXp, skillPointsForLevelGain } from "./progression";
import { getAbility } from "./skills";
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
import type {
  BattleActionId,
  BattleLootDrop,
  BattleState,
  BattleSummary,
  CharacterSave,
  PartyWorldSave,
  PlayerSlot,
} from "./types";
import { PLAYER_SLOT_ORDER } from "./types";

/** Hard cap — every battle ends (defeat) after this. */
export const BATTLE_MAX_MS = 10 * 60 * 1000;
/** If a hero does nothing this long, the foe strikes. */
export const TURN_IDLE_MS = 30 * 1000;

const POWER_UP_TURNS = 3;
/** Was 1.5 — too swingy with high ATK + ROC severity. */
const POWER_UP_MULT = 1.25;

/**
 * Soft-scale weapon ATK into strike power so legendaries stay special
 * without 200+ one-shots (sqrt curve, then mild power-up).
 */
function combatStrikePower(rawAtk: number, poweredUp: boolean): number {
  const scaled = 5 + Math.round(Math.pow(Math.max(1, rawAtk), 0.62) * 2.4);
  const mult = poweredUp ? POWER_UP_MULT : 1;
  return Math.max(2, Math.floor(scaled * mult));
}

/** Cap a single hit so early foes / weak bosses aren't deleted in one swing. */
function clampOutgoingDamage(damage: number, enemyMaxHp: number): number {
  if (damage <= 0) return 0;
  const cap = Math.max(14, Math.floor(enemyMaxHp * 0.38));
  return Math.min(damage, cap);
}

/** First encounter: short grace then 30–90s of story time. */
export const FIRST_ENCOUNTER_MIN_MS = 30_000;
export const FIRST_ENCOUNTER_MAX_MS = 90_000;
/** Later encounters: ~2 minutes. */
export const NEXT_ENCOUNTER_MIN_MS = 100_000;
export const NEXT_ENCOUNTER_MAX_MS = 140_000;

function rngInt(min: number, max: number, rng: () => number) {
  return min + Math.floor(rng() * (max - min + 1));
}

export function rollNextEncounterThreshold(
  battlesFought: number,
  rng: () => number = Math.random
): number {
  if (battlesFought <= 0) {
    return rngInt(FIRST_ENCOUNTER_MIN_MS, FIRST_ENCOUNTER_MAX_MS, rng);
  }
  return rngInt(NEXT_ENCOUNTER_MIN_MS, NEXT_ENCOUNTER_MAX_MS, rng);
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
    return ab.kind === "spell" || ab.tags.includes("spell") || ab.tags.includes("damage");
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
  // Skip dead heroes
  for (let guard = 0; guard < n; guard++) {
    const id = battle.turnQueue[idx]!;
    if (id === "enemy") break;
    const hero = battle.heroes.find((h) => h.id === id);
    if (hero && hero.hp > 0) break;
    idx = (idx + 1) % n;
  }
  const now = new Date().toISOString();
  return {
    ...battle,
    turnIndex: idx,
    activeId: battle.turnQueue[idx]!,
    turnStartedAt: now,
  };
}

function pushLog(battle: BattleState, line: string): BattleState {
  return { ...battle, log: [line, ...battle.log].slice(0, 40) };
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
  roll: ReturnType<typeof rollRandomFoe>
): BattleState["enemy"] {
  const foe = roll.foe;
  const isBoss = roll.kind === "boss";
  const boss = isBoss ? (foe as BossDef) : undefined;
  return {
    id: foe.id,
    name: foe.name,
    blurb: foe.blurb,
    hp: foe.hp,
    maxHp: foe.hp,
    power: foe.power,
    armor: foe.armor ?? 0,
    mana: boss ? 40 : 0,
    maxMana: boss ? 40 : 0,
    artId: foe.artId,
    isBoss,
    xp: foe.xp,
    gold: foe.gold,
    lootPool: foe.lootPool ?? (isBoss ? "magic" : "trash"),
    uniqueDrops: boss?.uniqueDrops,
    uniqueSkill: boss?.uniqueSkill,
  };
}

export function startRandomBattle(
  world: PartyWorldSave,
  rng: () => number = Math.random
): { world: PartyWorldSave; message: string } {
  if (world.battle?.status === "active") {
    return { world, message: "Already in battle." };
  }
  if (world.endingId) return { world, message: "Chronicle closed." };

  const lvl = partyLevel(world);
  const roll = rollRandomFoe(lvl, rng);
  const enemy = foeFromRoll(roll);
  const slots = sealedSlots(world);
  if (!slots.length) return { world, message: "No sealed heroes to fight." };

  const heroes = slots.map((slot) => heroFromChar(slot, world.characters[slot]));

  const turnQueue = [...heroes.map((h) => h.id), "enemy"];
  const startedAt = new Date().toISOString();
  const battle: BattleState = {
    id: `battle-${Date.now()}`,
    status: "active",
    enemy,
    heroes,
    turnQueue,
    turnIndex: 0,
    activeId: turnQueue[0]!,
    log: [`Ambush! ${enemy.name} bars the path.`, `Idle 30s → foe strikes. Hard cap 10 min.`],
    stats: { damageDealt: 0, damageTaken: 0, turns: 0, bestRoc: 0 },
    lastRocLabel: null,
    summary: null,
    startedAt,
    turnStartedAt: startedAt,
  };

  return {
    world: {
      ...world,
      battle,
      log: [`Random battle — ${enemy.name}!`, ...world.log].slice(0, 80),
    },
    message: `${enemy.name} engages!`,
  };
}

export function startBattleVs(
  world: PartyWorldSave,
  foeId: string
): { world: PartyWorldSave; message: string } {
  const boss = getBoss(foeId);
  const creature = getCreature(foeId);
  if (!boss && !creature) return { world, message: "Unknown foe." };
  const roll = boss
    ? ({ kind: "boss" as const, foe: boss })
    : ({ kind: "creature" as const, foe: creature! });
  const fake = { ...world, battle: null };
  const started = startRandomBattle(fake, () => 0);
  // Rebuild with forced foe
  const slots = sealedSlots(world);
  if (!slots.length) return { world, message: "No sealed heroes." };
  const enemy = foeFromRoll(roll);
  const heroes = slots.map((slot) => heroFromChar(slot, world.characters[slot]));
  const turnQueue = [...heroes.map((h) => h.id), "enemy"];
  const startedAt = new Date().toISOString();
  const battle: BattleState = {
    id: `battle-${Date.now()}`,
    status: "active",
    enemy,
    heroes,
    turnQueue,
    turnIndex: 0,
    activeId: turnQueue[0]!,
    log: [`${enemy.name} challenges the party.`, `Idle 30s → foe strikes. Hard cap 10 min.`],
    stats: { damageDealt: 0, damageTaken: 0, turns: 0, bestRoc: 0 },
    lastRocLabel: null,
    summary: null,
    startedAt,
    turnStartedAt: startedAt,
  };
  void started;
  return {
    world: { ...world, battle, log: [`Battle — ${enemy.name}!`, ...world.log].slice(0, 80) },
    message: `${enemy.name} engages!`,
  };
}

function dealToEnemy(
  battle: BattleState,
  raw: number
): { battle: BattleState; damage: number } {
  const damage = Math.max(1, raw - battle.enemy.armor);
  const hp = Math.max(0, battle.enemy.hp - damage);
  return {
    damage,
    battle: {
      ...battle,
      enemy: { ...battle.enemy, hp },
      stats: {
        ...battle.stats,
        damageDealt: battle.stats.damageDealt + damage,
        turns: battle.stats.turns + 1,
      },
    },
  };
}

function finishVictory(
  world: PartyWorldSave,
  battle: BattleState,
  rewardSlot: PlayerSlot,
  rng: () => number
): PartyWorldSave {
  const lootRolls = rollBattleLoot(
    {
      lootPool: battle.enemy.lootPool,
      isBoss: battle.enemy.isBoss,
      uniqueDrops: battle.enemy.uniqueDrops,
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

  let char = world.characters[rewardSlot];
  char = applyXp(char, battle.enemy.xp);
  char = { ...char, gold: char.gold + battle.enemy.gold };
  const inventory = [...char.inventory];
  for (const drop of loot) {
    inventory.push(drop.itemId);
  }
  char = { ...char, inventory };

  // Sync all hero HP/mana from battle (clamp to effective max from gear)
  const characters = { ...world.characters };
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

  const summary = buildSummary(
    battle,
    true,
    loot,
    battle.enemy.xp,
    battle.enemy.gold
  );
  const nextBattle = {
    ...pushLog(battle, `${battle.enemy.name} falls!`),
    status: "victory" as const,
    summary,
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
      `Victory vs ${battle.enemy.name} (+${battle.enemy.xp} XP, +${battle.enemy.gold}g). ${pathFlavor}`,
      ...world.log,
    ].slice(0, 80),
  };
}

function finishDefeat(
  world: PartyWorldSave,
  battle: BattleState,
  reason?: string
): PartyWorldSave {
  const characters = { ...world.characters };
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
  const summary = buildSummary(battle, false, [], 0, 0);
  const fought = (world.battlesFought ?? 0) + 1;
  const line = reason ?? "The party is defeated…";
  return {
    ...world,
    characters,
    battle: {
      ...pushLog(battle, line),
      status: "defeat",
      summary,
    },
    battlesFought: fought,
    nextEncounterAtMs: (world.storyPlayMs ?? 0) + rollNextEncounterThreshold(fought),
    log: [`Defeat vs ${battle.enemy.name}.`, ...world.log].slice(0, 80),
  };
}

function maybeResolveEnd(
  world: PartyWorldSave,
  battle: BattleState,
  rewardSlot: PlayerSlot,
  rng: () => number
): PartyWorldSave {
  if (battle.enemy.hp <= 0) {
    return finishVictory(world, battle, rewardSlot, rng);
  }
  if (battle.heroes.every((h) => h.hp <= 0)) {
    return finishDefeat(world, battle);
  }
  return { ...world, battle };
}

function runEnemyTurn(
  world: PartyWorldSave,
  battle: BattleState,
  rng: () => number
): PartyWorldSave {
  if (battle.status !== "active" || battle.enemy.hp <= 0) {
    return { ...world, battle };
  }
  const living = battle.heroes.filter((h) => h.hp > 0);
  if (!living.length) return finishDefeat(world, battle);

  const target = living[Math.floor(rng() * living.length)]!;
  let b = battle;
  const targetChar = world.characters[target.slot];
  let skillBoost = battle.enemy.power * 2;
  let line = `${battle.enemy.name} strikes ${target.name}`;

  const skill = battle.enemy.uniqueSkill;
  if (battle.enemy.isBoss && skill && rng() < 0.45) {
    const cost = skill.manaCost ?? 0;
    if (battle.enemy.mana >= cost) {
      skillBoost = skill.power * 2.5;
      b = {
        ...b,
        enemy: { ...b.enemy, mana: Math.max(0, b.enemy.mana - cost) },
      };
      line = `${battle.enemy.name} uses ${skill.name} on ${target.name}`;
    }
  }

  const offense = resolveRoc({
    attributeScore: 12,
    skillValue: Math.round(skillBoost),
    situational: battle.enemy.isBoss ? 8 : 0,
    rng,
  });
  const defense = resolveRoc({
    attributeScore: targetChar?.stats.constitution ?? 10,
    skillValue: target.armor * 3 + Math.floor(target.power * 0.5),
    situational: 0,
    rng,
  });
  const { damage: mitigated } = rocDamageFromMargin(
    Math.max(2, battle.enemy.power),
    offense,
    defense.total,
    { armor: target.armor, minHit: offense.tier.success ? 1 : 0 }
  );
  b = recordRoc(b, offense);

  const heroes = b.heroes.map((h) =>
    h.id === target.id ? { ...h, hp: Math.max(0, h.hp - mitigated) } : h
  );
  b = {
    ...b,
    heroes,
    stats: {
      ...b.stats,
      damageTaken: b.stats.damageTaken + mitigated,
      turns: b.stats.turns + 1,
    },
  };
  b = pushLog(
    b,
    mitigated > 0
      ? `${line} — ${offense.label} vs DCF ${defense.total} → ${mitigated} dmg.`
      : `${line} — ${offense.label} (wiffs).`
  );

  // Sync character HP
  const characters = { ...world.characters };
  const hit = heroes.find((h) => h.id === target.id)!;
  characters[target.slot] = {
    ...characters[target.slot]!,
    hp: hit.hp,
  };

  if (heroes.every((h) => h.hp <= 0)) {
    return finishDefeat({ ...world, characters }, b);
  }

  b = advanceBattleTurn(b);
  // Tick down power-ups for the hero whose turn just ended is handled on their action
  return { ...world, characters, battle: b };
}

export type BattleActionOpts = {
  spellId?: string;
  itemId?: string;
};

export function performBattleAction(
  world: PartyWorldSave,
  actorSlot: PlayerSlot,
  action: BattleActionId,
  opts: BattleActionOpts = {},
  rng: () => number = Math.random
): { world: PartyWorldSave; message: string } {
  const battle = world.battle;
  if (!battle || battle.status !== "active") {
    return { world, message: "No active battle." };
  }
  if (battle.activeId !== actorSlot) {
    return { world, message: "Not your battle turn." };
  }

  let char = world.characters[actorSlot];
  let b = battle;
  const hero = b.heroes.find((h) => h.slot === actorSlot);
  if (!hero || hero.hp <= 0) return { world, message: "You cannot act." };

  let message = "";

  if (action === "attack") {
    const powered = hero.powerUpTurns > 0;
    const strike = combatStrikePower(hero.power, powered);
    const eff = computeEffectiveStats(char);
    // Keep ROC juicy without letting ATK dominate the chart.
    const skillValue =
      Math.round(hero.power * 0.75 + eff.crit * 0.35) + (powered ? 8 : 0);
    const offense = resolveRoc({
      attributeScore: eff.stats.dexterity,
      skillValue,
      situational: pathwaySituational(world) + Math.floor(eff.atk * 0.12),
      rng,
    });
    const defense = resolveDefenseRoc({
      armor: battle.enemy.armor,
      power: battle.enemy.power,
      level: partyLevel(world),
      rng,
    });
    const { damage: rawDmg } = rocDamageFromMargin(
      strike,
      offense,
      defense.total,
      { armor: battle.enemy.armor, minHit: offense.tier.success ? 1 : 0 }
    );
    const damage = clampOutgoingDamage(rawDmg, battle.enemy.maxHp);
    b = recordRoc(b, offense);
    if (damage > 0) {
      const dealt = dealToEnemy(b, damage);
      b = dealt.battle;
      message = `${char.name} attacks — ${offense.label} vs DCF ${defense.total} → ${dealt.damage} dmg.`;
    } else if (offense.tier.severity < 0) {
      const self = Math.max(1, Math.round(Math.abs(offense.tier.severity) * 4));
      char = { ...char, hp: Math.max(1, char.hp - self) };
      b = syncHeroFromChar(b, actorSlot, char);
      message = `${char.name} fumbles — ${offense.label} (−${self} HP).`;
    } else {
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
    char = {
      ...char,
      inventory: inv,
      hp: Math.min(battleMaxHp(char), char.hp + heal),
    };
    b = syncHeroFromChar(b, actorSlot, char);
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
    char = {
      ...char,
      inventory: inv,
      hp: Math.min(battleMaxHp({ ...char, inventory: inv }), char.hp + heal),
    };
    b = syncHeroFromChar(b, actorSlot, char);
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

    if (ab.tags.includes("heal") || ab.kind === "heal") {
      const eff = computeEffectiveStats(char);
      const roc = resolveRoc({
        attributeScore: eff.stats.wisdom,
        skillValue: ab.power * 2,
        situational: pathwaySituational(world),
        rng,
      });
      const heal = Math.max(
        1,
        Math.round(ab.power * Math.max(0.4, roc.tier.severity + 0.3))
      );
      char = { ...char, hp: Math.min(battleMaxHp(char), char.hp + heal) };
      if (roc.tier.xpBonus > 0) char = applyXp(char, roc.tier.xpBonus);
      b = syncHeroFromChar(b, actorSlot, char);
      b = recordRoc(b, roc);
      b = { ...b, stats: { ...b.stats, turns: b.stats.turns + 1 } };
      message = `${char.name} casts ${ab.name} — ${roc.label} → +${heal} HP.`;
      b = pushLog(b, message);
    } else {
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
        armor: battle.enemy.armor,
        power: battle.enemy.power,
        level: partyLevel(world),
        rng,
      });
      const { damage: rawDmg } = rocDamageFromMargin(
        strike,
        offense,
        defense.total,
        { armor: Math.floor(battle.enemy.armor * 0.5), minHit: offense.tier.success ? 1 : 0 }
      );
      const damage = clampOutgoingDamage(rawDmg, battle.enemy.maxHp);
      b = recordRoc(b, offense);
      if (damage > 0) {
        const dealt = dealToEnemy(b, damage);
        b = dealt.battle;
        message = `${char.name} casts ${ab.name} — ${offense.label} vs DCF ${defense.total} → ${dealt.damage} dmg.`;
      } else {
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
    }
  } else {
    return { world, message: "Unknown action." };
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

  // Advance to next; if enemy, auto-resolve enemy turn
  let nb = advanceBattleTurn(nextWorld.battle!);
  nextWorld = { ...nextWorld, battle: nb };
  if (nb.activeId === "enemy") {
    nextWorld = runEnemyTurn(nextWorld, nextWorld.battle!, rng);
    // After enemy, if still active and landed on a dead hero, advance again
    if (nextWorld.battle?.status === "active") {
      let cur = nextWorld.battle;
      if (cur.activeId === "enemy") {
        cur = advanceBattleTurn(cur);
        nextWorld = { ...nextWorld, battle: cur };
      }
    }
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
  return Math.max(0, BATTLE_MAX_MS - (nowMs - started));
}

export function turnIdleRemainingMs(battle: BattleState, nowMs = Date.now()): number {
  const started = Date.parse(battle.turnStartedAt ?? battle.startedAt) || nowMs;
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
  const battle = world.battle;
  if (!battle || battle.status !== "active") return { world };

  if (battleRemainingMs(battle, nowMs) <= 0) {
    const next = finishDefeat(
      world,
      battle,
      "Time! The clash hits the 10-minute hard cap — the party breaks."
    );
    return { world: next, message: "Battle timed out (10 min)." };
  }

  // Only idle-skip hero turns (enemy already auto-resolves after player acts).
  if (battle.activeId === "enemy") return { world };

  if (turnIdleRemainingMs(battle, nowMs) > 0) return { world };

  const hesitator =
    battle.heroes.find((h) => h.id === battle.activeId)?.name ?? "A hero";
  let nextWorld: PartyWorldSave = {
    ...world,
    battle: pushLog(
      battle,
      `${hesitator} hesitates too long — ${battle.enemy.name} seizes the opening!`
    ),
  };
  let nb = advanceBattleTurn(nextWorld.battle!);
  // Jump to enemy if advance landed on another hero — force foe strike on idle.
  if (nb.activeId !== "enemy") {
    const enemyIdx = nb.turnQueue.indexOf("enemy");
    if (enemyIdx >= 0) {
      nb = {
        ...nb,
        turnIndex: enemyIdx,
        activeId: "enemy",
        turnStartedAt: new Date(nowMs).toISOString(),
      };
    }
  }
  nextWorld = { ...nextWorld, battle: nb };
  if (nb.activeId === "enemy") {
    nextWorld = runEnemyTurn(nextWorld, nextWorld.battle!, rng);
    if (nextWorld.battle?.status === "active") {
      let cur = nextWorld.battle;
      if (cur.activeId === "enemy") {
        cur = advanceBattleTurn(cur);
        nextWorld = { ...nextWorld, battle: cur };
      }
    }
  }
  return {
    world: nextWorld,
    message: `${battle.enemy.name} strikes while the party idles.`,
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
  if (world.nextEncounterAtMs != null && world.nextEncounterAtMs > 0) return world;
  const fought = world.battlesFought ?? 0;
  return {
    ...world,
    storyPlayMs: world.storyPlayMs ?? 0,
    battlesFought: fought,
    nextEncounterAtMs: (world.storyPlayMs ?? 0) + rollNextEncounterThreshold(fought),
  };
}

/** Pause ambush clock during dialogue / path choices / story fights / deck fights. */
export function isAmbushTimerPaused(world: PartyWorldSave): boolean {
  if (world.battle) return true;
  if (world.deckEncounter) return true;
  if (world.encounterEnemyHp != null) return true;
  const node = getStoryNode(world.campaignNodeId);
  if (!node) return false;
  return (
    node.kind === "conversation" ||
    node.kind === "path" ||
    node.kind === "encounter"
  );
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
