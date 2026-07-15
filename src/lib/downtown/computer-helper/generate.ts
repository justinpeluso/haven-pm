import { offlineComputerHelperPlan } from "./fallback";
import { formatResearchForPrompt, researchComputerHelper } from "./research";
import {
  HELPER_OS_LABELS,
  type ComputerHelperPlan,
  type HelperOs,
  type HelperStep,
} from "./types";

const MAX_QUERY_LEN = 500;
const OPENAI_TIMEOUT_MS = 45_000;

const MISSING_KEY_MSG =
  "Live AI requires OPENAI_API_KEY. Add it in Vercel → Project → Settings → Environment Variables (Production + Preview), then redeploy. Locally: set it in .env and restart npm run dev.";

export function hasComputerHelperOpenAiKey(): boolean {
  return Boolean(process.env.OPENAI_API_KEY?.trim());
}

const OS_IDS = new Set<HelperOs>([
  "windows",
  "macos",
  "linux",
  "chromeos",
  "ios",
  "android",
  "unsure",
]);

export function sanitizeComputerHelperQuery(raw: unknown): {
  ok: true;
  query: string;
} | { ok: false; error: string } {
  if (typeof raw !== "string") {
    return { ok: false, error: "query must be a string" };
  }
  const query = raw.replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (!query) {
    return { ok: false, error: "Enter a computer problem to troubleshoot." };
  }
  if (query.length > MAX_QUERY_LEN) {
    return { ok: false, error: `Keep the problem under ${MAX_QUERY_LEN} characters.` };
  }
  return { ok: true, query };
}

export function sanitizeComputerHelperOs(raw: unknown): {
  ok: true;
  os: HelperOs;
} | { ok: false; error: string } {
  if (typeof raw !== "string" || !OS_IDS.has(raw as HelperOs)) {
    return {
      ok: false,
      error:
        "Select an operating system (Windows, macOS, Linux, ChromeOS, iOS, Android, or Not sure).",
    };
  }
  return { ok: true, os: raw as HelperOs };
}

function asString(v: unknown, fallback = ""): string {
  return typeof v === "string" ? v.trim() : fallback;
}

function parseSteps(raw: unknown): HelperStep[] {
  if (!Array.isArray(raw)) return [];
  const out: HelperStep[] = [];
  for (const item of raw) {
    if (typeof item === "string" && item.trim()) {
      out.push({
        title: item.trim().slice(0, 160),
        detail: "Follow this step carefully on your device; stop if something looks wrong.",
      });
      continue;
    }
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = asString(row.title) || asString(row.name) || asString(row.step);
    const detail =
      asString(row.detail) || asString(row.description) || asString(row.body);
    if (!title) continue;
    out.push({
      title: title.slice(0, 160),
      detail: (detail || "Follow this step carefully on your device.").slice(0, 1200),
    });
  }
  return out;
}

function detectTopicLabel(query: string): string {
  const q = query.toLowerCase();
  if (/\b(wifi|wi-?fi|wireless|internet|network|dns)\b/.test(q)) return "Wi‑Fi / network";
  if (/\b(print|printer|scanner)\b/.test(q)) return "Printer";
  if (/\b(slow|sluggish|lag|freeze|performance)\b/.test(q)) return "Slow device";
  if (/\b(blue.?screen|bsod|crash|won't.?boot)\b/.test(q)) return "Crash / boot";
  if (/\b(update|windows.?update|software.?update)\b/.test(q)) return "Updates";
  if (/\b(password|login|pin|bitlocker|filevault|2fa)\b/.test(q)) return "Password / login";
  if (/\b(email|outlook|gmail)\b/.test(q)) return "Email";
  if (/\b(browser|chrome|safari|firefox|edge)\b/.test(q)) return "Browser";
  if (/\b(sound|audio|microphone|speaker)\b/.test(q)) return "Audio";
  if (/\b(disk|storage|out.?of.?space)\b/.test(q)) return "Storage";
  if (/\b(virus|malware|ransomware|pop-?ups?)\b/.test(q)) return "Malware / pop‑ups";
  if (/\b(monitor|display|screen|hdmi)\b/.test(q)) return "Display";
  return "General troubleshooting";
}

function ensurePlanShape(
  partial: {
    summary: string;
    summarySteps: string[];
    detailedSteps: HelperStep[];
    option2Summary: string;
    option2Steps: HelperStep[];
    topic: string;
  },
  query: string,
  os: HelperOs,
  researchUsed: boolean
): ComputerHelperPlan | null {
  let summarySteps = partial.summarySteps.slice(0, 10);
  let detailedSteps = partial.detailedSteps.slice(0, 10);
  let option2Summary = partial.option2Summary;
  let option2Steps = partial.option2Steps.slice(0, 8);
  let summary = partial.summary;

  if (summarySteps.length === 0 && detailedSteps.length === 0) {
    return null;
  }

  if (summarySteps.length < 5) {
    const padded = [...summarySteps];
    for (const d of detailedSteps) {
      if (padded.length >= 5) break;
      if (d.title) padded.push(d.title.slice(0, 240));
    }
    while (padded.length < 5) {
      padded.push(
        `Recheck the last change on ${HELPER_OS_LABELS[os]}, then retry the original task.`
      );
    }
    summarySteps = padded.slice(0, 10);
  }

  if (detailedSteps.length < summarySteps.length) {
    detailedSteps = [
      ...detailedSteps,
      ...summarySteps.slice(detailedSteps.length).map((title) => ({
        title,
        detail:
          "Follow this step carefully on your device; stop if something looks wrong and seek help.",
      })),
    ];
  } else if (summarySteps.length < detailedSteps.length) {
    summarySteps = [
      ...summarySteps,
      ...detailedSteps.slice(summarySteps.length).map((d) => d.title),
    ].slice(0, 10);
    detailedSteps = detailedSteps.slice(0, summarySteps.length);
  }

  if (detailedSteps.length < 5) {
    return null;
  }

  if (!option2Summary) {
    option2Summary =
      "Try a workaround path: bypass the failing component (different network, app, or reset of just that feature) instead of fixing it in place.";
  }
  if (option2Steps.length < 2) {
    option2Steps = [
      {
        title: "Isolate the failing piece",
        detail: `On ${HELPER_OS_LABELS[os]}, switch to a known-good alternative (another Wi‑Fi, browser, cable, or account) to confirm where the break is.`,
      },
      {
        title: "Apply a targeted reset",
        detail:
          "Reset only that feature or profile (not the whole device). Re-test before changing more settings.",
      },
      ...option2Steps,
    ].slice(0, 6);
  }

  if (!summary) {
    const lead = summarySteps.slice(0, 3).join("; ");
    summary = `Likely a ${partial.topic.toLowerCase()} issue on ${HELPER_OS_LABELS[os]}. Start with: ${lead}.`;
  }

  return {
    query,
    os,
    osLabel: HELPER_OS_LABELS[os],
    summary: summary.slice(0, 600),
    summarySteps: summarySteps.slice(0, 10),
    detailedSteps: detailedSteps.slice(0, 10),
    option2: { summary: option2Summary.slice(0, 400), steps: option2Steps },
    mode: "llm",
    topic: partial.topic,
    researchUsed,
  };
}

function extractJsonObject(text: string): unknown | null {
  const trimmed = text.trim();
  const candidates: string[] = [];
  if (trimmed.startsWith("{")) candidates.push(trimmed);
  const fenced = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
  if (fenced?.[1]) candidates.push(fenced[1].trim());
  const brace = trimmed.match(/\{[\s\S]*\}/);
  if (brace) candidates.push(brace[0]);
  for (const raw of candidates) {
    try {
      return JSON.parse(raw);
    } catch {
      // try next
    }
  }
  return null;
}

function parsePlanJson(
  text: string,
  query: string,
  os: HelperOs,
  researchUsed: boolean
): ComputerHelperPlan | null {
  const data = extractJsonObject(text);
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  let summarySteps = Array.isArray(obj.summarySteps)
    ? obj.summarySteps
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 240))
        .slice(0, 10)
    : [];

  let detailedSteps = parseSteps(obj.detailedSteps).slice(0, 10);
  if (summarySteps.length === 0 && Array.isArray(obj.steps)) {
    summarySteps = obj.steps
      .map((s) => {
        if (typeof s === "string") return s.trim();
        if (s && typeof s === "object") {
          const row = s as Record<string, unknown>;
          return asString(row.title) || asString(row.summary);
        }
        return "";
      })
      .filter(Boolean)
      .slice(0, 10);
  }
  if (detailedSteps.length === 0 && Array.isArray(obj.steps)) {
    detailedSteps = parseSteps(obj.steps).slice(0, 10);
  }

  const option2Raw =
    obj.option2 && typeof obj.option2 === "object"
      ? (obj.option2 as Record<string, unknown>)
      : null;
  const option2Summary = option2Raw ? asString(option2Raw.summary).slice(0, 400) : "";
  const option2Steps = option2Raw ? parseSteps(option2Raw.steps).slice(0, 8) : [];

  const topic = asString(obj.topic).slice(0, 80) || detectTopicLabel(query);

  const summary =
    asString(obj.summary).slice(0, 600) ||
    asString(obj.aiSummary).slice(0, 600) ||
    asString(obj.blurb).slice(0, 600);

  return ensurePlanShape(
    {
      summary,
      summarySteps,
      detailedSteps,
      option2Summary,
      option2Steps,
      topic,
    },
    query,
    os,
    researchUsed
  );
}

function systemPrompt(osLabel: string, today: string): string {
  return [
    "You are Computer Helper for Haven PM Downtown — a calm, practical device troubleshooter.",
    `Today's date: ${today}. Use up-to-date ${osLabel} troubleshooting (menus, Settings paths, apps).`,
    "Return ONLY valid JSON (no markdown fences) with this shape:",
    `{
  "topic": string,
  "summary": string, // 2–4 sentences: plain-language diagnosis of what is likely wrong and what this plan will do
  "summarySteps": string[5..10],
  "detailedSteps": [{ "title": string, "detail": string }], // same count as summarySteps
  "option2": { "summary": string, "steps": [{ "title": string, "detail": string }] } // 2..6 steps
}`,
    "Rules:",
    `- ALL steps MUST be specific to ${osLabel}. Do not give Windows clicks for macOS (or vice versa) unless os is "Not sure" — then give clearly labeled branches.`,
    "- The top-level summary must be a readable blurb (not a restatement of the step list).",
    "- Safe, reversible steps first; warn before destructive actions (wipe/reset).",
    "- No scams, no piracy, no credential stealing advice.",
    "- Prefer official vendor guidance reflected in the research snippets when present.",
    "- Option 2 must be a genuinely different approach (workaround / alternate path), not a restatement.",
    "- Titles short; details 2–4 sentences, concrete taps/clicks/commands for that OS.",
  ].join("\n");
}

export class ComputerHelperLiveError extends Error {
  status: number;
  constructor(message: string, status = 503) {
    super(message);
    this.name = "ComputerHelperLiveError";
    this.status = status;
  }
}

async function callOpenAiJson(
  query: string,
  os: HelperOs,
  researchBlock: string
): Promise<string> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) {
    throw new ComputerHelperLiveError(MISSING_KEY_MSG, 503);
  }
  const model =
    process.env.OPENAI_COMPUTER_HELPER_MODEL?.trim() ||
    process.env.OPENAI_DM_MODEL?.trim() ||
    "gpt-4o-mini";
  const osLabel = HELPER_OS_LABELS[os];
  const today = new Date().toISOString().slice(0, 10);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), OPENAI_TIMEOUT_MS);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 2400,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt(osLabel, today) },
          {
            role: "user",
            content: [
              `Operating system: ${osLabel} (${os})`,
              `Problem: ${query}`,
              "",
              "Live research snippets (may be incomplete; verify against OS UI):",
              researchBlock,
              "",
              "Produce the JSON troubleshooting plan for this OS now, including a clear top-level summary.",
            ].join("\n"),
          },
        ],
      }),
    });
  } catch (err) {
    const aborted =
      err instanceof Error &&
      (err.name === "AbortError" || /aborted/i.test(err.message));
    throw new ComputerHelperLiveError(
      aborted
        ? "Live AI timed out — try again in a moment."
        : "Live AI unreachable — check network and try again.",
      503
    );
  } finally {
    clearTimeout(timer);
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new ComputerHelperLiveError(MISSING_KEY_MSG, 503);
    }
    throw new ComputerHelperLiveError(
      `Live AI request failed (${res.status})${body ? `: ${body.slice(0, 180)}` : ""}`,
      503
    );
  }

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content?.trim();
  if (!content) {
    throw new ComputerHelperLiveError(
      "Live AI returned an empty plan — try again.",
      503
    );
  }
  return content;
}

/**
 * Prefer live OpenAI. If the key is missing or the live call fails, return an
 * offline playbook with summary + steps so the UI is never blank — always set liveError.
 */
export async function generateComputerHelperPlan(
  query: string,
  os: HelperOs
): Promise<ComputerHelperPlan> {
  if (!hasComputerHelperOpenAiKey()) {
    return offlineComputerHelperPlan(query, os, MISSING_KEY_MSG);
  }

  try {
    const osLabel = HELPER_OS_LABELS[os];
    const snippets = await researchComputerHelper(query, osLabel);
    const researchUsed = snippets.length > 0;
    const researchBlock = formatResearchForPrompt(snippets);
    const llmText = await callOpenAiJson(query, os, researchBlock);
    const parsed = parsePlanJson(llmText, query, os, researchUsed);
    if (!parsed) {
      return offlineComputerHelperPlan(
        query,
        os,
        "Live AI returned an incomplete plan — showing curated steps. Try rephrasing for a better live result."
      );
    }
    if (!researchUsed) {
      parsed.note =
        "Live AI plan (research snippets unavailable — model used current-date OS guidance).";
    }
    return parsed;
  } catch (err) {
    const msg =
      err instanceof ComputerHelperLiveError
        ? err.message
        : "Live AI failed unexpectedly.";
    return offlineComputerHelperPlan(query, os, msg);
  }
}
