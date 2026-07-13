"use client";

import {
  battleSpellIds,
  foodItemIds,
  hpPotionIds,
  manaPotionIds,
  type BattleActionOpts,
} from "@/lib/downtown/party-chronicle/battle";
import { getAbility } from "@/lib/downtown/party-chronicle/skills";
import { getSpellbookAbility } from "@/lib/downtown/party-chronicle/bestiary";
import { comicArtSrc } from "@/lib/downtown/party-chronicle/art";
import type {
  BattleActionId,
  BattleState,
  CharacterSave,
  PartyWorldSave,
  PlayerSlot,
} from "@/lib/downtown/party-chronicle/types";

const ACTIONS: { id: BattleActionId; label: string; hint: string }[] = [
  { id: "attack", label: "Attack", hint: "Strike with your weapon" },
  { id: "powerUp", label: "Power Up", hint: "+50% damage for 3 turns" },
  { id: "eat", label: "Eat", hint: "Consume food from inventory" },
  { id: "spell", label: "Spell", hint: "Cast a known spell" },
  { id: "drinkHp", label: "HP Potion", hint: "Drink a healing potion" },
  { id: "drinkMana", label: "Mana Potion", hint: "Drink a mana draught" },
];

function Meter({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "hp" | "mana" | "enemy";
}) {
  const pct = max > 0 ? Math.round(Math.min(100, Math.max(0, (value / max) * 100))) : 0;
  return (
    <div>
      <div className="flex justify-between text-[0.65rem] font-bold mb-0.5">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="pc-meter" data-tone={tone}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

export function BattleOverlay({
  world,
  mySlot,
  canAct,
  pending,
  onAction,
  onDismiss,
}: {
  world: PartyWorldSave;
  mySlot: PlayerSlot | null;
  canAct: boolean;
  pending: boolean;
  onAction: (action: BattleActionId, opts?: BattleActionOpts) => void;
  onDismiss: () => void;
}) {
  const battle = world.battle;
  if (!battle) return null;

  if (battle.status === "victory" || battle.status === "defeat") {
    return <BattleSummaryScreen battle={battle} onDismiss={onDismiss} />;
  }

  const activeHero = battle.heroes.find((h) => h.id === battle.activeId);
  const isMyTurn = !!mySlot && battle.activeId === mySlot && canAct;
  const me = mySlot ? world.characters[mySlot] : null;
  const spells = me ? battleSpellIds(me) : [];
  const foods = me ? foodItemIds(me.inventory) : [];
  const hpPots = me ? hpPotionIds(me.inventory) : [];
  const manaPots = me ? manaPotionIds(me.inventory) : [];

  const enemyArt = battle.enemy.artId
    ? comicArtSrc(battle.enemy.artId)
    : "/party-chronicle/scenes/missing.svg";

  return (
    <div className="pc-battle-overlay" role="dialog" aria-label="Battle">
      <div className="pc-battle-frame">
        <div className="pc-battle-header">
          <p className="pc-eyebrow">Random encounter</p>
          <h2 className="pc-title text-xl md:text-2xl">
            {battle.enemy.isBoss ? "Boss — " : ""}
            {battle.enemy.name}
          </h2>
          <p className="text-xs opacity-80">{battle.enemy.blurb}</p>
        </div>

        <div className="pc-battle-stage">
          <div className="pc-battle-enemy">
            <img
              src={enemyArt}
              alt={battle.enemy.name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = "/party-chronicle/scenes/missing.svg";
              }}
            />
            <Meter
              label={battle.enemy.isBoss ? "Boss HP" : "Enemy HP"}
              value={battle.enemy.hp}
              max={battle.enemy.maxHp}
              tone="enemy"
            />
            {battle.enemy.isBoss && battle.enemy.maxMana > 0 && (
              <Meter
                label="Enemy Mana"
                value={battle.enemy.mana}
                max={battle.enemy.maxMana}
                tone="mana"
              />
            )}
            {battle.enemy.uniqueSkill && (
              <p className="text-[0.65rem] mt-1 opacity-70">
                Unique: {battle.enemy.uniqueSkill.name} — {battle.enemy.uniqueSkill.blurb}
              </p>
            )}
          </div>

          <div className="pc-battle-party">
            {battle.heroes.map((h) => (
              <div
                key={h.id}
                className="pc-battle-hero"
                data-active={battle.activeId === h.id}
                data-down={h.hp <= 0}
              >
                <p className="font-bold text-sm">
                  {h.name}
                  {h.powerUpTurns > 0 ? ` ▲${h.powerUpTurns}` : ""}
                  {battle.activeId === h.id ? " ★" : ""}
                </p>
                <Meter label="HP" value={h.hp} max={h.maxHp} tone="hp" />
                <Meter label="Mana" value={h.mana} max={h.maxMana} tone="mana" />
              </div>
            ))}
          </div>
        </div>

        <p className="pc-battle-turn">
          {battle.activeId === "enemy"
            ? `${battle.enemy.name}'s turn…`
            : isMyTurn
              ? "Your move — choose an action"
              : `${activeHero?.name ?? "Ally"}'s turn`}
          {battle.lastRocLabel ? (
            <span className="block text-[0.65rem] opacity-80 mt-1 font-normal normal-case tracking-normal">
              {battle.lastRocLabel}
            </span>
          ) : null}
        </p>

        <div className="pc-battle-actions">
          {ACTIONS.map((a) => {
            let disabled = !isMyTurn || pending;
            if (a.id === "eat" && foods.length === 0) disabled = true;
            if (a.id === "spell" && spells.length === 0) disabled = true;
            if (a.id === "drinkHp" && hpPots.length === 0) disabled = true;
            if (a.id === "drinkMana" && manaPots.length === 0) disabled = true;
            return (
              <button
                key={a.id}
                type="button"
                className="pc-choice pc-battle-action"
                disabled={disabled}
                title={a.hint}
                onClick={() => onAction(a.id)}
              >
                <strong>{a.label}</strong>
                <span className="block text-[0.65rem] opacity-70">{a.hint}</span>
              </button>
            );
          })}
        </div>

        {isMyTurn && spells.length > 0 && (
          <div className="pc-battle-spell-row">
            <p className="pc-eyebrow text-[0.65rem]">Spells</p>
            <div className="flex flex-wrap gap-2">
              {spells.map((id) => {
                const ab = getAbility(id) ?? getSpellbookAbility(id);
                const cost = ab?.cost?.mana ?? 0;
                const canCast = !!me && me.mana >= cost;
                return (
                  <button
                    key={id}
                    type="button"
                    className="pc-chip"
                    disabled={!isMyTurn || pending || !canCast}
                    onClick={() => onAction("spell", { spellId: id })}
                  >
                    {ab?.name ?? id}
                    {cost ? ` (${cost} MP)` : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        <div className="pc-battle-log">
          {battle.log.slice(0, 6).map((line, i) => (
            <p key={`${i}-${line.slice(0, 16)}`} style={{ opacity: i === 0 ? 1 : 0.65 }}>
              {line}
            </p>
          ))}
        </div>
      </div>
    </div>
  );
}

function BattleSummaryScreen({
  battle,
  onDismiss,
}: {
  battle: BattleState;
  onDismiss: () => void;
}) {
  const s = battle.summary;
  const victory = battle.status === "victory";
  return (
    <div className="pc-battle-overlay" role="dialog" aria-label="Battle result">
      <div className="pc-battle-frame pc-battle-summary">
        <p className="pc-eyebrow">{victory ? "Victory" : "Defeat"}</p>
        <h2 className="pc-title text-2xl md:text-3xl">
          {victory ? `Felled ${battle.enemy.name}` : `Fallen to ${battle.enemy.name}`}
        </h2>
        {s && (
          <div className="pc-battle-stats">
            <div>
              <strong>Damage dealt</strong>
              <span>{s.damageDealt}</span>
            </div>
            <div>
              <strong>Damage taken</strong>
              <span>{s.damageTaken}</span>
            </div>
            <div>
              <strong>XP</strong>
              <span>{s.xp}</span>
            </div>
            <div>
              <strong>Gold</strong>
              <span>{s.gold}</span>
            </div>
            <div>
              <strong>Turns</strong>
              <span>{s.turns}</span>
            </div>
            {s.bestRoc != null && s.bestRoc > 0 && (
              <div>
                <strong>Best R.O.C.</strong>
                <span>{s.bestRoc}</span>
              </div>
            )}
          </div>
        )}
        {s?.lastRocLabel && (
          <p className="text-xs mt-2 opacity-80">Last check: {s.lastRocLabel}</p>
        )}
        {s && s.loot.length > 0 && (
          <div className="space-y-2 mt-3">
            <p className="pc-eyebrow text-[0.65rem]">Loot</p>
            <ul className="pc-battle-loot">
              {s.loot.map((drop) => (
                <li key={`${drop.itemId}-${drop.rarity}`} data-rarity={drop.rarity}>
                  {drop.name}
                  <span>{drop.rarity}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
        {victory && s && s.loot.length === 0 && (
          <p className="text-xs opacity-70 mt-2">No loot this time — the road keeps its secrets.</p>
        )}
        <button type="button" className="pc-choice mt-4" onClick={onDismiss}>
          Continue journey →
        </button>
      </div>
    </div>
  );
}

/** Compact HP/Mana for party sidebar sheets. */
export function HeroVitals({ char }: { char: CharacterSave }) {
  return (
    <div className="space-y-1">
      <Meter label="HP" value={char.hp} max={char.maxHp} tone="hp" />
      <Meter label="Mana" value={char.mana} max={char.maxMana} tone="mana" />
    </div>
  );
}
