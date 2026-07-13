"use client";

import {
  battleIntroRemainingMs,
  battleRemainingMs,
  battleSpellIds,
  canStrike,
  foodItemIds,
  getUnit,
  hpPotionIds,
  isBattleIntroActive,
  legalMoves,
  manaPotionIds,
  turnIdleRemainingMs,
  type BattleActionOpts,
} from "@/lib/downtown/party-chronicle/battle";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import { getAbility } from "@/lib/downtown/party-chronicle/skills";
import { getSpellbookAbility } from "@/lib/downtown/party-chronicle/bestiary";
import { getGear } from "@/lib/downtown/party-chronicle/gear";
import {
  battleClassArtSrc,
  battleEnemyArtSrc,
  battlePetArtSrc,
} from "@/lib/downtown/party-chronicle/art";
import { CLASS_DEFS } from "@/lib/downtown/party-chronicle/players";
import type {
  BattleActionId,
  BattleFxEvent,
  BattleState,
  CharacterSave,
  PartyWorldSave,
  PlayerSlot,
} from "@/lib/downtown/party-chronicle/types";

const FLOATER_MS = 2000;

type Floater = BattleFxEvent & { birth: number };

function itemLabel(id: string): string {
  return getGear(id)?.name ?? id;
}

function countIds(ids: string[]): { id: string; count: number }[] {
  const map = new Map<string, number>();
  for (const id of ids) map.set(id, (map.get(id) ?? 0) + 1);
  return [...map.entries()].map(([id, count]) => ({ id, count }));
}

function introLabel(remainingMs: number): string | null {
  if (remainingMs <= 0) return null;
  if (remainingMs > 3000) return "3";
  if (remainingMs > 2000) return "2";
  if (remainingMs > 1000) return "1";
  return "BATTLE START";
}

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

function CombatFloaters({
  floaters,
  target,
}: {
  floaters: Floater[];
  target: string;
}) {
  const mine = floaters.filter((f) => f.target === target);
  if (!mine.length) return null;
  return (
    <div className="pc-battle-floaters" aria-hidden>
      {mine.map((f, i) => (
        <span
          key={f.id}
          className="pc-battle-floater"
          data-kind={f.kind}
          style={{ "--pc-floater-i": i } as CSSProperties}
        >
          {f.kind === "heal" ? `+${f.amount}` : `−${f.amount}`}
        </span>
      ))}
    </div>
  );
}

function TacticalBoard({
  battle,
  world,
  mySlot,
  isMyTurn,
  pending,
  floaters,
  onMove,
  onAttackEnemy,
}: {
  battle: BattleState;
  world: PartyWorldSave;
  mySlot: PlayerSlot | null;
  isMyTurn: boolean;
  pending: boolean;
  floaters: Floater[];
  onMove: (x: number, y: number) => void;
  onAttackEnemy: () => void;
}) {
  const tactical = battle.tactical;
  const missingArt = "/party-chronicle/scenes/missing.svg";
  const phase = tactical?.phase ?? "move";

  const moves = useMemo(() => {
    if (!tactical || !isMyTurn || phase !== "move" || !mySlot) return new Set<string>();
    return new Set(legalMoves(tactical, mySlot).map((m) => `${m.x},${m.y}`));
  }, [tactical, isMyTurn, phase, mySlot]);

  const attacker = tactical && mySlot ? getUnit(tactical, mySlot) : null;
  const foe = tactical ? getUnit(tactical, "enemy") : null;
  const canHit =
    !!attacker && !!foe && canStrike(attacker, foe) && isMyTurn && !pending;

  if (!tactical) {
    return (
      <p className="text-sm opacity-70">Drawing the battlefield…</p>
    );
  }

  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < tactical.rows; y++) {
    for (let x = 0; x < tactical.cols; x++) {
      cells.push({ x, y });
    }
  }

  const unitByCell = new Map(tactical.units.map((u) => [`${u.x},${u.y}`, u]));

  return (
    <div
      className="pc-tactical-board"
      style={
        {
          "--pc-tac-cols": tactical.cols,
          "--pc-tac-rows": tactical.rows,
        } as CSSProperties
      }
      role="grid"
      aria-label="Battle map"
    >
      {cells.map(({ x, y }) => {
        const key = `${x},${y}`;
        const unit = unitByCell.get(key);
        const reachable = moves.has(key);
        const isEnemyCell = unit?.id === "enemy";
        const isActiveHero = unit?.id === battle.activeId;

        const hero = unit?.heroSlot
          ? battle.heroes.find((h) => h.slot === unit.heroSlot)
          : null;
        const char = unit?.heroSlot ? world.characters[unit.heroSlot] : null;

        return (
          <button
            key={key}
            type="button"
            role="gridcell"
            className="pc-tactical-cell"
            data-reachable={reachable ? "true" : "false"}
            data-occupied={unit ? "true" : "false"}
            data-side={unit?.side ?? "empty"}
            data-active={isActiveHero ? "true" : "false"}
            data-attackable={isEnemyCell && canHit ? "true" : "false"}
            disabled={
              pending ||
              introLocked(battle) ||
              (!reachable && !(isEnemyCell && canHit))
            }
            aria-label={
              unit
                ? unit.side === "enemy"
                  ? battle.enemy.name
                  : hero?.name ?? "Hero"
                : reachable
                  ? `Move to ${x + 1},${y + 1}`
                  : `Tile ${x + 1},${y + 1}`
            }
            onClick={() => {
              if (isEnemyCell && canHit) {
                onAttackEnemy();
                return;
              }
              if (reachable) onMove(x, y);
            }}
          >
            {unit?.side === "enemy" ? (
              <div className="pc-tactical-token pc-battle-fx-anchor" data-side="enemy">
                <CombatFloaters floaters={floaters} target="enemy" />
                <img
                  src={battleEnemyArtSrc(battle.enemy)}
                  alt={battle.enemy.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = missingArt;
                  }}
                />
                <span className="pc-tactical-hp">
                  {battle.enemy.hp}/{battle.enemy.maxHp}
                </span>
              </div>
            ) : null}
            {unit?.side === "party" && hero ? (
              <div
                className="pc-tactical-token pc-battle-fx-anchor"
                data-side="party"
                data-down={hero.hp <= 0 ? "true" : "false"}
              >
                <CombatFloaters floaters={floaters} target={hero.id} />
                <img
                  src={battleClassArtSrc(char?.classId)}
                  alt={hero.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = missingArt;
                  }}
                />
                {char?.dog ? (
                  <img
                    className="pc-tactical-pet"
                    src={battlePetArtSrc()}
                    alt={char.dog.name}
                    title={char.dog.name}
                    onError={(e) => {
                      (e.target as HTMLImageElement).src = missingArt;
                    }}
                  />
                ) : null}
                <span className="pc-tactical-hp">
                  {hero.hp}/{hero.maxHp}
                </span>
              </div>
            ) : null}
          </button>
        );
      })}
    </div>
  );
}

function introLocked(battle: BattleState): boolean {
  return isBattleIntroActive(battle);
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
  const [now, setNow] = useState(() => Date.now());
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const seenFx = useRef<Set<string>>(new Set());
  const floaterBattleId = useRef<string | null>(null);

  useEffect(() => {
    if (!battle || battle.status !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [battle?.status, battle?.id]);

  useEffect(() => {
    if (!battle || battle.status !== "active") return;
    if (floaterBattleId.current !== battle.id) {
      floaterBattleId.current = battle.id;
      // Don't replay hydrated history as floaters.
      seenFx.current = new Set((battle.fxEvents ?? []).map((e) => e.id));
      setFloaters([]);
      return;
    }
    const events = battle.fxEvents ?? [];
    const fresh = events.filter((e) => !seenFx.current.has(e.id));
    if (!fresh.length) return;
    const birth = Date.now();
    for (const e of fresh) seenFx.current.add(e.id);
    setFloaters((prev) => [...prev, ...fresh.map((e) => ({ ...e, birth }))]);
  }, [battle]);

  useEffect(() => {
    if (!floaters.length) return;
    const id = window.setInterval(() => {
      const cutoff = Date.now() - FLOATER_MS;
      setFloaters((prev) => prev.filter((f) => f.birth > cutoff));
    }, 200);
    return () => window.clearInterval(id);
  }, [floaters.length]);

  if (!battle) return null;

  if (battle.status === "victory" || battle.status === "defeat") {
    return <BattleSummaryScreen battle={battle} onDismiss={onDismiss} />;
  }

  const introLeft = battleIntroRemainingMs(battle, now);
  const introActive = isBattleIntroActive(battle, now);
  const countdown = introLabel(introLeft);

  const battleLeft = Math.ceil(battleRemainingMs(battle, now) / 1000);
  const idleLeft = Math.ceil(turnIdleRemainingMs(battle, now) / 1000);
  const battleMin = Math.floor(battleLeft / 60);
  const battleSec = battleLeft % 60;

  const activeHero = battle.heroes.find((h) => h.id === battle.activeId);
  const isMyTurn = !!mySlot && battle.activeId === mySlot && canAct && !introActive;
  const me = mySlot ? world.characters[mySlot] : null;
  const spells = me ? battleSpellIds(me) : [];
  const foods = me ? foodItemIds(me.inventory) : [];
  const hpPots = me ? hpPotionIds(me.inventory) : [];
  const manaPots = me ? manaPotionIds(me.inventory) : [];
  const phase = battle.tactical?.phase ?? "move";

  const myUnit = battle.tactical && mySlot ? getUnit(battle.tactical, mySlot) : null;
  const foeUnit = battle.tactical ? getUnit(battle.tactical, "enemy") : null;
  const inAttackRange =
    !!myUnit && !!foeUnit && canStrike(myUnit, foeUnit);

  const phaseHint =
    phase === "move"
      ? "Tap a lit tile to move, or Wait to skip movement"
      : inAttackRange
        ? "In range — Attack, cast, or Wait"
        : "Out of range — Wait, heal, or Power Up";

  return (
    <div className="pc-battle-overlay" role="dialog" aria-label="Battle">
      <div className="pc-battle-frame pc-battle-frame--tactical" data-intro={introActive ? "true" : "false"}>
        {countdown && (
          <div className="pc-battle-countdown" aria-live="assertive">
            <span
              key={countdown}
              className="pc-battle-countdown-num"
              data-phrase={countdown === "BATTLE START" ? "true" : "false"}
            >
              {countdown}
            </span>
          </div>
        )}

        <div className="pc-battle-header">
          <p className="pc-eyebrow">Tactical encounter</p>
          <h2 className="pc-title text-xl md:text-2xl">
            {battle.enemy.isBoss ? "Boss — " : ""}
            {battle.enemy.name}
          </h2>
          <p className="text-xs opacity-80">{battle.enemy.blurb}</p>
          <p className="text-[0.65rem] mt-2 font-bold" style={{ color: "var(--pc-accent)" }}>
            {introActive
              ? "Locking in — hold for countdown"
              : `Battle clock ${battleMin}:${String(battleSec).padStart(2, "0")} left${
                  battle.activeId !== "enemy"
                    ? ` · Act in ${idleLeft}s or foe moves`
                    : " · Enemy turn"
                }`}
          </p>
        </div>

        <div className="pc-battle-tactical-layout">
          <TacticalBoard
            battle={battle}
            world={world}
            mySlot={mySlot}
            isMyTurn={isMyTurn}
            pending={pending}
            floaters={floaters}
            onMove={(x, y) => onAction("move", { x, y })}
            onAttackEnemy={() => onAction("attack")}
          />

          <aside className="pc-battle-roster">
            <div className="pc-battle-roster-enemy">
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
                  Unique: {battle.enemy.uniqueSkill.name}
                </p>
              )}
            </div>
            {battle.heroes.map((h) => {
              const char = world.characters[h.slot];
              const classId = char?.classId;
              const className = classId ? CLASS_DEFS[classId]?.name : "Hero";
              const unit = battle.tactical ? getUnit(battle.tactical, h.id) : null;
              return (
                <div
                  key={h.id}
                  className="pc-battle-roster-hero"
                  data-active={battle.activeId === h.id}
                  data-down={h.hp <= 0}
                >
                  <p className="font-bold text-sm">
                    {h.name}
                    {h.powerUpTurns > 0 ? ` ▲${h.powerUpTurns}` : ""}
                    {battle.activeId === h.id ? " ★" : ""}
                  </p>
                  <p className="pc-battle-hero-class">
                    {className}
                    {unit ? ` · Spd ${unit.speed} · Rng ${unit.range}` : ""}
                  </p>
                  <Meter label="HP" value={h.hp} max={h.maxHp} tone="hp" />
                  <Meter label="Mana" value={h.mana} max={h.maxMana} tone="mana" />
                </div>
              );
            })}
          </aside>
        </div>

        <p className="pc-battle-turn">
          {introActive
            ? "Stand by…"
            : battle.activeId === "enemy"
              ? `${battle.enemy.name}'s turn…`
              : isMyTurn
                ? `Your turn — ${phase === "move" ? "Move" : "Act"}: ${phaseHint}`
                : `${activeHero?.name ?? "Ally"}'s turn`}
          {battle.lastRocLabel ? (
            <span className="block text-[0.65rem] opacity-80 mt-1 font-normal normal-case tracking-normal">
              {battle.lastRocLabel}
            </span>
          ) : null}
        </p>

        <div className="pc-battle-actions">
          <button
            type="button"
            className="pc-choice pc-battle-action"
            disabled={!isMyTurn || pending || !inAttackRange}
            title={
              inAttackRange
                ? "Strike the foe"
                : "Move adjacent (or into range) first"
            }
            onClick={() => onAction("attack")}
          >
            <strong>Attack</strong>
            <span className="block text-[0.65rem] opacity-70">
              {inAttackRange ? "Strike with your weapon" : "Out of range"}
            </span>
          </button>
          <button
            type="button"
            className="pc-choice pc-battle-action"
            disabled={!isMyTurn || pending}
            title="+25% damage for 3 turns"
            onClick={() => onAction("powerUp")}
          >
            <strong>Power Up</strong>
            <span className="block text-[0.65rem] opacity-70">+25% dmg, 3 turns</span>
          </button>
          <button
            type="button"
            className="pc-choice pc-battle-action"
            disabled={!isMyTurn || pending}
            title={phase === "move" ? "Skip movement" : "End turn"}
            onClick={() => onAction("wait")}
          >
            <strong>Wait</strong>
            <span className="block text-[0.65rem] opacity-70">
              {phase === "move" ? "Skip move → act" : "End turn"}
            </span>
          </button>
        </div>

        {isMyTurn && foods.length > 0 && (
          <div className="pc-battle-spell-row">
            <p className="pc-eyebrow text-[0.65rem]">Eat</p>
            <div className="flex flex-wrap gap-2">
              {countIds(foods).map(({ id, count }) => {
                const gear = getGear(id);
                const heal = gear?.heal ?? 8;
                return (
                  <button
                    key={id}
                    type="button"
                    className="pc-chip"
                    disabled={!isMyTurn || pending}
                    title={`Eat ${itemLabel(id)} (+${heal} HP)`}
                    onClick={() => onAction("eat", { itemId: id })}
                  >
                    {itemLabel(id)}
                    {count > 1 ? ` ×${count}` : ""}
                    {` (+${heal} HP)`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isMyTurn && hpPots.length > 0 && (
          <div className="pc-battle-spell-row">
            <p className="pc-eyebrow text-[0.65rem]">HP potions</p>
            <div className="flex flex-wrap gap-2">
              {countIds(hpPots).map(({ id, count }) => {
                const gear = getGear(id);
                const heal = gear?.heal ?? 25;
                return (
                  <button
                    key={id}
                    type="button"
                    className="pc-chip"
                    disabled={!isMyTurn || pending}
                    title={`Drink ${itemLabel(id)} (+${heal} HP)`}
                    onClick={() => onAction("drinkHp", { itemId: id })}
                  >
                    {itemLabel(id)}
                    {count > 1 ? ` ×${count}` : ""}
                    {` (+${heal} HP)`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {isMyTurn && manaPots.length > 0 && (
          <div className="pc-battle-spell-row">
            <p className="pc-eyebrow text-[0.65rem]">Mana potions</p>
            <div className="flex flex-wrap gap-2">
              {countIds(manaPots).map(({ id, count }) => {
                const gear = getGear(id);
                const restore = gear?.manaRestore ?? 20;
                return (
                  <button
                    key={id}
                    type="button"
                    className="pc-chip"
                    disabled={!isMyTurn || pending}
                    title={`Drink ${itemLabel(id)} (+${restore} Mana)`}
                    onClick={() => onAction("drinkMana", { itemId: id })}
                  >
                    {itemLabel(id)}
                    {count > 1 ? ` ×${count}` : ""}
                    {` (+${restore} MP)`}
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
