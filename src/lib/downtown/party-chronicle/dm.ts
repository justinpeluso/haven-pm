/**
 * Neverworld Dungeon Master — campaign brief + online/offline coaching.
 * Keeps the party free to wander, then points them back to the main road.
 */

import { ACTS } from "./campaign";
import { progressGateForNode } from "./engine";
import {
  campaignProgressReport,
  chapterIdForWorld,
  currentJourneyStop,
  type CampaignProgressReport,
} from "./journey";
import { createNewWorld } from "./persist";
import { chapterForNode, getStoryNode } from "./story";
import type { PartyWorldSave } from "./types";

export type DmPathStatus =
  | "on_spine"
  | "side_questing"
  | "exploring"
  | "stranded_ending"
  | "gated"
  | "in_battle";

export type DmFocusTarget = "chronicle" | "map" | "camp" | "main_quest";

export type DmQuickPromptId =
  | "where"
  | "main_road"
  | "next_beat"
  | "hint";

export type CampaignBrief = {
  arcSummary: string;
  landmarks: { id: string; title: string; tagline: string; state: "done" | "here" | "ahead" }[];
  progress: CampaignProgressReport;
  chapterId: string;
  campaignNodeId: string;
  nodeTitle: string;
  nodeKind: string;
  nodeBlurb: string;
  pathStatus: DmPathStatus;
  pathLabel: string;
  gateReason: string | null;
  sideQuest: {
    id: string;
    title: string;
    stepLabel: string;
    minutesLeft: number | null;
  } | null;
  explore: {
    biomeId: string;
    x: number;
    y: number;
    moves: number;
    hasWanderer: boolean;
  } | null;
  battlesFought: number;
  sideQuestsDone: number;
  turns: number;
  notableFlags: string[];
  alignment: { animal: number; human: number; demon: number };
  endingId: string | null;
  recentLog: string[];
  nextSteps: string[];
  focusTarget: DmFocusTarget;
};

export type DmReply = {
  reply: string;
  mode: "llm" | "offline";
  guidance: {
    pathStatus: DmPathStatus;
    pathLabel: string;
    chapterId: string;
    campaignNodeId: string;
    nodeTitle: string;
    onMainRoad: boolean;
    nextSteps: string[];
    focusTarget: DmFocusTarget;
    focusLabel: string;
  };
  note?: string;
};

const LANDMARK_IDS = [
  "ch1-frostford",
  "ch2-goblin-road",
  "ch3-ember-hold",
  "ch4-dragon-whisper",
  "ch5-misty-crossing",
  "ch6-crown-ash",
  "ch7-fellowship",
  "ch8-worldeater",
  "ch9-last-council",
  "ch10-endings",
] as const;

const FLAG_ALLOW = [
  "ch1-started",
  "met-pip",
  "pip-friend",
  "pip-deal",
  "pip-scared",
  "map-main-hint",
  "map-new-path",
  "rescued-from-early-ending",
];

function landmarkActs() {
  return LANDMARK_IDS.map((id) => ACTS.find((a) => a.id === id)).filter(
    (a): a is NonNullable<typeof a> => !!a
  );
}

function nearestLandmarkId(chapterId: string): string {
  if ((LANDMARK_IDS as readonly string[]).includes(chapterId)) return chapterId;
  const ch = ACTS.find((a) => a.id === chapterId);
  if (!ch) return "ch1-frostford";
  // Spine chapters sit between authored landmarks — map by chapter ordinal.
  let best: string = LANDMARK_IDS[0];
  for (const id of LANDMARK_IDS) {
    const act = ACTS.find((a) => a.id === id);
    if (act && act.chapter <= ch.chapter) best = id;
  }
  return best;
}

function minutesUntil(iso: string | undefined): number | null {
  if (!iso) return null;
  const ms = Date.parse(iso) - Date.now();
  if (!Number.isFinite(ms)) return null;
  return Math.max(0, Math.ceil(ms / 60_000));
}

function nextNodeId(world: PartyWorldSave): string | null {
  const node = getStoryNode(world.campaignNodeId);
  if (!node) return null;
  if ("next" in node && typeof node.next === "string") return node.next;
  return null;
}

export function buildCampaignBrief(world: PartyWorldSave): CampaignBrief {
  const progress = campaignProgressReport(world);
  const chapterId = chapterIdForWorld(world);
  const chapter = chapterForNode(world.campaignNodeId);
  const node = getStoryNode(world.campaignNodeId);
  const nodeTitle = node?.title ?? progress.nodeTitle;
  const nodeKind = node?.kind ?? "narrative";
  const nodeBlurb =
    (node && "body" in node && typeof node.body === "string"
      ? node.body.slice(0, 280)
      : progress.campBlurb) || progress.campBlurb;

  const nextId = nextNodeId(world);
  const gate = nextId ? progressGateForNode(world, nextId) : { ok: true as const };
  const gateReason = !gate.ok ? gate.reason ?? "A progress gate is blocking Continue." : null;

  const onEnding =
    !!world.endingId ||
    node?.kind === "ending" ||
    chapter?.id === "ch10-endings";
  const battles = world.battlesFought ?? 0;
  const stranded =
    onEnding &&
    (battles < 80 || (world.partyFlags ?? []).includes("rescued-from-early-ending"));

  const sq = world.activeSideQuest?.status === "active" ? world.activeSideQuest : null;
  const explore = world.explore ?? null;
  const inBattle = world.battle?.status === "active" || !!world.deckEncounter;

  let pathStatus: DmPathStatus = "on_spine";
  if (inBattle) pathStatus = "in_battle";
  else if (stranded) pathStatus = "stranded_ending";
  else if (sq) pathStatus = "side_questing";
  else if (gateReason) pathStatus = "gated";
  else if (explore && (explore.moves > 0 || explore.pendingWanderer)) pathStatus = "exploring";

  const pathLabel =
    pathStatus === "on_spine"
      ? "On the main comic spine"
      : pathStatus === "side_questing"
        ? `Side-questing: ${sq?.title ?? "side trail"}`
        : pathStatus === "exploring"
          ? `Wandering the map (${explore?.biomeId ?? "wilds"})`
          : pathStatus === "stranded_ending"
            ? "Stranded on an early ending plate"
            : pathStatus === "gated"
              ? "Main road gated — need Camp deeds / battles"
              : "In battle";

  const hereLandmark = nearestLandmarkId(chapterId);
  const hereIdx = LANDMARK_IDS.indexOf(hereLandmark as (typeof LANDMARK_IDS)[number]);
  const landmarks = landmarkActs().map((act, i) => ({
    id: act.id,
    title: act.title,
    tagline: act.tagline,
    state: (i < hereIdx ? "done" : i === hereIdx ? "here" : "ahead") as
      | "done"
      | "here"
      | "ahead",
  }));

  const arcSummary = [
    "Neverworld arc (beginning → end): Frostford Gate → Goblin Road → Hold of Embers → Dragon Whisper → Misty Crossing → Crown of Ash → Fellowship Strain → Worldeater Gate → Last Council → three crowns (Animal / Human / Demon).",
    "Players may wander Map, Camp side quests, and travelers freely. The comic spine (`campaignNodeId`) is the main road — Continue / Chronicle choices advance it.",
    `Party is near landmark “${landmarks.find((l) => l.state === "here")?.title ?? "the road"}” on beat “${nodeTitle}”.`,
  ].join(" ");

  const notableFlags = (world.partyFlags ?? [])
    .filter(
      (f) =>
        FLAG_ALLOW.includes(f) ||
        f.startsWith("visited:ch") ||
        f.startsWith("met-") ||
        f.startsWith("foreshadow")
    )
    .slice(0, 16);

  const nextSteps = buildNextSteps({
    pathStatus,
    nodeKind,
    nodeTitle,
    gateReason,
    sqTitle: sq?.title ?? null,
    biomeId: explore?.biomeId ?? null,
    journeyShort: currentJourneyStop(world)?.short ?? null,
  });

  const focusTarget: DmFocusTarget =
    pathStatus === "stranded_ending"
      ? "main_quest"
      : pathStatus === "exploring"
        ? "chronicle"
        : pathStatus === "side_questing"
          ? "chronicle"
          : pathStatus === "gated"
            ? "camp"
            : "chronicle";

  return {
    arcSummary,
    landmarks,
    progress,
    chapterId,
    campaignNodeId: world.campaignNodeId,
    nodeTitle,
    nodeKind,
    nodeBlurb,
    pathStatus,
    pathLabel,
    gateReason,
    sideQuest: sq
      ? {
          id: sq.questId,
          title: sq.title,
          stepLabel: sq.steps.find((s) => !s.done)?.label ?? "in progress",
          minutesLeft: minutesUntil(sq.endsAt),
        }
      : null,
    explore: explore
      ? {
          biomeId: explore.biomeId,
          x: explore.x,
          y: explore.y,
          moves: explore.moves ?? 0,
          hasWanderer: !!explore.pendingWanderer,
        }
      : null,
    battlesFought: battles,
    sideQuestsDone: world.completedSideQuests?.length ?? 0,
    turns: world.turnIndex ?? 0,
    notableFlags,
    alignment: world.alignment,
    endingId: world.endingId,
    recentLog: (world.log ?? []).slice(0, 8),
    nextSteps,
    focusTarget,
  };
}

function buildNextSteps(opts: {
  pathStatus: DmPathStatus;
  nodeKind: string;
  nodeTitle: string;
  gateReason: string | null;
  sqTitle: string | null;
  biomeId: string | null;
  journeyShort: string | null;
}): string[] {
  const { pathStatus, nodeKind, nodeTitle, gateReason, sqTitle, biomeId, journeyShort } = opts;
  switch (pathStatus) {
    case "stranded_ending":
      return [
        "Open Camp → tap “Back to the main road”, or ask the DM “Focus main quest”.",
        "That ending plate was early — the chronicle resumes on Goblin Road.",
      ];
    case "in_battle":
      return [
        "Finish the fight first (victory / flee).",
        "Then open Chronicle for the main comic beat, or park any side trail.",
      ];
    case "side_questing":
      return [
        sqTitle
          ? `Finish or park side quest “${sqTitle}” (park keeps the clock running).`
          : "Park or finish the active side quest.",
        `Open Chronicle → continue “${nodeTitle}” on the main spine.`,
        "Camp’s “Return to main quest” jumps you back to the comic.",
      ];
    case "exploring":
      return [
        biomeId
          ? `Leave the ${biomeId} wander — Map is a side path, not the spine.`
          : "Step off the overworld wander when you’re ready.",
        journeyShort
          ? `Open Chronicle near ${journeyShort} and Continue the comic.`
          : `Open Chronicle and Continue “${nodeTitle}”.`,
        "Travelers with a “main road” hint can also nudge you back.",
      ];
    case "gated":
      return [
        gateReason ?? "Win battles or build Camp deeds before the next act opens.",
        "Fight on Map / Camp roads, cook, dig, or finish a short side quest.",
        `When the gate lifts, open Chronicle and Continue past “${nodeTitle}”.`,
      ];
    case "on_spine":
    default:
      if (nodeKind === "conversation" || nodeKind === "path" || nodeKind === "encounter") {
        return [
          `Open Chronicle — you’re on “${nodeTitle}”. Pick a panel / choice.`,
          "Side quests and Map walks are optional flavor; the comic advances the story.",
        ];
      }
      return [
        `Open Chronicle and hit Continue on “${nodeTitle}”.`,
        "If you get lost later, ask the DM “How do we get back to the main story?”",
      ];
  }
}

export function focusLabelFor(target: DmFocusTarget, pathStatus: DmPathStatus): string {
  if (pathStatus === "stranded_ending") return "Focus main quest (rescue road)";
  if (target === "camp") return "Open Camp (unlock gate)";
  if (target === "map") return "Open Map";
  return "Focus main quest";
}

function classifyIntent(message: string): DmQuickPromptId | "free" {
  const m = message.toLowerCase().trim();
  if (!m) return "where";
  if (
    m.includes("where are we") ||
    m.includes("where we") ||
    m === "where" ||
    m.includes("status")
  ) {
    return "where";
  }
  if (
    m.includes("get back") ||
    m.includes("main story") ||
    m.includes("main quest") ||
    m.includes("main road") ||
    m.includes("lost") ||
    m.includes("side quest")
  ) {
    return "main_road";
  }
  if (m.includes("next") || m.includes("beat") || m.includes("what now") || m.includes("continue")) {
    return "next_beat";
  }
  if (m.includes("hint") || m.includes("spoiler") || m.includes("nudge")) {
    return "hint";
  }
  return "free";
}

function voicePrefix(pathStatus: DmPathStatus): string {
  switch (pathStatus) {
    case "side_questing":
      return "Side trails are fine — crumbs and campfires sharpen the party.";
    case "exploring":
      return "The map is a playground. The comic spine is the highway.";
    case "stranded_ending":
      return "Hold up — that crown plate slammed shut too early.";
    case "gated":
      return "The road ahead has a soft lock. Live a little first.";
    case "in_battle":
      return "Steel first. Story second.";
    default:
      return "You’re on the main ink line.";
  }
}

export function offlineDmReply(brief: CampaignBrief, message: string): DmReply {
  const intent = classifyIntent(message);
  const steps = brief.nextSteps.map((s, i) => `${i + 1}. ${s}`).join("\n");
  const landmarkHere = brief.landmarks.find((l) => l.state === "here");
  const ahead = brief.landmarks.filter((l) => l.state === "ahead").slice(0, 2);

  let body = "";
  switch (intent) {
    case "where":
      body = [
        voicePrefix(brief.pathStatus),
        "",
        `**Where you are:** ${brief.pathLabel}.`,
        `Comic beat: “${brief.nodeTitle}” (${brief.nodeKind}) · landmark ${landmarkHere?.title ?? brief.chapterId}.`,
        brief.progress.campBlurb,
        brief.sideQuest
          ? `Active side trail: “${brief.sideQuest.title}” — step “${brief.sideQuest.stepLabel}”${
              brief.sideQuest.minutesLeft != null
                ? ` · ~${brief.sideQuest.minutesLeft}m on the clock`
                : ""
            }.`
          : "No side quest on the clock.",
        brief.explore
          ? `Map pin: ${brief.explore.biomeId} @ (${brief.explore.x}, ${brief.explore.y}), ${brief.explore.moves} moves${
              brief.explore.hasWanderer ? " · traveler waiting" : ""
            }.`
          : "",
        `Deeds: ${brief.battlesFought} battles · ${brief.sideQuestsDone} side quests · turn ${brief.turns}.`,
      ]
        .filter(Boolean)
        .join("\n");
      break;
    case "main_road":
      body = [
        voicePrefix(brief.pathStatus),
        "",
        "**Back to the main story:**",
        steps,
        "",
        brief.pathStatus === "on_spine"
          ? "You’re already on the spine — just open Chronicle and play the panel."
          : "Wander all you like; when you’re ready, those steps put ink back on the main road.",
      ].join("\n");
      break;
    case "next_beat":
      body = [
        voicePrefix(brief.pathStatus),
        "",
        `**Next main beat:** stay with “${brief.nodeTitle}”.`,
        brief.gateReason ? `Gate: ${brief.gateReason}` : "No hard gate on the immediate Continue.",
        ahead.length
          ? `Further down the arc (no spoilers): ${ahead.map((a) => a.title).join(" → ")}…`
          : "You’re near the end of the authored landmarks — play carefully.",
        "",
        steps,
      ].join("\n");
      break;
    case "hint":
      body = [
        "Soft hint — no ending crowns spoiled:",
        "",
        brief.nodeBlurb.length > 20
          ? `The panel whispers: “${brief.nodeBlurb.slice(0, 160).trim()}${
              brief.nodeBlurb.length > 160 ? "…" : ""
            }”`
          : `You’re still writing “${brief.nodeTitle}”.`,
        brief.pathStatus === "side_questing" || brief.pathStatus === "exploring"
          ? "If the table feels adrift, park the side path and open Chronicle — the spine hasn’t moved."
          : "Lean into the current panel; Camp and Map are seasoning, not the entrée.",
        "",
        steps,
      ].join("\n");
      break;
    default:
      body = [
        voicePrefix(brief.pathStatus),
        "",
        `Heard: “${message.trim().slice(0, 200)}”.`,
        `You’re on “${brief.nodeTitle}” — ${brief.pathLabel}.`,
        "",
        "**Concrete next steps:**",
        steps,
        "",
        "Ask “Where are we?”, “How do we get back to the main story?”, “What’s the next main beat?”, or “Hint without spoilers” anytime.",
      ].join("\n");
  }

  return {
    reply: body,
    mode: "offline",
    guidance: {
      pathStatus: brief.pathStatus,
      pathLabel: brief.pathLabel,
      chapterId: brief.chapterId,
      campaignNodeId: brief.campaignNodeId,
      nodeTitle: brief.nodeTitle,
      onMainRoad: brief.pathStatus === "on_spine" || brief.pathStatus === "gated",
      nextSteps: brief.nextSteps,
      focusTarget: brief.focusTarget,
      focusLabel: focusLabelFor(brief.focusTarget, brief.pathStatus),
    },
    note: "Local DM (no LLM key) — story brain from campaign state.",
  };
}

function systemPromptFromBrief(brief: CampaignBrief): string {
  const landmarkLines = brief.landmarks
    .map((l) => `- [${l.state}] ${l.title} — ${l.tagline}`)
    .join("\n");
  return [
    "You are the tabletop Dungeon Master for Party Chronicle / Neverworld — comic-panel RPG tone, warm, sly, Neverworld voice. Not a generic chatbot.",
    "Players may wander Map, side quests, and travelers. Your job is to help them find the main road again without spoiling ending crowns (Animal/Human/Demon) early — foreshadow only.",
    "Always give concrete UI next steps: Open Chronicle and Continue / pick a panel; Return to Map; Finish or park side quest X; Camp sleep/cook/fight to clear gates; Focus main quest.",
    "",
    brief.arcSummary,
    "",
    "Landmark progress:",
    landmarkLines,
    "",
    `Current path status: ${brief.pathStatus} — ${brief.pathLabel}`,
    `Chapter: ${brief.chapterId} · Node: ${brief.campaignNodeId} “${brief.nodeTitle}” (${brief.nodeKind})`,
    `Progress: ${brief.progress.detail}`,
    brief.gateReason ? `Gate: ${brief.gateReason}` : "Gate: none on immediate Continue",
    brief.sideQuest
      ? `Side quest: ${brief.sideQuest.title} @ ${brief.sideQuest.stepLabel}`
      : "Side quest: none",
    brief.explore
      ? `Explore: ${brief.explore.biomeId} (${brief.explore.x},${brief.explore.y}) moves=${brief.explore.moves}`
      : "Explore: idle",
    `Alignment A/H/D: ${brief.alignment.animal}/${brief.alignment.human}/${brief.alignment.demon}`,
    `Flags: ${brief.notableFlags.join(", ") || "none notable"}`,
    `Suggested steps: ${brief.nextSteps.join(" | ")}`,
    "",
    "Keep replies under ~180 words. Use short paragraphs or a numbered list for next steps.",
  ].join("\n");
}

async function callOpenAi(system: string, user: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const model = process.env.OPENAI_DM_MODEL?.trim() || "gpt-4o-mini";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.7,
        max_tokens: 450,
        messages: [
          { role: "system", content: system },
          { role: "user", content: user },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    const text = data.choices?.[0]?.message?.content?.trim();
    return text || null;
  } catch {
    return null;
  }
}

export async function answerAsDungeonMaster(
  world: PartyWorldSave,
  message: string
): Promise<DmReply> {
  const brief = buildCampaignBrief(world);
  const offline = offlineDmReply(brief, message);
  const llmText = await callOpenAi(systemPromptFromBrief(brief), message.trim() || "Where are we?");
  if (!llmText) return offline;
  return {
    reply: llmText,
    mode: "llm",
    guidance: offline.guidance,
  };
}

/** Compact world snapshot the client may send; server prefers DB world when present. */
export type DmWorldHint = Pick<
  PartyWorldSave,
  | "campaignNodeId"
  | "chapterId"
  | "partyFlags"
  | "alignment"
  | "battlesFought"
  | "completedSideQuests"
  | "activeSideQuest"
  | "explore"
  | "endingId"
  | "log"
  | "turnIndex"
  | "storyPlayMs"
  | "battle"
  | "deckEncounter"
  | "cookedRecipes"
  | "explorationFinds"
>;

export function mergeWorldHint(
  base: PartyWorldSave | null,
  hint: DmWorldHint | null | undefined
): PartyWorldSave | null {
  if (!hint?.campaignNodeId) return base;
  const seed = base ?? createNewWorld();
  return {
    ...seed,
    campaignNodeId: hint.campaignNodeId,
    chapterId: hint.chapterId || seed.chapterId,
    partyFlags: hint.partyFlags ?? seed.partyFlags,
    alignment: hint.alignment ?? seed.alignment,
    battlesFought: hint.battlesFought ?? seed.battlesFought,
    completedSideQuests: hint.completedSideQuests ?? seed.completedSideQuests,
    activeSideQuest: hint.activeSideQuest ?? seed.activeSideQuest,
    explore: hint.explore ?? seed.explore,
    endingId: hint.endingId ?? seed.endingId,
    log: hint.log ?? seed.log,
    turnIndex: hint.turnIndex ?? seed.turnIndex,
    storyPlayMs: hint.storyPlayMs ?? seed.storyPlayMs,
    battle: hint.battle ?? seed.battle,
    deckEncounter: hint.deckEncounter ?? seed.deckEncounter,
    cookedRecipes: hint.cookedRecipes ?? seed.cookedRecipes,
    explorationFinds: hint.explorationFinds ?? seed.explorationFinds,
  };
}
