/**
 * Mid-game loops: road encounters, side quests, camp cooking, camp sleep.
 * Authored story spine stays intact — Camp tab fills mid-acts.
 */

import { rollEncounter } from "./encounters";
import { getGear } from "./gear";
import { levelFromXp, skillPointsForLevelGain } from "./progression";
import { startSideQuest } from "./quest-run";
import { getRecipe, recipesForAct, type RecipeDef } from "./recipes";
import { sideQuestsForChapter, type SideQuestDef } from "./side-quests";
import { battleMaxHp, battleMaxMana } from "./stats";
import { getStoryNode } from "./story";
import type {
  CharacterSave,
  DeckEncounterState,
  PartyWorldSave,
  PlayerSlot,
} from "./types";
import { PLAYER_SLOT_ORDER } from "./types";

/** Real-time Camp sleep budget — 5 rests per rolling 20 minutes. */
export const CAMP_SLEEP_MAX = 5;
export const CAMP_SLEEP_WINDOW_MS = 20 * 60_000;
function nextPlayableSlot(world: PartyWorldSave, current: PlayerSlot): PlayerSlot {
  const sealed = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (sealed.length === 0) {
    const i = PLAYER_SLOT_ORDER.indexOf(current);
    return PLAYER_SLOT_ORDER[(i + 1) % PLAYER_SLOT_ORDER.length]!;
  }
  const from = sealed.indexOf(current);
  if (from < 0) return sealed[0]!;
  return sealed[(from + 1) % sealed.length]!;
}

function advanceTurn(world: PartyWorldSave): PartyWorldSave {
  const next = nextPlayableSlot(world, world.activeSlot);
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
  // Keep the in-progress quest in the Camp list (disabled + "On trail") so it
  // never looks like it vanished when the run overlay is open or covered.
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

/**
 * @deprecated Instant-complete path — Camp must use startSideQuest / advanceSideQuest.
 * Kept as a thin alias so any stale caller opens a playable run instead of wiping the quest.
 */
export function completeSideQuest(
  world: PartyWorldSave,
  slot: PlayerSlot,
  questId: string,
  opts?: { isDm?: boolean }
): { world: PartyWorldSave; message: string } {
  return startSideQuest(world, slot, questId, opts);
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

function pruneCampSleeps(timestamps: string[] | undefined, nowMs = Date.now()): string[] {
  const cutoff = nowMs - CAMP_SLEEP_WINDOW_MS;
  return (timestamps ?? []).filter((iso) => {
    const t = Date.parse(iso);
    return Number.isFinite(t) && t >= cutoff;
  });
}

/** How many Camp sleeps remain in the current 20-minute window. */
export function campSleepsRemaining(world: PartyWorldSave, nowMs = Date.now()): number {
  const recent = pruneCampSleeps(world.campSleeps, nowMs);
  return Math.max(0, CAMP_SLEEP_MAX - recent.length);
}

/** Ms until the oldest sleep in the window expires (0 if a slot is free). */
export function campSleepCooldownMs(world: PartyWorldSave, nowMs = Date.now()): number {
  const recent = pruneCampSleeps(world.campSleeps, nowMs);
  if (recent.length < CAMP_SLEEP_MAX) return 0;
  const oldest = Math.min(...recent.map((iso) => Date.parse(iso)));
  return Math.max(0, oldest + CAMP_SLEEP_WINDOW_MS - nowMs);
}

/**
 * Camp sleep — restore the acting hero's HP / mana / stamina (and a bit of hound HP).
 * Rate-limited: 5 sleeps per rolling 20 real minutes.
 */
export function sleepAtCamp(
  world: PartyWorldSave,
  slot: PlayerSlot,
  opts?: { isDm?: boolean; nowMs?: number }
): { world: PartyWorldSave; message: string } {
  if (world.activeSlot !== slot && !opts?.isDm) {
    return { world, message: "Not your turn." };
  }
  if (world.endingId) return { world, message: "Chronicle already closed." };
  if (world.battle?.status === "active") {
    return { world, message: "Finish the battle first." };
  }
  if (world.deckEncounter && (world.encounterEnemyHp ?? 0) > 0) {
    return { world, message: "Finish or flee the road fight first." };
  }
  if (world.activeSideQuest?.status === "active") {
    return { world, message: "Park or finish the side quest before sleeping." };
  }

  const nowMs = opts?.nowMs ?? Date.now();
  const recent = pruneCampSleeps(world.campSleeps, nowMs);
  if (recent.length >= CAMP_SLEEP_MAX) {
    const waitMin = Math.ceil(campSleepCooldownMs(world, nowMs) / 60_000);
    return {
      world: { ...world, campSleeps: recent },
      message: `Camp beds are full — ${CAMP_SLEEP_MAX} sleeps / ${CAMP_SLEEP_WINDOW_MS / 60_000}m. Try again in ~${waitMin}m.`,
    };
  }

  const before = world.characters[slot];
  if (!before?.created) return { world, message: "Seal your hero first." };

  const maxHp = battleMaxHp(before);
  const maxMana = battleMaxMana(before);
  const char: CharacterSave = {
    ...before,
    hp: maxHp,
    maxHp: Math.max(before.maxHp, maxHp),
    mana: maxMana,
    maxMana: Math.max(before.maxMana, maxMana),
    stamina: before.maxStamina,
    dog: {
      ...before.dog,
      hp: before.dog.maxHp,
    },
  };

  const sleptAt = new Date(nowMs).toISOString();
  const campSleeps = [...recent, sleptAt];
  const left = CAMP_SLEEP_MAX - campSleeps.length;
  const message = `${char.name} sleeps at camp — HP, mana, and stamina restored (${left} sleep${left === 1 ? "" : "s"} left this ${CAMP_SLEEP_WINDOW_MS / 60_000}m).`;

  return {
    world: advanceTurn({
      ...world,
      characters: { ...world.characters, [slot]: char },
      campSleeps,
      log: [message, ...world.log].slice(0, 80),
    }),
    message,
  };
}

export type CampMerchantOffer = {
  itemId: string;
  name: string;
  blurb: string;
  price: number;
  tier: string;
};

const MERCHANT_STOCK: { itemId: string; price: number }[] = [
  { itemId: "trail-rations", price: 6 },
  { itemId: "healing-potion", price: 18 },
  { itemId: "mana-draught", price: 22 },
  { itemId: "hound-treat", price: 8 },
  { itemId: "greater-mana", price: 55 },
  { itemId: "bronze-dagger", price: 28 },
  { itemId: "iron-sword", price: 35 },
  { itemId: "oak-staff", price: 32 },
];

/** Camp traveling merchant — fixed prices, curated stock. */
export function campMerchantStock(): CampMerchantOffer[] {
  return MERCHANT_STOCK.map((row) => {
    const gear = getGear(row.itemId);
    return {
      itemId: row.itemId,
      name: gear?.name ?? row.itemId,
      blurb: gear?.blurb ?? "Trail goods.",
      price: row.price,
      tier: gear?.tier ?? "common",
    };
  });
}

/** Buy one item from the Camp merchant with the acting hero's gold. */
export function buyFromCampMerchant(
  world: PartyWorldSave,
  slot: PlayerSlot,
  itemId: string,
  opts?: { isDm?: boolean }
): { world: PartyWorldSave; message: string } {
  if (world.activeSlot !== slot && !opts?.isDm) {
    return { world, message: "Not your turn." };
  }
  if (world.endingId) return { world, message: "Chronicle already closed." };
  if (world.battle?.status === "active") {
    return { world, message: "Finish the battle first." };
  }

  const offer = campMerchantStock().find((o) => o.itemId === itemId);
  if (!offer) return { world, message: "The merchant doesn't sell that." };

  const buyer = world.characters[slot];
  if (!buyer?.created) return { world, message: "Seal your hero first." };
  if (buyer.gold < offer.price) {
    return { world, message: `Need ${offer.price}g — you have ${buyer.gold}g.` };
  }
  if (buyer.inventory.includes(itemId) && offer.tier !== "common") {
    // Allow duplicate consumables; block duplicate unique-ish gear
    const gear = getGear(itemId);
    if (gear && gear.slot !== "consumable") {
      return { world, message: `You already carry ${offer.name}.` };
    }
  }

  const inventory = [...buyer.inventory];
  if (!inventory.includes(itemId) || getGear(itemId)?.slot === "consumable") {
    inventory.push(itemId);
  }

  const char: CharacterSave = {
    ...buyer,
    gold: buyer.gold - offer.price,
    inventory,
  };
  const message = `${char.name} buys ${offer.name} for ${offer.price}g (${char.gold}g left).`;

  return {
    world: advanceTurn({
      ...world,
      characters: { ...world.characters, [slot]: char },
      log: [message, ...world.log].slice(0, 80),
    }),
    message,
  };
}
