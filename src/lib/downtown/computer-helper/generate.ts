import { detectTopicLabel, offlineComputerHelperPlan } from "./fallback";
import type { ComputerHelperPlan, HelperStep } from "./types";

const MAX_QUERY_LEN = 500;

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

function parsePlanJson(text: string, query: string): ComputerHelperPlan | null {
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

  // Align counts: prefer detailedSteps length; pad summary if needed
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

  return {
    query,
    summarySteps: summaries,
    detailedSteps: details,
    option2: { summary: option2Summary, steps: option2Steps },
    mode: "llm",
    topic: detectTopicLabel(query),
  };
}

function systemPrompt(): string {
  return [
    "You are Computer Helper for Haven PM Downtown — a calm, practical PC/Mac troubleshooter.",
    "Return ONLY valid JSON (no markdown fences) with this shape:",
    `{
  "summarySteps": string[5..10],
  "detailedSteps": [{ "title": string, "detail": string }] // same count as summarySteps,
  "option2": { "summary": string, "steps": [{ "title": string, "detail": string }] } // 2..6 steps
}`,
    "Rules:",
    "- Safe, reversible steps first; warn before destructive actions (wipe/reset).",
    "- No scams, no piracy, no credential stealing advice.",
    "- Cover both Windows and Mac when relevant; call out platform-specific UI.",
    "- Option 2 must be a genuinely different approach (workaround / alternate path), not a restatement.",
    "- Titles short; details 2–4 sentences, concrete clicks/commands.",
  ].join("\n");
}

async function callOpenAiJson(query: string): Promise<string | null> {
  const key = process.env.OPENAI_API_KEY?.trim();
  if (!key) return null;
  const model =
    process.env.OPENAI_COMPUTER_HELPER_MODEL?.trim() ||
    process.env.OPENAI_DM_MODEL?.trim() ||
    "gpt-4o-mini";
  try {
    const res = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${key}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        temperature: 0.4,
        max_tokens: 1800,
        response_format: { type: "json_object" },
        messages: [
          { role: "system", content: systemPrompt() },
          {
            role: "user",
            content: `Computer problem to troubleshoot:\n${query}`,
          },
        ],
      }),
    });
    if (!res.ok) return null;
    const data = (await res.json()) as {
      choices?: { message?: { content?: string } }[];
    };
    return data.choices?.[0]?.message?.content?.trim() || null;
  } catch {
    return null;
  }
}

export async function generateComputerHelperPlan(
  query: string
): Promise<ComputerHelperPlan> {
  const offline = offlineComputerHelperPlan(query);
  const llmText = await callOpenAiJson(query);
  if (!llmText) return offline;
  const parsed = parsePlanJson(llmText, query);
  if (!parsed) {
    return {
      ...offline,
      note: "LLM response incomplete — using offline playbook.",
    };
  }
  return parsed;
}
