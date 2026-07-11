import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getDowntownById } from "@/lib/downtown";
import {
  getCachedImagesForDowntown,
  listGalleryCards,
  searchGalleryCards,
} from "@/lib/downtown/gallery";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const q = searchParams.get("q") ?? "";
  const state = (searchParams.get("state") as "ALL" | "PA" | "OH" | null) ?? "ALL";
  const idsParam = searchParams.get("ids");

  if (idsParam) {
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
    const results = [];
    for (const downtownId of ids) {
      const d = getDowntownById(downtownId);
      if (!d) continue;
      results.push({
        id: d.id,
        name: d.name,
        state: d.state,
        county: d.county,
        downtownName: d.downtownName,
        milesFromAllegheny: d.milesFromAllegheny,
        vibrancy: d.baseline.vibrancy,
        vacancyEstimate: d.baseline.vacancyEstimate,
        images: getCachedImagesForDowntown(d.id),
      });
    }
    return NextResponse.json({ downtowns: results });
  }

  if (id) {
    const d = getDowntownById(id);
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
    return NextResponse.json({
      id: d.id,
      name: d.name,
      state: d.state,
      downtownName: d.downtownName,
      images: getCachedImagesForDowntown(d.id),
    });
  }

  const cards = searchGalleryCards(listGalleryCards(), q, state);
  return NextResponse.json({ count: cards.length, downtowns: cards });
}
