#!/usr/bin/env node
/**
 * Generates Neverworld gear catalog (500+ items) + named sets.
 * Output: data/party-chronicle/gear-catalog.json
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "party-chronicle", "gear-catalog.json");

const SLOTS = ["head", "chest", "hands", "legs", "weapon", "offhand", "accessory"];
const STAT_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"];
const EXTRA_KEYS = ["maxHp", "maxMana", "atk", "def", "crit", "resist"];
const ALL_PROP_KEYS = [...STAT_KEYS, ...EXTRA_KEYS];

const PROP_LABEL = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
  maxHp: "Max HP",
  maxMana: "Max Mana",
  atk: "ATK",
  def: "DEF",
  crit: "Crit%",
  resist: "Resist",
};

const ADJECTIVES = [
  "Pine", "Mist", "Ember", "Frost", "Thorn", "Moss", "Ash", "River", "Moon", "Storm",
  "Briar", "Hollow", "Wild", "Quiet", "Bright", "Shadow", "Copper", "Iron", "Oak", "Yew",
  "Raven", "Wolf", "Stag", "Fox", "Bear", "Serpent", "Drake", "Goblin", "Elven", "Hold",
  "Trail", "Camp", "Glade", "Ridge", "Ford", "Crown", "Hearth", "Ley", "Rune", "Wisp",
  "Needle", "Bark", "Root", "Fern", "Cinder", "Gale", "Dusk", "Dawn", "Silver", "Bronze",
];

const NOUNS = {
  head: ["Cap", "Helm", "Circlet", "Hood", "Coif", "Crown", "Mask", "Band"],
  chest: ["Jerkin", "Mail", "Cuirass", "Vest", "Coat", "Hauberk", "Tunic", "Plate"],
  hands: ["Gloves", "Gauntlets", "Wraps", "Grips", "Bracers", "Mitts"],
  legs: ["Greaves", "Trousers", "Leggings", "Boots", "Sabatons", "Chaps"],
  weapon: ["Blade", "Bow", "Staff", "Axe", "Dagger", "Spear", "Mace", "Wand", "Sword", "Sling"],
  offhand: ["Shield", "Buckler", "Tome", "Focus", "Orb", "Lantern"],
  accessory: ["Ring", "Amulet", "Charm", "Brooch", "Token", "Pendant", "Band"],
};

const BLURBS = [
  "Smells of wet pine and honest work.",
  "Warm from a hundred campfires.",
  "Leaves a faint frost on the fingertips.",
  "Humms when goblins are near.",
  "Stitched with Misty Hill thread.",
  "A comic-panel gleam of adventure.",
  "Heavy with old oaths and good jokes.",
  "Forged where the trail forgets its name.",
  "Soft as moss, stubborn as a mule.",
  "Catches moonlight like a secret.",
  "Marked with three initials — J, R, E.",
  "The forest approved this craft.",
  "Still sticky with trail honey.",
  "Whispers encouragement mid-fight.",
  "Painted with a crooked wolf grin.",
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function label(key, value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value} ${PROP_LABEL[key]}`;
}

function makeProps(seed, tier, slot) {
  const count = tier === "common" ? 2 : tier === "magic" ? 5 : tier === "rare" ? 5 : 5;
  const props = [];
  const used = new Set();
  const base = Math.max(1, tier === "common" ? 1 : tier === "magic" ? 2 : tier === "rare" ? 3 : 4);

  // Prefer atk on weapons, def on armor
  const preferred =
    slot === "weapon"
      ? ["atk", "strength", "dexterity", "crit", "maxHp"]
      : slot === "accessory"
        ? ["maxMana", "intelligence", "wisdom", "charisma", "crit"]
        : ["def", "constitution", "resist", "maxHp", "strength"];

  for (let i = 0; i < count; i++) {
    let key = pick([...preferred, ...ALL_PROP_KEYS], seed + i * 7);
    let guard = 0;
    while (used.has(key) && guard++ < 20) {
      key = pick(ALL_PROP_KEYS, seed + i * 11 + guard);
    }
    used.add(key);
    let value = base + ((seed + i) % 3);
    if (key === "maxHp") value = base * 4 + ((seed + i) % 5);
    if (key === "maxMana") value = base * 3 + ((seed + i) % 4);
    if (key === "crit") value = Math.min(12, base + (i % 3));
    if (key === "atk" && slot === "weapon") value = base * 2 + ((seed + i) % 4);
    if (key === "def" && slot !== "weapon") value = base + ((seed + i) % 3);
    props.push({ key, value, label: label(key, value) });
  }
  return props;
}

function powerFor(tier, slot, seed) {
  if (slot !== "weapon" && slot !== "offhand" && slot !== "hands") {
    return slot === "accessory" && tier !== "common" ? 1 + (seed % 3) : undefined;
  }
  const base = tier === "common" ? 4 : tier === "magic" ? 10 : tier === "rare" ? 16 : 24;
  return base + (seed % 5);
}

function armorFor(tier, slot, seed) {
  if (slot === "weapon" || slot === "consumable" || slot === "misc") return undefined;
  const base = tier === "common" ? 1 : tier === "magic" ? 3 : tier === "rare" ? 5 : 7;
  const slotBonus = slot === "chest" ? 2 : slot === "offhand" ? 2 : slot === "legs" || slot === "head" ? 1 : 0;
  return base + slotBonus + (seed % 2);
}

/** Named multi-piece sets with 2/3/full bonuses. */
const SETS = [
  {
    id: "frostwarden",
    name: "Frostwarden",
    blurb: "Ice that remembers the ridge wind.",
    pieces: [
      { slot: "head", name: "Frostwarden Circlet" },
      { slot: "chest", name: "Frostwarden Mail" },
      { slot: "hands", name: "Frostwarden Gauntlets" },
      { slot: "legs", name: "Frostwarden Greaves" },
      { slot: "weapon", name: "Frostwarden Blade" },
      { slot: "accessory", name: "Frostwarden Pendant" },
    ],
    bonuses: [
      { pieces: 2, blurb: "Cold clarity — steadier strikes.", properties: [{ key: "atk", value: 3, label: "+3 ATK" }, { key: "resist", value: 2, label: "+2 Resist" }] },
      { pieces: 3, blurb: "Rime armor thickens.", properties: [{ key: "def", value: 4, label: "+4 DEF" }, { key: "maxHp", value: 15, label: "+15 Max HP" }] },
      { pieces: 6, blurb: "Full Frostwarden — the ridge fights with you.", properties: [{ key: "strength", value: 3, label: "+3 STR" }, { key: "crit", value: 5, label: "+5 Crit%" }, { key: "atk", value: 6, label: "+6 ATK" }] },
    ],
  },
  {
    id: "emberfang",
    name: "Emberfang",
    blurb: "Hold-of-Embers teeth, banked hot.",
    pieces: [
      { slot: "head", name: "Emberfang Helm" },
      { slot: "chest", name: "Emberfang Cuirass" },
      { slot: "hands", name: "Emberfang Grips" },
      { slot: "legs", name: "Emberfang Striders" },
      { slot: "weapon", name: "Emberfang Axe" },
      { slot: "offhand", name: "Emberfang Buckler" },
    ],
    bonuses: [
      { pieces: 2, blurb: "Sparks jump between blows.", properties: [{ key: "atk", value: 4, label: "+4 ATK" }, { key: "strength", value: 2, label: "+2 STR" }] },
      { pieces: 3, blurb: "Heat without burn.", properties: [{ key: "maxHp", value: 20, label: "+20 Max HP" }, { key: "def", value: 3, label: "+3 DEF" }] },
      { pieces: 6, blurb: "Full Emberfang — the forge sings.", properties: [{ key: "atk", value: 8, label: "+8 ATK" }, { key: "crit", value: 6, label: "+6 Crit%" }, { key: "constitution", value: 3, label: "+3 CON" }] },
    ],
  },
  {
    id: "mistwalker",
    name: "Mistwalker",
    blurb: "Steps the fog cannot name.",
    pieces: [
      { slot: "head", name: "Mistwalker Hood" },
      { slot: "chest", name: "Mistwalker Vest" },
      { slot: "hands", name: "Mistwalker Wraps" },
      { slot: "legs", name: "Mistwalker Boots" },
      { slot: "weapon", name: "Mistwalker Bow" },
      { slot: "accessory", name: "Mistwalker Charm" },
    ],
    bonuses: [
      { pieces: 2, blurb: "Quieter feet, sharper eyes.", properties: [{ key: "dexterity", value: 3, label: "+3 DEX" }, { key: "crit", value: 3, label: "+3 Crit%" }] },
      { pieces: 3, blurb: "Fog parts for the party.", properties: [{ key: "def", value: 3, label: "+3 DEF" }, { key: "maxMana", value: 12, label: "+12 Max Mana" }] },
      { pieces: 6, blurb: "Full Mistwalker — you are a rumor with arrows.", properties: [{ key: "dexterity", value: 4, label: "+4 DEX" }, { key: "atk", value: 7, label: "+7 ATK" }, { key: "resist", value: 4, label: "+4 Resist" }] },
    ],
  },
  {
    id: "thorncloak",
    name: "Thorncloak",
    blurb: "Briar law for soft-path walkers.",
    pieces: [
      { slot: "head", name: "Thorncloak Mask" },
      { slot: "chest", name: "Thorncloak Coat" },
      { slot: "hands", name: "Thorncloak Bracers" },
      { slot: "legs", name: "Thorncloak Leggings" },
      { slot: "offhand", name: "Thorncloak Lantern" },
      { slot: "accessory", name: "Thorncloak Brooch" },
    ],
    bonuses: [
      { pieces: 2, blurb: "Thorns answer bites.", properties: [{ key: "def", value: 3, label: "+3 DEF" }, { key: "wisdom", value: 2, label: "+2 WIS" }] },
      { pieces: 3, blurb: "Roots steady the stance.", properties: [{ key: "maxHp", value: 18, label: "+18 Max HP" }, { key: "resist", value: 3, label: "+3 Resist" }] },
      { pieces: 6, blurb: "Full Thorncloak — the grove armors you.", properties: [{ key: "constitution", value: 3, label: "+3 CON" }, { key: "def", value: 6, label: "+6 DEF" }, { key: "maxMana", value: 15, label: "+15 Max Mana" }] },
    ],
  },
  {
    id: "starfall",
    name: "Starfall",
    blurb: "Ley-light corked for three walkers.",
    pieces: [
      { slot: "head", name: "Starfall Circlet" },
      { slot: "chest", name: "Starfall Robe" },
      { slot: "hands", name: "Starfall Gloves" },
      { slot: "legs", name: "Starfall Slippers" },
      { slot: "weapon", name: "Starfall Staff" },
      { slot: "offhand", name: "Starfall Tome" },
      { slot: "accessory", name: "Starfall Ring" },
    ],
    bonuses: [
      { pieces: 2, blurb: "Mana pools deepen.", properties: [{ key: "maxMana", value: 15, label: "+15 Max Mana" }, { key: "intelligence", value: 2, label: "+2 INT" }] },
      { pieces: 3, blurb: "Spells land cleaner.", properties: [{ key: "atk", value: 4, label: "+4 ATK" }, { key: "crit", value: 4, label: "+4 Crit%" }] },
      { pieces: 7, blurb: "Full Starfall — the sky answers.", properties: [{ key: "intelligence", value: 4, label: "+4 INT" }, { key: "maxMana", value: 25, label: "+25 Max Mana" }, { key: "atk", value: 8, label: "+8 ATK" }] },
    ],
  },
  {
    id: "hearthguard",
    name: "Hearthguard",
    blurb: "Armor that warms allies within a step.",
    pieces: [
      { slot: "head", name: "Hearthguard Helm" },
      { slot: "chest", name: "Hearthguard Plate" },
      { slot: "hands", name: "Hearthguard Gauntlets" },
      { slot: "legs", name: "Hearthguard Greaves" },
      { slot: "offhand", name: "Hearthguard Shield" },
      { slot: "accessory", name: "Hearthguard Token" },
    ],
    bonuses: [
      { pieces: 2, blurb: "Shields share warmth.", properties: [{ key: "def", value: 4, label: "+4 DEF" }, { key: "charisma", value: 2, label: "+2 CHA" }] },
      { pieces: 3, blurb: "The hearth holds.", properties: [{ key: "maxHp", value: 25, label: "+25 Max HP" }, { key: "resist", value: 3, label: "+3 Resist" }] },
      { pieces: 6, blurb: "Full Hearthguard — no one fights alone.", properties: [{ key: "constitution", value: 4, label: "+4 CON" }, { key: "def", value: 7, label: "+7 DEF" }, { key: "maxHp", value: 20, label: "+20 Max HP" }] },
    ],
  },
  {
    id: "ravenmark",
    name: "Ravenmark",
    blurb: "Corv's census inked into steel and feather.",
    pieces: [
      { slot: "head", name: "Ravenmark Mask" },
      { slot: "chest", name: "Ravenmark Mantle" },
      { slot: "hands", name: "Ravenmark Claws" },
      { slot: "legs", name: "Ravenmark Treads" },
      { slot: "weapon", name: "Ravenmark Quillblade" },
      { slot: "accessory", name: "Ravenmark Signet" },
    ],
    bonuses: [
      { pieces: 2, blurb: "Names stick to memory.", properties: [{ key: "wisdom", value: 3, label: "+3 WIS" }, { key: "crit", value: 3, label: "+3 Crit%" }] },
      { pieces: 3, blurb: "The ledger protects its clerks.", properties: [{ key: "def", value: 3, label: "+3 DEF" }, { key: "maxMana", value: 12, label: "+12 Max Mana" }] },
      { pieces: 6, blurb: "Full Ravenmark — the census fights back.", properties: [{ key: "intelligence", value: 3, label: "+3 INT" }, { key: "atk", value: 6, label: "+6 ATK" }, { key: "resist", value: 4, label: "+4 Resist" }] },
    ],
  },
  {
    id: "goblinroad",
    name: "Goblinroad",
    blurb: "Scrap-metal pride from the crooked trail.",
    pieces: [
      { slot: "head", name: "Goblinroad Cap" },
      { slot: "chest", name: "Goblinroad Jacket" },
      { slot: "hands", name: "Goblinroad Mitts" },
      { slot: "legs", name: "Goblinroad Pants" },
      { slot: "weapon", name: "Goblinroad Cleaver" },
      { slot: "offhand", name: "Goblinroad Lid-Shield" },
    ],
    bonuses: [
      { pieces: 2, blurb: "Cheap tricks, sharp edges.", properties: [{ key: "atk", value: 3, label: "+3 ATK" }, { key: "dexterity", value: 2, label: "+2 DEX" }] },
      { pieces: 3, blurb: "Loot sticks to sticky fingers.", properties: [{ key: "maxHp", value: 12, label: "+12 Max HP" }, { key: "crit", value: 4, label: "+4 Crit%" }] },
      { pieces: 6, blurb: "Full Goblinroad — the camp cheers.", properties: [{ key: "strength", value: 3, label: "+3 STR" }, { key: "atk", value: 7, label: "+7 ATK" }, { key: "charisma", value: 2, label: "+2 CHA" }] },
    ],
  },
  {
    id: "leyhound",
    name: "Leyhound",
    blurb: "Arcane leather that hums when dogs howl.",
    pieces: [
      { slot: "head", name: "Leyhound Hood" },
      { slot: "chest", name: "Leyhound Coat" },
      { slot: "hands", name: "Leyhound Gloves" },
      { slot: "legs", name: "Leyhound Boots" },
      { slot: "weapon", name: "Leyhound Crook" },
      { slot: "accessory", name: "Leyhound Whistle" },
    ],
    bonuses: [
      { pieces: 2, blurb: "Bond deepens.", properties: [{ key: "charisma", value: 2, label: "+2 CHA" }, { key: "maxHp", value: 10, label: "+10 Max HP" }] },
      { pieces: 3, blurb: "Ley lines tug the leash.", properties: [{ key: "maxMana", value: 15, label: "+15 Max Mana" }, { key: "wisdom", value: 2, label: "+2 WIS" }] },
      { pieces: 6, blurb: "Full Leyhound — pack and mage as one.", properties: [{ key: "intelligence", value: 3, label: "+3 INT" }, { key: "atk", value: 5, label: "+5 ATK" }, { key: "def", value: 4, label: "+4 DEF" }] },
    ],
  },
  {
    id: "ashcrown",
    name: "Ashcrown",
    blurb: "Cooled dragon-glass for hard choices.",
    pieces: [
      { slot: "head", name: "Ashcrown Circlet" },
      { slot: "chest", name: "Ashcrown Plate" },
      { slot: "hands", name: "Ashcrown Gauntlets" },
      { slot: "legs", name: "Ashcrown Greaves" },
      { slot: "weapon", name: "Ashcrown Scepter" },
      { slot: "offhand", name: "Ashcrown Mirror" },
      { slot: "accessory", name: "Ashcrown Shard" },
    ],
    bonuses: [
      { pieces: 2, blurb: "Ash settles into resolve.", properties: [{ key: "constitution", value: 2, label: "+2 CON" }, { key: "resist", value: 3, label: "+3 Resist" }] },
      { pieces: 3, blurb: "The crown weighs kindly.", properties: [{ key: "def", value: 5, label: "+5 DEF" }, { key: "maxHp", value: 20, label: "+20 Max HP" }] },
      { pieces: 7, blurb: "Full Ashcrown — destiny clears its throat.", properties: [{ key: "charisma", value: 4, label: "+4 CHA" }, { key: "atk", value: 6, label: "+6 ATK" }, { key: "maxMana", value: 18, label: "+18 Max Mana" }] },
    ],
  },
];

const items = [];
const setsOut = [];
const seenIds = new Set();

function addItem(item) {
  if (seenIds.has(item.id)) return false;
  seenIds.add(item.id);
  items.push(item);
  return true;
}

// ── Named sets ──────────────────────────────────────────────
for (const set of SETS) {
  const pieceIds = [];
  set.pieces.forEach((piece, pi) => {
    const id = `${set.id}-${piece.slot}`;
    pieceIds.push(id);
    const tier = "rare";
    addItem({
      id,
      name: piece.name,
      blurb: `${set.blurb} (${piece.slot}).`,
      tier,
      rarity: "rare",
      slot: piece.slot,
      power: powerFor(tier, piece.slot, pi + 3),
      armor: armorFor(tier, piece.slot, pi + 5),
      tags: ["set", set.id, piece.slot === "weapon" ? "melee" : "armor"],
      setId: set.id,
      properties: makeProps(pi * 13 + set.id.length, tier, piece.slot),
    });
  });
  setsOut.push({
    id: set.id,
    name: set.name,
    blurb: set.blurb,
    pieceIds,
    bonuses: set.bonuses,
  });
}

// ── Procedural equippable gear (wave 1) ─────────────────────
const TIERS = [
  { tier: "common", rarity: "common", count: 160 },
  { tier: "magic", rarity: "magic", count: 140 },
  { tier: "rare", rarity: "rare", count: 80 },
  { tier: "legendary", rarity: "legendary", count: 40 },
];

let n = 0;
for (const { tier, rarity, count } of TIERS) {
  for (let i = 0; i < count; i++) {
    const slot = pick(SLOTS, n + i * 3);
    const adj = pick(ADJECTIVES, n * 5 + i);
    const noun = pick(NOUNS[slot], n + i * 7);
    const id = `gen-${tier}-${slot}-${i}-${(n + i) % 97}`;
    const name = `${adj} ${noun}`;
    addItem({
      id,
      name,
      blurb: pick(BLURBS, n + i),
      tier,
      rarity,
      slot,
      power: powerFor(tier, slot, n + i),
      armor: armorFor(tier, slot, n + i * 2),
      tags: [slot, tier, adj.toLowerCase()],
      properties: makeProps(n * 17 + i, tier, slot),
    });
    n++;
  }
}

// ── Wave 2: +500 mix (equip + consumables + tomes) ──────────
const ADJECTIVES_2 = [
  "Cobalt", "Amber", "Verdant", "Cinder", "Pearl", "Obsidian", "Ivory", "Rust",
  "Glimmer", "Thicket", "Summit", "Marsh", "Canyon", "Harbor", "Lantern", "Quill",
  "Bramble", "Crystal", "Soot", "Honey", "Pebble", "Thunder", "Willow", "Coral",
  "Nettle", "Sapphire", "Hearth", "Twilight", "Aurora", "Quarry", "Meadow", "Flint",
];
const BLURBS_2 = [
  "Comic-panel shine under forest light.",
  "Smuggled past three goblin checkpoints.",
  "Still warm from Ember Hold forges.",
  "A fox would steal this if it could.",
  "Marked with a crooked fellowship rune.",
  "Smells faintly of trail stew.",
  "Heavy enough to mean business.",
  "Light enough for a midnight dash.",
  "The Misty Hills approve.",
  "Whispers jokes mid-boss-fight.",
];

const TIERS_2 = [
  { tier: "common", rarity: "common", count: 180 },
  { tier: "magic", rarity: "magic", count: 140 },
  { tier: "rare", rarity: "rare", count: 70 },
  { tier: "legendary", rarity: "legendary", count: 30 },
];

let n2 = 10_000;
for (const { tier, rarity, count } of TIERS_2) {
  for (let i = 0; i < count; i++) {
    const slot = pick(SLOTS, n2 + i * 5);
    const adj = pick(ADJECTIVES_2, n2 + i * 3);
    const noun = pick(NOUNS[slot], n2 + i * 11);
    const id = `gen2-${tier}-${slot}-${i}`;
    addItem({
      id,
      name: `${adj} ${noun}`,
      blurb: pick(BLURBS_2, n2 + i),
      tier,
      rarity,
      slot,
      power: powerFor(tier, slot, n2 + i),
      armor: armorFor(tier, slot, n2 + i * 2),
      tags: [slot, tier, "wave2", adj.toLowerCase()],
      properties: makeProps(n2 * 3 + i, tier, slot),
    });
    n2++;
  }
}

// ── Wave 3: +500 weapons & armor for main characters ────────
const ARMOR_WEAPON_SLOTS = ["head", "chest", "hands", "legs", "weapon", "offhand"];
const ADJECTIVES_3 = [
  "Quarry", "Summit", "Harbor", "Lantern", "Twilight", "Aurora", "Meadow", "Coral",
  "Nettle", "Sapphire", "Granite", "Cedar", "Basalt", "Maple", "Onyx", "Jade",
  "Crimson", "Pale", "Keen", "Stout", "Swift", "Grim", "Kind", "Loyal", "Bold",
  "Silent", "Thunder", "Woven", "Forged", "Carved", "Blessed", "Cursed", "Lucky",
  "Trailworn", "Roadwise", "Campfire", "Moonlit", "Sunlit", "Fogbound", "Stormcut",
  "Rootdeep", "Skylark", "Wolfmark", "Bearhide", "Foxglove", "Raventhorn", "Drakebone",
];
const NOUNS_3 = {
  head: ["Helm", "Hood", "Circlet", "Mask", "Coif", "Crown", "Cap", "Visor"],
  chest: ["Cuirass", "Hauberk", "Jerkin", "Plate", "Mail", "Coat", "Vest", "Brigandine"],
  hands: ["Gauntlets", "Gloves", "Grips", "Bracers", "Wraps", "Mitts", "Claws"],
  legs: ["Greaves", "Boots", "Leggings", "Sabatons", "Chaps", "Treads", "Guards"],
  weapon: [
    "Longsword", "Shortsword", "Claymore", "Rapier", "Axe", "Hatchet", "Mace", "Flail",
    "Spear", "Halberd", "Bow", "Longbow", "Crossbow", "Staff", "Wand", "Dagger",
    "Dirk", "Sling", "Hammer", "Glaive", "Scimitar", "Trident",
  ],
  offhand: ["Shield", "Buckler", "Tome", "Focus", "Orb", "Lantern", "Parry Blade", "Quiver"],
};
const BLURBS_3 = [
  "Found under a fallen mile-marker.",
  "Still dusty from a roadside cache.",
  "Smells of dug earth and old coin.",
  "A chest hinge squeaked when this came free.",
  "Trail-worn, luck-blessed.",
  "Fits Justin, Rusty, or Elisha without complaint.",
  "Comic-panel gleam under canopy light.",
  "Heavy enough to mean business.",
  "Light enough for a midnight dash.",
  "The Misty Hills approve.",
  "Whispers jokes mid-boss-fight.",
  "Marked with a crooked fellowship rune.",
];

const TIERS_3 = [
  { tier: "common", rarity: "common", count: 180 },
  { tier: "magic", rarity: "magic", count: 160 },
  { tier: "rare", rarity: "rare", count: 100 },
  { tier: "legendary", rarity: "legendary", count: 60 },
];

let n3 = 20_000;
for (const { tier, rarity, count } of TIERS_3) {
  for (let i = 0; i < count; i++) {
    const slot = pick(ARMOR_WEAPON_SLOTS, n3 + i * 7);
    const adj = pick(ADJECTIVES_3, n3 + i * 3);
    const noun = pick(NOUNS_3[slot], n3 + i * 11);
    const id = `gen3-${tier}-${slot}-${i}`;
    addItem({
      id,
      name: `${adj} ${noun}`,
      blurb: pick(BLURBS_3, n3 + i),
      tier,
      rarity,
      slot,
      power: powerFor(tier, slot, n3 + i),
      armor: armorFor(tier, slot, n3 + i * 2),
      tags: [slot, tier, "wave3", "hero", adj.toLowerCase()],
      properties: makeProps(n3 * 5 + i, tier, slot),
    });
    n3++;
  }
}

// ── Consumables ─────────────────────────────────────────────
const CONSUMABLES = [
  { id: "berry-tonic", name: "Berry Tonic", blurb: "Wild raspberry and trail mint.", heal: 15, tags: ["potion", "heal", "food"] },
  { id: "pine-salve", name: "Pine Salve", blurb: "Sticky, green, works.", heal: 20, tags: ["potion", "heal"] },
  { id: "moon-water", name: "Moon Water", blurb: "Bottled from a quiet pool.", manaRestore: 15, tags: ["potion", "mana"] },
  { id: "ley-sip", name: "Ley Sip", blurb: "One mouthful of humming light.", manaRestore: 25, tags: ["potion", "mana"] },
  { id: "camp-stew", name: "Camp Stew", blurb: "Three spoons, three friends.", heal: 18, cookBonus: 2, tags: ["food"] },
  { id: "honey-cake", name: "Honey Cake", blurb: "Sticky fingers, full heart.", heal: 12, tags: ["food"] },
  { id: "jerky-twist", name: "Jerky Twist", blurb: "Chewy enough for a boss fight.", heal: 10, tags: ["food"] },
  { id: "stamina-brew", name: "Stamina Brew", blurb: "Bitter, then suddenly fine.", staminaRestore: 20, tags: ["potion", "stamina"] },
  { id: "dual-elixir", name: "Dual Elixir", blurb: "Red-blue swirl — pick a crisis.", heal: 30, manaRestore: 20, tags: ["potion", "heal", "mana"] },
  { id: "hound-biscuit", name: "Hound Biscuit", blurb: "Lumen-approved crunch.", heal: 5, tags: ["dog", "food"] },
];

for (const c of CONSUMABLES) {
  addItem({
    ...c,
    tier: "common",
    rarity: "common",
    slot: "consumable",
    tags: c.tags,
    properties: [],
  });
}

// Extra potion/food variants for loot variety
const HEAL_NAMES = ["Moss Draught", "Fern Philter", "Root Remedy", "Glade Cordial", "Ridge Tonic", "Ford Flask", "Camp Cordial", "Briar Balm", "Thicket Balm", "Summit Flask"];
const MANA_NAMES = ["Wisp Vial", "Rune Sip", "Star Philter", "Ley Cordial", "Arc Flask", "Dream Draught", "Silver Mist", "Echo Tonic", "Quill Ink", "Aurora Sip"];
const FOOD_NAMES = ["Trail Loaf", "Smoked Trout", "Berry Mash", "Nut Cake", "Mushroom Skewer", "Cheese Wheel Slice", "Apple Chips", "Stew Cup", "Honey Jerky", "Peppercorn Biscuit"];

for (let i = 0; i < 40; i++) {
  addItem({
    id: `potion-heal-${i}`,
    name: pick(HEAL_NAMES, i),
    blurb: pick(BLURBS, i + 3),
    tier: i % 5 === 0 ? "magic" : "common",
    rarity: i % 5 === 0 ? "magic" : "common",
    slot: "consumable",
    heal: 12 + (i % 8) * 5,
    tags: ["potion", "heal"],
    properties: [],
  });
}
for (let i = 0; i < 30; i++) {
  addItem({
    id: `potion-mana-${i}`,
    name: pick(MANA_NAMES, i),
    blurb: pick(BLURBS, i + 9),
    tier: i % 4 === 0 ? "magic" : "common",
    rarity: i % 4 === 0 ? "magic" : "common",
    slot: "consumable",
    manaRestore: 10 + (i % 6) * 5,
    tags: ["potion", "mana"],
    properties: [],
  });
}
for (let i = 0; i < 30; i++) {
  addItem({
    id: `food-pack-${i}`,
    name: pick(FOOD_NAMES, i),
    blurb: pick(BLURBS, i + 12),
    tier: "common",
    rarity: "common",
    slot: "consumable",
    heal: 6 + (i % 10) * 2,
    cookBonus: 1 + (i % 3),
    tags: ["food"],
    properties: [],
  });
}

// Wave 2 consumables (+80)
for (let i = 0; i < 35; i++) {
  addItem({
    id: `potion-heal-w2-${i}`,
    name: `${pick(ADJECTIVES_2, i)} ${pick(HEAL_NAMES, i + 2)}`,
    blurb: pick(BLURBS_2, i),
    tier: i % 6 === 0 ? "rare" : i % 3 === 0 ? "magic" : "common",
    rarity: i % 6 === 0 ? "rare" : i % 3 === 0 ? "magic" : "common",
    slot: "consumable",
    heal: 14 + (i % 10) * 6,
    tags: ["potion", "heal", "wave2"],
    properties: [],
  });
}
for (let i = 0; i < 25; i++) {
  addItem({
    id: `potion-mana-w2-${i}`,
    name: `${pick(ADJECTIVES_2, i + 8)} ${pick(MANA_NAMES, i)}`,
    blurb: pick(BLURBS_2, i + 4),
    tier: i % 5 === 0 ? "rare" : i % 2 === 0 ? "magic" : "common",
    rarity: i % 5 === 0 ? "rare" : i % 2 === 0 ? "magic" : "common",
    slot: "consumable",
    manaRestore: 12 + (i % 8) * 5,
    tags: ["potion", "mana", "wave2"],
    properties: [],
  });
}
for (let i = 0; i < 20; i++) {
  addItem({
    id: `food-w2-${i}`,
    name: `${pick(ADJECTIVES_2, i + 14)} ${pick(FOOD_NAMES, i)}`,
    blurb: pick(BLURBS_2, i + 6),
    tier: "common",
    rarity: "common",
    slot: "consumable",
    heal: 8 + (i % 12) * 2,
    cookBonus: 1 + (i % 4),
    tags: ["food", "wave2"],
    properties: [],
  });
}

// ── Misc / spellbook-flavored curios ────────────────────────
for (let i = 0; i < 20; i++) {
  addItem({
    id: `curios-${i}`,
    name: `${pick(ADJECTIVES, i + 20)} Curio`,
    blurb: "Pocket treasure for the comic-panel road.",
    tier: i % 3 === 0 ? "magic" : "common",
    rarity: i % 3 === 0 ? "magic" : "common",
    slot: "misc",
    tags: ["misc", "loot"],
    properties: [],
  });
}

// Spellbook gear stubs (linked abilities live in spellbooks-wave2.json)
const SPELL_NAMES = [
  "Pine Needle Dart", "Fog Step", "Ember Bark", "River Mirror", "Thorn Lash",
  "Moon Howl", "Campfire Ward", "Goblin Jinx", "Ley Spark", "Ash Whisper",
  "Fern Bind", "Ridge Quake", "Honey Charm", "Crow Call", "Stag Charge",
  "Wisp Veil", "Forge Temper", "Mist Arrow", "Hearth Hymn", "Quill Strike",
  "Bramble Cage", "Star Needle", "Mud Slide", "Lantern Flare", "Oath Bind",
  "Nettle Sting", "Glade Rest", "Summit Cry", "Marsh Grasp", "Crystal Shard",
  "Soot Cloud", "Willow Song", "Coral Spike", "Thunder Pebble", "Aurora Veil",
  "Quarry Slam", "Meadow Lull", "Flint Spark", "Twilight Cut", "Pearl Ward",
];
const spellbooksOut = [];
for (let i = 0; i < 40; i++) {
  const spellName = SPELL_NAMES[i];
  const slug = spellName.toLowerCase().replace(/\s+/g, "-");
  const bookId = `spellbook-w2-${slug}`;
  const abilityId = `spell-w2-${slug}`;
  const tier = i % 8 === 0 ? "legendary" : i % 3 === 0 ? "rare" : "magic";
  addItem({
    id: bookId,
    name: `Tome of ${spellName}`,
    blurb: `Read to learn ${spellName} — forest comic magic.`,
    tier,
    rarity: tier,
    slot: "misc",
    tags: ["spellbook", "tome", "wave2"],
    properties: [],
  });
  spellbooksOut.push({
    id: bookId,
    name: `Tome of ${spellName}`,
    blurb: `Read to learn ${spellName}.`,
    teachesAbilityId: abilityId,
    ability: {
      id: abilityId,
      name: spellName,
      tree: "magic",
      kind: "spell",
      blurb: pick(BLURBS_2, i),
      nodeId: `magic-w2-${slug}`,
      cost: { mana: 6 + (i % 8) },
      power: 10 + (i % 12) + (tier === "legendary" ? 8 : tier === "rare" ? 4 : 0),
      tags: i % 5 === 0 ? ["spell", "heal"] : ["spell", "damage", pick(["frost", "fire", "nature", "arcane"], i)],
      target: i % 5 === 0 ? "self" : "enemy",
    },
  });
}

const equippable = items.filter((i) => !["consumable", "misc"].includes(i.slot));
const withFive = equippable.filter((i) => (i.properties?.length ?? 0) >= 5);

const pack = {
  version: 2,
  generatedAt: new Date().toISOString(),
  sets: setsOut,
  items,
  stats: {
    total: items.length,
    equippable: equippable.length,
    withFiveProperties: withFive.length,
    sets: setsOut.length,
    consumables: items.filter((i) => i.slot === "consumable").length,
    spellbooks: spellbooksOut.length,
  },
};

const SPELL_OUT = join(__dirname, "..", "data", "party-chronicle", "spellbooks-wave2.json");

writeFileSync(OUT, JSON.stringify(pack, null, 2));
writeFileSync(SPELL_OUT, JSON.stringify({ spellbooks: spellbooksOut }, null, 2));
console.log(`Wrote ${OUT}`);
console.log(`Wrote ${SPELL_OUT}`);
console.log(JSON.stringify(pack.stats, null, 2));
