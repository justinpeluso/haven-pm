import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { getDowntownById } from "@/lib/downtown";
import { getImagesForDowntown, listGalleryCards, searchGalleryCards } from "@/lib/downtown/gallery";

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { searchParams } = req.nextUrl;
  const id = searchParams.get("id");
  const q = searchParams.get("q") ?? "";
  const state = (searchParams.get("state") as "ALL" | "PA" | "OH" | null) ?? "ALL";
  const withImages = searchParams.get("images") === "1";
  const idsParam = searchParams.get("ids");

  // Batch images for compare / lazy cards
  if (idsParam) {
    const ids = idsParam.split(",").map((s) => s.trim()).filter(Boolean).slice(0, 4);
    const results = [];
    for (const downtownId of ids) {
      const d = getDowntownById(downtownId);
      if (!d) continue;
      const images = await getImagesForDowntown(d);
      results.push({
        id: d.id,
        name: d.name,
        state: d.state,
        county: d.county,
        downtownName: d.downtownName,
        milesFromAllegheny: d.milesFromAllegheny,
        vibrancy: d.baseline.vibrancy,
        vacancyEstimate: d.baseline.vacancyEstimate,
        images,
      });
    }
    return NextResponse.json({ downtowns: results });
  }

  if (id) {
    const d = getDowntownById(id);
    if (!d) return NextResponse.json({ error: "Not found" }, { status: 404 });
    const images = await getImagesForDowntown(d);
    return NextResponse.json({
      id: d.id,
      name: d.name,
      state: d.state,
      downtownName: d.downtownName,
      images,
    });
  }

  const cards = searchGalleryCards(listGalleryCards(), q, state);
  if (!withImages) {
    return NextResponse.json({ count: cards.length, downtowns: cards });
  }

  // Only enrich a page of results to avoid hammering Commons
  const page = cards.slice(0, 24);
  const enriched = [];
  for (const card of page) {
    const d = getDowntownById(card.id);
    if (!d) continue;
    enriched.push({ ...card, images: await getImagesForDowntown(d) });
  }

  return NextResponse.json({ count: cards.length, downtowns: enriched });
}
