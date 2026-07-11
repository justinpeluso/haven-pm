import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchMortgageRates } from "@/lib/mortgage-rates";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchMortgageRates();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400" },
    });
  } catch {
    return NextResponse.json(
      { error: "Mortgage rates unavailable right now." },
      { status: 502 }
    );
  }
}
