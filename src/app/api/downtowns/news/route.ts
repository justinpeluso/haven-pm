import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getCbdNews } from "@/lib/downtown/news";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const sp = req.nextUrl.searchParams;
  const q = sp.get("q") ?? "";
  const downtownId = sp.get("downtownId") ?? undefined;
  const state = (sp.get("state") as "ALL" | "PA" | "OH" | null) ?? "ALL";
  const force = sp.get("force") === "1";

  const payload = await getCbdNews({ q, downtownId, state, force });
  return NextResponse.json(payload, {
    headers: {
      "Cache-Control": "no-store",
    },
  });
}
