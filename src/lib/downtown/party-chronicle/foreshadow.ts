/**
 * Destiny foreshadow hooks — planted early, paid off in Animal / Human / Demon endings.
 * Data pack: data/party-chronicle/foreshadow.json
 */

import pack from "../../../../data/party-chronicle/foreshadow.json";
import type { AlignmentPath } from "./types";

export type ForeshadowBeat = {
  id: string;
  flag: string;
  path: AlignmentPath;
  actIntroduced: string;
  payoffAct: string;
  hook: string;
  payoff: string;
  artId: string;
  endingArtId: string;
};

export const FORESHADOW_BEATS: ForeshadowBeat[] = pack.beats as ForeshadowBeat[];

export const FORESHADOW_BY_FLAG: Record<string, ForeshadowBeat> = Object.fromEntries(
  FORESHADOW_BEATS.map((b) => [b.flag, b])
);

export function getForeshadow(flag: string): ForeshadowBeat | undefined {
  return FORESHADOW_BY_FLAG[flag];
}

/** Which foreshadow flags the party has planted. */
export function plantedForeshadow(partyFlags: string[]): ForeshadowBeat[] {
  const set = new Set(partyFlags);
  return FORESHADOW_BEATS.filter((b) => set.has(b.flag));
}

/** Payoff lines for the finale splash, filtered by leading path. */
export function payoffLinesForPath(path: AlignmentPath, partyFlags: string[]): string[] {
  return plantedForeshadow(partyFlags)
    .filter((b) => b.path === path)
    .map((b) => b.payoff);
}
