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

function meterPct(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

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
              data-tier={
                !item
                  ? "empty"
                  : item.tier === "magic"
                    ? "uncommon"
                    : item.tier
              }
              disabled={!canEdit || !item}
              onClick={() => item && onUnequip(slot)}
            >
              <span className="pc-doll-slot-label">{SLOT_LABEL[slot]}</span>
              <span className="pc-doll-slot-name">
                {item ? item.name.slice(0, 14) : "Empty"}
              </span>
              <GearTipBody
                item={item}
                emptyLabel={`Empty ${SLOT_LABEL[slot]}`}
                stats={eff.stats}
              />
            </button>
          );
        })}
      </div>

      <div className="pc-paperdoll-stats">
        <p className="pc-eyebrow">Vitals</p>
        <div className="pc-vitals">
          <div className="pc-vital" data-kind="hp">
            <div className="pc-vital-head">
              <span className="pc-vital-label">HP</span>
              <strong className="pc-vital-num">
                {char.hp}
                <span className="pc-vital-max">/{eff.maxHp}</span>
              </strong>
              {deltaChip(eff.deltas.maxHp)}
            </div>
            <div className="pc-vital-bar" aria-hidden>
              <span style={{ width: `${meterPct(char.hp, eff.maxHp)}%` }} />
            </div>
          </div>
          <div className="pc-vital" data-kind="mana">
            <div className="pc-vital-head">
              <span className="pc-vital-label">MP</span>
              <strong className="pc-vital-num">
                {char.mana}
                <span className="pc-vital-max">/{eff.maxMana}</span>
              </strong>
              {deltaChip(eff.deltas.maxMana)}
            </div>
            <div className="pc-vital-bar" aria-hidden>
              <span style={{ width: `${meterPct(char.mana, eff.maxMana)}%` }} />
            </div>
          </div>
          <div className="pc-vital" data-kind="stamina">
            <div className="pc-vital-head">
              <span className="pc-vital-label">ST</span>
              <strong className="pc-vital-num">
                {char.stamina}
                <span className="pc-vital-max">/{char.maxStamina}</span>
              </strong>
            </div>
            <div className="pc-vital-bar" aria-hidden>
              <span
                style={{ width: `${meterPct(char.stamina, char.maxStamina)}%` }}
              />
            </div>
          </div>
        </div>

        <p className="pc-eyebrow mt-3">Combat</p>
        <div className="pc-combat-grid">
          <div className="pc-combat-stat">
            <span>ATK</span>
            <strong>{eff.atk}</strong>
            {deltaChip(eff.deltas.atk, "gear")}
          </div>
          <div className="pc-combat-stat">
            <span>DEF</span>
            <strong>{eff.def}</strong>
            {deltaChip(eff.deltas.def, "gear")}
          </div>
          <div className="pc-combat-stat">
            <span>CRIT</span>
            <strong>{eff.crit}%</strong>
          </div>
          <div className="pc-combat-stat">
            <span>ARM</span>
            <strong>{eff.resist}</strong>
          </div>
        </div>

        <p className="pc-eyebrow mt-3">Stats (Base → Geared)</p>
        <div className="pc-stat-grid">
          {STAT_KEYS.map((key) => {
            const base = eff.baseStats[key];
            const geared = eff.stats[key];
            const d = geared - base;
            return (
              <div key={key} className="pc-stat-box text-left">
                <strong>{key.slice(0, 3).toUpperCase()}</strong>
                <span className="pc-stat-val">{base}</span>
                {d !== 0 ? (
                  <span className={d > 0 ? "pc-delta-pos" : "pc-delta-neg"}>
                    {d > 0 ? `+${d}` : d}
                  </span>
                ) : null}
              </div>
            );
          })}
        </div>

        {eff.perItem.length > 0 && (
          <>
            <p className="pc-eyebrow mt-3">Equipped Bonuses</p>
            <ul className="pc-gear-delta-list">
              {eff.perItem.map((row) => {
                const pills: string[] =
                  row.properties.length > 0
                    ? row.properties.map(formatProperty)
                    : [
                        row.power ? `+${row.power} ATK` : null,
                        row.armor ? `+${row.armor} DEF` : null,
                      ].filter((x): x is string => Boolean(x));
                return (
                  <li key={row.itemId}>
                    <strong>{row.name}</strong>
                    {pills.length > 0 ? (
                      <span className="pc-gear-delta-pills">
                        {pills.map((label) => (
                          <span key={`${row.itemId}-${label}`} className="pc-gear-delta-pill">
                            {label}
                          </span>
                        ))}
                      </span>
                    ) : (
                      <span className="pc-gear-delta-pill">—</span>
                    )}
                  </li>
                );
              })}
            </ul>
          </>
        )}

        {sets.length > 0 && (
          <>
            <p className="pc-eyebrow mt-3">Set Progress</p>
            <ul className="pc-gear-delta-list">
              {sets.map(({ set, equipped, total, active }) => (
                <li key={set.id}>
                  <strong>
                    {set.name} ({equipped}/{total})
                  </strong>
                  <span className="pc-gear-delta-pills">
                    {active.length ? (
                      active.map((b) => (
                        <span
                          key={`${set.id}-${b.pieces}`}
                          className="pc-gear-delta-pill"
                        >
                          {b.pieces}pc: {b.blurb}
                        </span>
                      ))
                    ) : (
                      <span className="pc-gear-delta-pill">Wear 2+ for set bonuses</span>
                    )}
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

function deltaChip(v: number | undefined, mode?: "gear") {
  if (!v) return null;
  const sign = v > 0 ? `+${v}` : `${v}`;
  return (
    <em className={v > 0 ? "pc-delta-pos" : "pc-delta-neg"}>
      {mode === "gear" ? `(${sign} from gear)` : sign}
    </em>
  );
}
