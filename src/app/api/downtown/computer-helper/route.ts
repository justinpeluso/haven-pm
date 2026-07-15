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
    // Live or labeled offline — always a renderable plan (never blank 200).
    if (
      !plan?.summary?.trim() ||
      !plan.summarySteps?.length ||
      !plan.detailedSteps?.length ||
      !plan.option2?.summary
    ) {
      return NextResponse.json(
        {
          error:
            "Could not build a troubleshooting plan. Set OPENAI_API_KEY in Vercel (or .env) and try again.",
        },
        { status: 502 }
      );
    }
    return NextResponse.json(plan);
  } catch (err) {
    if (err instanceof ComputerHelperLiveError) {
      return NextResponse.json({ error: err.message }, { status: err.status });
    }
    console.error("[computer-helper]", err);
    return NextResponse.json(
      {
        error:
          "Computer Helper failed unexpectedly. If this persists, check OPENAI_API_KEY in Vercel → Settings → Environment Variables and try again.",
      },
      { status: 500 }
    );
  }
}
