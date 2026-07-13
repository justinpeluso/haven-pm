import { BATTLE_LOOT_ITEMS, battleLootAsGear, getBattleLootItem, LOOT_POOLS } from "./bestiary";
import type { ClassId, GearItem } from "./types";


export const GEAR_CATALOG: GearItem[] = [
  // Common weapons / armor
  {
    id: "iron-sword",
    name: "Iron Longsword",
    blurb: "A hold-forged blade, honest and plain.",
    tier: "common",
    slot: "weapon",
    power: 6,
    tags: ["melee"],
  },
  {
    id: "hunting-bow",
    name: "Hunting Bow",
    blurb: "Yew and sinew — good for deer and goblins alike.",
    tier: "common",
    slot: "weapon",
    power: 5,
    tags: ["ranged", "bow"],
  },
  {
    id: "oak-staff",
    name: "Oak Staff",
    blurb: "A traveler's stick that hums faintly at ley lines.",
    tier: "common",
    slot: "weapon",
    power: 4,
    tags: ["staff", "arcane"],
  },
  {
    id: "leather-cap",
    name: "Leather Cap",
    blurb: "Keeps rain and glancing blades at bay.",
    tier: "common",
    slot: "head",
    armor: 1,
    tags: ["light"],
  },
  {
    id: "hide-jerkin",
    name: "Hide Jerkin",
    blurb: "Soft hide of the northern woods.",
    tier: "common",
    slot: "chest",
    armor: 2,
    tags: ["light"],
  },
  {
    id: "travel-gloves",
    name: "Travel Gloves",
    blurb: "Worn leather for rope and bowstring.",
    tier: "common",
    slot: "hands",
    armor: 1,
    tags: ["light"],
  },
  {
    id: "wool-trousers",
    name: "Wool Trousers",
    blurb: "Warm enough for Misty Hill roads.",
    tier: "common",
    slot: "legs",
    armor: 1,
    tags: ["light"],
  },
  {
    id: "wood-shield",
    name: "Wooden Shield",
    blurb: "Painted with a crude wolf — better than nothing.",
    tier: "common",
    slot: "offhand",
    armor: 2,
    tags: ["shield"],
  },
  {
    id: "copper-ring",
    name: "Copper Ring",
    blurb: "A keepsake from home.",
    tier: "common",
    slot: "accessory",
    tags: ["trinket"],
  },
  // Magic
  {
    id: "frostbite-blade",
    name: "Frostbite Blade",
    blurb: "Steel rimed with everlasting chill.",
    tier: "magic",
    slot: "weapon",
    power: 12,
    tags: ["melee", "frost"],
  },
  {
    id: "elven-bow",
    name: "Elven Longbow",
    blurb: "Light as moonbeam, true as oath.",
    tier: "magic",
    slot: "weapon",
    power: 11,
    tags: ["ranged", "bow", "elven"],
  },
  {
    id: "staff-of-embers",
    name: "Staff of Embers",
    blurb: "A core of banked dragon-coal.",
    tier: "magic",
    slot: "weapon",
    power: 13,
    tags: ["staff", "fire"],
  },
  {
    id: "mail-of-rivendell",
    name: "Mail of Rivendell Roads",
    blurb: "Rings that sing faintly when danger nears.",
    tier: "magic",
    slot: "chest",
    armor: 6,
    tags: ["medium", "elven"],
  },
  {
    id: "amulet-of-warding",
    name: "Amulet of Warding",
    blurb: "A soft ward against hex and fang.",
    tier: "magic",
    slot: "accessory",
    armor: 2,
    tags: ["ward"],
  },
  // Legendary
  {
    id: "sword-of-the-chronicle",
    name: "Sword of the Chronicle",
    blurb: "Forged for three names and three hounds — Justin, Rusty, Elisha.",
    tier: "legendary",
    slot: "weapon",
    power: 28,
    tags: ["melee", "legendary", "party"],
  },
  {
    id: "crown-of-ash",
    name: "Crown of Ash",
    blurb: "A circlet of cooled dragon-glass. Heavy with choice.",
    tier: "legendary",
    slot: "head",
    armor: 4,
    power: 4,
    tags: ["legendary", "crown"],
  },
  {
    id: "cloak-of-fellowship",
    name: "Cloak of Fellowship",
    blurb: "Woven so three walkers never lose each other's trail.",
    tier: "legendary",
    slot: "accessory",
    armor: 3,
    tags: ["legendary", "party"],
  },
  // Consumables
  {
    id: "healing-potion",
    name: "Healing Potion",
    blurb: "Red vial of mountain herbs.",
    tier: "common",
    slot: "consumable",
    heal: 25,
    tags: ["potion", "heal"],
  },
  {
    id: "mana-draught",
    name: "Mana Draught",
    blurb: "Blue mist in a crystal phial.",
    tier: "magic",
    slot: "consumable",
    manaRestore: 20,
    tags: ["potion", "mana"],
  },
  {
    id: "trail-rations",
    name: "Trail Rations",
    blurb: "Dried meat, hard bread, a strip of cheese.",
    tier: "common",
    slot: "consumable",
    heal: 8,
    cookBonus: 1,
    tags: ["food"],
  },
  {
    id: "hound-treat",
    name: "Hound's Treat",
    blurb: "Dried liver — your companion's favorite.",
    tier: "common",
    slot: "consumable",
    tags: ["dog", "food"],
  },
  // ── Expanded common ────────────────────────────────────
  {
    id: "bronze-dagger",
    name: "Bronze Dagger",
    blurb: "Short and honest — a rogue's first friend.",
    tier: "common",
    slot: "weapon",
    power: 4,
    tags: ["melee", "light"],
  },
  {
    id: "sling-of-pebbles",
    name: "Sling of Pebbles",
    blurb: "River stones with ambition.",
    tier: "common",
    slot: "weapon",
    power: 3,
    tags: ["ranged"],
  },
  {
    id: "padded-coif",
    name: "Padded Coif",
    blurb: "Quilted cloth against cold and clubs.",
    tier: "common",
    slot: "head",
    armor: 1,
    tags: ["light"],
  },
  {
    id: "traveler-cloak",
    name: "Traveler's Cloak",
    blurb: "Mud-colored wool that smells of campfire.",
    tier: "common",
    slot: "accessory",
    armor: 1,
    tags: ["light"],
  },
  {
    id: "iron-greaves",
    name: "Iron Greaves",
    blurb: "Clanky, warm, reliable.",
    tier: "common",
    slot: "legs",
    armor: 2,
    tags: ["medium"],
  },
  {
    id: "work-gauntlets",
    name: "Work Gauntlets",
    blurb: "Forge-stained leather.",
    tier: "common",
    slot: "hands",
    armor: 1,
    tags: ["medium"],
  },
  {
    id: "round-buckler",
    name: "Round Buckler",
    blurb: "A disc of pine banded in iron.",
    tier: "common",
    slot: "offhand",
    armor: 2,
    tags: ["shield"],
  },
  {
    id: "herb-pouch",
    name: "Herb Pouch",
    blurb: "Dried mint and woundwort.",
    tier: "common",
    slot: "misc",
    tags: ["cook", "ingredient"],
  },
  {
    id: "forage-roots",
    name: "Forage Roots",
    blurb: "Bitter bulbs that sweeten in stew.",
    tier: "common",
    slot: "consumable",
    heal: 5,
    cookBonus: 2,
    tags: ["food", "ingredient"],
  },
  {
    id: "smoked-venison",
    name: "Smoked Venison",
    blurb: "Trail meat from Misty Hills.",
    tier: "common",
    slot: "consumable",
    heal: 12,
    cookBonus: 2,
    tags: ["food"],
  },
  {
    id: "stamina-tea",
    name: "Stamina Tea",
    blurb: "Bitter green brew for long marches.",
    tier: "common",
    slot: "consumable",
    tags: ["potion", "stamina"],
  },
  {
    id: "rope-coil",
    name: "Coil of Rope",
    blurb: "Fifty feet of hold-spun hemp.",
    tier: "common",
    slot: "misc",
    tags: ["tool"],
  },
  // ── Expanded magic ─────────────────────────────────────
  {
    id: "moonsteel-saber",
    name: "Moonsteel Saber",
    blurb: "Edges that drink moonlight.",
    tier: "magic",
    slot: "weapon",
    power: 14,
    tags: ["melee", "frost"],
  },
  {
    id: "storm-javelin",
    name: "Storm Javelin",
    blurb: "Throws like thunder remembers.",
    tier: "magic",
    slot: "weapon",
    power: 13,
    tags: ["ranged", "storm"],
  },
  {
    id: "wardens-helm",
    name: "Warden's Helm",
    blurb: "Visor etched with raven-marks.",
    tier: "magic",
    slot: "head",
    armor: 4,
    tags: ["medium", "human"],
  },
  {
    id: "pack-leather",
    name: "Pack-Leather Cuirass",
    blurb: "Soft armor that flexes with the hunt.",
    tier: "magic",
    slot: "chest",
    armor: 5,
    tags: ["light", "animal"],
  },
  {
    id: "ember-gauntlets",
    name: "Ember Gauntlets",
    blurb: "Heat without burn — Hold of Embers craft.",
    tier: "magic",
    slot: "hands",
    armor: 3,
    power: 2,
    tags: ["fire", "medium"],
  },
  {
    id: "mist-striders",
    name: "Mist-Strider Greaves",
    blurb: "Steps that leave no name for fog to steal.",
    tier: "magic",
    slot: "legs",
    armor: 4,
    tags: ["light", "ward"],
  },
  {
    id: "serpent-buckler",
    name: "Serpent Buckler",
    blurb: "A coil of dusk-steel. Whispers when raised.",
    tier: "magic",
    slot: "offhand",
    armor: 4,
    tags: ["shield", "demon"],
  },
  {
    id: "ring-of-oaths",
    name: "Ring of Oaths",
    blurb: "Warm when you keep your word.",
    tier: "magic",
    slot: "accessory",
    armor: 1,
    tags: ["human", "speech"],
  },
  {
    id: "fang-amulet",
    name: "Fang Amulet",
    blurb: "Ulfric's token — kinship made metal.",
    tier: "magic",
    slot: "accessory",
    power: 2,
    tags: ["animal", "dog"],
  },
  {
    id: "ash-philter",
    name: "Ash Philter",
    blurb: "One sip steadies the hand for cruel choices.",
    tier: "magic",
    slot: "consumable",
    tags: ["potion", "demon"],
  },
  {
    id: "greater-healing",
    name: "Greater Healing Potion",
    blurb: "Deep red of mountain orchids.",
    tier: "magic",
    slot: "consumable",
    heal: 50,
    tags: ["potion", "heal"],
  },
  {
    id: "greater-mana",
    name: "Greater Mana Draught",
    blurb: "Starlight corked in glass.",
    tier: "magic",
    slot: "consumable",
    manaRestore: 40,
    tags: ["potion", "mana"],
  },
  {
    id: "dragon-scale-shard",
    name: "Dragon Scale Shard",
    blurb: "Shed whisper-scale — forge fuel or Nyx bait.",
    tier: "magic",
    slot: "misc",
    tags: ["ingredient", "dragon"],
  },
  // ── Expanded legendary ─────────────────────────────────
  {
    id: "bow-of-three-names",
    name: "Bow of Three Names",
    blurb: "Stringed for Justin, Rusty, Elisha — arrows that find friends' foes.",
    tier: "legendary",
    slot: "weapon",
    power: 26,
    tags: ["ranged", "bow", "party", "legendary"],
  },
  {
    id: "staff-of-ley-hounds",
    name: "Staff of Ley-Hounds",
    blurb: "Arcane wood that hums when Lumen howls.",
    tier: "legendary",
    slot: "weapon",
    power: 27,
    tags: ["staff", "arcane", "dog", "legendary"],
  },
  {
    id: "helm-of-the-soft-path",
    name: "Helm of the Soft Path",
    blurb: "Moss grows in the creases. Wild law made wearable.",
    tier: "legendary",
    slot: "head",
    armor: 6,
    power: 3,
    tags: ["legendary", "animal"],
  },
  {
    id: "plate-of-the-hearth",
    name: "Plate of the Hearth",
    blurb: "Armor that warms allies within a step.",
    tier: "legendary",
    slot: "chest",
    armor: 10,
    tags: ["legendary", "human", "heavy"],
  },
  {
    id: "gauntlets-of-unmaking",
    name: "Gauntlets of Unmaking",
    blurb: "Fingers that unlace oaths and armor alike.",
    tier: "legendary",
    slot: "hands",
    armor: 5,
    power: 5,
    tags: ["legendary", "demon"],
  },
  {
    id: "greaves-of-the-maw",
    name: "Greaves of the Maw",
    blurb: "Walk the World-Eater's teeth without slipping.",
    tier: "legendary",
    slot: "legs",
    armor: 7,
    tags: ["legendary", "ward"],
  },
  {
    id: "shield-of-remembered-names",
    name: "Shield of Remembered Names",
    blurb: "Corv's census beaten into bronze.",
    tier: "legendary",
    slot: "offhand",
    armor: 8,
    tags: ["shield", "legendary", "human"],
  },
  {
    id: "ring-of-the-chronicle",
    name: "Ring of the Chronicle",
    blurb: "Three bands braided — one for each walker.",
    tier: "legendary",
    slot: "accessory",
    armor: 3,
    power: 3,
    tags: ["legendary", "party"],
  },
  {
    id: "serpent-crown-shard",
    name: "Serpent Crown Shard",
    blurb: "A splinter of Nyx's ambition. Cuts kindly.",
    tier: "legendary",
    slot: "accessory",
    power: 6,
    tags: ["legendary", "demon"],
  },
  {
    id: "elixir-of-destiny",
    name: "Elixir of Destiny",
    blurb: "One dose before the finale — clears the throat for the last choice.",
    tier: "legendary",
    slot: "consumable",
    heal: 100,
    tags: ["potion", "legendary", "ending"],
  },
];

import gearCatalogPack from "../../../../data/party-chronicle/gear-catalog.json";
import type { GearSetDef } from "./types";

type GearCatalogPack = {
  sets?: GearSetDef[];
  items?: GearItem[];
};

const catalogPack = gearCatalogPack as GearCatalogPack;
export const GEAR_SETS: GearSetDef[] = catalogPack.sets ?? [];
export const GENERATED_GEAR: GearItem[] = catalogPack.items ?? [];

const GEAR_BY_ID: Record<string, GearItem> = Object.fromEntries(
  GEAR_CATALOG.map((g) => [g.id, g])
);

// Merge generated catalog (500+) without clobbering hand-authored core.
for (const raw of GENERATED_GEAR) {
  if (!GEAR_BY_ID[raw.id]) {
    GEAR_BY_ID[raw.id] = raw;
  }
}

// Merge battle-loot / boss-unique / spellbook items without clobbering core catalog.
for (const raw of BATTLE_LOOT_ITEMS) {
  if (!GEAR_BY_ID[raw.id]) {
    GEAR_BY_ID[raw.id] = battleLootAsGear(raw);
  } else if (raw.manaRestore != null && GEAR_BY_ID[raw.id]!.manaRestore == null) {
    GEAR_BY_ID[raw.id] = { ...GEAR_BY_ID[raw.id]!, manaRestore: raw.manaRestore };
  }
}

const GEAR_SET_BY_ID: Record<string, GearSetDef> = Object.fromEntries(
  GEAR_SETS.map((s) => [s.id, s])
);

/** Fold generated catalog into battle loot pools so drops can include set pieces & new gear. */
function seedLootPoolsFromCatalog() {
  for (const item of GENERATED_GEAR) {
    const pool =
      item.slot === "consumable"
        ? item.tags.includes("potion")
          ? "common"
          : "trash"
        : item.tier === "legendary"
          ? "legendary"
          : item.tier === "rare"
            ? "rare"
            : item.tier === "magic"
              ? "magic"
              : "common";
    if (!LOOT_POOLS[pool]) LOOT_POOLS[pool] = [];
    if (!LOOT_POOLS[pool]!.includes(item.id)) LOOT_POOLS[pool]!.push(item.id);
  }
}
seedLootPoolsFromCatalog();

export function getGear(id: string): GearItem | undefined {
  return GEAR_BY_ID[id] ?? getBattleLootItem(id);
}

export function getGearSet(id: string): GearSetDef | undefined {
  return GEAR_SET_BY_ID[id];
}

export function listGearSets(): GearSetDef[] {
  return GEAR_SETS;
}

export function allGearItems(): GearItem[] {
  return Object.values(GEAR_BY_ID);
}

export function gearByTier(tier: GearItem["tier"]): GearItem[] {
  return allGearItems().filter((g) => g.tier === tier);
}

export function gearCatalogStats(): Record<GearItem["tier"], number> & { total: number; sets: number } {
  return {
    common: gearByTier("common").length,
    magic: gearByTier("magic").length,
    rare: gearByTier("rare").length,
    legendary: gearByTier("legendary").length,
    total: allGearItems().length,
    sets: GEAR_SETS.length,
  };
}

const PHYSICAL_STARTER = ["healing-potion", "trail-rations", "hound-treat"] as const;
const CASTER_STARTER = ["mana-draught", "healing-potion", "hound-treat"] as const;

const MELEE_WEAPONS = ["iron-sword", "hunting-bow", "oak-staff"] as const;
const RANGED_WEAPONS = ["hunting-bow", "iron-sword", "bronze-dagger"] as const;
const CASTER_WEAPONS = ["oak-staff", "sling-of-pebbles"] as const;
const HYBRID_WEAPONS = ["iron-sword", "oak-staff", "hunting-bow"] as const;
const STEALTH_WEAPONS = ["bronze-dagger", "iron-sword", "sling-of-pebbles"] as const;
const SUPPORT_WEAPONS = ["oak-staff", "hunting-bow", "bronze-dagger"] as const;
const HEALER_WEAPONS = ["oak-staff", "bronze-dagger"] as const;

export const STARTER_GEAR_BY_CLASS: Record<ClassId, string[]> = {
  warrior: [...PHYSICAL_STARTER],
  ranger: [...PHYSICAL_STARTER],
  mage: [...CASTER_STARTER],
  rogue: [...PHYSICAL_STARTER],
  healer: [...CASTER_STARTER],
  bard: [...CASTER_STARTER],
  paladin: [...PHYSICAL_STARTER],
  priest: [...CASTER_STARTER],
  deathknight: [...PHYSICAL_STARTER],
  shaman: [...CASTER_STARTER],
  warlock: [...CASTER_STARTER],
  monk: [...CASTER_STARTER],
  druid: [...CASTER_STARTER],
  demonhunter: [...PHYSICAL_STARTER],
  evoker: [...CASTER_STARTER],
  assassin: [...PHYSICAL_STARTER],
  battlemage: [...CASTER_STARTER],
  spellsword: [...CASTER_STARTER],
  nightblade: [...PHYSICAL_STARTER],
  sorcerer: [...CASTER_STARTER],
  warden: [...PHYSICAL_STARTER],
  necromancer: [...CASTER_STARTER],
  barbarian: [...PHYSICAL_STARTER],
  knight: [...PHYSICAL_STARTER],
};

/** Level-1 weapon picks at character create. */
export const CREATE_WEAPONS_BY_CLASS: Record<ClassId, string[]> = {
  warrior: [...MELEE_WEAPONS],
  ranger: [...RANGED_WEAPONS],
  mage: [...CASTER_WEAPONS],
  rogue: [...STEALTH_WEAPONS],
  healer: [...HEALER_WEAPONS],
  bard: [...SUPPORT_WEAPONS],
  paladin: [...MELEE_WEAPONS],
  priest: [...HEALER_WEAPONS],
  deathknight: [...MELEE_WEAPONS],
  shaman: [...HEALER_WEAPONS, "iron-sword"],
  warlock: [...CASTER_WEAPONS],
  monk: [...HEALER_WEAPONS, "iron-sword"],
  druid: [...HEALER_WEAPONS, "hunting-bow"],
  demonhunter: [...STEALTH_WEAPONS, "hunting-bow"],
  evoker: [...SUPPORT_WEAPONS],
  assassin: [...STEALTH_WEAPONS],
  battlemage: [...HYBRID_WEAPONS],
  spellsword: [...HYBRID_WEAPONS],
  nightblade: [...STEALTH_WEAPONS, "oak-staff"],
  sorcerer: [...CASTER_WEAPONS],
  warden: [...RANGED_WEAPONS, "oak-staff"],
  necromancer: [...CASTER_WEAPONS],
  barbarian: [...MELEE_WEAPONS],
  knight: [...MELEE_WEAPONS],
};
