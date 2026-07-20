/**
 * Frame advance + frame-based random encounters (10–20 frames).
 */

import { getFrame } from "./story";
import {
  startDtBattleVs,
  startDtRandomBattle,
} from "./battle";
import { dtChapterNumber } from "./maps";
import type { DtWorldSave } from "./types";

function isReplay(world: DtWorldSave): boolean {
  return !!world.mapReplay;
}

function isSideQuest(world: DtWorldSave): boolean {
  return !!world.sideQuest;
}

/** Atlas replay or side-quest pause — neither advances live march furthest. */
function isPausedMarch(world: DtWorldSave): boolean {
  return isReplay(world) || isSideQuest(world);
}

/**
 * Flags applied when landing on a frame / choice.
 * - Live march: all story flags
 * - Atlas replay: none
 * - Side quest: only `sq-*` (and keep `fought:*` for scripted fights)
 */
function allowedStoryFlags(
  world: DtWorldSave,
  flags: string[] | undefined
): string[] {
  if (!flags?.length) return [];
  if (isReplay(world)) return [];
  if (isSideQuest(world)) {
    return flags.filter((f) => f.startsWith("sq-") || f.startsWith("fought:"));
  }
  return flags;
}

function withFurthest(world: DtWorldSave): DtWorldSave {
  if (isPausedMarch(world)) return world;
  const prevCh = dtChapterNumber(world.furthestChapterId);
  const nextCh = dtChapterNumber(world.chapterId);
  if (nextCh < prevCh) return world;
  if (nextCh === prevCh && world.campaignNodeId === world.furthestCampaignNodeId) {
    return world;
  }
  // Same chapter: always accept newer node id as furthest (spine ids sort roughly).
  if (nextCh > prevCh) {
    return {
      ...world,
      furthestChapterId: world.chapterId,
      furthestCampaignNodeId: world.campaignNodeId,
    };
  }
  return {
    ...world,
    furthestCampaignNodeId: world.campaignNodeId,
  };
}

export function maybeTriggerEncounter(
  world: DtWorldSave,
  rng: () => number = Math.random
): { world: DtWorldSave; triggered: boolean; message?: string } {
  // Hold cadence while an overlay (active or summary) is still open.
  if (world.battle) {
    return { world, triggered: false };
  }
  if (world.endingId) return { world, triggered: false };
  // Paused walks don't burn live cadence — use Camp force-ambush / scripted fights.
  if (isPausedMarch(world)) return { world, triggered: false };
  // Cadence: nextEncounterAtFrame = framesAdvanced + roll(10..20) after each fight.
  // framesSinceEncounter increments on each counted frame advance and resets on battle start.
  const due = world.framesAdvanced >= world.nextEncounterAtFrame;
  if (!due) return { world, triggered: false };

  const sealed = Object.values(world.characters).some((c) => c.created);
  if (!sealed) return { world, triggered: false };

  const started = startDtRandomBattle(world, rng);
  return {
    world: started.world,
    triggered: true,
    message: started.message,
  };
}

/**
 * Advance to a target frame id. Optionally start a scripted battle after land.
 * Then roll a random encounter if the frame cadence is due.
 */
export function goToFrame(
  world: DtWorldSave,
  nextId: string,
  opts?: { flagsAdd?: string[]; countAdvance?: boolean }
): { world: DtWorldSave; message?: string } {
  if (world.battle) {
    return { world, message: "Finish the battle first." };
  }

  const frame = getFrame(nextId);
  if (!frame) return { world, message: `Missing frame ${nextId}.` };

  const paused = isPausedMarch(world);
  const countAdvance = !paused && opts?.countAdvance !== false;
  const framesAdvanced = countAdvance
    ? world.framesAdvanced + 1
    : world.framesAdvanced;
  const framesSinceEncounter = countAdvance
    ? world.framesSinceEncounter + 1
    : world.framesSinceEncounter;

  const storyFlags = allowedStoryFlags(world, [
    ...(opts?.flagsAdd ?? []),
    ...(frame.flagsAdd ?? []),
  ]);

  let next: DtWorldSave = {
    ...world,
    campaignNodeId: frame.id,
    chapterId: frame.chapterId,
    framesAdvanced,
    framesSinceEncounter,
    partyFlags: Array.from(
      new Set([...(world.partyFlags ?? []), ...storyFlags])
    ),
    // Replay / side quest never locks the live campaign ending.
    endingId: paused ? world.endingId : frame.endingId ?? world.endingId,
    updatedAt: new Date().toISOString(),
    log: [
      `${isReplay(world) ? "↻" : isSideQuest(world) ? "◇" : "→"} ${frame.title ?? frame.id}`,
      ...world.log,
    ].slice(0, 80),
  };

  if (!paused) {
    next = withFurthest(next);
  }

  // Scripted fight on this frame (once per visit unless already fought flag).
  // In replay, allow re-fight by using a soft session flag only when not already fought.
  if (frame.battleFoeId && !next.partyFlags.includes(`fought:${frame.id}`)) {
    const fight = startDtBattleVs(next, frame.battleFoeId);
    if (fight.world.battle?.status === "active") {
      next = {
        ...fight.world,
        partyFlags: [...fight.world.partyFlags, `fought:${frame.id}`],
      };
      return { world: next, message: fight.message };
    }
  }

  const enc = maybeTriggerEncounter(next);
  return { world: enc.world, message: enc.message };
}

export function continueFrame(
  world: DtWorldSave
): { world: DtWorldSave; message?: string } {
  const cur = getFrame(world.campaignNodeId);
  if (!cur) return { world, message: "No current frame." };
  if (cur.choices?.length) {
    return { world, message: "Choose a path." };
  }
  if (cur.endingId && !isPausedMarch(world)) {
    return {
      world: withFurthest({ ...world, endingId: cur.endingId }),
      message: "Chapter beat resolved.",
    };
  }
  if (cur.endingId && isReplay(world)) {
    return { world, message: "Replay end — return to march or pick another region." };
  }
  if (cur.endingId && isSideQuest(world)) {
    return { world, message: "Side job done — return to claim your reward." };
  }
  if (!cur.next) {
    if (isSideQuest(world)) {
      return { world, message: "Side job done — return to claim your reward." };
    }
    if (isReplay(world)) {
      return { world, message: "Replay end — return to march or pick another region." };
    }
    return { world, message: "End of authored spine." };
  }
  return goToFrame(world, cur.next);
}

export function chooseFrame(
  world: DtWorldSave,
  choiceId: string,
  opts?: { checkRoll?: number }
): { world: DtWorldSave; message?: string } {
  const cur = getFrame(world.campaignNodeId);
  if (!cur?.choices?.length) return { world, message: "No choices here." };
  const choice = cur.choices.find((c) => c.id === choiceId);
  if (!choice) return { world, message: "Unknown choice." };

  const replay = isReplay(world);
  const sideQuest = isSideQuest(world);

  // Optional D&D-style DC: pass roll (1–20 + mod) from UI, else treat as success branch.
  if (choice.stat && typeof choice.dc === "number" && typeof opts?.checkRoll === "number") {
    const passed = opts.checkRoll >= choice.dc;
    const next = passed ? choice.next : (choice.nextFail ?? choice.next);
    const rawFlags = passed
      ? choice.flagsAdd
      : (choice.failFlagsAdd ?? choice.flagsAdd);
    const flagsAdd =
      replay || sideQuest
        ? allowedStoryFlags(world, rawFlags)
        : (rawFlags ?? []);
    let nextWorld = goToFrame(world, next, {
      flagsAdd: flagsAdd.length ? flagsAdd : undefined,
    });
    if (!passed && choice.failDamage && nextWorld.world.characters) {
      // Soft flavor only — shell UI may mirror damage into the active hero later.
      nextWorld = {
        ...nextWorld,
        message:
          (nextWorld.message ? `${nextWorld.message} ` : "") +
          `Check failed (${choice.stat.toUpperCase()} DC ${choice.dc}).`,
      };
    } else if (passed) {
      nextWorld = {
        ...nextWorld,
        message:
          (nextWorld.message ? `${nextWorld.message} ` : "") +
          `Check succeeded (${choice.stat.toUpperCase()} DC ${choice.dc}).`,
      };
    }
    return nextWorld;
  }

  const choiceFlags = replay || sideQuest
    ? allowedStoryFlags(world, choice.flagsAdd)
    : choice.flagsAdd;
  return goToFrame(world, choice.next, {
    flagsAdd: choiceFlags?.length ? choiceFlags : undefined,
  });
}

export function addPlaytime(world: DtWorldSave, deltaMs: number): DtWorldSave {
  if (deltaMs <= 0) return world;
  return {
    ...world,
    storyPlayMs: (world.storyPlayMs ?? 0) + deltaMs,
  };
}

export function formatPlaytimeHud(storyPlayMs: number, targetHours: number): string {
  const totalMin = Math.floor(Math.max(0, storyPlayMs) / 60_000);
  const h = Math.floor(totalMin / 60);
  const m = totalMin % 60;
  return `${h}h ${m}m of ~${targetHours}h`;
}
