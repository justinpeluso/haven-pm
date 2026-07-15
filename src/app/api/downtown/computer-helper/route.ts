import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  checkComputerHelperRateLimit,
  generateComputerHelperPlan,
  sanitizeComputerHelperQuery,
} from "@/lib/downtown/computer-helper";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

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

  let body: { query?: unknown } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const sanitized = sanitizeComputerHelperQuery(body.query);
  if (!sanitized.ok) {
    return NextResponse.json({ error: sanitized.error }, { status: 400 });
  }

  const plan = await generateComputerHelperPlan(sanitized.query);
  return NextResponse.json(plan);
}
