/**
 * Overworld walk loop: move → encounter / wanderer rolls → battle & quest hooks.
 */

import { startBattleVs, startRandomBattle } from "./battle";
import { CREATURES, rollCreature, type CreatureDef } from "./bestiary";
import { availableSideQuests } from "./midgame";
import { startSideQuest } from "./quest-run";
import { getChapter, getStoryNode } from "./story";
import type { ExploreState, ExploreWanderer, PartyWorldSave, PlayerSlot } from "./types";
import {
  biomeAt,
  biomeFoeKeywords,
  biomeFoeReskin,
  encounterChanceForBiome,
  findVariedSpawn,
  findPath,
  hashSeed,
  mulberry32,
  tileAt,
  type BiomeId,
  BIOME_LABELS,
} from "./world-map";

const WANDERER_MIN_MOVES = 6;
const WANDERER_CHANCE = 0.22;
const DISCOVERED_CHUNK_CAP = 48;

function partyLevel(world: PartyWorldSave): number {
  const sealed = (["justin", "rusty", "elisha", "eric"] as const).filter(
    (s) => world.characters[s]?.created
  );
  if (!sealed.length) return 1;
  const sum = sealed.reduce((a, s) => a + world.characters[s].level, 0);
  return Math.max(1, Math.round(sum / sealed.length));
}

function creaturesMatching(keywords: string[], level: number): CreatureDef[] {
  const keys = keywords.map((k) => k.toLowerCase());
  return CREATURES.filter((c) => {
    if (level < c.levelMin - 2 || level > c.levelMax + 4) return false;
    const hay = `${c.id} ${c.name}`.toLowerCase();
    return keys.some((k) => hay.includes(k));
  });
}

function pickBiomeCreature(biome: BiomeId, level: number, rng: () => number): CreatureDef {
  const pool = creaturesMatching(biomeFoeKeywords(biome), level);
  if (pool.length) {
    const total = pool.reduce((s, c) => s + (c.weight ?? 1), 0);
    let tick = rng() * total;
    for (const c of pool) {
      tick -= c.weight ?? 1;
      if (tick <= 0) return c;
    }
    return pool[pool.length - 1]!;
  }
  return rollCreature(level, rng);
}

export function ensureExploreState(world: PartyWorldSave): PartyWorldSave {
  if (
    world.explore?.seed != null &&
    Number.isFinite(world.explore.x) &&
    Number.isFinite(world.explore.y)
  ) {
    const biome = biomeAt(world.explore.seed, world.explore.x, world.explore.y).biome;
    if (world.explore.biomeId === biome) return world;
    return {
      ...world,
      explore: { ...world.explore, biomeId: biome },
    };
  }
  const seed = hashSeed(world.startedAt || `neverworld-${world.turnIndex}`);
  const spawn = findVariedSpawn(seed);
  const biome = biomeAt(seed, spawn.x, spawn.y).biome;
  const explore: ExploreState = {
    seed,
    x: spawn.x,
    y: spawn.y,
    biomeId: biome,
    moves: 0,
    movesSinceEncounter: 0,
    movesSinceWanderer: 0,
    discoveredChunks: [`${Math.floor(spawn.x / 16)},${Math.floor(spawn.y / 16)}`],
    pendingWanderer: null,
  };
  return { ...world, explore };
}

function rememberChunk(explore: ExploreState, x: number, y: number): string[] {
  const key = `${Math.floor(x / 16)},${Math.floor(y / 16)}`;
  const prev = explore.discoveredChunks ?? [];
  if (prev.includes(key)) return prev;
  return [...prev, key].slice(-DISCOVERED_CHUNK_CAP);
}

const NAME_A = [
  "Briar",
  "Moss",
  "Cinder",
  "Lark",
  "Thorn",
  "Pike",
  "Ash",
  "Willow",
  "Rune",
  "Gale",
  "Merrick",
  "Sable",
];
const NAME_B = [
  "of the Ford",
  "Trailwalker",
  "Softstep",
  "Halfcloak",
  "Ironkettle",
  "Brightcoin",
  "Dustsong",
  "Nightquill",
  "Redmitten",
  "Farlantern",
];

const BLURBS: Record<BiomeId, string[]> = {
  grassland: [
    "A traveler waves from the green road, pack jingling.",
    "Someone has been waiting by the mile-stone.",
  ],
  forest: [
    "Leaves part — a stranger steps from the green dark.",
    "A hooded figure clears their throat between the pines.",
  ],
  desert: [
    "Heat-haze resolves into a sand-scarved wanderer.",
    "A dune trader plants a staff and nods.",
  ],
  snow: [
    "Boots crunch — a frost-cloaked courier salutes.",
    "Someone stamps snow from their boots and grins.",
  ],
  ice: [
    "A figure slides nearer across the ice, lantern swinging.",
    "Wind breaks — a cold-eyed guide approaches.",
  ],
  mountain: [
    "A climber drops from a ledge and raises a hand.",
    "Goat-bells announce a highland scout.",
  ],
  cave: [
    "Torchlight spills from the cave mouth — a digger emerges.",
    "A soot-faced miner blocks the tunnel politely.",
  ],
  river: [
    "A ferry-hand poles closer and calls across the ford.",
    "Someone rinses a map in the current, then looks up.",
  ],
  ocean: [
    "A driftwood raft bumps the shore — a sailor climbs off.",
    "Salt spray and a shout: a lost mariner.",
  ],
  autumn: [
    "Crisp leaves swirl around a storyteller with a red scarf.",
    "An orchard-runner offers a nod and a rumor.",
  ],
  summer: [
    "A picnic blanket, then a wave — a cheerful stranger.",
    "Bees drone as a meadow-guide approaches.",
  ],
  swamp: [
    "Reeds part — a bog-walker lifts a lantern.",
    "Someone squelches nearer with a crooked smile.",
  ],
};

function rollWanderer(world: PartyWorldSave, biome: BiomeId, rng: () => number): ExploreWanderer {
  const name = `${NAME_A[Math.floor(rng() * NAME_A.length)]} ${NAME_B[Math.floor(rng() * NAME_B.length)]}`;
  const blurbs = BLURBS[biome] ?? BLURBS.grassland;
  const blurb = blurbs[Math.floor(rng() * blurbs.length)]!;
  const quests = availableSideQuests(world).filter(() => !world.activeSideQuest);
  const hasQuest = quests.length > 0 && rng() > 0.25;
  const quest = hasQuest ? quests[Math.floor(rng() * quests.length)]! : null;

  const options: ExploreWanderer["options"] = [];
  if (quest) {
    options.push({
      id: "side-quest",
      label: `Accept: ${quest.title}`,
      kind: "side_quest",
      questId: quest.id,
    });
  }
  options.push({
    id: "main-hint",
    label: "Ask about the main road",
    kind: "main_hint",
  });
  if (rng() > 0.4) {
    options.push({
      id: "trade",
      label: "Trade a few coins for a tip",
      kind: "trade",
    });
  }
  options.push({
    id: "path",
    label: "Ask for a new path",
    kind: "new_path",
  });
  options.push({
    id: "leave",
    label: "Nod and move on",
    kind: "leave",
  });

  return {
    id: `wanderer-${world.explore?.moves ?? 0}-${Math.floor(rng() * 1e6)}`,
    name,
    blurb,
    biomeId: biome,
    options: options.slice(0, 4),
  };
}

export type ExploreStepResult = {
  world: PartyWorldSave;
  message: string;
  startedBattle: boolean;
  wanderer: boolean;
};

export function stepExplore(
  world: PartyWorldSave,
  slot: PlayerSlot,
  toX: number,
  toY: number,
  opts?: { isDm?: boolean }
): ExploreStepResult {
  const base = ensureExploreState(world);
  const explore = base.explore!;
  if (base.activeSlot !== slot && !opts?.isDm) {
    return { world: base, message: "Not your turn.", startedBattle: false, wanderer: false };
  }
  if (base.endingId) {
    return { world: base, message: "Chronicle already closed.", startedBattle: false, wanderer: false };
  }
  if (base.battle?.status === "active") {
    return { world: base, message: "Finish the battle first.", startedBattle: false, wanderer: false };
  }
  if (explore.pendingWanderer) {
    return {
      world: base,
      message: "Someone is still talking to you.",
      startedBattle: false,
      wanderer: true,
    };
  }

  const dx = Math.abs(toX - explore.x);
  const dy = Math.abs(toY - explore.y);
  if (dx + dy !== 1) {
    return { world: base, message: "Take one step at a time.", startedBattle: false, wanderer: false };
  }
  const dest = tileAt(explore.seed, toX, toY);
  if (!dest.walkable) {
    return {
      world: base,
      message: "That way is water — find a ford.",
      startedBattle: false,
      wanderer: false,
    };
  }

  const biome = dest.biome;
  const moves = explore.moves + 1;
  const rng = mulberry32(
    explore.seed ^ Math.imul(toX + 1, 7481) ^ Math.imul(toY + 1, 9973) ^ Math.imul(moves, 131)
  );

  let nextExplore: ExploreState = {
    ...explore,
    x: toX,
    y: toY,
    biomeId: biome,
    moves,
    movesSinceEncounter: explore.movesSinceEncounter + 1,
    movesSinceWanderer: explore.movesSinceWanderer + 1,
    discoveredChunks: rememberChunk(explore, toX, toY),
    pendingWanderer: null,
  };

  let nextWorld: PartyWorldSave = {
    ...base,
    explore: nextExplore,
    log: [`Map · ${BIOME_LABELS[biome]} (${toX}, ${toY}).`, ...base.log].slice(0, 80),
  };

  if (
    nextExplore.movesSinceWanderer >= WANDERER_MIN_MOVES &&
    rng() < WANDERER_CHANCE &&
    !nextWorld.activeSideQuest
  ) {
    const wanderer = rollWanderer(nextWorld, biome, rng);
    nextExplore = {
      ...nextExplore,
      movesSinceWanderer: 0,
      pendingWanderer: wanderer,
    };
    nextWorld = {
      ...nextWorld,
      explore: nextExplore,
      log: [`A traveler approaches: ${wanderer.name}.`, ...nextWorld.log].slice(0, 80),
    };
    return {
      world: nextWorld,
      message: `${wanderer.name} approaches.`,
      startedBattle: false,
      wanderer: true,
    };
  }

  const chance = encounterChanceForBiome(biome);
  const pity = nextExplore.movesSinceEncounter >= 8 ? 0.35 : 0;
  if (rng() < chance + pity) {
    const foe = pickBiomeCreature(biome, partyLevel(nextWorld), rng);
    const started = startBattleVs(nextWorld, foe.id);
    let battleWorld = started.world;
    const reskin = biomeFoeReskin(biome);
    if (battleWorld.battle && reskin && rng() < 0.35) {
      const battle = battleWorld.battle;
      const enemy = {
        ...battle.enemy,
        name: reskin,
        blurb: `${reskin} of the ${BIOME_LABELS[biome].toLowerCase()}.`,
      };
      const enemies = battle.enemies?.map((e, i) => (i === 0 ? { ...e, name: reskin } : e));
      battleWorld = {
        ...battleWorld,
        battle: { ...battle, enemy, enemies },
        log: [`Ambush in ${BIOME_LABELS[biome]} — ${reskin}!`, ...battleWorld.log].slice(0, 80),
      };
    }
    nextExplore = { ...nextExplore, movesSinceEncounter: 0 };
    battleWorld = { ...battleWorld, explore: nextExplore };
    return {
      world: battleWorld,
      message: started.message,
      startedBattle: !!battleWorld.battle,
      wanderer: false,
    };
  }

  return {
    world: {
      ...nextWorld,
      storyPlayMs: (nextWorld.storyPlayMs ?? 0) + 2_500,
    },
    message: `You walk into ${BIOME_LABELS[biome]}.`,
    startedBattle: false,
    wanderer: false,
  };
}

export function planExplorePath(
  world: PartyWorldSave,
  toX: number,
  toY: number
): { x: number; y: number }[] {
  const base = ensureExploreState(world);
  const e = base.explore!;
  return findPath(e.seed, e.x, e.y, toX, toY);
}

export type WandererResolveResult = {
  world: PartyWorldSave;
  message: string;
  switchToStory?: boolean;
};

export function resolveWandererOption(
  world: PartyWorldSave,
  slot: PlayerSlot,
  optionId: string,
  opts?: { isDm?: boolean }
): WandererResolveResult {
  const base = ensureExploreState(world);
  const wanderer = base.explore?.pendingWanderer;
  if (!wanderer) return { world: base, message: "No traveler here." };
  const option = wanderer.options.find((o) => o.id === optionId);
  if (!option) return { world: base, message: "Unknown reply." };

  const clearWanderer = (w: PartyWorldSave): PartyWorldSave => ({
    ...w,
    explore: w.explore
      ? { ...w.explore, pendingWanderer: null, movesSinceWanderer: 0 }
      : w.explore,
  });

  if (option.kind === "leave") {
    return {
      world: clearWanderer({
        ...base,
        log: [`${wanderer.name} tips a hat and fades into the trail.`, ...base.log].slice(0, 80),
      }),
      message: "You part ways.",
    };
  }

  if (option.kind === "side_quest" && option.questId) {
    const started = startSideQuest(clearWanderer(base), slot, option.questId, opts);
    return { world: started.world, message: started.message };
  }

  if (option.kind === "trade") {
    const char = base.characters[slot];
    if (!char?.created) return { world: base, message: "Seal a hero first." };
    if (char.gold < 5) {
      return {
        world: clearWanderer(base),
        message: `${wanderer.name} chuckles — come back with coin.`,
      };
    }
    const tipGold = 5;
    const tipXp = 4;
    return {
      world: clearWanderer({
        ...base,
        characters: {
          ...base.characters,
          [slot]: {
            ...char,
            gold: char.gold - tipGold,
            xp: char.xp + tipXp,
          },
        },
        log: [
          `${wanderer.name} sells a trail tip (−${tipGold}g, +${tipXp} XP).`,
          ...base.log,
        ].slice(0, 80),
      }),
      message: `Paid ${tipGold}g for a rumor of safer fords.`,
    };
  }

  if (option.kind === "main_hint") {
    const ch = getChapter(base.chapterId);
    const node = getStoryNode(base.campaignNodeId);
    const hint = ch
      ? `Keep the chronicle handy — Act ${ch.chapter} “${ch.title}” still calls. Open Campfire Chronicle when you're ready.`
      : "The main road still waits in the Campfire Chronicle.";
    return {
      world: clearWanderer({
        ...base,
        partyFlags: [...new Set([...(base.partyFlags ?? []), "map-main-hint"])],
        log: [`${wanderer.name}: “${node?.title ?? "The road"} still matters.”`, ...base.log].slice(
          0,
          80
        ),
      }),
      message: hint,
      switchToStory: true,
    };
  }

  if (option.kind === "new_path") {
    const node = getStoryNode(base.campaignNodeId);
    const nextWorld = clearWanderer({
      ...base,
      partyFlags: [
        ...new Set([...(base.partyFlags ?? []), "map-new-path", `map-path-${base.explore?.biomeId}`]),
      ],
      log: [
        `${wanderer.name} sketches a shortcut in the dirt — a new path opens in the chronicle.`,
        ...base.log,
      ].slice(0, 80),
    });
    const switchToStory =
      !!node && (node.kind === "narrative" || node.kind === "path" || node.kind === "conversation");
    return {
      world: nextWorld,
      message: "A new path rumor is inked — check the Campfire Chronicle.",
      switchToStory,
    };
  }

  return { world: clearWanderer(base), message: "Done." };
}

export function forceExploreAmbush(world: PartyWorldSave): ExploreStepResult {
  const base = ensureExploreState(world);
  const biome = (base.explore?.biomeId ?? "grassland") as BiomeId;
  const rng = mulberry32((base.explore?.seed ?? 1) ^ (base.explore?.moves ?? 0) * 17);
  const foe = pickBiomeCreature(biome, partyLevel(base), rng);
  const started = startBattleVs(base, foe.id);
  if (!started.world.battle) {
    const fallback = startRandomBattle(base, rng);
    return {
      world: fallback.world,
      message: fallback.message,
      startedBattle: !!fallback.world.battle,
      wanderer: false,
    };
  }
  return {
    world: started.world,
    message: started.message,
    startedBattle: true,
    wanderer: false,
  };
}
