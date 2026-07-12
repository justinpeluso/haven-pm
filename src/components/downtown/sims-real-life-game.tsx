"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  DEFAULT_DOG_BREED,
  DOG_ACTIONS,
  DOG_CUES,
  EXERCISES,
  MEALS,
  NOT_MEDICAL_ADVICE,
  NUTRITION_TIPS,
  TRAINING_TIPS,
  WIN_WEIGHT_LB,
} from "@/lib/downtown/sims-real-life/data";
import {
  abilityMod,
  advanceDay,
  dogCare,
  doExercise,
  eatMeal,
  estimateTdee,
  rest,
} from "@/lib/downtown/sims-real-life/engine";
import { clearSave, createNewSave, loadSave, writeSave } from "@/lib/downtown/sims-real-life/persist";
import {
  QUESTS,
  STAT_LABELS,
  getQuest,
  hasFlags,
  questCheckPasses,
} from "@/lib/downtown/sims-real-life/quests";
import type { PlayerSave, StatKey } from "@/lib/downtown/sims-real-life/types";
import "@/components/sims-real-life/sims-real-life.css";
import { SIMS_CLASS } from "@/components/sims-real-life";
import { DowntownSubnav } from "./downtown-subnav";

type UiPhase = "boot" | "title" | "play" | "graduated";
type ActionTab = "feed" | "train" | "dog" | "rest" | "tips";

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

function Meter({
  label,
  value,
  max,
  suffix,
  accent,
}: {
  label: string;
  value: number;
  max: number;
  suffix?: string;
  accent?: string;
}) {
  const pct = max > 0 ? Math.round(Math.min(100, Math.max(0, (value / max) * 100))) : 0;
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[0.65rem] uppercase tracking-[0.12em]">
        <span style={{ color: "var(--dt-muted)" }}>{label}</span>
        <span className="downtown-stat" style={{ color: accent ?? "var(--dt-accent)" }}>
          {typeof value === "number" && !Number.isInteger(value) ? value.toFixed(1) : value}
          {suffix ?? ` / ${max}`}
        </span>
      </div>
      <div className="downtown-bar h-1.5">
        <span style={{ width: `${pct}%`, background: accent ?? "var(--dt-accent)" }} />
      </div>
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

function weightProgressPct(weightLb: number, target: number) {
  const span = Math.max(1, target - START_WEIGHT);
  return Math.round(Math.min(100, Math.max(0, ((weightLb - START_WEIGHT) / span) * 100)));
}

export function SimsRealLifeGame() {
  const [phase, setPhase] = useState<UiPhase>("boot");
  const [save, setSave] = useState<PlayerSave | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [tab, setTab] = useState<ActionTab>("feed");
  const [introDismissed, setIntroDismissed] = useState(false);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const existing = loadSave();
    if (existing) {
      setSave(existing);
      setPhase(existing.graduated ? "graduated" : existing.day > 1 || existing.xp > 0 || existing.flags.length > 0 ? "play" : "title");
    } else {
      setPhase("title");
    }
  }, []);

  function persist(next: PlayerSave) {
    writeSave(next);
    setSave(next);
    if (next.graduated) setPhase("graduated");
  }

  function applyResult(result: { save: PlayerSave; message: string; success: boolean }) {
    persist(result.save);
    setFlash(result.message);
  }

  function beginRun() {
    const fresh = createNewSave("Justin");
    persist(fresh);
    setPhase("play");
    setFlash("Day 1. Scale reads 150. Target 170. Scout is ready.");
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

  const dogMastery =
    save != null &&
    save.dog.training >= 40 &&
    save.dog.cuesLearned.length >= 3;

  if (phase === "boot") {
    return (
      <div className="downtown-shell sims-crpg">
        <DowntownSubnav active="sims" />
        <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
          Loading save…
        </p>
      </div>
    );
  }

  if (phase === "title" || !save) {
    return (
      <div className="downtown-shell sims-crpg space-y-6">
        <DowntownSubnav active="sims" />
        <header className={`${SIMS_CLASS.headerBand} p-6 md:p-10`}>
          <div className="space-y-4 max-w-2xl">
            <p className="text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: "var(--dt-accent)" }}>
              Downtown · Life sim
            </p>
            <hr className={SIMS_CLASS.divider} />
            <h1 className={`font-serif text-3xl md:text-5xl tracking-tight ${SIMS_CLASS.title}`} style={{ color: "var(--dt-fg)" }}>
              Sims Real Life
            </h1>
            <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--dt-muted)" }}>
              Justin, 38 — eat for surplus, lift for lean gain, walk Scout the {DEFAULT_DOG_BREED}, rest, repeat.
              D&amp;D checks on STR / DEX / CON / WIS / CHA (+ Computer &amp; Magic). Scale goal:{" "}
              <span style={{ color: "var(--dt-accent)" }}>{WIN_WEIGHT_LB} lb</span>. Progress saves in this browser.
            </p>
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
                      setPhase(s.graduated ? "graduated" : "play");
                    }
                  }}
                >
                  Continue
                </button>
              )}
            </div>
          </div>
        </header>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { t: "Fuel", d: "Pick meals, stack calories vs a fictional TDEE, batch prep when you can." },
            { t: "Iron + Scout", d: "Resistance multiplies surplus. German Shepherd care is its own skill tree." },
            { t: "Fail forward", d: "Missed rolls still count. Rest and end the day to recover energy." },
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
          {NOT_MEDICAL_ADVICE}
        </p>
      </div>
    );
  }

  if (phase === "graduated" && save) {
    return (
      <div className="downtown-shell sims-crpg space-y-6">
        <DowntownSubnav active="sims" />
        <header className={`${SIMS_CLASS.headerBand} p-6 md:p-10 space-y-4`}>
          <div className="space-y-4">
            <p className="text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: "var(--dt-good)" }}>
              Win state
            </p>
            <hr className={SIMS_CLASS.divider} />
            <h1 className={`font-serif text-3xl md:text-4xl ${SIMS_CLASS.title}`}>
              Graduated — {save.weightLb.toFixed(1)} lb
            </h1>
            <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--dt-muted)" }}>
              {save.name} hit the {save.targetWeightLb} lb target in {save.day} days. XP {save.xp}. Scout bond{" "}
              {save.dog.bond}, cues {save.dog.cuesLearned.length}/{DOG_CUES.length}
              {dogMastery ? (
                <>
                  {" "}
                  — <span style={{ color: "var(--dt-accent)" }}>dog mastery bonus unlocked</span>.
                </>
              ) : (
                "."
              )}
            </p>
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
          </div>
        </header>
      </div>
    );
  }

  const weightPct = weightProgressPct(save.weightLb, save.targetWeightLb);
  const tdee = estimateTdee(save);
  const showIntroBanner = !introDismissed && save.phase === "intro" && quest;

  return (
    <div className="downtown-shell sims-crpg space-y-5">
      <DowntownSubnav active="sims" />

      <div className={`flex flex-wrap items-end justify-between gap-3 pb-4 ${SIMS_CLASS.goldBorder} px-4 py-3`}>
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.18em]" style={{ color: "var(--dt-accent)" }}>
            Sims Real Life
          </p>
          <h1 className={`font-serif text-2xl md:text-3xl ${SIMS_CLASS.title}`}>
            {save.name} · {save.age}
          </h1>
          <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
            Day {save.day} · Turn {save.turn} · {save.xp} XP · phase {save.phase}
          </p>
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
        {/* Character sheet */}
        <aside className="downtown-panel p-4 space-y-4 order-2 xl:order-1">
          <p className="downtown-section-label">Character sheet</p>

          <div className="flex items-center gap-3">
            <div className={SIMS_CLASS.portrait} aria-hidden>
              <div className={SIMS_CLASS.portraitFill} />
            </div>
            <div className="min-w-0 space-y-1">
              <p className="font-serif text-lg leading-tight">{save.name}</p>
              <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
                Age {save.age} · Day {save.day}
              </p>
              <hr className={SIMS_CLASS.divider} />
            </div>
          </div>

          <div className="space-y-2">
            <Meter
              label={`Weight → ${save.targetWeightLb} lb`}
              value={save.weightLb}
              max={save.targetWeightLb}
              suffix={` / ${save.targetWeightLb} lb`}
              accent={weightPct >= 100 ? "var(--dt-good)" : "var(--dt-accent)"}
            />
            <div className="downtown-bar h-2">
              <span
                style={{
                  width: `${weightPct}%`,
                  background: weightPct >= 100 ? "var(--dt-good)" : "var(--dt-accent)",
                }}
              />
            </div>
            <p className="text-[0.65rem]" style={{ color: "var(--dt-muted)" }}>
              Progress from {START_WEIGHT} · {weightPct}% of the climb
            </p>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <Meter label="HP" value={save.hp} max={save.maxHp} accent="var(--dt-good)" />
            <Meter label="Energy" value={save.energy} max={save.maxEnergy} />
          </div>

          <div className="grid grid-cols-2 gap-3 text-xs">
            <div className="border border-[var(--dt-line)] p-2">
              <p className="downtown-meta-label">Money</p>
              <p className="downtown-stat text-lg" style={{ color: "var(--dt-accent)" }}>
                ${save.money}
              </p>
            </div>
            <div className="border border-[var(--dt-line)] p-2">
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
            <div className="downtown-bar h-1.5">
              <span
                style={{
                  width: `${Math.min(100, Math.round((save.dayCalories / tdee) * 100))}%`,
                  background:
                    save.dayCalories >= tdee ? "var(--dt-good)" : "var(--dt-warn)",
                }}
              />
            </div>
          </div>

          <div className="pt-2 border-t border-[var(--dt-line)] space-y-2">
            <p className="downtown-section-label">Ability scores</p>
            <div className="grid grid-cols-4 gap-2">
              {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => {
                const mod = abilityMod(save.stats[k]);
                return (
                  <div key={k} className={SIMS_CLASS.statCell}>
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
            <div className="border border-[var(--dt-line)] p-2 text-xs font-mono" style={{ color: "var(--dt-accent)" }}>
              Last: d20 {save.lastRoll.d20} {save.lastRoll.mod >= 0 ? "+" : ""}
              {save.lastRoll.mod} = {save.lastRoll.total} ·{" "}
              {save.lastRoll.success ? "OK" : "FAIL-FWD"}
              {save.lastRoll.label ? ` · ${save.lastRoll.label}` : ""}
            </div>
          )}
        </aside>

        {/* Actions */}
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
                <h2 className="font-serif text-xl">Feed</h2>
                <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                  Stack surplus vs ~{tdee} kcal. Meal-prep tags build stock; boxes spend it. Wis/Computer flavor the
                  habit — cooking is the check that matters.
                </p>
              </div>
              <div className="space-y-2">
                {MEALS.map((meal) => (
                  <button
                    key={meal.id}
                    type="button"
                    className={`w-full text-left p-3 space-y-1 ${SIMS_CLASS.actionRow}`}
                    onClick={() => applyResult(eatMeal(save, meal.id))}
                  >
                    <span className="flex flex-wrap items-baseline justify-between gap-2">
                      <span className="text-sm font-medium">{meal.name}</span>
                      <span className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>
                        {meal.calories} kcal · {meal.proteinG}g P ·{" "}
                        {meal.id === "meal-prep-box" ? "1 prep" : `$${meal.cost}`} · −{meal.energyCost} E
                      </span>
                    </span>
                    <span className="block text-xs" style={{ color: "var(--dt-muted)" }}>
                      {meal.blurb}
                    </span>
                    {meal.mealPrepBonus ? (
                      <span className="block text-[0.65rem]" style={{ color: "var(--dt-good)" }}>
                        +{meal.mealPrepBonus} meal prep stock
                      </span>
                    ) : null}
                  </button>
                ))}
              </div>
            </div>
          )}

          {tab === "train" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="font-serif text-xl">Train body</h2>
                <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                  Resistance / hybrid multiply surplus into scale ticks. Failed checks still fail-forward.
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
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "dog" && (
            <div className="space-y-3">
              <div className="space-y-1">
                <h2 className="font-serif text-xl">{save.dog.name} the {DEFAULT_DOG_BREED}</h2>
                <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                  Feed, walk, train cues. Cha/Wis checks on drills. Neglect soft-penalizes bond at day end.
                </p>
              </div>
              <div className="grid grid-cols-2 gap-3">
                <Meter label="Dog energy" value={save.dog.energy} max={save.dog.maxEnergy} />
                <Meter label="Bond" value={save.dog.bond} max={100} />
                <Meter label="Training" value={save.dog.training} max={60} />
                <div className="border border-[var(--dt-line)] p-2 text-xs space-y-1">
                  <p className="downtown-meta-label">Today</p>
                  <p style={{ color: save.dog.fedToday ? "var(--dt-good)" : "var(--dt-warn)" }}>
                    Fed {save.dog.fedToday ? "✓" : "—"}
                  </p>
                  <p style={{ color: save.dog.walkedToday ? "var(--dt-good)" : "var(--dt-warn)" }}>
                    Walked {save.dog.walkedToday ? "✓" : "—"}
                  </p>
                </div>
              </div>
              <div className="space-y-1">
                <p className="downtown-section-label">Cues learned</p>
                <div className="flex flex-wrap gap-1.5">
                  {DOG_CUES.map((cue) => {
                    const learned = save.dog.cuesLearned.includes(cue.id);
                    return (
                      <span
                        key={cue.id}
                        className="downtown-chip text-[0.6rem]"
                        data-active={learned}
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
                    </button>
                  );
                })}
              </div>
            </div>
          )}

          {tab === "rest" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-serif text-xl">Rest</h2>
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
                  Recover energy from CON. Scout dozes. Same day continues.
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
            </div>
          )}

          {tab === "tips" && (
            <div className="space-y-4">
              <div className="space-y-1">
                <h2 className="font-serif text-xl">Tips / Log</h2>
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

        {/* Quest + dog summary */}
        <aside className="downtown-panel p-4 space-y-4 order-3">
          <div className="space-y-2">
            <p className="downtown-section-label">Active quest</p>
            {quest ? (
              <div className="space-y-2">
                <p className="text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>
                  Ch. {quest.chapter} · {quest.phase}
                </p>
                <p className="text-sm font-medium">{quest.title}</p>
                <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                  {quest.tagline}
                </p>
                {pendingSteps.length > 0 ? (
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
                    Objectives clear — rewards pending on next advance.
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                No active quest — keep the routine until {WIN_WEIGHT_LB} lb.
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

          <div className="space-y-2 pt-2 border-t border-[var(--dt-line)]">
            <p className="downtown-section-label">Scout</p>
            <p className="text-sm">{save.dog.name}</p>
            <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
              Bond {save.dog.bond} · Training {save.dog.training} · Cues {save.dog.cuesLearned.join(", ") || "none yet"}
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
