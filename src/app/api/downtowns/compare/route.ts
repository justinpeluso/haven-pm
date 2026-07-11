import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getInventoryStats, regionalVsPeers } from "@/lib/downtown";

export async function GET() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stats = getInventoryStats();
  return NextResponse.json(regionalVsPeers(stats.avgVibrancy, stats.medianVacancy));
}
