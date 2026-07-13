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

// ── Procedural equippable gear ──────────────────────────────
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
const HEAL_NAMES = ["Moss Draught", "Fern Philter", "Root Remedy", "Glade Cordial", "Ridge Tonic", "Ford Flask", "Camp Cordial", "Briar Balm"];
const MANA_NAMES = ["Wisp Vial", "Rune Sip", "Star Philter", "Ley Cordial", "Arc Flask", "Dream Draught", "Silver Mist", "Echo Tonic"];
const FOOD_NAMES = ["Trail Loaf", "Smoked Trout", "Berry Mash", "Nut Cake", "Mushroom Skewer", "Cheese Wheel Slice", "Apple Chips", "Stew Cup"];

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

// ── Misc / spellbook-flavored curios (not full spellbooks) ──
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

const equippable = items.filter((i) => !["consumable", "misc"].includes(i.slot));
const withFive = equippable.filter((i) => (i.properties?.length ?? 0) >= 5);

const pack = {
  version: 1,
  generatedAt: new Date().toISOString(),
  sets: setsOut,
  items,
  stats: {
    total: items.length,
    equippable: equippable.length,
    withFiveProperties: withFive.length,
    sets: setsOut.length,
    consumables: items.filter((i) => i.slot === "consumable").length,
  },
};

writeFileSync(OUT, JSON.stringify(pack, null, 2));
console.log(`Wrote ${OUT}`);
console.log(JSON.stringify(pack.stats, null, 2));
