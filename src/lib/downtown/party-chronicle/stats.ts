/**
 * Neverworld effective character stats from base + equipped gear + set bonuses.
 */

import { getGear, getGearSet, listGearSets } from "./gear";
import type {
  CharacterSave,
  EquipSlot,
  GearItem,
  GearProperty,
  GearPropertyKey,
  GearSetBonus,
  GearSetDef,
  Stats,
} from "./types";
import { EQUIP_SLOTS, STAT_KEYS } from "./types";

const PROP_LABEL: Record<GearPropertyKey, string> = {
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

export function formatProperty(p: GearProperty): string {
  if (p.label) return p.label;
  const sign = p.value >= 0 ? "+" : "";
  return `${sign}${p.value} ${PROP_LABEL[p.key]}`;
}

export type ItemStatDelta = {
  itemId: string;
  name: string;
  slot: EquipSlot | "consumable" | "misc";
  tier: GearItem["tier"];
  setId?: string;
  properties: GearProperty[];
  power: number;
  armor: number;
};

export type ActiveSetBonus = {
  set: GearSetDef;
  equippedCount: number;
  bonus: GearSetBonus;
};

export type EffectiveStats = {
  /** Base sheet stats (before gear). */
  baseStats: Stats;
  /** Stats after gear + set bonuses. */
  stats: Stats;
  maxHp: number;
  maxMana: number;
  /** Flat attack from weapon power + atk affixes. */
  atk: number;
  /** Flat defense from armor + def affixes. */
  def: number;
  crit: number;
  resist: number;
  /** Aggregated property deltas (gear + sets). */
  deltas: Partial<Record<GearPropertyKey, number>>;
  /** Per equipped item contribution (for paperdoll tooltips). */
  perItem: ItemStatDelta[];
  /** Set bonuses currently active. */
  setBonuses: ActiveSetBonus[];
};

function emptyDeltas(): Partial<Record<GearPropertyKey, number>> {
  return {};
}

function addProp(
  deltas: Partial<Record<GearPropertyKey, number>>,
  p: GearProperty
) {
  deltas[p.key] = (deltas[p.key] ?? 0) + p.value;
}

function itemProperties(item: GearItem): GearProperty[] {
  const props = item.properties?.length ? [...item.properties] : [];
  const hasAtk = props.some((p) => p.key === "atk");
  const hasDef = props.some((p) => p.key === "def");
  // power/armor OR atk/def affixes — never both.
  if (!hasAtk && item.power) {
    props.push({
      key: "atk",
      value: item.power,
      label: `+${item.power} ATK`,
    });
  }
  if (!hasDef && item.armor) {
    props.push({
      key: "def",
      value: item.armor,
      label: `+${item.armor} DEF`,
    });
  }
  return props;
}

export function equippedItemIds(char: CharacterSave): string[] {
  const ids: string[] = [];
  for (const slot of EQUIP_SLOTS) {
    const id = char.equipped[slot];
    if (id) ids.push(id);
  }
  return ids;
}

export function countSetPieces(char: CharacterSave, set: GearSetDef): number {
  const worn = new Set(equippedItemIds(char));
  return set.pieceIds.filter((id) => worn.has(id)).length;
}

/** Highest matching bonuses for a set (2/3/full), cumulative. */
export function activeBonusesForSet(
  set: GearSetDef,
  equippedCount: number
): GearSetBonus[] {
  return set.bonuses
    .filter((b) => equippedCount >= b.pieces)
    .sort((a, b) => a.pieces - b.pieces);
}

export function computeEffectiveStats(char: CharacterSave): EffectiveStats {
  const baseStats = { ...char.stats };
  const deltas = emptyDeltas();
  const perItem: ItemStatDelta[] = [];

  for (const slot of EQUIP_SLOTS) {
    const id = char.equipped[slot];
    if (!id) continue;
    const item = getGear(id);
    if (!item) continue;
    const props = itemProperties(item);
    for (const p of props) addProp(deltas, p);
    perItem.push({
      itemId: id,
      name: item.name,
      slot: item.slot,
      tier: item.tier,
      setId: item.setId,
      properties: props,
      power: item.power ?? 0,
      armor: item.armor ?? 0,
    });
  }

  const setBonuses: ActiveSetBonus[] = [];
  for (const set of listGearSets()) {
    const equippedCount = countSetPieces(char, set);
    if (equippedCount < 2) continue;
    for (const bonus of activeBonusesForSet(set, equippedCount)) {
      setBonuses.push({ set, equippedCount, bonus });
      for (const p of bonus.properties) addProp(deltas, p);
    }
  }

  const stats: Stats = { ...baseStats };
  for (const key of STAT_KEYS) {
    stats[key] = baseStats[key] + (deltas[key] ?? 0);
  }

  const maxHp = char.maxHp + (deltas.maxHp ?? 0);
  const maxMana = char.maxMana + (deltas.maxMana ?? 0);
  const atk = deltas.atk ?? 0;
  const def = deltas.def ?? 0;
  const crit = deltas.crit ?? 0;
  const resist = deltas.resist ?? 0;

  return {
    baseStats,
    stats,
    maxHp,
    maxMana,
    atk,
    def,
    crit,
    resist,
    deltas,
    perItem,
    setBonuses,
  };
}

/** Battle-facing attack power (weapon + affixes + STR mod). */
export function battleAttackPower(char: CharacterSave): number {
  const eff = computeEffectiveStats(char);
  const strMod = Math.floor((eff.stats.strength - 10) / 2);
  return Math.max(1, eff.atk + strMod);
}

/** Battle-facing armor (gear armor + def + resist/2). */
export function battleArmor(char: CharacterSave): number {
  const eff = computeEffectiveStats(char);
  return Math.max(0, Math.floor(eff.def + eff.resist * 0.5));
}

/** Effective max HP including gear (does not mutate save). */
export function battleMaxHp(char: CharacterSave): number {
  return computeEffectiveStats(char).maxHp;
}

export function battleMaxMana(char: CharacterSave): number {
  return computeEffectiveStats(char).maxMana;
}

export function getSetProgress(char: CharacterSave): {
  set: GearSetDef;
  equipped: number;
  total: number;
  active: GearSetBonus[];
}[] {
  return listGearSets()
    .map((set) => {
      const equipped = countSetPieces(char, set);
      return {
        set,
        equipped,
        total: set.pieceIds.length,
        active: activeBonusesForSet(set, equipped),
      };
    })
    .filter((s) => s.equipped > 0);
}

export function describeItemTooltip(item: GearItem): string {
  const lines = [item.blurb];
  const props = itemProperties(item);
  if (props.length) {
    lines.push(props.map(formatProperty).join(" · "));
  }
  if (item.setId) {
    const set = getGearSet(item.setId);
    if (set) lines.push(`Set: ${set.name}`);
  }
  if (item.heal) lines.push(`Restores ${item.heal} HP`);
  if (item.manaRestore) lines.push(`Restores ${item.manaRestore} Mana`);
  if (item.staminaRestore) lines.push(`Restores ${item.staminaRestore} Stamina`);
  return lines.join("\n");
}
