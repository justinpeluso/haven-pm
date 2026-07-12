/**
 * Mid-game loops: road encounters, side quests, camp cooking.
 * Authored story spine stays intact — Camp tab fills mid-acts.
 */

import { mergeAlignment } from "./alignment";
import { rollEncounter } from "./encounters";
import { levelFromXp, skillPointsForLevelGain } from "./progression";
import { getRecipe, recipesForAct, type RecipeDef } from "./recipes";
import { getSideQuest, sideQuestsForChapter, type SideQuestDef } from "./side-quests";
import { getStoryNode } from "./story";
import type {
  CharacterSave,
  DeckEncounterState,
  PartyWorldSave,
  PlayerSlot,
} from "./types";
import { PLAYER_SLOT_ORDER } from "./types";

function nextSlot(current: PlayerSlot): PlayerSlot {
  const i = PLAYER_SLOT_ORDER.indexOf(current);
  return PLAYER_SLOT_ORDER[(i + 1) % PLAYER_SLOT_ORDER.length]!;
}

function advanceTurn(world: PartyWorldSave): PartyWorldSave {
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

function grantLoot(char: CharacterSave, lootIds: string[] | undefined): CharacterSave {
  if (!lootIds?.length) return char;
  const inventory = [...char.inventory];
  for (const id of lootIds) {
    if (!inventory.includes(id)) inventory.push(id);
  }
  return { ...char, inventory };
}

export function actIdForChapter(chapterId: string): string {
  const m = chapterId.match(/^ch(\d+)/);
  return m ? `act-${Number(m[1])}` : "act-1";
}

export function actNumberForChapter(chapterId: string): number {
  const m = chapterId.match(/^ch(\d+)/);
  return m ? Number(m[1]) : 1;
}

export function availableSideQuests(world: PartyWorldSave): SideQuestDef[] {
  const done = new Set(world.completedSideQuests ?? []);
  return sideQuestsForChapter(world.chapterId).filter((q) => !done.has(q.id));
}

export function cookableRecipes(world: PartyWorldSave, slot: PlayerSlot): RecipeDef[] {
  const act = actNumberForChapter(world.chapterId);
  const inv = world.characters[slot].inventory;
  return recipesForAct(act).filter((r) => {
    const bag = [...inv];
    for (const ing of r.ingredients) {
      const i = bag.indexOf(ing);
      if (i < 0) return false;
      bag.splice(i, 1);
    }
    return true;
  });
}

export function startRoadEncounter(
  world: PartyWorldSave,
  slot: PlayerSlot
): { world: PartyWorldSave; message: string } {
  if (world.activeSlot !== slot) return { world, message: "Not your turn." };
  if (world.endingId) return { world, message: "Chronicle already closed." };
  if (world.deckEncounter && world.encounterEnemyHp != null && world.encounterEnemyHp > 0) {
    return { world, message: "Already in a road fight — use the hotbar." };
  }
  const storyNode = getStoryNode(world.campaignNodeId);
  if (
    storyNode?.kind === "encounter" &&
    world.encounterEnemyHp != null &&
    world.encounterEnemyHp > 0 &&
    !world.deckEncounter
  ) {
    return { world, message: "Finish the story fight first." };
  }

  const foe = rollEncounter(actIdForChapter(world.chapterId));
  const deck: DeckEncounterState = {
    id: foe.id,
    name: foe.name,
    maxHp: foe.hp,
    xp: foe.xp,
    gold: foe.gold,
    lootIds: foe.lootIds ?? [],
    artId: foe.artId ?? foe.enemyArtId,
  };
  return {
    world: {
      ...world,
      deckEncounter: deck,
      encounterEnemyHp: foe.hp,
      log: [`Road patrol! ${foe.name} (HP ${foe.hp}).`, ...world.log].slice(0, 80),
    },
    message: `${foe.name} engages — hotbar ready.`,
  };
}

export function resolveActiveEncounterIfDead(
  world: PartyWorldSave,
  slot: PlayerSlot
): PartyWorldSave {
  if (world.encounterEnemyHp == null || world.encounterEnemyHp > 0) return world;
  const deck = world.deckEncounter;
  if (!deck) return { ...world, encounterEnemyHp: null };

  let char = world.characters[slot];
  char = applyXp(char, deck.xp);
  char = { ...char, gold: char.gold + deck.gold };
  char = grantLoot(char, deck.lootIds);
  const message = `${char.name} fells ${deck.name} (+${deck.xp} XP, +${deck.gold}g).`;
  return advanceTurn({
    ...world,
    characters: { ...world.characters, [slot]: char },
    deckEncounter: null,
    encounterEnemyHp: null,
    log: [message, ...world.log].slice(0, 80),
  });
}

export function fleeRoadEncounter(
  world: PartyWorldSave,
  slot: PlayerSlot
): { world: PartyWorldSave; message: string } {
  if (world.activeSlot !== slot) return { world, message: "Not your turn." };
  if (!world.deckEncounter) return { world, message: "No road fight to flee." };
  const message = `${world.characters[slot].name} flees the road fight.`;
  return {
    world: advanceTurn({
      ...world,
      deckEncounter: null,
      encounterEnemyHp: null,
      log: [message, ...world.log].slice(0, 80),
    }),
    message,
  };
}

export function completeSideQuest(
  world: PartyWorldSave,
  slot: PlayerSlot,
  questId: string
): { world: PartyWorldSave; message: string } {
  if (world.activeSlot !== slot) return { world, message: "Not your turn." };
  if (world.deckEncounter && (world.encounterEnemyHp ?? 0) > 0) {
    return { world, message: "Finish or flee the road fight first." };
  }
  const quest = getSideQuest(questId);
  if (!quest) return { world, message: "Unknown side quest." };
  const done = world.completedSideQuests ?? [];
  if (done.includes(questId)) return { world, message: "Already completed." };

  const actOk = quest.actId === actIdForChapter(world.chapterId);
  const chOk = !quest.chapterId || quest.chapterId === world.chapterId;
  if (!actOk && !chOk) return { world, message: "That quest is for another act." };

  let char = applyXp(world.characters[slot], quest.rewards.xp);
  char = { ...char, gold: char.gold + quest.rewards.gold };
  char = grantLoot(char, quest.rewards.itemIds);
  if (quest.kind === "hound") {
    char = { ...char, dog: { ...char.dog, bond: Math.min(100, char.dog.bond + 8) } };
  }

  const partyFlags = [...world.partyFlags];
  for (const f of quest.rewards.flagsAdd) {
    if (!partyFlags.includes(f)) partyFlags.push(f);
  }

  const message = `Side quest complete: ${quest.title} (+${quest.rewards.xp} XP).`;
  return {
    world: advanceTurn({
      ...world,
      characters: { ...world.characters, [slot]: char },
      completedSideQuests: [...done, questId],
      partyFlags,
      alignment: mergeAlignment(world.alignment, quest.rewards.alignment),
      log: [message, ...world.log].slice(0, 80),
    }),
    message,
  };
}

export function cookRecipe(
  world: PartyWorldSave,
  slot: PlayerSlot,
  recipeId: string
): { world: PartyWorldSave; message: string } {
  if (world.activeSlot !== slot) return { world, message: "Not your turn." };
  if (world.deckEncounter && (world.encounterEnemyHp ?? 0) > 0) {
    return { world, message: "Can't cook mid-fight." };
  }
  const recipe = getRecipe(recipeId);
  if (!recipe) return { world, message: "Unknown recipe." };
  if (recipe.actMin > actNumberForChapter(world.chapterId)) {
    return { world, message: "Recipe not unlocked for this act yet." };
  }

  let inv = [...world.characters[slot].inventory];
  for (const ing of recipe.ingredients) {
    const i = inv.indexOf(ing);
    if (i < 0) return { world, message: `Missing ingredient: ${ing}.` };
    inv.splice(i, 1);
  }

  const char: CharacterSave = {
    ...world.characters[slot],
    inventory: inv,
    hp: Math.min(
      world.characters[slot].maxHp,
      world.characters[slot].hp + recipe.heal + (recipe.partyHeal ?? 0)
    ),
    stamina: Math.min(
      world.characters[slot].maxStamina,
      world.characters[slot].stamina + recipe.staminaRestore
    ),
    mana: Math.min(world.characters[slot].maxMana, world.characters[slot].mana + recipe.manaRestore),
    dog: {
      ...world.characters[slot].dog,
      bond: Math.min(100, world.characters[slot].dog.bond + (recipe.bondRestore ?? 0)),
      hp: Math.min(
        world.characters[slot].dog.maxHp,
        world.characters[slot].dog.hp + Math.floor(recipe.heal / 2)
      ),
    },
  };

  const partyFlags = [...world.partyFlags];
  for (const f of recipe.flagsAdd ?? []) {
    if (!partyFlags.includes(f)) partyFlags.push(f);
  }
  const cooked = world.cookedRecipes ?? [];

  const message = `Cooked ${recipe.name}.`;
  return {
    world: advanceTurn({
      ...world,
      characters: { ...world.characters, [slot]: char },
      partyFlags,
      cookedRecipes: cooked.includes(recipeId) ? cooked : [...cooked, recipeId],
      log: [message, ...world.log].slice(0, 80),
    }),
    message,
  };
}
