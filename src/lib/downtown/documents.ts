import documentsCache from "../../../data/downtown-documents.json";

export type DowntownDocumentKind =
  | "founding"
  | "courthouse"
  | "plat_map"
  | "sanborn"
  | "plan"
  | "other";

export type DowntownDocument = {
  title: string;
  url: string;
  thumbUrl: string;
  kind: DowntownDocumentKind;
  year?: number;
  source: string;
  credit?: string;
};

type DocumentsCacheFile = {
  generatedAt: string;
  count: number;
  byId: Record<string, DowntownDocument[]>;
};

const cache = documentsCache as DocumentsCacheFile;

/** Instant — reads prefetched cache. Returns [] if missing. */
export function getDowntownDocuments(id: string): DowntownDocument[] {
  const hit = cache.byId?.[id];
  if (!Array.isArray(hit)) return [];
  return hit.filter((d) => Boolean(d?.url && d?.thumbUrl && d?.title));
}

export function getDocumentsCacheMeta() {
  return { generatedAt: cache.generatedAt, count: cache.count };
}
