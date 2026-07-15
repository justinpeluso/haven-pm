import { formatResearchForPrompt, researchComputerHelper } from "./research";
import {
  HELPER_OS_LABELS,
  type ComputerHelperPlan,
  type HelperOs,
  type HelperStep,
} from "./types";

const MAX_QUERY_LEN = 500;

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
      error: "Select an operating system (Windows, macOS, Linux, ChromeOS, iOS, Android, or Not sure).",
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
    if (!item || typeof item !== "object") continue;
    const row = item as Record<string, unknown>;
    const title = asString(row.title);
    const detail = asString(row.detail);
    if (!title || !detail) continue;
    out.push({
      title: title.slice(0, 160),
      detail: detail.slice(0, 1200),
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

function parsePlanJson(
  text: string,
  query: string,
  os: HelperOs,
  researchUsed: boolean
): ComputerHelperPlan | null {
  const trimmed = text.trim();
  const jsonMatch = trimmed.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return null;
  let data: unknown;
  try {
    data = JSON.parse(jsonMatch[0]);
  } catch {
    return null;
  }
  if (!data || typeof data !== "object") return null;
  const obj = data as Record<string, unknown>;

  const summarySteps = Array.isArray(obj.summarySteps)
    ? obj.summarySteps
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .map((s) => s.trim().slice(0, 240))
        .slice(0, 10)
    : [];

  const detailedSteps = parseSteps(obj.detailedSteps).slice(0, 10);

  const option2Raw =
    obj.option2 && typeof obj.option2 === "object"
      ? (obj.option2 as Record<string, unknown>)
      : null;
  const option2Summary = option2Raw ? asString(option2Raw.summary).slice(0, 400) : "";
  const option2Steps = option2Raw ? parseSteps(option2Raw.steps).slice(0, 8) : [];

  if (summarySteps.length < 5 || detailedSteps.length < 5 || !option2Summary || option2Steps.length < 2) {
    return null;
  }

  const n = Math.min(10, Math.max(summarySteps.length, detailedSteps.length));
  const summaries =
    summarySteps.length >= n
      ? summarySteps.slice(0, n)
      : [
          ...summarySteps,
          ...detailedSteps.slice(summarySteps.length, n).map((d) => d.title),
        ];
  const details =
    detailedSteps.length >= summaries.length
      ? detailedSteps.slice(0, summaries.length)
      : [
          ...detailedSteps,
          ...summaries.slice(detailedSteps.length).map((title) => ({
            title,
            detail: "Follow this step carefully; stop if something looks wrong and seek help.",
          })),
        ];

  const topic =
    asString(obj.topic).slice(0, 80) || detectTopicLabel(query);

  return {
    query,
    os,
    osLabel: HELPER_OS_LABELS[os],
    summarySteps: summaries,
    detailedSteps: details,
    option2: { summary: option2Summary, steps: option2Steps },
    mode: "llm",
    topic,
    researchUsed,
  };
}

function systemPrompt(osLabel: string, today: string): string {
  return [
    "You are Computer Helper for Haven PM Downtown — a calm, practical device troubleshooter.",
    `Today's date: ${today}. Use up-to-date ${osLabel} troubleshooting (menus, Settings paths, apps).`,
    "Return ONLY valid JSON (no markdown fences) with this shape:",
    `{
  "topic": string,
  "summarySteps": string[5..10],
  "detailedSteps": [{ "title": string, "detail": string }] // same count as summarySteps,
  "option2": { "summary": string, "steps": [{ "title": string, "detail": string }] } // 2..6 steps
}`,
    "Rules:",
    `- ALL steps MUST be specific to ${osLabel}. Do not give Windows clicks for macOS (or vice versa) unless os is "Not sure" — then give clearly labeled branches.`,
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
    throw new ComputerHelperLiveError(
      "Live AI required — add OPENAI_API_KEY",
      503
    );
  }
  const model =
    process.env.OPENAI_COMPUTER_HELPER_MODEL?.trim() ||
    process.env.OPENAI_DM_MODEL?.trim() ||
    "gpt-4o-mini";
  const osLabel = HELPER_OS_LABELS[os];
  const today = new Date().toISOString().slice(0, 10);

  let res: Response;
  try {
    res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.35,
        max_tokens: 2200,
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
              "Produce the JSON troubleshooting plan for this OS now.",
            ].join("\n"),
          },
        ],
      }),
    });
  } catch {
    throw new ComputerHelperLiveError(
      "Live AI unreachable — check network and try again.",
      503
    );
  }

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    if (res.status === 401 || res.status === 403) {
      throw new ComputerHelperLiveError(
        "Live AI required — add OPENAI_API_KEY",
        503
      );
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

export async function generateComputerHelperPlan(
  query: string,
  os: HelperOs
): Promise<ComputerHelperPlan> {
  if (!process.env.OPENAI_API_KEY?.trim()) {
    throw new ComputerHelperLiveError(
      "Live AI required — add OPENAI_API_KEY",
      503
    );
  }

  const osLabel = HELPER_OS_LABELS[os];
  const snippets = await researchComputerHelper(query, osLabel);
  const researchUsed = snippets.length > 0;
  const researchBlock = formatResearchForPrompt(snippets);
  const llmText = await callOpenAiJson(query, os, researchBlock);
  const parsed = parsePlanJson(llmText, query, os, researchUsed);
  if (!parsed) {
    throw new ComputerHelperLiveError(
      "Live AI returned an incomplete plan — try rephrasing the problem.",
      502
    );
  }
  if (!researchUsed) {
    parsed.note =
      "Live AI plan (research snippets unavailable — model used current-date OS guidance).";
  }
  return parsed;
}
