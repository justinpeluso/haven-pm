/**
 * Default / signature gear affixes (base stats + combat mods).
 * Used when an item has no `properties` yet (hand catalog, battle loot).
 */

import type { EquipSlot, GearItem, GearProperty, GearTier } from "./types";

const STAT_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
] as const;

const EXTRA_KEYS = ["maxHp", "maxMana", "atk", "def", "crit", "resist"] as const;
const ALL_PROP_KEYS = [...STAT_KEYS, ...EXTRA_KEYS] as const;

const PROP_LABEL: Record<(typeof ALL_PROP_KEYS)[number], string> = {
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

function label(key: (typeof ALL_PROP_KEYS)[number], value: number): string {
  const sign = value >= 0 ? "+" : "";
  return `${sign}${value} ${PROP_LABEL[key]}`;
}

function pick<T>(arr: readonly T[], i: number): T {
  return arr[i % arr.length]!;
}

function hashId(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) | 0;
  return Math.abs(h);
}

/** Procedural affixes by rarity — base power/armor live on the item; properties are bonuses only. */
export function makeDefaultProperties(
  seed: number,
  tier: GearTier,
  slot: EquipSlot | "consumable" | "misc"
): GearProperty[] {
  if (slot === "consumable" || slot === "misc") return [];

  const rarity = tier === "magic" ? "uncommon" : tier;
  const count =
    rarity === "common" || rarity === "uncommon"
      ? 0
      : rarity === "rare"
        ? 1
        : 2;
  if (count === 0) return [];

  const props: GearProperty[] = [];
  const used = new Set<string>();
  const base =
    rarity === "rare" ? 1 : rarity === "epic" ? 2 : rarity === "legendary" ? 3 : 1;

  const preferred =
    slot === "weapon"
      ? (["crit", "strength", "dexterity", "maxHp", "resist", "atk"] as const)
      : slot === "accessory"
        ? (["maxMana", "intelligence", "wisdom", "charisma", "crit", "resist"] as const)
        : (["constitution", "resist", "maxHp", "strength", "dexterity", "def"] as const);

  for (let i = 0; i < count; i++) {
    let key = pick([...preferred, ...ALL_PROP_KEYS], seed + i * 7);
    let guard = 0;
    while (used.has(key) && guard++ < 20) {
      key = pick(ALL_PROP_KEYS, seed + i * 11 + guard);
    }
    // First affix: avoid duplicating the implicit base ATK/DEF line
    if (i === 0 && slot === "weapon" && key === "atk") key = "crit";
    if (i === 0 && slot !== "weapon" && slot !== "accessory" && key === "def") {
      key = "resist";
    }
    used.add(key);
    let value = base + ((seed + i) % 3);
    if (key === "maxHp") value = base * 4 + ((seed + i) % 5) + 4;
    if (key === "maxMana") value = base * 3 + ((seed + i) % 4) + 2;
    if (key === "crit") value = Math.min(10, base + (i % 3) + 1);
    if (key === "atk" && slot === "weapon") value = base + ((seed + i) % 3) + 1;
    if (key === "def" && slot !== "weapon") value = base + ((seed + i) % 3) + 1;
    props.push({ key, value, label: label(key, value) });
  }
  return props;
}

/** Hand-tuned flavor for named battle-loot standouts. */
const SIGNATURE_PROPERTIES: Record<string, GearProperty[]> = {
  "gloomwood-cloak": [
    { key: "dexterity", value: 3, label: "+3 DEX" },
    { key: "wisdom", value: 2, label: "+2 WIS" },
    { key: "resist", value: 3, label: "+3 Resist" },
    { key: "crit", value: 2, label: "+2 Crit%" },
    { key: "maxHp", value: 10, label: "+10 Max HP" },
  ],
  "ley-touched-ring": [
    { key: "intelligence", value: 3, label: "+3 INT" },
    { key: "maxMana", value: 15, label: "+15 Max Mana" },
    { key: "wisdom", value: 2, label: "+2 WIS" },
    { key: "crit", value: 3, label: "+3 Crit%" },
    { key: "atk", value: 2, label: "+2 ATK" },
  ],
  "amulet-of-warding": [
    { key: "constitution", value: 2, label: "+2 CON" },
    { key: "resist", value: 4, label: "+4 Resist" },
    { key: "maxHp", value: 12, label: "+12 Max HP" },
    { key: "wisdom", value: 2, label: "+2 WIS" },
    { key: "def", value: 2, label: "+2 DEF" },
  ],
  "cloak-of-fellowship": [
    { key: "charisma", value: 4, label: "+4 CHA" },
    { key: "constitution", value: 3, label: "+3 CON" },
    { key: "maxHp", value: 20, label: "+20 Max HP" },
    { key: "resist", value: 4, label: "+4 Resist" },
    { key: "def", value: 3, label: "+3 DEF" },
  ],
  "frostbite-blade": [
    { key: "strength", value: 2, label: "+2 STR" },
    { key: "atk", value: 4, label: "+4 ATK" },
    { key: "crit", value: 3, label: "+3 Crit%" },
    { key: "intelligence", value: 1, label: "+1 INT" },
    { key: "maxHp", value: 8, label: "+8 Max HP" },
  ],
  "ring-of-oaths": [
    { key: "charisma", value: 3, label: "+3 CHA" },
    { key: "wisdom", value: 2, label: "+2 WIS" },
    { key: "maxMana", value: 10, label: "+10 Max Mana" },
    { key: "resist", value: 2, label: "+2 Resist" },
    { key: "def", value: 1, label: "+1 DEF" },
  ],
};

/** Fill missing `properties` so every equippable item shows base-stat bonuses. */
export function ensureItemAffixes(item: GearItem): GearItem {
  if (item.slot === "consumable" || item.slot === "misc") return item;
  if (item.properties?.length) return item;

  const signature = SIGNATURE_PROPERTIES[item.id];
  if (signature) {
    return { ...item, properties: signature };
  }

  return {
    ...item,
    properties: makeDefaultProperties(hashId(item.id), item.tier, item.slot),
  };
}
