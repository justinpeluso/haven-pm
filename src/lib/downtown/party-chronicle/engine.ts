import { mergeAlignment } from "./alignment";
import {
  EMPTY_PATHWAY,
  mergePathway,
  pathwayFromAlignmentDelta,
  pathwayLabel,
} from "./pathway";
import { applyRaceToStats, RACE_DEFS, type RaceId } from "./races";
import { resolveRoc, storyDcToRocTarget } from "./roc";
import { markChapterVisited } from "./journey";
import { getAbility, getNode } from "./skills";
import { buildCombatUsePayload } from "./hotbar";
import { getGear } from "./gear";
import { resolveActiveEncounterIfDead } from "./midgame";
import {
  CHAPTERS,
  chapterForNode,
  getStoryNode,
  resolveFinaleNodeId,
} from "./story";
import { resolveSpineHandoff } from "./spine";
import {
  levelFromXp,
  skillPointsForLevelGain,
} from "./progression";
import type {
  CharacterSave,
  CombatUsePayload,
  EquipSlot,
  GearTier,
  PartyWorldSave,
  PlayerSlot,
  SkillNode,
  StatKey,
  StoryChoice,
  StoryOutcome,
} from "./types";
import { EQUIP_SLOTS, PLAYER_SLOT_ORDER, STAT_KEYS } from "./types";
import { battleAttackPower, battleMaxHp, battleMaxMana } from "./stats";

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

/** Advance to the next seat that has sealed a hero (falls back to normal rotation). */
export function nextPlayableSlot(world: PartyWorldSave, current: PlayerSlot): PlayerSlot {
  const sealed = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (sealed.length === 0) return nextSlot(current);
  const from = sealed.indexOf(current);
  if (from < 0) return sealed[0]!;
  return sealed[(from + 1) % sealed.length]!;
}

export function partyAvgLevel(world: PartyWorldSave): number {
  const levels = PLAYER_SLOT_ORDER.map((s) => world.characters[s]?.level ?? 1);
  return Math.round(levels.reduce((a, b) => a + b, 0) / levels.length);
}

/** Undo an accidental / early finale and resume at the Last Council. */
export function rewindFromEnding(world: PartyWorldSave): PartyWorldSave {
  const ch = chapterForNode(world.campaignNodeId);
  const onEndingChapter = ch?.id === "ch10-endings";
  const onEndingNode = getStoryNode(world.campaignNodeId)?.kind === "ending";
  if (!world.endingId && !onEndingChapter && !onEndingNode) return world;
  return markChapterVisited(
    {
      ...world,
      endingId: null,
      campaignNodeId: "node-ch9-council",
      chapterId: "ch9-last-council",
      encounterEnemyHp: null,
      deckEncounter: null,
      log: [
        "The chronicle unspools — back to the Last Council. Keep exploring Camp before you name a crown.",
        ...world.log,
      ].slice(0, 80),
      updatedAt: new Date().toISOString(),
    },
    "ch9-last-council"
  );
}

/**
 * If Continue / sync dropped the party on an ending plate mid-campaign,
 * bounce them back to a playable road node.
 */
export function rescueFromStrandedEnding(world: PartyWorldSave): PartyWorldSave {
  const node = getStoryNode(world.campaignNodeId);
  const onEnding =
    !!world.endingId ||
    node?.kind === "ending" ||
    chapterForNode(world.campaignNodeId)?.id === "ch10-endings";
  if (!onEnding) return world;
  const battles = world.battlesFought ?? 0;
  // Exact finale markers only — never match foreshadow like `saw-wild-crown`.
  const fromCouncilVote = (world.partyFlags ?? []).some(
    (f) =>
      f === "finale-resolving" ||
      f === "council-vote" ||
      f.startsWith("council-vote:")
  );
  // Legitimate long-run finale — leave it alone.
  if (world.endingId && (battles >= 80 || fromCouncilVote)) return world;

  // Early strand: don't dump them on Last Council; send them to Goblin Road.
  // Tag the rescue so poll/merge prefers the road over a stale ending plate.
  const rescueFlags = Array.from(
    new Set([...(world.partyFlags ?? []), "rescued-from-early-ending"])
  );
  if (battles < 40) {
    return markChapterVisited(
      {
        ...world,
        endingId: null,
        campaignNodeId: "node-ch2-road",
        chapterId: "ch2-goblin-road",
        encounterEnemyHp: null,
        deckEncounter: null,
        partyFlags: rescueFlags,
        log: [
          "The chronicle pulls you back to the Goblin Road — that ending plate was early. Keep playing the main road.",
          ...world.log,
        ].slice(0, 80),
        updatedAt: new Date().toISOString(),
      },
      "ch2-goblin-road"
    );
  }
  const rewound = rewindFromEnding(world);
  if (rewound === world) return world;
  return {
    ...rewound,
    partyFlags: Array.from(
      new Set([...(rewound.partyFlags ?? []), "rescued-from-early-ending"])
    ),
  };
}

export function canAct(world: PartyWorldSave, slot: PlayerSlot, isDm: boolean): boolean {
  if (world.endingId) return false;
  if (!world.characters[slot]?.created) return false;
  if (world.activeSlot === slot) return true;
  // DM can unstick the chronicle when a seat is AFK (solo / demo play).
  if (isDm) return true;
  return false;
}

export function advanceTurn(world: PartyWorldSave): PartyWorldSave {
  const next = nextPlayableSlot(world, world.activeSlot);
  return {
    ...world,
    activeSlot: next,
    turnIndex: world.turnIndex + 1,
    log: [`Turn ${world.turnIndex + 1}: ${next}'s move.`, ...world.log].slice(0, 80),
  };
}

function applyXp(char: CharacterSave, xp: number): CharacterSave {
  if (xp <= 0) return char;
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

/**
 * Spine generator overshot XP (often 100–500 per panel). Clamp so Continue
 * can't teleport the party to finale unlock levels in a few minutes.
 */
export function sanitizeStoryXp(raw: number | undefined | null): number {
  if (raw == null || raw <= 0) return 0;
  return Math.max(2, Math.min(12, Math.round(raw / 40)));
}

function chapterOrdinal(chapterId: string | undefined | null): number {
  if (!chapterId) return 0;
  const idx = CHAPTERS.findIndex((c) => c.id === chapterId);
  return idx >= 0 ? idx : 0;
}

/** Soft gates so the comic spine can't race to the finale in a dozen clicks. */
export function progressGateForNode(
  world: PartyWorldSave,
  nextNodeId: string
): { ok: boolean; reason?: string } {
  const nextCh = chapterForNode(nextNodeId);
  const curCh = chapterForNode(world.campaignNodeId);
  if (!nextCh) return { ok: true };

  const battles = world.battlesFought ?? 0;
  const sideQuests = world.completedSideQuests?.length ?? 0;
  const exploration = world.explorationFinds ?? 0;
  const recipes = world.cookedRecipes?.length ?? 0;
  const deeds = battles + sideQuests * 2 + exploration + recipes;
  const turns = world.turnIndex ?? 0;
  const nextNode = getStoryNode(nextNodeId);
  const curId = world.campaignNodeId;

  // Ending plates are choice-only from the Last Council — never via Continue spam.
  // Checked before ordinal short-circuit (spine → landmark can look "backward").
  const isEndingNode =
    nextNode?.kind === "ending" ||
    nextCh.id === "ch10-endings" ||
    nextNodeId.startsWith("node-finale-animal") ||
    nextNodeId.startsWith("node-finale-human") ||
    nextNodeId.startsWith("node-finale-demon");

  if (isEndingNode) {
    const fromCouncil =
      curId === "node-ch9-choose" ||
      curId === "node-finale-resolve" ||
      curId === "node-ch9-council";
    if (!fromCouncil) {
      return {
        ok: false,
        reason:
          "That crown ending is sealed for later. Stay on the main road — use Camp, battles, and Continue; the Last Council vote comes at the end.",
      };
    }
    const ok = battles >= 13 || (deeds >= 40 && turns >= 120);
    if (!ok) {
      return {
        ok: false,
        reason:
          "The crowns won't settle yet. Reach 13 battles, or 40 Camp deeds with 120 turns, then vote at the Last Council.",
      };
    }
    return { ok: true };
  }

  const isLastCouncil =
    nextCh.id === "ch9-last-council" ||
    nextNodeId.startsWith("node-ch9-") ||
    nextNodeId === "node-finale-resolve" ||
    /^spine-(4[8-9]|50)\b/.test(nextCh.id);

  if (isLastCouncil) {
    const ok = battles >= 13 || (deeds >= 40 && turns >= 120);
    if (!ok) {
      return {
        ok: false,
        reason:
          "The Last Council won't open yet — live the chronicle first. Reach 13 battles, or 40 Camp deeds with 120 turns.",
      };
    }
    // Fall through if already unlocked — still allow ordinal checks for other nodes.
  }

  const curOrd = chapterOrdinal(curCh?.id);
  const nextOrd = chapterOrdinal(nextCh.id);
  // Same act or revisiting an earlier list index — fine (except endings handled above).
  if (nextOrd <= curOrd) return { ok: true };

  // First two acts stay open; after that require fights / Camp — not story XP level.
  if (nextOrd <= 2) return { ok: true };

  // Late spine / council already cleared above when battles >= 13.
  if (isLastCouncil) return { ok: true };

  const needBattles = 13;
  const needDeeds = Math.min(40, Math.max(4, Math.ceil(nextOrd * 0.75)));
  const needTurns = Math.min(120, Math.max(10, nextOrd * 3));

  if (battles >= needBattles) return { ok: true };
  if (deeds >= needDeeds && turns >= needTurns) return { ok: true };

  return {
    ok: false,
    reason: `${nextCh.title} still lies ahead. Win ${needBattles} battles (have ${battles}), or build ${needDeeds} Camp deeds with ${needTurns} turns — story clicks alone won't open the next act.`,
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
  const next: CharacterSave = { ...char, equipped };
  const maxHp = battleMaxHp(next);
  const maxMana = battleMaxMana(next);
  return {
    ...next,
    hp: Math.min(next.hp, maxHp),
    mana: Math.min(next.mana, maxMana),
  };
}

export function unequipSlot(
  char: CharacterSave,
  slot: EquipSlot
): CharacterSave | { error: string } {
  if (!char.equipped[slot]) return { error: "Nothing equipped." };
  const equipped = { ...char.equipped, [slot]: null };
  const next: CharacterSave = { ...char, equipped };
  const maxHp = battleMaxHp(next);
  const maxMana = battleMaxMana(next);
  return {
    ...next,
    hp: Math.min(next.hp, maxHp),
    mana: Math.min(next.mana, maxMana),
  };
}

const SALVAGE_GOLD: Record<GearTier, number> = {
  common: 4,
  magic: 14,
  rare: 40,
  legendary: 90,
};

/** Break down an unequipped inventory item into scrap gold. */
export function salvageInventoryItem(
  char: CharacterSave,
  itemId: string
): { char: CharacterSave; gold: number; name: string } | { error: string } {
  const gear = getGear(itemId);
  if (!gear) return { error: "Unknown item." };
  const invIdx = char.inventory.indexOf(itemId);
  if (invIdx < 0) return { error: "Not in inventory." };
  const worn = EQUIP_SLOTS.some((s) => char.equipped[s] === itemId);
  if (worn) return { error: "Unequip it before breaking it down." };

  const gold = SALVAGE_GOLD[gear.tier] ?? 4;
  const inventory = [...char.inventory];
  inventory.splice(invIdx, 1);
  return {
    char: { ...char, inventory, gold: char.gold + gold },
    gold,
    name: gear.name,
  };
}

/** Use a potion / food / stamina brew from the Gear tab (outside battle). */
export function useInventoryConsumable(
  char: CharacterSave,
  itemId: string
): CharacterSave | { error: string } {
  const gear = getGear(itemId);
  if (!gear) return { error: "Unknown item." };
  if (!char.inventory.includes(itemId)) return { error: "Not in inventory." };
  if (gear.slot !== "consumable") return { error: "Not a consumable." };

  const idx = char.inventory.indexOf(itemId);
  if (idx < 0) return { error: "Item missing." };
  const inventory = [...char.inventory];
  inventory.splice(idx, 1);

  const heal = gear.heal ?? 0;
  const mana = gear.manaRestore ?? 0;
  const stamina = gear.staminaRestore ?? (gear.tags.includes("stamina") ? 15 : 0);
  if (heal <= 0 && mana <= 0 && stamina <= 0 && !gear.tags.includes("dog")) {
    return { error: "This item has no usable effect." };
  }

  const maxHp = battleMaxHp({ ...char, inventory });
  const maxMana = battleMaxMana({ ...char, inventory });

  let next: CharacterSave = {
    ...char,
    inventory,
    hp: Math.min(maxHp, char.hp + heal),
    mana: Math.min(maxMana, char.mana + mana),
    stamina: Math.min(char.maxStamina, char.stamina + stamina),
  };

  if (gear.tags.includes("dog")) {
    next = {
      ...next,
      dog: {
        ...next.dog,
        hp: Math.min(next.dog.maxHp, next.dog.hp + Math.max(5, Math.floor(heal / 2) || 8)),
        bond: Math.min(100, next.dog.bond + 2),
      },
    };
  }

  return next;
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
    const dmg = ab.power + battleAttackPower(nextChar) + abilityMod(nextChar.stats.dexterity);
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
): {
  ok: boolean;
  roll?: {
    d20: number;
    total: number;
    success: boolean;
    rocTotal?: number;
    rocLabel?: string;
  };
  outcome: StoryOutcome;
} {
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
    const skillNodes = char.unlockedNodes.length * 2;
    const roc = resolveRoc({
      attributeScore: char.stats[choice.stat as StatKey],
      skillValue: skillNodes,
      situational: 0,
    });
    const target = storyDcToRocTarget(choice.dc);
    const success = roc.total >= target || (roc.tier.success && roc.total >= target - 10);
    const outcome = (success ? choice.success : choice.fail ?? choice.success) ?? fallback;
    // Keep d20-shaped roll object for older UI; embed ROC totals.
    return {
      ok: true,
      roll: {
        d20: roc.dice[0] ?? 0,
        total: roc.total,
        success,
        rocTotal: roc.total,
        rocLabel: `${roc.label} (need ~${target})`,
      },
      outcome,
    };
  }
  return { ok: true, outcome: choice.success ?? fallback };
}

export function applyStoryChoice(
  world: PartyWorldSave,
  slot: PlayerSlot,
  choice: StoryChoice
): {
  world: PartyWorldSave;
  message: string;
  roll?: {
    d20: number;
    total: number;
    success: boolean;
    rocTotal?: number;
    rocLabel?: string;
  };
} {
  const char = world.characters[slot];
  const applied = outcomeApplies(choice, char, world.partyFlags);
  if (!applied.ok && !applied.outcome.nextNodeId) {
    return { world, message: applied.outcome.text };
  }

  const o = applied.outcome;
  let nextChar = { ...char };
  if (o.xp) nextChar = applyXp(nextChar, sanitizeStoryXp(o.xp));
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
  const pathway = mergePathway(
    world.pathway ?? EMPTY_PATHWAY,
    o.pathway ?? pathwayFromAlignmentDelta(o.alignment)
  );
  let campaignNodeId = world.campaignNodeId;
  let chapterId = world.chapterId;
  let endingId = world.endingId;
  let encounterEnemyHp = world.encounterEnemyHp;

  if (o.nextNodeId) {
    const nextNodeId = resolveSpineHandoff(world.campaignNodeId, o.nextNodeId);
    const gate = progressGateForNode(world, nextNodeId);
    if (!gate.ok) {
      return {
        world,
        message: gate.reason ?? "The road ahead isn't open yet — try Camp first.",
      };
    }
    campaignNodeId = nextNodeId;
    const ch = chapterForNode(nextNodeId);
    if (ch) chapterId = ch.id;
    const node = getStoryNode(nextNodeId);
    if (node?.kind === "encounter") {
      encounterEnemyHp = node.enemyHp;
    } else if (node?.kind === "ending") {
      endingId = node.endingId;
      encounterEnemyHp = null;
    } else {
      encounterEnemyHp = null;
    }
  }
  // Don't seal the chronicle unless we actually moved onto an ending node.
  if (o.endingId && o.nextNodeId) {
    const landed = getStoryNode(campaignNodeId);
    if (landed?.kind === "ending") endingId = o.endingId;
  }

  if (applied.roll?.rocTotal && applied.roll.rocTotal >= 700) {
    nextChar = {
      ...nextChar,
      flags: Array.from(new Set([...nextChar.flags, "roc-immortality", "pathway-transcend"])),
    };
  }

  const rollNote = applied.roll?.rocLabel ? ` ${applied.roll.rocLabel}.` : "";
  const advanced = advanceTurn({
    ...world,
    characters: { ...world.characters, [slot]: nextChar },
    partyFlags,
    alignment,
    pathway,
    campaignNodeId,
    chapterId,
    endingId,
    encounterEnemyHp,
    deckEncounter: encounterEnemyHp == null ? null : world.deckEncounter,
    log: [`${o.text}${rollNote}`, ...world.log].slice(0, 80),
  });

  return {
    world: markChapterVisited(advanced, chapterId),
    message: `${o.text}${rollNote}${applied.roll ? ` · Pathway ${pathwayLabel(pathway)}` : ""}`,
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
  nextId = resolveSpineHandoff(node.id, nextId);
  const gate = progressGateForNode(world, nextId);
  if (!gate.ok) {
    return {
      ...world,
      log: [gate.reason ?? "The road ahead isn't open yet.", ...world.log].slice(0, 80),
    };
  }
  if (node.kind === "montage" && node.xpGrant > 0) {
    const char = applyXp(characters[slot], sanitizeStoryXp(node.xpGrant));
    characters = { ...characters, [slot]: char };
  }
  const ch = chapterForNode(nextId);
  const nextNode = getStoryNode(nextId);
  if (nextNode?.kind === "ending") endingId = nextNode.endingId;
  // Do NOT advance the turn here — Continue only flips the panel so the same
  // player can take the next choice (Pip / path forks). Turn burns on choices & combat.
  return markChapterVisited({
    ...world,
    characters,
    partyFlags,
    campaignNodeId: nextId,
    chapterId: ch?.id ?? world.chapterId,
    endingId,
    encounterEnemyHp: nextNode?.kind === "encounter" ? nextNode.enemyHp : null,
    log: [`${world.characters[slot].name} continues the chronicle.`, ...world.log].slice(0, 80),
  });
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
