import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchPittsburghHousingMarket } from "@/lib/housing-market";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const market = await fetchPittsburghHousingMarket();
    return NextResponse.json(market, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json(
      { error: "Housing market data unavailable right now." },
      { status: 502 }
    );
  }
}
