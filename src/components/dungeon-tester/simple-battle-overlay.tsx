"use client";

import { useEffect, useMemo, useState } from "react";
import { battleClassArtSrc } from "@/lib/downtown/party-chronicle/art";
import type { ClassId } from "@/lib/downtown/party-chronicle/types";
import {
  SIMPLE_BATTLE_ACTIONS,
  type SimpleBattleActionId,
  type SimpleBattleState,
  type SimpleBattleUnit,
  type SimpleMapTheme,
} from "@/lib/downtown/dungeon-tester/simple-battle";
import { dtEnemyArtSrc, simpleBattleMapSrc } from "@/lib/downtown/dungeon-tester/art";
import type { PlayerSlot } from "@/lib/downtown/dungeon-tester/types";

type Props = {
  battle: SimpleBattleState;
  mySlot: PlayerSlot | null;
  canAct: boolean;
  pending?: boolean;
  onAction: (heroId: string, action: SimpleBattleActionId, targetId?: string) => void;
  onDismiss: () => void;
  onFxDone?: () => void;
};

const MAP_LABEL: Record<SimpleMapTheme, string> = {
  "dust-road": "Dust road",
  "chain-yard": "Chain yard",
  "thorn-hills": "Thorn hills",
  cave: "Cave mouth",
  swamp: "Mire edge",
  ruins: "Old ruins",
  forest: "Wild forest",
  campfire: "Camp clearing",
};

function unitArtSrc(unit: SimpleBattleUnit): string | null {
  if (unit.side === "hero" && unit.classId) {
    return battleClassArtSrc(unit.classId as ClassId);
  }
  if (unit.side === "enemy") {
    return dtEnemyArtSrc({ artId: unit.artId, name: unit.name, id: unit.id });
  }
  return null;
}

function ClipUnit({ unit, active }: { unit: SimpleBattleUnit; active?: boolean }) {
  const down = unit.hp <= 0;
  const art = unitArtSrc(unit);
  return (
    <div
      className="dt-sbat-unit"
      data-side={unit.side}
      data-down={down ? "true" : "false"}
      data-active={active ? "true" : "false"}
      data-haste={unit.haste ? "true" : "false"}
      style={{ ["--unit-color" as string]: unit.color }}
    >
      {art ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img className="dt-sbat-clip" src={art} alt="" draggable={false} />
      ) : (
        <svg className="dt-sbat-sil" viewBox="0 0 40 56" aria-hidden>
          <ellipse cx="20" cy="52" rx="12" ry="3" fill="rgba(0,0,0,0.28)" />
          <circle cx="20" cy="10" r="7" fill={unit.color} />
          <path
            d={
              unit.side === "hero"
                ? "M12 18 L28 18 L30 40 L26 52 L14 52 L10 40 Z"
                : "M10 18 L30 18 L32 36 L28 52 L12 52 L8 36 Z"
            }
            fill={unit.color}
            opacity={down ? 0.35 : 1}
          />
        </svg>
      )}
      <div className="dt-sbat-name">{unit.name}</div>
      <div className="dt-sbat-hp">
        <span style={{ width: `${Math.max(0, (unit.hp / unit.maxHp) * 100)}%` }} />
      </div>
      <div className="dt-sbat-meta">
        {unit.hp}/{unit.maxHp}
        {unit.haste ? " · Haste" : ""}
        {unit.side === "hero" && unit.actionsLeft > 0 && !down
          ? ` · ${unit.actionsLeft} act`
          : ""}
      </div>
    </div>
  );
}

function RayLayer({ battle }: { battle: SimpleBattleState }) {
  const byId = useMemo(() => {
    const m = new Map<string, SimpleBattleUnit>();
    for (const u of battle.units) m.set(u.id, u);
    return m;
  }, [battle.units]);

  return (
    <svg className="dt-sbat-rays" viewBox="0 0 100 100" preserveAspectRatio="none">
      {battle.fx
        .filter((f) => f.kind === "ray")
        .map((f) => {
          const a = byId.get(f.fromId);
          const b = byId.get(f.toId);
          if (!a || !b) return null;
          return (
            <line
              key={f.id}
              className="dt-sbat-ray"
              x1={a.x}
              y1={a.y - 4}
              x2={b.x}
              y2={b.y - 4}
              stroke={f.color ?? "#ffe08a"}
              strokeWidth="1.4"
            />
          );
        })}
    </svg>
  );
}

function FloatLayer({ battle }: { battle: SimpleBattleState }) {
  const byId = useMemo(() => {
    const m = new Map<string, SimpleBattleUnit>();
    for (const u of battle.units) m.set(u.id, u);
    return m;
  }, [battle.units]);

  return (
    <div className="dt-sbat-floats">
      {battle.fx
        .filter((f) => f.kind === "float")
        .map((f) => {
          const t = byId.get(f.toId) ?? byId.get(f.fromId);
          if (!t) return null;
          return (
            <span
              key={f.id}
              className="dt-sbat-float"
              style={{
                left: `${t.x}%`,
                top: `${Math.max(8, t.y - 14)}%`,
                color: f.color ?? "#fff",
              }}
            >
              {f.label}
            </span>
          );
        })}
    </div>
  );
}

export function SimpleBattleOverlay({
  battle,
  mySlot,
  canAct,
  pending,
  onAction,
  onDismiss,
  onFxDone,
}: Props) {
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(battle.focusHeroId);
  const [action, setAction] = useState<SimpleBattleActionId | null>(null);
  const [needTarget, setNeedTarget] = useState<"enemy" | "ally" | "self" | "none" | null>(
    null
  );

  const mapSrc = useMemo(
    () => simpleBattleMapSrc(battle.mapTheme, battle.mapVariant),
    [battle.mapTheme, battle.mapVariant]
  );

  useEffect(() => {
    setSelectedHeroId(battle.focusHeroId);
    setAction(null);
    setNeedTarget(null);
  }, [battle.focusHeroId, battle.round, battle.phase]);

  useEffect(() => {
    if (!battle.fx.length || !onFxDone) return;
    const t = window.setTimeout(() => onFxDone(), 750);
    return () => window.clearTimeout(t);
  }, [battle.fx, onFxDone]);

  const heroes = battle.units.filter((u) => u.side === "hero");
  const enemies = battle.units.filter((u) => u.side === "enemy");
  const selected = heroes.find((u) => u.id === selectedHeroId) ?? null;
  const myHero = mySlot ? (heroes.find((u) => u.slot === mySlot) ?? null) : null;
  const actingHero =
    selected && selected.actionsLeft > 0 && selected.hp > 0
      ? selected
      : (heroes.find((u) => u.actionsLeft > 0 && u.hp > 0) ?? null);

  const summary = battle.status !== "active" || battle.phase === "summary";
  const playerTurn = battle.status === "active" && battle.phase === "player";

  const pickAction = (id: SimpleBattleActionId) => {
    if (!actingHero || !canAct || pending || !playerTurn) return;
    const def = SIMPLE_BATTLE_ACTIONS.find((a) => a.id === id);
    if (!def) return;
    setSelectedHeroId(actingHero.id);
    if (def.needsTarget === "self" || def.needsTarget === "none") {
      onAction(actingHero.id, id, actingHero.id);
      setAction(null);
      setNeedTarget(null);
      return;
    }
    setAction(id);
    setNeedTarget(def.needsTarget);
  };

  const pickTarget = (unit: SimpleBattleUnit) => {
    if (!actingHero || !action || !needTarget || !canAct || pending) return;
    if (needTarget === "enemy" && unit.side !== "enemy") return;
    if (needTarget === "ally" && unit.side !== "hero") return;
    if (unit.hp <= 0 && needTarget === "enemy") return;
    onAction(actingHero.id, action, unit.id);
    setAction(null);
    setNeedTarget(null);
  };

  return (
    <div className="dt-sbat-overlay" role="dialog" aria-label="DungeonTester battle">
      <div className="dt-sbat-panel">
        <header className="dt-sbat-head">
          <div>
            <p className="dt-sbat-eyebrow">
              Crude ambush · {MAP_LABEL[battle.mapTheme]} · round {battle.round}
            </p>
            <h2 className="dt-sbat-title">
              {summary
                ? battle.status === "victory"
                  ? "Victory"
                  : "Defeat"
                : "Stand and fight"}
            </h2>
          </div>
          <p className="dt-sbat-msg">{battle.message}</p>
        </header>

        <div
          className="dt-sbat-field"
          data-theme={battle.mapTheme}
          data-variant={battle.mapVariant}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img className="dt-sbat-map" src={mapSrc} alt="" draggable={false} />
          <div className="dt-sbat-map-wash" aria-hidden />
          <RayLayer battle={battle} />
          <FloatLayer battle={battle} />
          {battle.units.map((u) => (
            <button
              key={u.id}
              type="button"
              className="dt-sbat-hit"
              style={{ left: `${u.x}%`, top: `${u.y}%` }}
              disabled={
                summary ||
                !needTarget ||
                (needTarget === "enemy" && u.side !== "enemy") ||
                (needTarget === "ally" && u.side !== "hero") ||
                (u.hp <= 0 && needTarget === "enemy")
              }
              onClick={() => pickTarget(u)}
              aria-label={`Select ${u.name}`}
            >
              <ClipUnit
                unit={u}
                active={
                  (!!needTarget &&
                    ((needTarget === "enemy" && u.side === "enemy") ||
                      (needTarget === "ally" && u.side === "hero"))) ||
                  u.id === (actingHero?.id ?? selectedHeroId)
                }
              />
            </button>
          ))}
        </div>

        {!summary ? (
          <div className="dt-sbat-controls">
            <div className="dt-sbat-hero-picks">
              {heroes.map((h) => (
                <button
                  key={h.id}
                  type="button"
                  className="dt-btn"
                  data-primary={h.id === actingHero?.id ? "true" : "false"}
                  disabled={h.hp <= 0 || h.actionsLeft <= 0 || !playerTurn}
                  onClick={() => {
                    setSelectedHeroId(h.id);
                    setAction(null);
                    setNeedTarget(null);
                  }}
                >
                  {h.name}
                  {h.slot === mySlot ? " (you)" : ""}
                  {h.haste ? " · Haste" : ""}
                </button>
              ))}
            </div>

            <p className="dt-sbat-hint">
              {needTarget === "enemy"
                ? "Click an enemy — fixed spots, no movement."
                : needTarget === "ally"
                  ? "Click an ally for Buff / Heal."
                  : playerTurn
                    ? `${actingHero?.name ?? "Hero"}: Attack · Buff · Heal · Potion · Magic. Haste → 2 actions.`
                    : "Enemy turn…"}
              {actingHero ? ` · Mana ${actingHero.mana}/${actingHero.maxMana}` : ""}
              {myHero && myHero.id !== actingHero?.id
                ? ` · You ${myHero.hp}/${myHero.maxHp}`
                : ""}
            </p>

            <div className="dt-sbat-actions">
              {SIMPLE_BATTLE_ACTIONS.map((a) => (
                <button
                  key={a.id}
                  type="button"
                  className="dt-btn"
                  data-primary={action === a.id ? "true" : "false"}
                  disabled={
                    !canAct ||
                    pending ||
                    !playerTurn ||
                    !actingHero ||
                    actingHero.actionsLeft <= 0 ||
                    (a.id === "magic" && (actingHero?.mana ?? 0) < 6)
                  }
                  onClick={() => pickAction(a.id)}
                >
                  {a.label}
                </button>
              ))}
            </div>

            <ul className="dt-sbat-log">
              {battle.log.slice(0, 6).map((line, i) => (
                <li key={`${i}-${line.slice(0, 16)}`}>{line}</li>
              ))}
            </ul>

            <p className="dt-sbat-foe-line">
              Foes:{" "}
              {enemies
                .map((e) => (e.hp > 0 ? `${e.name} (${e.hp})` : `${e.name} down`))
                .join(" · ")}
            </p>
          </div>
        ) : (
          <div className="dt-sbat-summary">
            <p>
              {battle.status === "victory"
                ? `Victory — +${battle.goldReward}g · +${battle.xpReward} XP. Back to story.`
                : "Defeat — soft recover. Continue the march from Story."}
            </p>
            <button type="button" className="dt-btn" data-primary="true" onClick={onDismiss}>
              Continue →
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
