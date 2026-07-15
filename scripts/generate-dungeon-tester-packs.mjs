#!/usr/bin/env node
/**
 * Generate DungeonTester encounters, creatures, gear, and comic SVG stubs.
 * Does not touch Neverworld / party-chronicle assets.
 */
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data/dungeon-tester");
const publicDir = path.join(root, "public/dungeon-tester");

function writeJson(rel, data) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, JSON.stringify(data, null, 2) + "\n");
  console.log("wrote", rel);
}

function writeSvg(rel, svg) {
  const p = path.join(root, rel);
  fs.mkdirSync(path.dirname(p), { recursive: true });
  fs.writeFileSync(p, svg);
  console.log("wrote", rel);
}

// --- Creatures (inspired ME flavor; no trademarked proper nouns) ---
const CREATURES = [
  // Early trail / coffle road
  { id: "whip-hand-thug", name: "Whip-Hand Thug", blurb: "A dusty overseer with a knotted leather scourge.", levelMin: 1, levelMax: 8, hp: 20, power: 4, armor: 0, xp: 12, gold: 5, tags: ["humanoid", "frontier"], artId: "enemy-whip-hand", weight: 3, lootPool: "trash" },
  { id: "coffle-guard", name: "Coffle Guard", blurb: "Iron manacle keys jingle at his belt.", levelMin: 1, levelMax: 10, hp: 24, power: 5, armor: 1, xp: 14, gold: 6, tags: ["humanoid", "frontier"], artId: "enemy-coffle-guard", weight: 3, lootPool: "trash" },
  { id: "thorn-clan-skirmisher", name: "Thorn-Clan Skirmisher", blurb: "A hill-orc in bark-lacquered hide, smiling with broken tusks.", levelMin: 1, levelMax: 12, hp: 22, power: 5, armor: 1, xp: 15, gold: 5, tags: ["orc", "humanoid"], artId: "enemy-orc-skirmisher", weight: 3, lootPool: "trash" },
  { id: "dust-trail-warg", name: "Dust-Trail Warg", blurb: "A lean wolf-beast with chalk-dust in its fur.", levelMin: 2, levelMax: 14, hp: 28, power: 6, armor: 0, xp: 18, gold: 4, tags: ["warg", "beast"], artId: "enemy-dust-warg", weight: 3, lootPool: "common" },
  { id: "trail-webling", name: "Trail Webling", blurb: "A pale spider the size of a hound, silk trailing from the pines.", levelMin: 2, levelMax: 12, hp: 18, power: 5, armor: 0, xp: 16, gold: 3, tags: ["spider", "beast"], artId: "enemy-trail-webling", weight: 3, lootPool: "trash" },
  { id: "bond-chain-enforcer", name: "Bond-Chain Enforcer", blurb: "Carries manacles like a trophy belt.", levelMin: 4, levelMax: 16, hp: 32, power: 7, armor: 2, xp: 22, gold: 8, tags: ["humanoid", "frontier"], artId: "enemy-coffle-guard", weight: 2, lootPool: "common" },

  // Mid road
  { id: "ash-gut-raider", name: "Ash-Gut Raider", blurb: "An orc whose war-paint looks like burnt prairie.", levelMin: 8, levelMax: 22, hp: 40, power: 9, armor: 2, xp: 28, gold: 10, tags: ["orc", "humanoid"], artId: "enemy-ash-gut", weight: 3, lootPool: "common" },
  { id: "night-howler", name: "Night-Howler", blurb: "Yellow eyes in the scrub; the pack answers from the ridge.", levelMin: 8, levelMax: 24, hp: 38, power: 10, armor: 1, xp: 30, gold: 6, tags: ["warg", "beast"], artId: "enemy-night-howler", weight: 3, lootPool: "common" },
  { id: "silk-widow", name: "Silk Widow", blurb: "Eight legs lacquered like wet tar; webs choke the hollow.", levelMin: 10, levelMax: 26, hp: 36, power: 11, armor: 1, xp: 32, gold: 8, tags: ["spider", "beast"], artId: "enemy-silk-widow", weight: 2, lootPool: "common" },
  { id: "bridge-brute", name: "Bridge Brute", blurb: "A squat troll under the stone arch, hungry for tolls.", levelMin: 12, levelMax: 28, hp: 55, power: 12, armor: 3, xp: 40, gold: 12, tags: ["troll", "giant"], artId: "enemy-bridge-brute", weight: 2, lootPool: "magic" },
  { id: "orc-rider", name: "Thorn-Clan Rider", blurb: "Orc and warg as one mean silhouette against the dusk.", levelMin: 14, levelMax: 30, hp: 48, power: 13, armor: 2, xp: 42, gold: 14, tags: ["orc", "warg", "mounted"], artId: "enemy-orc-rider", weight: 2, lootPool: "common" },
  { id: "red-maw-hunter", name: "Red-Maw Hunter", blurb: "A warg alpha with a stained snout and patient gait.", levelMin: 16, levelMax: 32, hp: 50, power: 14, armor: 2, xp: 45, gold: 10, tags: ["warg", "beast"], artId: "enemy-night-howler", weight: 2, lootPool: "magic" },

  // Deep wilderland
  { id: "cave-knuckle", name: "Cave Knuckle", blurb: "A cave-troll knuckling forward on stone-scarred fists.", levelMin: 22, levelMax: 40, hp: 80, power: 16, armor: 4, xp: 60, gold: 18, tags: ["troll", "giant"], artId: "enemy-cave-troll", weight: 2, lootPool: "magic" },
  { id: "nest-mother", name: "Nest Mother", blurb: "The hollow's queen: silk thick as cable, eyes like wet pearls.", levelMin: 24, levelMax: 42, hp: 70, power: 17, armor: 2, xp: 65, gold: 20, tags: ["spider", "beast", "elite"], artId: "enemy-nest-mother", weight: 1, lootPool: "magic" },
  { id: "iron-cuff-overseer", name: "Iron-Cuff Overseer", blurb: "Frontier steel and orcish cruelty — the whip still speaks.", levelMin: 20, levelMax: 38, hp: 62, power: 15, armor: 3, xp: 55, gold: 22, tags: ["humanoid", "orc", "frontier"], artId: "enemy-whip-hand", weight: 2, lootPool: "magic" },
  { id: "ash-cloak-outrider", name: "Ash-Cloak Outrider", blurb: "A veiled rider on a pale steed — rumors of a pale host.", levelMin: 28, levelMax: 48, hp: 75, power: 18, armor: 3, xp: 75, gold: 24, tags: ["undead", "rider", "elite"], artId: "enemy-ash-cloak", weight: 1, lootPool: "rare" },
  { id: "mountain-hammer", name: "Mountain Hammer", blurb: "A high-pass troll with a tree for a club.", levelMin: 30, levelMax: 50, hp: 95, power: 19, armor: 5, xp: 80, gold: 28, tags: ["troll", "giant"], artId: "enemy-cave-troll", weight: 1, lootPool: "rare" },
  { id: "bone-drum-captain", name: "Bone-Drum Captain", blurb: "War-drums of hide and bone call the Thorn-Clan to charge.", levelMin: 26, levelMax: 45, hp: 72, power: 17, armor: 4, xp: 70, gold: 26, tags: ["orc", "humanoid", "elite"], artId: "enemy-ash-gut", weight: 1, lootPool: "rare" },

  // Late / liberation war
  { id: "pale-host-scout", name: "Pale-Host Scout", blurb: "Cloaked, cold, and certain — a forerunner of the ash riders.", levelMin: 35, levelMax: 55, hp: 88, power: 21, armor: 4, xp: 90, gold: 30, tags: ["undead", "rider"], artId: "enemy-ash-cloak", weight: 2, lootPool: "rare" },
  { id: "warcamp-berserker", name: "Warcamp Berserker", blurb: "An orc who abandoned shields for two serrated cleavers.", levelMin: 32, levelMax: 52, hp: 85, power: 20, armor: 2, xp: 85, gold: 28, tags: ["orc", "humanoid"], artId: "enemy-orc-skirmisher", weight: 2, lootPool: "magic" },
  { id: "gloomwood-spinner", name: "Gloomwood Spinner", blurb: "Webs that dim torchlight; venom that slows the draw.", levelMin: 34, levelMax: 54, hp: 78, power: 20, armor: 2, xp: 88, gold: 26, tags: ["spider", "beast"], artId: "enemy-silk-widow", weight: 2, lootPool: "rare" },
  { id: "chain-lord-lieutenant", name: "Chain-Lord Lieutenant", blurb: "Keeps the bondage ledgers and the gunbelt alike.", levelMin: 38, levelMax: 58, hp: 100, power: 22, armor: 5, xp: 100, gold: 40, tags: ["humanoid", "frontier", "elite"], artId: "enemy-coffle-guard", weight: 1, lootPool: "rare" },
  { id: "shadow-pack-alpha", name: "Shadow-Pack Alpha", blurb: "Wargs that move like smoke through the liberation lines.", levelMin: 40, levelMax: 60, hp: 92, power: 23, armor: 3, xp: 105, gold: 32, tags: ["warg", "beast", "elite"], artId: "enemy-night-howler", weight: 1, lootPool: "rare" },
  { id: "citadel-gate-brute", name: "Citadel Gate Brute", blurb: "A troll chained as a living door-ram.", levelMin: 45, levelMax: 65, hp: 120, power: 25, armor: 6, xp: 120, gold: 45, tags: ["troll", "giant", "elite"], artId: "enemy-bridge-brute", weight: 1, lootPool: "legendary" },
];

const BOSSES = [
  { id: "boss-coffle-master", name: "Coffle Master Vorn", blurb: "The first whip that named you property.", levelMin: 5, levelMax: 12, hp: 90, power: 12, armor: 3, xp: 120, gold: 50, tags: ["boss", "frontier", "humanoid"], artId: "enemy-whip-hand", weight: 1, lootPool: "magic", uniqueSkill: { id: "lash-line", name: "Lash Line", blurb: "A crack that freezes feet.", power: 8 }, uniqueDrops: ["dt-liberators-spur"] },
  { id: "boss-silk-queen", name: "Hollow Silk Queen", blurb: "Mother of the trail webs.", levelMin: 14, levelMax: 24, hp: 140, power: 16, armor: 3, xp: 180, gold: 70, tags: ["boss", "spider"], artId: "enemy-nest-mother", weight: 1, lootPool: "rare", uniqueSkill: { id: "cocoon-toss", name: "Cocoon Toss", blurb: "Silk that binds a limb.", power: 10 }, uniqueDrops: ["dt-widow-silk-cloak"] },
  { id: "boss-toll-troll", name: "Arch Toll-Troll", blurb: "He remembers every unpaid copper.", levelMin: 20, levelMax: 30, hp: 180, power: 18, armor: 5, xp: 220, gold: 90, tags: ["boss", "troll"], artId: "enemy-bridge-brute", weight: 1, lootPool: "rare", uniqueSkill: { id: "boulder-slam", name: "Boulder Slam", blurb: "The bridge buckles.", power: 14 }, uniqueDrops: ["dt-bridge-stone-mail"] },
  { id: "boss-thorn-warlord", name: "Thorn-Clan Warlord", blurb: "Drums of bone, banners of ash.", levelMin: 28, levelMax: 40, hp: 220, power: 22, armor: 5, xp: 280, gold: 110, tags: ["boss", "orc"], artId: "enemy-ash-gut", weight: 1, lootPool: "rare", uniqueSkill: { id: "war-drum", name: "War Drum", blurb: "Pack fury doubles.", power: 12 }, uniqueDrops: ["dt-bone-drum-cleaver"] },
  { id: "boss-ash-herald", name: "Ash-Cloak Herald", blurb: "Pale host banner-bearer; silence rides with him.", levelMin: 38, levelMax: 50, hp: 260, power: 26, armor: 6, xp: 340, gold: 140, tags: ["boss", "undead", "rider"], artId: "enemy-ash-cloak", weight: 1, lootPool: "legendary", uniqueSkill: { id: "dread-horn", name: "Dread Horn", blurb: "Courage falters.", power: 16 }, uniqueDrops: ["dt-ash-veil-revolver"] },
  { id: "boss-chain-lord", name: "The Chain-Lord", blurb: "Frontier baron of bondage — the debt that ends here.", levelMin: 50, levelMax: 70, hp: 340, power: 30, armor: 7, xp: 450, gold: 200, tags: ["boss", "frontier", "humanoid"], artId: "enemy-coffle-guard", weight: 1, lootPool: "legendary", uniqueSkill: { id: "iron-sentence", name: "Iron Sentence", blurb: "Chains slam shut around the heart.", power: 20 }, uniqueDrops: ["dt-broken-shackle-crown"] },
];

// Encounter decks by level band (9 acts for ~30h)
function creatureToEntry(c, lootIds) {
  return {
    id: c.id,
    name: c.name,
    artId: c.artId,
    enemyArtId: c.artId,
    hp: c.hp,
    power: c.power,
    lootIds,
    xp: c.xp,
    gold: c.gold,
    tags: c.tags.includes("boss") ? c.tags : [...c.tags.filter((t) => t !== "elite"), c.tags.includes("elite") ? "elite" : "trash"].filter(Boolean),
    weight: c.weight,
  };
}

function lootForPool(pool) {
  const map = {
    trash: ["dt-trail-jerky", "dt-dust-poultice"],
    common: ["dt-frontier-revolver", "dt-hide-duster", "dt-trail-jerky"],
    magic: ["dt-moonsteel-saber", "dt-warg-fang-charm", "dt-dust-poultice"],
    rare: ["dt-ashwood-longbow", "dt-widow-silk-cloak", "dt-ironwood-buckler"],
    legendary: ["dt-liberators-spur", "dt-ash-veil-revolver"],
  };
  return map[pool] || map.common;
}

const DECK_BANDS = [
  { id: "deck-act-1", actId: "act-1", levelMin: 1, levelMax: 10, themes: ["frontier", "orc", "warg", "spider"] },
  { id: "deck-act-2", actId: "act-2", levelMin: 8, levelMax: 18, themes: ["orc", "warg", "spider", "frontier"] },
  { id: "deck-act-3", actId: "act-3", levelMin: 16, levelMax: 26, themes: ["spider", "troll", "warg", "orc"] },
  { id: "deck-act-4", actId: "act-4", levelMin: 24, levelMax: 34, themes: ["troll", "orc", "warg", "frontier"] },
  { id: "deck-act-5", actId: "act-5", levelMin: 30, levelMax: 42, themes: ["undead", "spider", "troll", "orc"] },
  { id: "deck-act-6", actId: "act-6", levelMin: 38, levelMax: 50, themes: ["undead", "orc", "warg", "frontier"] },
  { id: "deck-act-7", actId: "act-7", levelMin: 45, levelMax: 58, themes: ["frontier", "undead", "troll", "warg"] },
  { id: "deck-act-8", actId: "act-8", levelMin: 52, levelMax: 65, themes: ["troll", "orc", "undead", "spider"] },
  { id: "deck-act-9", actId: "act-9", levelMin: 58, levelMax: 75, themes: ["frontier", "undead", "troll", "orc"] },
];

function deckEntries(band) {
  const mid = (band.levelMin + band.levelMax) / 2;
  const pool = CREATURES.filter((c) => {
    const overlaps = c.levelMax >= band.levelMin && c.levelMin <= band.levelMax;
    const themeHit = band.themes.some((t) => c.tags.includes(t));
    return overlaps && themeHit;
  });
  // Scale a few toward band mid if needed
  let entries = pool.slice(0, 8).map((c) => {
    const scale = 0.85 + (mid / 80) * 0.4;
    const scaled = {
      ...c,
      hp: Math.round(c.hp * scale),
      power: Math.max(3, Math.round(c.power * scale)),
      xp: Math.round(c.xp * scale),
      gold: Math.round(c.gold * scale),
    };
    const tags = scaled.tags.includes("elite") ? ["elite", ...scaled.tags.filter((t) => t !== "elite")] : ["trash", ...scaled.tags];
    return {
      id: `${band.actId}-${c.id}`,
      name: c.name,
      artId: c.artId,
      enemyArtId: c.artId,
      hp: scaled.hp,
      power: scaled.power,
      lootIds: lootForPool(c.lootPool),
      xp: scaled.xp,
      gold: scaled.gold,
      tags,
      weight: c.weight,
    };
  });
  // Ensure at least 5
  while (entries.length < 5 && CREATURES[entries.length]) {
    const c = CREATURES[entries.length];
    entries.push(creatureToEntry({ ...c, id: `${band.actId}-${c.id}` }, lootForPool(c.lootPool)));
    entries[entries.length - 1].id = `${band.actId}-${c.id}`;
    entries[entries.length - 1].name = c.name;
  }
  const boss = BOSSES.find((b) => b.levelMin <= band.levelMax && b.levelMax >= band.levelMin) || BOSSES[Math.min(BOSSES.length - 1, Number(band.actId.split("-")[1]) - 1)];
  if (boss) {
    entries.push({
      id: `${band.actId}-${boss.id}`,
      name: boss.name,
      artId: boss.artId,
      enemyArtId: boss.artId,
      hp: boss.hp,
      power: boss.power,
      lootIds: boss.uniqueDrops,
      xp: boss.xp,
      gold: boss.gold,
      tags: ["boss", ...boss.tags.filter((t) => t !== "boss")],
      weight: 1,
    });
  }
  return entries;
}

const encounters = {
  version: 1,
  flavor: "DungeonTester wilderland — Middle-earth–inspired generics; frontier liberation arc.",
  decks: DECK_BANDS.map((b) => ({
    id: b.id,
    actId: b.actId,
    levelMin: b.levelMin,
    levelMax: b.levelMax,
    themes: b.themes,
    entries: deckEntries(b),
  })),
};

// --- Gear: frontier + fantasy mix (unique dt- ids — safe vs Neverworld) ---
function props(list) {
  return list.map(([key, value, label]) => ({ key, value, label }));
}

const GEAR = [
  // Common — frontier
  { id: "dt-trail-jerky", name: "Trail Jerky", blurb: "Salted prairie beef. Chewy as a bad promise.", tier: "common", slot: "consumable", heal: 12, tags: ["food", "frontier"] },
  { id: "dt-dust-poultice", name: "Dust Poultice", blurb: "Herb mash for whip welts and spider bites.", tier: "common", slot: "consumable", heal: 22, tags: ["potion", "frontier"] },
  { id: "dt-frontier-revolver", name: "Frontier Revolver", blurb: "Six chambers of dusty justice — fantasy powder and all.", tier: "common", slot: "weapon", power: 7, tags: ["ranged", "firearm", "frontier"] },
  { id: "dt-ranch-carbine", name: "Ranch Carbine", blurb: "Short-barreled trail gun for saddles and ambushes.", tier: "common", slot: "weapon", power: 6, tags: ["ranged", "firearm", "frontier"] },
  { id: "dt-stock-whip", name: "Stock Whip", blurb: "Once used on captives. Now aimed at the overseers.", tier: "common", slot: "weapon", power: 5, tags: ["melee", "whip", "frontier"] },
  { id: "dt-iron-hatchet", name: "Iron Hatchet", blurb: "Camp tool, throat tool — same edge.", tier: "common", slot: "weapon", power: 5, tags: ["melee", "axe", "frontier"] },
  { id: "dt-hide-duster", name: "Hide Duster", blurb: "Long coat that eats wind and glancing blades.", tier: "common", slot: "chest", armor: 2, tags: ["light", "frontier"] },
  { id: "dt-sun-hat", name: "Sun-Bleached Hat", blurb: "Wide brim; keeps the ash-glare out of your eyes.", tier: "common", slot: "head", armor: 1, tags: ["light", "frontier"] },
  { id: "dt-work-gloves", name: "Work Gloves", blurb: "Leather cracked by rope and rain.", tier: "common", slot: "hands", armor: 1, tags: ["light", "frontier"] },
  { id: "dt-spur-boots", name: "Spur Boots", blurb: "Heels that meant ownership. You'll rewrite that.", tier: "common", slot: "legs", armor: 1, tags: ["light", "frontier"] },
  { id: "dt-plank-shield", name: "Plank Shield", blurb: "Barn wood strapped to an arm.", tier: "common", slot: "offhand", armor: 2, tags: ["shield", "frontier"] },
  { id: "dt-copper-spur", name: "Copper Spur Charm", blurb: "A keepsake cut from a jailer's heel.", tier: "common", slot: "accessory", tags: ["trinket", "frontier"] },

  // Common — fantasy ME-flavored
  { id: "dt-orc-cleaver", name: "Orc Cleaver", blurb: "Serrated and unsubtle — Thorn-Clan work.", tier: "common", slot: "weapon", power: 6, tags: ["melee", "orc"] },
  { id: "dt-ashwood-spear", name: "Ashwood Spear", blurb: "Long reach for wargs and riders.", tier: "common", slot: "weapon", power: 6, tags: ["melee", "reach"] },
  { id: "dt-yew-shortbow", name: "Yew Shortbow", blurb: "Quiet as hope on the pine road.", tier: "common", slot: "weapon", power: 5, tags: ["ranged", "bow"] },
  { id: "dt-hide-jerkin", name: "Wilderland Jerkin", blurb: "Soft hide of the northern scrub.", tier: "common", slot: "chest", armor: 2, tags: ["light"] },
  { id: "dt-ironwood-buckler", name: "Ironwood Buckler", blurb: "Round shield with a wolf-brand burned in.", tier: "common", slot: "offhand", armor: 2, tags: ["shield"] },
  { id: "dt-chain-scarf", name: "Broken Chain Scarf", blurb: "Links filed open and worn as pride.", tier: "common", slot: "accessory", tags: ["trinket", "liberation"] },

  // Magic
  { id: "dt-moonsteel-saber", name: "Moonsteel Saber", blurb: "A curve of pale steel that sings in cold mist.", tier: "magic", slot: "weapon", power: 12, tags: ["melee", "elven-inspired"], properties: props([["atk", 4, "+4 ATK"], ["dexterity", 2, "+2 DEX"], ["crit", 3, "+3 Crit%"], ["maxHp", 8, "+8 HP"], ["resist", 1, "+1 Resist"]]) },
  { id: "dt-ashwood-longbow", name: "Ashwood Longbow", blurb: "Drawn like a prayer across the ridge wind.", tier: "magic", slot: "weapon", power: 11, tags: ["ranged", "bow"], properties: props([["atk", 3, "+3 ATK"], ["dexterity", 3, "+3 DEX"], ["crit", 4, "+4 Crit%"], ["wisdom", 1, "+1 WIS"], ["maxMana", 5, "+5 Mana"]]) },
  { id: "dt-ember-staff", name: "Ember Ridge Staff", blurb: "Banked coal in the heartwood.", tier: "magic", slot: "weapon", power: 11, tags: ["staff", "fire"], properties: props([["atk", 3, "+3 ATK"], ["intelligence", 3, "+3 INT"], ["maxMana", 12, "+12 Mana"], ["resist", 2, "+2 Resist"], ["wisdom", 1, "+1 WIS"]]) },
  { id: "dt-warg-fang-charm", name: "Warg-Fang Charm", blurb: "A tooth from the Night-Howler pack.", tier: "magic", slot: "accessory", tags: ["trinket", "beast"], properties: props([["strength", 2, "+2 STR"], ["atk", 2, "+2 ATK"], ["crit", 2, "+2 Crit%"], ["maxHp", 10, "+10 HP"], ["constitution", 1, "+1 CON"]]) },
  { id: "dt-ringmail-vest", name: "Ringmail Vest", blurb: "Rings quiet enough for a gunfighter's crawl.", tier: "magic", slot: "chest", armor: 5, tags: ["medium"], properties: props([["def", 3, "+3 DEF"], ["constitution", 2, "+2 CON"], ["maxHp", 15, "+15 HP"], ["resist", 2, "+2 Resist"], ["strength", 1, "+1 STR"]]) },
  { id: "dt-mist-striders", name: "Mist Striders", blurb: "Boots that leave no print in wet ash.", tier: "magic", slot: "legs", armor: 3, tags: ["light", "stealth"], properties: props([["dexterity", 3, "+3 DEX"], ["def", 2, "+2 DEF"], ["crit", 2, "+2 Crit%"], ["maxHp", 8, "+8 HP"], ["wisdom", 1, "+1 WIS"]]) },
  { id: "dt-widow-silk-cloak", name: "Widow-Silk Cloak", blurb: "Harvested from the Silk Queen's empty nests.", tier: "magic", slot: "chest", armor: 3, tags: ["light", "spider"], properties: props([["dexterity", 2, "+2 DEX"], ["resist", 3, "+3 Resist"], ["def", 2, "+2 DEF"], ["maxMana", 8, "+8 Mana"], ["intelligence", 1, "+1 INT"]]) },
  { id: "dt-bridge-stone-mail", name: "Bridge-Stone Mail", blurb: "Plates chipped from the Arch Toll-Troll's lair.", tier: "magic", slot: "chest", armor: 6, tags: ["heavy", "troll"], properties: props([["def", 4, "+4 DEF"], ["constitution", 3, "+3 CON"], ["maxHp", 20, "+20 HP"], ["strength", 2, "+2 STR"], ["resist", 1, "+1 Resist"]]) },
  { id: "dt-greater-poultice", name: "Greater Poultice", blurb: "Mender's mash laced with ridge blossom.", tier: "magic", slot: "consumable", heal: 45, tags: ["potion"] },
  { id: "dt-mana-cider", name: "Hearth Mana Cider", blurb: "Warm cider that wakes ley-spark.", tier: "magic", slot: "consumable", manaRestore: 30, tags: ["potion", "drink"] },

  // Rare
  { id: "dt-bone-drum-cleaver", name: "Bone-Drum Cleaver", blurb: "Forged to the beat of Thorn-Clan war drums.", tier: "rare", slot: "weapon", power: 16, tags: ["melee", "orc"], properties: props([["atk", 6, "+6 ATK"], ["strength", 3, "+3 STR"], ["crit", 5, "+5 Crit%"], ["maxHp", 18, "+18 HP"], ["constitution", 2, "+2 CON"]]), rarity: "rare" },
  { id: "dt-ash-veil-revolver", name: "Ash-Veil Revolver", blurb: "Chambers that smoke pale after every shot.", tier: "rare", slot: "weapon", power: 17, tags: ["ranged", "firearm", "frontier", "undead"], properties: props([["atk", 6, "+6 ATK"], ["dexterity", 3, "+3 DEX"], ["crit", 6, "+6 Crit%"], ["charisma", 2, "+2 CHA"], ["resist", 2, "+2 Resist"]]), rarity: "rare" },
  { id: "dt-pale-host-helm", name: "Pale-Host Helm", blurb: "Visor like a winter moon — dread sits light.", tier: "rare", slot: "head", armor: 5, tags: ["heavy", "undead"], properties: props([["def", 4, "+4 DEF"], ["wisdom", 3, "+3 WIS"], ["resist", 4, "+4 Resist"], ["maxHp", 16, "+16 HP"], ["charisma", 1, "+1 CHA"]]), rarity: "rare" },
  { id: "dt-liberation-gauntlets", name: "Liberation Gauntlets", blurb: "Knuckles etched with broken-shackle runes.", tier: "rare", slot: "hands", armor: 3, tags: ["medium", "liberation"], properties: props([["strength", 3, "+3 STR"], ["atk", 3, "+3 ATK"], ["def", 2, "+2 DEF"], ["constitution", 2, "+2 CON"], ["maxHp", 12, "+12 HP"]]), rarity: "rare" },
  { id: "dt-ridge-scale-greaves", name: "Ridge-Scale Greaves", blurb: "Scales claimed from a high-pass wyrmling.", tier: "rare", slot: "legs", armor: 4, tags: ["heavy"], properties: props([["def", 3, "+3 DEF"], ["dexterity", 2, "+2 DEX"], ["maxHp", 14, "+14 HP"], ["resist", 3, "+3 Resist"], ["constitution", 2, "+2 CON"]]), rarity: "rare" },

  // Legendary
  { id: "dt-liberators-spur", name: "Liberator's Spur", blurb: "A golden spur that opens every lock it touches.", tier: "legendary", slot: "accessory", tags: ["trinket", "liberation", "legendary"], properties: props([["charisma", 4, "+4 CHA"], ["dexterity", 3, "+3 DEX"], ["atk", 4, "+4 ATK"], ["crit", 5, "+5 Crit%"], ["maxHp", 25, "+25 HP"]]), rarity: "legendary" },
  { id: "dt-broken-shackle-crown", name: "Broken-Shackle Crown", blurb: "Manacle links reforged into a circlet of free wills.", tier: "legendary", slot: "head", armor: 6, tags: ["medium", "liberation", "legendary"], properties: props([["wisdom", 4, "+4 WIS"], ["charisma", 4, "+4 CHA"], ["def", 5, "+5 DEF"], ["resist", 5, "+5 Resist"], ["maxHp", 30, "+30 HP"]]), rarity: "legendary" },
  { id: "dt-wilderland-oathblade", name: "Wilderland Oathblade", blurb: "Steel sworn to every name you free along the road.", tier: "legendary", slot: "weapon", power: 22, tags: ["melee", "legendary", "liberation"], properties: props([["atk", 8, "+8 ATK"], ["strength", 4, "+4 STR"], ["crit", 7, "+7 Crit%"], ["maxHp", 28, "+28 HP"], ["charisma", 3, "+3 CHA"]]), rarity: "legendary" },
];

const LOOT_POOLS = {
  trash: ["dt-trail-jerky", "dt-dust-poultice", "dt-copper-spur", "dt-chain-scarf"],
  common: ["dt-frontier-revolver", "dt-ranch-carbine", "dt-orc-cleaver", "dt-yew-shortbow", "dt-hide-duster", "dt-hide-jerkin", "dt-plank-shield", "dt-ironwood-buckler", "dt-trail-jerky"],
  magic: ["dt-moonsteel-saber", "dt-ashwood-longbow", "dt-ember-staff", "dt-warg-fang-charm", "dt-ringmail-vest", "dt-mist-striders", "dt-widow-silk-cloak", "dt-greater-poultice", "dt-mana-cider"],
  rare: ["dt-bone-drum-cleaver", "dt-ash-veil-revolver", "dt-pale-host-helm", "dt-liberation-gauntlets", "dt-ridge-scale-greaves", "dt-bridge-stone-mail"],
  legendary: ["dt-liberators-spur", "dt-broken-shackle-crown", "dt-wilderland-oathblade", "dt-ash-veil-revolver"],
};

// --- SVG helpers ---
function comicFrame(w, h, accent = "#c4a35a") {
  return `
  <rect x="8" y="8" width="${w - 16}" height="${h - 16}" fill="none" stroke="#1a120c" stroke-width="10"/>
  <rect x="16" y="16" width="${w - 32}" height="${h - 32}" fill="none" stroke="${accent}" stroke-width="3"/>
  <rect x="12" y="12" width="14" height="14" fill="${accent}"/>
  <rect x="${w - 26}" y="12" width="14" height="14" fill="${accent}"/>
  <rect x="12" y="${h - 26}" width="14" height="14" fill="#8b3a2a"/>
  <rect x="${w - 26}" y="${h - 26}" width="14" height="14" fill="#8b3a2a"/>`;
}

function sceneSvg({ id, title, sky0, sky1, ground, accents }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="none">
  <defs>
    <linearGradient id="bg-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${sky0}"/>
      <stop offset="100%" stop-color="${sky1}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#bg-${id})"/>
  ${accents}
  <path d="M0 270 Q160 240 320 265 T640 250 L640 360 L0 360Z" fill="${ground}"/>
  <path d="M0 300 L640 290 L640 360 L0 360Z" fill="#2a1c10" opacity="0.85"/>
  <path d="M0 315 Q200 305 400 320 T640 310" fill="none" stroke="#1a1008" stroke-width="5" opacity="0.45"/>
  ${comicFrame(640, 360)}
  <text x="28" y="44" font-family="Impact, Arial Black, sans-serif" font-size="20"
    fill="#f4efe4" stroke="#1a120c" stroke-width="4" paint-order="stroke">${title}</text>
</svg>
`;
}

function enemySvg({ id, title, body }) {
  return `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="320" height="360" viewBox="0 0 320 360" fill="none">
  <defs>
    <linearGradient id="ebg-${id}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#2a1c14"/>
      <stop offset="100%" stop-color="#0c1210"/>
    </linearGradient>
  </defs>
  <rect width="320" height="360" fill="url(#ebg-${id})"/>
  <ellipse cx="160" cy="300" rx="90" ry="18" fill="#1a2818" opacity="0.7"/>
  ${body}
  ${comicFrame(320, 360, "#c45a3a")}
  <text x="160" y="342" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="16"
    fill="#f4efe4" stroke="#1a120c" stroke-width="4" paint-order="stroke">${title}</text>
</svg>
`;
}

const SCENES = [
  {
    file: "dusty-trail.svg",
    id: "dusty",
    title: "DUSTY TRAIL",
    sky0: "#6b4a2e",
    sky1: "#1a120c",
    ground: "#8b6a3a",
    accents: `<circle cx="520" cy="70" r="36" fill="#e8c96a" opacity="0.35"/><path d="M40 260 L80 180 L120 260Z" fill="#3a2818"/><path d="M500 255 L540 190 L580 255Z" fill="#3a2818"/>`,
  },
  {
    file: "coffle-camp.svg",
    id: "coffle",
    title: "COFFLE CAMP",
    sky0: "#3a2818",
    sky1: "#120c08",
    ground: "#4a3020",
    accents: `<ellipse cx="320" cy="290" rx="50" ry="14" fill="#0a0e14" opacity="0.4"/><path d="M300 285 L320 230 L340 285Z" fill="#e85d4c"/><path d="M310 285 L320 245 L330 285Z" fill="#f5d547"/><rect x="180" y="240" width="80" height="50" fill="#2a1c14" stroke="#1a120c"/><path d="M200 260 H240" stroke="#8a8a8a" stroke-width="3"/><path d="M440 230 L490 180 L540 230Z" fill="#4a3020"/>`,
  },
  {
    file: "pine-pass.svg",
    id: "pine",
    title: "PINE PASS",
    sky0: "#1a2830",
    sky1: "#0a1210",
    ground: "#2a3a28",
    accents: `<path d="M80 280 L120 120 L160 280Z" fill="#1a3a28"/><path d="M200 280 L250 100 L300 280Z" fill="#244830"/><path d="M400 280 L450 110 L500 280Z" fill="#1a3a28"/><path d="M520 280 L560 140 L600 280Z" fill="#244830"/><circle cx="90" cy="60" r="20" fill="#e8eef2" opacity="0.25"/>`,
  },
  {
    file: "spider-hollow.svg",
    id: "spider",
    title: "SPIDER HOLLOW",
    sky0: "#1a1420",
    sky1: "#08060c",
    ground: "#2a2030",
    accents: `<path d="M100 80 L200 160 L140 200" fill="none" stroke="#6a5a70" stroke-width="2" opacity="0.7"/><path d="M300 40 L320 180 L280 220" fill="none" stroke="#6a5a70" stroke-width="2" opacity="0.6"/><path d="M480 60 L420 160 L500 210" fill="none" stroke="#6a5a70" stroke-width="2" opacity="0.65"/><ellipse cx="320" cy="200" rx="40" ry="20" fill="#3a2848" opacity="0.5"/>`,
  },
  {
    file: "troll-bridge.svg",
    id: "troll",
    title: "TROLL BRIDGE",
    sky0: "#2a3040",
    sky1: "#10141c",
    ground: "#3a3830",
    accents: `<path d="M80 260 Q320 180 560 260" fill="none" stroke="#5a5850" stroke-width="28"/><path d="M80 260 Q320 180 560 260" fill="none" stroke="#3a3830" stroke-width="8"/><rect x="60" y="250" width="40" height="60" fill="#4a4840"/><rect x="540" y="250" width="40" height="60" fill="#4a4840"/><ellipse cx="320" cy="290" rx="50" ry="12" fill="#1a120c" opacity="0.5"/>`,
  },
  {
    file: "orc-warcamp.svg",
    id: "orc",
    title: "ORC WARCAMP",
    sky0: "#3a1810",
    sky1: "#120808",
    ground: "#3a2818",
    accents: `<path d="M100 290 L150 200 L200 290Z" fill="#4a3020"/><path d="M420 290 L480 190 L540 290Z" fill="#3a2818"/><path d="M300 285 L320 235 L340 285Z" fill="#e85d4c"/><circle cx="500" cy="80" r="24" fill="#e8eef2" opacity="0.2"/><g fill="#2a4a28"><ellipse cx="250" cy="295" rx="10" ry="5"/><circle cx="250" cy="270" r="8"/><ellipse cx="370" cy="295" rx="10" ry="5"/><circle cx="370" cy="270" r="8"/></g>`,
  },
  {
    file: "ash-pass.svg",
    id: "ash",
    title: "ASH PASS",
    sky0: "#4a3a3a",
    sky1: "#1a1010",
    ground: "#5a4a40",
    accents: `<circle cx="480" cy="70" r="40" fill="#e8c4a0" opacity="0.25"/><path d="M0 200 Q160 180 320 210 T640 190" fill="none" stroke="#8a7a70" stroke-width="3" opacity="0.4"/><path d="M120 280 L160 160 L200 280Z" fill="#4a4040" opacity="0.7"/><path d="M440 280 L490 150 L540 280Z" fill="#4a4040" opacity="0.7"/>`,
  },
  {
    file: "liberation-fort.svg",
    id: "lib",
    title: "LIBERATION FORT",
    sky0: "#3a4a5a",
    sky1: "#141c24",
    ground: "#3a3428",
    accents: `<rect x="220" y="140" width="200" height="140" fill="#4a4030" stroke="#1a120c" stroke-width="3"/><rect x="280" y="200" width="40" height="80" fill="#1a120c"/><path d="M220 140 L320 80 L420 140Z" fill="#5a4a38"/><rect x="240" y="160" width="24" height="24" fill="#6ab0d4" opacity="0.5"/><rect x="376" y="160" width="24" height="24" fill="#6ab0d4" opacity="0.5"/><path d="M330 90 L330 50 M330 50 L360 70 M330 50 L300 70" stroke="#c45a3a" stroke-width="4"/>`,
  },
  {
    file: "moonlit-ridge.svg",
    id: "moon",
    title: "MOONLIT RIDGE",
    sky0: "#1a2030",
    sky1: "#080c14",
    ground: "#2a2830",
    accents: `<circle cx="520" cy="70" r="40" fill="#e8eef2" opacity="0.35"/><path d="M0 220 Q200 160 400 200 T640 170 L640 280 L0 280Z" fill="#3a3848" opacity="0.6"/><g fill="#2a4a40" opacity="0.8"><ellipse cx="200" cy="290" rx="14" ry="6"/><circle cx="200" cy="270" r="10"/><ellipse cx="260" cy="292" rx="12" ry="5"/><circle cx="260" cy="275" r="8"/></g>`,
  },
  {
    file: "chain-citadel.svg",
    id: "citadel",
    title: "CHAIN CITADEL",
    sky0: "#2a1820",
    sky1: "#0c080c",
    ground: "#3a2828",
    accents: `<rect x="180" y="100" width="280" height="180" fill="#3a2a30" stroke="#1a120c" stroke-width="4"/><path d="M180 100 L240 50 L400 50 L460 100Z" fill="#4a3840"/><rect x="300" y="200" width="40" height="80" fill="#0a0808"/><path d="M200 160 H280 M360 160 H440" stroke="#8a8a8a" stroke-width="4"/><circle cx="100" cy="60" r="18" fill="#e85d4c" opacity="0.3"/>`,
  },
];

const ENEMIES = [
  {
    file: "orc-skirmisher.svg",
    id: "orc",
    title: "ORC",
    body: `<ellipse cx="160" cy="210" rx="50" ry="48" fill="#4a8a3a" stroke="#0a0e14" stroke-width="4"/>
  <circle cx="160" cy="120" r="44" fill="#4a8a3a" stroke="#0a0e14" stroke-width="4"/>
  <path d="M120 105 L95 55 L140 95Z" fill="#3a6a2a" stroke="#0a0e14" stroke-width="3"/>
  <path d="M200 105 L225 55 L180 95Z" fill="#3a6a2a" stroke="#0a0e14" stroke-width="3"/>
  <ellipse cx="145" cy="115" rx="10" ry="12" fill="#f5d547"/><ellipse cx="175" cy="115" rx="10" ry="12" fill="#f5d547"/>
  <circle cx="146" cy="118" r="4" fill="#0a0e14"/><circle cx="176" cy="118" r="4" fill="#0a0e14"/>
  <path d="M148 145 Q160 158 172 145" fill="none" stroke="#2a4020" stroke-width="3"/>
  <rect x="210" y="160" width="12" height="90" rx="3" fill="#6a4420" stroke="#0a0e14" stroke-width="2"/>`,
  },
  {
    file: "ash-gut.svg",
    id: "ash",
    title: "ASH-GUT",
    body: `<ellipse cx="160" cy="210" rx="52" ry="50" fill="#3a5a30" stroke="#0a0e14" stroke-width="4"/>
  <circle cx="160" cy="118" r="46" fill="#3a5a30" stroke="#0a0e14" stroke-width="4"/>
  <path d="M130 100 Q160 70 190 100" fill="#2a2018" opacity="0.7"/>
  <ellipse cx="145" cy="115" rx="11" ry="13" fill="#e85d4c"/><ellipse cx="175" cy="115" rx="11" ry="13" fill="#e85d4c"/>
  <circle cx="146" cy="118" r="4" fill="#0a0e14"/><circle cx="176" cy="118" r="4" fill="#0a0e14"/>
  <path d="M140 150 L180 150" stroke="#1a120c" stroke-width="4"/>
  <path d="M100 180 Q70 220 90 250" fill="none" stroke="#3a5a30" stroke-width="14" stroke-linecap="round"/>`,
  },
  {
    file: "dust-warg.svg",
    id: "dwarg",
    title: "DUST WARG",
    body: `<ellipse cx="170" cy="220" rx="70" ry="35" fill="#6a5a48" stroke="#0a0e14" stroke-width="4"/>
  <ellipse cx="100" cy="200" rx="32" ry="26" fill="#6a5a48" stroke="#0a0e14" stroke-width="3"/>
  <path d="M80 185 L70 150 L95 175Z" fill="#5a4a38"/><path d="M110 180 L125 145 L120 185Z" fill="#5a4a38"/>
  <ellipse cx="88" cy="198" rx="6" ry="7" fill="#f5d547"/><circle cx="89" cy="200" r="2.5" fill="#0a0e14"/>
  <path d="M70 210 Q55 220 60 230" fill="none" stroke="#6a5a48" stroke-width="8"/>
  <ellipse cx="230" cy="235" rx="8" ry="14" fill="#5a4a38"/>`,
  },
  {
    file: "night-howler.svg",
    id: "nhowl",
    title: "NIGHT-HOWL",
    body: `<ellipse cx="170" cy="220" rx="72" ry="36" fill="#2a3038" stroke="#0a0e14" stroke-width="4"/>
  <ellipse cx="100" cy="200" rx="34" ry="28" fill="#2a3038" stroke="#0a0e14" stroke-width="3"/>
  <path d="M78 182 L65 140 L98 172Z" fill="#1a2028"/><path d="M112 178 L130 138 L122 182Z" fill="#1a2028"/>
  <ellipse cx="90" cy="196" rx="7" ry="8" fill="#e85d4c"/><circle cx="91" cy="198" r="3" fill="#0a0e14"/>
  <path d="M230 210 Q250 180 255 160" fill="none" stroke="#2a3038" stroke-width="10"/>`,
  },
  {
    file: "trail-webling.svg",
    id: "webl",
    title: "WEBLING",
    body: `<ellipse cx="160" cy="200" rx="45" ry="38" fill="#4a3a58" stroke="#0a0e14" stroke-width="4"/>
  <circle cx="160" cy="150" r="28" fill="#5a4a68" stroke="#0a0e14" stroke-width="3"/>
  <circle cx="148" cy="145" r="5" fill="#f5d547"/><circle cx="172" cy="145" r="5" fill="#f5d547"/>
  <circle cx="149" cy="146" r="2" fill="#0a0e14"/><circle cx="173" cy="146" r="2" fill="#0a0e14"/>
  <path d="M120 180 Q90 160 70 140" fill="none" stroke="#4a3a58" stroke-width="6"/>
  <path d="M120 210 Q85 220 65 240" fill="none" stroke="#4a3a58" stroke-width="6"/>
  <path d="M200 180 Q230 160 250 140" fill="none" stroke="#4a3a58" stroke-width="6"/>
  <path d="M200 210 Q235 220 255 240" fill="none" stroke="#4a3a58" stroke-width="6"/>`,
  },
  {
    file: "silk-widow.svg",
    id: "widow",
    title: "SILK WIDOW",
    body: `<ellipse cx="160" cy="210" rx="55" ry="42" fill="#2a1a30" stroke="#0a0e14" stroke-width="4"/>
  <circle cx="160" cy="145" r="36" fill="#3a2848" stroke="#0a0e14" stroke-width="4"/>
  <circle cx="148" cy="140" r="6" fill="#e85d4c"/><circle cx="172" cy="140" r="6" fill="#e85d4c"/>
  <circle cx="160" cy="150" r="4" fill="#f5d547"/>
  <path d="M110 190 Q70 150 50 120" fill="none" stroke="#2a1a30" stroke-width="8"/>
  <path d="M110 230 Q60 250 40 280" fill="none" stroke="#2a1a30" stroke-width="8"/>
  <path d="M210 190 Q260 150 280 120" fill="none" stroke="#2a1a30" stroke-width="8"/>
  <path d="M210 230 Q270 250 290 280" fill="none" stroke="#2a1a30" stroke-width="8"/>`,
  },
  {
    file: "nest-mother.svg",
    id: "nest",
    title: "NEST MOTHER",
    body: `<ellipse cx="160" cy="220" rx="65" ry="48" fill="#1a1020" stroke="#0a0e14" stroke-width="4"/>
  <circle cx="160" cy="140" r="42" fill="#2a1838" stroke="#0a0e14" stroke-width="4"/>
  <circle cx="145" cy="130" r="7" fill="#f5d547"/><circle cx="175" cy="130" r="7" fill="#f5d547"/>
  <circle cx="160" cy="145" r="5" fill="#e85d4c"/>
  <path d="M100 180 Q40 140 30 90" fill="none" stroke="#1a1020" stroke-width="10"/>
  <path d="M220 180 Q280 140 290 90" fill="none" stroke="#1a1020" stroke-width="10"/>
  <path d="M95 230 Q30 260 20 300" fill="none" stroke="#1a1020" stroke-width="10"/>
  <path d="M225 230 Q290 260 300 300" fill="none" stroke="#1a1020" stroke-width="10"/>`,
  },
  {
    file: "bridge-brute.svg",
    id: "brute",
    title: "BRIDGE BRUTE",
    body: `<ellipse cx="160" cy="230" rx="60" ry="55" fill="#5a6a4a" stroke="#0a0e14" stroke-width="4"/>
  <circle cx="160" cy="130" r="50" fill="#5a6a4a" stroke="#0a0e14" stroke-width="4"/>
  <ellipse cx="145" cy="125" rx="8" ry="10" fill="#1a120c"/><ellipse cx="175" cy="125" rx="8" ry="10" fill="#1a120c"/>
  <path d="M140 155 Q160 170 180 155" fill="none" stroke="#2a3020" stroke-width="4"/>
  <path d="M100 200 Q50 240 60 280" fill="none" stroke="#5a6a4a" stroke-width="22" stroke-linecap="round"/>
  <rect x="230" y="140" width="18" height="110" rx="4" fill="#6a4420" stroke="#0a0e14" stroke-width="3"/>`,
  },
  {
    file: "cave-troll.svg",
    id: "cave",
    title: "CAVE TROLL",
    body: `<ellipse cx="160" cy="235" rx="65" ry="58" fill="#4a5a50" stroke="#0a0e14" stroke-width="4"/>
  <circle cx="160" cy="125" r="52" fill="#4a5a50" stroke="#0a0e14" stroke-width="4"/>
  <ellipse cx="142" cy="120" rx="9" ry="11" fill="#f5d547"/><ellipse cx="178" cy="120" rx="9" ry="11" fill="#f5d547"/>
  <circle cx="143" cy="122" r="3" fill="#0a0e14"/><circle cx="179" cy="122" r="3" fill="#0a0e14"/>
  <path d="M130 160 Q160 185 190 160" fill="#2a3028"/>
  <path d="M90 210 Q40 250 55 300" fill="none" stroke="#4a5a50" stroke-width="24" stroke-linecap="round"/>
  <path d="M230 210 Q280 250 265 300" fill="none" stroke="#4a5a50" stroke-width="24" stroke-linecap="round"/>`,
  },
  {
    file: "ash-cloak.svg",
    id: "cloak",
    title: "ASH-CLOAK",
    body: `<path d="M100 280 L160 120 L220 280Z" fill="#2a2830" stroke="#0a0e14" stroke-width="4"/>
  <ellipse cx="160" cy="110" rx="28" ry="32" fill="#1a1820" stroke="#0a0e14" stroke-width="3"/>
  <path d="M140 100 L160 70 L180 100Z" fill="#1a1820"/>
  <ellipse cx="160" cy="115" rx="10" ry="4" fill="#e85d4c" opacity="0.6"/>
  <path d="M180 180 Q240 160 260 140" fill="none" stroke="#3a3840" stroke-width="8"/>
  <ellipse cx="250" cy="290" rx="40" ry="16" fill="#3a3830" opacity="0.5"/>
  <path d="M220 280 Q250 240 280 270 Q250 250 220 280" fill="#4a4840"/>`,
  },
  {
    file: "whip-hand.svg",
    id: "whip",
    title: "WHIP-HAND",
    body: `<ellipse cx="160" cy="220" rx="40" ry="50" fill="#5a4030" stroke="#0a0e14" stroke-width="4"/>
  <circle cx="160" cy="130" r="36" fill="#c4a882" stroke="#0a0e14" stroke-width="3"/>
  <ellipse cx="148" cy="128" rx="5" ry="6" fill="#1a120c"/><ellipse cx="172" cy="128" rx="5" ry="6" fill="#1a120c"/>
  <path d="M145 148 Q160 156 175 148" fill="none" stroke="#8a6040" stroke-width="2"/>
  <rect x="145" y="95" width="30" height="12" fill="#3a2818"/>
  <path d="M200 180 Q260 200 270 260" fill="none" stroke="#8a5a3a" stroke-width="4"/>
  <path d="M120 250 L140 300 L155 300 L145 250Z" fill="#3a2818"/>
  <path d="M175 250 L165 300 L180 300 L200 250Z" fill="#3a2818"/>`,
  },
  {
    file: "coffle-guard.svg",
    id: "guard",
    title: "COFFLE GUARD",
    body: `<ellipse cx="160" cy="220" rx="42" ry="52" fill="#4a4a58" stroke="#0a0e14" stroke-width="4"/>
  <circle cx="160" cy="128" r="34" fill="#c4a882" stroke="#0a0e14" stroke-width="3"/>
  <rect x="130" y="160" width="60" height="40" fill="#5a5850" stroke="#0a0e14" stroke-width="2"/>
  <ellipse cx="148" cy="126" rx="5" ry="6" fill="#1a120c"/><ellipse cx="172" cy="126" rx="5" ry="6" fill="#1a120c"/>
  <path d="M200 175 L250 155" stroke="#8a8a8a" stroke-width="5"/>
  <circle cx="250" cy="150" r="8" fill="#8a8a8a" stroke="#0a0e14" stroke-width="2"/>
  <rect x="230" y="190" width="14" height="70" fill="#6a4420" stroke="#0a0e14" stroke-width="2"/>`,
  },
  {
    file: "orc-rider.svg",
    id: "rider",
    title: "ORC RIDER",
    body: `<ellipse cx="180" cy="260" rx="70" ry="30" fill="#5a4a38" stroke="#0a0e14" stroke-width="3"/>
  <ellipse cx="110" cy="245" rx="28" ry="22" fill="#5a4a38" stroke="#0a0e14" stroke-width="2"/>
  <ellipse cx="160" cy="180" rx="35" ry="40" fill="#4a8a3a" stroke="#0a0e14" stroke-width="3"/>
  <circle cx="160" cy="120" r="30" fill="#4a8a3a" stroke="#0a0e14" stroke-width="3"/>
  <ellipse cx="150" cy="118" rx="6" ry="7" fill="#f5d547"/><ellipse cx="170" cy="118" rx="6" ry="7" fill="#f5d547"/>
  <path d="M200 160 Q240 140 250 120" fill="none" stroke="#6a4420" stroke-width="6"/>`,
  },
];

const SPLASHES = [
  {
    file: "ch1-trail.svg",
    title: "CHAPTER 1",
    subtitle: "The Dust Road",
    sky0: "#6b4a2e",
    sky1: "#1a120c",
  },
  {
    file: "ch5-ash.svg",
    title: "CHAPTER 5",
    subtitle: "Ash Pass",
    sky0: "#4a3a3a",
    sky1: "#1a1010",
  },
  {
    file: "finale-liberation.svg",
    title: "FINALE",
    subtitle: "Broken Chains",
    sky0: "#3a4a5a",
    sky1: "#141c24",
  },
];

// Write packs
writeJson("data/dungeon-tester/creatures.json", {
  version: 1,
  flavor: "Middle-earth–inspired generics (orcs, wargs, trolls, spiders) + frontier foes. No trademarked proper nouns.",
  creatures: CREATURES,
});

writeJson("data/dungeon-tester/bosses.json", {
  version: 1,
  bosses: BOSSES,
});

writeJson("data/dungeon-tester/encounters.json", encounters);

writeJson("data/dungeon-tester/gear.json", {
  version: 1,
  flavor: "Frontier firearms/leather + fantasy wilderland arms. Prefixed dt- to avoid Neverworld id collisions.",
  pools: LOOT_POOLS,
  items: GEAR,
});

writeJson("data/dungeon-tester/battle-loot.json", {
  version: 1,
  pools: LOOT_POOLS,
  items: GEAR.filter((i) => i.slot === "consumable" || i.tier === "common"),
  bossUniques: GEAR.filter((i) => i.tier === "legendary" || (i.rarity === "rare" && i.tags?.includes("liberation"))),
});

// SVGs
for (const s of SCENES) {
  writeSvg(
    `public/dungeon-tester/scenes/${s.file}`,
    sceneSvg(s)
  );
}
for (const e of ENEMIES) {
  writeSvg(`public/dungeon-tester/enemies/${e.file}`, enemySvg(e));
}
for (const s of SPLASHES) {
  writeSvg(
    `public/dungeon-tester/splash/${s.file}`,
    `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="none">
  <defs>
    <linearGradient id="sp-${s.file}" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="${s.sky0}"/>
      <stop offset="100%" stop-color="${s.sky1}"/>
    </linearGradient>
  </defs>
  <rect width="640" height="360" fill="url(#sp-${s.file})"/>
  <path d="M0 260 Q320 220 640 255 L640 360 L0 360Z" fill="#2a1c10"/>
  ${comicFrame(640, 360)}
  <text x="320" y="150" text-anchor="middle" font-family="Impact, Arial Black, sans-serif" font-size="42"
    fill="#f4efe4" stroke="#1a120c" stroke-width="6" paint-order="stroke">${s.title}</text>
  <text x="320" y="200" text-anchor="middle" font-family="Georgia, serif" font-size="24"
    fill="#e8c96a" stroke="#1a120c" stroke-width="3" paint-order="stroke">${s.subtitle}</text>
</svg>
`
  );
}

writeSvg(
  "public/dungeon-tester/panel-frame.svg",
  `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="640" height="360" viewBox="0 0 640 360" fill="none">
  <rect width="640" height="360" fill="#1a120c" opacity="0.15"/>
  ${comicFrame(640, 360)}
</svg>
`
);

console.log("\nDone.", {
  creatures: CREATURES.length,
  bosses: BOSSES.length,
  decks: encounters.decks.length,
  gear: GEAR.length,
  scenes: SCENES.length,
  enemies: ENEMIES.length,
});
