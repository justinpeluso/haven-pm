"use client";

import { useEffect, useMemo, useRef, useState, useTransition } from "react";
import {
  DEFAULT_DOG_AGE_YEARS,
  DEFAULT_DOG_BREED,
  DEFAULT_DOG_NAME,
  DOG_ACTIONS,
  DOG_CUES,
  DOG_TRAINING_WIN,
  DOG_CUES_WIN,
  EXERCISES,
  MEALS,
  NOT_MEDICAL_ADVICE,
  NUTRITION_TIPS,
  TRAINING_TIPS,
  WIN_WEIGHT_LB,
} from "@/lib/downtown/sims-real-life/data";
import {
  abilityMod,
  acknowledgeQuestStep,
  advanceDay,
  currentQuestStep,
  dogCare,
  doExercise,
  eatMeal,
  estimateTdee,
  rest,
} from "@/lib/downtown/sims-real-life/engine";
import {
  clearSave,
  createNewSave,
  loadSave,
  renameDog,
  writeSave,
} from "@/lib/downtown/sims-real-life/persist";
import {
  QUESTS,
  STAT_LABELS,
  VICTORY_BANNER,
  getQuest,
  hasFlags,
  questCheckPasses,
} from "@/lib/downtown/sims-real-life/quests";
import {
  COMBINED_DISCLAIMER,
  FLAVOR_LINES,
  researchHookForCue,
  researchHookForMeal,
  researchHookForWorkout,
} from "@/lib/downtown/sims-real-life/research-bridge";
import type { ActionResult, LastRoll, PlayerSave, StatKey } from "@/lib/downtown/sims-real-life/types";
import "@/components/sims-real-life/sims-real-life.css";
import { SIMS_CLASS } from "@/components/sims-real-life";
import { DowntownSubnav } from "./downtown-subnav";

type UiPhase = "boot" | "title" | "play" | "graduated";
type ActionTab = "feed" | "train" | "dog" | "rest" | "tips";

type RollDrama = NonNullable<LastRoll> & { message: string };

const STAT_SHORT: Record<StatKey, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
  computer: "CPU",
  magic: "MAG",
};

const START_WEIGHT = 150;
const DICE_DRAMA_MS = 1500;

function weightProgressPct(weightLb: number, target: number) {
  const span = Math.max(1, target - START_WEIGHT);
  return Math.round(Math.min(100, Math.max(0, ((weightLb - START_WEIGHT) / span) * 100)));
}

function Meter({
  label,
  value,
  max,
  suffix,
  tone,
  bumpKey,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  tone?: "good" | "warn" | "dog" | "default";
  bumpKey?: string | number;
}) {
  const pct = max > 0 ? Math.round(Math.min(100, Math.max(0, (value / max) * 100))) : 0;
  const display =
    typeof value === "number" && !Number.isInteger(value) ? value.toFixed(1) : String(value);
  return (
    <div className="sims-meter" data-tone={tone && tone !== "default" ? tone : undefined} data-bump={bumpKey != null ? "true" : undefined} key={bumpKey != null ? `${label}-${bumpKey}` : undefined}>
      <div className="flex justify-between text-[0.65rem] uppercase tracking-[0.12em]">
        <span style={{ color: "var(--dt-muted)" }}>{label}</span>
        <span className="downtown-stat" style={{ color: "var(--dt-accent)" }}>
          {display}
          {suffix ?? ` / ${max}`}
        </span>
      </div>
      <div className={`downtown-bar ${SIMS_CLASS.bar}`}>
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function Portrait({
  initials,
  label,
  pulse,
  size = "sm",
}: {
  initials: string;
  label: string;
  pulse?: boolean;
  size?: "sm" | "md" | "lg";
}) {
  const sizeClass =
    size === "lg" ? SIMS_CLASS.portraitLg : size === "sm" ? "sims-portrait sims-portrait-sm" : SIMS_CLASS.portrait;
  return (
    <div className={sizeClass} data-pulse={pulse ? "true" : undefined} title={label} aria-label={label}>
      <div className={SIMS_CLASS.portraitFill}>{initials}</div>
    </div>
  );
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="space-y-2 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--dt-fg)" }}>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} style={{ color: "var(--dt-accent)" }}>
              {part.slice(2, -2)}
            </strong>
          );
        }
        return <span key={i}>{part}</span>;
      })}
    </div>
  );
}

function DiceDramaOverlay({ drama, onDone }: { drama: RollDrama; onDone: () => void }) {
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;

  useEffect(() => {
    const t = window.setTimeout(() => onDoneRef.current(), DICE_DRAMA_MS);
    return () => window.clearTimeout(t);
  }, [drama]);

  const crit = drama.d20 === 20;
  const nat1 = drama.d20 === 1;
  const result = crit ? "crit" : nat1 || !drama.success ? "fail" : "ok";
  const verdict = crit
    ? "Natural 20"
    : nat1
      ? "Natural 1"
      : drama.success
        ? "Success"
        : "Fail-forward";

  return (
    <div className="sims-dice-overlay" role="dialog" aria-label="Dice roll">
      <div className={`sims-dice-card ${SIMS_CLASS.panel}`}>
        <p className="text-[0.7rem] uppercase tracking-[0.18em]" style={{ color: "var(--dt-accent)" }}>
          {drama.label ?? STAT_LABELS[drama.stat]} check
        </p>
        <div className="sims-dice-face" data-result={result}>
          {drama.d20}
        </div>
        <p className="sims-dice-verdict" data-ok={drama.success}>
          {verdict}
        </p>
        <p className="mt-2 font-mono text-sm" style={{ color: "var(--dt-accent)" }}>
          d20 {drama.d20} {drama.mod >= 0 ? "+" : ""}
          {drama.mod} = {drama.total}
        </p>
        <p className="mt-3 text-xs leading-relaxed" style={{ color: "var(--dt-muted)" }}>
          {drama.message}
        </p>
      </div>
    </div>
  );
}

export function SimsRealLifeGame() {
  const [phase, setPhase] = useState<UiPhase>("boot");
  const [save, setSave] = useState<PlayerSave | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [tab, setTab] = useState<ActionTab>("feed");
  const [introDismissed, setIntroDismissed] = useState(false);
  const [rollDrama, setRollDrama] = useState<RollDrama | null>(null);
  const [dogNameDraft, setDogNameDraft] = useState(DEFAULT_DOG_NAME);
  const [flavorIdx, setFlavorIdx] = useState(0);
  const pendingResult = useRef<{ save: PlayerSave; message: string } | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const existing = loadSave();
    if (existing) {
      setSave(existing);
      setDogNameDraft(existing.dog.name);
      setPhase(
        existing.graduated
          ? "graduated"
          : existing.day > 1 || existing.xp > 0 || existing.flags.length > 0
            ? "play"
            : "title"
      );
    } else {
      setPhase("title");
    }
  }, []);

  useEffect(() => {
    if (phase !== "title" && phase !== "play") return;
    const id = window.setInterval(() => {
      setFlavorIdx((i) => (i + 1) % FLAVOR_LINES.length);
    }, 7000);
    return () => window.clearInterval(id);
  }, [phase]);

  function persist(next: PlayerSave) {
    writeSave(next);
    setSave(next);
    if (next.graduated) setPhase("graduated");
  }

  function applyResult(result: ActionResult) {
    if (result.roll) {
      pendingResult.current = { save: result.save, message: result.message };
      setRollDrama({ ...result.roll, message: result.message });
      return;
    }
    persist(result.save);
    setFlash(result.message);
  }

  function finishDiceDrama() {
    const pending = pendingResult.current;
    pendingResult.current = null;
    setRollDrama(null);
    if (pending) {
      persist(pending.save);
      setFlash(pending.message);
    }
  }

  function beginRun() {
    const fresh = createNewSave("Justin", dogNameDraft.trim() || DEFAULT_DOG_NAME);
    persist(fresh);
    setPhase("play");
    setFlash(`Day 1. Scale reads 150. Target ${WIN_WEIGHT_LB}. ${fresh.dog.name} is ready.`);
    setIntroDismissed(false);
    setTab("feed");
  }

  function resetRun() {
    clearSave();
    setSave(null);
    setPhase("title");
    setFlash(null);
    setIntroDismissed(false);
    setTab("feed");
    setDogNameDraft(DEFAULT_DOG_NAME);
  }

  const quest = useMemo(() => {
    if (!save?.activeQuestId) return null;
    return getQuest(save.activeQuestId) ?? null;
  }, [save?.activeQuestId]);

  const pendingSteps = useMemo(() => {
    if (!save || !quest) return [];
    return quest.steps.filter((step) => {
      if (step.kind === "narrative") return false;
      if (step.kind === "flag") return !hasFlags(save, step.requireFlags);
      if (step.kind === "check" && step.checkId) return !questCheckPasses(save, step.checkId);
      return false;
    });
  }, [save, quest]);

  const journalStep = useMemo(() => (save ? currentQuestStep(save) : null), [save]);
  const dogMastery =
    save != null && save.dog.training >= 40 && save.dog.cuesLearned.length >= 3;

  if (phase === "boot") {
    return (
      <div className="downtown-shell sims-crpg">
        <DowntownSubnav active="sims" />
        <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
          Unrolling the parchment…
        </p>
      </div>
    );
  }

  if (phase === "title" || !save) {
    return (
      <div className="downtown-shell sims-crpg space-y-6">
        <DowntownSubnav active="sims" />
        <header className={`${SIMS_CLASS.headerBand} p-6 md:p-10`}>
          <div className="flex flex-wrap items-start gap-6">
            <Portrait initials="JP" label="Justin" size="lg" pulse />
            <Portrait initials="✦" label="Scout" size="lg" pulse />
            <div className="space-y-4 max-w-2xl flex-1 min-w-[16rem]">
              <p className="text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: "var(--dt-accent)" }}>
                Downtown · Life campaign
              </p>
              <hr className={SIMS_CLASS.divider} />
              <h1 className={`text-3xl md:text-5xl tracking-tight ${SIMS_CLASS.title}`}>Sims Real Life</h1>
              <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--dt-muted)" }}>
                Justin, 38 — eat for surplus, lift for lean gain, walk{" "}
                <span style={{ color: "var(--dt-accent)" }}>
                  {dogNameDraft.trim() || DEFAULT_DOG_NAME}
                </span>
                , a {DEFAULT_DOG_AGE_YEARS}-year-old female {DEFAULT_DOG_BREED}. D&amp;D checks on STR / DEX / CON / WIS
                / CHA (+ Computer &amp; Magic). Scale goal:{" "}
                <span style={{ color: "var(--dt-accent)" }}>{WIN_WEIGHT_LB} lb</span>. Progress saves in this browser.
              </p>
              <label className="block space-y-1 max-w-xs">
                <span className="text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-accent)" }}>
                  Shepherd name
                </span>
                <input
                  className="w-full bg-transparent border border-[var(--dt-line)] px-3 py-2 text-sm outline-none focus:border-[var(--dt-accent)]"
                  value={dogNameDraft}
                  maxLength={24}
                  onChange={(e) => setDogNameDraft(e.target.value)}
                  aria-label="Dog name"
                />
              </label>
              <div className="flex flex-wrap gap-3 pt-2">
                <button
                  type="button"
                  className="downtown-chip px-4 py-2 text-sm"
                  style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
                  onClick={() => startTransition(() => beginRun())}
                >
                  Start day one
                </button>
                {loadSave() && (
                  <button
                    type="button"
                    className="downtown-chip px-4 py-2 text-sm"
                    onClick={() => {
                      const s = loadSave();
                      if (s) {
                        setSave(s);
                        setDogNameDraft(s.dog.name);
                        setPhase(s.graduated ? "graduated" : "play");
                      }
                    }}
                  >
                    Continue
                  </button>
                )}
              </div>
              <p className="text-xs italic" style={{ color: "var(--dt-muted)" }}>
                {FLAVOR_LINES[flavorIdx]}
              </p>
            </div>
          </div>
        </header>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { t: "Fuel", d: "Pick meals, stack calories vs a fictional TDEE, batch prep when you can." },
            {
              t: "Iron + Shepherd",
              d: "Resistance multiplies surplus. Your 1½-year-old female GS is her own skill tree.",
            },
            { t: "Fail forward", d: "Missed rolls still count — watch the d20 spin, then keep moving." },
          ].map((card) => (
            <div key={card.t} className="downtown-panel p-4 space-y-2">
              <p className="text-[0.7rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-accent)" }}>
                {card.t}
              </p>
              <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
                {card.d}
              </p>
            </div>
          ))}
        </div>
        <p className="text-xs max-w-3xl" style={{ color: "var(--dt-muted)" }}>
          {COMBINED_DISCLAIMER || NOT_MEDICAL_ADVICE}
        </p>
      </div>
    );
  }

  if (phase === "graduated" && save) {
    return (
      <div className="downtown-shell sims-crpg space-y-6">
        <DowntownSubnav active="sims" />
        <header className={`sims-victory ${SIMS_CLASS.headerBand} p-6 md:p-10 space-y-6`}>
          <div className="flex flex-wrap items-center gap-5">
            <Portrait initials="JP" label={save.name} size="lg" pulse />
            <Portrait initials="✦" label={save.dog.name} size="lg" pulse />
            <div className="space-y-3 min-w-[16rem] flex-1">
              <p className="text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: "var(--dt-good)" }}>
                Campaign complete
              </p>
              <hr className={SIMS_CLASS.divider} />
              <h1 className={`sims-victory-title text-3xl md:text-5xl`}>{VICTORY_BANNER.title}</h1>
              <p className="text-[0.7rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-accent)" }}>
                {VICTORY_BANNER.subtitle}
              </p>
              <RichText text={VICTORY_BANNER.body} />
              <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--dt-muted)" }}>
                {save.name} hit {save.targetWeightLb} lb in {save.day} days beside {save.dog.name}, a{" "}
                {DEFAULT_DOG_AGE_YEARS}-year-old female {DEFAULT_DOG_BREED}.
                {dogMastery ? ` ${VICTORY_BANNER.optionalMasteryLine}` : ""}
              </p>
            </div>
          </div>
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <div className="sims-victory-stat">
              <strong>{save.weightLb.toFixed(1)}</strong>
              <span className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
                Final weight
              </span>
            </div>
            <div className="sims-victory-stat">
              <strong>{save.day}</strong>
              <span className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
                Days
              </span>
            </div>
            <div className="sims-victory-stat">
              <strong>{save.xp}</strong>
              <span className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
                XP
              </span>
            </div>
            <div className="sims-victory-stat">
              <strong>
                {save.dog.bond} / {save.dog.cuesLearned.length}
              </strong>
              <span className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
                Bond / cues
              </span>
            </div>
          </div>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="downtown-chip px-4 py-2" onClick={resetRun}>
              New run
            </button>
            <button
              type="button"
              className="downtown-chip px-4 py-2"
              onClick={() => {
                setPhase("play");
                setFlash("Revisiting the routine — already graduated.");
              }}
            >
              Revisit sheet
            </button>
          </div>
          <p className="text-xs max-w-2xl" style={{ color: "var(--dt-muted)" }}>
            {NOT_MEDICAL_ADVICE}
          </p>
        </header>
      </div>
    );
  }

  const weightPct = weightProgressPct(save.weightLb, save.targetWeightLb);
  const tdee = estimateTdee(save);
  const showIntroBanner = !introDismissed && save.phase === "intro" && quest;
  const dogWinPct = Math.round(
    Math.min(
      100,
      (save.dog.training / Math.max(1, DOG_TRAINING_WIN)) * 50 +
        (save.dog.cuesLearned.length / Math.max(1, DOG_CUES_WIN)) * 50
    )
  );

  return (
    <div className="downtown-shell sims-crpg space-y-5">
      <DowntownSubnav active="sims" />
      {rollDrama && <DiceDramaOverlay drama={rollDrama} onDone={finishDiceDrama} />}

      <div className={`flex flex-wrap items-end justify-between gap-3 ${SIMS_CLASS.goldBorder} px-4 py-3`}>
        <div className="flex flex-wrap items-center gap-4">
          <Portrait initials="JP" label={save.name} />
          <div>
            <p className="text-[0.7rem] uppercase tracking-[0.18em]" style={{ color: "var(--dt-accent)" }}>
              Sims Real Life
            </p>
            <h1 className={`text-2xl md:text-3xl ${SIMS_CLASS.title}`}>
              {save.name} · {save.age}
            </h1>
            <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
              Day {save.day} · Turn {save.turn} · {save.xp} XP · phase {save.phase}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="downtown-chip text-xs" onClick={resetRun}>
            Reset run
          </button>
        </div>
      </div>

      {showIntroBanner && (
        <div className={`${SIMS_CLASS.parchment} px-4 py-3 space-y-2`}>
          <div className="flex flex-wrap items-start justify-between gap-2">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-accent)" }}>
                Intro quest · Ch. {quest.chapter}
              </p>
              <p className="font-medium text-sm">{quest.title}</p>
              <p className="text-xs mt-1" style={{ color: "var(--dt-muted)" }}>
                {quest.tagline}
              </p>
            </div>
            <button type="button" className="downtown-chip text-xs" onClick={() => setIntroDismissed(true)}>
              Dismiss
            </button>
          </div>
          <RichText text={quest.synopsis} />
        </div>
      )}

      {flash && <div className={`${SIMS_CLASS.flash} px-3 py-2 text-xs`}>{flash}</div>}

      <div className="grid gap-4 xl:grid-cols-[17rem_1fr_15rem]">
        <aside className="downtown-panel p-4 space-y-4 order-2 xl:order-1">
          <p className="downtown-section-label">Character sheet</p>

          <Meter
            label={`Weight → ${save.targetWeightLb} lb`}
            value={save.weightLb}
            max={save.targetWeightLb}
            suffix={` / ${save.targetWeightLb} lb`}
            tone={weightPct >= 100 ? "good" : "default"}
            bumpKey={save.weightLb}
          />
          <div className="downtown-bar h-2.5">
            <span
              style={{
                width: `${weightPct}%`,
                background: weightPct >= 100 ? "var(--dt-good)" : undefined,
              }}
            />
          </div>
          <p className="text-[0.65rem]" style={{ color: "var(--dt-muted)" }}>
            Climb from {START_WEIGHT} · {weightPct}% · win needs weight + dog milestones
          </p>

          <div className="grid grid-cols-2 gap-3">
            <Meter label="HP" value={save.hp} max={save.maxHp} tone="good" bumpKey={save.hp} />
            <Meter label="Energy" value={save.energy} max={save.maxEnergy} bumpKey={save.energy} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className={`${SIMS_CLASS.statCell}`}>
              <p className="downtown-meta-label">Money</p>
              <p className="downtown-stat text-lg" style={{ color: "var(--dt-accent)" }}>
                ${save.money}
              </p>
            </div>
            <div className={`${SIMS_CLASS.statCell}`}>
              <p className="downtown-meta-label">Meal prep</p>
              <p className="downtown-stat text-lg" style={{ color: "var(--dt-fg)" }}>
                {save.mealPrep}
              </p>
            </div>
          </div>

          <div className="space-y-1 pt-2 border-t border-[var(--dt-line)]">
            <p className="downtown-section-label">Day fuel</p>
            <p className="text-xs downtown-stat" style={{ color: "var(--dt-muted)" }}>
              {save.dayCalories} kcal · {save.dayProteinG}g protein · TDEE ~{tdee}
            </p>
            <Meter
              label="Surplus track"
              value={Math.min(save.dayCalories, tdee * 1.35)}
              max={tdee}
              suffix={` / ~${tdee}`}
              tone={save.dayCalories >= tdee ? "good" : "warn"}
              bumpKey={save.dayCalories}
            />
          </div>

          <div className="pt-2 border-t border-[var(--dt-line)] space-y-2">
            <p className="downtown-section-label">Ability scores</p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => {
                const mod = abilityMod(save.stats[k]);
                const hot = save.lastRoll?.stat === k;
                return (
                  <div key={k} className={SIMS_CLASS.statCell} data-highlight={hot}>
                    <p className="text-[0.55rem] uppercase tracking-[0.1em]" style={{ color: "var(--dt-muted)" }}>
                      {STAT_SHORT[k]}
                    </p>
                    <p className="downtown-stat text-sm font-medium" style={{ color: "var(--dt-fg)" }}>
                      {save.stats[k]}
                    </p>
                    <p className="text-[0.6rem]" style={{ color: "var(--dt-accent)" }}>
                      {mod >= 0 ? `+${mod}` : mod}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {save.lastRoll && (
            <button
              type="button"
              className={`${SIMS_CLASS.goldBorderStrong} w-full p-2 text-left text-xs font-mono`}
              style={{ color: "var(--dt-accent)" }}
              onClick={() =>
                setRollDrama({
                  ...save.lastRoll!,
                  message: save.log[0] ?? "Last check replay.",
                })
              }
            >
              Last: d20 {save.lastRoll.d20} {save.lastRoll.mod >= 0 ? "+" : ""}
              {save.lastRoll.mod} = {save.lastRoll.total} ·{" "}
              {save.lastRoll.success ? "OK" : "FAIL-FWD"}
              {save.lastRoll.label ? ` · ${save.lastRoll.label}` : ""}
              <span className="block mt-1 text-[0.6rem] uppercase tracking-[0.12em] not-italic" style={{ color: "var(--dt-muted)" }}>
                Tap to replay drama
              </span>
            </button>
          )}
        </aside>

        <section className="downtown-panel p-4 md:p-5 space-y-4 order-1 xl:order-2 min-h-[24rem]">
          <div className="flex flex-wrap gap-2 border-b border-[var(--dt-line)] pb-3">
            {(
              [
                ["feed", "Feed"],
                ["train", "Train body"],
                ["dog", "Dog"],
                ["rest", "Rest"],
                ["tips", "Tips / Log"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="downtown-chip text-xs"
                data-active={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "feed" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-xl">Feed</h2>
                <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                  Stack surplus vs ~{tdee} kcal. Meal-prep tags build stock; boxes spend it.
                </p>
              </div>
              <div className="space-y-2">
                {MEALS.map((meal) => {
                  const hook = researchHookForMeal(meal.id);
                  return (
                    <button
                      key={meal.id}
                      type="button"
                      className={`w-full text-left p-3 space-y-1 ${SIMS_CLASS.actionRow}`}
                      onClick={() => applyResult(eatMeal(save, meal.id))}
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{meal.name}</span>
                        <span
                          className="text-[0.65rem] uppercase tracking-[0.12em]"
                          style={{ color: "var(--dt-accent)" }}
                        >
                          {meal.calories} kcal · {meal.proteinG}g P ·{" "}
                          {meal.id === "meal-prep-box" ? "1 prep" : `$${meal.cost}`} · −{meal.energyCost} E
                        </span>
                      </span>
                      {meal.subtitle && (
                        <span className="block text-[0.65rem] uppercase tracking-[0.1em]" style={{ color: "var(--dt-muted)" }}>
                          {meal.subtitle}
                        </span>
                      )}
                      <span className="block text-xs" style={{ color: "var(--dt-muted)" }}>
                        {meal.blurb}
                      </span>
                      {hook && (
                        <span className="block text-[0.65rem] italic" style={{ color: "var(--dt-accent)" }}>
                          {hook}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "train" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="text-xl">Train body</h2>
                <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                  Resistance / hybrid multiply surplus into scale ticks. Failed checks still fail-forward — with drama.
                </p>
              </div>
              <div
                className="border border-[var(--dt-line)] px-3 py-2 text-xs"
                style={{ background: "rgba(61,154,122,0.08)", color: "var(--dt-muted)" }}
              >
                Tip: {TRAINING_TIPS[0]?.body}
              </div>
              <div className="space-y-2">
                {EXERCISES.map((ex) => {
                  const mod = ex.stat ? abilityMod(save.stats[ex.stat]) : 0;
                  const hook = researchHookForWorkout(ex.id);
                  return (
                    <button
                      key={ex.id}
                      type="button"
                      className={`w-full text-left p-3 space-y-1 ${SIMS_CLASS.actionRow}`}
                      onClick={() => applyResult(doExercise(save, ex.id))}
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{ex.name}</span>
                        <span
                          className="text-[0.65rem] uppercase tracking-[0.12em]"
                          style={{ color: "var(--dt-accent)" }}
                        >
                          {ex.kind} · −{ex.energyCost} E · +{ex.xp} XP
                        </span>
                      </span>
                      {ex.subtitle && (
                        <span className="block text-[0.65rem] uppercase tracking-[0.1em]" style={{ color: "var(--dt-muted)" }}>
                          {ex.subtitle}
                        </span>
                      )}
                      <span className="block text-xs" style={{ color: "var(--dt-muted)" }}>
                        {ex.blurb}
                      </span>
                      {ex.stat && ex.dc != null && (
                        <span
                          className="block text-[0.65rem] uppercase tracking-[0.12em]"
                          style={{ color: "var(--dt-accent)" }}
                        >
                          Check {STAT_SHORT[ex.stat]} DC {ex.dc} (mod {mod >= 0 ? `+${mod}` : mod})
                        </span>
                      )}
                      {hook && (
                        <span className="block text-[0.65rem] italic" style={{ color: "var(--dt-accent)" }}>
                          {hook}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "dog" && (
            <div className="space-y-3">
              <div className="flex flex-wrap items-start gap-4">
                <Portrait initials="✦" label={save.dog.name} pulse={save.dog.fedToday && save.dog.walkedToday} />
                <div className="space-y-1 flex-1 min-w-[12rem]">
                  <h2 className="text-xl">
                    {save.dog.name} the {DEFAULT_DOG_BREED}
                  </h2>
                  <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                    Female · {DEFAULT_DOG_AGE_YEARS} years · adolescent. Feed, walk, train cues. Cha/Wis checks on
                    drills.
                  </p>
                  <label className="flex flex-wrap items-center gap-2 pt-1">
                    <span className="text-[0.6rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>
                      Rename
                    </span>
                    <input
                      className="bg-transparent border border-[var(--dt-line)] px-2 py-1 text-xs max-w-[10rem] outline-none focus:border-[var(--dt-accent)]"
                      value={dogNameDraft}
                      maxLength={24}
                      onChange={(e) => setDogNameDraft(e.target.value)}
                    />
                    <button
                      type="button"
                      className="downtown-chip text-[0.65rem]"
                      onClick={() => {
                        const next = renameDog(save, dogNameDraft);
                        persist(next);
                        setFlash(`${next.dog.name} answers to her name.`);
                      }}
                    >
                      Seal name
                    </button>
                  </label>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Meter
                  label="Dog energy"
                  value={save.dog.energy}
                  max={save.dog.maxEnergy}
                  tone="dog"
                  bumpKey={save.dog.energy}
                />
                <Meter label="Bond" value={save.dog.bond} max={100} tone="dog" bumpKey={save.dog.bond} />
                <Meter
                  label="Training"
                  value={save.dog.training}
                  max={60}
                  tone="dog"
                  bumpKey={save.dog.training}
                />
                <div className={`${SIMS_CLASS.statCell} text-xs space-y-1 !text-left px-2`}>
                  <p className="downtown-meta-label">Today</p>
                  <p style={{ color: save.dog.fedToday ? "var(--dt-good)" : "var(--dt-warn)" }}>
                    Fed {save.dog.fedToday ? "✓" : "—"}
                  </p>
                  <p style={{ color: save.dog.walkedToday ? "var(--dt-good)" : "var(--dt-warn)" }}>
                    Walked {save.dog.walkedToday ? "✓" : "—"}
                  </p>
                </div>
              </div>
              <Meter
                label={`Win track (need ${DOG_TRAINING_WIN} training · ${DOG_CUES_WIN} cues)`}
                value={dogWinPct}
                max={100}
                suffix={` ${dogWinPct}%`}
                tone={dogWinPct >= 100 ? "good" : "dog"}
                bumpKey={dogWinPct}
              />
              <div className="space-y-1">
                <p className="downtown-section-label">Cues learned</p>
                <div className="flex flex-wrap gap-1.5">
                  {DOG_CUES.map((cue) => {
                    const learned = save.dog.cuesLearned.includes(cue.id);
                    const hook = researchHookForCue(cue.id);
                    return (
                      <span
                        key={cue.id}
                        className="downtown-chip text-[0.6rem]"
                        data-active={learned}
                        title={hook ?? cue.blurb}
                        style={{ cursor: "default", opacity: learned ? 1 : 0.45 }}
                      >
                        {cue.name}
                      </span>
                    );
                  })}
                </div>
              </div>
              <div className="space-y-2">
                {DOG_ACTIONS.map((action) => {
                  const mod = action.stat ? abilityMod(save.stats[action.stat]) : 0;
                  const hook = action.cueId ? researchHookForCue(action.cueId) : undefined;
                  return (
                    <button
                      key={action.id}
                      type="button"
                      className={`w-full text-left p-3 space-y-1 ${SIMS_CLASS.actionRow}`}
                      onClick={() => applyResult(dogCare(save, action.id))}
                    >
                      <span className="flex flex-wrap items-baseline justify-between gap-2">
                        <span className="text-sm font-medium">{action.name}</span>
                        <span
                          className="text-[0.65rem] uppercase tracking-[0.12em]"
                          style={{ color: "var(--dt-accent)" }}
                        >
                          {action.kind} · −{action.energyCost} E · +{action.xp} XP
                        </span>
                      </span>
                      {action.subtitle && (
                        <span className="block text-[0.65rem] uppercase tracking-[0.1em]" style={{ color: "var(--dt-muted)" }}>
                          {action.subtitle}
                        </span>
                      )}
                      <span className="block text-xs" style={{ color: "var(--dt-muted)" }}>
                        {action.blurb}
                      </span>
                      {action.stat && action.dc != null && (
                        <span
                          className="block text-[0.65rem] uppercase tracking-[0.12em]"
                          style={{ color: "var(--dt-accent)" }}
                        >
                          Check {STAT_SHORT[action.stat]} DC {action.dc} (mod {mod >= 0 ? `+${mod}` : mod})
                        </span>
                      )}
                      {hook && (
                        <span className="block text-[0.65rem] italic" style={{ color: "var(--dt-accent)" }}>
                          {hook}
                        </span>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "rest" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl">Rest</h2>
                <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                  Nap to recover mid-day energy, or advance the day to apply the weight model and reset dog care flags.
                </p>
              </div>
              <button
                type="button"
                className={`w-full text-left p-4 space-y-1 ${SIMS_CLASS.actionRow}`}
                onClick={() => applyResult(rest(save))}
              >
                <span className="block text-sm font-medium">Rest break</span>
                <span className="block text-xs" style={{ color: "var(--dt-muted)" }}>
                  Recover energy from CON. {save.dog.name} dozes. Same day continues.
                </span>
              </button>
              <button
                type="button"
                className={`w-full text-left p-4 space-y-1 ${SIMS_CLASS.actionRow}`}
                style={{ borderColor: "var(--dt-good)" }}
                onClick={() => applyResult(advanceDay(save))}
              >
                <span className="block text-sm font-medium" style={{ color: "var(--dt-good)" }}>
                  End day {save.day}
                </span>
                <span className="block text-xs" style={{ color: "var(--dt-muted)" }}>
                  Apply surplus → weight tick, restore energy, reset fed/walked. Today: {save.dayCalories} / ~{tdee}{" "}
                  kcal
                  {save.dayResistance ? " · resistance ✓" : ""}
                  {save.dayCardioOnly ? " · cardio-only" : ""}.
                </span>
              </button>
              <p className="text-xs italic" style={{ color: "var(--dt-muted)" }}>
                {FLAVOR_LINES[flavorIdx]}
              </p>
            </div>
          )}

          {tab === "tips" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="text-xl">Tips / Log</h2>
                <p className="text-xs" style={{ color: "var(--dt-warn)" }}>
                  {NOT_MEDICAL_ADVICE}
                </p>
              </div>
              <div className="space-y-3">
                <p className="downtown-section-label">Nutrition</p>
                {NUTRITION_TIPS.map((tip) => (
                  <div key={tip.id} className="border-l-2 border-[var(--dt-accent)] pl-3 space-y-1">
                    <p className="text-sm font-medium">{tip.title}</p>
                    <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                      {tip.body}
                    </p>
                    <p className="text-[0.6rem] uppercase tracking-[0.1em]" style={{ color: "var(--dt-muted)" }}>
                      Source · {tip.source}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-3">
                <p className="downtown-section-label">Training & dog</p>
                {TRAINING_TIPS.map((tip) => (
                  <div key={tip.id} className="border-l-2 border-[var(--dt-good)] pl-3 space-y-1">
                    <p className="text-sm font-medium">{tip.title}</p>
                    <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                      {tip.body}
                    </p>
                    <p className="text-[0.6rem] uppercase tracking-[0.1em]" style={{ color: "var(--dt-muted)" }}>
                      Source · {tip.source}
                    </p>
                  </div>
                ))}
              </div>
              <div className="space-y-2 pt-2 border-t border-[var(--dt-line)]">
                <p className="downtown-section-label">Action log</p>
                {save.log.length === 0 ? (
                  <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                    Empty — take an action.
                  </p>
                ) : (
                  <ul className="space-y-2 max-h-64 overflow-y-auto">
                    {save.log.map((line, i) => (
                      <li
                        key={`${i}-${line.slice(0, 24)}`}
                        className="text-xs border-b border-[var(--dt-line)] pb-2 last:border-0"
                        style={{ color: i === 0 ? "var(--dt-fg)" : "var(--dt-muted)" }}
                      >
                        {line}
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          )}
        </section>

        <aside className="downtown-panel p-4 space-y-4 order-3">
          <div className="space-y-2">
            <p className="downtown-section-label">Quest journal</p>
            {quest ? (
              <div className={`${SIMS_CLASS.parchment} p-3 space-y-2`}>
                <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>
                  Ch. {quest.chapter} · {quest.phase}
                </p>
                <p className="text-sm font-medium">{quest.title}</p>
                <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                  {quest.tagline}
                </p>
                {journalStep?.kind === "narrative" ? (
                  <div className="space-y-2 pt-1 border-t border-[var(--dt-line)]">
                    <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>
                      Scroll · {journalStep.title}
                    </p>
                    <RichText text={journalStep.body} />
                    <button
                      type="button"
                      className="downtown-chip text-xs"
                      style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
                      onClick={() => applyResult(acknowledgeQuestStep(save))}
                    >
                      Continue
                    </button>
                  </div>
                ) : pendingSteps.length > 0 ? (
                  <ul className="space-y-2 pt-1">
                    {pendingSteps.map((step) => (
                      <li key={step.id} className="text-xs border-l-2 border-[var(--dt-line)] pl-2">
                        <span style={{ color: "var(--dt-fg)" }}>{step.title}</span>
                        <span className="block" style={{ color: "var(--dt-muted)" }}>
                          {step.body}
                        </span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-xs" style={{ color: "var(--dt-good)" }}>
                    Objectives clear — keep acting; rewards land on the next advance.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                No active quest — keep the routine until {WIN_WEIGHT_LB} lb + dog milestones.
              </p>
            )}
          </div>

          <div className="space-y-2 pt-2 border-t border-[var(--dt-line)]">
            <p className="downtown-section-label">Campaign</p>
            <ul className="space-y-2">
              {QUESTS.map((q) => {
                const done = save.completedQuestIds.includes(q.id);
                const active = save.activeQuestId === q.id;
                return (
                  <li
                    key={q.id}
                    className="text-xs border-b border-[var(--dt-line)] pb-2 last:border-0"
                    style={{
                      color: active ? "var(--dt-accent)" : done ? "var(--dt-good)" : "var(--dt-muted)",
                    }}
                  >
                    <span className="block uppercase tracking-[0.1em] text-[0.6rem]">
                      Ch.{q.chapter}
                      {done ? " ✓" : active ? " ●" : ""}
                    </span>
                    {q.title}
                  </li>
                );
              })}
            </ul>
          </div>

          <div className="space-y-3 pt-2 border-t border-[var(--dt-line)]">
            <div className="flex items-center gap-3">
              <Portrait initials="✦" label={save.dog.name} pulse={dogMastery} />
              <div>
                <p className="downtown-section-label">Companion</p>
                <p className="text-sm">{save.dog.name}</p>
                <p className="text-[0.65rem]" style={{ color: "var(--dt-muted)" }}>
                  She/her · {DEFAULT_DOG_AGE_YEARS}y GS
                </p>
              </div>
            </div>
            <Meter label="Bond" value={save.dog.bond} max={100} tone="dog" bumpKey={`side-bond-${save.dog.bond}`} />
            <Meter
              label="Training"
              value={save.dog.training}
              max={60}
              tone="dog"
              bumpKey={`side-tr-${save.dog.training}`}
            />
            <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
              Cues {save.dog.cuesLearned.join(", ") || "none yet"}
            </p>
            {dogMastery && (
              <p className="text-xs" style={{ color: "var(--dt-good)" }}>
                Mastery threshold met — bonus at graduation.
              </p>
            )}
          </div>
        </aside>
      </div>
    </div>
  );
}
