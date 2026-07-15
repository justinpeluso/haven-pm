/**
 * DungeonTester battle entrypoints — DT-only crude fixed-position combat.
 * Does NOT use Neverworld BattleOverlay / party-chronicle performBattleAction.
 */

import {
  dismissSimpleBattle,
  performSimpleBattleAction,
  startSimpleBattle,
  type SimpleBattleActionId,
} from "./simple-battle";
import type { DtWorldSave, PlayerSlot } from "./types";

export type { SimpleBattleActionId };
export {
  dismissSimpleBattle,
  performSimpleBattleAction,
  startSimpleBattle,
  clearSimpleBattleFx,
  isSimpleBattleActive,
  SIMPLE_BATTLE_ACTIONS,
  type SimpleBattleState,
} from "./simple-battle";

/** Frame-cadence ambush — 1–3 DT foes, player party first. */
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

export function applyDtBattleAction(
  world: DtWorldSave,
  _slot: PlayerSlot,
  action: SimpleBattleActionId,
  opts?: { heroId?: string; targetId?: string }
): { world: DtWorldSave; message: string } {
  const heroId =
    opts?.heroId ??
    world.battle?.focusHeroId ??
    world.battle?.units.find((u) => u.side === "hero" && u.actionsLeft > 0 && u.hp > 0)?.id;
  if (!heroId) return { world, message: "No hero ready." };
  return performSimpleBattleAction(world, heroId, action, opts?.targetId);
}

export function dismissDtBattle(world: DtWorldSave): DtWorldSave {
  return dismissSimpleBattle(world);
}
