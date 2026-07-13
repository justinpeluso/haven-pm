#!/usr/bin/env node
/**
 * Generates Neverworld battle content packs under data/party-chronicle/
 */
import { writeFileSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "party-chronicle");

const ART = {
  beast: ["art-wolf-ulfric", "art-bear-bruna", "art-stag-aelwyn", "art-fox-pip"],
  humanoid: ["art-goblin-scout", "art-ember-thane"],
  undead: ["art-raven-corv", "art-demon-herald", "art-goblin-scout"],
  elemental: ["art-ember-thane", "art-dragon-silhouette"],
  dragon: ["art-dragon-silhouette"],
  fey: ["art-fox-pip", "art-stag-aelwyn", "art-raven-corv"],
  construct: ["art-ember-thane", "art-bear-bruna"],
  aberration: ["art-serpent-nyx", "art-raven-corv"],
};

const BLURBS = [
  "Smells of wet pine and old iron.",
  "Leaves claw-marks on the trail stones.",
  "Whispers a name you almost remember.",
  "Eyes like banked coals in the mist.",
  "Hunts where the road forgets its name.",
  "Born of swamp gas and bad bargains.",
  "Feathers or scales — hard to tell at speed.",
  "Laughs like a kettle about to boil.",
  "Armor stitched from stolen banners.",
  "Drags the cold of high peaks behind it.",
];

function pick(arr, i) {
  return arr[i % arr.length];
}

function statsForLevel(level, tag) {
  const hp = Math.min(200, Math.round(12 + level * 1.85 + (tag === "beast" ? 8 : 0)));
  const power = Math.min(40, Math.round(3 + level * 0.36 + (tag === "dragon" ? 6 : 0)));
  const armor = Math.min(12, Math.floor(level / 12) + (tag === "construct" ? 2 : 0));
  const xp = Math.round(8 + level * 1.4);
  const gold = Math.max(2, Math.round(2 + level * 0.45));
  return { hp, power, armor, xp, gold };
}

function lootPoolForLevel(level) {
  if (level <= 15) return level < 6 ? "trash" : "common";
  if (level <= 45) return level < 30 ? "common" : "magic";
  return level < 75 ? "magic" : "magic";
}

// ── Creature name banks (~200 unique) ───────────────────────
const CREATURE_BANK = [
  // Forest low (1–20)
  { name: "Goblin Scout", tag: "humanoid", theme: "forest", lvl: [1, 8] },
  { name: "Mire Slime", tag: "aberration", theme: "swamp", lvl: [1, 6] },
  { name: "Crow Swarm", tag: "beast", theme: "forest", lvl: [1, 10] },
  { name: "Frost Warg Pup", tag: "beast", theme: "mountain", lvl: [2, 12] },
  { name: "Bandit Cutpurse", tag: "humanoid", theme: "forest", lvl: [3, 14] },
  { name: "Pine Needle Sprite", tag: "fey", theme: "forest", lvl: [2, 10] },
  { name: "Root Crawler", tag: "aberration", theme: "forest", lvl: [4, 16] },
  { name: "Thistle Boar", tag: "beast", theme: "forest", lvl: [3, 15] },
  { name: "Mossback Toad", tag: "beast", theme: "swamp", lvl: [2, 11] },
  { name: "Snare Spider", tag: "beast", theme: "forest", lvl: [4, 18] },
  { name: "Woodcutter Ghoul", tag: "undead", theme: "forest", lvl: [5, 18] },
  { name: "Briar Wolf", tag: "beast", theme: "forest", lvl: [6, 20] },
  { name: "Hollow Stag", tag: "undead", theme: "forest", lvl: [7, 20] },
  { name: "Fern Wisp", tag: "fey", theme: "forest", lvl: [3, 12] },
  { name: "Trail Bandit", tag: "humanoid", theme: "forest", lvl: [5, 16] },
  { name: "Sap Ooze", tag: "aberration", theme: "forest", lvl: [4, 14] },
  { name: "Nettle Hare", tag: "beast", theme: "forest", lvl: [1, 8] },
  { name: "Grove Imp", tag: "fey", theme: "forest", lvl: [4, 15] },
  { name: "Bark Golem Shard", tag: "construct", theme: "forest", lvl: [8, 20] },
  { name: "Whisper Moth Cloud", tag: "fey", theme: "forest", lvl: [5, 17] },
  { name: "Hedge Witchling", tag: "humanoid", theme: "forest", lvl: [6, 18] },
  { name: "Fungal Shambler", tag: "aberration", theme: "swamp", lvl: [5, 19] },
  { name: "River Pike Spirit", tag: "elemental", theme: "swamp", lvl: [7, 20] },
  { name: "Oak Warden Thrall", tag: "construct", theme: "forest", lvl: [9, 20] },
  { name: "Wilderness Poacher", tag: "humanoid", theme: "forest", lvl: [6, 19] },
  // Swamp mid-low
  { name: "Bog Leech Cluster", tag: "aberration", theme: "swamp", lvl: [4, 16] },
  { name: "Will-o-Mire", tag: "undead", theme: "swamp", lvl: [5, 18] },
  { name: "Peat Hag", tag: "humanoid", theme: "swamp", lvl: [8, 22] },
  { name: "Reed Stalker", tag: "beast", theme: "swamp", lvl: [6, 20] },
  { name: "Marsh Gas Elemental", tag: "elemental", theme: "swamp", lvl: [7, 21] },
  { name: "Sunken Pilgrim", tag: "undead", theme: "swamp", lvl: [9, 24] },
  { name: "Croak Trollkin", tag: "humanoid", theme: "swamp", lvl: [10, 25] },
  { name: "Mire Adder", tag: "beast", theme: "swamp", lvl: [5, 18] },
  { name: "Rotcap Shroomling", tag: "aberration", theme: "swamp", lvl: [6, 19] },
  { name: "Quagmire Crab", tag: "beast", theme: "swamp", lvl: [7, 20] },
  { name: "Drowned Courier", tag: "undead", theme: "swamp", lvl: [8, 22] },
  { name: "Swamp Witch Apprentice", tag: "humanoid", theme: "swamp", lvl: [9, 23] },
  { name: "Gloom Frog", tag: "beast", theme: "swamp", lvl: [4, 15] },
  { name: "Bog Lantern Wisp", tag: "fey", theme: "swamp", lvl: [6, 18] },
  { name: "Mudslide Elemental", tag: "elemental", theme: "swamp", lvl: [10, 26] },
  // Mountain low-mid
  { name: "Stone Goat", tag: "beast", theme: "mountain", lvl: [4, 16] },
  { name: "Cliff Raven", tag: "beast", theme: "mountain", lvl: [3, 14] },
  { name: "Snow Hare", tag: "beast", theme: "mountain", lvl: [2, 10] },
  { name: "Avalanche Cub", tag: "elemental", theme: "mountain", lvl: [8, 22] },
  { name: "Frost Bandit", tag: "humanoid", theme: "mountain", lvl: [7, 20] },
  { name: "Ice Mite Swarm", tag: "aberration", theme: "mountain", lvl: [5, 17] },
  { name: "Granite Beetle", tag: "construct", theme: "mountain", lvl: [6, 19] },
  { name: "Wind Screecher", tag: "beast", theme: "mountain", lvl: [7, 21] },
  { name: "Peak Hermit", tag: "humanoid", theme: "mountain", lvl: [9, 24] },
  { name: "Hoarfrost Warg", tag: "beast", theme: "mountain", lvl: [10, 26] },
  { name: "Shale Crawler", tag: "aberration", theme: "mountain", lvl: [8, 22] },
  { name: "Rime Sprite", tag: "fey", theme: "mountain", lvl: [6, 18] },
  { name: "Echo Banshee", tag: "undead", theme: "mountain", lvl: [11, 28] },
  { name: "Crag Imp", tag: "fey", theme: "mountain", lvl: [7, 20] },
  { name: "Thunder Moth", tag: "elemental", theme: "mountain", lvl: [9, 24] },
  // Mid tier 15–40
  { name: "Goblin Archer", tag: "humanoid", theme: "forest", lvl: [11, 22] },
  { name: "Road Reaver", tag: "humanoid", theme: "forest", lvl: [12, 24] },
  { name: "Raven Cultist", tag: "humanoid", theme: "forest", lvl: [11, 23] },
  { name: "Green-Eye Shaman", tag: "humanoid", theme: "swamp", lvl: [13, 26] },
  { name: "Ambush Captain", tag: "humanoid", theme: "forest", lvl: [14, 28] },
  { name: "Ember Guard", tag: "humanoid", theme: "mountain", lvl: [15, 30] },
  { name: "Bridge Trollkin", tag: "humanoid", theme: "mountain", lvl: [12, 25] },
  { name: "Stolen Mule Golem", tag: "construct", theme: "forest", lvl: [14, 28] },
  { name: "Mad Pine Sprite", tag: "fey", theme: "forest", lvl: [10, 20] },
  { name: "Hollow Knight Errant", tag: "undead", theme: "forest", lvl: [16, 32] },
  { name: "Corpse Candle", tag: "undead", theme: "swamp", lvl: [13, 27] },
  { name: "Wyrmkin Scout", tag: "dragon", theme: "mountain", lvl: [18, 35] },
  { name: "Ash Wolf", tag: "beast", theme: "mountain", lvl: [15, 30] },
  { name: "Ironwood Sentinel", tag: "construct", theme: "forest", lvl: [17, 34] },
  { name: "Mist Stalker", tag: "aberration", theme: "forest", lvl: [16, 31] },
  { name: "Hill Giant Kin", tag: "humanoid", theme: "mountain", lvl: [20, 38] },
  { name: "Gloom Stag", tag: "fey", theme: "forest", lvl: [14, 28] },
  { name: "Salt Marsh Ghoul", tag: "undead", theme: "swamp", lvl: [15, 29] },
  { name: "Basalt Golem Hand", tag: "construct", theme: "mountain", lvl: [18, 36] },
  { name: "Storm Crow", tag: "beast", theme: "mountain", lvl: [13, 26] },
  { name: "Fen Revenant", tag: "undead", theme: "swamp", lvl: [17, 33] },
  { name: "Copper Scale Drake", tag: "dragon", theme: "mountain", lvl: [22, 40] },
  { name: "Briar Knight", tag: "humanoid", theme: "forest", lvl: [19, 35] },
  { name: "Spore Cloud", tag: "aberration", theme: "swamp", lvl: [14, 27] },
  { name: "Glacier Shardling", tag: "elemental", theme: "mountain", lvl: [16, 32] },
  { name: "Twilight Fox", tag: "fey", theme: "forest", lvl: [12, 24] },
  { name: "Mire Witch", tag: "humanoid", theme: "swamp", lvl: [18, 34] },
  { name: "Cairn Wight", tag: "undead", theme: "mountain", lvl: [20, 37] },
  { name: "Pine Baron Guard", tag: "humanoid", theme: "forest", lvl: [21, 38] },
  { name: "Swamp Hydra Head", tag: "aberration", theme: "swamp", lvl: [22, 40] },
  // High tier 35–70
  { name: "Frostford Raider", tag: "humanoid", theme: "mountain", lvl: [28, 45] },
  { name: "Ember Cult Acolyte", tag: "humanoid", theme: "mountain", lvl: [30, 48] },
  { name: "Ancient Treant Sapling", tag: "construct", theme: "forest", lvl: [32, 50] },
  { name: "Void Moth Priest", tag: "aberration", theme: "swamp", lvl: [33, 52] },
  { name: "Sky Wyrmling", tag: "dragon", theme: "mountain", lvl: [35, 55] },
  { name: "Grave Moss Titan", tag: "undead", theme: "swamp", lvl: [34, 53] },
  { name: "Thunder Ram", tag: "beast", theme: "mountain", lvl: [30, 48] },
  { name: "Moonlit Stalker", tag: "fey", theme: "forest", lvl: [31, 49] },
  { name: "Obsidian Beetle", tag: "construct", theme: "mountain", lvl: [36, 54] },
  { name: "Bog Queen Handmaiden", tag: "humanoid", theme: "swamp", lvl: [37, 56] },
  { name: "Hollow Oak Treant", tag: "construct", theme: "forest", lvl: [38, 58] },
  { name: "Rime Wraith", tag: "undead", theme: "mountain", lvl: [39, 57] },
  { name: "Coal Elemental", tag: "elemental", theme: "mountain", lvl: [35, 52] },
  { name: "Deep Forest Lurker", tag: "aberration", theme: "forest", lvl: [40, 60] },
  { name: "Peak Dragon Cultist", tag: "humanoid", theme: "mountain", lvl: [42, 62] },
  { name: "Swamp Leviathan Spawn", tag: "aberration", theme: "swamp", lvl: [44, 64] },
  { name: "Starfall Sprite", tag: "fey", theme: "mountain", lvl: [38, 55] },
  { name: "Ironbark Champion", tag: "construct", theme: "forest", lvl: [45, 65] },
  { name: "Ash Drake", tag: "dragon", theme: "mountain", lvl: [48, 68] },
  { name: "Pale Host Soldier", tag: "undead", theme: "forest", lvl: [41, 58] },
  { name: "Mist Elemental", tag: "elemental", theme: "forest", lvl: [36, 54] },
  { name: "Fen Horror", tag: "aberration", theme: "swamp", lvl: [46, 66] },
  { name: "Highland Berserker", tag: "humanoid", theme: "mountain", lvl: [43, 60] },
  { name: "Gloomwood Huntress", tag: "fey", theme: "forest", lvl: [40, 57] },
  { name: "Sunken Cathedral Shade", tag: "undead", theme: "swamp", lvl: [47, 67] },
  // Endgame 60–100
  { name: "World-Eater Gnat", tag: "aberration", theme: "swamp", lvl: [55, 75] },
  { name: "Elder Warg Alpha", tag: "beast", theme: "mountain", lvl: [58, 78] },
  { name: "Chronicle Wraith", tag: "undead", theme: "forest", lvl: [60, 80] },
  { name: "Ley Storm Elemental", tag: "elemental", theme: "mountain", lvl: [62, 82] },
  { name: "Neverwood Archfey", tag: "fey", theme: "forest", lvl: [65, 85] },
  { name: "Obsidian Drake", tag: "dragon", theme: "mountain", lvl: [68, 88] },
  { name: "Ash Titan Fragment", tag: "construct", theme: "mountain", lvl: [70, 90] },
  { name: "Mire Sovereign Guard", tag: "humanoid", theme: "swamp", lvl: [66, 84] },
  { name: "Void Serpent", tag: "aberration", theme: "swamp", lvl: [72, 92] },
  { name: "Frost Giant Outcast", tag: "humanoid", theme: "mountain", lvl: [74, 94] },
  { name: "Pale Dragon Spawn", tag: "dragon", theme: "forest", lvl: [76, 96] },
  { name: "Root of All Thorns", tag: "fey", theme: "forest", lvl: [78, 98] },
  { name: "Cathedral Gargoyle", tag: "construct", theme: "mountain", lvl: [75, 95] },
  { name: "Bog Emperor Sludge", tag: "aberration", theme: "swamp", lvl: [80, 100] },
  { name: "Summit Wraith Lord", tag: "undead", theme: "mountain", lvl: [82, 100] },
  { name: "Emberstorm Elemental", tag: "elemental", theme: "mountain", lvl: [84, 100] },
  { name: "Hollow King Knight", tag: "undead", theme: "forest", lvl: [86, 100] },
  { name: "Deep Mire Leviathan", tag: "aberration", theme: "swamp", lvl: [88, 100] },
  { name: "Skyfire Wyrm", tag: "dragon", theme: "mountain", lvl: [90, 100] },
  { name: "Wild Law Stag", tag: "fey", theme: "forest", lvl: [92, 100] },
];

// Expand to ~200 with regional variants
const VARIANTS = [
  "Young", "Elder", "Rabid", "Starved", "Cursed", "Runaway", "Exiled",
  "Twilight", "Dawn", "Dusk", "Misty", "Frozen", "Sunken", "Highland",
  "Lowland", "Wayward", "Lost", "Hollow", "Ashen", "Verdant", "Pale",
  "Scarred", "Branded", "Nameless", "Restless", "Hungry", "Bitter",
];

function slug(s) {
  return s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

function buildCreatures() {
  const creatures = [];
  const usedIds = new Set();
  const usedNames = new Set();

  for (const base of CREATURE_BANK) {
    const id = slug(base.name);
    if (usedIds.has(id)) continue;
    usedIds.add(id);
    usedNames.add(base.name);
    const mid = Math.floor((base.lvl[0] + base.lvl[1]) / 2);
    const s = statsForLevel(mid, base.tag);
    creatures.push({
      id,
      name: base.name,
      blurb: pick(BLURBS, creatures.length),
      levelMin: base.lvl[0],
      levelMax: base.lvl[1],
      ...s,
      tags: [base.tag],
      artId: pick(ART[base.tag] ?? ART.beast, creatures.length),
      weight: base.lvl[1] <= 20 ? 3 : base.lvl[1] <= 50 ? 2 : 1,
      lootPool: lootPoolForLevel(mid),
    });
  }

  let vi = 0;
  while (creatures.length < 200) {
    const base = CREATURE_BANK[vi % CREATURE_BANK.length];
    const variant = VARIANTS[Math.floor(vi / CREATURE_BANK.length) % VARIANTS.length];
    const name = `${variant} ${base.name}`;
    const id = slug(name);
    if (usedIds.has(id) || usedNames.has(name)) {
      vi++;
      continue;
    }
    usedIds.add(id);
    usedNames.add(name);
    const lvlMin = Math.min(100, base.lvl[0] + Math.floor(vi / 10));
    const lvlMax = Math.min(100, base.lvl[1] + Math.floor(vi / 8));
    const mid = Math.floor((lvlMin + lvlMax) / 2);
    const s = statsForLevel(mid, base.tag);
    creatures.push({
      id,
      name,
      blurb: pick(BLURBS, creatures.length + vi),
      levelMin: lvlMin,
      levelMax: lvlMax,
      ...s,
      tags: [base.tag],
      artId: pick(ART[base.tag] ?? ART.beast, creatures.length),
      weight: mid <= 25 ? 2 : 1,
      lootPool: lootPoolForLevel(mid),
    });
    vi++;
  }

  return creatures.slice(0, 200);
}

// ── Bosses (~50) ────────────────────────────────────────────
const BOSS_DEFS = [
  { id: "frostford-warg", name: "Frostford Warg", tag: "beast", art: "art-wolf-ulfric", lvl: [8, 25], skill: ["pack-howl", "Pack Howl", "Rally nearby beasts; bites twice."], drops: ["frostford-fang"] },
  { id: "goblin-king-road", name: "Goblin King of the Road", tag: "humanoid", art: "art-goblin-scout", lvl: [12, 30], skill: ["crown-rally", "Crown Rally", "Summons goblin reinforcements."], drops: ["road-kings-crown"] },
  { id: "mire-hag-queen", name: "Mire Hag Queen", tag: "humanoid", art: "art-serpent-nyx", lvl: [15, 35], skill: ["bog-curse", "Bog Curse", "Slows and poisons the party."], drops: ["hag-queen-talisman"] },
  { id: "bridge-troll-bruin", name: "Bruin the Bridge Troll", tag: "humanoid", art: "art-bear-bruna", lvl: [10, 28], skill: ["bridge-slam", "Bridge Slam", "Crushing overhead smash."], drops: ["bruins-toll-club"] },
  { id: "raven-cult-high-priest", name: "High Priest of the Raven", tag: "humanoid", art: "art-raven-corv", lvl: [18, 40], skill: ["omen-feast", "Omen Feast", "Dark healing from fallen crows."], drops: ["raven-priest-mask"] },
  { id: "ember-hold-captain", name: "Ember Hold Captain", tag: "humanoid", art: "art-ember-thane", lvl: [20, 42], skill: ["ember-charge", "Ember Charge", "Flaming shield rush."], drops: ["ember-captains-gorget"] },
  { id: "ancient-treant", name: "Ancient Treant", tag: "construct", art: "art-stag-aelwyn", lvl: [25, 50], skill: ["root-prison", "Root Prison", "Roots bind a target in place."], drops: ["heartwood-branch"] },
  { id: "sky-wyrm-nest-guardian", name: "Sky Wyrm Nest Guardian", tag: "dragon", art: "art-dragon-silhouette", lvl: [30, 55], skill: ["sky-dive", "Sky Dive", "Aerial strike from above."], drops: ["wyrm-nest-scale"] },
  { id: "bog-leviathan", name: "Bog Leviathan", tag: "aberration", art: "art-serpent-nyx", lvl: [28, 52], skill: ["mire-pull", "Mire Pull", "Drags foes into the swamp."], drops: ["leviathan-tooth"] },
  { id: "cairn-wight-lord", name: "Cairn Wight Lord", tag: "undead", art: "art-demon-herald", lvl: [32, 58], skill: ["grave-chill", "Grave Chill", "Life-draining frost aura."], drops: ["cairn-wight-blade"] },
  { id: "ironwood-champion", name: "Ironwood Champion", tag: "construct", art: "art-bear-bruna", lvl: [35, 60], skill: ["bark-armor", "Bark Armor", "Hardens skin like ironwood."], drops: ["ironwood-plate-shard"] },
  { id: "peak-storm-eagle", name: "Peak Storm Eagle", tag: "beast", art: "art-raven-corv", lvl: [22, 45], skill: ["lightning-talon", "Lightning Talon", "Thunder strike on dive."], drops: ["storm-eagle-quill"] },
  { id: "fen-revenant-knight", name: "Fen Revenant Knight", tag: "undead", art: "art-ember-thane", lvl: [26, 48], skill: ["drowned-oath", "Drowned Oath", "Forced duel — single target."], drops: ["revenant-oath-ring"] },
  { id: "copper-drake-broodmother", name: "Copper Drake Broodmother", tag: "dragon", art: "art-dragon-silhouette", lvl: [38, 65], skill: ["brood-call", "Brood Call", "Spawns drake whelps."], drops: ["copper-drake-heart"] },
  { id: "mist-stalker-alpha", name: "Mist Stalker Alpha", tag: "aberration", art: "art-wolf-ulfric", lvl: [24, 46], skill: ["vanish-strike", "Vanish Strike", "Vanishes then ambushes."], drops: ["mist-stalker-cloak"] },
  { id: "hill-giant-chieftain", name: "Hill Giant Chieftain", tag: "humanoid", art: "art-bear-bruna", lvl: [30, 55], skill: ["boulder-heave", "Boulder Heave", "Throws a massive boulder."], drops: ["giant-chiefs-girdle"] },
  { id: "swamp-witch-coven-mother", name: "Coven Mother", tag: "humanoid", art: "art-serpent-nyx", lvl: [34, 58], skill: ["hex-weave", "Hex Weave", "Stacking curse on all foes."], drops: ["coven-mothers-staff"] },
  { id: "hollow-oak-spirit", name: "Hollow Oak Spirit", tag: "fey", art: "art-stag-aelwyn", lvl: [20, 40], skill: ["wild-law", "Wild Law", "Nature buff for allies."], drops: ["hollow-oak-acorn"] },
  { id: "ash-wolf-pack-leader", name: "Ash Wolf Pack Leader", tag: "beast", art: "art-wolf-ulfric", lvl: [18, 38], skill: ["ash-bite", "Ash Bite", "Burning fang attack."], drops: ["ash-wolf-pelt"] },
  { id: "granite-golem-warden", name: "Granite Golem Warden", tag: "construct", art: "art-ember-thane", lvl: [36, 62], skill: ["stone-skin", "Stone Skin", "Temporary massive armor."], drops: ["granite-golem-core"] },
  { id: "void-moth-oracle", name: "Void Moth Oracle", tag: "aberration", art: "art-raven-corv", lvl: [40, 68], skill: ["prophecy-dust", "Prophecy Dust", "Confuses and damages."], drops: ["void-moth-antenna"] },
  { id: "frost-giant-exile", name: "Frost Giant Exile", tag: "humanoid", art: "art-bear-bruna", lvl: [42, 70], skill: ["glacier-fist", "Glacier Fist", "Ice fist smash."], drops: ["exile-frost-axe"] },
  { id: "pale-host-commander", name: "Pale Host Commander", tag: "undead", art: "art-demon-herald", lvl: [44, 72], skill: ["host-rally", "Host Rally", "Raises fallen undead."], drops: ["pale-host-banner"] },
  { id: "ember-cult-flame-keeper", name: "Flame Keeper", tag: "humanoid", art: "art-ember-thane", lvl: [38, 64], skill: ["banked-coals", "Banked Coals", "Fire damage over time."], drops: ["flame-keepers-brand"] },
  { id: "deep-forest-lurker-brood", name: "Deep Forest Lurker Brood", tag: "aberration", art: "art-serpent-nyx", lvl: [46, 74], skill: ["brood-swarm", "Brood Swarm", "Many small bites."], drops: ["lurker-brood-sac"] },
  { id: "moonlit-stalker-queen", name: "Moonlit Stalker Queen", tag: "fey", art: "art-fox-pip", lvl: [40, 66], skill: ["moonbeam", "Moonbeam", "Radiant fey damage."], drops: ["moonlit-stalker-crown"] },
  { id: "obsidian-drake-elder", name: "Obsidian Drake Elder", tag: "dragon", art: "art-dragon-silhouette", lvl: [50, 80], skill: ["obsidian-breath", "Obsidian Breath", "Volcanic breath cone."], drops: ["obsidian-drake-horn"] },
  { id: "summit-wraith", name: "Summit Wraith", tag: "undead", art: "art-demon-herald", lvl: [48, 78], skill: ["peak-mist", "Peak Mist", "Blinds and chills."], drops: ["summit-wraith-shroud"] },
  { id: "neverwood-archfey-courtier", name: "Neverwood Archfey Courtier", tag: "fey", art: "art-stag-aelwyn", lvl: [52, 82], skill: ["fey-glamour", "Fey Glamour", "Charms and confuses."], drops: ["archfey-court-scepter"] },
  { id: "mire-sovereign", name: "Mire Sovereign", tag: "aberration", art: "art-serpent-nyx", lvl: [55, 85], skill: ["sovereign-tide", "Sovereign Tide", "Swamp wave engulfs foes."], drops: ["mire-sovereign-crown"] },
  { id: "chronicle-wraith", name: "Chronicle Wraith", tag: "undead", art: "art-raven-corv", lvl: [58, 88], skill: ["unwritten-page", "Unwritten Page", "Erases buffs from foes."], drops: ["chronicle-wraith-quill"] },
  { id: "ash-titan-sentinel", name: "Ash Titan Sentinel", tag: "construct", art: "art-ember-thane", lvl: [60, 90], skill: ["titan-stomp", "Titan Stomp", "Ground-shaking AoE."], drops: ["ash-titan-plate"] },
  { id: "ley-storm-elemental-lord", name: "Ley Storm Elemental Lord", tag: "elemental", art: "art-dragon-silhouette", lvl: [62, 92], skill: ["ley-burst", "Ley Burst", "Arcane lightning storm."], drops: ["ley-storm-core"] },
  { id: "pale-dragon-spawn-prince", name: "Pale Dragon Spawn Prince", tag: "dragon", art: "art-dragon-silhouette", lvl: [65, 95], skill: ["pale-breath", "Pale Breath", "Necrotic dragon breath."], drops: ["pale-dragon-fang"] },
  { id: "root-of-all-thorns", name: "Root of All Thorns", tag: "fey", art: "art-stag-aelwyn", lvl: [68, 98], skill: ["thorn-maze", "Thorn Maze", "Thorns damage all who move."], drops: ["root-thorn-circlet"] },
  { id: "cathedral-gargoyle-colossus", name: "Cathedral Gargoyle Colossus", tag: "construct", art: "art-bear-bruna", lvl: [70, 96], skill: ["stone-gaze", "Stone Gaze", "Petrifying stare."], drops: ["gargoyle-stone-wings"] },
  { id: "bog-emperor", name: "Bog Emperor", tag: "aberration", art: "art-serpent-nyx", lvl: [72, 100], skill: ["emperor-sludge", "Emperor Sludge", "Massive toxic eruption."], drops: ["bog-emperor-mantle"] },
  { id: "hollow-king-knight", name: "Hollow King Knight", tag: "undead", art: "art-demon-herald", lvl: [75, 100], skill: ["hollow-strike", "Hollow Strike", "Ignores armor."], drops: ["hollow-king-greatsword"] },
  { id: "skyfire-wyrm-ancient", name: "Ancient Skyfire Wyrm", tag: "dragon", art: "art-dragon-silhouette", lvl: [78, 100], skill: ["skyfire-rain", "Skyfire Rain", "Fire rains from above."], drops: ["skyfire-wyrm-scale-mail"] },
  { id: "wild-law-stag-king", name: "Wild Law Stag King", tag: "fey", art: "art-stag-aelwyn", lvl: [80, 100], skill: ["wild-judgment", "Wild Judgment", "Nature's verdict on trespassers."], drops: ["stag-kings-antlers"] },
  { id: "demon-herald-scout", name: "Demon Herald Scout", tag: "undead", art: "art-demon-herald", lvl: [45, 75], skill: ["herald-shriek", "Herald Shriek", "Fear and damage."], drops: ["herald-scout-horn"] },
  { id: "world-eater-larva", name: "World-Eater Larva", tag: "aberration", art: "art-serpent-nyx", lvl: [55, 88], skill: ["maw-growth", "Maw Growth", "Growing hunger damage."], drops: ["world-eater-tooth"] },
  { id: "ashen-king", name: "Ashen King", tag: "undead", art: "art-ember-thane", lvl: [85, 100], skill: ["ash-throne", "Ash Throne", "Crown of cooled dragon-glass burns."], drops: ["crown-of-ashen-king", "ashen-kings-scepter"] },
  { id: "ember-thane-lord", name: "Ember Thane Lord", tag: "humanoid", art: "art-ember-thane", lvl: [50, 78], skill: ["thane-decree", "Thane Decree", "Hold law empowers allies."], drops: ["ember-thane-signet"] },
  { id: "corv-raven-trial", name: "Corv's Raven Trial", tag: "fey", art: "art-raven-corv", lvl: [35, 60], skill: ["census-strike", "Census Strike", "Names foes for extra damage."], drops: ["corv-trial-feather"] },
  { id: "bruna-bear-trial", name: "Bruna's Bear Trial", tag: "beast", art: "art-bear-bruna", lvl: [33, 58], skill: ["bear-rush", "Bear Rush", "Unstoppable charge."], drops: ["bruna-trial-claw"] },
  { id: "ulfric-wolf-trial", name: "Ulfric's Wolf Trial", tag: "beast", art: "art-wolf-ulfric", lvl: [31, 56], skill: ["alpha-howl", "Alpha Howl", "Pack frenzy buff."], drops: ["ulfric-trial-fang"] },
  { id: "nyx-serpent-trial", name: "Nyx's Serpent Trial", tag: "aberration", art: "art-serpent-nyx", lvl: [40, 68], skill: ["serpent-coil", "Serpent Coil", "Constrict and poison."], drops: ["nyx-trial-scale"] },
  { id: "pip-fox-trial", name: "Pip's Fox Trial", tag: "fey", art: "art-fox-pip", lvl: [28, 50], skill: ["fox-trick", "Fox Trick", "Distracts and backstabs."], drops: ["pip-trial-tail"] },
  { id: "aelwyn-stag-trial", name: "Aelwyn's Stag Trial", tag: "fey", art: "art-stag-aelwyn", lvl: [36, 62], skill: ["stag-charge", "Stag Charge", "Antler gore with grace."], drops: ["aelwyn-trial-antler"] },
];

function buildBosses() {
  return BOSS_DEFS.map((b) => {
    const mid = Math.floor((b.lvl[0] + b.lvl[1]) / 2);
    const s = statsForLevel(mid, b.tag);
    const bossHp = Math.min(500, Math.round(s.hp * 2.5));
    const bossPower = Math.min(50, s.power + 8);
    const bossArmor = s.armor + 2;
    return {
      id: b.id,
      name: b.name,
      blurb: pick(BLURBS, BOSS_DEFS.indexOf(b)),
      levelMin: b.lvl[0],
      levelMax: b.lvl[1],
      hp: bossHp,
      power: bossPower,
      armor: bossArmor,
      xp: Math.round(s.xp * 4),
      gold: Math.round(s.gold * 3),
      tags: ["boss", b.tag],
      artId: b.art,
      uniqueSkill: {
        id: b.skill[0],
        name: b.skill[1],
        blurb: b.skill[2],
        power: Math.min(45, bossPower + 6),
        manaCost: 0,
      },
      uniqueDrops: b.drops,
      weight: 1,
    };
  });
}

// ── Spellbooks (~20) ──────────────────────────────────────
const SPELLBOOK_DEFS = [
  { id: "spellbook-frostbolt", name: "Tome of Frostbolt", spell: "spell-frostbolt", sname: "Frostbolt", blurb: "A shard of winter.", node: "magic-frostbolt-tome", mana: 8, power: 14, tags: ["spell", "frost", "damage"] },
  { id: "spellbook-ember-lance", name: "Tome of Ember Lance", spell: "spell-ember-lance", sname: "Ember Lance", blurb: "A spear of banked coals.", node: "magic-ember-lance-tome", mana: 10, power: 16, tags: ["spell", "fire", "damage"] },
  { id: "spellbook-healing-light", name: "Tome of Healing Light", spell: "spell-healing-light", sname: "Healing Light", blurb: "Warm dawn on wounded skin.", node: "magic-healing-light-tome", mana: 12, power: 0, heal: 30, tags: ["spell", "holy", "heal"] },
  { id: "spellbook-arcane-bolt", name: "Tome of Arcane Bolt", spell: "spell-arcane-bolt", sname: "Arcane Bolt", blurb: "Raw ley force, barely contained.", node: "magic-arcane-bolt-tome", mana: 7, power: 12, tags: ["spell", "arcane", "damage"] },
  { id: "spellbook-thorn-whip", name: "Tome of Thorn Whip", spell: "spell-thorn-whip", sname: "Thorn Whip", blurb: "Wild law lashes trespassers.", node: "magic-thorn-whip-tome", mana: 9, power: 13, tags: ["spell", "nature", "damage"] },
  { id: "spellbook-mist-veil", name: "Tome of Mist Veil", spell: "spell-mist-veil", sname: "Mist Veil", blurb: "Fog hides allies from harm.", node: "magic-mist-veil-tome", mana: 14, power: 0, tags: ["spell", "ward", "buff"] },
  { id: "spellbook-chain-lightning", name: "Tome of Chain Lightning", spell: "spell-chain-lightning", sname: "Chain Lightning", blurb: "Thunder jumps between foes.", node: "magic-chain-lightning-tome", mana: 18, power: 20, tags: ["spell", "storm", "damage"] },
  { id: "spellbook-life-drain", name: "Tome of Life Drain", spell: "spell-life-drain", sname: "Life Drain", blurb: "Steals breath to mend your own.", node: "magic-life-drain-tome", mana: 11, power: 15, tags: ["spell", "shadow", "damage"] },
  { id: "spellbook-stone-skin", name: "Tome of Stone Skin", spell: "spell-stone-skin", sname: "Stone Skin", blurb: "Skin like mountain granite.", node: "magic-stone-skin-tome", mana: 16, power: 0, tags: ["spell", "earth", "buff"] },
  { id: "spellbook-swift-wind", name: "Tome of Swift Wind", spell: "spell-swift-wind", sname: "Swift Wind", blurb: "A gust at your back.", node: "magic-swift-wind-tome", mana: 10, power: 0, tags: ["spell", "air", "buff"] },
  { id: "spellbook-poison-cloud", name: "Tome of Poison Cloud", spell: "spell-poison-cloud", sname: "Poison Cloud", blurb: "Swamp breath made visible.", node: "magic-poison-cloud-tome", mana: 13, power: 10, tags: ["spell", "poison", "damage"] },
  { id: "spellbook-greater-heal", name: "Tome of Greater Heal", spell: "spell-greater-heal", sname: "Greater Heal", blurb: "Deep mending for grave wounds.", node: "magic-greater-heal-tome", mana: 22, power: 0, heal: 55, tags: ["spell", "holy", "heal"] },
  { id: "spellbook-ice-prison", name: "Tome of Ice Prison", spell: "spell-ice-prison", sname: "Ice Prison", blurb: "Winter cages a foe.", node: "magic-ice-prison-tome", mana: 15, power: 8, tags: ["spell", "frost", "control"] },
  { id: "spellbook-flame-wave", name: "Tome of Flame Wave", spell: "spell-flame-wave", sname: "Flame Wave", blurb: "Heat rolls like a tide.", node: "magic-flame-wave-tome", mana: 17, power: 18, tags: ["spell", "fire", "damage"] },
  { id: "spellbook-blessing-of-oaths", name: "Tome of Blessing of Oaths", spell: "spell-blessing-oaths", sname: "Blessing of Oaths", blurb: "Keeps your word — and your allies'.", node: "magic-blessing-oaths-tome", mana: 14, power: 0, tags: ["spell", "holy", "buff"] },
  { id: "spellbook-shadow-step", name: "Tome of Shadow Step", spell: "spell-shadow-step", sname: "Shadow Step", blurb: "Step between pools of darkness.", node: "magic-shadow-step-tome", mana: 12, power: 0, tags: ["spell", "shadow", "buff"] },
  { id: "spellbook-starfall", name: "Tome of Starfall", spell: "spell-starfall", sname: "Starfall", blurb: "A piece of sky falls on your foe.", node: "magic-starfall-tome", mana: 24, power: 28, tags: ["spell", "arcane", "damage"] },
  { id: "spellbook-natures-embrace", name: "Tome of Nature's Embrace", spell: "spell-natures-embrace", sname: "Nature's Embrace", blurb: "The forest mends its own.", node: "magic-natures-embrace-tome", mana: 18, power: 0, heal: 40, tags: ["spell", "nature", "heal"] },
  { id: "spellbook-ward-circle", name: "Tome of Ward Circle", spell: "spell-ward-circle", sname: "Ward Circle", blurb: "A ring of protection on the ground.", node: "magic-ward-circle-tome", mana: 16, power: 0, tags: ["spell", "ward", "buff"] },
  { id: "spellbook-soul-spark", name: "Tome of Soul Spark", spell: "spell-soul-spark", sname: "Soul Spark", blurb: "A spark of spirit-fire.", node: "magic-soul-spark-tome", mana: 9, power: 11, tags: ["spell", "spirit", "damage"] },
];

function buildSpellbooks() {
  return SPELLBOOK_DEFS.map((sb) => ({
    id: sb.id,
    name: sb.name,
    blurb: `Read to learn ${sb.sname}.`,
    teachesAbilityId: sb.spell,
    ability: {
      id: sb.spell,
      name: sb.sname,
      tree: "magic",
      kind: "spell",
      blurb: sb.blurb,
      nodeId: sb.node,
      cost: { mana: sb.mana },
      power: sb.power,
      ...(sb.heal ? { heal: sb.heal } : {}),
      tags: sb.tags,
    },
  }));
}

// ── Battle loot ───────────────────────────────────────────
function buildBattleLoot(bosses, spellbooks) {
  const items = [
    // Consumables — core
    { id: "trail-rations", name: "Trail Rations", blurb: "Dried meat, hard bread, a strip of cheese.", tier: "common", slot: "consumable", heal: 8, tags: ["food"], rarity: "common" },
    { id: "healing-potion", name: "Healing Potion", blurb: "Red vial of mountain herbs.", tier: "common", slot: "consumable", heal: 25, tags: ["potion", "heal"], rarity: "common" },
    { id: "mana-draught", name: "Mana Draught", blurb: "Blue mist in a crystal phial.", tier: "magic", slot: "consumable", manaRestore: 20, tags: ["potion", "mana"], rarity: "magic" },
    { id: "greater-heal", name: "Greater Healing Potion", blurb: "Deep red of mountain orchids.", tier: "magic", slot: "consumable", heal: 50, tags: ["potion", "heal"], rarity: "magic" },
    { id: "greater-mana", name: "Greater Mana Draught", blurb: "Starlight corked in glass.", tier: "magic", slot: "consumable", manaRestore: 45, tags: ["potion", "mana"], rarity: "magic" },
    { id: "hound-treat", name: "Hound's Treat", blurb: "Dried liver — your companion's favorite.", tier: "common", slot: "consumable", heal: 5, tags: ["dog", "food"], rarity: "common" },
    // New food
    { id: "smoked-trout", name: "Smoked Trout", blurb: "River fish from the Misty Ford.", tier: "common", slot: "consumable", heal: 14, tags: ["food"], rarity: "common" },
    { id: "hearth-bread", name: "Hearth Bread", blurb: "Still warm from a roadside oven.", tier: "common", slot: "consumable", heal: 10, tags: ["food"], rarity: "common" },
    { id: "wild-berry-jam", name: "Wild Berry Jam", blurb: "Sweet enough to forget the road.", tier: "common", slot: "consumable", heal: 12, tags: ["food"], rarity: "common" },
    { id: "peak-mutton", name: "Peak Mutton", blurb: "Salted highland sheep.", tier: "common", slot: "consumable", heal: 18, tags: ["food"], rarity: "common" },
    { id: "bog-mushroom-stew", name: "Bog Mushroom Stew", blurb: "Earthy and oddly filling.", tier: "common", slot: "consumable", heal: 16, tags: ["food"], rarity: "common" },
    { id: "honey-cake", name: "Honey Cake", blurb: "Fey-market sweet that restores spirit.", tier: "magic", slot: "consumable", heal: 22, manaRestore: 10, tags: ["food"], rarity: "magic" },
    { id: "ember-cider", name: "Ember Cider", blurb: "Warm spiced cider from the Hold.", tier: "common", slot: "consumable", heal: 11, tags: ["food"], rarity: "common" },
    { id: "forage-roots", name: "Forage Roots", blurb: "Bitter bulbs that sweeten in stew.", tier: "common", slot: "consumable", heal: 5, tags: ["food"], rarity: "common" },
    { id: "stamina-tea", name: "Stamina Tea", blurb: "Bitter green brew for long marches.", tier: "common", slot: "consumable", heal: 6, tags: ["food"], rarity: "common" },
    // Common weapons/armor
    { id: "iron-sword", name: "Iron Longsword", blurb: "A hold-forged blade, honest and plain.", tier: "common", slot: "weapon", power: 6, tags: ["weapon", "melee"], rarity: "common" },
    { id: "hunting-bow", name: "Hunting Bow", blurb: "Yew and sinew — good for deer and goblins.", tier: "common", slot: "weapon", power: 5, tags: ["weapon", "ranged"], rarity: "common" },
    { id: "oak-staff", name: "Oak Staff", blurb: "A traveler's stick that hums at ley lines.", tier: "common", slot: "weapon", power: 4, tags: ["weapon", "staff"], rarity: "common" },
    { id: "bronze-dagger", name: "Bronze Dagger", blurb: "Short and honest — a rogue's first friend.", tier: "common", slot: "weapon", power: 4, tags: ["weapon", "melee"], rarity: "common" },
    { id: "leather-cap", name: "Leather Cap", blurb: "Keeps rain and glancing blades at bay.", tier: "common", slot: "head", armor: 1, tags: ["armor"], rarity: "common" },
    { id: "hide-jerkin", name: "Hide Jerkin", blurb: "Soft hide of the northern woods.", tier: "common", slot: "chest", armor: 2, tags: ["armor"], rarity: "common" },
    { id: "travel-gloves", name: "Travel Gloves", blurb: "Worn leather for rope and bowstring.", tier: "common", slot: "hands", armor: 1, tags: ["armor"], rarity: "common" },
    { id: "wool-trousers", name: "Wool Trousers", blurb: "Warm enough for Misty Hill roads.", tier: "common", slot: "legs", armor: 1, tags: ["armor"], rarity: "common" },
    { id: "wood-shield", name: "Wooden Shield", blurb: "Painted with a crude wolf.", tier: "common", slot: "offhand", armor: 2, tags: ["armor", "shield"], rarity: "common" },
    { id: "copper-ring", name: "Copper Ring", blurb: "A keepsake from home.", tier: "common", slot: "accessory", tags: ["accessory"], rarity: "common" },
    { id: "iron-greaves", name: "Iron Greaves", blurb: "Clanky, warm, reliable.", tier: "common", slot: "legs", armor: 2, tags: ["armor"], rarity: "common" },
    { id: "round-buckler", name: "Round Buckler", blurb: "A disc of pine banded in iron.", tier: "common", slot: "offhand", armor: 2, tags: ["armor", "shield"], rarity: "common" },
    // Magic gear
    { id: "frostbite-blade", name: "Frostbite Blade", blurb: "Steel rimed with everlasting chill.", tier: "magic", slot: "weapon", power: 12, tags: ["weapon", "frost"], rarity: "magic" },
    { id: "elven-bow", name: "Elven Longbow", blurb: "Light as moonbeam, true as oath.", tier: "magic", slot: "weapon", power: 11, tags: ["weapon", "ranged"], rarity: "magic" },
    { id: "staff-of-embers", name: "Staff of Embers", blurb: "A core of banked dragon-coal.", tier: "magic", slot: "weapon", power: 13, tags: ["weapon", "fire"], rarity: "magic" },
    { id: "mail-of-rivendell", name: "Mail of Rivendell Roads", blurb: "Rings that sing when danger nears.", tier: "magic", slot: "chest", armor: 6, tags: ["armor"], rarity: "magic" },
    { id: "amulet-of-warding", name: "Amulet of Warding", blurb: "A soft ward against hex and fang.", tier: "magic", slot: "accessory", armor: 2, tags: ["accessory"], rarity: "magic" },
    { id: "moonsteel-saber", name: "Moonsteel Saber", blurb: "Edges that drink moonlight.", tier: "magic", slot: "weapon", power: 14, tags: ["weapon"], rarity: "magic" },
    { id: "storm-javelin", name: "Storm Javelin", blurb: "Throws like thunder remembers.", tier: "magic", slot: "weapon", power: 13, tags: ["weapon"], rarity: "magic" },
    { id: "wardens-helm", name: "Warden's Helm", blurb: "Visor etched with raven-marks.", tier: "magic", slot: "head", armor: 4, tags: ["armor"], rarity: "magic" },
    { id: "pack-leather", name: "Pack-Leather Cuirass", blurb: "Soft armor that flexes with the hunt.", tier: "magic", slot: "chest", armor: 5, tags: ["armor"], rarity: "magic" },
    { id: "ember-gauntlets", name: "Ember Gauntlets", blurb: "Heat without burn.", tier: "magic", slot: "hands", armor: 3, power: 2, tags: ["armor"], rarity: "magic" },
    { id: "mist-striders", name: "Mist-Strider Greaves", blurb: "Steps that leave no name for fog to steal.", tier: "magic", slot: "legs", armor: 4, tags: ["armor"], rarity: "magic" },
    { id: "serpent-buckler", name: "Serpent Buckler", blurb: "A coil of dusk-steel.", tier: "magic", slot: "offhand", armor: 4, tags: ["armor"], rarity: "magic" },
    { id: "ring-of-oaths", name: "Ring of Oaths", blurb: "Warm when you keep your word.", tier: "magic", slot: "accessory", armor: 1, tags: ["accessory"], rarity: "magic" },
    { id: "fang-amulet", name: "Fang Amulet", blurb: "Ulfric's token — kinship made metal.", tier: "magic", slot: "accessory", power: 2, tags: ["accessory"], rarity: "magic" },
    { id: "ash-philter", name: "Ash Philter", blurb: "One sip steadies the hand.", tier: "magic", slot: "consumable", manaRestore: 25, tags: ["potion"], rarity: "magic" },
    // Rare
    { id: "frostward-greatsword", name: "Frostward Greatsword", blurb: "Forged to guard the Frostford pass.", tier: "magic", slot: "weapon", power: 18, tags: ["weapon", "frost"], rarity: "rare" },
    { id: "swamp-walker-boots", name: "Swamp Walker Boots", blurb: "Never sink in bog or mire.", tier: "magic", slot: "legs", armor: 3, tags: ["armor"], rarity: "rare" },
    { id: "peak-climber-axe", name: "Peak Climber Axe", blurb: "Bites ice and stone alike.", tier: "magic", slot: "weapon", power: 16, tags: ["weapon"], rarity: "rare" },
    { id: "gloomwood-cloak", name: "Gloomwood Cloak", blurb: "Shadows cling like old friends.", tier: "magic", slot: "accessory", armor: 2, tags: ["accessory"], rarity: "rare" },
    { id: "ley-touched-ring", name: "Ley-Touched Ring", blurb: "Hums when spells are cast nearby.", tier: "magic", slot: "accessory", power: 3, tags: ["accessory"], rarity: "rare" },
    { id: "dragon-scale-shard", name: "Dragon Scale Shard", blurb: "Shed whisper-scale — forge fuel.", tier: "magic", slot: "misc", tags: ["misc"], rarity: "rare" },
    { id: "neverwood-recurve", name: "Neverwood Recurve", blurb: "Bow of living yew, still growing.", tier: "magic", slot: "weapon", power: 17, tags: ["weapon"], rarity: "rare" },
    { id: "mire-witch-hood", name: "Mire Witch Hood", blurb: "Smells of peat and old bargains.", tier: "magic", slot: "head", armor: 3, tags: ["armor"], rarity: "rare" },
    // Legendary
    { id: "bow-of-three-names", name: "Bow of Three Names", blurb: "Stringed for three walkers.", tier: "legendary", slot: "weapon", power: 26, tags: ["weapon", "legendary"], rarity: "legendary" },
    { id: "staff-of-ley-hounds", name: "Staff of Ley-Hounds", blurb: "Arcane wood that hums when hounds howl.", tier: "legendary", slot: "weapon", power: 27, tags: ["weapon", "legendary"], rarity: "legendary" },
    { id: "helm-of-the-soft-path", name: "Helm of the Soft Path", blurb: "Moss grows in the creases.", tier: "legendary", slot: "head", armor: 6, power: 3, tags: ["armor", "legendary"], rarity: "legendary" },
    { id: "plate-of-the-hearth", name: "Plate of the Hearth", blurb: "Armor that warms allies within a step.", tier: "legendary", slot: "chest", armor: 10, tags: ["armor", "legendary"], rarity: "legendary" },
    { id: "sword-of-the-chronicle", name: "Sword of the Chronicle", blurb: "Forged for three names and three hounds.", tier: "legendary", slot: "weapon", power: 28, tags: ["weapon", "legendary"], rarity: "legendary" },
    { id: "crown-of-ash", name: "Crown of Ash", blurb: "Circlet of cooled dragon-glass.", tier: "legendary", slot: "head", armor: 4, power: 4, tags: ["armor", "legendary"], rarity: "legendary" },
    { id: "cloak-of-fellowship", name: "Cloak of Fellowship", blurb: "Three walkers never lose each other's trail.", tier: "legendary", slot: "accessory", armor: 3, tags: ["accessory", "legendary"], rarity: "legendary" },
    { id: "elixir-of-destiny", name: "Elixir of Destiny", blurb: "One dose before the finale.", tier: "legendary", slot: "consumable", heal: 100, tags: ["potion", "legendary"], rarity: "legendary" },
  ];

  // Spellbook items (misc slot, reference spellbooks.json)
  for (const sb of spellbooks) {
    items.push({
      id: sb.id,
      name: sb.name,
      blurb: sb.blurb,
      tier: "magic",
      slot: "misc",
      tags: ["spellbook"],
      rarity: "magic",
    });
  }

  const trashPool = [
    "trail-rations", "healing-potion", "mana-draught", "hound-treat",
    "smoked-trout", "hearth-bread", "wild-berry-jam", "forage-roots",
    "stamina-tea", "copper-ring", "ember-cider",
  ];
  const commonPool = [
    "iron-sword", "hunting-bow", "oak-staff", "bronze-dagger",
    "leather-cap", "hide-jerkin", "travel-gloves", "wool-trousers",
    "wood-shield", "iron-greaves", "round-buckler", "peak-mutton",
    "bog-mushroom-stew", "healing-potion", "trail-rations",
  ];
  const magicPool = [
    "frostbite-blade", "elven-bow", "staff-of-embers", "mail-of-rivendell",
    "amulet-of-warding", "moonsteel-saber", "storm-javelin", "wardens-helm",
    "pack-leather", "ember-gauntlets", "mist-striders", "serpent-buckler",
    "ring-of-oaths", "fang-amulet", "greater-heal", "greater-mana",
    "ash-philter", "honey-cake",
    ...spellbooks.map((s) => s.id),
  ];
  const rarePool = [
    "frostward-greatsword", "swamp-walker-boots", "peak-climber-axe",
    "gloomwood-cloak", "ley-touched-ring", "dragon-scale-shard",
    "neverwood-recurve", "mire-witch-hood",
  ];
  const legendaryPool = [
    "bow-of-three-names", "staff-of-ley-hounds", "helm-of-the-soft-path",
    "plate-of-the-hearth", "sword-of-the-chronicle", "crown-of-ash",
    "cloak-of-fellowship", "elixir-of-destiny",
  ];

  const bossUniques = bosses.flatMap((b) =>
    b.uniqueDrops.map((dropId) => {
      const nice = dropId.split("-").map((w) => w.charAt(0).toUpperCase() + w.slice(1)).join(" ");
      const isLegendary = b.levelMax >= 80;
      const slot = dropId.includes("crown") || dropId.includes("mask") || dropId.includes("helm") || dropId.includes("hood") || dropId.includes("antler") || dropId.includes("circlet")
        ? "head"
        : dropId.includes("cloak") || dropId.includes("mantle") || dropId.includes("pelt") || dropId.includes("shroud") || dropId.includes("banner")
          ? "accessory"
          : dropId.includes("plate") || dropId.includes("scale-mail") || dropId.includes("gorget")
            ? "chest"
            : dropId.includes("ring") || dropId.includes("signet") || dropId.includes("talisman") || dropId.includes("brand") || dropId.includes("feather") || dropId.includes("quill") || dropId.includes("fang") || dropId.includes("claw") || dropId.includes("scale") || dropId.includes("tail") || dropId.includes("horn") || dropId.includes("core") || dropId.includes("acorn") || dropId.includes("scepter") || dropId.includes("shard") || dropId.includes("tooth") || dropId.includes("sac") || dropId.includes("antenna")
              ? "accessory"
              : dropId.includes("staff") || dropId.includes("scepter")
                ? "weapon"
                : "weapon";
      return {
        id: dropId,
        name: nice,
        blurb: `Unique trophy from ${b.name}.`,
        tier: isLegendary ? "legendary" : "magic",
        slot,
        power: isLegendary ? 8 : 5,
        armor: slot === "head" || slot === "chest" ? (isLegendary ? 6 : 4) : 0,
        tags: ["boss-unique", isLegendary ? "legendary" : "magic"],
        rarity: isLegendary ? "legendary" : "rare",
        bossId: b.id,
      };
    }),
  );

  return {
    pools: { trash: trashPool, common: commonPool, magic: magicPool, rare: rarePool, legendary: legendaryPool },
    items,
    bossUniques,
  };
}

// ── Main ────────────────────────────────────────────────────
const creatures = buildCreatures();
const bosses = buildBosses();
const spellbooks = buildSpellbooks();
const battleLoot = buildBattleLoot(bosses, spellbooks);

writeFileSync(join(OUT, "creatures.json"), JSON.stringify({ creatures }, null, 2) + "\n");
writeFileSync(join(OUT, "bosses.json"), JSON.stringify({ bosses }, null, 2) + "\n");
writeFileSync(join(OUT, "spellbooks.json"), JSON.stringify({ spellbooks }, null, 2) + "\n");
writeFileSync(join(OUT, "battle-loot.json"), JSON.stringify(battleLoot, null, 2) + "\n");

const lootItemCount = battleLoot.items.length + battleLoot.bossUniques.length;

console.log("Generated Neverworld battle content:");
console.log(`  data/party-chronicle/creatures.json  — ${creatures.length} creatures`);
console.log(`  data/party-chronicle/bosses.json     — ${bosses.length} bosses`);
console.log(`  data/party-chronicle/spellbooks.json — ${spellbooks.length} spellbooks`);
console.log(`  data/party-chronicle/battle-loot.json — ${lootItemCount} loot items (${battleLoot.items.length} items + ${battleLoot.bossUniques.length} boss uniques)`);
