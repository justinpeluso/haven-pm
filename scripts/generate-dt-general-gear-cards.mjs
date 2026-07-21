#!/usr/bin/env node
/**
 * Add 500 general (non-weapon) DT gear items + lean spirit cards for ALL
 * non-weapon gear (existing + new). Cards stay small: 2–3 moves, light effects.
 *
 * Usage: node scripts/generate-dt-general-gear-cards.mjs
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const GEAR_PATH = join(ROOT, "data/dungeon-tester/gear.json");
const CARDS_PATH = join(ROOT, "data/dungeon-tester/poke-cards.json");

const TYPES = [
  "grit",
  "chrome",
  "spirit",
  "iron",
  "ash",
  "silk",
  "dust",
  "frost",
  "venom",
  "wild",
  "chain",
  "helix",
];

const PREFIXES = [
  "Fiber",
  "Stim",
  "Barcode",
  "Coolant",
  "Helix",
  "Spirit",
  "Seal",
  "Pit",
  "Spire",
  "Grid",
  "Ash",
  "Pale",
  "Chrome",
  "Widow",
  "Glade",
  "Trace",
  "Mire",
  "Vale",
  "Cade",
  "Bone",
  "Moon",
  "Dust",
  "Iron",
  "Wild",
  "Free",
  "Brother",
  "Oath",
  "Ghost",
  "Static",
  "Lantern",
  "River",
  "Gate",
  "Yard",
  "Choir",
  "Drake",
  "Warg",
  "Quill",
  "Sku",
  "Horizon",
  "Neon",
  "Ridge",
  "Vault",
  "Forge",
  "March",
  "Fen",
  "Oak",
  "Coil",
  "Ring",
  "Smile",
  "Jar",
  "Drum",
  "Rail",
  "Crop",
  "Shade",
  "Echo",
  "Bond",
  "Harvest",
  "Switch",
  "Needle",
];

const MIDDLES = [
  "Ridge",
  "Road",
  "Vault",
  "Forge",
  "March",
  "Fen",
  "Oak",
  "Coil",
  "Ring",
  "Smile",
  "Jar",
  "Drum",
  "Rail",
  "Crop",
  "Shade",
  "Echo",
  "Bond",
  "Harvest",
  "Switch",
  "Needle",
  "Pit",
  "Spire",
  "Glade",
  "Mire",
  "Trace",
  "Chrome",
  "Ash",
  "Pale",
  "Widow",
  "Helix",
];

/** slot → noun stems (non-weapon only) */
const SLOT_NOUNS = {
  consumable: [
    "Jerky",
    "Poultice",
    "Cider",
    "Stim",
    "Tonic",
    "Ration",
    "Salve",
    "Flask",
    "Patch",
    "Ampoule",
    "Brew",
    "Biscuit",
    "Tea",
    "Serum",
    "Balm",
    "Capsule",
    "Vial",
    "Chew",
    "Draft",
    "Syrup",
  ],
  misc: [
    "Shard",
    "Token",
    "Scrap",
    "Keycard",
    "Coil",
    "Tag",
    "Chip",
    "Relic",
    "Note",
    "Badge",
    "Wire",
    "Seal",
    "Stub",
    "Lens",
    "Fuse",
    "Map",
    "Receipt",
    "Charm",
    "Bone",
    "Trinket",
  ],
  head: [
    "Helm",
    "Hood",
    "Visor",
    "Cap",
    "Mask",
    "Circlet",
    "Goggles",
    "Crown",
    "Bandana",
    "Cowl",
  ],
  chest: [
    "Vest",
    "Coat",
    "Cloak",
    "Mail",
    "Jacket",
    "Harness",
    "Poncho",
    "Cuirass",
    "Duster",
    "Plate",
  ],
  hands: [
    "Gloves",
    "Gauntlets",
    "Wraps",
    "Bracers",
    "Mitts",
    "Grips",
    "Cuffs",
    "Knuckles",
  ],
  legs: [
    "Boots",
    "Greaves",
    "Striders",
    "Chaps",
    "Treads",
    "Shinplates",
    "Gaiters",
    "Soles",
  ],
  offhand: [
    "Buckler",
    "Shield",
    "Parry-plate",
    "Lantern",
    "Focus",
    "Tome",
    "Ward",
    "Mirror",
  ],
  accessory: [
    "Spur",
    "Charm",
    "Ring",
    "Amulet",
    "Band",
    "Pin",
    "Locket",
    "Earpiece",
    "Implant",
    "Sigil",
  ],
};

const SLOT_WEIGHTS = [
  ["consumable", 120],
  ["misc", 90],
  ["chest", 55],
  ["head", 45],
  ["hands", 40],
  ["legs", 45],
  ["offhand", 40],
  ["accessory", 65],
];

const BLURBS = [
  "Smells like rain on chrome and old pine resin.",
  "Bought cheap, kept expensive — Wilderland math.",
  "Still warm from someone else's bad night.",
  "Barcode half-burned; loyalty not included.",
  "Fits a pocket or a promise, not both.",
  "Helix print under the dirt — corporate aftertaste.",
  "Road dust sealed in with spit and stubbornness.",
  "Too pretty for the pits. Used there anyway.",
  "Sister swore it was lucky. Brother swore louder.",
  "Adult pulp: blood, neon, and a short fuse.",
  "Clacks like a receipt printer when you walk.",
  "Coolant-sweet and ash-bitter at once.",
  "Filed from a jailer's kit and rewritten.",
  "Widow-silk residue still sticks to gloves.",
  "Stim-dust ghosts in the stitching.",
  "Counts scars the way clerks count SKUs.",
  "Lost Brothers salvage — no returns.",
  "Hums when dogs are near. Dogs ignore it.",
  "Frontier grit wired into cyber scrap.",
  "Keeps time with your pulse, not the clock.",
];

const MOVE_BASIC = {
  consumable: ["Field Use", "Crack Seal", "Quick Dose", "Trail Bite"],
  misc: ["Flash Signal", "Show Proof", "Rattle Tag", "Distract"],
  head: ["Hard Look", "Visor Glare", "Hood Shadow", "Crown Nod"],
  chest: ["Brace Up", "Coat Catch", "Plate Settle", "Harness Lock"],
  hands: ["Grip Tight", "Wrap Bind", "Gauntlet Push", "Cuff Check"],
  legs: ["Plant Feet", "Stride On", "Boot Dust", "Greave Guard"],
  offhand: ["Raise Guard", "Lantern Cut", "Buckler Angle", "Ward Lift"],
  accessory: ["Charm Pulse", "Sigil Tick", "Spur Click", "Band Hum"],
};

const MOVE_SPECIAL = {
  consumable: ["Second Wind", "Patch Job", "Stim Kick", "Clean Flush"],
  misc: ["Dead Drop", "Trace Skip", "Barcode Bluff", "Scrap Noise"],
  head: ["Duck Blow", "Fog Visor", "Iron Brow", "Spirit Squint"],
  chest: ["Shrug Hit", "Ash Soak", "Silk Deflect", "Chrome Brace"],
  hands: ["Catch Edge", "Venom Pinch", "Iron Clamp", "Helix Twist"],
  legs: ["Slip Trace", "Dust Kick", "Frost Step", "Chain Break"],
  offhand: ["Bash Aside", "Mirror Feint", "Shield Slam", "Focus Burn"],
  accessory: ["Lucky Jolt", "Oath Ping", "Ghost Buzz", "Free Spark"],
};

const MOVE_PASSIVE = {
  consumable: ["Linger Warmth", "Steady Hands"],
  misc: ["Quiet Weight", "Paper Trail"],
  head: ["Keep Watch", "Cold Focus"],
  chest: ["Hold Ground", "Soft Armor"],
  hands: ["Sure Grip", "Ready Fist"],
  legs: ["Long Road", "Quiet Step"],
  offhand: ["Cover Ally", "Hold Line"],
  accessory: ["Soft Luck", "Pulse Calm"],
};

const TIER_PLAN = [
  ...Array(200).fill("common"),
  ...Array(140).fill("uncommon"),
  ...Array(80).fill("rare"),
  ...Array(50).fill("epic"),
  ...Array(30).fill("legendary"),
];

function slug(s) {
  return s
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

function pick(arr, i) {
  return arr[i % arr.length];
}

function hash(n) {
  let x = (n * 1103515245 + 12345) >>> 0;
  return x;
}

function expandSlots() {
  const out = [];
  for (const [slot, w] of SLOT_WEIGHTS) {
    for (let i = 0; i < w; i++) out.push(slot);
  }
  // pad/trim to 500
  while (out.length < 500) out.push("misc");
  return out.slice(0, 500);
}

function propsFor(slot, tier, i) {
  const h = hash(i + 17);
  const tierMult =
    tier === "common"
      ? 1
      : tier === "uncommon"
        ? 1.4
        : tier === "rare"
          ? 1.9
          : tier === "epic"
            ? 2.5
            : 3.2;

  const mk = (key, value, label) => ({ key, value, label });

  if (slot === "consumable") {
    // heal / mana / stamina — no property spam
    return [];
  }
  if (slot === "misc") {
    // quest junk: light utility only
    const opts = [
      [mk("charisma", Math.max(1, Math.round(1 * tierMult)), `+${Math.max(1, Math.round(1 * tierMult))} CHA`)],
      [mk("wisdom", Math.max(1, Math.round(1 * tierMult)), `+${Math.max(1, Math.round(1 * tierMult))} WIS`)],
      [mk("maxMana", Math.max(2, Math.round(3 * tierMult)), `+${Math.max(2, Math.round(3 * tierMult))} Mana`)],
    ];
    return opts[h % opts.length];
  }

  // armor / accessory — 2–3 modifiers max
  const def = Math.max(1, Math.round((1 + (h % 3)) * tierMult * 0.7));
  const hp = Math.max(4, Math.round((6 + (h % 8)) * tierMult));
  const arm = Math.max(1, Math.round((1 + (h % 2)) * tierMult * 0.6));
  const statKeys = [
    "constitution",
    "dexterity",
    "strength",
    "intelligence",
    "wisdom",
    "charisma",
  ];
  const sk = statKeys[h % statKeys.length];
  const sv = Math.max(1, Math.round((1 + (h % 2)) * Math.min(tierMult, 2.2)));
  const abbrev = {
    constitution: "CON",
    dexterity: "DEX",
    strength: "STR",
    intelligence: "INT",
    wisdom: "WIS",
    charisma: "CHA",
  };

  if (slot === "accessory") {
    return [
      mk(sk, sv, `+${sv} ${abbrev[sk]}`),
      mk("resist", arm, `+${arm} ARM`),
      mk("maxHp", Math.round(hp * 0.6), `+${Math.round(hp * 0.6)} HP`),
    ].slice(0, 2 + (h % 2)); // 2 or 3
  }

  if (slot === "offhand") {
    return [
      mk("def", def + 1, `+${def + 1} DEF`),
      mk("resist", arm + 1, `+${arm + 1} ARM`),
      mk("maxHp", hp, `+${hp} HP`),
    ].slice(0, 2 + (h % 2));
  }

  // armor slots
  return [
    mk("def", def, `+${def} DEF`),
    mk("maxHp", hp, `+${hp} HP`),
    mk(sk, sv, `+${sv} ${abbrev[sk]}`),
  ].slice(0, 2 + (h % 2));
}

function consumableFields(tier, i) {
  const h = hash(i + 99);
  const base =
    tier === "common"
      ? 14
      : tier === "uncommon"
        ? 22
        : tier === "rare"
          ? 32
          : tier === "epic"
            ? 44
            : 58;
  const kind = h % 4;
  if (kind === 0) return { heal: base + (h % 8) };
  if (kind === 1) return { manaRestore: Math.round(base * 0.7) + (h % 6) };
  if (kind === 2) return { staminaRestore: Math.round(base * 0.55) + (h % 5) };
  return {
    heal: Math.round(base * 0.55),
    manaRestore: Math.round(base * 0.35),
  };
}

function armorValue(slot, tier, i) {
  if (["consumable", "misc", "accessory"].includes(slot)) return undefined;
  const h = hash(i + 3);
  const base =
    tier === "common"
      ? 1
      : tier === "uncommon"
        ? 2
        : tier === "rare"
          ? 3
          : tier === "epic"
            ? 4
            : 5;
  return base + (h % 2) + (slot === "chest" || slot === "offhand" ? 1 : 0);
}

function tagsFor(slot, i) {
  const flavor = [
    "frontier",
    "cyber",
    "lost-brothers",
    "neon",
    "wilderland",
    "salvage",
    "pulp",
  ];
  const slotTag =
    slot === "consumable"
      ? pick(["food", "medicine", "stim", "drink"], i)
      : slot === "misc"
        ? pick(["quest", "scrap", "cyberware", "trinket"], i)
        : pick(["light", "medium", "chrome", "hide"], i);
  return [slotTag, pick(flavor, i), pick(flavor, i + 3)].slice(0, 2);
}

function typesFor(slot, i) {
  const slotBias = {
    consumable: ["wild", "spirit", "ash"],
    misc: ["chrome", "helix", "dust"],
    head: ["iron", "frost", "spirit"],
    chest: ["iron", "silk", "ash"],
    hands: ["grit", "chrome", "venom"],
    legs: ["dust", "wild", "frost"],
    offhand: ["iron", "chain", "spirit"],
    accessory: ["helix", "silk", "chrome"],
  };
  const a = pick(slotBias[slot] || TYPES, i);
  const b = pick(TYPES, i + 7);
  return a === b ? [a, pick(TYPES, i + 11)] : [a, b];
}

/** Lean card: 2–3 moves, one primary effect each (buff/damage), minimal extras. */
function makeCard(item, i) {
  const types = typesFor(item.slot, i);
  const basic = pick(MOVE_BASIC[item.slot] || MOVE_BASIC.misc, i);
  const special = pick(MOVE_SPECIAL[item.slot] || MOVE_SPECIAL.misc, i + 1);
  const passive = pick(MOVE_PASSIVE[item.slot] || MOVE_PASSIVE.misc, i + 2);
  const h = hash(i + 41);

  const moves = [
    {
      id: `${item.id}-basic`,
      name: basic,
      effects: item.slot === "consumable" ? ["buff"] : ["damage"],
      powerMult: item.slot === "consumable" ? 1 : 0.95,
      ...(item.slot === "consumable"
        ? { buffRounds: 1, powerBonus: 1, blurb: "Field kit work." }
        : { blurb: "Foundation move." }),
    },
    {
      id: `${item.id}-special`,
      name: special,
      effects:
        item.slot === "consumable"
          ? ["buff"]
          : h % 3 === 0
            ? ["buff"]
            : h % 3 === 1
              ? ["damage", "stun"]
              : ["damage"],
      powerMult: item.slot === "consumable" ? 1 : 1.15,
      ...(item.slot === "consumable"
        ? { buffRounds: 2, powerBonus: 2, blurb: "Use and feel it." }
        : h % 3 === 0
          ? { buffRounds: 2, powerBonus: 2, blurb: "Passive edge." }
          : h % 3 === 1
            ? { stunRounds: 1, blurb: "Buys a breath." }
            : { blurb: "Clean hit." }),
    },
  ];

  // third move only sometimes — keep most cards at 2
  if (h % 5 !== 0) {
    moves.push({
      id: `${item.id}-passive`,
      name: passive,
      effects: ["buff"],
      powerMult: 1,
      buffRounds: 2,
      powerBonus: 1,
      blurb: "Stay standing.",
    });
  }

  return {
    id: item.id,
    name: item.name,
    blurb: item.blurb,
    artId: item.id,
    kind: "gear",
    types,
    moves,
  };
}

function makeItem(slot, tier, index) {
  const n = index + 1; // 1..500
  const prefix = pick(PREFIXES, index * 3 + n);
  const mid = pick(MIDDLES, index * 5 + 2);
  const noun = pick(SLOT_NOUNS[slot], index * 7 + 1);
  // avoid boring triple-same
  const nameParts =
    mid === prefix ? [prefix, noun] : [prefix, mid, noun];
  let name = nameParts.join(" ");
  const id = `dt-g-${slug(name)}-${String(n).padStart(3, "0")}`;
  // ensure uniqueness via numeric suffix in id; tweak name if needed
  const blurb = pick(BLURBS, index + n);
  const tags = tagsFor(slot, index);
  const properties = propsFor(slot, tier, index);
  const item = {
    id,
    name,
    blurb,
    tier,
    slot,
    tags,
    rarity: tier,
  };
  if (slot === "consumable") {
    Object.assign(item, consumableFields(tier, index));
  } else {
    const armor = armorValue(slot, tier, index);
    if (armor != null) item.armor = armor;
    if (properties.length) item.properties = properties;
  }
  return item;
}

function rebuildPools(items, prevMagic = []) {
  const pools = {
    trash: [],
    common: [],
    uncommon: [],
    magic: [],
    rare: [],
    epic: [],
    legendary: [],
  };
  const byId = new Map(items.map((i) => [i.id, i]));
  for (const it of items) {
    const t = it.rarity || it.tier;
    if (t === "common") {
      pools.common.push(it.id);
      if (
        (it.slot === "consumable" ||
          it.slot === "misc" ||
          it.tags?.includes("scrap")) &&
        pools.trash.length < 48
      ) {
        pools.trash.push(it.id);
      }
    } else if (t === "uncommon") pools.uncommon.push(it.id);
    else if (t === "rare") pools.rare.push(it.id);
    else if (t === "epic") pools.epic.push(it.id);
    else if (t === "legendary") pools.legendary.push(it.id);
  }
  // Legacy "magic" pool: keep prior entries that still exist, then top up
  // with a lean uncommon slice (not every uncommon).
  const magic = [];
  for (const id of prevMagic) {
    if (byId.has(id) && !magic.includes(id)) magic.push(id);
  }
  for (const id of pools.uncommon) {
    if (magic.length >= 80) break;
    if (!magic.includes(id)) magic.push(id);
  }
  pools.magic = magic;
  return pools;
}

function main() {
  const gear = JSON.parse(readFileSync(GEAR_PATH, "utf8"));
  const cards = JSON.parse(readFileSync(CARDS_PATH, "utf8"));

  const beforeItems = gear.items.length;
  const beforeWeapons = gear.items.filter((i) => i.slot === "weapon").length;
  const beforeGeneral = beforeItems - beforeWeapons;
  const beforeCards = Object.keys(cards.cards).length;

  const existingIds = new Set(gear.items.map((i) => i.id));
  const slots = expandSlots();
  const newItems = [];
  const usedNames = new Set(gear.items.map((i) => i.name.toLowerCase()));

  for (let i = 0; i < 500; i++) {
    const slot = slots[i];
    const tier = TIER_PLAN[i];
    let item = makeItem(slot, tier, i);
    let guard = 0;
    while (
      (existingIds.has(item.id) || usedNames.has(item.name.toLowerCase())) &&
      guard < 50
    ) {
      guard++;
      item = makeItem(slot, tier, i + guard * 97);
      item.id = `dt-g-${slug(item.name)}-${String(i + 1).padStart(3, "0")}`;
    }
    existingIds.add(item.id);
    usedNames.add(item.name.toLowerCase());
    newItems.push(item);
  }

  if (newItems.length !== 500) {
    throw new Error(`Expected 500 new items, got ${newItems.length}`);
  }

  gear.items = [...gear.items, ...newItems];
  gear.version = (gear.version || 1) + 1;
  gear.pools = rebuildPools(gear.items, gear.pools?.magic ?? []);

  // Cards for every non-weapon gear item (existing + new); lean regenerations
  const nonWeapons = gear.items.filter((i) => i.slot !== "weapon");
  let addedCards = 0;
  let updatedCards = 0;
  for (let i = 0; i < nonWeapons.length; i++) {
    const it = nonWeapons[i];
    const card = makeCard(it, i);
    if (cards.cards[it.id]) updatedCards++;
    else addedCards++;
    cards.cards[it.id] = card;
  }
  cards.version = (cards.version || 1) + 1;

  writeFileSync(GEAR_PATH, JSON.stringify(gear, null, 2) + "\n");
  writeFileSync(CARDS_PATH, JSON.stringify(cards, null, 2) + "\n");

  const afterWeapons = gear.items.filter((i) => i.slot === "weapon").length;
  const afterGeneral = gear.items.length - afterWeapons;
  const afterCards = Object.keys(cards.cards).length;
  const missing = gear.items.filter((i) => !cards.cards[i.id]).map((i) => i.id);

  const moveLens = nonWeapons.map((i) => cards.cards[i.id].moves.length);
  const maxMoves = Math.max(...moveLens);
  const propLens = newItems
    .filter((i) => i.slot !== "consumable")
    .map((i) => (i.properties || []).length);
  const maxProps = propLens.length ? Math.max(...propLens) : 0;

  console.log(
    JSON.stringify(
      {
        beforeItems,
        beforeWeapons,
        beforeGeneral,
        beforeCards,
        addedItems: newItems.length,
        afterItems: gear.items.length,
        afterWeapons,
        afterGeneral,
        generalDelta: afterGeneral - beforeGeneral,
        afterCards,
        addedCards,
        updatedCards,
        missingCardCount: missing.length,
        maxMovesOnNewCards: maxMoves,
        maxPropsOnNewItems: maxProps,
        bySlotNew: Object.fromEntries(
          [...new Set(newItems.map((i) => i.slot))].map((s) => [
            s,
            newItems.filter((i) => i.slot === s).length,
          ])
        ),
      },
      null,
      2
    )
  );

  if (afterGeneral - beforeGeneral !== 500) {
    throw new Error("General item delta is not +500");
  }
  if (missing.length) {
    throw new Error(`Missing cards: ${missing.slice(0, 10).join(", ")}`);
  }
  if (maxMoves > 3) throw new Error("Cards exceed 3 moves");
  if (maxProps > 3) throw new Error("New items exceed 3 properties");
}

main();
