"use client";

import type { ReactNode } from "react";
import {
  formatProperty,
  itemProperties,
} from "@/lib/downtown/party-chronicle/stats";
import { getGearSet } from "@/lib/downtown/party-chronicle/gear";
import type { GearItem, Stats } from "@/lib/downtown/party-chronicle/types";
import {
  resolveWeaponStyle,
  scalingStatForStyle,
  type WeaponScalingStat,
} from "@/lib/downtown/dungeon-tester/weapon-style";
import { scaleByStat } from "@/lib/downtown/dungeon-tester/weapon-scaling";

const SCALE_ABBR: Record<WeaponScalingStat, string> = {
  strength: "STR",
  dexterity: "DEX",
  intelligence: "INT",
  wisdom: "WIS",
};

/** Combat scale: floor(power × (1 + (stat − 10) / 10)); baseline 10 = 1×. */
function weaponScaleLines(
  item: GearItem,
  stats?: Partial<Stats> | null
): string[] {
  if (item.slot !== "weapon") return [];
  const statKey = scalingStatForStyle(resolveWeaponStyle(item));
  const abbr = SCALE_ABBR[statKey];
  const power = Math.max(1, item.power ?? 1);
  const lines = [
    `Damage ≈ ${power} × (1 + (${abbr} − 10) / 10)`,
  ];
  const raw = stats?.[statKey];
  if (typeof raw === "number" && Number.isFinite(raw)) {
    const stat = Math.max(1, raw);
    const scaled = scaleByStat(power, stat);
    const mult = 1 + (stat - 10) / 10;
    const multLabel = Number.isInteger(mult)
      ? String(mult)
      : mult.toFixed(1).replace(/\.0$/, "");
    lines.push(`×${multLabel} at ${abbr} ${stat} → ${scaled} dmg`);
  }
  return lines;
}

/** Tip body — place inside a `.pc-gear-hover` parent to show on mouseover. */
export function GearTipBody({
  item,
  emptyLabel,
  stats,
}: {
  item?: GearItem | null;
  emptyLabel?: string;
  /** Live character stats for a worked weapon-scaling example. */
  stats?: Partial<Stats> | null;
}) {
  if (!item) {
    if (!emptyLabel) return null;
    return (
      <span className="pc-gear-tip" role="tooltip">
        <span className="pc-gear-tip-empty">{emptyLabel}</span>
      </span>
    );
  }

  const props = itemProperties(item);
  const set = item.setId ? getGearSet(item.setId) : undefined;
  const rawTier = item.rarity ?? item.tier;
  const tierLabel = (rawTier === "magic" ? "Uncommon" : rawTier).toUpperCase();
  const tierAttr = rawTier === "magic" ? "uncommon" : rawTier;
  const scaleLines = weaponScaleLines(item, stats);

  return (
    <span className="pc-gear-tip" role="tooltip" data-tier={tierAttr}>
      <span className="pc-gear-tip-head">
        <strong className="pc-gear-tip-name">{item.name}</strong>
        <em className="pc-gear-tip-tier" data-tier={tierAttr}>
          {tierLabel}
        </em>
      </span>
      <span className="pc-gear-tip-slot">
        {item.slot}
        {set ? ` · ${set.name}` : ""}
      </span>
      {item.blurb ? <span className="pc-gear-tip-blurb">{item.blurb}</span> : null}
      {scaleLines.map((line) => (
        <span key={line} className="pc-gear-tip-extra">
          {line}
        </span>
      ))}
      {props.length > 0 ? (
        <ul className="pc-gear-tip-stats">
          {props.map((p, i) => (
            <li key={`${p.key}-${i}`}>{formatProperty(p)}</li>
          ))}
        </ul>
      ) : null}
      {item.heal ? (
        <span className="pc-gear-tip-extra">Restores {item.heal} HP</span>
      ) : null}
      {item.manaRestore ? (
        <span className="pc-gear-tip-extra">Restores {item.manaRestore} Mana</span>
      ) : null}
      {item.staminaRestore ? (
        <span className="pc-gear-tip-extra">
          Restores {item.staminaRestore} Stamina
        </span>
      ) : null}
    </span>
  );
}

/** Optional wrapper when you need an outer hover host. */
export function GearHoverTip({
  item,
  children,
  className,
  emptyLabel,
  stats,
}: {
  item?: GearItem | null;
  children: ReactNode;
  className?: string;
  emptyLabel?: string;
  stats?: Partial<Stats> | null;
}) {
  return (
    <span className={["pc-gear-hover", className].filter(Boolean).join(" ")}>
      {children}
      <GearTipBody item={item} emptyLabel={emptyLabel} stats={stats} />
    </span>
  );
}
