"use client";

import { useEffect, useState } from "react";
import { GearTipBody } from "@/components/party-chronicle/gear-hover-tip";
import { DtGearIcon } from "@/components/dungeon-tester/dt-gear-icon";
import { DtHeroFigure } from "@/components/dungeon-tester/dt-hero-figure";
import { isSpellbookItem } from "@/lib/downtown/party-chronicle/bestiary";
import {
  computeEffectiveStats,
  formatProperty,
  itemProperties,
} from "@/lib/downtown/party-chronicle/stats";
import type {
  CharacterSave,
  EquipSlot,
  GearItem,
  PlayerSlot,
} from "@/lib/downtown/party-chronicle/types";
import { EQUIP_SLOTS, STAT_KEYS } from "@/lib/downtown/party-chronicle/types";
import {
  dtBagItemUpgradeCue,
  dtResolveGear,
  formatGearTier,
  gearTierAttr,
} from "@/lib/downtown/dungeon-tester/gear-display";
import { normalizeDtHeroLook } from "@/lib/downtown/dungeon-tester/look";
import { resolveDtItemSpiritCard } from "@/lib/downtown/dungeon-tester/poke-cards";
import { DtPokeCard } from "@/components/dungeon-tester/dt-poke-card";

const SLOT_LABEL: Record<EquipSlot, string> = {
  head: "Head",
  chest: "Chest",
  hands: "Hands",
  legs: "Legs",
  weapon: "Weapon",
  offhand: "Off-hand",
  accessory: "Accessory",
};

/** Gemini-inspired column order: left / center / right around the figure. */
const DOLL_LAYOUT: { area: string; slot: EquipSlot }[] = [
  { area: "weapon", slot: "weapon" },
  { area: "head", slot: "head" },
  { area: "offhand", slot: "offhand" },
  { area: "hands", slot: "hands" },
  { area: "chest", slot: "chest" },
  { area: "accessory", slot: "accessory" },
  { area: "legs", slot: "legs" },
];

/** DT catalog → getGear → GEAR_CATALOG scan (Neverworld oak-staff, etc.). */
function resolveItem(id: string | null | undefined): GearItem | null {
  return dtResolveGear(id);
}

function isOwnedGearId(
  char: CharacterSave,
  id: string | null | undefined
): id is string {
  if (!id) return false;
  return (
    char.inventory.includes(id) ||
    EQUIP_SLOTS.some((s) => char.equipped[s] === id)
  );
}

/** Snap museum focus to weapon when empty, unarmed, or stale. */
function shouldSnapFocusToWeapon(
  focusId: string | null,
  weaponId: string | null,
  char: CharacterSave
): boolean {
  if (!weaponId) return false;
  if (!focusId || focusId === "dt-unarmed-grit") return true;
  return !isOwnedGearId(char, focusId);
}

function meterPct(value: number, max: number) {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((value / max) * 100)));
}

function deltaChip(v: number | undefined, mode?: "gear") {
  if (!v) return null;
  const sign = v > 0 ? `+${v}` : `${v}`;
  return (
    <em className={v > 0 ? "dt-gear-delta-pos" : "dt-gear-delta-neg"}>
      {mode === "gear" ? `(${sign} from gear)` : sign}
    </em>
  );
}

function formatBagSlot(slot: string): string {
  if (slot === "offhand") return "Off-hand";
  if (slot === "consumable") return "Consumable";
  return slot.charAt(0).toUpperCase() + slot.slice(1);
}

/**
 * True Grit Gear tab — museum hero spirit card + compact bag/doll.
 */
export function DtGearSheet({
  char,
  slot,
  canEdit,
  onEquip,
  onUnequip,
  onUseConsumable,
  onReadSpellbook,
  onSalvage,
}: {
  char: CharacterSave;
  slot: PlayerSlot;
  canEdit: boolean;
  onEquip: (id: string) => void;
  onUnequip: (equipSlot: EquipSlot) => void;
  onUseConsumable: (id: string) => void;
  onReadSpellbook: (id: string) => void;
  onSalvage: (id: string) => void;
}) {
  const eff = computeEffectiveStats(char);
  const look = normalizeDtHeroLook(char.dtLook, slot);
  const equippedIds = new Set(
    EQUIP_SLOTS.map((s) => char.equipped[s]).filter(Boolean) as string[]
  );
  const equippedWeaponId = char.equipped.weapon ?? null;
  // Default spirit focus to equipped weapon (oak-staff etc.) — not Bare Knuckles.
  const [focusId, setFocusId] = useState<string | null>(
    () => equippedWeaponId
  );

  useEffect(() => {
    const weapon = char.equipped.weapon ?? null;
    setFocusId((prev) => {
      if (shouldSnapFocusToWeapon(prev, weapon, char)) return weapon;
      if (!weapon && prev && !isOwnedGearId(char, prev)) return null;
      return prev;
    });
  }, [char.equipped.weapon, char.inventory, char.equipped]);

  // Owned hover/click focus, else equipped weapon only (no inventory[0] default).
  const spiritId = isOwnedGearId(char, focusId)
    ? focusId
    : equippedWeaponId;
  // Resolve by that id — Bare Knuckles ONLY when spiritId is empty.
  const { item: spiritItem, card: spiritCard } =
    resolveDtItemSpiritCard(spiritId);
  const spiritLabel = spiritItem?.name ?? spiritCard.name;
  const spiritTier = spiritItem
    ? gearTierAttr(spiritItem.rarity ?? spiritItem.tier)
    : "common";
  const spiritEquipped =
    Boolean(spiritId) &&
    EQUIP_SLOTS.some((s) => char.equipped[s] === spiritId);

  return (
    <div className="dt-gear-sheet">
      <header className="dt-gear-sheet-head">
        <div>
          <p className="dt-gear-sheet-title">Gear — Full inventory</p>
          <p className="dt-gear-sheet-sub">Equipped gear — {char.name}</p>
        </div>
        <p className="dt-gear-sheet-gold">{char.gold}g</p>
      </header>

      {/* Museum / collector hero — selected spirit card dominates */}
      <section
        className="dt-gear-spirit-hero"
        aria-label="Spirit card showcase"
        data-tier={spiritTier}
        data-spirit-id={spiritId ?? "dt-unarmed-grit"}
        data-spirit-name={spiritCard.name}
        data-equipped={spiritEquipped ? "true" : "false"}
      >
        <div className="dt-gear-spirit-hero-pedestal">
          <p className="dt-gear-spirit-hero-label">
            {spiritLabel}
            {spiritEquipped ? " · Equipped" : ""}
          </p>
          <div className="dt-gear-spirit-hero-stage">
            <DtPokeCard
              card={spiritCard}
              size="lg"
              tier={spiritItem?.rarity ?? spiritItem?.tier}
              className="dt-gear-spirit-hero-card"
            />
          </div>
        </div>
      </section>

      <div className="dt-gear-columns">
        <section className="dt-gear-equip" aria-label="Equipped slots">
          <div className="dt-gear-figure" aria-hidden>
            <DtHeroFigure look={look} className="dt-gear-silhouette" />
          </div>
          {DOLL_LAYOUT.map(({ area, slot: equipSlot }) => {
            const id = char.equipped[equipSlot];
            const item = resolveItem(id);
            const filled = Boolean(item);
            return (
              <button
                key={equipSlot}
                type="button"
                className="dt-gear-slot pc-gear-hover"
                data-area={area}
                data-filled={filled ? "true" : "false"}
                data-tier={filled ? gearTierAttr(item!.rarity ?? item!.tier) : "empty"}
                data-spirit-focus={spiritId === id ? "true" : "false"}
                disabled={!canEdit || !filled}
                title={
                  filled
                    ? `${SLOT_LABEL[equipSlot]} · click to unequip`
                    : `Empty ${SLOT_LABEL[equipSlot]}`
                }
                onClick={() => {
                  if (!filled || !id) return;
                  setFocusId(id);
                  onUnequip(equipSlot);
                }}
                onMouseEnter={() => {
                  if (id) setFocusId(id);
                }}
              >
                <span className="dt-gear-slot-label">{SLOT_LABEL[equipSlot]}</span>
                <span className="dt-gear-slot-body">
                  {filled ? (
                    <DtGearIcon
                      itemId={item!.id}
                      name={item!.name}
                      size="md"
                    />
                  ) : null}
                  <span className="dt-gear-slot-name">
                    {filled ? item!.name : "Empty"}
                  </span>
                </span>
                <GearTipBody
                  item={item}
                  emptyLabel={`Empty ${SLOT_LABEL[equipSlot]}`}
                  stats={eff.stats}
                />
              </button>
            );
          })}
        </section>

        <section className="dt-gear-stats" aria-label="Vitals and combat sheet">
          <div className="dt-gear-block">
            <p className="dt-gear-block-label">Vitals</p>
            <div className="dt-gear-vitals">
              <div className="dt-gear-vital" data-kind="hp">
                <div className="dt-gear-vital-head">
                  <span className="dt-gear-vital-label">HP</span>
                  <strong className="dt-gear-vital-num">
                    {char.hp}
                    <span className="dt-gear-vital-max">/{eff.maxHp}</span>
                  </strong>
                  {deltaChip(eff.deltas.maxHp)}
                </div>
                <div className="dt-gear-vital-bar" aria-hidden>
                  <span style={{ width: `${meterPct(char.hp, eff.maxHp)}%` }} />
                </div>
              </div>
              <div className="dt-gear-vital" data-kind="mana">
                <div className="dt-gear-vital-head">
                  <span className="dt-gear-vital-label">MP</span>
                  <strong className="dt-gear-vital-num">
                    {char.mana}
                    <span className="dt-gear-vital-max">/{eff.maxMana}</span>
                  </strong>
                  {deltaChip(eff.deltas.maxMana)}
                </div>
                <div className="dt-gear-vital-bar" aria-hidden>
                  <span
                    style={{ width: `${meterPct(char.mana, eff.maxMana)}%` }}
                  />
                </div>
              </div>
              <div className="dt-gear-vital" data-kind="stamina">
                <div className="dt-gear-vital-head">
                  <span className="dt-gear-vital-label">ST</span>
                  <strong className="dt-gear-vital-num">
                    {char.stamina}
                    <span className="dt-gear-vital-max">/{char.maxStamina}</span>
                  </strong>
                </div>
                <div className="dt-gear-vital-bar" aria-hidden>
                  <span
                    style={{
                      width: `${meterPct(char.stamina, char.maxStamina)}%`,
                    }}
                  />
                </div>
              </div>
            </div>
          </div>

          <div className="dt-gear-block">
            <p className="dt-gear-block-label">Combat</p>
            <div className="dt-gear-combat">
              <div className="dt-gear-combat-cell">
                <span className="dt-gear-combat-label">
                  ATK{deltaChip(eff.deltas.atk, "gear")}
                </span>
                <strong>{eff.atk}</strong>
              </div>
              <div className="dt-gear-combat-cell">
                <span className="dt-gear-combat-label">
                  DEF{deltaChip(eff.deltas.def, "gear")}
                </span>
                <strong>{eff.def}</strong>
              </div>
              <div className="dt-gear-combat-cell">
                <span className="dt-gear-combat-label">CRIT</span>
                <strong>{eff.crit}%</strong>
              </div>
              <div className="dt-gear-combat-cell">
                <span className="dt-gear-combat-label">ARM</span>
                <strong>{eff.resist}</strong>
              </div>
            </div>
          </div>

          <div className="dt-gear-block">
            <p className="dt-gear-block-label">Stats (Base → Geared)</p>
            <div className="dt-gear-stat-grid">
              {STAT_KEYS.map((key) => {
                const base = eff.baseStats[key];
                const geared = eff.stats[key];
                const d = geared - base;
                return (
                  <div key={key} className="dt-gear-stat-box">
                    <span className="dt-gear-stat-key">
                      {key.slice(0, 3).toUpperCase()}
                    </span>
                    <strong className="dt-gear-stat-val">{base}</strong>
                    {d !== 0 ? (
                      <span
                        className={
                          d > 0 ? "dt-gear-delta-pos" : "dt-gear-delta-neg"
                        }
                      >
                        {d > 0 ? `+${d}` : d}
                      </span>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          {eff.perItem.length > 0 ? (
            <div className="dt-gear-block">
              <p className="dt-gear-block-label">Equipped Bonuses</p>
              <ul className="dt-gear-bonus-list">
                {eff.perItem.map((row) => {
                  const pills: string[] =
                    row.properties.length > 0
                      ? row.properties.map(formatProperty)
                      : [
                          row.power ? `+${row.power} ATK` : null,
                          row.armor ? `+${row.armor} DEF` : null,
                        ].filter((x): x is string => Boolean(x));
                  return (
                    <li key={row.itemId} className="dt-gear-bonus-row">
                      <strong className="dt-gear-bonus-name">{row.name}</strong>
                      {pills.length > 0 ? (
                        <span className="dt-gear-bonus-pills">
                          {pills.map((label) => (
                            <span
                              key={`${row.itemId}-${label}`}
                              className="dt-gear-bonus-pill"
                            >
                              {label}
                            </span>
                          ))}
                        </span>
                      ) : (
                        <span className="dt-gear-bonus-pill">—</span>
                      )}
                    </li>
                  );
                })}
              </ul>
            </div>
          ) : null}
        </section>

        <section className="dt-gear-bag" aria-label="Inventory bag">
          <p className="dt-gear-block-label">Bag</p>
          <p className="dt-gear-actions-hint">
            Select to showcase · Equip · Use · Break down
          </p>
          <div className="dt-gear-bag-grid dt-gear-bag-grid-compact">
            {char.inventory.map((id, idx) => {
              const item = resolveItem(id);
              if (!item) return null;
              const spellbook = isSpellbookItem(id);
              const consumable = item.slot === "consumable";
              const equippable =
                item.slot !== "consumable" &&
                item.slot !== "misc" &&
                !spellbook &&
                EQUIP_SLOTS.includes(item.slot as EquipSlot);
              const equipped = equippedIds.has(id);
              const upgrade = dtBagItemUpgradeCue(char, id, {
                alreadyEquipped: equipped,
              });
              const props = itemProperties(item).slice(0, 2);
              const tier = gearTierAttr(item.rarity ?? item.tier);
              const usable =
                consumable &&
                ((item.heal ?? 0) > 0 ||
                  (item.manaRestore ?? 0) > 0 ||
                  (item.staminaRestore ?? 0) > 0 ||
                  item.tags?.includes("stamina") ||
                  item.tags?.includes("dog"));

              return (
                <div
                  key={`${id}-${idx}`}
                  className="dt-gear-bag-card pc-gear-hover"
                  data-tier={tier}
                  data-equipped={equipped ? "true" : "false"}
                  data-upgrade={upgrade ?? undefined}
                  data-spirit-focus={spiritId === id ? "true" : "false"}
                  onClick={() => setFocusId(id)}
                  onMouseEnter={() => setFocusId(id)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      setFocusId(id);
                    }
                  }}
                >
                  <div className="dt-gear-bag-card-top">
                    <span className="dt-gear-bag-tier" data-tier={tier}>
                      {formatGearTier(item.rarity ?? item.tier)}
                    </span>
                    {equipped ? (
                      <span className="dt-gear-bag-equipped">Equipped</span>
                    ) : null}
                    {upgrade ? (
                      <span
                        className="dt-gear-bag-upgrade"
                        data-kind={upgrade}
                        title={
                          upgrade === "empty"
                            ? "Nothing equipped in this slot"
                            : "Better combat score than equipped"
                        }
                      >
                        {upgrade === "empty" ? "Empty slot" : "↑ Upgrade"}
                      </span>
                    ) : null}
                  </div>
                  <div className="dt-gear-bag-title">
                    <DtGearIcon
                      itemId={item.id}
                      name={item.name}
                      size="md"
                    />
                    <div className="dt-gear-bag-name" title={item.name}>
                      {item.name}
                    </div>
                  </div>
                  <div className="dt-gear-bag-meta">{formatBagSlot(item.slot)}</div>
                  {props.length > 0 ? (
                    <ul className="dt-gear-bag-stats">
                      {props.map((p, i) => (
                        <li key={`${p.key}-${i}`}>{formatProperty(p)}</li>
                      ))}
                    </ul>
                  ) : (
                    <div className="dt-gear-bag-meta">
                      {item.heal ? `+${item.heal} HP` : ""}
                      {item.manaRestore ? ` · +${item.manaRestore} MP` : ""}
                      {item.staminaRestore ? ` · +${item.staminaRestore} ST` : ""}
                    </div>
                  )}
                  <div
                    className="dt-gear-bag-actions"
                    onClick={(e) => e.stopPropagation()}
                  >
                    {equippable ? (
                      <button
                        type="button"
                        className="pc-btn-tiny"
                        disabled={!canEdit || equipped}
                        onClick={() => {
                          setFocusId(id);
                          onEquip(id);
                        }}
                      >
                        {equipped ? "Equipped" : "Equip"}
                      </button>
                    ) : null}
                    {usable ? (
                      <button
                        type="button"
                        className="pc-btn-tiny"
                        disabled={!canEdit}
                        onClick={() => onUseConsumable(id)}
                      >
                        Use
                      </button>
                    ) : null}
                    {spellbook ? (
                      <button
                        type="button"
                        className="pc-btn-tiny"
                        disabled={!canEdit}
                        onClick={() => onReadSpellbook(id)}
                      >
                        Read
                      </button>
                    ) : null}
                    <button
                      type="button"
                      className="pc-btn-tiny"
                      disabled={!canEdit || equipped}
                      title={
                        equipped
                          ? "Unequip before breaking down"
                          : "Break down for scrap gold"
                      }
                      onClick={() => onSalvage(id)}
                    >
                      Break Down
                    </button>
                  </div>
                  <GearTipBody item={item} stats={eff.stats} />
                </div>
              );
            })}
          </div>
          {!char.inventory.length ? (
            <p className="dt-gear-empty">Bag is empty.</p>
          ) : null}
        </section>
      </div>
    </div>
  );
}
