"use client";

import { PaperdollPanel } from "@/components/party-chronicle/paperdoll";
import { GearTipBody } from "@/components/party-chronicle/gear-hover-tip";
import { isSpellbookItem } from "@/lib/downtown/party-chronicle/bestiary";
import { getGear, gearCatalogStats } from "@/lib/downtown/party-chronicle/gear";
import { formatProperty, itemProperties } from "@/lib/downtown/party-chronicle/stats";
import type { CharacterSave, EquipSlot } from "@/lib/downtown/party-chronicle/types";
import { EQUIP_SLOTS } from "@/lib/downtown/party-chronicle/types";

/** Shared Neverworld inventory + paperdoll — used by Party Chronicle and DungeonTester. */
export function InventoryPanel({
  char,
  canEdit,
  onEquip,
  onUnequip,
  onUseConsumable,
  onReadSpellbook,
  onSalvage,
}: {
  char: CharacterSave;
  canEdit: boolean;
  onEquip: (id: string) => void;
  onUnequip: (slot: EquipSlot) => void;
  onUseConsumable: (id: string) => void;
  onReadSpellbook: (id: string) => void;
  onSalvage: (id: string) => void;
}) {
  const catalog = gearCatalogStats();
  const worn = new Set(
    EQUIP_SLOTS.map((s) => char.equipped[s]).filter(Boolean) as string[]
  );

  return (
    <div className="space-y-4">
      <p className="pc-eyebrow">
        Paperdoll — {char.name} · catalog {catalog.total} items / {catalog.sets} sets
      </p>
      <PaperdollPanel char={char} canEdit={canEdit} onUnequip={onUnequip} />

      <p className="pc-eyebrow text-[0.65rem]">
        Inventory — Use potions &amp; food · Break down unequipped gear for scrap gold
      </p>
      <div
        className="pc-inv-grid"
        style={{ gridTemplateColumns: "repeat(auto-fill, minmax(8.5rem, 1fr))" }}
      >
        {char.inventory.map((id, idx) => {
          const item = getGear(id);
          if (!item) return null;
          const spellbook = isSpellbookItem(id);
          const consumable = item.slot === "consumable";
          const equippable =
            item.slot !== "consumable" && item.slot !== "misc" && !spellbook;
          const equipped = worn.has(id);
          const props = itemProperties(item).slice(0, 3);
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
              data-tier={item.tier}
              data-equipped={equipped ? "true" : "false"}
            >
              <div className="pc-inv-card-name">
                {equipped ? "● " : ""}
                {item.name}
              </div>
              <div className="pc-inv-card-meta">
                {item.slot}
                {item.setId ? ` · set` : ""}
                {item.heal ? ` · +${item.heal} HP` : ""}
                {item.manaRestore ? ` · +${item.manaRestore} MP` : ""}
                {props.length ? ` · ${props.map(formatProperty).join(", ")}` : ""}
              </div>
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
    </div>
  );
}
