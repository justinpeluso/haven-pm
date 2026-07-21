/**
 * Rebalance DT equippable gear properties by rarity:
 * - common / uncommon: base stat only (power→ATK or armor→DEF), no bonus affixes
 * - rare: base + 1 buff
 * - epic / legendary: base + 2 buffs (damage/armor/resist/stat)
 *
 * Consumables + misc are left alone.
 */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const gearPath = path.join(__dirname, "../data/dungeon-tester/gear.json");

const EQUIP_SLOTS = new Set([
  "weapon",
  "chest",
  "head",
  "hands",
  "legs",
  "offhand",
  "accessory",
]);

const WEAPON_BUFFS = [
  "crit",
  "strength",
  "dexterity",
  "maxHp",
  "resist",
  "atk", // extra damage modifier on top of base power
];

const ARMOR_BUFFS = [
  "resist",
  "constitution",
  "maxHp",
  "strength",
  "dexterity",
  "def", // extra armor on top of base
];

const ACCESSORY_BUFFS = [
  "crit",
  "charisma",
  "maxMana",
  "wisdom",
  "intelligence",
  "maxHp",
  "resist",
];

const LABELS = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
  maxHp: "HP",
  maxMana: "MP",
  atk: "ATK",
  def: "DEF",
  crit: "CRIT",
  resist: "ARM",
};

function hashId(id) {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h;
}

function normalizeRarity(item) {
  const r = item.rarity || item.tier || "common";
  return r === "magic" ? "uncommon" : r;
}

/** Bonus affix count from rarity ladder. */
function bonusCount(rarity) {
  if (rarity === "common" || rarity === "uncommon") return 0;
  if (rarity === "rare") return 1;
  return 2; // epic, legendary
}

function buffPool(slot) {
  if (slot === "weapon") return WEAPON_BUFFS;
  if (slot === "accessory") return ACCESSORY_BUFFS;
  return ARMOR_BUFFS;
}

function buffValue(key, rarity, seed) {
  const tierBase =
    rarity === "rare" ? 1 : rarity === "epic" ? 2 : rarity === "legendary" ? 3 : 1;
  const jitter = seed % 3;
  if (key === "maxHp") return tierBase * 4 + jitter + 4;
  if (key === "maxMana") return tierBase * 3 + jitter + 2;
  if (key === "crit") return Math.min(10, tierBase + jitter + 1);
  if (key === "atk" || key === "def") return tierBase + jitter + 1;
  if (key === "resist") return tierBase + (jitter > 0 ? 1 : 0);
  return tierBase + (jitter > 1 ? 1 : 0);
}

function makeProp(key, value) {
  const sign = value >= 0 ? "+" : "";
  return { key, value, label: `${sign}${value} ${LABELS[key] || key}` };
}

function ensureBase(item) {
  if (item.slot === "weapon") {
    const atkProp = (item.properties || []).find((p) => p.key === "atk");
    const power = item.power ?? atkProp?.value ?? 3;
    item.power = Math.max(1, power);
    delete item.armor;
  } else if (item.slot === "accessory") {
    // Accessories: no required base armor; optional tiny power kept if present
    if (item.power == null && item.armor == null) {
      // leave both unset — bonuses only when rarity allows
    }
  } else {
    const defProp = (item.properties || []).find((p) => p.key === "def");
    const armor = item.armor ?? defProp?.value ?? 1;
    item.armor = Math.max(1, armor);
  }
}

function rebalanceItem(item) {
  if (!EQUIP_SLOTS.has(item.slot)) return false;

  const rarity = normalizeRarity(item);
  item.rarity = rarity;
  item.tier = rarity;

  ensureBase(item);

  const n = bonusCount(rarity);
  if (n === 0) {
    item.properties = [];
    return true;
  }

  const pool = buffPool(item.slot);
  const seed = hashId(item.id);
  const used = new Set();
  const props = [];
  for (let i = 0; i < n; i++) {
    let key = pool[(seed + i * 11) % pool.length];
    let guard = 0;
    // First buff: prefer a true bonus, not stacking the base ATK/DEF line
    const blockBase =
      i === 0 &&
      ((item.slot === "weapon" && key === "atk") ||
        (item.slot !== "weapon" &&
          item.slot !== "accessory" &&
          key === "def"));
    if (blockBase) {
      key = pool.find((k) => k !== key) || key;
    }
    while (used.has(key) && guard++ < 20) {
      key = pool[(seed + i * 11 + guard * 3) % pool.length];
    }
    used.add(key);
    props.push(makeProp(key, buffValue(key, rarity, seed + i * 17)));
  }

  item.properties = props;
  return true;
}

const gear = JSON.parse(fs.readFileSync(gearPath, "utf8"));
let changed = 0;
const counts = { common: 0, uncommon: 0, rare: 0, epic: 0, legendary: 0 };
const bonusHist = { 0: 0, 1: 0, 2: 0 };

for (const item of gear.items) {
  if (!EQUIP_SLOTS.has(item.slot)) continue;
  if (rebalanceItem(item)) {
    changed++;
    const r = normalizeRarity(item);
    counts[r] = (counts[r] || 0) + 1;
    bonusHist[bonusCount(r)]++;
  }
}

fs.writeFileSync(gearPath, JSON.stringify(gear, null, 2) + "\n");
console.log("rebalanced", changed, "equip items");
console.log("by rarity", counts);
console.log("bonus counts", bonusHist);

// Spot-check
for (const id of [
  "dt-frontier-revolver",
  "dt-hide-duster",
  "dt-moonsteel-saber",
  "dt-bridge-stone-mail",
]) {
  const it = gear.items.find((x) => x.id === id);
  if (!it) continue;
  console.log(
    id,
    it.rarity,
    "power/armor",
    it.power ?? "-",
    it.armor ?? "-",
    "props",
    JSON.stringify(it.properties)
  );
}
