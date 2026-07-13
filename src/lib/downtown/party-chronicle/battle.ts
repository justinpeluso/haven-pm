/**
 * Neverworld turn-based battle engine.
 * Actions: Attack, Power Up, Eat, Spell, Drink HP, Drink Mana.
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

const POWER_UP_TURNS = 3;
const POWER_UP_MULT = 1.5;

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

function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
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
  return {
    ...battle,
    turnIndex: idx,
    activeId: battle.turnQueue[idx]!,
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
  };
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
  const battle: BattleState = {
    id: `battle-${Date.now()}`,
    status: "active",
    enemy,
    heroes,
    turnQueue,
    turnIndex: 0,
    activeId: turnQueue[0]!,
    log: [`Ambush! ${enemy.name} bars the path.`],
    stats: { damageDealt: 0, damageTaken: 0, turns: 0 },
    summary: null,
    startedAt: new Date().toISOString(),
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
  const battle: BattleState = {
    id: `battle-${Date.now()}`,
    status: "active",
    enemy,
    heroes,
    turnQueue,
    turnIndex: 0,
    activeId: turnQueue[0]!,
    log: [`${enemy.name} challenges the party.`],
    stats: { damageDealt: 0, damageTaken: 0, turns: 0 },
    summary: null,
    startedAt: new Date().toISOString(),
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

  // Sync all hero HP/mana from battle
  const characters = { ...world.characters };
  for (const h of battle.heroes) {
    const c = characters[h.slot];
    if (!c) continue;
    characters[h.slot] = {
      ...(h.slot === rewardSlot ? char : c),
      hp: Math.max(1, Math.min(c.maxHp, h.hp)),
      mana: Math.max(0, Math.min(c.maxMana, h.mana)),
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
  return {
    ...world,
    characters,
    battle: nextBattle,
    battlesFought: fought,
    nextEncounterAtMs: (world.storyPlayMs ?? 0) + rollNextEncounterThreshold(fought),
    log: [
      `Victory vs ${battle.enemy.name} (+${battle.enemy.xp} XP, +${battle.enemy.gold}g).`,
      ...world.log,
    ].slice(0, 80),
  };
}

function finishDefeat(world: PartyWorldSave, battle: BattleState): PartyWorldSave {
  const characters = { ...world.characters };
  for (const h of battle.heroes) {
    const c = characters[h.slot];
    if (!c) continue;
    characters[h.slot] = {
      ...c,
      hp: Math.max(1, Math.floor(c.maxHp * 0.25)),
      mana: Math.max(0, Math.floor(c.maxMana * 0.25)),
    };
  }
  const summary = buildSummary(battle, false, [], 0, 0);
  const fought = (world.battlesFought ?? 0) + 1;
  return {
    ...world,
    characters,
    battle: {
      ...pushLog(battle, "The party is defeated…"),
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
  let dmg = battle.enemy.power + rngInt(1, 6, rng);
  let line = `${battle.enemy.name} strikes ${target.name}`;

  const skill = battle.enemy.uniqueSkill;
  if (battle.enemy.isBoss && skill && rng() < 0.45) {
    const cost = skill.manaCost ?? 0;
    if (battle.enemy.mana >= cost) {
      dmg = skill.power + rngInt(1, 4, rng);
      b = {
        ...b,
        enemy: { ...b.enemy, mana: Math.max(0, b.enemy.mana - cost) },
      };
      line = `${battle.enemy.name} uses ${skill.name} on ${target.name}`;
    }
  }

  const mitigated = Math.max(1, dmg - target.armor);
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
  b = pushLog(b, `${line} for ${mitigated} damage.`);

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
    const mult = hero.powerUpTurns > 0 ? POWER_UP_MULT : 1;
    const eff = computeEffectiveStats(char);
    const isCrit = rng() * 100 < Math.min(45, eff.crit);
    const raw =
      Math.floor((hero.power + rngInt(1, 6, rng)) * mult * (isCrit ? 1.5 : 1)) +
      abilityMod(eff.stats.dexterity);
    const dealt = dealToEnemy(b, raw);
    b = dealt.battle;
    b = {
      ...b,
      heroes: b.heroes.map((h) =>
        h.slot === actorSlot
          ? { ...h, powerUpTurns: Math.max(0, h.powerUpTurns - 1) }
          : h
      ),
    };
    message = `${char.name} attacks for ${dealt.damage} damage${isCrit ? " (crit!)" : ""}.`;
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
    const itemId = opts.itemId && foods.includes(opts.itemId) ? opts.itemId : foods[0];
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
    const itemId = opts.itemId && pots.includes(opts.itemId) ? opts.itemId : pots[0];
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
    const itemId = opts.itemId && pots.includes(opts.itemId) ? opts.itemId : pots[0];
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
    const spellId =
      opts.spellId && spells.includes(opts.spellId) ? opts.spellId : spells[0];
    if (!spellId) return { world, message: "No spells known." };
    const ab = getAbility(spellId) ?? getSpellbookAbility(spellId);
    if (!ab) return { world, message: "Unknown spell." };
    const manaCost = ab.cost?.mana ?? 0;
    if (char.mana < manaCost) return { world, message: "Not enough mana." };
    char = { ...char, mana: char.mana - manaCost };

    if (ab.tags.includes("heal") || ab.kind === "heal") {
      const heal = ab.power;
      char = { ...char, hp: Math.min(battleMaxHp(char), char.hp + heal) };
      b = syncHeroFromChar(b, actorSlot, char);
      b = { ...b, stats: { ...b.stats, turns: b.stats.turns + 1 } };
      message = `${char.name} casts ${ab.name} — heals ${heal} HP.`;
      b = pushLog(b, message);
    } else {
      const mult = hero.powerUpTurns > 0 ? POWER_UP_MULT : 1;
      const eff = computeEffectiveStats(char);
      const raw =
        Math.floor((ab.power + abilityMod(eff.stats.intelligence) + Math.floor(eff.atk * 0.25)) * mult) +
        rngInt(1, 4, rng);
      const dealt = dealToEnemy(b, raw);
      b = dealt.battle;
      b = syncHeroFromChar(b, actorSlot, char);
      b = {
        ...b,
        heroes: b.heroes.map((h) =>
          h.slot === actorSlot
            ? { ...h, powerUpTurns: Math.max(0, h.powerUpTurns - 1), mana: char.mana }
            : h
        ),
      };
      message = `${char.name} casts ${ab.name} for ${dealt.damage} damage.`;
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

  let next = ensureEncounterSchedule(world);
  const storyPlayMs = (next.storyPlayMs ?? 0) + Math.max(0, deltaMs);
  next = { ...next, storyPlayMs };
  const due = storyPlayMs >= (next.nextEncounterAtMs ?? Number.POSITIVE_INFINITY);
  return { world: next, shouldStartBattle: due };
}
