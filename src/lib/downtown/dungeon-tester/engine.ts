/**
 * Frame advance + frame-based random encounters (10–20 frames).
 */

import { getFrame } from "./story";
import {
  startDtBattleVs,
  startDtRandomBattle,
} from "./battle";
import { rollNextEncounterAtFrame } from "./persist";
import type { DtWorldSave } from "./types";

export function maybeTriggerEncounter(
  world: DtWorldSave,
  rng: () => number = Math.random
): { world: DtWorldSave; triggered: boolean; message?: string } {
  if (world.battle?.status === "active") {
    return { world, triggered: false };
  }
  if (world.endingId) return { world, triggered: false };
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
  if (world.battle?.status === "active") {
    return { world, message: "Finish the battle first." };
  }

  const frame = getFrame(nextId);
  if (!frame) return { world, message: `Missing frame ${nextId}.` };

  const countAdvance = opts?.countAdvance !== false;
  const framesAdvanced = countAdvance
    ? world.framesAdvanced + 1
    : world.framesAdvanced;
  const framesSinceEncounter = countAdvance
    ? world.framesSinceEncounter + 1
    : world.framesSinceEncounter;

  let next: DtWorldSave = {
    ...world,
    campaignNodeId: frame.id,
    chapterId: frame.chapterId,
    framesAdvanced,
    framesSinceEncounter,
    partyFlags: Array.from(
      new Set([
        ...(world.partyFlags ?? []),
        ...(opts?.flagsAdd ?? []),
        ...(frame.flagsAdd ?? []),
      ])
    ),
    endingId: frame.endingId ?? world.endingId,
    updatedAt: new Date().toISOString(),
    log: [`→ ${frame.title ?? frame.id}`, ...world.log].slice(0, 80),
  };

  // Scripted fight on this frame (once per visit unless already fought flag).
  if (frame.battleFoeId && !next.partyFlags.includes(`fought:${frame.id}`)) {
    const fight = startDtBattleVs(next, frame.battleFoeId);
    next = {
      ...fight.world,
      partyFlags: [...fight.world.partyFlags, `fought:${frame.id}`],
    };
    return { world: next, message: fight.message };
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
  if (cur.endingId) {
    return {
      world: { ...world, endingId: cur.endingId },
      message: "Chapter beat resolved.",
    };
  }
  if (!cur.next) return { world, message: "End of authored spine." };
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

  // Optional D&D-style DC: pass roll (1–20 + mod) from UI, else treat as success branch.
  if (choice.stat && typeof choice.dc === "number" && typeof opts?.checkRoll === "number") {
    const passed = opts.checkRoll >= choice.dc;
    const next = passed ? choice.next : (choice.nextFail ?? choice.next);
    const flagsAdd = passed ? choice.flagsAdd : (choice.failFlagsAdd ?? choice.flagsAdd);
    let nextWorld = goToFrame(world, next, { flagsAdd });
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

  return goToFrame(world, choice.next, { flagsAdd: choice.flagsAdd });
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
