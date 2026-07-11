import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import {
  getInventoryStats,
  listDowntowns,
  regionalVsPeers,
  searchDowntowns,
} from "@/lib/downtown";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const q = searchParams.get("q") ?? "";
  const state = (searchParams.get("state") as "PA" | "OH" | "ALL" | null) ?? "ALL";
  const maxMiles = searchParams.get("maxMiles")
    ? Number(searchParams.get("maxMiles"))
    : undefined;
  const tag = searchParams.get("tag") ?? undefined;
  const sort = searchParams.get("sort") ?? "miles";

  let results = searchDowntowns(listDowntowns(), q, {
    state: state === "ALL" ? "ALL" : state,
    maxMiles,
    tag,
  });

  if (sort === "vibrancy") {
    results = [...results].sort((a, b) => b.baseline.vibrancy - a.baseline.vibrancy);
  } else if (sort === "vacancy") {
    results = [...results].sort(
      (a, b) => a.baseline.vacancyEstimate - b.baseline.vacancyEstimate
    );
  } else if (sort === "name") {
    results = [...results].sort((a, b) => a.name.localeCompare(b.name));
  } else {
    results = [...results].sort((a, b) => a.milesFromAllegheny - b.milesFromAllegheny);
  }

  const stats = getInventoryStats();
  const compare = regionalVsPeers(stats.avgVibrancy, stats.medianVacancy);

  return NextResponse.json({
    stats,
    compare,
    count: results.length,
    downtowns: results.map((d) => ({
      id: d.id,
      name: d.name,
      state: d.state,
      county: d.county,
      milesFromAllegheny: d.milesFromAllegheny,
      downtownName: d.downtownName,
      tags: d.tags,
      vibrancy: d.baseline.vibrancy,
      vacancyEstimate: d.baseline.vacancyEstimate,
      mix: d.baseline.mix,
      poiCount: d.baseline.poiCount,
      dataSource: "baseline" as const,
    })),
  });
}
