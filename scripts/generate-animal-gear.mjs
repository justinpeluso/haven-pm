#!/usr/bin/env node
/**
 * Generates Neverworld animal companion gear (300+ weapons & armor).
 * Output: data/party-chronicle/animal-gear.json
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "party-chronicle", "animal-gear.json");

const SLOTS = ["collar", "harness", "paws", "muzzle", "charm"];
const SLOT_NOUNS = {
  collar: ["Collar", "Choker", "Band", "Ruff", "Torc", "Chain"],
  harness: ["Harness", "Coat", "Mail", "Vest", "Cuirass", "Mantle", "Barding"],
  paws: ["Paw Guards", "Claw Caps", "Leg Wraps", "Booties", "Greaves", "Pads"],
  muzzle: ["Fang Spikes", "Bite Plate", "Jaw Guard", "Tooth Ring", "Muzzle Blade", "Snarl Cap"],
  charm: ["Tag", "Charm", "Totem", "Bell", "Whistle Charm", "Pack Token", "Bone Pendant"],
};

const ADJECTIVES = [
  "Pine", "Mist", "Ember", "Frost", "Thorn", "Moss", "Ash", "River", "Moon", "Storm",
  "Briar", "Hollow", "Wild", "Quiet", "Bright", "Shadow", "Copper", "Iron", "Oak", "Yew",
  "Raven", "Wolf", "Stag", "Fox", "Bear", "Serpent", "Drake", "Goblin", "Elven", "Hold",
  "Trail", "Camp", "Glade", "Ridge", "Ford", "Crown", "Hearth", "Ley", "Rune", "Wisp",
  "Needle", "Bark", "Root", "Fern", "Cinder", "Gale", "Dusk", "Dawn", "Silver", "Bronze",
  "Cobalt", "Amber", "Verdant", "Pearl", "Obsidian", "Ivory", "Rust", "Glimmer", "Thicket",
  "Summit", "Marsh", "Bramble", "Crystal", "Soot", "Honey", "Thunder", "Willow", "Flint",
  "Pack", "Hound", "Muzzle", "Howl", "Kennel", "Litter", "Alpha", "Scout", "Copper", "Lumen",
];

const BLURBS = [
  "Smells of wet pine and honest packs.",
  "Warm from a hundred campfires.",
  "Leaves a faint frost on the fur.",
  "Hums when goblins are near.",
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
  "Fits Scout, Copper, or Lumen equally well.",
  "Bond deepens when the pack wears this.",
  "Claws click a little louder.",
  "A kennel-master's pride.",
  "Howls better in the rain.",
];

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
  bond: "Bond",
};

const ALL_PROP_KEYS = [
  "strength", "dexterity", "constitution", "wisdom", "charisma",
  "maxHp", "atk", "def", "crit", "resist",
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function label(key, value) {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value} ${PROP_LABEL[key] ?? key}`;
}

function makeProps(seed, tier, slot) {
  const count = tier === "common" ? 2 : 5;
  const props = [];
  const used = new Set();
  const base = tier === "common" ? 1 : tier === "magic" ? 2 : tier === "rare" ? 3 : 4;
  const preferred =
    slot === "muzzle"
      ? ["atk", "strength", "crit", "dexterity", "maxHp"]
      : slot === "charm"
        ? ["bond", "wisdom", "charisma", "maxHp", "resist"]
        : slot === "collar"
          ? ["resist", "wisdom", "def", "maxHp", "charisma"]
          : ["def", "constitution", "maxHp", "resist", "strength"];

  for (let i = 0; i < count; i++) {
    let key = pick([...preferred, ...ALL_PROP_KEYS, "bond"], seed + i * 7);
    let guard = 0;
    while (used.has(key) && guard++ < 20) {
      key = pick([...ALL_PROP_KEYS, "bond"], seed + i * 11 + guard);
    }
    used.add(key);
    let value = base + ((seed + i) % 3);
    if (key === "maxHp") value = base * 3 + ((seed + i) % 5);
    if (key === "crit") value = Math.min(10, base + (i % 3));
    if (key === "bond") value = base + ((seed + i) % 4);
    if (key === "atk" && slot === "muzzle") value = base * 2 + ((seed + i) % 4);
    if (key === "def" && slot !== "muzzle") value = base + ((seed + i) % 3);
    props.push({ key, value, label: label(key, value) });
  }
  return props;
}

function powerFor(tier, slot, seed) {
  if (slot !== "muzzle" && slot !== "paws") {
    return slot === "charm" && tier !== "common" ? 1 + (seed % 2) : undefined;
  }
  const base = tier === "common" ? 3 : tier === "magic" ? 7 : tier === "rare" ? 12 : 18;
  return base + (seed % 4);
}

function armorFor(tier, slot, seed) {
  if (slot === "muzzle") return undefined;
  const base = tier === "common" ? 1 : tier === "magic" ? 2 : tier === "rare" ? 4 : 6;
  return base + (seed % 3);
}

/** Map animal slot → human GearItem.slot for catalog compatibility. */
function humanSlot(animalSlot) {
  if (animalSlot === "collar") return "accessory";
  if (animalSlot === "harness") return "chest";
  if (animalSlot === "paws") return "hands";
  if (animalSlot === "muzzle") return "weapon";
  return "accessory";
}

const items = [];
const seen = new Set();

function addItem(item) {
  if (seen.has(item.id)) return;
  seen.add(item.id);
  items.push(item);
}

const TIERS = [
  { tier: "common", rarity: "common", count: 100 },
  { tier: "magic", rarity: "magic", count: 100 },
  { tier: "rare", rarity: "rare", count: 80 },
  { tier: "legendary", rarity: "legendary", count: 40 },
];

let n = 0;
for (const { tier, rarity, count } of TIERS) {
  for (let i = 0; i < count; i++) {
    const animalSlot = pick(SLOTS, n + i * 3);
    const adj = pick(ADJECTIVES, n * 5 + i);
    const noun = pick(SLOT_NOUNS[animalSlot], n + i * 7);
    const id = `animal-${tier}-${animalSlot}-${i}`;
    addItem({
      id,
      name: `${adj} ${noun}`,
      blurb: pick(BLURBS, n + i),
      tier,
      rarity,
      slot: humanSlot(animalSlot),
      animalSlot,
      power: powerFor(tier, animalSlot, n + i),
      armor: armorFor(tier, animalSlot, n + i * 2),
      tags: ["animal", "animal-gear", animalSlot, tier],
      properties: makeProps(n * 17 + i, tier, animalSlot).filter((p) => p.key !== "bond").concat(
        makeProps(n * 17 + i, tier, animalSlot)
          .filter((p) => p.key === "bond")
          .map((p) => ({ ...p, key: "charisma", label: label("charisma", p.value) }))
          // bond shown as charisma in shared prop keys; also stash bond via maxHp-ish — use resist label hack
      ),
    });
    n++;
  }
}

// Fix: regenerate properties properly with bond mapped to a display-only via charisma + maxHp
// Re-run property assignment cleanly for all items
for (const item of items) {
  const slot = item.animalSlot;
  const seed = hash(item.id);
  item.properties = makeAnimalProps(seed, item.tier, slot);
}

function hash(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

function makeAnimalProps(seed, tier, slot) {
  const count = tier === "common" ? 2 : 5;
  const props = [];
  const used = new Set();
  const base = tier === "common" ? 1 : tier === "magic" ? 2 : tier === "rare" ? 3 : 4;
  const preferred =
    slot === "muzzle"
      ? ["atk", "strength", "crit", "dexterity", "maxHp"]
      : slot === "charm"
        ? ["charisma", "wisdom", "maxHp", "resist", "crit"]
        : slot === "collar"
          ? ["resist", "wisdom", "def", "maxHp", "charisma"]
          : ["def", "constitution", "maxHp", "resist", "strength"];

  for (let i = 0; i < count; i++) {
    let key = pick([...preferred, ...ALL_PROP_KEYS], seed + i * 7);
    let guard = 0;
    while (used.has(key) && guard++ < 20) {
      key = pick(ALL_PROP_KEYS, seed + i * 11 + guard);
    }
    used.add(key);
    let value = base + ((seed + i) % 3);
    if (key === "maxHp") value = base * 3 + ((seed + i) % 5);
    if (key === "crit") value = Math.min(10, base + (i % 3));
    if (key === "atk" && slot === "muzzle") value = base * 2 + ((seed + i) % 4);
    if (key === "def" && slot !== "muzzle") value = base + ((seed + i) % 3);
    props.push({ key, value, label: label(key, value) });
  }
  // Always include a bond bump as charisma for pack feel on magic+
  if (tier !== "common" && !used.has("charisma")) {
    props.push({ key: "charisma", value: base, label: label("charisma", base) });
  }
  return props.slice(0, tier === "common" ? 2 : 5);
}

// Signature named animal pieces
const SIGNATURES = [
  {
    id: "animal-scout-collar",
    name: "Scout's Ridge Collar",
    blurb: "Justin’s shepherd wears the north wind.",
    tier: "rare",
    animalSlot: "collar",
    armor: 4,
    properties: [
      { key: "wisdom", value: 3, label: "+3 WIS" },
      { key: "resist", value: 3, label: "+3 Resist" },
      { key: "maxHp", value: 12, label: "+12 Max HP" },
      { key: "def", value: 2, label: "+2 DEF" },
      { key: "charisma", value: 2, label: "+2 CHA" },
    ],
  },
  {
    id: "animal-copper-harness",
    name: "Copper's Mist Harness",
    blurb: "Red wolf-hound mail for Rusty’s shadow.",
    tier: "rare",
    animalSlot: "harness",
    armor: 5,
    properties: [
      { key: "constitution", value: 3, label: "+3 CON" },
      { key: "def", value: 4, label: "+4 DEF" },
      { key: "maxHp", value: 15, label: "+15 Max HP" },
      { key: "strength", value: 2, label: "+2 STR" },
      { key: "resist", value: 2, label: "+2 Resist" },
    ],
  },
  {
    id: "animal-lumen-charm",
    name: "Lumen's Silver Charm",
    blurb: "Rivendell roads gleam on Elisha’s companion.",
    tier: "rare",
    animalSlot: "charm",
    power: 2,
    properties: [
      { key: "charisma", value: 4, label: "+4 CHA" },
      { key: "wisdom", value: 3, label: "+3 WIS" },
      { key: "maxHp", value: 10, label: "+10 Max HP" },
      { key: "crit", value: 3, label: "+3 Crit%" },
      { key: "resist", value: 2, label: "+2 Resist" },
    ],
  },
  {
    id: "animal-pack-fang",
    name: "Pack Fang Spikes",
    blurb: "Three hounds, one bite.",
    tier: "legendary",
    animalSlot: "muzzle",
    power: 16,
    properties: [
      { key: "atk", value: 8, label: "+8 ATK" },
      { key: "strength", value: 4, label: "+4 STR" },
      { key: "crit", value: 6, label: "+6 Crit%" },
      { key: "dexterity", value: 3, label: "+3 DEX" },
      { key: "maxHp", value: 12, label: "+12 Max HP" },
    ],
  },
];

for (const s of SIGNATURES) {
  addItem({
    ...s,
    rarity: s.tier,
    slot: humanSlot(s.animalSlot),
    tags: ["animal", "animal-gear", s.animalSlot, s.tier, "signature"],
  });
}

const pack = {
  version: 1,
  generatedAt: new Date().toISOString(),
  slots: SLOTS,
  items,
  stats: {
    total: items.length,
    bySlot: Object.fromEntries(SLOTS.map((s) => [s, items.filter((i) => i.animalSlot === s).length])),
    byTier: {
      common: items.filter((i) => i.tier === "common").length,
      magic: items.filter((i) => i.tier === "magic").length,
      rare: items.filter((i) => i.tier === "rare").length,
      legendary: items.filter((i) => i.tier === "legendary").length,
    },
  },
};

writeFileSync(OUT, JSON.stringify(pack, null, 2) + "\n");
console.log(`Wrote ${OUT}`);
console.log(JSON.stringify(pack.stats, null, 2));
