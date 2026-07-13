"use client";

import {
  computeEffectiveStats,
  formatProperty,
  getSetProgress,
} from "@/lib/downtown/party-chronicle/stats";
import { getGear } from "@/lib/downtown/party-chronicle/gear";
import type { CharacterSave, EquipSlot } from "@/lib/downtown/party-chronicle/types";
import { EQUIP_SLOTS, STAT_KEYS } from "@/lib/downtown/party-chronicle/types";
import { GearTipBody } from "./gear-hover-tip";

const SLOT_LABEL: Record<EquipSlot, string> = {
  head: "Head",
  chest: "Chest",
  hands: "Hands",
  legs: "Legs",
  weapon: "Weapon",
  offhand: "Off-hand",
  accessory: "Accessory",
};

/** Diablo-style silhouette with equipment slots around a forest hero. */
export function PaperdollPanel({
  char,
  canEdit,
  onUnequip,
}: {
  char: CharacterSave;
  canEdit: boolean;
  onUnequip: (slot: EquipSlot) => void;
}) {
  const eff = computeEffectiveStats(char);
  const sets = getSetProgress(char);

  return (
    <div className="pc-paperdoll">
      <div className="pc-paperdoll-figure" aria-hidden>
        <div className="pc-paperdoll-silhouette">
          <span className="pc-paperdoll-head" />
          <span className="pc-paperdoll-torso" />
          <span className="pc-paperdoll-arm pc-paperdoll-arm-l" />
          <span className="pc-paperdoll-arm pc-paperdoll-arm-r" />
          <span className="pc-paperdoll-leg pc-paperdoll-leg-l" />
          <span className="pc-paperdoll-leg pc-paperdoll-leg-r" />
        </div>

        {EQUIP_SLOTS.map((slot) => {
          const id = char.equipped[slot];
          const item = id ? getGear(id) : null;
          return (
            <button
              key={slot}
              type="button"
              className={`pc-doll-slot pc-doll-slot-${slot} pc-gear-hover`}
              data-filled={item ? "true" : "false"}
              data-tier={item?.tier ?? "empty"}
              disabled={!canEdit || !item}
              onClick={() => item && onUnequip(slot)}
            >
              <span className="pc-doll-slot-label">{SLOT_LABEL[slot]}</span>
              <span className="pc-doll-slot-name">
                {item ? item.name.slice(0, 14) : "—"}
              </span>
              <GearTipBody
                item={item}
                emptyLabel={`Empty ${SLOT_LABEL[slot]}`}
              />
            </button>
          );
        })}
      </div>

      <div className="pc-paperdoll-stats">
        <p className="pc-eyebrow">Combat sheet</p>
        <div className="pc-eff-row">
          <span>ATK</span>
          <strong>{eff.atk}</strong>
          {deltaChip(eff.deltas.atk)}
        </div>
        <div className="pc-eff-row">
          <span>DEF</span>
          <strong>{eff.def}</strong>
          {deltaChip(eff.deltas.def)}
        </div>
        <div className="pc-eff-row">
          <span>HP</span>
          <strong>
            {char.hp}/{eff.maxHp}
          </strong>
          {deltaChip(eff.deltas.maxHp)}
        </div>
        <div className="pc-eff-row">
          <span>Mana</span>
          <strong>
            {char.mana}/{eff.maxMana}
          </strong>
          {deltaChip(eff.deltas.maxMana)}
        </div>
        <div className="pc-eff-row">
          <span>Crit</span>
          <strong>{eff.crit}%</strong>
        </div>
        <div className="pc-eff-row">
          <span>Resist</span>
          <strong>{eff.resist}</strong>
        </div>

        <p className="pc-eyebrow text-[0.65rem] mt-3">Stats (base → geared)</p>
        <div className="pc-stat-grid">
          {STAT_KEYS.map((key) => {
            const base = eff.baseStats[key];
            const geared = eff.stats[key];
            const d = geared - base;
            return (
              <div key={key} className="pc-stat-box text-left">
                <strong>{key.slice(0, 3).toUpperCase()}</strong>
                {base}
                {d !== 0 ? (
                  <span className={d > 0 ? "pc-delta-pos" : "pc-delta-neg"}>
                    {" "}
                    {d > 0 ? `+${d}` : d}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {eff.perItem.length > 0 && (
          <>
            <p className="pc-eyebrow text-[0.65rem] mt-3">Equipped bonuses</p>
            <ul className="pc-gear-delta-list">
              {eff.perItem.map((row) => (
                <li key={row.itemId}>
                  <strong>{row.name}</strong>
                  <span>
                    {row.properties.map(formatProperty).join(" · ") ||
                      (row.power || row.armor
                        ? `pwr ${row.power} / arm ${row.armor}`
                        : "—")}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}

        {sets.length > 0 && (
          <>
            <p className="pc-eyebrow text-[0.65rem] mt-3">Set progress</p>
            <ul className="pc-gear-delta-list">
              {sets.map(({ set, equipped, total, active }) => (
                <li key={set.id}>
                  <strong>
                    {set.name} ({equipped}/{total})
                  </strong>
                  <span>
                    {active.length
                      ? active.map((b) => `${b.pieces}pc: ${b.blurb}`).join(" · ")
                      : "Wear 2+ for set bonuses"}
                  </span>
                </li>
              ))}
            </ul>
          </>
        )}
      </div>
    </div>
  );
}

function deltaChip(v: number | undefined) {
  if (!v) return null;
  return (
    <em className={v > 0 ? "pc-delta-pos" : "pc-delta-neg"}>
      {v > 0 ? `+${v}` : v}
    </em>
  );
}
