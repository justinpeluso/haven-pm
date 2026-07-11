import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchPittsburghAirQuality } from "@/lib/air-quality";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const data = await fetchPittsburghAirQuality();
    return NextResponse.json(data, {
      headers: { "Cache-Control": "no-store, max-age=0" },
    });
  } catch {
    return NextResponse.json(
      { error: "Air quality unavailable right now." },
      { status: 502 }
    );
  }
}
