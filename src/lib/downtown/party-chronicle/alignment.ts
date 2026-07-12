import type { AlignmentPath, AlignmentScores, EndingDef } from "./types";

export const EMPTY_ALIGNMENT: AlignmentScores = {
  animal: 0,
  human: 0,
  demon: 0,
};

export function mergeAlignment(
  current: AlignmentScores,
  delta?: Partial<AlignmentScores>
): AlignmentScores {
  if (!delta) return { ...current };
  return {
    animal: current.animal + (delta.animal ?? 0),
    human: current.human + (delta.human ?? 0),
    demon: current.demon + (delta.demon ?? 0),
  };
}

/** Map destiny path → ending id. */
export const ENDING_ID_BY_PATH: Record<AlignmentPath, string> = {
  animal: "ending-animal",
  human: "ending-human",
  demon: "ending-demon",
};

export function leadingAlignment(scores: AlignmentScores): AlignmentPath {
  const entries: [AlignmentPath, number][] = [
    ["animal", scores.animal],
    ["human", scores.human],
    ["demon", scores.demon],
  ];
  entries.sort((a, b) => b[1] - a[1]);
  // Tie-break: human (stewardship) > animal > demon
  if (entries[0]![1] === entries[1]![1]) {
    const tied = entries.filter((e) => e[1] === entries[0]![1]).map((e) => e[0]);
    if (tied.includes("human")) return "human";
    if (tied.includes("animal")) return "animal";
    return "demon";
  }
  return entries[0]![0];
}

export function resolveEndingId(scores: AlignmentScores, override?: AlignmentPath): string {
  const path = override ?? leadingAlignment(scores);
  return ENDING_ID_BY_PATH[path];
}

export function endingNodeIdForPath(path: AlignmentPath): string {
  return `node-finale-${path}`;
}

export const ENDING_DEFS: EndingDef[] = [
  {
    id: "ending-animal",
    title: "The Wild Crown",
    blurb: "Pack and glen answer your call. The holds stand — but the wild writes the law.",
    tone: "bond",
    path: "animal",
    splashArtId: "splash-ending-animal",
    sceneId: "scene-wild-crown",
    artId: "art-ending-animal",
  },
  {
    id: "ending-human",
    title: "The Hearth Crown",
    blurb: "Oaths, roads, and shared bread. You bind beast and hold in one fellowship.",
    tone: "glory",
    path: "human",
    splashArtId: "splash-ending-human",
    sceneId: "scene-hearth-crown",
    artId: "art-ending-human",
  },
  {
    id: "ending-demon",
    title: "The Ash Throne",
    blurb: "Power without pity. The World-Eater yields — and something hungrier wears your face.",
    tone: "shadow",
    path: "demon",
    splashArtId: "splash-ending-demon",
    sceneId: "scene-ash-throne",
    artId: "art-ending-demon",
  },
];

export const ENDING_BY_ID: Record<string, EndingDef> = Object.fromEntries(
  ENDING_DEFS.map((e) => [e.id, e])
);
