/**
 * Weapon attack damage scaling — style → attribute → multiplier.
 */

import type { GearItem, Stats } from "../party-chronicle/types";
import {
  resolveWeaponStyle,
  scalingStatForStyle,
  type WeaponScalingStat,
  type WeaponStyle,
} from "./weapon-style";

type StyleSource = Pick<GearItem, "id" | "name" | "tags" | "slot">;
type TipSource = StyleSource & Pick<GearItem, "power">;

/** Tunable: floor(base * (1 + (stat - 10) / 10)); baseline 10 = 1×. */
export function scaleByStat(basePower: number, scalingStat: number): number {
  return Math.max(1, Math.floor(basePower * (1 + (scalingStat - 10) / 10)));
}

/** Multiplier only (no floor) — for tip copy. */
export function scaleFactor(scalingStat: number): number {
  return 1 + (scalingStat - 10) / 10;
}

export const SCALE_STAT_ABBR: Record<WeaponScalingStat, string> = {
  strength: "STR",
  dexterity: "DEX",
  intelligence: "INT",
  wisdom: "WIS",
};

function formatScaleFactor(mult: number): string {
  return String(Math.round(mult * 100) / 100);
}

export type WeaponScaleTip = {
  /** e.g. Damage ≈ power × (1 + (INT − 10) / 10) */
  rule: string;
  /** e.g. At INT 15 → ×1.5 → ~45 dmg — only when power + char stat exist */
  example?: string;
};

/** Slim tip lines for gear hover — rule always; worked example when data allows. */
export function weaponScaleTip(
  item: TipSource,
  stats?: Partial<Stats> | null
): WeaponScaleTip | null {
  if (item.slot !== "weapon") return null;
  const style = resolveWeaponStyle(item);
  const statKey = scalingStatForStyle(style);
  const abbr = SCALE_STAT_ABBR[statKey];
  const rule = `Damage ≈ power × (1 + (${abbr} − 10) / 10)`;

  const power = item.power;
  const rawStat = stats?.[statKey];
  if (power == null || power <= 0 || rawStat == null) {
    return { rule };
  }

  const statValue = Math.max(1, rawStat);
  const mult = scaleFactor(statValue);
  const dmg = scaleByStat(power, statValue);
  return {
    rule,
    example: `At ${abbr} ${statValue} → ×${formatScaleFactor(mult)} → ~${dmg} dmg`,
  };
}

export type WeaponScaling = {
  style: WeaponStyle;
  statKey: WeaponScalingStat;
  statValue: number;
  scale: (basePower: number) => number;
};

/**
 * Resolve style from weapon tags (via weapon-style), then the hero stat that scales damage.
 * Missing / unarmed weapon → melee → strength.
 */
export function resolveWeaponScaling(
  item: StyleSource | null | undefined,
  stats: Partial<Stats> | null | undefined
): WeaponScaling {
  const style = item ? resolveWeaponStyle(item) : "melee";
  const statKey = scalingStatForStyle(style);
  const statValue = Math.max(1, stats?.[statKey] ?? 10);
  return {
    style,
    statKey,
    statValue,
    scale: (basePower) => scaleByStat(basePower, statValue),
  };
}
