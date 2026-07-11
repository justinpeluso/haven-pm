#!/usr/bin/env npx tsx
/**
 * Prefetch one history-oriented YouTube video per downtown → data/downtown-youtube.json
 * Uses yt-dlp flat search (no video download). Resume-safe via .tmp-youtube/progress.json.
 *
 * Flags:
 *   --fresh   ignore existing cache and rebuild
 *   --concurrency=N  parallel towns (default 3)
 */
import { execFile } from "child_process";
import fs from "fs";
import path from "path";
import { promisify } from "util";
import inventory from "../data/downtowns.json";

const execFileAsync = promisify(execFile);

type Downtown = (typeof inventory.downtowns)[number];

export type DowntownYoutubeEntry = {
  videoId: string;
  title: string;
  channelTitle: string;
  url: string;
  query: string;
};

type OutFile = {
  generatedAt: string;
  count: number;
  byId: Record<string, DowntownYoutubeEntry>;
};

type SearchHit = {
  id: string;
  title: string;
  channel: string;
};

const OUT = path.join(process.cwd(), "data", "downtown-youtube.json");
const TMP_DIR = path.join(process.cwd(), ".tmp-youtube");
const PROGRESS = path.join(TMP_DIR, "progress.json");
const YT_DLP =
  process.env.YT_DLP ||
  [
    path.join(process.env.HOME || "", "Library/Python/3.9/bin/yt-dlp"),
    "/opt/homebrew/bin/yt-dlp",
    "yt-dlp",
  ].find((p) => p === "yt-dlp" || fs.existsSync(p)) ||
  "yt-dlp";

const FRESH = process.argv.includes("--fresh");
const CONCURRENCY = Math.max(
  1,
  Number(process.argv.find((a) => a.startsWith("--concurrency="))?.split("=")[1] || 3)
);

const POSITIVE =
  /\b(history|historic|heritage|downtown|walking\s*tour|tour|main\s*street|historic\s*district|then\s*&\s*now|then\s+and\s+now|old\s+photos?|vintage|remembering|past|founding|settlement|documentary|oral\s+history|borough|small\s+town)\b/i;
const STRONG_POSITIVE =
  /\b(history|historic|heritage|historic\s*district|walking\s*tour|downtown|main\s*street|oral\s+history)\b/i;
const NEGATIVE =
  /\b(lyrics?|official\s+music\s+video|music\s+video|official\s+audio|karaoke|gameplay|let'?s\s+play|asmr|minecraft|fortnite|roblox|tiktok\s+compilation|reaction|unboxing|haul|cover\s+song|nightcore|slowed\s*\+\s*reverb|full\s+album|gta\s*5|call\s+of\s+duty|for\s+sale|mls\b|bedroom|bath(room)?s?|real\s+estate|zillow|realtor|ranch\s+home|house\s+tour|listing|coldwell|howard\s+hanna|\$\d|data\s+center|stabbing|shooting|homicide|murder|arrest|\d+\s+\w+\s+(road|rd\.?|drive|dr\.?|street|st\.?|avenue|ave\.?|lane|ln\.?)\b)/i;
const WEAK_NEGATIVE =
  /\b(highlights?|sports?|football|basketball|soccer|baseball|hockey|wrestling|recipe|cooking|makeup|haunted|ghost\s+hunt)\b/i;

const BIG_PLACES = [
  "pittsburgh",
  "cleveland",
  "philadelphia",
  "columbus",
  "cincinnati",
  "youngstown",
  "erie",
  "akron",
  "toledo",
  "harrisburg",
  "baltimore",
  "detroit",
];

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function stateFull(state: string) {
  return state === "PA" ? "Pennsylvania" : state === "OH" ? "Ohio" : state;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

/** Whole-word place name match (never substring like preserves→Reserve). */
function nameInText(name: string, text: string): boolean {
  const t = text.toLowerCase();
  const n = name.toLowerCase().trim();
  if (!n) return false;
  if (new RegExp(`\\b${escapeRegExp(n)}\\b`, "i").test(t)) return true;
  const parts = n.split(/\s+/).filter((p) => p.length >= 3);
  if (parts.length >= 2) {
    return parts.every((p) => new RegExp(`\\b${escapeRegExp(p)}\\b`, "i").test(t));
  }
  return false;
}

function hasGeoCue(d: Downtown, text: string): boolean {
  const t = text.toLowerCase();
  const full = stateFull(d.state).toLowerCase();
  if (t.includes(full)) return true;
  if (new RegExp(`\\b${d.state}\\b`, "i").test(text)) return true;
  if (t.includes(d.county.toLowerCase())) return true;
  // Common regional anchors for this inventory
  if (d.state === "PA" && /\b(pittsburgh|allegheny|western\s+pa|western\s+pennsylvania)\b/i.test(text)) {
    return true;
  }
  if (d.state === "OH" && /\b(cleveland|ohio|youngstown|columbus)\b/i.test(text)) return true;
  return false;
}

function queriesFor(d: Downtown): string[] {
  const full = stateFull(d.state);
  const name = d.name;
  return [
    `${name} ${full} history`,
    `${name} ${full} downtown history`,
    `${name} ${full} historic`,
    `${name} ${d.state} downtown walking tour`,
    `${name} ${d.county} County ${full} history`,
  ];
}

function scoreHit(hit: SearchHit, d: Downtown): number {
  const title = hit.title || "";
  const channel = hit.channel || "";
  const blob = `${title} ${channel}`;
  if (NEGATIVE.test(blob)) return -1000;

  const nameInTitle = nameInText(d.name, title);
  const nameInChannel = nameInText(d.name, channel);
  if (!nameInTitle && !nameInChannel) return -1000;

  // Prefer title name match; channel-only is weaker
  if (!nameInTitle && nameInChannel && !hasGeoCue(d, title)) return -800;

  // Wrong metro / wrong namesake city
  const nameLc = d.name.toLowerCase();
  for (const big of BIG_PLACES) {
    if (nameLc === big || nameLc.includes(big)) continue;
    if (!new RegExp(`\\b${escapeRegExp(big)}\\b`, "i").test(title)) continue;
    // Allowed if our name is also in the title (e.g. "Dormont Pittsburgh")
    if (nameInTitle) continue;
    return -1000;
  }

  // Ambiguous place names without geo cue (Bellevue Hotel Philadelphia, etc.)
  if (!hasGeoCue(d, blob)) return -400;

  let score = 0;
  if (nameInTitle) score += 45;
  else score += 18;

  if (hasGeoCue(d, title)) score += 18;
  else score += 8;

  if (blob.toLowerCase().includes(d.county.toLowerCase())) score += 10;

  if (STRONG_POSITIVE.test(title)) score += 50;
  else if (POSITIVE.test(title)) score += 28;
  else if (POSITIVE.test(channel)) score += 12;
  else score -= 15;

  if (/\b(walking\s*tour|downtown|historic\s+district|borough)\b/i.test(title)) score += 10;
  if (WEAK_NEGATIVE.test(title) && !STRONG_POSITIVE.test(title)) score -= 20;
  if (title.length > 100) score -= 5;

  return score;
}

async function ytSearch(query: string, n = 5): Promise<SearchHit[]> {
  const search = `ytsearch${n}:${query}`;
  try {
    const { stdout } = await execFileAsync(
      YT_DLP,
      ["--flat-playlist", "--print", "%(id)s\t%(title)s\t%(channel)s", "--no-warnings", search],
      {
        timeout: 55000,
        maxBuffer: 2 * 1024 * 1024,
        env: { ...process.env, PATH: `${path.dirname(YT_DLP)}:${process.env.PATH || ""}` },
      }
    );
    return stdout
      .split("\n")
      .map((line) => line.trim())
      .filter(Boolean)
      .map((line) => {
        const [id, title = "", channel = ""] = line.split("\t");
        return { id: id.trim(), title: title.trim(), channel: channel.trim() };
      })
      .filter((h) => h.id && /^[\w-]{6,20}$/.test(h.id));
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    console.warn(`  yt-dlp failed for "${query}": ${msg.slice(0, 160)}`);
    return [];
  }
}

function loadProgress(): OutFile {
  if (FRESH) return { generatedAt: new Date().toISOString(), count: 0, byId: {} };
  if (fs.existsSync(PROGRESS)) {
    try {
      return JSON.parse(fs.readFileSync(PROGRESS, "utf8")) as OutFile;
    } catch {
      /* fall through */
    }
  }
  if (fs.existsSync(OUT)) {
    try {
      return JSON.parse(fs.readFileSync(OUT, "utf8")) as OutFile;
    } catch {
      /* fall through */
    }
  }
  return { generatedAt: new Date().toISOString(), count: 0, byId: {} };
}

function saveProgress(byId: Record<string, DowntownYoutubeEntry>) {
  fs.mkdirSync(TMP_DIR, { recursive: true });
  const payload: OutFile = {
    generatedAt: new Date().toISOString(),
    count: Object.keys(byId).length,
    byId,
  };
  fs.writeFileSync(PROGRESS, JSON.stringify(payload, null, 2));
  fs.writeFileSync(OUT, JSON.stringify(payload, null, 2));
}

async function findBest(d: Downtown): Promise<DowntownYoutubeEntry | null> {
  let best: { hit: SearchHit; score: number; query: string } | null = null;
  const seen = new Set<string>();

  for (const query of queriesFor(d)) {
    const hits = await ytSearch(query, 5);
    await sleep(280 + Math.floor(Math.random() * 220));

    for (const hit of hits) {
      if (seen.has(hit.id)) continue;
      seen.add(hit.id);
      const s = scoreHit(hit, d);
      if (s < 45) continue;
      if (!best || s > best.score) best = { hit, score: s, query };
    }

    if (best && best.score >= 95) break;
  }

  if (!best) return null;
  return {
    videoId: best.hit.id,
    title: best.hit.title,
    channelTitle: best.hit.channel || "YouTube",
    url: `https://www.youtube.com/watch?v=${best.hit.id}`,
    query: best.query,
  };
}

async function mapPool<T, R>(items: T[], concurrency: number, fn: (item: T, i: number) => Promise<R>): Promise<R[]> {
  const results: R[] = new Array(items.length);
  let next = 0;
  async function worker() {
    while (true) {
      const i = next++;
      if (i >= items.length) return;
      results[i] = await fn(items[i], i);
    }
  }
  await Promise.all(Array.from({ length: concurrency }, () => worker()));
  return results;
}

async function main() {
  console.log(`yt-dlp: ${YT_DLP} · concurrency=${CONCURRENCY} · fresh=${FRESH}`);
  const downtowns = inventory.downtowns as Downtown[];
  const progress = loadProgress();
  const byId: Record<string, DowntownYoutubeEntry> = { ...progress.byId };
  const pending = downtowns.filter((d) => !byId[d.id]);
  console.log(
    `Prefetching YouTube for ${downtowns.length} downtowns (${pending.length} pending, ${Object.keys(byId).length} cached)…`
  );

  let missed = 0;
  let done = 0;

  await mapPool(pending, CONCURRENCY, async (d) => {
    const entry = await findBest(d);
    done += 1;
    const idx = downtowns.findIndex((x) => x.id === d.id) + 1;
    if (entry) {
      byId[d.id] = entry;
      console.log(
        `  ${idx}/${downtowns.length} ✓ ${d.id} → ${entry.videoId}  "${entry.title.slice(0, 72)}"`
      );
    } else {
      missed += 1;
      console.log(`  ${idx}/${downtowns.length} ✗ ${d.id} — no suitable video`);
    }
    if (done % 2 === 0 || done === pending.length) saveProgress(byId);
    await sleep(120 + Math.floor(Math.random() * 180));
    return entry;
  });

  saveProgress(byId);
  const withVideo = Object.keys(byId).length;
  console.log(`Wrote ${OUT}`);
  console.log(`with video: ${withVideo}/${downtowns.length} · missed this run: ${missed}`);
  if (byId["beaver-pa"]) {
    console.log(`sample beaver-pa: ${JSON.stringify(byId["beaver-pa"], null, 2)}`);
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
