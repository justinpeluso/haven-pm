/**
 * NeverWorld Pathways (Givers vs Takers) + sealed-world heritage copy.
 * Sits beside Animal / Human / Demon destiny scores.
 */

import type { AlignmentScores } from "./types";

export type PathwayScores = { giver: number; taker: number };

export const EMPTY_PATHWAY: PathwayScores = { giver: 0, taker: 0 };

export function mergePathway(
  current: PathwayScores,
  delta?: Partial<PathwayScores>
): PathwayScores {
  if (!delta) return { ...current };
  return {
    giver: current.giver + (delta.giver ?? 0),
    taker: current.taker + (delta.taker ?? 0),
  };
}

/** Derive Pathway deltas from destiny alignment nudges. */
export function pathwayFromAlignmentDelta(
  delta?: Partial<AlignmentScores>
): Partial<PathwayScores> | undefined {
  if (!delta) return undefined;
  const giver = (delta.animal ?? 0) + (delta.human ?? 0);
  const taker = delta.demon ?? 0;
  if (!giver && !taker) return undefined;
  return { giver, taker };
}

export function leadingPathway(scores: PathwayScores): "giver" | "taker" | "balanced" {
  if (scores.giver === scores.taker) return "balanced";
  return scores.giver > scores.taker ? "giver" : "taker";
}

export function pathwayLabel(scores: PathwayScores): string {
  const lead = leadingPathway(scores);
  if (lead === "balanced") return `Balanced · G${scores.giver}/T${scores.taker}`;
  if (lead === "giver") return `Giver · G${scores.giver}/T${scores.taker}`;
  return `Taker · G${scores.giver}/T${scores.taker}`;
}

export function pathwayReactionFlavor(scores: PathwayScores): string {
  const lead = leadingPathway(scores);
  if (lead === "giver") return "Beasts and hold-folk lean toward you.";
  if (lead === "taker") return "Ambition scents the air — something hungers.";
  return "The sealed world watches, undecided.";
}

/** Short heritage blurbs for title / create / codex. */
export const NEVERWORLD_HERITAGE = {
  title:
    "A sealed world of myth after the gods' war — science sleeps, thirty-five cultures endure in isolation. Rebels who leave their walls force contact… and change.",
  create:
    "Pick a race of the sealed lands. Your Pathway (Giver / Taker) grows beside Animal · Human · Demon destiny. Checks use R.O.C. — exploding percentiles, never a plain hit/miss.",
  codex:
    "Neverworld homage: sealed post-apocalyptic myth-world, Pathways (Givers vs Takers), and the Rolling Outcome Chart (R.O.C.). Inspired by the spirit of 1996 NeverWorld / ForEverWorld Books — a fantasy-heartbreaker legacy; this app is an original comic CRPG tribute, not an official product.",
  battleVictoryGiver: "A Giver's victory — the wounded world exhales.",
  battleVictoryTaker: "A Taker's victory — the ledger of power grows heavier.",
} as const;
