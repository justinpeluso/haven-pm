"use client";

import { PaperdollPanel } from "@/components/party-chronicle/paperdoll";
import { GearTipBody } from "@/components/party-chronicle/gear-hover-tip";
import { isSpellbookItem } from "@/lib/downtown/party-chronicle/bestiary";
import { getGear, gearCatalogStats } from "@/lib/downtown/party-chronicle/gear";
import { formatProperty, itemProperties } from "@/lib/downtown/party-chronicle/stats";
import type { CharacterSave, EquipSlot } from "@/lib/downtown/party-chronicle/types";
import { EQUIP_SLOTS } from "@/lib/downtown/party-chronicle/types";

function formatTierLabel(tier: string): string {
  if (tier === "magic") return "Uncommon";
  return tier.charAt(0).toUpperCase() + tier.slice(1);
}

function tierAttr(tier: string): string {
  return tier === "magic" ? "uncommon" : tier;
}

/** Shared Neverworld inventory + paperdoll — used by Party Chronicle and DungeonTester. */
export function InventoryPanel({
  char,
  canEdit,
  onEquip,
  onUnequip,
  onUseConsumable,
  onReadSpellbook,
  onSalvage,
  paperdollLabel,
  inventoryLabel,
}: {
  char: CharacterSave;
  canEdit: boolean;
  onEquip: (id: string) => void;
  onUnequip: (slot: EquipSlot) => void;
  onUseConsumable: (id: string) => void;
  onReadSpellbook: (id: string) => void;
  onSalvage: (id: string) => void;
  /** Optional eyebrow override (DungeonTester omits Neverworld catalog counts). */
  paperdollLabel?: string;
  inventoryLabel?: string;
}) {
  const catalog = gearCatalogStats();
  const worn = new Set(
    EQUIP_SLOTS.map((s) => char.equipped[s]).filter(Boolean) as string[]
  );

  return (
    <div className="pc-inv-sheet space-y-4">
      <header className="pc-inv-sheet-head">
        <p className="pc-eyebrow">
          {paperdollLabel ??
            `Paperdoll — ${char.name} · catalog ${catalog.total} items / ${catalog.sets} sets`}
        </p>
        <p className="pc-inv-sheet-gold">{char.gold}g</p>
      </header>

      <PaperdollPanel char={char} canEdit={canEdit} onUnequip={onUnequip} />

      <section className="pc-inv-bag-section">
        <p className="pc-eyebrow text-[0.65rem]">
          {inventoryLabel ??
            "Inventory — Use potions & food · Break down unequipped gear for scrap gold"}
        </p>
        <div
          className="pc-inv-grid"
          style={{ gridTemplateColumns: "repeat(auto-fill, minmax(9.5rem, 1fr))" }}
        >
          {char.inventory.map((id, idx) => {
            const item = getGear(id);
            if (!item) return null;
            const spellbook = isSpellbookItem(id);
            const consumable = item.slot === "consumable";
            const equippable =
              item.slot !== "consumable" && item.slot !== "misc" && !spellbook;
            const equipped = worn.has(id);
            const props = itemProperties(item).slice(0, 5);
            const tier = tierAttr(item.rarity ?? item.tier);
            const usable =
              consumable &&
              ((item.heal ?? 0) > 0 ||
                (item.manaRestore ?? 0) > 0 ||
                (item.staminaRestore ?? 0) > 0 ||
                item.tags.includes("stamina") ||
                item.tags.includes("dog"));

            return (
              <div
                key={`${id}-${idx}`}
                className="pc-inv-card pc-gear-hover"
                data-tier={tier}
                data-equipped={equipped ? "true" : "false"}
              >
                <div className="pc-inv-card-top">
                  <span className="pc-inv-tier" data-tier={tier}>
                    {formatTierLabel(item.rarity ?? item.tier)}
                  </span>
                  {equipped ? <span className="pc-inv-worn">Worn</span> : null}
                </div>
                <div className="pc-inv-card-name">{item.name}</div>
                <div className="pc-inv-card-meta">{item.slot}</div>
                {props.length > 0 ? (
                  <ul className="pc-inv-card-stats">
                    {props.map((p, i) => (
                      <li key={`${p.key}-${i}`}>{formatProperty(p)}</li>
                    ))}
                  </ul>
                ) : (
                  <div className="pc-inv-card-meta">
                    {item.heal ? `+${item.heal} HP` : ""}
                    {item.manaRestore ? ` · +${item.manaRestore} MP` : ""}
                    {item.staminaRestore ? ` · +${item.staminaRestore} ST` : ""}
                  </div>
                )}
                <div className="pc-inv-actions">
                  {equippable && (
                    <button
                      type="button"
                      className="pc-btn-tiny"
                      disabled={!canEdit || equipped}
                      onClick={() => onEquip(id)}
                    >
                      {equipped ? "Worn" : "Equip"}
                    </button>
                  )}
                  {usable && (
                    <button
                      type="button"
                      className="pc-btn-tiny"
                      disabled={!canEdit}
                      onClick={() => onUseConsumable(id)}
                    >
                      Use
                    </button>
                  )}
                  {spellbook && (
                    <button
                      type="button"
                      className="pc-btn-tiny"
                      disabled={!canEdit}
                      onClick={() => onReadSpellbook(id)}
                    >
                      Read
                    </button>
                  )}
                  <button
                    type="button"
                    className="pc-btn-tiny"
                    disabled={!canEdit || equipped}
                    title={
                      equipped ? "Unequip before breaking down" : "Break down for scrap gold"
                    }
                    onClick={() => onSalvage(id)}
                  >
                    Break down
                  </button>
                </div>
                <GearTipBody item={item} />
              </div>
            );
          })}
        </div>
      </section>
    </div>
  );
}
