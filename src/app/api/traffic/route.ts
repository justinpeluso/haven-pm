import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { fetchPittsburghTraffic } from "@/lib/traffic";

export const dynamic = "force-dynamic";

export async function GET() {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const traffic = await fetchPittsburghTraffic();
    return NextResponse.json(traffic, {
      headers: {
        "Cache-Control": "no-store, max-age=0",
      },
    });
  } catch {
    return NextResponse.json(
      { error: "Traffic data unavailable right now." },
      { status: 502 }
    );
  }
}
