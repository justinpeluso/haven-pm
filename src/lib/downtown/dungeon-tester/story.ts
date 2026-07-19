/**
 * DungeonTester story loader — full ~30h spine for the shell engine.
 *
 * Source of truth: `data/dungeon-tester/story-spine.json` (StoryNode-like).
 * Adapted on load into shell `DtFrame` (`getFrame` / `continueFrame` / `chooseFrame`).
 *
 * Do not put frame prose in UI components; import from here.
 */
import spinePack from "../../../../data/dungeon-tester/story-spine.json";
import {
  DT_ENCOUNTER_MAX_FRAMES,
  DT_ENCOUNTER_MIN_FRAMES,
  DT_START_CHAPTER_ID,
  DT_START_NODE_ID,
  DT_TARGET_PLAYTIME_HOURS,
  type DtFrame,
  type DtFrameChoice,
  type DtFrameKind,
  type DtStatKey,
} from "./types";

type SpineOutcome = {
  text?: string;
  nextNodeId?: string;
  flagsAdd?: string[];
  damage?: number;
  endingId?: string;
};

type SpineChoice = {
  id: string;
  label: string;
  approach?: string;
  stat?: string;
  dc?: number;
  requireFlag?: string;
  outcome?: SpineOutcome;
  success?: SpineOutcome;
  fail?: SpineOutcome;
};

type SpineFlagEcho = {
  requireFlag: string;
  line: string;
};

type SpineNode = {
  id: string;
  kind: DtFrameKind;
  title: string;
  body: string;
  sceneId?: string;
  artId?: string;
  next?: string;
  choices?: SpineChoice[];
  flagsAdd?: string[];
  flagEchoes?: SpineFlagEcho[];
  enemy?: string;
  enemyTheme?: string;
  enemyHp?: number;
  enemyPower?: number;
  endingId?: string;
  chapter?: number;
};

type SpineChapter = {
  id: string;
  chapter: number;
  title: string;
  tagline: string;
  startNodeId: string;
  nodeIds: string[];
  levelMin: number;
  levelMax: number;
  estimatedHours: number;
  enemyThemes: string[];
  sceneId?: string;
  splashArtId?: string;
  fidelity: "thorough" | "stub";
};

type SpineFile = {
  version: number;
  title: string;
  blurb: string;
  targetHours: number;
  startNodeId: string;
  encounterCadence?: { minFrames: number; maxFrames: number; note?: string };
  chapters: SpineChapter[];
  nodes: SpineNode[];
  endings?: { id: string; title: string; blurb: string }[];
  stats?: Record<string, unknown>;
};

const pack = spinePack as SpineFile;

/** Map story enemy themes → bestiary foe ids (encounters/art packs). */
const THEME_TO_FOE: Record<string, string> = {
  "chain-orcs": "thorn-clan-skirmisher",
  "glade-raiders": "thorn-clan-skirmisher",
  "road-wargs": "dust-trail-warg",
  "cage-tenders": "coffle-guard",
  "neon-scavs": "coffle-guard",
  "brand-hounds": "night-howler",
  "spirit-hounds": "night-howler",
  "warrant-runners": "whip-hand-thug",
  "hill-goblins": "ash-gut-raider",
  "dust-wargs": "dust-trail-warg",
  "bounty-thieves": "bond-chain-enforcer",
  "mark-hunters": "ash-cloak-outrider",
  "spy-ravens": "pale-host-scout",
  "orc-outriders": "orc-rider",
  "paid-knights": "iron-cuff-overseer",
  "river-slavers": "coffle-guard",
  "barge-trolls": "bridge-brute",
  "muck-spiders": "trail-webling",
  "toll-orcs": "thorn-clan-skirmisher",
  "gate-guards": "citadel-gate-brute",
  "mire-orcs": "warcamp-berserker",
  "war-mastiffs": "night-howler",
  "wicker-sentries": "ash-cloak-outrider",
  "overseer-orcs": "iron-cuff-overseer",
  "house-blades": "bond-chain-enforcer",
  "punishment-hounds": "red-maw-hunter",
  "collared-champions": "warcamp-berserker",
  "pit-champions": "bone-drum-captain",
  "arena-trolls": "cave-knuckle",
  "spectating-knights": "chain-lord-lieutenant",
  "cade-favorites": "boss-thorn-warlord",
  "cade-host": "warcamp-berserker",
  "elite-orcs": "orc-rider",
  "burning-tower-guards": "citadel-gate-brute",
  "warg-cavalry": "shadow-pack-alpha",
  "remnant-hunters": "ash-cloak-outrider",
  "storm-wargs": "shadow-pack-alpha",
  "last-enforcers": "chain-lord-lieutenant",
  "memory-shades": "pale-host-scout",
};

const CHAPTER_BY_NUMBER = new Map(pack.chapters.map((c) => [c.chapter, c]));

function foeForTheme(theme?: string): string | undefined {
  if (!theme) return undefined;
  return THEME_TO_FOE[theme] ?? "thorn-clan-skirmisher";
}

function adaptChoice(choice: SpineChoice, fallbackNext: string): DtFrameChoice {
  const success = choice.success ?? choice.outcome;
  const fail = choice.fail;
  const next = success?.nextNodeId ?? fail?.nextNodeId ?? fallbackNext;
  const adapted: DtFrameChoice = {
    id: choice.id,
    label: choice.label,
    next,
    approach: choice.approach,
    flagsAdd: success?.flagsAdd,
  };
  if (choice.requireFlag) {
    adapted.requireFlag = choice.requireFlag;
  }
  if (choice.stat && typeof choice.dc === "number") {
    adapted.stat = choice.stat as DtStatKey;
    adapted.dc = choice.dc;
    adapted.nextFail = fail?.nextNodeId ?? next;
    adapted.failFlagsAdd = fail?.flagsAdd;
    adapted.failDamage = fail?.damage;
  }
  return adapted;
}

function adaptNode(node: SpineNode): DtFrame {
  const chapter =
    (node.chapter ? CHAPTER_BY_NUMBER.get(node.chapter) : undefined) ??
    pack.chapters.find((c) => c.nodeIds.includes(node.id));
  const chapterId = chapter?.id ?? DT_START_CHAPTER_ID;
  const fallbackNext = node.next ?? node.id;

  const frame: DtFrame = {
    id: node.id,
    chapterId,
    title: node.title,
    body: node.body,
    kind: node.kind,
    sceneId: node.sceneId,
    artId: node.artId,
    flagsAdd: node.flagsAdd,
    flagEchoes: node.flagEchoes,
    endingId: node.endingId,
    enemyTheme: node.enemyTheme,
  };

  if (node.kind === "narrative") {
    frame.next = node.next;
    return frame;
  }

  if (node.kind === "ending") {
    frame.endingId = node.endingId ?? node.id;
    return frame;
  }

  if (node.kind === "encounter") {
    // Shell starts battle on land via battleFoeId; Continue uses `next` after.
    const choiceNext =
      node.choices?.[0]?.outcome?.nextNodeId ??
      node.choices?.[0]?.success?.nextNodeId ??
      node.next;
    frame.battleFoeId = foeForTheme(node.enemyTheme);
    frame.enemyTheme = node.enemyTheme;
    frame.next = choiceNext ?? fallbackNext;
    return frame;
  }

  // choice
  frame.choices = (node.choices ?? []).map((c) => adaptChoice(c, fallbackNext));
  return frame;
}

const ALL_FRAMES: DtFrame[] = pack.nodes.map(adaptNode);

const FRAME_BY_ID = new Map<string, DtFrame>();
for (const f of ALL_FRAMES) {
  FRAME_BY_ID.set(f.id, f);
}

export const STORY_PACK_TITLE = pack.title;
export const STORY_PACK_BLURB = pack.blurb;
export const TARGET_HOURS = pack.targetHours ?? DT_TARGET_PLAYTIME_HOURS;
export const START_NODE_ID = pack.startNodeId || DT_START_NODE_ID;
export const ENCOUNTER_CADENCE = pack.encounterCadence ?? {
  minFrames: DT_ENCOUNTER_MIN_FRAMES,
  maxFrames: DT_ENCOUNTER_MAX_FRAMES,
  note: "Engine rolls next ambush after 10–20 frames.",
};

export const CHAPTERS = pack.chapters.map((c) => ({
  id: c.id,
  chapter: c.chapter,
  title: c.title,
  tagline: c.tagline,
  startNodeId: c.startNodeId,
  nodeIds: c.nodeIds,
  levelMin: c.levelMin,
  levelMax: c.levelMax,
  estimatedHours: c.estimatedHours,
  enemyThemes: c.enemyThemes,
  sceneId: c.sceneId,
  splashArtId: c.splashArtId,
  fidelity: c.fidelity,
}));

export const ENDINGS = pack.endings ?? [];

/** Main campaign spine only (no side-quest frames). */
export function getSpineFrame(id: string): DtFrame | undefined {
  return FRAME_BY_ID.get(id);
}

/**
 * Playable frame: main spine, then side-quest frames (lazy to avoid init cycles).
 */
export function getFrame(id: string): DtFrame | undefined {
  const spine = FRAME_BY_ID.get(id);
  if (spine) return spine;
  try {
    // Lazy require — side-quests imports getSpineFrame, not getFrame.
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const mod = require("./side-quests") as {
      getDtSideQuestFrame: (frameId: string) => DtFrame | undefined;
    };
    return mod.getDtSideQuestFrame(id);
  } catch {
    return undefined;
  }
}

/** Resolve panel body with flag-echo callbacks (earlier choices rewrite later text). */
export function resolveFrameBody(
  frame: Pick<DtFrame, "body" | "flagEchoes">,
  partyFlags: string[] | undefined,
): string {
  const flags = partyFlags ?? [];
  let body = frame.body;
  for (const echo of frame.flagEchoes ?? []) {
    if (flags.includes(echo.requireFlag)) {
      body = `${body} ${echo.line}`;
    }
  }
  return body;
}

/** Choices visible given current party flags (requireFlag gates). */
export function visibleFrameChoices(
  frame: Pick<DtFrame, "choices">,
  partyFlags: string[] | undefined,
): NonNullable<DtFrame["choices"]> {
  const flags = partyFlags ?? [];
  return (frame.choices ?? []).filter(
    (c) => !c.requireFlag || flags.includes(c.requireFlag),
  );
}

/** Alias for StoryNode-style callers. */
export function getDtStoryNode(id: string): DtFrame | undefined {
  return getFrame(id);
}

export function listChapterFrames(chapterId: string): DtFrame[] {
  return ALL_FRAMES.filter((f) => f.chapterId === chapterId);
}

export function chapterTitle(chapterId: string): string {
  return CHAPTERS.find((c) => c.id === chapterId)?.title ?? chapterId;
}

export function chapterForFrame(frameId: string) {
  const frame = getFrame(frameId);
  if (!frame) return undefined;
  return CHAPTERS.find((c) => c.id === frame.chapterId);
}

export function enemyThemesForFrame(frameId: string): string[] {
  return chapterForFrame(frameId)?.enemyThemes ?? [];
}

export function rollDtEncounterThreshold(
  rng: () => number = Math.random,
  min = ENCOUNTER_CADENCE.minFrames,
  max = ENCOUNTER_CADENCE.maxFrames,
): number {
  const lo = Math.max(1, min);
  const hi = Math.max(lo, max);
  return lo + Math.floor(rng() * (hi - lo + 1));
}

export function dtFrameCount(): number {
  return ALL_FRAMES.length;
}

export function dtChapterOutline() {
  return CHAPTERS.map((c) => ({
    chapter: c.chapter,
    title: c.title,
    frames: c.nodeIds.length,
    hours: c.estimatedHours,
    fidelity: c.fidelity,
    enemyThemes: c.enemyThemes,
  }));
}

/** Full frame list (read-only). */
export const DT_STORY_FRAMES: readonly DtFrame[] = ALL_FRAMES;
