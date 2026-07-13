import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import {
  answerAsDungeonMaster,
  mergeWorldHint,
  type DmWorldHint,
} from "@/lib/downtown/party-chronicle/dm";
import {
  WORLD_SETTING_KEY,
  normalizeWorld,
} from "@/lib/downtown/party-chronicle/persist";
import type { PartyWorldSave } from "@/lib/downtown/party-chronicle/types";

async function readWorld(): Promise<PartyWorldSave | null> {
  const row = await db.setting.findUnique({ where: { key: WORLD_SETTING_KEY } });
  if (!row?.value) return null;
  try {
    return normalizeWorld(JSON.parse(row.value) as PartyWorldSave);
  } catch {
    return null;
  }
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let body: { message?: string; worldHint?: DmWorldHint } = {};
  try {
    body = (await req.json()) as typeof body;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const message = typeof body.message === "string" ? body.message.trim() : "";
  if (!message) {
    return NextResponse.json({ error: "message required" }, { status: 400 });
  }
  if (message.length > 2000) {
    return NextResponse.json({ error: "message too long" }, { status: 400 });
  }

  const dbWorld = await readWorld();
  const world = mergeWorldHint(dbWorld, body.worldHint);
  if (!world) {
    return NextResponse.json(
      { error: "No campaign save yet — start Neverworld first." },
      { status: 400 }
    );
  }

  const result = await answerAsDungeonMaster(world, message);
  return NextResponse.json(result);
}
