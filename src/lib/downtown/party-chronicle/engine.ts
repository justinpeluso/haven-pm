import { mergeAlignment } from "./alignment";
import { getAbility, getNode } from "./skills";
import { buildCombatUsePayload } from "./hotbar";
import { getGear } from "./gear";
import { resolveActiveEncounterIfDead } from "./midgame";
import {
  chapterForNode,
  getStoryNode,
  resolveFinaleNodeId,
} from "./story";
import {
  levelFromXp,
  skillPointsForLevelGain,
} from "./progression";
import type {
  CharacterSave,
  CombatUsePayload,
  PartyWorldSave,
  PlayerSlot,
  SkillNode,
  StatKey,
  StoryChoice,
  StoryOutcome,
} from "./types";
import { PLAYER_SLOT_ORDER, STAT_KEYS } from "./types";

export function abilityMod(score: number): number {
  return Math.floor((score - 10) / 2);
}

export function rollD20(): number {
  return 1 + Math.floor(Math.random() * 20);
}

export function nextSlot(current: PlayerSlot): PlayerSlot {
  const i = PLAYER_SLOT_ORDER.indexOf(current);
  return PLAYER_SLOT_ORDER[(i + 1) % PLAYER_SLOT_ORDER.length]!;
}

export function partyAvgLevel(world: PartyWorldSave): number {
  const levels = PLAYER_SLOT_ORDER.map((s) => world.characters[s].level);
  return Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
}

export function canAct(world: PartyWorldSave, slot: PlayerSlot, isDm: boolean): boolean {
  if (world.endingId) return false;
  if (world.activeSlot === slot) return true;
  // DM can unstick the chronicle when a seat is AFK (solo / demo play).
  if (isDm) return true;
  return false;
}

export function advanceTurn(world: PartyWorldSave): PartyWorldSave {
  const next = nextSlot(world.activeSlot);
  return {
    ...world,
    activeSlot: next,
    turnIndex: world.turnIndex + 1,
    log: [`Turn ${world.turnIndex + 1}: ${next}'s move.`, ...world.log].slice(0, 80),
  };
}

function applyXp(char: CharacterSave, xp: number): CharacterSave {
  const before = char.level;
  const newXp = char.xp + xp;
  const after = levelFromXp(newXp);
  const pts = skillPointsForLevelGain(before, after);
  const hpBump = Math.max(0, after - before) * 2;
  return {
    ...char,
    xp: newXp,
    level: after,
    skillPoints: char.skillPoints + pts,
    maxHp: char.maxHp + hpBump,
    hp: Math.min(char.maxHp + hpBump, char.hp + hpBump),
  };
}

function mergeFlags(existing: string[], add?: string[], remove?: string[]): string[] {
  let out = [...existing];
  if (add) for (const f of add) if (!out.includes(f)) out.push(f);
  if (remove) out = out.filter((f) => !remove.includes(f));
  return out;
}

export function unlockNode(char: CharacterSave, node: SkillNode): CharacterSave | { error: string } {
  if (char.unlockedNodes.includes(node.id)) return { error: "Already unlocked." };
  if (char.skillPoints < node.cost) return { error: "Not enough skill points." };
  if (char.level < node.minLevel) return { error: `Requires level ${node.minLevel}.` };
  for (const req of node.requires) {
    if (!char.unlockedNodes.includes(req)) return { error: "Missing prerequisite." };
  }
  let abilities = [...char.abilities];
  let hotbar = [...char.hotbar];
  if (node.grantsAbilityId && !abilities.includes(node.grantsAbilityId)) {
    abilities.push(node.grantsAbilityId);
    const empty = hotbar.findIndex((s) => s == null);
    if (empty >= 0) hotbar[empty] = node.grantsAbilityId;
  }
  const stats = { ...char.stats };
  if (node.statBump) {
    for (const k of STAT_KEYS) {
      if (node.statBump[k]) stats[k] = Math.min(20, stats[k] + (node.statBump[k] ?? 0));
    }
  }
  return {
    ...char,
    skillPoints: char.skillPoints - node.cost,
    unlockedNodes: [...char.unlockedNodes, node.id],
    abilities,
    hotbar,
    stats,
  };
}

export function setHotbarSlot(char: CharacterSave, index: number, abilityId: string | null): CharacterSave {
  if (index < 0 || index >= char.hotbar.length) return char;
  if (abilityId && !char.abilities.includes(abilityId)) return char;
  const hotbar = [...char.hotbar];
  hotbar[index] = abilityId;
  return { ...char, hotbar };
}

export function equipItem(char: CharacterSave, itemId: string): CharacterSave | { error: string } {
  const gear = getGear(itemId);
  if (!gear) return { error: "Unknown item." };
  if (!char.inventory.includes(itemId)) return { error: "Not in inventory." };
  if (gear.slot === "consumable" || gear.slot === "misc") return { error: "Not equippable." };
  const equipped = { ...char.equipped, [gear.slot]: itemId };
  return { ...char, equipped };
}

export function useHotbarAbility(
  world: PartyWorldSave,
  slot: PlayerSlot,
  abilityId: string
): { world: PartyWorldSave; message: string; payload?: CombatUsePayload } {
  const char = world.characters[slot];
  const ab = getAbility(abilityId);
  if (!ab) return { world, message: "Unknown ability." };
  const slotIndex = char.hotbar.indexOf(abilityId);
  if (slotIndex < 0) return { world, message: "Not on hotbar." };

  const staminaCost = ab.cost?.stamina ?? 0;
  const manaCost = ab.cost?.mana ?? 0;
  if (char.stamina < staminaCost || char.mana < manaCost) {
    return { world, message: "Not enough stamina/mana." };
  }

  const payload = buildCombatUsePayload(abilityId, slotIndex) ?? undefined;

  let nextChar: CharacterSave = {
    ...char,
    stamina: char.stamina - staminaCost,
    mana: char.mana - manaCost,
  };

  let enemyHp = world.encounterEnemyHp;
  let logLine = payload?.flavor ?? `${char.name} uses ${ab.name}.`;

  if (ab.tags.includes("heal") || ab.kind === "heal" || ab.kind === "cook") {
    const heal = ab.power;
    nextChar = {
      ...nextChar,
      hp: Math.min(nextChar.maxHp, nextChar.hp + heal),
      dog: {
        ...nextChar.dog,
        hp: Math.min(nextChar.dog.maxHp, nextChar.dog.hp + Math.floor(heal / 2)),
        bond: Math.min(100, nextChar.dog.bond + 1),
      },
    };
    logLine = `${char.name} uses ${ab.name} — heals ${heal} HP.`;
  } else if (ab.power > 0 && enemyHp != null) {
    const weapon = nextChar.equipped.weapon ? getGear(nextChar.equipped.weapon) : undefined;
    const dmg = ab.power + (weapon?.power ?? 0) + abilityMod(nextChar.stats.strength);
    enemyHp = Math.max(0, enemyHp - dmg);
    logLine = `${char.name} uses ${ab.name} for ${dmg} damage. Enemy HP ${enemyHp}.`;
  } else if (ab.kind === "hound") {
    nextChar = {
      ...nextChar,
      dog: { ...nextChar.dog, bond: Math.min(100, nextChar.dog.bond + 3) },
    };
    if (enemyHp != null && ab.power > 0) {
      enemyHp = Math.max(0, enemyHp - ab.power);
      logLine = `${nextChar.dog.name} strikes via ${ab.name} for ${ab.power}. Enemy HP ${enemyHp}.`;
    }
  }

  let nextWorld: PartyWorldSave = {
    ...world,
    characters: { ...world.characters, [slot]: nextChar },
    encounterEnemyHp: enemyHp,
    log: [logLine, ...world.log].slice(0, 80),
  };

  if (world.deckEncounter && enemyHp === 0 && world.encounterEnemyHp != null && world.encounterEnemyHp > 0) {
    nextWorld = resolveActiveEncounterIfDead(nextWorld, slot);
    logLine = `${logLine} Road clear.`;
  }

  return {
    world: nextWorld,
    message: logLine,
    payload,
  };
}

function outcomeApplies(
  choice: StoryChoice,
  char: CharacterSave,
  partyFlags: string[]
): { ok: boolean; roll?: { d20: number; total: number; success: boolean }; outcome: StoryOutcome } {
  if (choice.requireFlag && !partyFlags.includes(choice.requireFlag) && !char.flags.includes(choice.requireFlag)) {
    return {
      ok: false,
      outcome: { text: "That path is sealed by fate (missing flag)." },
    };
  }
  if (choice.requireAbility && !char.abilities.includes(choice.requireAbility)) {
    return {
      ok: false,
      outcome: { text: `Requires ability unlocked: ${choice.requireAbility}.` },
    };
  }
  if (choice.outcome) {
    return { ok: true, outcome: choice.outcome };
  }
  const fallback: StoryOutcome = { text: "The chronicle turns a page." };
  if (choice.stat && choice.dc != null) {
    const d20 = rollD20();
    const mod = abilityMod(char.stats[choice.stat as StatKey]);
    const total = d20 + mod;
    const success = total >= choice.dc;
    const outcome = (success ? choice.success : choice.fail ?? choice.success) ?? fallback;
    return { ok: true, roll: { d20, total, success }, outcome };
  }
  return { ok: true, outcome: choice.success ?? fallback };
}

export function applyStoryChoice(
  world: PartyWorldSave,
  slot: PlayerSlot,
  choice: StoryChoice
): { world: PartyWorldSave; message: string; roll?: { d20: number; total: number; success: boolean } } {
  const char = world.characters[slot];
  const applied = outcomeApplies(choice, char, world.partyFlags);
  if (!applied.ok && !applied.outcome.nextNodeId) {
    return { world, message: applied.outcome.text };
  }

  const o = applied.outcome;
  let nextChar = { ...char };
  if (o.xp) nextChar = applyXp(nextChar, o.xp);
  if (o.gold) nextChar = { ...nextChar, gold: nextChar.gold + o.gold };
  if (o.itemId && !nextChar.inventory.includes(o.itemId)) {
    nextChar = { ...nextChar, inventory: [...nextChar.inventory, o.itemId] };
  }
  if (o.damage) nextChar = { ...nextChar, hp: Math.max(1, nextChar.hp - o.damage) };
  if (o.healParty) {
    nextChar = {
      ...nextChar,
      hp: Math.min(nextChar.maxHp, nextChar.hp + o.healParty),
      dog: {
        ...nextChar.dog,
        hp: Math.min(nextChar.dog.maxHp, nextChar.dog.hp + Math.floor(o.healParty / 2)),
      },
    };
  }
  nextChar = {
    ...nextChar,
    flags: mergeFlags(nextChar.flags, o.flagsAdd, o.flagsRemove),
    choiceLog: [
      ...nextChar.choiceLog,
      { nodeId: world.campaignNodeId, choiceId: choice.id, at: new Date().toISOString() },
    ],
  };

  const partyFlags = mergeFlags(world.partyFlags, o.flagsAdd, o.flagsRemove);
  const alignment = mergeAlignment(world.alignment ?? { animal: 0, human: 0, demon: 0 }, o.alignment);
  let campaignNodeId = world.campaignNodeId;
  let chapterId = world.chapterId;
  let endingId = world.endingId;
  let encounterEnemyHp = world.encounterEnemyHp;

  if (o.nextNodeId) {
    campaignNodeId = o.nextNodeId;
    const ch = chapterForNode(o.nextNodeId);
    if (ch) chapterId = ch.id;
    const node = getStoryNode(o.nextNodeId);
    if (node?.kind === "encounter") {
      encounterEnemyHp = node.enemyHp;
    } else if (node?.kind === "ending") {
      endingId = node.endingId;
      encounterEnemyHp = null;
    } else {
      encounterEnemyHp = null;
    }
  }
  if (o.endingId) endingId = o.endingId;

  const advanced = advanceTurn({
    ...world,
    characters: { ...world.characters, [slot]: nextChar },
    partyFlags,
    alignment,
    campaignNodeId,
    chapterId,
    endingId,
    encounterEnemyHp,
    deckEncounter: encounterEnemyHp == null ? null : world.deckEncounter,
    log: [o.text, ...world.log].slice(0, 80),
  });

  return {
    world: advanced,
    message: o.text,
    roll: applied.roll,
  };
}

export function acknowledgeNarrative(world: PartyWorldSave, slot: PlayerSlot): PartyWorldSave {
  const node = getStoryNode(world.campaignNodeId);
  if (!node || (node.kind !== "narrative" && node.kind !== "montage")) return world;
  const partyFlags = mergeFlags(world.partyFlags, node.flagsAdd);
  let nextId = node.next;
  let endingId = world.endingId;
  let characters = world.characters;
  // Cumulative path → finale splash when trusting the chronicle.
  if (node.id === "node-finale-resolve") {
    nextId = resolveFinaleNodeId(world.alignment ?? { animal: 0, human: 0, demon: 0 });
  }
  if (node.kind === "montage" && node.xpGrant > 0) {
    const char = applyXp(characters[slot], node.xpGrant);
    characters = { ...characters, [slot]: char };
  }
  const ch = chapterForNode(nextId);
  const nextNode = getStoryNode(nextId);
  if (nextNode?.kind === "ending") endingId = nextNode.endingId;
  // Do NOT advance the turn here — Continue only flips the panel so the same
  // player can take the next choice (Pip / path forks). Turn burns on choices & combat.
  return {
    ...world,
    characters,
    partyFlags,
    campaignNodeId: nextId,
    chapterId: ch?.id ?? world.chapterId,
    endingId,
    encounterEnemyHp: nextNode?.kind === "encounter" ? nextNode.enemyHp : null,
    log: [`${world.characters[slot].name} continues the chronicle.`, ...world.log].slice(0, 80),
  };
}

export function spendSkillPoint(world: PartyWorldSave, slot: PlayerSlot, nodeId: string) {
  const node = getNode(nodeId);
  if (!node) return { world, error: "Unknown node." };
  const result = unlockNode(world.characters[slot], node);
  if ("error" in result) return { world, error: result.error };
  return {
    world: {
      ...world,
      characters: { ...world.characters, [slot]: result },
      log: [`${result.name} unlocks ${node.name}.`, ...world.log].slice(0, 80),
    },
  };
}
