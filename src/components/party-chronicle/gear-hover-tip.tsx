"use client";

import type { ReactNode } from "react";
import {
  formatProperty,
  itemProperties,
} from "@/lib/downtown/party-chronicle/stats";
import { getGearSet } from "@/lib/downtown/party-chronicle/gear";
import type { GearItem } from "@/lib/downtown/party-chronicle/types";

/** Tip body — place inside a `.pc-gear-hover` parent to show on mouseover. */
export function GearTipBody({
  item,
  emptyLabel,
}: {
  item?: GearItem | null;
  emptyLabel?: string;
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
  const tierLabel = (item.rarity ?? item.tier).toUpperCase();

  return (
    <span className="pc-gear-tip" role="tooltip" data-tier={item.tier}>
      <span className="pc-gear-tip-head">
        <strong className="pc-gear-tip-name">{item.name}</strong>
        <em className="pc-gear-tip-tier">{tierLabel}</em>
      </span>
      <span className="pc-gear-tip-slot">
        {item.slot}
        {set ? ` · ${set.name}` : ""}
      </span>
      {item.blurb ? <span className="pc-gear-tip-blurb">{item.blurb}</span> : null}
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
}: {
  item?: GearItem | null;
  children: ReactNode;
  className?: string;
  emptyLabel?: string;
}) {
  return (
    <span className={["pc-gear-hover", className].filter(Boolean).join(" ")}>
      {children}
      <GearTipBody item={item} emptyLabel={emptyLabel} />
    </span>
  );
}
