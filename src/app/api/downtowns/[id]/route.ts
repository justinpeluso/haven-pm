import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getDowntownById,
  getDowntownMetrics,
  getDowntownProfile,
  getUsPeers,
} from "@/lib/downtown";

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const downtown = getDowntownById(id);
  if (!downtown) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const refresh = req.nextUrl.searchParams.get("refresh") === "1";
  const metrics = await getDowntownMetrics(downtown, { refresh });
  const profile = getDowntownProfile(downtown);

  return NextResponse.json({
    downtown: {
      id: downtown.id,
      name: downtown.name,
      state: downtown.state,
      county: downtown.county,
      milesFromAllegheny: downtown.milesFromAllegheny,
      downtownName: downtown.downtownName,
      center: downtown.center,
      radiusM: downtown.radiusM,
      tags: downtown.tags,
    },
    profile,
    metrics,
    peers: getUsPeers(),
    mapUrl: `https://www.openstreetmap.org/#map=16/${downtown.center.lat}/${downtown.center.lng}`,
  });
}
