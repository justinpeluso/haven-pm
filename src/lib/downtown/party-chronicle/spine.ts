import generatedSpine from "../../../../data/party-chronicle/story-spine.json";
import type { ChapterDef, StoryNode } from "./types";

type StorySpineFile = {
  chapters?: unknown[];
  nodes?: unknown[];
  handoffs?: unknown;
};

const raw = generatedSpine as StorySpineFile;
const STORY_KINDS = new Set(["narrative", "conversation", "path", "encounter", "ending", "montage"]);

function isStoryNode(value: unknown): value is StoryNode {
  if (!value || typeof value !== "object") return false;
  const node = value as { id?: unknown; kind?: unknown; title?: unknown };
  return (
    typeof node.id === "string" &&
    typeof node.kind === "string" &&
    STORY_KINDS.has(node.kind) &&
    typeof node.title === "string"
  );
}

function isChapter(value: unknown): value is ChapterDef {
  if (!value || typeof value !== "object") return false;
  const chapter = value as Partial<ChapterDef>;
  return (
    typeof chapter.id === "string" &&
    typeof chapter.chapter === "number" &&
    typeof chapter.levelMin === "number" &&
    typeof chapter.levelMax === "number" &&
    typeof chapter.title === "string" &&
    typeof chapter.tagline === "string" &&
    typeof chapter.startNodeId === "string" &&
    Array.isArray(chapter.nodeIds)
  );
}

/** Valid generated records. An empty generated file leaves the authored campaign unchanged. */
export const SPINE_NODES: StoryNode[] = (raw.nodes ?? []).filter(isStoryNode);
export const SPINE_CHAPTERS: ChapterDef[] = (raw.chapters ?? []).filter(isChapter);

function readHandoffs(value: unknown): Record<string, string> {
  if (Array.isArray(value)) {
    return Object.fromEntries(
      value.flatMap((entry) => {
        if (!entry || typeof entry !== "object") return [];
        const item = entry as {
          from?: unknown;
          fromNodeId?: unknown;
          to?: unknown;
          toNodeId?: unknown;
        };
        const from = item.fromNodeId ?? item.from;
        const to = item.toNodeId ?? item.to;
        return typeof from === "string" && typeof to === "string" ? [[from, to]] : [];
      })
    );
  }
  if (!value || typeof value !== "object") return {};
  return Object.fromEntries(
    Object.entries(value).filter(
      (entry): entry is [string, string] => typeof entry[1] === "string"
    )
  );
}

const inboundHandoffs = Object.fromEntries(
  (raw.chapters ?? []).flatMap((value) => {
    if (!value || typeof value !== "object") return [];
    const chapter = value as { linksFromAuthored?: unknown; startNodeId?: unknown };
    return typeof chapter.linksFromAuthored === "string" &&
      typeof chapter.startNodeId === "string"
      ? [[chapter.linksFromAuthored, chapter.startNodeId]]
      : [];
  })
);

/** Generated transitions that insert spine chapters between authored landmarks. */
export const SPINE_HANDOFFS: Readonly<Record<string, string>> = {
  ...inboundHandoffs,
  ...readHandoffs(raw.handoffs),
};
export const handoffs = SPINE_HANDOFFS;

/**
 * Handoffs may be keyed by the node being left or by the authored destination
 * being intercepted. Supporting both keeps generated files forwards-compatible.
 */
export function resolveSpineHandoff(currentNodeId: string, requestedNextNodeId: string): string {
  return (
    SPINE_HANDOFFS[`${currentNodeId}->${requestedNextNodeId}`] ??
    SPINE_HANDOFFS[currentNodeId] ??
    SPINE_HANDOFFS[requestedNextNodeId] ??
    requestedNextNodeId
  );
}

/**
 * Combine generated connective tissue with hand-authored landmarks.
 * Authored records are applied last, so their content always wins an ID collision.
 */
export function mergeStorySpine(
  authoredNodes: StoryNode[],
  authoredChapters: ChapterDef[]
): { nodes: StoryNode[]; chapters: ChapterDef[] } {
  const nodes = new Map<string, StoryNode>();
  for (const node of SPINE_NODES) nodes.set(node.id, node);
  for (const node of authoredNodes) nodes.set(node.id, node);

  const chapters = new Map<string, ChapterDef>();
  for (const chapter of SPINE_CHAPTERS) chapters.set(chapter.id, chapter);
  for (const authored of authoredChapters) {
    const generated = chapters.get(authored.id);
    chapters.set(authored.id, {
      ...generated,
      ...authored,
      nodeIds: Array.from(new Set([...(generated?.nodeIds ?? []), ...authored.nodeIds])),
      estimatedHours: generated?.estimatedHours ?? authored.estimatedHours,
    });
  }

  return {
    nodes: [...nodes.values()],
    chapters: [...chapters.values()].sort(
      (a, b) => a.chapter - b.chapter || a.id.localeCompare(b.id)
    ),
  };
}
