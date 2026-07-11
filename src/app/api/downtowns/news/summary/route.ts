import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getNewsSummary } from "@/lib/downtown/news-summary";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const url = sp.get("url") ?? "";
  if (!url) {
    return NextResponse.json({ error: "url is required" }, { status: 400 });
  }

  try {
    const payload = await getNewsSummary({
      url,
      id: sp.get("id") ?? undefined,
      title: sp.get("title") ?? undefined,
      source: sp.get("source") ?? undefined,
      publishedAt: sp.get("publishedAt"),
      snippet: sp.get("snippet") ?? undefined,
      force: sp.get("force") === "1",
    });
    return NextResponse.json(payload, {
      headers: {
        "Cache-Control": payload.cached ? "private, max-age=300" : "no-store",
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Summary failed";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
