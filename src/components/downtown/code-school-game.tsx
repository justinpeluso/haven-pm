"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import {
  INVENTORY_CATALOG,
  QUESTS,
  STAT_LABELS,
  getItem,
  getQuest,
  levelFromXp,
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
import "./code-school.css";

type Phase = "boot" | "title" | "play" | "graduated";
type ToastKind = "info" | "good" | "warn" | "crit" | "fail" | "xp";
type RollFlavor = "crit" | "fail" | "success" | "miss";

type Toast = { id: number; text: string; kind: ToastKind };
type LogEntry = { id: number; text: string; kind: ToastKind; at: number };
type Floater = { id: number; text: string; kind: "xp" | "level" };
type Fanfare = {
  kind: "chapter" | "grad" | "level";
  title: string;
  subtitle: string;
  onDismiss: () => void;
} | null;
type Spark = { id: number; x: number; y: number; delay: number; hue: "gold" | "moon" | "ember" };
type ShakeKind = "crit" | "fail" | null;

type PendingRoll = {
  option: ChoiceOption;
  check: { d20: number; total: number; success: boolean; mod: number };
  face: number;
  spinning: boolean;
  revealed: boolean;
};

const FAIL_FORWARD_QUIPS = [
  "Fail-forward: the P2S still prints; your ego just needed a brim.",
  "Fail-forward: Pittsburgh winters teach retry loops. So does this.",
  "Fail-forward: Lunar Foundry hires people who recover, not people who never miss.",
  "Fail-forward: a natural wobble beats a silent wrong answer.",
  "Fail-forward: ship the lesson, then ship the fix.",
  "Fail-forward: Debug +1 to spirit. The compiler already forgave you.",
];

const CRIT_SUCCESS_QUIPS = [
  "NATURAL 20 — the moon robot salutes from the CAD viewport.",
  "CRIT! Filament gods approve. Lunar Foundry would frame this roll.",
  "NAT 20 — P2S lights blink like applause.",
];

const CRIT_FAIL_QUIPS = [
  "NATURAL 1 — spectacular fumble. Take the joke, keep the XP, learn the bit.",
  "CRIT FAIL — even legends spaghetti-code. Fail-forward harder.",
  "NAT 1 — the die wants drama. You still leave wiser.",
];

function pick<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)]!;
}

function rollFlavor(d20: number, success: boolean): RollFlavor {
  if (d20 === 20) return "crit";
  if (d20 === 1) return "fail";
  return success ? "success" : "miss";
}

function campaignProgress(save: PlayerSave): { done: number; total: number; pct: number } {
  const total = QUESTS.length;
  const done = save.completedQuestIds.filter((id) => QUESTS.some((q) => q.id === id)).length;
  return { done, total, pct: Math.round((done / Math.max(1, total)) * 100) };
}

function chapterProgress(quest: Quest | null, stepIndex: number): number {
  if (!quest || quest.steps.length === 0) return 0;
  return Math.round(((Math.min(stepIndex, quest.steps.length - 1) + 1) / quest.steps.length) * 100);
}

function nextActionHint(
  phase: Phase,
  step: QuestStep | null,
  choiceResolved: ChoiceOption | null,
  challengeResolved: boolean,
  challengePick: string | null,
  rolling: boolean
): { label: string; detail: string; urgent: boolean } {
  if (phase === "title") {
    return { label: "Begin campaign", detail: "Enroll and open Chapter 1.", urgent: true };
  }
  if (phase === "graduated") {
    return { label: "Celebrate", detail: "You cleared the Lunar Foundry track.", urgent: false };
  }
  if (!step) {
    return { label: "Pick a chapter", detail: "Open an unlocked quest from the log.", urgent: true };
  }
  if (rolling) {
    return { label: "Dice in flight…", detail: "Watch the d20 — crits get fireworks.", urgent: false };
  }
  if (step.type === "narrative") {
    return { label: "Continue", detail: "Read, then advance the scene.", urgent: true };
  }
  if (step.type === "choice") {
    if (!choiceResolved) {
      return { label: "Choose an approach", detail: "Pick a skill check — stats + d20 vs DC.", urgent: true };
    }
    return { label: "Continue", detail: "Absorb the outcome, then press on.", urgent: true };
  }
  if (step.type === "challenge") {
    if (!challengeResolved) {
      return {
        label: challengePick ? "Submit answer" : "Select an answer",
        detail: "Wrong answers still pay fail-forward XP.",
        urgent: true,
      };
    }
    return { label: "Continue", detail: "Read the explanation, then advance.", urgent: true };
  }
  if (step.type === "loot") {
    return { label: "Take loot & continue", detail: "Pocket the relic for Lunar Foundry lore.", urgent: true };
  }
  if (step.type === "graduation") {
    return { label: "Claim graduation", detail: "Seal the offer letter and moon-shop title.", urgent: true };
  }
  return { label: "Continue", detail: "Keep shipping.", urgent: true };
}

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
  const [challengePick, setChallengePick] = useState<string | null>(null);
  const [challengeResolved, setChallengeResolved] = useState(false);
  const [choiceResolved, setChoiceResolved] = useState<ChoiceOption | null>(null);
  const [pendingRoll, setPendingRoll] = useState<PendingRoll | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);
  const [log, setLog] = useState<LogEntry[]>([]);
  const [floaters, setFloaters] = useState<Floater[]>([]);
  const [fanfare, setFanfare] = useState<Fanfare>(null);
  const [fanfareQueue, setFanfareQueue] = useState<Fanfare[]>([]);
  const [stageKey, setStageKey] = useState(0);
  const [hasExistingSave, setHasExistingSave] = useState(false);
  const [sparks, setSparks] = useState<Spark[]>([]);
  const [shake, setShake] = useState<ShakeKind>(null);
  const [xpPulse, setXpPulse] = useState(false);
  const [, startTransition] = useTransition();
  const seq = useRef(0);
  const prevXp = useRef<number | null>(null);
  const prevLevel = useRef<number | null>(null);
  const rollTimer = useRef<ReturnType<typeof setInterval> | null>(null);
  const revealTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const saveRef = useRef<PlayerSave | null>(null);
  const toastTitleId = useId();

  useEffect(() => {
    saveRef.current = save;
  }, [save]);

  function nextId() {
    seq.current += 1;
    return seq.current;
  }

  function pushToast(text: string, kind: ToastKind = "info") {
    const id = nextId();
    setToasts((t) => [...t.slice(-2), { id, text, kind }]);
    setLog((l) => [{ id, text, kind, at: Date.now() }, ...l].slice(0, 12));
    window.setTimeout(() => {
      setToasts((t) => t.filter((x) => x.id !== id));
    }, 4200);
  }

  function spawnFloater(text: string, kind: "xp" | "level") {
    const id = nextId();
    setFloaters((f) => [...f, { id, text, kind }]);
    window.setTimeout(() => {
      setFloaters((f) => f.filter((x) => x.id !== id));
    }, 1400);
  }

  function enqueueFanfare(next: Exclude<Fanfare, null>) {
    setFanfare((current) => {
      if (!current) return next;
      setFanfareQueue((q) => [...q, next]);
      return current;
    });
  }

  function dismissFanfare() {
    const current = fanfare;
    // Side effects only — queue advances the overlay.
    if (current) {
      const cb = current.onDismiss;
      setFanfareQueue((q) => {
        const [head, ...rest] = q;
        setFanfare(head ?? null);
        return rest;
      });
      // Run after paint so queue swap isn't stomped by onDismiss.
      window.setTimeout(() => cb(), 0);
    }
  }

  function burstSparks(count: number, hue: Spark["hue"] = "gold") {
    const batch: Spark[] = Array.from({ length: count }, () => ({
      id: nextId(),
      x: 42 + Math.random() * 16,
      y: 38 + Math.random() * 18,
      delay: Math.random() * 0.25,
      hue,
    }));
    setSparks((s) => [...s, ...batch]);
    window.setTimeout(() => {
      const ids = new Set(batch.map((b) => b.id));
      setSparks((s) => s.filter((x) => !ids.has(x.id)));
    }, 1100);
  }

  function triggerShake(kind: ShakeKind) {
    if (!kind) return;
    setShake(kind);
    window.setTimeout(() => setShake(null), 420);
  }

  function clearRollTimers() {
    if (rollTimer.current) clearInterval(rollTimer.current);
    if (revealTimer.current) clearTimeout(revealTimer.current);
    rollTimer.current = null;
    revealTimer.current = null;
  }

  useEffect(() => {
    const existing = loadSave();
    setHasExistingSave(Boolean(existing));
    if (existing) {
      setSave(existing);
      prevXp.current = existing.xp;
      prevLevel.current = levelFromXp(existing.xp);
      setPhase(existing.graduated ? "graduated" : existing.currentQuestId || existing.xp > 0 ? "play" : "title");
      if (existing.currentQuestId || existing.xp > 0) {
        const id = ++seq.current;
        setToasts([{ id, text: "Save loaded — haven-code-school-v1 intact.", kind: "info" }]);
        setLog([{ id, text: "Save loaded — haven-code-school-v1 intact.", kind: "info", at: Date.now() }]);
      }
    } else {
      setPhase("title");
    }
    return () => clearRollTimers();
  }, []);

  function noteXpDelta(before: PlayerSave, after: PlayerSave, label?: string) {
    const gained = after.xp - before.xp;
    if (gained > 0) {
      spawnFloater(`+${gained} XP`, "xp");
      pushToast(label ? `${label} · +${gained} XP` : `+${gained} XP`, "xp");
      setXpPulse(true);
      window.setTimeout(() => setXpPulse(false), 700);
      if (gained >= 20) burstSparks(8, "gold");
    }
    const beforeLevel = levelFromXp(before.xp);
    const afterLevel = levelFromXp(after.xp);
    if (afterLevel > beforeLevel) {
      spawnFloater(`LEVEL ${afterLevel}`, "level");
      pushToast(`Level up — you are now Level ${afterLevel}. Lunar Foundry noticed.`, "crit");
      burstSparks(14, "moon");
      enqueueFanfare({
        kind: "level",
        title: `Level ${afterLevel}`,
        subtitle: `The character sheet glows. ${STAT_LABELS.logic} circuits hum — Lunar Foundry recruiters just bookmarked your name.`,
        onDismiss: () => {
          pushToast(`Level ${afterLevel} locked in. Keep shipping.`, "good");
        },
      });
    }
    prevXp.current = after.xp;
    prevLevel.current = afterLevel;
  }

  function persist(next: PlayerSave) {
    writeSave(next);
    saveRef.current = next;
    setSave(next);
    setHasExistingSave(true);
  }

  function beginCampaign() {
    clearRollTimers();
    const fresh = createNewSave("JP");
    fresh.currentQuestId = QUESTS[0].id;
    fresh.stepIndex = 0;
    persist(fresh);
    prevXp.current = 0;
    prevLevel.current = 1;
    setPhase("play");
    setChallengePick(null);
    setChallengeResolved(false);
    setChoiceResolved(null);
    setPendingRoll(null);
    setFanfare(null);
    setFanfareQueue([]);
    setSparks([]);
    setShake(null);
    setStageKey((k) => k + 1);
    pushToast("Enrollment stamped. Chapter 1 unlocked — P2S + people skills go first.", "good");
  }

  function resetCampaign() {
    clearRollTimers();
    clearSave();
    saveRef.current = null;
    setSave(null);
    setHasExistingSave(false);
    setPhase("title");
    setChallengePick(null);
    setChallengeResolved(false);
    setChoiceResolved(null);
    setPendingRoll(null);
    setFanfare(null);
    setFanfareQueue([]);
    setSparks([]);
    setShake(null);
    setLog([]);
    setToasts([]);
    pushToast("Save cleared. Fresh character sheet ready.", "warn");
  }

  const quest: Quest | null = useMemo(() => {
    if (!save?.currentQuestId) return null;
    return getQuest(save.currentQuestId) ?? null;
  }, [save?.currentQuestId]);

  const step: QuestStep | null = quest ? quest.steps[save?.stepIndex ?? 0] ?? null : null;
  const progress = save ? xpProgress(save.xp) : null;
  const campaign = save ? campaignProgress(save) : null;
  const unlocked = save ? availableQuests(save) : [];
  const hint = nextActionHint(
    phase,
    step,
    choiceResolved,
    challengeResolved,
    challengePick,
    Boolean(pendingRoll && !pendingRoll.revealed)
  );

  const primaryReady =
    !fanfare &&
    !(pendingRoll && !pendingRoll.revealed) &&
    !(step?.type === "choice" && !choiceResolved) &&
    !(step?.type === "challenge" && !challengeResolved && !challengePick);

  function runPrimaryAction() {
    if (!save || fanfare || (pendingRoll && !pendingRoll.revealed)) return;
    if (!quest || !step) {
      const next = unlocked.find((q) => !save.completedQuestIds.includes(q.id)) ?? unlocked[0];
      if (next) startQuest(next);
      else beginCampaign();
      return;
    }
    if (step.type === "narrative" || step.type === "graduation") {
      advance(save);
      return;
    }
    if (step.type === "choice") {
      if (choiceResolved && pendingRoll?.revealed) continueAfterChoice();
      return;
    }
    if (step.type === "challenge") {
      if (!challengeResolved) {
        if (challengePick) onChallengeSubmit(step);
        return;
      }
      advance(save);
      return;
    }
    if (step.type === "loot") {
      const before = save;
      const next = {
        ...save,
        xp: save.xp + (step.xp ?? 0),
        inventory: grantItem(save.inventory, step.itemId),
      };
      noteXpDelta(before, next, "Loot");
      pushToast(`Pocketed ${getItem(step.itemId)?.name ?? "relic"}.`, "good");
      advance(next);
    }
  }

  function bumpStage() {
    setStageKey((k) => k + 1);
  }

  function advance(nextSave: PlayerSave) {
    if (!quest) return;
    const atEnd = nextSave.stepIndex >= quest.steps.length - 1;
    if (atEnd) {
      const before = nextSave;
      let done = completeQuestRewards(nextSave, quest);
      noteXpDelta(before, done, `Chapter ${quest.chapter} rewards`);
      const following = nextIncompleteQuest(done);

      if (following && !done.graduated) {
        done = { ...done, currentQuestId: following.id, stepIndex: 0 };
        persist(done);
        setChallengePick(null);
        setChallengeResolved(false);
        setChoiceResolved(null);
        setPendingRoll(null);
        enqueueFanfare({
          kind: "chapter",
          title: `Chapter ${quest.chapter} complete`,
          subtitle: `Unlocked: ${following.title}. The moon-shop blueprint gains a page.`,
          onDismiss: () => {
            bumpStage();
            burstSparks(10, "gold");
            pushToast(`Now playing: ${following.title}`, "good");
          },
        });
        return;
      }
      if (done.graduated) {
        persist(done);
        setChallengePick(null);
        setChallengeResolved(false);
        setChoiceResolved(null);
        setPendingRoll(null);
        enqueueFanfare({
          kind: "grad",
          title: "Graduation — Lunar Foundry track",
          subtitle: "Offer letter stowed. Pittsburgh’s moon-robot shop has a new apprentice.",
          onDismiss: () => {
            setPhase("graduated");
            bumpStage();
            burstSparks(18, "moon");
            pushToast("Campaign complete — you graduated.", "crit");
          },
        });
        return;
      }
      persist(done);
      setChallengePick(null);
      setChallengeResolved(false);
      setChoiceResolved(null);
      setPendingRoll(null);
      bumpStage();
      pushToast("Chapter complete.", "good");
      return;
    }
    persist({ ...nextSave, stepIndex: nextSave.stepIndex + 1, lastRoll: null });
    setChallengePick(null);
    setChallengeResolved(false);
    setChoiceResolved(null);
    setPendingRoll(null);
    bumpStage();
  }

  function startQuest(q: Quest) {
    if (!save) return;
    if (save.completedQuestIds.includes(q.id)) {
      pushToast("Already cleared — replaying from the top of the chapter.", "info");
    } else {
      pushToast(`Opening Ch.${q.chapter}: ${q.title}`, "info");
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
    setPendingRoll(null);
    bumpStage();
  }

  function onChoice(option: ChoiceOption) {
    if (!save || !quest || !step || step.type !== "choice" || choiceResolved || pendingRoll) return;
    const questId = quest.id;
    const stepId = step.id;
    const check = skillCheck(save.stats, option.stat, option.dc);
    clearRollTimers();
    setPendingRoll({
      option,
      check,
      face: 1 + Math.floor(Math.random() * 20),
      spinning: true,
      revealed: false,
    });

    rollTimer.current = setInterval(() => {
      setPendingRoll((p) => (p ? { ...p, face: 1 + Math.floor(Math.random() * 20) } : p));
    }, 70);

    const reduced =
      typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const delay = reduced ? 80 : 820;

    revealTimer.current = setTimeout(() => {
      if (rollTimer.current) clearInterval(rollTimer.current);
      rollTimer.current = null;
      setPendingRoll((p) =>
        p
          ? {
              ...p,
              face: check.d20,
              spinning: false,
              revealed: true,
            }
          : p
      );

      const current = saveRef.current;
      if (!current) return;
      const flavor = rollFlavor(check.d20, check.success);
      const outcome = check.success ? option.success : option.fail;
      const before = current;
      let next = applyOutcome(current, outcome);
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
          { questId, stepId, optionId: option.id, success: check.success },
        ],
      };
      persist(next);
      setChoiceResolved(option);
      noteXpDelta(before, next);

      if (flavor === "crit") {
        burstSparks(16, "gold");
        triggerShake("crit");
        pushToast(pick(CRIT_SUCCESS_QUIPS), "crit");
      } else if (flavor === "fail") {
        burstSparks(10, "ember");
        triggerShake("fail");
        pushToast(`${pick(CRIT_FAIL_QUIPS)} ${pick(FAIL_FORWARD_QUIPS)}`, "fail");
      } else if (check.success) {
        burstSparks(6, "gold");
        pushToast(
          `Success — d20 ${check.d20} ${check.mod >= 0 ? "+" : ""}${check.mod} = ${check.total} vs DC ${option.dc}`,
          "good"
        );
      } else {
        pushToast(`Miss vs DC ${option.dc} (rolled ${check.total}). ${pick(FAIL_FORWARD_QUIPS)}`, "warn");
      }
    }, delay);
  }

  function continueAfterChoice() {
    if (!save || !choiceResolved || (pendingRoll && !pendingRoll.revealed)) return;
    setPendingRoll(null);
    advance(save);
  }

  function onChallengeSubmit(ch: ChallengeStep) {
    if (!save || !challengePick || challengeResolved) return;
    const picked = ch.options.find((o) => o.id === challengePick);
    if (!picked) return;
    setChallengeResolved(true);
    const before = save;
    if (picked.correct) {
      const next = {
        ...save,
        xp: save.xp + ch.xp,
        stats: applyStatBump(save.stats, ch.stats),
        inventory: grantItem(save.inventory, ch.itemId),
      };
      persist(next);
      noteXpDelta(before, next, "Correct");
      pushToast("Nailed it — explanation unlocked. Keep that pattern in muscle memory.", "good");
    } else {
      const consolation = Math.max(3, Math.floor(ch.xp / 3));
      const next = { ...save, xp: save.xp + consolation };
      persist(next);
      noteXpDelta(before, next, "Fail-forward");
      pushToast(`Not quite — still +${consolation} XP. ${pick(FAIL_FORWARD_QUIPS)}`, "warn");
    }
  }

  if (phase === "boot") {
    return (
      <div className="downtown-shell code-school-crpg">
        <DowntownSubnav active="code-school" />
        <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
          Loading save…
        </p>
      </div>
    );
  }

  if (phase === "title" || !save) {
    return (
      <div className="downtown-shell code-school-crpg space-y-6">
        <DowntownSubnav active="code-school" />
        <header className="cs-header-band p-6 md:p-10">
          <div className="relative space-y-4 max-w-2xl">
            <p className="cs-moon-badge">Downtown · Lunar Foundry prep · P2S track</p>
            <h1 className="font-serif text-3xl md:text-5xl tracking-tight" style={{ color: "var(--dt-fg)" }}>
              Code School by JP
            </h1>
            <hr className="cs-divider" />
            <p className="text-sm md:text-base leading-relaxed" style={{ color: "var(--dt-muted)" }}>
              A snappy D&amp;D-flavored coding campaign for Justin — social craft, a Bambu Lab P2S, and a path toward
              a Pittsburgh moon-robot shop. Choices roll against Logic, Craft, Charm, Grit, and Debug. Progress saves
              in this browser as <code className="text-[0.8em]">haven-code-school-v1</code>.
            </p>
            <div className="cs-next-action" data-urgent="true">
              <div>
                <p className="text-[0.65rem] uppercase tracking-[0.16em]" style={{ color: "var(--dt-accent)" }}>
                  Next action
                </p>
                <p className="text-sm" style={{ color: "var(--dt-fg)" }}>
                  {hint.detail}
                </p>
              </div>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  className="downtown-chip cs-primary-btn px-4 py-2 text-sm"
                  style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
                  onClick={() => startTransition(() => beginCampaign())}
                >
                  Begin campaign
                </button>
                {hasExistingSave && (
                  <button
                    type="button"
                    className="downtown-chip cs-primary-btn px-4 py-2 text-sm"
                    onClick={() => {
                      const s = loadSave();
                      if (s) {
                        setSave(s);
                        saveRef.current = s;
                        prevXp.current = s.xp;
                        prevLevel.current = levelFromXp(s.xp);
                        setPhase(s.graduated ? "graduated" : "play");
                        pushToast("Continued from local save.", "info");
                      }
                    }}
                  >
                    Continue
                  </button>
                )}
              </div>
            </div>
          </div>
        </header>
        <div className="grid gap-3 md:grid-cols-3">
          {[
            { t: "8 chapters", d: "Markup → TS → git → APIs → P2S bridge → ethical social eng → interview boss." },
            { t: "Fail forward", d: "Missed rolls still teach — and now they joke while they teach." },
            { t: "Personal arc", d: "Hardware strength + people skills → Lunar Foundry readiness." },
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
    const relics = save.inventory
      .map((id) => getItem(id) ?? INVENTORY_CATALOG.find((i) => i.id === id))
      .filter(Boolean);
    return (
      <div className="downtown-shell code-school-crpg space-y-6">
        <DowntownSubnav active="code-school" />
        <div className="cs-floater-layer" aria-hidden>
          {sparks.map((s) => (
            <span
              key={s.id}
              className="cs-spark"
              data-hue={s.hue}
              style={{ left: `${s.x}%`, top: `${s.y}%`, animationDelay: `${s.delay}s` }}
            />
          ))}
        </div>
        <header className="cs-header-band cs-grad-burst cs-diploma p-6 md:p-10 space-y-5">
          <div className="cs-diploma-seal" aria-hidden />
          <p className="cs-moon-badge">Official diploma · Pittsburgh moon track</p>
          <h1 className="font-serif text-3xl md:text-5xl tracking-tight">Code School by JP</h1>
          <p className="text-sm uppercase tracking-[0.22em]" style={{ color: "var(--cs-moon)" }}>
            hereby certifies
          </p>
          <p className="font-serif text-2xl md:text-3xl" style={{ color: "var(--dt-accent)" }}>
            {save.name}
          </p>
          <hr className="cs-divider" />
          <p className="max-w-2xl text-sm leading-relaxed" style={{ color: "var(--dt-muted)" }}>
            as a <span style={{ color: "var(--dt-accent)" }}>{save.title}</span>. You cleared all eight chapters,
            pocketed {save.inventory.length} relics, and earned {save.xp} XP. The P2S still hums under Downtown’s
            sodium glow — Lunar Foundry has a locker with your name on it.
          </p>
          <div className="grid gap-3 sm:grid-cols-3 max-w-2xl pt-1">
            {[
              { k: "Level", v: String(xpProgress(save.xp).level) },
              { k: "Chapters", v: `${campaignProgress(save).done}/${QUESTS.length}` },
              { k: "Relics", v: String(save.inventory.length) },
            ].map((stat) => (
              <div key={stat.k} className="cs-diploma-stat">
                <p className="text-[0.6rem] uppercase tracking-[0.14em]" style={{ color: "var(--dt-muted)" }}>
                  {stat.k}
                </p>
                <p className="font-serif text-xl" style={{ color: "var(--dt-accent)" }}>
                  {stat.v}
                </p>
              </div>
            ))}
          </div>
          {relics.length > 0 && (
            <div className="cs-relic-parade">
              <p className="text-[0.65rem] uppercase tracking-[0.16em] mb-2" style={{ color: "var(--dt-accent)" }}>
                Relic parade
              </p>
              <ul className="flex flex-wrap gap-2">
                {relics.map((item) =>
                  item ? (
                    <li key={item.id} className="cs-relic-chip">
                      {item.name}
                    </li>
                  ) : null
                )}
              </ul>
            </div>
          )}
          <div className="cs-next-action" data-urgent="false">
            <div>
              <p className="text-[0.65rem] uppercase tracking-[0.16em]" style={{ color: "var(--dt-accent)" }}>
                Next action · Celebrate
              </p>
              <p className="text-sm" style={{ color: "var(--dt-fg)" }}>
                Frame this sheet — or roll a fresh apprentice.
              </p>
            </div>
            <div className="flex flex-wrap gap-3">
              <button type="button" className="downtown-chip cs-primary-btn px-4 py-2" onClick={resetCampaign}>
                New run
              </button>
              <button
                type="button"
                className="downtown-chip cs-primary-btn px-4 py-2"
                onClick={() => {
                  setPhase("play");
                  const q = QUESTS[QUESTS.length - 1];
                  persist({ ...save, currentQuestId: q.id, stepIndex: q.steps.length - 1 });
                  bumpStage();
                }}
              >
                Revisit finale
              </button>
            </div>
          </div>
        </header>
      </div>
    );
  }

  return (
    <div className="downtown-shell code-school-crpg space-y-5">
      <DowntownSubnav active="code-school" />

      <div className="cs-floater-layer" aria-hidden>
        {floaters.map((f) => (
          <span key={f.id}>
            {f.kind === "level" && <span className="cs-level-burst-ring" />}
            <span className="cs-floater" data-kind={f.kind}>
              {f.text}
            </span>
          </span>
        ))}
      </div>

      {fanfare && (
        <div className="cs-fanfare" role="dialog" aria-labelledby={toastTitleId}>
          <div className="cs-fanfare-card" data-kind={fanfare.kind}>
            <p className="cs-moon-badge mb-2">
              {fanfare.kind === "grad" ? "Lunar Foundry" : "Chapter cleared"}
            </p>
            <h2 id={toastTitleId} className="font-serif text-2xl md:text-3xl mb-2">
              {fanfare.title}
            </h2>
            <hr className="cs-divider mx-auto" />
            <p className="text-sm mb-5" style={{ color: "var(--dt-muted)" }}>
              {fanfare.subtitle}
            </p>
            <button
              type="button"
              className="downtown-chip cs-primary-btn px-5 py-2 text-sm"
              style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
              onClick={fanfare.onDismiss}
            >
              {fanfare.kind === "grad" ? "Receive diploma" : "Advance"}
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-wrap items-end justify-between gap-3 border-b border-[var(--dt-line)] pb-4">
        <div>
          <p className="cs-moon-badge mb-1">Code School by JP · P2S / Lunar Foundry</p>
          <h1 className="font-serif text-2xl md:text-3xl">{save.name}</h1>
          <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
            {save.title} · Level {progress?.level} · {save.xp} XP
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" className="downtown-chip text-xs cs-primary-btn" onClick={resetCampaign}>
            Reset run
          </button>
        </div>
      </div>

      {campaign && (
        <div className="space-y-2">
          <div
            className="flex flex-wrap justify-between gap-2 text-[0.65rem] uppercase tracking-[0.14em]"
            style={{ color: "var(--dt-muted)" }}
          >
            <span>
              Campaign {campaign.done}/{campaign.total} chapters
            </span>
            <span>{campaign.pct}%</span>
          </div>
          <div className="cs-progress-track">
            <span style={{ width: `${campaign.pct}%` }} />
          </div>
          {quest && (
            <div className="flex flex-wrap justify-between gap-2 text-[0.65rem]" style={{ color: "var(--dt-muted)" }}>
              <span>
                Ch.{quest.chapter} beat {(save.stepIndex ?? 0) + 1}/{quest.steps.length}
              </span>
              <span>{chapterProgress(quest, save.stepIndex ?? 0)}% of chapter</span>
            </div>
          )}
          {quest && (
            <div className="cs-progress-track" style={{ height: "0.3rem", opacity: 0.85 }}>
              <span style={{ width: `${chapterProgress(quest, save.stepIndex ?? 0)}%` }} />
            </div>
          )}
        </div>
      )}

      <div className="cs-next-action" data-urgent={hint.urgent ? "true" : "false"}>
        <div>
          <p className="text-[0.65rem] uppercase tracking-[0.16em]" style={{ color: "var(--dt-accent)" }}>
            Next action · {hint.label}
          </p>
          <p className="text-sm" style={{ color: "var(--dt-fg)" }}>
            {hint.detail}
          </p>
        </div>
      </div>

      {toasts.length > 0 && (
        <div className="cs-toast-stack" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className="cs-toast" data-kind={t.kind}>
              {t.text}
            </div>
          ))}
        </div>
      )}

      <div className="grid gap-4 lg:grid-cols-[16rem_1fr_14rem]">
        <aside className="downtown-panel p-4 space-y-4 order-2 lg:order-1">
          <p className="downtown-section-label">Character sheet</p>
          <div className="space-y-3">
            {(Object.keys(STAT_LABELS) as StatKey[]).map((k) => (
              <StatBar key={k} label={STAT_LABELS[k]} value={save.stats[k]} />
            ))}
          </div>
          {progress && (
            <div className="space-y-1 pt-2 border-t border-[var(--dt-line)]">
              <div
                className="flex justify-between text-[0.65rem] uppercase tracking-[0.12em]"
                style={{ color: "var(--dt-muted)" }}
              >
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
                Empty pack — loot awaits at the P2S bench.
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
          <div className="space-y-2 pt-2 border-t border-[var(--dt-line)]">
            <p className="downtown-section-label">What just happened</p>
            <div className="cs-event-log">
              {log.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--dt-muted)" }}>
                  Rolls, XP, and chapter beats land here.
                </p>
              ) : (
                log.map((e) => (
                  <div key={e.id} className="cs-event-log-item" data-kind={e.kind}>
                    {e.text}
                  </div>
                ))
              )}
            </div>
          </div>
        </aside>

        <section className="downtown-panel p-4 md:p-6 space-y-5 order-1 lg:order-2 min-h-[22rem]">
          {!quest || !step ? (
            <div className="space-y-4 cs-stage-enter" key={stageKey}>
              <h2 className="font-serif text-xl">Quest select</h2>
              <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
                Pick an unlocked chapter to continue the Lunar Foundry arc.
              </p>
              {unlocked.length === 0 ? (
                <div className="cs-parchment space-y-3 p-4">
                  <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
                    No chapters unlocked on this sheet — the P2S bench is cold.
                  </p>
                  <button
                    type="button"
                    className="downtown-chip cs-primary-btn px-4 py-2 text-sm"
                    style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
                    onClick={() => startTransition(() => beginCampaign())}
                  >
                    Begin Chapter 1
                  </button>
                </div>
              ) : (
                <div className="space-y-2">
                  {unlocked.map((q) => {
                    const done = save.completedQuestIds.includes(q.id);
                    return (
                      <button
                        key={q.id}
                        type="button"
                        className="cs-action-row w-full text-left p-3"
                        onClick={() => startQuest(q)}
                      >
                        <span
                          className="text-[0.65rem] uppercase tracking-[0.14em]"
                          style={{ color: "var(--dt-accent)" }}
                        >
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
              )}
            </div>
          ) : (
            <div className="space-y-5 cs-stage-enter" key={`${quest.id}-${save.stepIndex}-${stageKey}`}>
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
                  {step.title && (
                    <h3 className="text-sm uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>
                      {step.title}
                    </h3>
                  )}
                  <div className="cs-parchment">
                    <RichText text={step.body} />
                  </div>
                  <button
                    type="button"
                    className="downtown-chip cs-primary-btn px-4 py-2 text-sm"
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
                  pendingRoll={pendingRoll}
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
                        className="cs-action-row flex gap-2 items-start p-3 text-sm cursor-pointer"
                        style={{
                          borderColor: challengePick === o.id ? "var(--dt-accent)" : undefined,
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
                      className="downtown-chip cs-primary-btn px-4 py-2 text-sm"
                      style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
                      disabled={!challengePick}
                      onClick={() => onChallengeSubmit(step)}
                    >
                      Submit answer
                    </button>
                  ) : (
                    <div className="space-y-3">
                      <div className="cs-parchment">
                        <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
                          {step.explanation}
                        </p>
                      </div>
                      <button
                        type="button"
                        className="downtown-chip cs-primary-btn px-4 py-2 text-sm"
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
                  <div className="cs-parchment">
                    <RichText text={step.body} />
                  </div>
                  <div
                    className="border border-[var(--dt-line)] p-4"
                    style={{ background: "rgba(196,163,90,0.08)" }}
                  >
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
                    className="downtown-chip cs-primary-btn px-4 py-2 text-sm"
                    style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
                    onClick={() => {
                      const before = save;
                      const next = {
                        ...save,
                        xp: save.xp + (step.xp ?? 0),
                        inventory: grantItem(save.inventory, step.itemId),
                      };
                      noteXpDelta(before, next, "Loot");
                      pushToast(`Pocketed ${getItem(step.itemId)?.name ?? "relic"}.`, "good");
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
                  <div className="cs-parchment">
                    <RichText text={step.body} />
                  </div>
                  <button
                    type="button"
                    className="downtown-chip cs-primary-btn px-4 py-2 text-sm"
                    style={{ borderColor: "var(--dt-good)", color: "var(--dt-good)" }}
                    onClick={() => advance(save)}
                  >
                    Claim graduation
                  </button>
                </div>
              )}
            </div>
          )}
        </section>

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
                    color: active
                      ? "var(--dt-accent)"
                      : done
                        ? "var(--dt-good)"
                        : open
                          ? "var(--dt-fg)"
                          : "var(--dt-muted)",
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
  pendingRoll,
  onPick,
  onContinue,
}: {
  step: ChoiceStep;
  save: PlayerSave;
  resolved: ChoiceOption | null;
  pendingRoll: PendingRoll | null;
  onPick: (o: ChoiceOption) => void;
  onContinue: () => void;
}) {
  const flavor = pendingRoll?.revealed
    ? rollFlavor(pendingRoll.check.d20, pendingRoll.check.success)
    : null;

  const banner =
    flavor === "crit"
      ? "Critical success"
      : flavor === "fail"
        ? "Critical fumble"
        : flavor === "success"
          ? "Success"
          : flavor === "miss"
            ? "Fail-forward"
            : "Rolling…";

  return (
    <div className="space-y-4">
      <h3 className="text-sm uppercase tracking-[0.12em]" style={{ color: "var(--dt-accent)" }}>
        {step.title}
      </h3>
      <p className="text-sm" style={{ color: "var(--dt-fg)" }}>
        {step.prompt}
      </p>

      {pendingRoll && (
        <div className="cs-roll-stage">
          <div
            className="cs-die"
            data-spinning={pendingRoll.spinning ? "true" : "false"}
            data-result={pendingRoll.revealed ? flavor ?? undefined : undefined}
          >
            {pendingRoll.face}
          </div>
          <p className="cs-roll-banner" data-result={pendingRoll.revealed ? flavor ?? undefined : undefined}>
            {banner}
          </p>
          {pendingRoll.revealed && (
            <p className="text-xs font-mono" style={{ color: "var(--dt-muted)" }}>
              d20 {pendingRoll.check.d20} {pendingRoll.check.mod >= 0 ? "+" : ""}
              {pendingRoll.check.mod} = {pendingRoll.check.total} vs DC {pendingRoll.option.dc}
            </p>
          )}
        </div>
      )}

      {!resolved && !pendingRoll ? (
        <div className="space-y-2">
          {step.options.map((o) => {
            const mod = Math.floor((save.stats[o.stat] - 10) / 2);
            return (
              <button
                key={o.id}
                type="button"
                className="cs-action-row w-full text-left p-3 space-y-1"
                onClick={() => onPick(o)}
              >
                <span className="block text-sm font-medium">{o.label}</span>
                <span className="block text-xs" style={{ color: "var(--dt-muted)" }}>
                  {o.approach}
                </span>
                <span
                  className="block text-[0.65rem] uppercase tracking-[0.12em]"
                  style={{ color: "var(--dt-accent)" }}
                >
                  Check {STAT_LABELS[o.stat]} DC {o.dc} (mod {mod >= 0 ? `+${mod}` : mod})
                </span>
              </button>
            );
          })}
        </div>
      ) : resolved && pendingRoll?.revealed ? (
        <div className="space-y-3">
          <div className="cs-parchment">
            <RichText text={save.lastRoll?.success ? resolved.success.text : resolved.fail.text} />
          </div>
          <button
            type="button"
            className="downtown-chip cs-primary-btn px-4 py-2 text-sm"
            style={{ borderColor: "var(--dt-accent)", color: "var(--dt-accent)" }}
            onClick={onContinue}
          >
            Continue
          </button>
        </div>
      ) : null}
    </div>
  );
}
