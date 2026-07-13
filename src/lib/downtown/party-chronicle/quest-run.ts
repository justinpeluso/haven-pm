/**
 * Playable side-quest runs — start screen, stepped trail, battles, overall timer.
 */

import { mergeAlignment } from "./alignment";
import { startBattleVs, startRandomBattle } from "./battle";
import { getBoss } from "./bestiary";
import { getSideQuest, type SideQuestDef } from "./side-quests";
import { levelFromXp, skillPointsForLevelGain } from "./progression";
import type { CharacterSave, PartyWorldSave, PlayerSlot } from "./types";
import { PLAYER_SLOT_ORDER } from "./types";

function actIdForChapter(chapterId: string): string {
  const m = chapterId.match(/^ch(\d+)/);
  return m ? `act-${Number(m[1])}` : "act-1";
}

export type QuestStepKind = "brief" | "travel" | "battle" | "resolve";

export type ActiveQuestStep = {
  id: string;
  kind: QuestStepKind;
  label: string;
  blurb: string;
  done: boolean;
  /** Optional forced foe for battle steps. */
  foeId?: string;
  battleStarted?: boolean;
  battleWon?: boolean;
};

export type ActiveSideQuest = {
  questId: string;
  title: string;
  summary: string;
  kind: string;
  artId?: string;
  sceneId?: string;
  startedAt: string;
  endsAt: string;
  estimatedMinutes: number;
  stepIndex: number;
  steps: ActiveQuestStep[];
  status: "active" | "success" | "failed_timeout";
  starterSlot: PlayerSlot;
};

function nextPlayableSlot(world: PartyWorldSave, current: PlayerSlot): PlayerSlot {
  const sealed = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created);
  if (sealed.length === 0) {
    const i = PLAYER_SLOT_ORDER.indexOf(current);
    return PLAYER_SLOT_ORDER[(i + 1) % PLAYER_SLOT_ORDER.length]!;
  }
  const from = sealed.indexOf(current);
  if (from < 0) return sealed[0]!;
  return sealed[(from + 1) % sealed.length]!;
}

function advanceTurn(world: PartyWorldSave): PartyWorldSave {
  const next = nextPlayableSlot(world, world.activeSlot);
  return {
    ...world,
    activeSlot: next,
    turnIndex: world.turnIndex + 1,
    log: [`Turn ${world.turnIndex + 1}: ${next}'s move.`, ...world.log].slice(0, 80),
  };
}

function applyXp(char: CharacterSave, xp: number): CharacterSave {
  const before = char.level;
  const newXp = char.xp + xp;
  const after = levelFromXp(newXp);
  const pts = skillPointsForLevelGain(before, after);
  const hpBump = Math.max(0, after - before) * 2;
  return {
    ...char,
    xp: newXp,
    level: after,
    skillPoints: char.skillPoints + pts,
    maxHp: char.maxHp + hpBump,
    hp: Math.min(char.maxHp + hpBump, char.hp + hpBump),
  };
}

function grantLoot(char: CharacterSave, lootIds: string[] | undefined): CharacterSave {
  if (!lootIds?.length) return char;
  const inventory = [...char.inventory];
  for (const id of lootIds) {
    if (!inventory.includes(id)) inventory.push(id);
  }
  return { ...char, inventory };
}

function bossIdFromQuest(quest: SideQuestDef): string | undefined {
  const flag = quest.rewards.flagsAdd.find((f) => f.startsWith("side-boss-felled:"));
  if (flag) return flag.slice("side-boss-felled:".length);
  const fromSummary = quest.summary.match(/\((side-[a-z0-9-]+)\)/i);
  return fromSummary?.[1];
}

function buildSteps(quest: SideQuestDef): ActiveQuestStep[] {
  const foeId = bossIdFromQuest(quest);
  const labels = quest.steps.length
    ? quest.steps
    : ["Brief at camp", "Take the trail", "Face the danger", "Return with the tale"];

  return labels.map((label, i, arr) => {
    const isLast = i === arr.length - 1;
    const isFirst = i === 0;
    const looksBattle =
      /defeat|fight|ambush|battle|strike|face the|challenge/i.test(label) ||
      (Boolean(foeId) && i === Math.max(1, arr.length - 2));
    let kind: QuestStepKind = "travel";
    if (isFirst) kind = "brief";
    else if (looksBattle && !isLast) kind = "battle";
    else if (isLast) kind = "resolve";

    const blurb =
      kind === "brief"
        ? `${quest.summary} The clock is live — finish before the trail goes cold.`
        : kind === "battle"
          ? foeId && getBoss(foeId)
            ? `${getBoss(foeId)!.name} waits ahead. Battle clocks: 30s idle / 10 min hard cap.`
            : "Something hostile bars the path. Battle clocks: 30s idle / 10 min hard cap."
          : kind === "resolve"
            ? "Return to camp, claim the ledger, and seal the rewards."
            : label;

    return {
      id: `${quest.id}-step-${i}`,
      kind,
      label,
      blurb,
      done: false,
      foeId: kind === "battle" ? foeId : undefined,
    };
  });
}

export function questRemainingMs(quest: ActiveSideQuest, nowMs = Date.now()): number {
  const ends = Date.parse(quest.endsAt) || nowMs;
  return Math.max(0, ends - nowMs);
}

export function formatQuestClock(ms: number): string {
  const totalSec = Math.ceil(ms / 1000);
  const m = Math.floor(totalSec / 60);
  const s = totalSec % 60;
  return `${m}:${String(s).padStart(2, "0")}`;
}

/** Begin a playable run — does NOT grant rewards yet. */
export function startSideQuest(
  world: PartyWorldSave,
  slot: PlayerSlot,
  questId: string,
  opts?: { isDm?: boolean }
): { world: PartyWorldSave; message: string } {
  // Match UI canAct: DM may start while another seat holds the turn.
  if (world.activeSlot !== slot && !opts?.isDm) {
    return { world, message: "Not your turn." };
  }
  if (world.endingId) return { world, message: "Chronicle already closed." };
  if (world.battle?.status === "active") {
    return { world, message: "Finish the battle first." };
  }
  if (world.activeSideQuest?.status === "active") {
    return { world, message: "Already on a side quest — finish or abandon it." };
  }
  const quest = getSideQuest(questId);
  if (!quest) return { world, message: "Unknown side quest." };
  const done = world.completedSideQuests ?? [];
  if (done.includes(questId)) return { world, message: "Already completed." };

  const actOk = quest.actId === actIdForChapter(world.chapterId);
  const chOk = !quest.chapterId || quest.chapterId === world.chapterId;
  if (!actOk && !chOk) return { world, message: "That quest is for another act." };

  const startedAt = new Date().toISOString();
  const minutes = Math.max(8, quest.estimatedMinutes || 20);
  const endsAt = new Date(Date.now() + minutes * 60_000).toISOString();
  const active: ActiveSideQuest = {
    questId: quest.id,
    title: quest.title,
    summary: quest.summary,
    kind: quest.kind,
    artId: quest.artId,
    sceneId: quest.sceneId,
    startedAt,
    endsAt,
    estimatedMinutes: minutes,
    stepIndex: 0,
    steps: buildSteps(quest),
    status: "active",
    starterSlot: slot,
  };

  return {
    world: {
      ...world,
      // Clear victory/defeat summaries so the quest overlay isn't buried under BattleOverlay.
      battle: null,
      activeSideQuest: active,
      log: [
        `Side quest begun: ${quest.title} (${minutes}m on the clock).`,
        ...world.log,
      ].slice(0, 80),
    },
    message: `Started “${quest.title}” — ${minutes} minutes on the trail clock.`,
  };
}

function failQuestTimeout(world: PartyWorldSave): PartyWorldSave {
  const q = world.activeSideQuest;
  if (!q) return world;
  return {
    ...world,
    activeSideQuest: { ...q, status: "failed_timeout" },
    battle: world.battle?.status === "active" ? world.battle : world.battle,
    log: [
      `Side quest failed: ${q.title} — the trail clock ran out.`,
      ...world.log,
    ].slice(0, 80),
  };
}

export function abandonSideQuest(
  world: PartyWorldSave,
  slot: PlayerSlot,
  opts?: { isDm?: boolean }
): { world: PartyWorldSave; message: string } {
  if (world.activeSlot !== slot && !opts?.isDm) {
    return { world, message: "Not your turn." };
  }
  const q = world.activeSideQuest;
  if (!q || q.status !== "active") return { world, message: "No active side quest." };
  if (world.battle?.status === "active") {
    return { world, message: "Finish or lose the battle before abandoning." };
  }
  return {
    world: {
      ...world,
      activeSideQuest: null,
      log: [`Abandoned side quest: ${q.title}.`, ...world.log].slice(0, 80),
    },
    message: `Abandoned “${q.title}”.`,
  };
}

function markStepDone(quest: ActiveSideQuest, index: number): ActiveSideQuest {
  const steps = quest.steps.map((s, i) => (i === index ? { ...s, done: true } : s));
  return { ...quest, steps };
}

function grantQuestRewards(
  world: PartyWorldSave,
  slot: PlayerSlot,
  quest: SideQuestDef
): PartyWorldSave {
  let char = applyXp(world.characters[slot], quest.rewards.xp);
  char = { ...char, gold: char.gold + quest.rewards.gold };
  char = grantLoot(char, quest.rewards.itemIds);
  if (quest.kind === "hound") {
    char = { ...char, dog: { ...char.dog, bond: Math.min(100, char.dog.bond + 8) } };
  }
  const partyFlags = [...world.partyFlags];
  for (const f of quest.rewards.flagsAdd) {
    if (!partyFlags.includes(f)) partyFlags.push(f);
  }
  const done = world.completedSideQuests ?? [];
  return advanceTurn({
    ...world,
    characters: { ...world.characters, [slot]: char },
    completedSideQuests: done.includes(quest.id) ? done : [...done, quest.id],
    partyFlags,
    alignment: mergeAlignment(world.alignment, quest.rewards.alignment),
    activeSideQuest: null,
    log: [
      `Side quest complete: ${quest.title} (+${quest.rewards.xp} XP).`,
      ...world.log,
    ].slice(0, 80),
  });
}

/** Continue / resolve the current quest step. */
export function advanceSideQuest(
  world: PartyWorldSave,
  slot: PlayerSlot,
  opts?: { isDm?: boolean }
): { world: PartyWorldSave; message: string } {
  if (world.activeSlot !== slot && !opts?.isDm) {
    return { world, message: "Not your turn." };
  }
  const activeQuest = world.activeSideQuest;
  if (!activeQuest || activeQuest.status !== "active") {
    return { world, message: "No active side quest." };
  }
  // Narrowed copy: `let` keeps ActiveSideQuest so map callbacks don't lose null-checks.
  let q: ActiveSideQuest = activeQuest;

  if (questRemainingMs(q) <= 0) {
    const failed = failQuestTimeout(world);
    // Keep failed_timeout on the save so SideQuestOverlay can show the fail screen.
    return {
      world: failed,
      message: `Time’s up — “${q.title}” failed.`,
    };
  }

  if (world.battle?.status === "active") {
    return { world, message: "Finish the battle first (30s idle / 10 min cap still apply)." };
  }

  const step = q.steps[q.stepIndex];
  if (!step) return { world, message: "Quest step missing." };

  // Battle step: launch fight once, then require a win before continuing.
  if (step.kind === "battle") {
    if (!step.battleWon) {
      if (world.battle?.status === "victory") {
        // Just won — mark and proceed below
        q = {
          ...q,
          steps: q.steps.map((s, i) =>
            i === q.stepIndex ? { ...s, battleWon: true, battleStarted: true, done: true } : s
          ),
        };
      } else if (!step.battleStarted || world.battle == null) {
        const started = step.foeId
          ? startBattleVs(world, step.foeId)
          : startRandomBattle(world);
        if (!started.world.battle) {
          return { world: started.world, message: started.message };
        }
        const patched: ActiveSideQuest = {
          ...q,
          steps: q.steps.map((s, i) =>
            i === q.stepIndex ? { ...s, battleStarted: true } : s
          ),
        };
        return {
          world: {
            ...started.world,
            activeSideQuest: patched,
            log: [
              `Quest battle: ${started.world.battle.enemy.name} (${q.title}).`,
              ...started.world.log,
            ].slice(0, 80),
          },
          message: `${started.message} Quest clock still running.`,
        };
      } else if (world.battle?.status === "defeat") {
        return {
          world,
          message: "You fell — dismiss the defeat screen, then fight again or abandon.",
        };
      } else {
        return { world, message: "Win the quest battle before continuing." };
      }
    }
  }

  q = markStepDone(q, q.stepIndex);
  const nextIndex = q.stepIndex + 1;

  if (nextIndex >= q.steps.length || step.kind === "resolve") {
    const def = getSideQuest(q.questId);
    if (!def) {
      return {
        world: { ...world, activeSideQuest: null },
        message: "Quest data missing — cleared run.",
      };
    }
    const rewarded = grantQuestRewards(
      {
        ...world,
        activeSideQuest: q,
        // Clear finished battle so Camp dig/chest aren't stranded after the last step
        battle:
          world.battle?.status === "victory" || world.battle?.status === "defeat"
            ? null
            : world.battle,
      },
      slot,
      def
    );
    return {
      world: rewarded,
      message: `Side quest complete: ${def.title} (+${def.rewards.xp} XP).`,
    };
  }

  const next: ActiveSideQuest = { ...q, stepIndex: nextIndex };
  return {
    world: {
      ...world,
      activeSideQuest: next,
      // Clear finished battle summary so quest UI is primary again
      battle: world.battle?.status === "victory" || world.battle?.status === "defeat" ? null : world.battle,
      log: [`Quest step: ${next.steps[nextIndex]?.label ?? "…"}`, ...world.log].slice(0, 80),
    },
    message: next.steps[nextIndex]?.label ?? "Next step.",
  };
}

/** After a battle ends in victory, mark the quest battle step won. */
export function noteQuestBattleVictory(world: PartyWorldSave): PartyWorldSave {
  const q = world.activeSideQuest;
  if (!q || q.status !== "active") return world;
  const step = q.steps[q.stepIndex];
  if (!step || step.kind !== "battle") return world;
  return {
    ...world,
    activeSideQuest: {
      ...q,
      steps: q.steps.map((s, i) =>
        i === q.stepIndex ? { ...s, battleWon: true, battleStarted: true } : s
      ),
    },
  };
}

/** DM clock: fail quest when overall timer expires. */
export function tickSideQuestTimer(
  world: PartyWorldSave,
  nowMs = Date.now()
): { world: PartyWorldSave; message?: string } {
  const q = world.activeSideQuest;
  if (!q || q.status !== "active") return { world };
  if (questRemainingMs(q, nowMs) > 0) return { world };
  const failed = failQuestTimeout(world);
  // Keep failed_timeout so the overlay can dismiss — do not null immediately.
  return {
    world: failed,
    message: `Trail clock expired — “${q.title}” failed.`,
  };
}

export function dismissFailedQuest(world: PartyWorldSave): PartyWorldSave {
  if (!world.activeSideQuest || world.activeSideQuest.status === "active") return world;
  return { ...world, activeSideQuest: null };
}
