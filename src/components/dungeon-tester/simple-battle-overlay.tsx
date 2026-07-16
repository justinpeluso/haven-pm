"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { battleClassArtSrc } from "@/lib/downtown/party-chronicle/art";
import type { ClassId } from "@/lib/downtown/party-chronicle/types";
import {
  SIMPLE_BATTLE_ACTIONS,
  simpleBattleShouldSkipSplash,
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
  /** Flee / soft-lock escape while fight is still active. */
  onFlee?: () => void;
  onFxDone?: () => void;
  /** Called after player FX so foes can act without wiping rays immediately. */
  onEnemyAdvance?: () => void;
  /** Persist splashDone for this battle id (sync:false is fine). */
  onSplashDone?: () => void;
};

const ENEMY_ADVANCE_MS = 700;
const ENEMY_WATCHDOG_MS = 900;
const ENEMY_WATCHDOG_MAX_MS = 8000;

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

/** Hold splash readable then fade (~2.2s total). */
const INTRO_HOLD_MS = 1400;
const INTRO_FADE_MS = 800;

function unitArtSrc(unit: SimpleBattleUnit): string | null {
  if (unit.side === "hero" && unit.classId) {
    return battleClassArtSrc(unit.classId as ClassId);
  }
  if (unit.side === "enemy") {
    return dtEnemyArtSrc({ artId: unit.artId, name: unit.name, id: unit.id });
  }
  return null;
}

function pct(cur: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (cur / max) * 100));
}

function StatBars({
  unit,
  compact,
}: {
  unit: SimpleBattleUnit;
  compact?: boolean;
}) {
  const down = unit.hp <= 0;
  const hero = unit.side === "hero";
  return (
    <div className="dt-sbat-bars" data-compact={compact ? "true" : "false"} data-down={down ? "true" : "false"}>
      <div className="dt-sbat-bar" data-kind="hp" title={`HP ${unit.hp}/${unit.maxHp}`}>
        <span className="dt-sbat-bar-lab">HP</span>
        <div className="dt-sbat-bar-track">
          <span style={{ width: `${pct(unit.hp, unit.maxHp)}%` }} />
        </div>
        <span className="dt-sbat-bar-num">
          {unit.hp}/{unit.maxHp}
        </span>
      </div>
      {hero ? (
        <>
          <div className="dt-sbat-bar" data-kind="mp" title={`Mana ${unit.mana}/${unit.maxMana}`}>
            <span className="dt-sbat-bar-lab">MP</span>
            <div className="dt-sbat-bar-track">
              <span style={{ width: `${pct(unit.mana, unit.maxMana)}%` }} />
            </div>
            <span className="dt-sbat-bar-num">
              {unit.mana}/{unit.maxMana}
            </span>
          </div>
          <div
            className="dt-sbat-bar"
            data-kind="st"
            title={`Stamina ${unit.stamina}/${unit.maxStamina}`}
          >
            <span className="dt-sbat-bar-lab">ST</span>
            <div className="dt-sbat-bar-track">
              <span style={{ width: `${pct(unit.stamina, unit.maxStamina)}%` }} />
            </div>
            <span className="dt-sbat-bar-num">
              {unit.stamina}/{unit.maxStamina}
            </span>
          </div>
        </>
      ) : null}
    </div>
  );
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
      <div className="dt-sbat-name">
        {unit.name}
        {unit.haste ? " ·!" : ""}
        {unit.side === "hero" && unit.actionsLeft > 0 && !down
          ? ` · ${unit.actionsLeft}`
          : ""}
      </div>
      <StatBars unit={unit} compact />
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

/**
 * Presentation only. FSM lives in simple-battle.ts.
 * Intro: arm once per battle.id from durable splashDone (no force-off on phase churn).
 * Enemy: one timer chain + soft watchdog; never player actions / never splash.
 */
export function SimpleBattleOverlay({
  battle,
  mySlot,
  canAct,
  pending,
  onAction,
  onDismiss,
  onFlee,
  onFxDone,
  onEnemyAdvance,
  onSplashDone,
}: Props) {
  const [selectedHeroId, setSelectedHeroId] = useState<string | null>(battle.focusHeroId);
  const [action, setAction] = useState<SimpleBattleActionId | null>(null);
  const [needTarget, setNeedTarget] = useState<"enemy" | "ally" | "self" | "none" | null>(
    null
  );

  const skipIntro =
    !!battle.splashDone || simpleBattleShouldSkipSplash(battle);

  const [introPhase, setIntroPhase] = useState<"in" | "out" | "gone">(
    skipIntro ? "gone" : "in"
  );
  /** Only one splash persist per battle.id for this mount. */
  const splashCompletedRef = useRef<string | null>(skipIntro ? battle.id : null);
  const onEnemyAdvanceRef = useRef(onEnemyAdvance);
  onEnemyAdvanceRef.current = onEnemyAdvance;
  const onFxDoneRef = useRef(onFxDone);
  onFxDoneRef.current = onFxDone;
  const onSplashDoneRef = useRef(onSplashDone);
  onSplashDoneRef.current = onSplashDone;

  const mapSrc = useMemo(
    () => simpleBattleMapSrc(battle.mapTheme, battle.mapVariant),
    [battle.mapTheme, battle.mapVariant]
  );

  const finishSplash = (id: string) => {
    if (splashCompletedRef.current === id) {
      setIntroPhase((p) => (p === "gone" ? p : "gone"));
      return;
    }
    splashCompletedRef.current = id;
    setIntroPhase("gone");
    onSplashDoneRef.current?.();
  };

  const dismissSplash = () => {
    finishSplash(battle.id);
  };

  useEffect(() => {
    setSelectedHeroId(battle.focusHeroId);
    setAction(null);
    setNeedTarget(null);
  }, [battle.focusHeroId, battle.round, battle.phase]);

  useEffect(() => {
    if (!battle.fx.length || !onFxDoneRef.current) return;
    // During deferred enemy phase, keep rays until onEnemyAdvance runs.
    if (battle.phase === "enemy") return;
    const clear = onFxDoneRef.current;
    const t = window.setTimeout(() => clear?.(), 750);
    return () => window.clearTimeout(t);
  }, [battle.fx, battle.phase]);

  // One timer chain while ENEMY: initial delay + soft watchdog. Clears on leave.
  useEffect(() => {
    if (battle.status !== "active" || battle.phase !== "enemy") return;
    let cancelled = false;
    const tryAdvance = () => {
      if (cancelled) return;
      onEnemyAdvanceRef.current?.();
    };
    const delay = battle.fx.length ? ENEMY_ADVANCE_MS : 180;
    const t = window.setTimeout(tryAdvance, delay);
    const watchdog = window.setInterval(tryAdvance, ENEMY_WATCHDOG_MS);
    const stopWatchdog = window.setTimeout(() => {
      window.clearInterval(watchdog);
    }, ENEMY_WATCHDOG_MAX_MS);
    return () => {
      cancelled = true;
      window.clearTimeout(t);
      window.clearInterval(watchdog);
      window.clearTimeout(stopWatchdog);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-arm on phase/round only
  }, [battle.status, battle.phase, battle.round]);

  // Comic START BATTLE — arm timers exactly once per battle.id.
  // Driven by durable splashDone / skip heuristics at arm time only.
  // Deps MUST stay [battle.id] so mid-fight phase churn cannot restart intro.
  useEffect(() => {
    const id = battle.id;
    if (battle.splashDone || simpleBattleShouldSkipSplash(battle)) {
      setIntroPhase("gone");
      splashCompletedRef.current = id;
      return;
    }
    splashCompletedRef.current = null;
    setIntroPhase("in");
    const fade = window.setTimeout(() => setIntroPhase("out"), INTRO_HOLD_MS);
    const gone = window.setTimeout(() => finishSplash(id), INTRO_HOLD_MS + INTRO_FADE_MS);
    return () => {
      window.clearTimeout(fade);
      window.clearTimeout(gone);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps -- once per battle.id only
  }, [battle.id]);

  // Escape dismisses stuck splash.
  useEffect(() => {
    if (introPhase === "gone") return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.preventDefault();
        dismissSplash();
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [introPhase, battle.id]);

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
  // Intro never blocks when splash was already stamped or fight progressed.
  const introBusy =
    introPhase !== "gone" &&
    battle.status === "active" &&
    !summary &&
    !battle.splashDone &&
    !simpleBattleShouldSkipSplash(battle);
  const controlsLocked = introBusy || !canAct || !!pending || !playerTurn;

  const pickAction = (id: SimpleBattleActionId) => {
    if (!actingHero || controlsLocked) return;
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
    if (!actingHero || !action || !needTarget || controlsLocked) return;
    if (needTarget === "enemy" && unit.side !== "enemy") return;
    if (needTarget === "ally" && unit.side !== "hero") return;
    if (unit.hp <= 0 && needTarget === "enemy") return;
    onAction(actingHero.id, action, unit.id);
    setAction(null);
    setNeedTarget(null);
  };

  return (
    <div className="dt-sbat-overlay" role="dialog" aria-label="True Grit battle">
      <div className="dt-sbat-panel">
        <header className="dt-sbat-head">
          <div>
            <p className="dt-sbat-eyebrow">
              Crude Ambush · {MAP_LABEL[battle.mapTheme]} · Round {battle.round}
            </p>
            <h2 className="dt-sbat-title">
              {summary
                ? battle.status === "victory"
                  ? "Victory"
                  : "Defeat"
                : "Stand and Fight"}
            </h2>
          </div>
          <div className="dt-sbat-head-actions">
            <p className="dt-sbat-msg">{battle.message}</p>
            {!summary && onFlee ? (
              <button
                type="button"
                className="dt-btn"
                data-flee="true"
                data-back="true"
                disabled={!!pending}
                onClick={onFlee}
                title="Flee ambush (soft recover) — always available escape"
              >
                ← Flee
              </button>
            ) : null}
            {summary ? (
              <button
                type="button"
                className="dt-btn"
                data-primary="true"
                data-back="true"
                onClick={onDismiss}
              >
                ← Return to story
              </button>
            ) : null}
          </div>
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
                introBusy ||
                !needTarget ||
                (needTarget === "enemy" && u.side !== "enemy") ||
                (needTarget === "ally" && u.side !== "hero")
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

          {introBusy ? (
            <>
              <button
                type="button"
                className="dt-sbat-intro"
                data-phase={introPhase}
                aria-live="assertive"
                aria-label="Dismiss start battle splash"
                key={`intro-${battle.id}`}
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  dismissSplash();
                }}
              >
                <span className="dt-sbat-intro-badge">START BATTLE</span>
                <span className="dt-sbat-intro-sub">
                  {enemies.map((e) => e.name).join(" · ") || "Ambush"}
                </span>
                <span className="dt-sbat-intro-hint">Click or Esc to skip</span>
              </button>
              {onFlee ? (
                <button
                  type="button"
                  className="dt-btn dt-sbat-intro-flee"
                  data-flee="true"
                  data-back="true"
                  disabled={!!pending}
                  onClick={onFlee}
                  title="Flee ambush during intro"
                >
                  ← Flee
                </button>
              ) : null}
            </>
          ) : null}
        </div>

        {!summary ? (
          <div className="dt-sbat-controls">
            <div className="dt-sbat-party-strip" aria-label="Party status">
              {heroes.map((h) => (
                <button
                  key={`strip-${h.id}`}
                  type="button"
                  className="dt-sbat-party-card"
                  data-active={h.id === actingHero?.id ? "true" : "false"}
                  data-mine={h.slot === mySlot ? "true" : "false"}
                  disabled={h.hp <= 0 || h.actionsLeft <= 0 || !playerTurn || introBusy}
                  onClick={() => {
                    setSelectedHeroId(h.id);
                    setAction(null);
                    setNeedTarget(null);
                  }}
                >
                  <div className="dt-sbat-party-name">
                    {h.name}
                    {h.slot === mySlot ? " (you)" : ""}
                    {h.haste ? " · Haste" : ""}
                  </div>
                  <StatBars unit={h} />
                </button>
              ))}
            </div>

            <p className="dt-sbat-hint">
              {introBusy
                ? "Ambush!"
                : needTarget === "enemy"
                  ? "Click an enemy — fixed spots, no movement."
                  : needTarget === "ally"
                    ? "Click an ally for Buff / Heal."
                    : playerTurn
                      ? `${actingHero?.name ?? "Hero"}: Attack · Buff · Heal · Potion · Magic. Fixed spots · Haste → 2 actions.`
                      : "Enemy turn…"}
              {actingHero && !introBusy
                ? ` · MP ${actingHero.mana}/${actingHero.maxMana} · ST ${actingHero.stamina}/${actingHero.maxStamina}`
                : ""}
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
                    controlsLocked ||
                    !actingHero ||
                    actingHero.actionsLeft <= 0 ||
                    (a.id === "magic" && (actingHero?.mana ?? 0) < 6)
                  }
                  onClick={() => pickAction(a.id)}
                >
                  {a.label}
                </button>
              ))}
              {onFlee ? (
                <button
                  type="button"
                  className="dt-btn"
                  data-flee="true"
                  data-back="true"
                  disabled={!!pending}
                  onClick={onFlee}
                  title="Flee ambush (soft recover) — escape soft-locks"
                >
                  ← Flee
                </button>
              ) : null}
            </div>

            <ul className="dt-sbat-log">
              {battle.log.slice(0, 6).map((line, i) => (
                <li key={`${i}-${line.slice(0, 16)}`}>{line}</li>
              ))}
            </ul>

            <p className="dt-sbat-foe-line">
              Foes:{" "}
              {enemies
                .map((e) => (e.hp > 0 ? `${e.name} (${e.hp}/${e.maxHp})` : `${e.name} down`))
                .join(" · ")}
            </p>
          </div>
        ) : (
          <div className="dt-sbat-endscreen" data-outcome={battle.status}>
            <p className="dt-sbat-endscreen-banner">
              {battle.status === "victory" ? "VICTORY" : "DEFEAT"}
            </p>
            <ul className="dt-sbat-endscreen-stats">
              <li>
                Rounds <strong>{battle.combatStats?.rounds ?? battle.round}</strong>
              </li>
              <li>
                Damage dealt <strong>{battle.combatStats?.damageDealt ?? 0}</strong>
              </li>
              <li>
                Damage taken <strong>{battle.combatStats?.damageTaken ?? 0}</strong>
              </li>
              <li>
                Foes defeated{" "}
                <strong>
                  {battle.combatStats?.foesDefeated ??
                    battle.units.filter((u) => u.side === "enemy" && u.hp <= 0).length}
                </strong>
              </li>
              {battle.status === "victory" ? (
                <>
                  <li>
                    Gold <strong>+{battle.goldReward}g</strong>
                  </li>
                  <li>
                    XP <strong>+{battle.xpReward}</strong>
                  </li>
                </>
              ) : (
                <li>
                  Soft recover <strong>party limps on</strong>
                </li>
              )}
            </ul>
            <div className="dt-sbat-endscreen-loot">
              <p className="dt-sbat-endscreen-loot-title">Items dropped</p>
              {(battle.lootDrops?.length ?? 0) > 0 ? (
                <ul>
                  {battle.lootDrops!.map((d) => (
                    <li key={d.itemId}>
                      <span className="dt-sbat-loot-name">{d.name}</span>
                      {d.blurb ? (
                        <span className="dt-sbat-loot-blurb"> — {d.blurb}</span>
                      ) : null}
                    </li>
                  ))}
                </ul>
              ) : (
                <p className="dt-sbat-endscreen-loot-empty">
                  {battle.status === "victory"
                    ? "Pockets empty. The road takes its cut."
                    : "Nothing but dust and bruised pride."}
                </p>
              )}
            </div>
            <button type="button" className="dt-btn" data-primary="true" data-back="true" onClick={onDismiss}>
              ← Return to story
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
