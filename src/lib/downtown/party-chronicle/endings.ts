/**
 * Full Animal / Human / Demon ending prose + helpers.
 * Short defs live in alignment.ts; long bodies live in data/party-chronicle/endings.json.
 */

import pack from "../../../../data/party-chronicle/endings.json";
import { leadingAlignment, resolveEndingId } from "./alignment";
import { payoffLinesForPath } from "./foreshadow";
import type { AlignmentPath, AlignmentScores, EndingDef } from "./types";

export type FullEndingDef = EndingDef & {
  path: AlignmentPath;
  splashArtId: string;
  sceneId: string;
  artId: string;
  foreshadowFlags: string[];
  body: string;
  epilogueLines: string[];
};

export const FULL_ENDINGS: FullEndingDef[] = pack.endings as FullEndingDef[];

export const FULL_ENDING_BY_ID: Record<string, FullEndingDef> = Object.fromEntries(
  FULL_ENDINGS.map((e) => [e.id, e])
);

export const FULL_ENDING_BY_PATH: Record<AlignmentPath, FullEndingDef> = {
  animal: FULL_ENDING_BY_ID["ending-animal"]!,
  human: FULL_ENDING_BY_ID["ending-human"]!,
  demon: FULL_ENDING_BY_ID["ending-demon"]!,
};

export function getFullEnding(id: string): FullEndingDef | undefined {
  return FULL_ENDING_BY_ID[id];
}

export function pickEnding(alignment: AlignmentScores, override?: AlignmentPath): FullEndingDef {
  const id = resolveEndingId(alignment, override);
  return FULL_ENDING_BY_ID[id] ?? FULL_ENDING_BY_PATH.human;
}

/** Compose finale text with planted foreshadow payoffs. */
export function renderEndingBody(
  alignment: AlignmentScores,
  partyFlags: string[],
  override?: AlignmentPath
): {
  ending: FullEndingDef;
  path: AlignmentPath;
  body: string;
  foreshadowPayoffs: string[];
  epilogueLines: string[];
} {
  const path = override ?? leadingAlignment(alignment);
  const ending = pickEnding(alignment, path);
  const foreshadowPayoffs = payoffLinesForPath(path, partyFlags);
  const extra =
    foreshadowPayoffs.length > 0
      ? `\n\n---\nEchoes you planted along the road:\n${foreshadowPayoffs.map((l) => `• ${l}`).join("\n")}`
      : "";
  return {
    ending,
    path,
    body: ending.body + extra,
    foreshadowPayoffs,
    epilogueLines: ending.epilogueLines,
  };
}
