/**
 * DungeonTester battle helpers — always clockMode: "off".
 * Prefers DT encounter decks / creatures; resolves via registered external bestiary.
 */

import {
  dismissBattleSummary,
  performBattleAction,
  startBattleVs,
  type BattleActionOpts,
} from "@/lib/downtown/party-chronicle/battle";
import type { BattleActionId, PlayerSlot } from "@/lib/downtown/party-chronicle/types";
import { getDtBoss, getDtCreature, rollDtRandomFoe } from "./bestiary";
import { rollDtEncounterForLevel } from "./encounters";
import { asPartyWorld, fromPartyWorld, type DtWorldSave } from "./types";
import { rollNextEncounterAtFrame } from "./persist";

const CLOCK_OFF = { clockMode: "off" as const };

function partyLevel(world: DtWorldSave): number {
  const levels = Object.values(world.characters)
    .filter((c) => c.created)
    .map((c) => c.level ?? 1);
  if (!levels.length) return 1;
  return Math.max(1, Math.round(levels.reduce((a, b) => a + b, 0) / levels.length));
}

/** Deck entry ids look like `act-1-whip-hand-thug` or `act-1-boss-coffle-master`. */
function resolveDtFoeId(entryId: string, level: number, rng: () => number): string {
  const bare = entryId.replace(/^act-\d+-/, "");
  if (getDtCreature(bare) || getDtBoss(bare)) return bare;
  if (getDtCreature(entryId) || getDtBoss(entryId)) return entryId;
  return rollDtRandomFoe(level, rng).id;
}

export function startDtRandomBattle(
  world: DtWorldSave,
  rng: () => number = Math.random
): { world: DtWorldSave; message: string } {
  const lvl = partyLevel(world);
  const fromDeck = rollDtEncounterForLevel(lvl, rng);
  const foeId = resolveDtFoeId(fromDeck.id, lvl, rng);
  const started = startDtBattleVs(world, foeId);
  return {
    world: {
      ...started.world,
      framesSinceEncounter: 0,
      nextEncounterAtFrame: rollNextEncounterAtFrame(world.framesAdvanced, rng),
    },
    message: started.message,
  };
}

export function startDtBattleVs(
  world: DtWorldSave,
  foeId: string
): { world: DtWorldSave; message: string } {
  const r = startBattleVs(asPartyWorld(world), foeId, CLOCK_OFF);
  return {
    world: fromPartyWorld(r.world, {
      framesAdvanced: world.framesAdvanced,
      framesSinceEncounter: world.framesSinceEncounter,
      nextEncounterAtFrame: world.nextEncounterAtFrame,
    }),
    message: r.message,
  };
}

export function applyDtBattleAction(
  world: DtWorldSave,
  slot: PlayerSlot,
  action: BattleActionId,
  opts?: BattleActionOpts
): { world: DtWorldSave; message: string } {
  const r = performBattleAction(asPartyWorld(world), slot, action, opts);
  const next = fromPartyWorld(r.world, {
    framesAdvanced: world.framesAdvanced,
    framesSinceEncounter: world.framesSinceEncounter,
    nextEncounterAtFrame: world.nextEncounterAtFrame,
  });
  if (
    world.battle?.status === "active" &&
    next.battle &&
    (next.battle.status === "victory" || next.battle.status === "defeat")
  ) {
    return {
      world: {
        ...next,
        battlesFought: (next.battlesFought ?? 0) + 1,
        framesSinceEncounter: 0,
        nextEncounterAtFrame: rollNextEncounterAtFrame(next.framesAdvanced),
      },
      message: r.message,
    };
  }
  return { world: next, message: r.message };
}

export function dismissDtBattle(world: DtWorldSave): DtWorldSave {
  const cleared = dismissBattleSummary(asPartyWorld(world));
  return fromPartyWorld(cleared, {
    framesAdvanced: world.framesAdvanced,
    framesSinceEncounter: world.framesSinceEncounter,
    nextEncounterAtFrame: world.nextEncounterAtFrame,
  });
}
