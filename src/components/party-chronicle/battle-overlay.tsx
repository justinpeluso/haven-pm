"use client";

import {
  battleEnemyPack,
  battleIntroRemainingMs,
  battleRemainingMs,
  battleSpellIds,
  canSpellStrike,
  canStrike,
  foodItemIds,
  getEnemyByUnitId,
  getUnit,
  hpPotionIds,
  isBattleIntroActive,
  isEnemyCombatantId,
  isFlanking,
  legalMoves,
  manaPotionIds,
  rangeTiles,
  spellStrikeRange,
  threatenedTiles,
  turnIdleRemainingMs,
  type BattleActionOpts,
} from "@/lib/downtown/party-chronicle/battle";
import { useEffect, useMemo, useRef, useState, type CSSProperties } from "react";
import {
  battleAbilityRole,
  getAbility,
  isBattleDamageAbility,
  isBattleSupportAbility,
} from "@/lib/downtown/party-chronicle/skills";
import { getSpellbookAbility } from "@/lib/downtown/party-chronicle/bestiary";
import { getGear } from "@/lib/downtown/party-chronicle/gear";
import {
  battleClassArtSrc,
  battleEnemyArtSrc,
  battlePetArtSrc,
} from "@/lib/downtown/party-chronicle/art";
import { CLASS_DEFS } from "@/lib/downtown/party-chronicle/players";
import { MAX_LEVEL, xpProgress } from "@/lib/downtown/party-chronicle/progression";
import type {
  BattleActionId,
  BattleFxEvent,
  BattleFxTone,
  BattleState,
  BattleStatusId,
  CharacterSave,
  PartyWorldSave,
  PlayerSlot,
} from "@/lib/downtown/party-chronicle/types";

const FLOATER_MS = 2000;
const VFX_BEAM_MS = 550;
const VFX_SWING_MS = 380;
const VFX_BUFF_MS = 1100;
const VFX_KO_MS = 700;
const HINT_KEY = "pc-battle-hint-v1";

type Floater = BattleFxEvent & { birth: number; delay?: number };

type TargetingMode =
  | { kind: "attack" }
  | { kind: "spell-damage"; spellId: string }
  | { kind: "spell-support"; spellId: string; role: "heal" | "buff" }
  | null;

type PendingConfirm =
  | { action: "attack"; targetId: string; label: string }
  | { action: "spell"; spellId: string; targetId: string; label: string }
  | null;

type BoardVfx = {
  id: string;
  kind: "beam" | "swing" | "buff" | "ko";
  birth: number;
  delay: number;
  sourceId?: string;
  targetId: string;
  tone?: BattleFxTone;
  cellX?: number;
  cellY?: number;
};

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

function statusGlyph(id: BattleStatusId): string {
  switch (id) {
    case "powered":
      return "▲";
    case "warded":
      return "⛨";
    case "healed":
      return "✚";
    case "marked":
      return "◎";
    default:
      return "•";
  }
}

function statusTitle(id: BattleStatusId): string {
  switch (id) {
    case "powered":
      return "Powered (+dmg)";
    case "warded":
      return "Warded";
    case "healed":
      return "Recently healed";
    case "marked":
      return "Marked";
    default:
      return id;
  }
}

function cellCenterPct(
  x: number,
  y: number,
  cols: number,
  rows: number
): { left: number; top: number } {
  return {
    left: ((x + 0.5) / cols) * 100,
    top: ((y + 0.5) / rows) * 100,
  };
}

function Meter({
  label,
  value,
  max,
  tone,
  compact,
}: {
  label: string;
  value: number;
  max: number;
  tone: "hp" | "mana" | "enemy" | "xp";
  compact?: boolean;
}) {
  const pct = max > 0 ? Math.round(Math.min(100, Math.max(0, (value / max) * 100))) : 0;
  return (
    <div className={compact ? "pc-meter-wrap pc-meter-wrap--compact" : "pc-meter-wrap"}>
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

function XpMeter({ xp, compact }: { xp: number; compact?: boolean }) {
  const prog = xpProgress(xp);
  const maxed = prog.level >= MAX_LEVEL;
  return (
    <Meter
      label={maxed ? `XP · Lv ${prog.level} MAX` : `XP · Lv ${prog.level}`}
      value={maxed ? prog.need : prog.into}
      max={prog.need}
      tone="xp"
      compact={compact}
    />
  );
}

function CombatFloaters({
  floaters,
  target,
}: {
  floaters: Floater[];
  target: string;
}) {
  const mine = floaters.filter(
    (f) =>
      f.target === target &&
      (f.kind === "damage" ||
        f.kind === "heal" ||
        f.kind === "miss" ||
        f.kind === "crit" ||
        f.kind === "flank")
  );
  if (!mine.length) return null;
  return (
    <div className="pc-battle-floaters" aria-hidden>
      {mine.map((f, i) => (
        <span
          key={f.id}
          className="pc-battle-floater"
          data-kind={f.kind}
          style={
            {
              "--pc-floater-i": i,
              animationDelay: `${f.delay ?? 0}ms`,
            } as CSSProperties
          }
        >
          {f.kind === "heal"
            ? `+${f.amount ?? 0}`
            : f.kind === "miss"
              ? "MISS"
              : f.kind === "flank"
                ? "FLANK!"
                : f.kind === "crit"
                  ? `CRIT −${f.amount ?? 0}`
                  : `−${f.amount ?? 0}`}
        </span>
      ))}
    </div>
  );
}

function StatusIcons({
  statuses,
}: {
  statuses?: { id: BattleStatusId; turns: number }[];
}) {
  if (!statuses?.length) return null;
  return (
    <div className="pc-token-statuses" aria-hidden>
      {statuses.map((s) => (
        <span key={s.id} className="pc-token-status" data-id={s.id} title={statusTitle(s.id)}>
          {statusGlyph(s.id)}
        </span>
      ))}
    </div>
  );
}

function TurnOrderStrip({
  battle,
  world,
  inspectId,
  onInspect,
}: {
  battle: BattleState;
  world: PartyWorldSave;
  inspectId: string | null;
  onInspect: (id: string) => void;
}) {
  const missingArt = "/party-chronicle/scenes/missing.svg";
  return (
    <div className="pc-turn-strip" role="list" aria-label="Turn order">
      {battle.turnQueue.map((id, i) => {
        const active = battle.activeId === id;
        const enemy = isEnemyCombatantId(id);
        const foe = enemy ? getEnemyByUnitId(battle, id) : null;
        const hero = !enemy ? battle.heroes.find((h) => h.id === id) : null;
        const char = hero ? world.characters[hero.slot] : null;
        const down = enemy ? (foe?.hp ?? 0) <= 0 : (hero?.hp ?? 0) <= 0;
        const src = enemy
          ? foe
            ? battleEnemyArtSrc(foe)
            : missingArt
          : battleClassArtSrc(char?.classId);
        const name = enemy ? foe?.name ?? "Foe" : hero?.name ?? "Hero";
        return (
          <button
            key={`${id}-${i}`}
            type="button"
            role="listitem"
            className="pc-turn-portrait"
            data-active={active ? "true" : "false"}
            data-side={enemy ? "enemy" : "party"}
            data-down={down ? "true" : "false"}
            data-inspect={inspectId === id ? "true" : "false"}
            title={`${name}${active ? " · acting" : ""} — tap to examine`}
            onClick={() => onInspect(id)}
          >
            <img
              src={src}
              alt={name}
              onError={(e) => {
                (e.target as HTMLImageElement).src = missingArt;
              }}
            />
            {active ? <span className="pc-turn-portrait-pip" /> : null}
          </button>
        );
      })}
    </div>
  );
}

function InspectCard({
  battle,
  world,
  unitId,
  onClose,
}: {
  battle: BattleState;
  world: PartyWorldSave;
  unitId: string;
  onClose: () => void;
}) {
  const enemy = isEnemyCombatantId(unitId);
  const foe = enemy ? getEnemyByUnitId(battle, unitId) : null;
  const hero = !enemy ? battle.heroes.find((h) => h.id === unitId) : null;
  const char = hero ? world.characters[hero.slot] : null;
  const className = char?.classId ? CLASS_DEFS[char.classId]?.name : null;
  const unit = battle.tactical ? getUnit(battle.tactical, unitId) : null;
  const statuses = hero?.statuses ?? [];
  if (!foe && !hero) return null;

  return (
    <div className="pc-inspect-card" role="dialog" aria-label="Examine combatant">
      <button type="button" className="pc-inspect-close" onClick={onClose} aria-label="Close">
        ×
      </button>
      <p className="pc-eyebrow text-[0.65rem]">{enemy ? "Enemy" : "Hero"}</p>
      <h3 className="pc-title text-lg">{enemy ? foe!.name : hero!.name}</h3>
      {!enemy && className ? (
        <p className="text-[0.7rem] opacity-75 mb-1">{className}</p>
      ) : null}
      {enemy && foe?.blurb ? (
        <p className="text-[0.7rem] opacity-75 mb-2">{foe.blurb}</p>
      ) : null}
      <Meter
        label="HP"
        value={enemy ? foe!.hp : hero!.hp}
        max={enemy ? foe!.maxHp : hero!.maxHp}
        tone={enemy ? "enemy" : "hp"}
        compact
      />
      {!enemy ? (
        <Meter label="Mana" value={hero!.mana} max={hero!.maxMana} tone="mana" compact />
      ) : foe && foe.maxMana > 0 ? (
        <Meter label="Mana" value={foe.mana} max={foe.maxMana} tone="mana" compact />
      ) : null}
      <p className="text-[0.7rem] mt-2">
        <strong>Defense</strong> {enemy ? foe!.armor : hero!.armor} · <strong>Power</strong>{" "}
        {enemy ? foe!.power : hero!.power}
        {unit ? ` · Spd ${unit.speed} · Rng ${unit.range}` : ""}
      </p>
      {statuses.length > 0 ? (
        <p className="text-[0.7rem] mt-1">
          Status: {statuses.map((s) => `${statusTitle(s.id)} (${s.turns})`).join(", ")}
        </p>
      ) : (
        <p className="text-[0.7rem] mt-1 opacity-60">No active statuses</p>
      )}
      {enemy && foe?.uniqueSkill ? (
        <p className="text-[0.65rem] mt-1 opacity-70">Unique: {foe.uniqueSkill.name}</p>
      ) : null}
    </div>
  );
}

function BoardBeams({
  battle,
  vfx,
}: {
  battle: BattleState;
  vfx: BoardVfx[];
}) {
  const tactical = battle.tactical;
  if (!tactical) return null;
  const beams = vfx.filter((v) => v.kind === "beam" && v.sourceId);
  if (!beams.length) return null;

  return (
    <svg className="pc-battle-beams" viewBox="0 0 100 100" preserveAspectRatio="none" aria-hidden>
      {beams.map((b) => {
        const src = getUnit(tactical, b.sourceId!);
        const dst =
          getUnit(tactical, b.targetId) ??
          (b.cellX != null && b.cellY != null
            ? { x: b.cellX, y: b.cellY }
            : null);
        if (!src || !dst) return null;
        const a = cellCenterPct(src.x, src.y, tactical.cols, tactical.rows);
        const c = cellCenterPct(dst.x, dst.y, tactical.cols, tactical.rows);
        return (
          <line
            key={b.id}
            className="pc-battle-beam"
            data-tone={b.tone ?? "melee"}
            x1={a.left}
            y1={a.top}
            x2={c.left}
            y2={c.top}
            style={{ animationDelay: `${b.delay}ms` }}
          />
        );
      })}
    </svg>
  );
}

function KoGhosts({
  battle,
  vfx,
}: {
  battle: BattleState;
  vfx: BoardVfx[];
}) {
  const tactical = battle.tactical;
  if (!tactical) return null;
  const kos = vfx.filter((v) => v.kind === "ko" && v.cellX != null && v.cellY != null);
  if (!kos.length) return null;
  return (
    <>
      {kos.map((k) => {
        const pos = cellCenterPct(k.cellX!, k.cellY!, tactical.cols, tactical.rows);
        return (
          <div
            key={k.id}
            className="pc-ko-ghost"
            style={
              {
                left: `${pos.left}%`,
                top: `${pos.top}%`,
                animationDelay: `${k.delay}ms`,
              } as CSSProperties
            }
            aria-hidden
          />
        );
      })}
    </>
  );
}

function TacticalBoard({
  battle,
  world,
  mySlot,
  isMyTurn,
  pending,
  floaters,
  boardVfx,
  targeting,
  pendingConfirm,
  previewRange,
  threatened,
  focusId,
  inspectId,
  onMove,
  onSelectTarget,
  onInspect,
}: {
  battle: BattleState;
  world: PartyWorldSave;
  mySlot: PlayerSlot | null;
  isMyTurn: boolean;
  pending: boolean;
  floaters: Floater[];
  boardVfx: BoardVfx[];
  targeting: TargetingMode;
  pendingConfirm: PendingConfirm;
  previewRange: Set<string>;
  threatened: Set<string>;
  focusId: string | null;
  inspectId: string | null;
  onMove: (x: number, y: number) => void;
  onSelectTarget: (targetId: string) => void;
  onInspect: (id: string) => void;
}) {
  const tactical = battle.tactical;
  const missingArt = "/party-chronicle/scenes/missing.svg";
  const phase = tactical?.phase ?? "move";

  const moves = useMemo(() => {
    if (!tactical || !isMyTurn || phase !== "move" || !mySlot || targeting) {
      return new Set<string>();
    }
    return new Set(legalMoves(tactical, mySlot).map((m) => `${m.x},${m.y}`));
  }, [tactical, isMyTurn, phase, mySlot, targeting]);

  const attacker = tactical && mySlot ? getUnit(tactical, mySlot) : null;

  const attackableEnemyIds = useMemo(() => {
    if (!tactical || !attacker || !isMyTurn || pending) return new Set<string>();
    const ids = new Set<string>();
    const spellMode = targeting?.kind === "spell-damage";
    const attackMode = targeting?.kind === "attack" || (!targeting && phase === "act");
    if (!spellMode && !attackMode && targeting) return ids;
    for (const u of tactical.units) {
      if (u.side !== "enemy") continue;
      const foe = getEnemyByUnitId(battle, u.id);
      if (!foe || foe.hp <= 0) continue;
      if (spellMode) {
        if (canSpellStrike(attacker, u)) ids.add(u.id);
      } else if (canStrike(attacker, u)) {
        ids.add(u.id);
      }
    }
    return ids;
  }, [tactical, attacker, isMyTurn, pending, battle, targeting, phase]);

  const supportableAllyIds = useMemo(() => {
    if (!tactical || !isMyTurn || pending || targeting?.kind !== "spell-support") {
      return new Set<string>();
    }
    const ids = new Set<string>();
    for (const h of battle.heroes) {
      if (h.hp > 0) ids.add(h.id);
    }
    return ids;
  }, [tactical, isMyTurn, pending, targeting, battle.heroes]);

  if (!tactical) {
    return <p className="text-sm opacity-70">Drawing the battlefield…</p>;
  }

  const cells: { x: number; y: number }[] = [];
  for (let y = 0; y < tactical.rows; y++) {
    for (let x = 0; x < tactical.cols; x++) {
      cells.push({ x, y });
    }
  }

  const unitByCell = new Map(tactical.units.map((u) => [`${u.x},${u.y}`, u]));
  const swinging = new Set(
    boardVfx.filter((v) => v.kind === "swing").map((v) => v.targetId)
  );
  const buffing = new Set(
    boardVfx.filter((v) => v.kind === "buff").map((v) => v.targetId)
  );
  const focusUnit = focusId ? getUnit(tactical, focusId) : null;
  const focusStyle =
    focusUnit != null
      ? ({
          "--pc-focus-x": `${((focusUnit.x + 0.5) / tactical.cols) * 100}%`,
          "--pc-focus-y": `${((focusUnit.y + 0.5) / tactical.rows) * 100}%`,
        } as CSSProperties)
      : undefined;

  return (
    <div
      className="pc-tactical-board"
      data-focus={focusUnit ? "true" : "false"}
      style={
        {
          "--pc-tac-cols": tactical.cols,
          "--pc-tac-rows": tactical.rows,
          ...focusStyle,
        } as CSSProperties
      }
      role="grid"
      aria-label="Battle map"
    >
      <BoardBeams battle={battle} vfx={boardVfx} />
      <KoGhosts battle={battle} vfx={boardVfx} />
      {cells.map(({ x, y }) => {
        const key = `${x},${y}`;
        const unit = unitByCell.get(key);
        const reachable = moves.has(key);
        const threat = threatened.has(key) && phase === "move" && !targeting;
        const inPreview = previewRange.has(key);
        const canHitThis = !!unit && attackableEnemyIds.has(unit.id);
        const canSupport = !!unit && supportableAllyIds.has(unit.id);
        const selected =
          !!unit &&
          pendingConfirm?.targetId === unit.id;
        const isActive = unit?.id === battle.activeId;
        const examining = unit?.id === inspectId;

        const hero = unit?.heroSlot
          ? battle.heroes.find((h) => h.slot === unit.heroSlot)
          : null;
        const char = unit?.heroSlot ? world.characters[unit.heroSlot] : null;
        const foeState =
          unit?.side === "enemy" ? getEnemyByUnitId(battle, unit.id) : null;
        const flankHint =
          targeting?.kind === "attack" &&
          attacker &&
          unit?.side === "enemy" &&
          canHitThis &&
          isFlanking(tactical, attacker, unit);

        const clickable =
          reachable ||
          canHitThis ||
          canSupport ||
          !!unit;

        return (
          <button
            key={key}
            type="button"
            role="gridcell"
            className="pc-tactical-cell"
            data-reachable={reachable ? "true" : "false"}
            data-threatened={threat ? "true" : "false"}
            data-preview={inPreview ? "true" : "false"}
            data-occupied={unit ? "true" : "false"}
            data-side={unit?.side ?? "empty"}
            data-active={isActive ? "true" : "false"}
            data-attackable={canHitThis ? "true" : "false"}
            data-supportable={canSupport ? "true" : "false"}
            data-selected={selected ? "true" : "false"}
            data-inspect={examining ? "true" : "false"}
            disabled={pending || introLocked(battle) || (!clickable && !reachable)}
            aria-label={
              unit
                ? unit.side === "enemy"
                  ? foeState?.name ?? "Enemy"
                  : hero?.name ?? "Hero"
                : reachable
                  ? `Move to ${x + 1},${y + 1}`
                  : `Tile ${x + 1},${y + 1}`
            }
            onClick={() => {
              if (canHitThis && unit) {
                onSelectTarget(unit.id);
                return;
              }
              if (canSupport && unit) {
                onSelectTarget(unit.id);
                return;
              }
              if (reachable) {
                onMove(x, y);
                return;
              }
              if (unit) onInspect(unit.id);
            }}
          >
            {unit?.side === "enemy" && foeState ? (
              <div
                className="pc-tactical-token pc-battle-fx-anchor"
                data-side="enemy"
                data-swing={swinging.has(unit.id) ? "true" : "false"}
                data-buff={buffing.has(unit.id) ? "true" : "false"}
              >
                <CombatFloaters floaters={floaters} target={unit.id} />
                {flankHint ? <span className="pc-flank-badge">Flank</span> : null}
                <img
                  src={battleEnemyArtSrc(foeState)}
                  alt={foeState.name}
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = missingArt;
                  }}
                />
                <span className="pc-tactical-hp">
                  {foeState.hp}/{foeState.maxHp}
                </span>
              </div>
            ) : null}
            {unit?.side === "party" && hero ? (
              <div
                className="pc-tactical-token pc-battle-fx-anchor"
                data-side="party"
                data-down={hero.hp <= 0 ? "true" : "false"}
                data-swing={swinging.has(unit.id) ? "true" : "false"}
                data-buff={buffing.has(unit.id) ? "true" : "false"}
              >
                <CombatFloaters floaters={floaters} target={hero.id} />
                <StatusIcons statuses={hero.statuses} />
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
  const [boardVfx, setBoardVfx] = useState<BoardVfx[]>([]);
  const [targeting, setTargeting] = useState<TargetingMode>(null);
  const [pendingConfirm, setPendingConfirm] = useState<PendingConfirm>(null);
  const [inspectId, setInspectId] = useState<string | null>(null);
  const [shake, setShake] = useState(false);
  const [enemyBanner, setEnemyBanner] = useState(false);
  const [showHint, setShowHint] = useState(false);
  const [killCam, setKillCam] = useState(false);
  const [killCamDone, setKillCamDone] = useState(false);
  const seenFx = useRef<Set<string>>(new Set());
  const floaterBattleId = useRef<string | null>(null);
  const prevActive = useRef<string | null>(null);
  const prevStatus = useRef<string | null>(null);

  useEffect(() => {
    if (!battle || battle.status !== "active") return;
    const id = window.setInterval(() => setNow(Date.now()), 100);
    return () => window.clearInterval(id);
  }, [battle?.status, battle?.id]);

  useEffect(() => {
    try {
      if (!window.localStorage.getItem(HINT_KEY)) setShowHint(true);
    } catch {
      setShowHint(true);
    }
  }, []);

  useEffect(() => {
    if (!battle || battle.status !== "active") return;
    if (floaterBattleId.current !== battle.id) {
      floaterBattleId.current = battle.id;
      seenFx.current = new Set((battle.fxEvents ?? []).map((e) => e.id));
      setFloaters([]);
      setBoardVfx([]);
      return;
    }
    const events = battle.fxEvents ?? [];
    const fresh = events.filter((e) => !seenFx.current.has(e.id));
    if (!fresh.length) return;
    for (const e of fresh) seenFx.current.add(e.id);

    // Stagger enemy-sourced VFX so multi-foe packs feel sequential.
    const sorted = [...fresh].reverse();
    let enemyWave = 0;
    let sawEnemy = false;
    const birth = Date.now();
    const nextFloaters: Floater[] = [];
    const nextVfx: BoardVfx[] = [];

    for (const e of sorted) {
      const fromEnemy = !!e.source && isEnemyCombatantId(e.source);
      if (fromEnemy && (e.kind === "beam" || e.kind === "damage" || e.kind === "swing")) {
        sawEnemy = true;
      }
      const delay = fromEnemy ? enemyWave * 280 : 0;
      if (fromEnemy && (e.kind === "beam" || e.kind === "swing")) enemyWave += 1;

      if (
        e.kind === "damage" ||
        e.kind === "heal" ||
        e.kind === "miss" ||
        e.kind === "crit" ||
        e.kind === "flank"
      ) {
        nextFloaters.push({ ...e, birth, delay });
      }
      if (e.kind === "beam" || e.kind === "swing" || e.kind === "buff" || e.kind === "ko") {
        nextVfx.push({
          id: e.id,
          kind: e.kind,
          birth,
          delay,
          sourceId: e.source,
          targetId: e.kind === "swing" ? e.target : e.target,
          tone: e.tone,
          cellX: e.cellX,
          cellY: e.cellY,
        });
      }
      // swing FX targets the attacker (source) for animation class
      if (e.kind === "swing" && e.source) {
        nextVfx[nextVfx.length - 1]!.targetId = e.source;
      }
      if (e.kind === "crit" || (e.kind === "damage" && (e.amount ?? 0) >= 18)) {
        window.setTimeout(() => {
          setShake(true);
          window.setTimeout(() => setShake(false), 420);
        }, delay);
      }
    }

    if (sawEnemy) {
      setEnemyBanner(true);
      window.setTimeout(() => setEnemyBanner(false), 900);
    }

    if (nextFloaters.length) {
      setFloaters((prev) => [...prev, ...nextFloaters]);
    }
    if (nextVfx.length) {
      setBoardVfx((prev) => [...prev, ...nextVfx]);
    }
  }, [battle]);

  useEffect(() => {
    if (!floaters.length && !boardVfx.length) return;
    const id = window.setInterval(() => {
      const t = Date.now();
      setFloaters((prev) =>
        prev.filter((f) => t - f.birth < FLOATER_MS + (f.delay ?? 0))
      );
      setBoardVfx((prev) =>
        prev.filter((v) => {
          const life =
            v.kind === "buff"
              ? VFX_BUFF_MS
              : v.kind === "ko"
                ? VFX_KO_MS
                : v.kind === "swing"
                  ? VFX_SWING_MS
                  : VFX_BEAM_MS;
          return t - v.birth < life + v.delay + 80;
        })
      );
    }, 120);
    return () => window.clearInterval(id);
  }, [floaters.length, boardVfx.length]);

  // Kill-cam lite before summary
  useEffect(() => {
    if (!battle) return;
    if (battle.status === "active") {
      setKillCamDone(false);
      prevStatus.current = "active";
      return;
    }
    if (
      (battle.status === "victory" || battle.status === "defeat") &&
      prevStatus.current === "active" &&
      !killCamDone
    ) {
      setKillCam(true);
      prevStatus.current = battle.status;
      const t = window.setTimeout(() => {
        setKillCam(false);
        setKillCamDone(true);
      }, 1200);
      return () => window.clearTimeout(t);
    }
    prevStatus.current = battle.status;
  }, [battle, killCamDone]);

  useEffect(() => {
    if (!battle || battle.status !== "active") return;
    if (prevActive.current && prevActive.current !== battle.activeId) {
      setTargeting(null);
      setPendingConfirm(null);
    }
    prevActive.current = battle.activeId;
  }, [battle?.activeId, battle?.status]);

  const enemyPack = battle ? battleEnemyPack(battle) : [];
  const phase = battle?.tactical?.phase ?? "move";
  const myUnit =
    battle?.tactical && mySlot ? getUnit(battle.tactical, mySlot) : null;

  const livingEnemyIds = useMemo(() => {
    const s = new Set<string>();
    enemyPack.forEach((e, i) => {
      if (e.hp > 0) s.add(e.unitId ?? (i === 0 ? "enemy" : `enemy-${i}`));
    });
    return s;
  }, [enemyPack]);

  const threatened = useMemo(() => {
    if (!battle?.tactical || phase !== "move") return new Set<string>();
    return threatenedTiles(battle.tactical, livingEnemyIds);
  }, [battle?.tactical, livingEnemyIds, phase]);

  const previewRange = useMemo(() => {
    if (!battle?.tactical || !myUnit || !targeting) return new Set<string>();
    if (targeting.kind === "attack") {
      return rangeTiles(battle.tactical, myUnit, myUnit.range);
    }
    if (targeting.kind === "spell-damage") {
      return rangeTiles(battle.tactical, myUnit, spellStrikeRange(myUnit));
    }
    return new Set<string>();
  }, [battle?.tactical, myUnit, targeting]);

  if (!battle) return null;

  if (killCam && (battle.status === "victory" || battle.status === "defeat")) {
    return (
      <div className="pc-battle-overlay" role="dialog" aria-label="Battle flourish">
        <div
          className="pc-battle-frame pc-kill-cam"
          data-outcome={battle.status}
        >
          <p className="pc-eyebrow">{battle.status === "victory" ? "Victory" : "Defeat"}</p>
          <h2 className="pc-title text-3xl md:text-4xl">
            {battle.status === "victory" ? "The field is yours!" : "The line breaks…"}
          </h2>
        </div>
      </div>
    );
  }

  if (
    (battle.status === "victory" || battle.status === "defeat") &&
    !killCam
  ) {
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

  const foeInRange = (() => {
    if (!myUnit || !battle.tactical) return false;
    for (let i = 0; i < enemyPack.length; i++) {
      const e = enemyPack[i]!;
      if (e.hp <= 0) continue;
      const id = e.unitId ?? (i === 0 ? "enemy" : `enemy-${i}`);
      const tok = getUnit(battle.tactical, id);
      if (tok && canStrike(myUnit, tok)) return true;
    }
    return false;
  })();

  const packLabel =
    enemyPack.length <= 1
      ? battle.enemy.name
      : (() => {
          const names = enemyPack.map((e) => e.name);
          const uniq = [...new Set(names)];
          if (uniq.length === 1) return `${uniq[0]} ×${enemyPack.length}`;
          return `${enemyPack[0]!.name} +${enemyPack.length - 1}`;
        })();

  const activeFoe = isEnemyCombatantId(battle.activeId)
    ? getEnemyByUnitId(battle, battle.activeId)
    : null;

  const economyLabel =
    phase === "move" ? "Move available" : "Act available";

  const dismissHint = () => {
    setShowHint(false);
    try {
      window.localStorage.setItem(HINT_KEY, "1");
    } catch {
      /* ignore */
    }
  };

  const clearTargeting = () => {
    setTargeting(null);
    setPendingConfirm(null);
  };

  const beginAttackTargeting = () => {
    if (!foeInRange) return;
    setPendingConfirm(null);
    setTargeting({ kind: "attack" });
    dismissHint();
  };

  const beginSpellTargeting = (spellId: string) => {
    const ab = getAbility(spellId) ?? getSpellbookAbility(spellId);
    if (!ab) return;
    const role = battleAbilityRole(ab);
    setPendingConfirm(null);
    if (role === "heal" || role === "buff") {
      setTargeting({ kind: "spell-support", spellId, role });
    } else {
      setTargeting({ kind: "spell-damage", spellId });
    }
    dismissHint();
  };

  const onSelectTarget = (targetId: string) => {
    if (!targeting) {
      // Act-phase shortcut: clicking a foe in range arms confirm
      if (phase === "act" && attackableQuick(battle, mySlot, targetId)) {
        const foe = getEnemyByUnitId(battle, targetId);
        setPendingConfirm({
          action: "attack",
          targetId,
          label: `Strike ${foe?.name ?? "foe"}`,
        });
        setTargeting({ kind: "attack" });
      }
      return;
    }
    if (targeting.kind === "attack") {
      const foe = getEnemyByUnitId(battle, targetId);
      setPendingConfirm({
        action: "attack",
        targetId,
        label: `Strike ${foe?.name ?? "foe"}`,
      });
      return;
    }
    if (targeting.kind === "spell-damage") {
      const foe = getEnemyByUnitId(battle, targetId);
      const ab = getAbility(targeting.spellId) ?? getSpellbookAbility(targeting.spellId);
      setPendingConfirm({
        action: "spell",
        spellId: targeting.spellId,
        targetId,
        label: `${ab?.name ?? "Spell"} → ${foe?.name ?? "foe"}`,
      });
      return;
    }
    if (targeting.kind === "spell-support") {
      const hero = battle.heroes.find((h) => h.id === targetId);
      const ab = getAbility(targeting.spellId) ?? getSpellbookAbility(targeting.spellId);
      const verb = targeting.role === "heal" ? "Heal" : "Buff";
      setPendingConfirm({
        action: "spell",
        spellId: targeting.spellId,
        targetId,
        label: `${verb} ${hero?.name ?? "ally"} (${ab?.name ?? "spell"})`,
      });
    }
  };

  const confirmPending = () => {
    if (!pendingConfirm) return;
    if (pendingConfirm.action === "attack") {
      onAction("attack", { targetId: pendingConfirm.targetId });
    } else {
      onAction("spell", {
        spellId: pendingConfirm.spellId,
        targetId: pendingConfirm.targetId,
      });
    }
    clearTargeting();
  };

  const phaseHint = targeting
    ? targeting.kind === "spell-support"
      ? "Tap an ally (or yourself), then confirm"
      : "Tap a highlighted foe, then confirm"
    : phase === "move"
      ? "Tap a gold tile to move — red tiles are threatened"
      : foeInRange
        ? "Attack, cast, or Wait — tap a foe to aim"
        : "Out of range — Wait, heal, or Power Up";

  return (
    <div className="pc-battle-overlay" role="dialog" aria-label="Battle">
      <div
        className="pc-battle-frame pc-battle-frame--tactical"
        data-intro={introActive ? "true" : "false"}
        data-shake={shake ? "true" : "false"}
        data-targeting={targeting ? targeting.kind : "none"}
      >
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

        {enemyBanner ? (
          <div className="pc-enemy-banner" aria-live="polite">
            Foes act…
          </div>
        ) : null}

        {showHint && isMyTurn && phase === "move" ? (
          <div className="pc-battle-coach">
            <p>
              <strong>First fight tip:</strong> tap gold tiles to move. Red/orange tiles are in
              enemy reach. Tap Attack, then a foe, then confirm.
            </p>
            <button type="button" className="pc-chip" onClick={dismissHint}>
              Got it
            </button>
          </div>
        ) : null}

        <div className="pc-battle-header">
          <p className="pc-eyebrow">Tactical encounter</p>
          <h2 className="pc-title text-xl md:text-2xl">
            {enemyPack.some((e) => e.isBoss) ? "Boss — " : ""}
            {packLabel}
          </h2>
          <p className="text-xs opacity-80">{battle.enemy.blurb}</p>
          <p className="text-[0.65rem] mt-2 font-bold" style={{ color: "var(--pc-accent)" }}>
            {introActive
              ? "Locking in — hold for countdown"
              : `Battle clock ${battleMin}:${String(battleSec).padStart(2, "0")} left${
                  !isEnemyCombatantId(battle.activeId)
                    ? ` · Act in ${idleLeft}s or foe moves`
                    : " · Enemy turn"
                }`}
          </p>
        </div>

        <TurnOrderStrip
          battle={battle}
          world={world}
          inspectId={inspectId}
          onInspect={(id) => setInspectId((cur) => (cur === id ? null : id))}
        />

        <div className="pc-battle-economy" aria-live="polite">
          <span data-on={isMyTurn && phase === "move" ? "true" : "false"}>
            Move {phase === "move" && isMyTurn ? "ready" : "done"}
          </span>
          <span data-on={isMyTurn && phase === "act" ? "true" : "false"}>
            Act {phase === "act" && isMyTurn ? "ready" : phase === "move" ? "after move" : "—"}
          </span>
          <span>
            {isEnemyCombatantId(battle.activeId)
              ? `${activeFoe?.name ?? "Enemy"}'s turn`
              : isMyTurn
                ? `Your turn · ${economyLabel}`
                : `${activeHero?.name ?? "Ally"}'s turn`}
          </span>
        </div>

        <div className="pc-battle-tactical-layout">
          <div className="pc-battle-board-wrap">
            <TacticalBoard
              battle={battle}
              world={world}
              mySlot={mySlot}
              isMyTurn={isMyTurn}
              pending={pending}
              floaters={floaters}
              boardVfx={boardVfx}
              targeting={targeting}
              pendingConfirm={pendingConfirm}
              previewRange={previewRange}
              threatened={threatened}
              focusId={battle.activeId}
              inspectId={inspectId}
              onMove={(x, y) => {
                clearTargeting();
                dismissHint();
                onAction("move", { x, y });
              }}
              onSelectTarget={onSelectTarget}
              onInspect={(id) => setInspectId((cur) => (cur === id ? null : id))}
            />
            {inspectId ? (
              <InspectCard
                battle={battle}
                world={world}
                unitId={inspectId}
                onClose={() => setInspectId(null)}
              />
            ) : null}
          </div>

          <aside className="pc-battle-roster">
            {enemyPack.map((e, i) => {
              const unitId = e.unitId ?? (i === 0 ? "enemy" : `enemy-${i}`);
              return (
                <div
                  key={unitId}
                  className="pc-battle-roster-enemy"
                  data-active={battle.activeId === unitId}
                  data-down={e.hp <= 0}
                >
                  <Meter
                    label={
                      e.isBoss
                        ? `Boss — ${e.name}`
                        : enemyPack.length > 1
                          ? e.name
                          : "Enemy HP"
                    }
                    value={e.hp}
                    max={e.maxHp}
                    tone="enemy"
                  />
                  {e.isBoss && e.maxMana > 0 && (
                    <Meter label="Enemy Mana" value={e.mana} max={e.maxMana} tone="mana" />
                  )}
                  {e.uniqueSkill && (
                    <p className="text-[0.65rem] mt-1 opacity-70">
                      Unique: {e.uniqueSkill.name}
                    </p>
                  )}
                </div>
              );
            })}
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
                  {char && <XpMeter xp={char.xp} compact />}
                  <StatusIcons statuses={h.statuses} />
                </div>
              );
            })}
          </aside>
        </div>

        <p className="pc-battle-turn">
          {introActive
            ? "Stand by…"
            : isEnemyCombatantId(battle.activeId)
              ? `${activeFoe?.name ?? battle.enemy.name}'s turn…`
              : isMyTurn
                ? `Your turn — ${phase === "move" ? "Move" : "Act"}: ${phaseHint}`
                : `${activeHero?.name ?? "Ally"}'s turn`}
          {battle.lastRocLabel ? (
            <span className="block text-[0.65rem] opacity-80 mt-1 font-normal normal-case tracking-normal">
              {battle.lastRocLabel}
            </span>
          ) : null}
        </p>

        {pendingConfirm ? (
          <div className="pc-confirm-bar">
            <button
              type="button"
              className="pc-choice pc-battle-action"
              disabled={pending}
              onClick={confirmPending}
            >
              <strong>{pendingConfirm.label}</strong>
              <span className="block text-[0.65rem] opacity-70">Tap to confirm</span>
            </button>
            <button type="button" className="pc-chip" disabled={pending} onClick={clearTargeting}>
              Cancel
            </button>
          </div>
        ) : null}

        <div className="pc-battle-actions">
          <button
            type="button"
            className="pc-choice pc-battle-action"
            disabled={!isMyTurn || pending || !foeInRange}
            data-armed={targeting?.kind === "attack" ? "true" : "false"}
            title={
              !foeInRange
                ? "Out of range — move closer first"
                : phase === "move"
                  ? "Attack ends your move — pick a foe"
                  : "Pick a foe to strike"
            }
            onClick={beginAttackTargeting}
          >
            <strong>Attack</strong>
            <span className="block text-[0.65rem] opacity-70">
              {foeInRange ? "Choose a foe" : "Out of range"}
            </span>
          </button>
          <button
            type="button"
            className="pc-choice pc-battle-action"
            disabled={!isMyTurn || pending}
            title="+25% damage for 3 turns"
            onClick={() => {
              clearTargeting();
              onAction("powerUp");
            }}
          >
            <strong>Power Up</strong>
            <span className="block text-[0.65rem] opacity-70">+25% dmg, 3 turns</span>
          </button>
          <button
            type="button"
            className="pc-choice pc-battle-action"
            disabled={!isMyTurn || pending}
            title={phase === "move" ? "Skip movement" : "End turn"}
            onClick={() => {
              clearTargeting();
              onAction("wait");
            }}
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
                    onClick={() => {
                      clearTargeting();
                      onAction("eat", { itemId: id });
                    }}
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
                    onClick={() => {
                      clearTargeting();
                      onAction("drinkHp", { itemId: id });
                    }}
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
                    onClick={() => {
                      clearTargeting();
                      onAction("drinkMana", { itemId: id });
                    }}
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
                const role = ab ? battleAbilityRole(ab) : "other";
                const armed =
                  (targeting?.kind === "spell-damage" || targeting?.kind === "spell-support") &&
                  targeting.spellId === id;
                return (
                  <button
                    key={id}
                    type="button"
                    className="pc-chip"
                    data-armed={armed ? "true" : "false"}
                    disabled={!isMyTurn || pending || !canCast}
                    title={
                      !canCast
                        ? "Not enough mana"
                        : role === "heal" || role === "buff"
                          ? "Choose an ally to help"
                          : "Choose a foe in spell range"
                    }
                    onClick={() => beginSpellTargeting(id)}
                  >
                    {ab?.name ?? id}
                    {cost ? ` (${cost} MP)` : ""}
                    {ab && isBattleSupportAbility(ab)
                      ? " · ally"
                      : ab && isBattleDamageAbility(ab)
                        ? " · foe"
                        : ""}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {targeting ? (
          <p className="text-[0.7rem] text-center mt-1 opacity-80">
            Targeting mode —{" "}
            <button type="button" className="underline" onClick={clearTargeting}>
              cancel
            </button>
          </p>
        ) : null}

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

function attackableQuick(
  battle: BattleState,
  mySlot: PlayerSlot | null,
  targetId: string
): boolean {
  if (!mySlot || !battle.tactical) return false;
  const attacker = getUnit(battle.tactical, mySlot);
  const foe = getUnit(battle.tactical, targetId);
  if (!attacker || !foe || foe.side !== "enemy") return false;
  const st = getEnemyByUnitId(battle, targetId);
  if (!st || st.hp <= 0) return false;
  return canStrike(attacker, foe);
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
          {victory
            ? `Felled ${s?.enemyName ?? battle.enemy.name}`
            : `Fallen to ${s?.enemyName ?? battle.enemy.name}`}
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

/** Compact HP/Mana/XP for party sidebar sheets. */
export function HeroVitals({ char }: { char: CharacterSave }) {
  return (
    <div className="space-y-1">
      <Meter label="HP" value={char.hp} max={char.maxHp} tone="hp" />
      <Meter label="Mana" value={char.mana} max={char.maxMana} tone="mana" />
      <XpMeter xp={char.xp} compact />
    </div>
  );
}
