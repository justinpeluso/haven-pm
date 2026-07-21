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

/** Tunable: floor(base * (1 + (stat - 10) / 10)); baseline 10 = 1×. */
export function scaleByStat(basePower: number, scalingStat: number): number {
  return Math.max(1, Math.floor(basePower * (1 + (scalingStat - 10) / 10)));
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
