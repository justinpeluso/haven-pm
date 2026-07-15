import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  checkComputerHelperRateLimit,
  ComputerHelperLiveError,
  generateComputerHelperPlan,
  sanitizeComputerHelperOs,
  sanitizeComputerHelperQuery,
} from "@/lib/downtown/computer-helper";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const rateKey = session.user.email || session.user.id || "anon";
  const rate = checkComputerHelperRateLimit(rateKey);
  if (!rate.ok) {
    return NextResponse.json(
      { error: "Too many requests — try again shortly." },
      {
        status: 429,
        headers: { "Retry-After": String(rate.retryAfterSec) },
      }
    );
  }

  let body: { query?: unknown; os?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sanitizedOs = sanitizeComputerHelperOs(body.os);
  if (!sanitizedOs.ok) {
    return NextResponse.json({ error: sanitizedOs.error }, { status: 400 });
  }

  const sanitized = sanitizeComputerHelperQuery(body.query);
  if (!sanitized.ok) {
    return NextResponse.json({ error: sanitized.error }, { status: 400 });
  }

  try {
    const plan = await generateComputerHelperPlan(
      sanitized.query,
      sanitizedOs.os
    );
    return NextResponse.json(plan);
  } catch (err) {
    if (err instanceof ComputerHelperLiveError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    return NextResponse.json(
      { error: "Live AI required — add OPENAI_API_KEY" },
      { status: 503 }
    );
  }
}
