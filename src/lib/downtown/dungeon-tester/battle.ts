/**
 * DungeonTester battle entrypoints — thin wrappers over simple-battle.
 * Neverworld BattleOverlay / performBattleAction are not used here.
 */

import {
  dismissSimpleBattle,
  startSimpleBattle,
} from "./simple-battle";
import type { DtWorldSave } from "./types";

/** Frame-cadence ambush — chapter-scaled foes, player party first. */
export function startDtRandomBattle(
  world: DtWorldSave,
  rng: () => number = Math.random
): { world: DtWorldSave; message: string } {
  return startSimpleBattle(world, { rng });
}

/** Force ambush from Camp. */
export function startDtCampAmbush(
  world: DtWorldSave,
  rng: () => number = Math.random
): { world: DtWorldSave; message: string } {
  return startSimpleBattle(world, { rng });
}

/** Scripted frame fight / Force ambush vs a known foe id. */
export function startDtBattleVs(
  world: DtWorldSave,
  foeId: string,
  rng: () => number = Math.random
): { world: DtWorldSave; message: string } {
  return startSimpleBattle(world, { foeId, rng });
}

export function dismissDtBattle(world: DtWorldSave): DtWorldSave {
  return dismissSimpleBattle(world);
}
