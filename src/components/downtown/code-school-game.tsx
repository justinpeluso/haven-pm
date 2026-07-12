"use client";

import { useEffect, useMemo, useState, useTransition } from "react";
import {
  INVENTORY_CATALOG,
  QUESTS,
  STAT_LABELS,
  getItem,
  getQuest,
  xpProgress,
} from "@/lib/downtown/code-school/campaign";
import {
  applyOutcome,
  availableQuests,
  completeQuestRewards,
  grantItem,
  nextIncompleteQuest,
  skillCheck,
  applyStatBump,
} from "@/lib/downtown/code-school/engine";
import { clearSave, createNewSave, loadSave, writeSave } from "@/lib/downtown/code-school/persist";
import type {
  ChallengeStep,
  ChoiceOption,
  ChoiceStep,
  PlayerSave,
  Quest,
  QuestStep,
  StatKey,
} from "@/lib/downtown/code-school/types";
import { DowntownSubnav } from "./downtown-subnav";

type Phase = "boot" | "title" | "play" | "graduated";

function StatBar({ label, value }: { label: string; value: number }) {
  const pct = Math.round((value / 20) * 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between text-[0.65rem] uppercase tracking-[0.14em]">
        <span style={{ color: "var(--dt-muted)" }}>{label}</span>
        <span style={{ color: "var(--dt-accent)" }}>{value}</span>
      </div>
      <div className="downtown-bar h-1.5">
        <span style={{ width: `${pct}%` }} />
      </div>
    </div>
  );
}

function RichText({ text }: { text: string }) {
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return (
    <div className="space-y-3 text-sm leading-relaxed whitespace-pre-wrap" style={{ color: "var(--dt-fg)" }}>
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

export function CodeSchoolGame() {
  const [phase, setPhase] = useState<Phase>("boot");
  const [save, setSave] = useState<PlayerSave | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [challengePick, setChallengePick] = useState<string | null>(null);
  const [challengeResolved, setChallengeResolved] = useState(false);
  const [choiceResolved, setChoiceResolved] = useState<ChoiceOption | null>(null);
  const [, startTransition] = useTransition();

  useEffect(() => {
    const existing = loadSave();
    if (existing) {
      setSave(existing);
      setPhase(existing.graduated ? "graduated" : existing.currentQuestId || existing.xp > 0 ? "play" : "title");
    } else {
      setPhase("title");
    }
  }, []);

  function persist(next: PlayerSave) {
    writeSave(next);
    setSave(next);
  }

  function beginCampaign() {
    const fresh = createNewSave("JP");
    fresh.currentQuestId = QUESTS[0].id;
    fresh.stepIndex = 0;
    persist(fresh);
    setPhase("play");
    setFlash(null);
    setChallengePick(null);
    setChallengeResolved(false);
    setChoiceResolved(null);
  }

  function resetCampaign() {
    clearSave();
    setSave(null);
    setPhase("title");
    setFlash(null);
    setChallengePick(null);
    setChallengeResolved(false);
    setChoiceResolved(null);
  }

  const quest: Quest | null = useMemo(() => {
    if (!save?.currentQuestId) return null;
    return getQuest(save.currentQuestId) ?? null;
  }, [save?.currentQuestId]);

  const step: QuestStep | null = quest ? quest.steps[save?.stepIndex ?? 0] ?? null : null;

  const progress = save ? xpProgress(save.xp) : null;
  const unlocked = save ? availableQuests(save) : [];

  function advance(nextSave: PlayerSave) {
    if (!quest) return;
    const atEnd = nextSave.stepIndex >= quest.steps.length - 1;
    if (atEnd) {
      let done = completeQuestRewards(nextSave, quest);
      const following = nextIncompleteQuest(done);
      if (following && !done.graduated) {
        done = { ...done, currentQuestId: following.id, stepIndex: 0 };
        setFlash(`Chapter complete. Unlocked: ${following.title}`);
      } else if (done.graduated) {
        setPhase("graduated");
        setFlash("Campaign complete — you graduated.");
      } else {
        setFlash("Chapter complete.");
      }
      persist(done);
      setChallengePick(null);
      setChallengeResolved(false);
      setChoiceResolved(null);
      return;
    }
    persist({ ...nextSave, stepIndex: nextSave.stepIndex + 1, lastRoll: null });
    setChallengePick(null);
    setChallengeResolved(false);
    setChoiceResolved(null);
  }

  function startQuest(q: Quest) {
    if (!save) return;
    if (save.completedQuestIds.includes(q.id)) {
      setFlash("Already completed — replaying from start of chapter.");
    }
    persist({
      ...save,
      currentQuestId: q.id,
      stepIndex: 0,
      lastRoll: null,
    });
    setPhase("play");
    setChallengePick(null);
    setChallengeResolved(false);
    setChoiceResolved(null);
  }

  function onChoice(option: ChoiceOption) {
    if (!save || !quest || !step || step.type !== "choice" || choiceResolved) return;
    const check = skillCheck(save.stats, option.stat, option.dc);
    const outcome = check.success ? option.success : option.fail;
    let next = applyOutcome(save, outcome);
    next = {
      ...next,
      lastRoll: {
        d20: check.d20,
        total: check.total,
        success: check.success,
        optionId: option.id,
      },
      choiceLog: [
        ...next.choiceLog,
        { questId: quest.id, stepId: step.id, optionId: option.id, success: check.success },
      ],
    };
    persist(next);
    setChoiceResolved(option);
    setFlash(
      `${check.success ? "Success" : "Fail-forward"} — d20 ${check.d20} ${check.mod >= 0 ? "+" : ""}${check.mod} = ${check.total} vs DC ${option.dc}`
    );
  }

  function continueAfterChoice() {
    if (!save || !choiceResolved) return;
    advance(save);
  }

  function onChallengeSubmit(ch: ChallengeStep) {
    if (!save || !challengePick || challengeResolved) return;
    const picked = ch.options.find((o) => o.id === challengePick);
    if (!picked) return;
    setChallengeResolved(true);
    if (picked.correct) {
      const next = {
        ...save,
        xp: save.xp + ch.xp,
        stats: applyStatBump(save.stats, ch.stats),
        inventory: grantItem(save.inventory, ch.itemId),
      };
      persist(next);
      setFlash(`Correct — +${ch.xp} XP`);
    } else {
      const consolation = Math.max(3, Math.floor(ch.xp / 3));
      persist({ ...save, xp: save.xp + consolation });
      setFlash(`Not quite — +${consolation} XP fail-forward. Read the explanation.`);
    }
  }

  if (phase === "boot") {
    return (
      <div className="downtown-shell">
        <DowntownSubnav active="code-school" />
        <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
          Loading save…
        </p>
      </div>
    );
  }

  if (phase === "title" || !save) {
    return (
      <div className="downtown-shell space-y-6">
        <DowntownSubnav active="code-school" />
        <header className="relative overflow-hidden border border-[var(--dt-line)] p-6 md:p-10">
          <div
            className="pointer-events-none absolute inset-0 opacity-40"
            style={{
              background:
                "radial-gradient(ellipse at 20% 0%, rgba(196,163,90,0.25), transparent 55%), radial-gradient(ellipse at 80% 100%, rgba(61,154,122,0.12), transparent 50%)",
            }}
          />
          <div className="relative space-y-4 max-w-2xl">
            <p className="text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: "var(--dt-accent)" }}>
              Downtown · Interactive campaign
            </p>
            <h1 className="font-serif text-3xl md:text-5xl tracking-tight" style={{ color: "var(--dt-fg)" }}>
              Code School by JP
            </h1>
            <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--dt-muted)" }}>
              A D&amp;D-flavored coding campaign for Justin — social craft, a Bambu Lab P2S, and a path toward a
              Pittsburgh moon-robot shop called Lunar Foundry. Choices roll against Logic, Craft, Charm, Grit, and
              Debug. Progress saves in this browser.
            </p>
            <div className="flex flex-wrap gap-3 pt-2">
              <button
                type="button"
                className="downtown-chip px-4 py-2 text-sm"
                style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
                onClick={() => startTransition(() => beginCampaign())}
              >
                Begin campaign
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
            { t: "8 chapters", d: "Markup → TS → git → APIs → P2S bridge → ethical social eng → interview boss." },
            { t: "Fail forward", d: "Missed rolls still teach. Skill checks use your stats + d20." },
            { t: "Personal arc", d: "Hardware strength + people skills → tech industry readiness." },
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
      </div>
    );
  }

  if (phase === "graduated" && save) {
    return (
      <div className="downtown-shell space-y-6">
        <DowntownSubnav active="code-school" />
        <header className="border border-[var(--dt-line)] p-6 md:p-10 space-y-4">
          <p className="text-[0.7rem] uppercase tracking-[0.2em]" style={{ color: "var(--dt-good)" }}>
            Win state
          </p>
          <h1 className="font-serif text-3xl md:text-4xl">Graduation — Lunar Foundry track</h1>
          <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--dt-muted)" }}>
            {save.name} cleared Code School by JP. Title: <span style={{ color: "var(--dt-accent)" }}>{save.title}</span>.
            XP {save.xp}. Inventory {save.inventory.length} relics. Offer letter stowed.
          </p>
          <div className="flex flex-wrap gap-3">
            <button type="button" className="downtown-chip px-4 py-2" onClick={resetCampaign}>
              New run
            </button>
            <button
              type="button"
              className="downtown-chip px-4 py-2"
              onClick={() => {
                setPhase("play");
                const q = QUESTS[QUESTS.length - 1];
                persist({ ...save, currentQuestId: q.id, stepIndex: q.steps.length - 1 });
              }}
            >
              Revisit finale
            </button>
          </div>
        </header>
      </div>
    );
  }

  // play
  return (
    <div className="downtown-shell space-y-5">
      <DowntownSubnav active="code-school" />

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--dt-line)] pb-4">
        <div>
          <p className="text-[0.7rem] uppercase tracking-[0.18em]" style={{ color: "var(--dt-accent)" }}>
            Code School by JP
          </p>
          <h1 className="font-serif text-2xl md:text-3xl">{save.name}</h1>
          <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
            {save.title} · Level {progress?.level} · {save.xp} XP
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="downtown-chip text-xs" onClick={resetCampaign}>
            Reset run
          </button>
        </div>
      </div>

      {flash && (
        <div
          className="border border-[var(--dt-line)] px-3 py-2 text-xs"
          style={{ color: "var(--dt-accent)", background: "rgba(196,163,90,0.08)" }}
        >
          {flash}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr_14rem]">
        {/* Character sheet */}
        <aside className="downtown-panel p-4 space-y-4 order-2 lg:order-1">
          <p className="downtown-section-label">Character sheet</p>
          <div className="space-y-3">
            {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
              <StatBar key={k} label={STAT_LABELS[k]} value={save.stats[k]} />
            ))}
          </div>
          {progress && (
            <div className="space-y-1 pt-2 border-t border-[var(--dt-line)]">
              <div className="flex justify-between text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-muted)" }}>
                <span>XP to next</span>
                <span>
                  {progress.into}/{progress.need}
                </span>
              </div>
              <div className="downtown-bar h-1.5">
                <span style={{ width: `${progress.pct}%` }} />
              </div>
            </div>
          )}
          <div className="space-y-2 pt-2 border-t border-[var(--dt-line)]">
            <p className="downtown-section-label">Inventory</p>
            {save.inventory.length === 0 ? (
              <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                Empty pack — loot awaits.
              </p>
            ) : (
              <ul className="space-y-2">
                {save.inventory.map((id) => {
                  const item = getItem(id) ?? INVENTORY_CATALOG.find((i) => i.id === id);
                  if (!item) return null;
                  return (
                    <li key={id} className="text-xs border-l-2 border-[var(--dt-accent)] pl-2">
                      <span style={{ color: "var(--dt-fg)" }}>{item.name}</span>
                      <span className="block" style={{ color: "var(--dt-muted)" }}>
                        {item.blurb}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </div>
        </aside>

        {/* Main stage */}
        <section className="downtown-panel p-4 md:p-6 space-y-5 order-1 lg:order-2 min-h-[22rem]">
          {!quest || !step ? (
            <div className="space-y-4">
              <h2 className="font-serif text-xl">Quest select</h2>
              <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
                Pick an unlocked chapter to continue the Lunar Foundry arc.
              </p>
              <div className="space-y-2">
                {unlocked.map((q) => {
                  const done = save.completedQuestIds.includes(q.id);
                  return (
                    <button
                      key={q.id}
                      type="button"
                      className="w-full text-left border border-[var(--dt-line)] p-3 hover:border-[var(--dt-accent)] transition-colors"
                      onClick={() => startQuest(q)}
                    >
                      <span className="text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-accent)" }}>
                        Ch. {q.chapter}
                        {done ? " · cleared" : ""}
                      </span>
                      <span className="block font-medium">{q.title}</span>
                      <span className="block text-xs" style={{ color: "var(--dt-muted)" }}>
                        {q.tagline}
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          ) : (
            <>
              <div className="space-y-1 border-b border-[var(--dt-line)] pb-3">
                <p className="text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-accent)" }}>
                  Chapter {quest.chapter} · Step {(save.stepIndex ?? 0) + 1}/{quest.steps.length}
                </p>
                <h2 className="font-serif text-xl md:text-2xl">{quest.title}</h2>
                <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                  {quest.synopsis}
                </p>
              </div>

              {step.type === "narrative" && (
                <div className="space-y-4">
                  {step.title && <h3 className="text-sm uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>{step.title}</h3>}
                  <RichText text={step.body} />
                  <button
                    type="button"
                    className="downtown-chip px-4 py-2 text-sm"
                    style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
                    onClick={() => advance(save)}
                  >
                    Continue
                  </button>
                </div>
              )}

              {step.type === "choice" && (
                <ChoicePanel
                  step={step}
                  save={save}
                  resolved={choiceResolved}
                  onPick={onChoice}
                  onContinue={continueAfterChoice}
                />
              )}

              {step.type === "challenge" && (
                <div className="space-y-4">
                  <h3 className="text-sm uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>
                    {step.title}
                  </h3>
                  <p className="text-sm" style={{ color: "var(--dt-fg)" }}>
                    {step.prompt}
                  </p>
                  {step.codeHint && (
                    <pre
                      className="overflow-x-auto border border-[var(--dt-line)] p-3 text-xs"
                      style={{ background: "rgba(0,0,0,0.35)", color: "var(--dt-good)" }}
                    >
                      {step.codeHint}
                    </pre>
                  )}
                  <div className="space-y-2">
                    {step.options.map((o) => (
                      <label
                        key={o.id}
                        className="flex gap-2 items-start border border-[var(--dt-line)] p-3 text-sm cursor-pointer"
                        style={{
                          borderColor:
                            challengePick === o.id ? "var(--dt-accent)" : "var(--dt-line)",
                          opacity: challengeResolved && !o.correct && challengePick === o.id ? 0.7 : 1,
                        }}
                      >
                        <input
                          type="radio"
                          name={step.id}
                          className="mt-1"
                          disabled={challengeResolved}
                          checked={challengePick === o.id}
                          onChange={() => setChallengePick(o.id)}
                        />
                        <span>{o.label}</span>
                      </label>
                    ))}
                  </div>
                  {!challengeResolved ? (
                    <button
                      type="button"
                      className="downtown-chip px-4 py-2 text-sm"
                      style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
                      disabled={!challengePick}
                      onClick={() => onChallengeSubmit(step)}
                    >
                      Submit answer
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
                        {step.explanation}
                      </p>
                      <button
                        type="button"
                        className="downtown-chip px-4 py-2 text-sm"
                        style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
                        onClick={() => advance(save)}
                      >
                        Continue
                      </button>
                    </div>
                  )}
                </div>
              )}

              {step.type === "loot" && (
                <div className="space-y-4">
                  <h3 className="text-sm uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>
                    {step.title}
                  </h3>
                  <RichText text={step.body} />
                  <div className="border border-[var(--dt-line)] p-4" style={{ background: "rgba(196,163,90,0.08)" }}>
                    <p className="text-[0.65rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-accent)" }}>
                      Item acquired
                    </p>
                    <p className="font-medium">{getItem(step.itemId)?.name}</p>
                    <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                      {getItem(step.itemId)?.blurb}
                    </p>
                  </div>
                  <button
                    type="button"
                    className="downtown-chip px-4 py-2 text-sm"
                    style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
                    onClick={() => {
                      const next = {
                        ...save,
                        xp: save.xp + (step.xp ?? 0),
                        inventory: grantItem(save.inventory, step.itemId),
                      };
                      advance(next);
                    }}
                  >
                    Take loot & continue
                  </button>
                </div>
              )}

              {step.type === "graduation" && (
                <div className="space-y-4">
                  <h3 className="text-sm uppercase tracking-[0.12em]" style={{ color: "var(--dt-good)" }}>
                    {step.title}
                  </h3>
                  <RichText text={step.body} />
                  <button
                    type="button"
                    className="downtown-chip px-4 py-2 text-sm"
                    style={{ borderColor: "var(--dt-good)", color: "var(--dt-good)" }}
                    onClick={() => advance(save)}
                  >
                    Claim graduation
                  </button>
                </div>
              )}
            </>
          )}
        </section>

        {/* Quest log */}
        <aside className="downtown-panel p-4 space-y-3 order-3">
          <p className="downtown-section-label">Quest log</p>
          <ul className="space-y-2">
            {QUESTS.map((q) => {
              const done = save.completedQuestIds.includes(q.id);
              const active = save.currentQuestId === q.id;
              const open = unlocked.some((u) => u.id === q.id);
              return (
                <li
                  key={q.id}
                  className="text-xs border-b border-[var(--dt-line)] pb-2 last:border-0"
                  style={{
                    color: active ? "var(--dt-accent)" : done ? "var(--dt-good)" : open ? "var(--dt-fg)" : "var(--dt-muted)",
                    opacity: open ? 1 : 0.45,
                  }}
                >
                  <button
                    type="button"
                    className="text-left w-full disabled:cursor-default"
                    disabled={!open}
                    onClick={() => open && startQuest(q)}
                  >
                    <span className="block uppercase tracking-[0.1em] text-[0.6rem]">
                      Ch.{q.chapter}
                      {done ? " ✓" : active ? " ●" : ""}
                    </span>
                    {q.title}
                  </button>
                </li>
              );
            })}
          </ul>
        </aside>
      </div>
    </div>
  );
}

function ChoicePanel({
  step,
  save,
  resolved,
  onPick,
  onContinue,
}: {
  step: ChoiceStep;
  save: PlayerSave;
  resolved: ChoiceOption | null;
  onPick: (o: ChoiceOption) => void;
  onContinue: () => void;
}) {
  return (
    <div className="space-y-4">
      <h3 className="text-sm uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>
        {step.title}
      </h3>
      <p className="text-sm" style={{ color: "var(--dt-fg)" }}>
        {step.prompt}
      </p>
      {!resolved ? (
        <div className="space-y-2">
          {step.options.map((o) => {
            const mod = Math.floor((save.stats[o.stat] - 10) / 2);
            return (
              <button
                key={o.id}
                type="button"
                className="w-full text-left border border-[var(--dt-line)] p-3 hover:border-[var(--dt-accent)] transition-colors space-y-1"
                onClick={() => onPick(o)}
              >
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-xs" style={{ color: "var(--dt-muted)" }}>
                  {o.approach}
                </span>
                <span className="block text-[0.65rem] uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>
                  Check {STAT_LABELS[o.stat]} DC {o.dc} (mod {mod >= 0 ? `+${mod}` : mod})
                </span>
              </button>
            );
          })}
        </div>
      ) : (
        <div className="space-y-3">
          {save.lastRoll && (
            <p className="text-xs font-mono" style={{ color: "var(--dt-accent)" }}>
              d20 {save.lastRoll.d20} → total {save.lastRoll.total} ·{" "}
              {save.lastRoll.success ? "SUCCESS" : "FAIL-FORWARD"}
            </p>
          )}
          <RichText
            text={
              save.lastRoll?.success ? resolved.success.text : resolved.fail.text
            }
          />
          <button
            type="button"
            className="downtown-chip px-4 py-2 text-sm"
            style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
            onClick={onContinue}
          >
            Continue
          </button>
        </div>
      )}
    </div>
  );
}
