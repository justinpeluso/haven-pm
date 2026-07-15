import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import {
  DT_WORLD_SETTING_KEY,
  createNewDtWorld,
  mergeDtWorld,
  normalizeDtWorld,
  type DtWorldSave,
} from "@/lib/downtown/dungeon-tester";
import { isDmEmail, slotFromEmail } from "@/lib/downtown/party-chronicle/players";

async function readWorld(): Promise<DtWorldSave | null> {
  const row = await db.setting.findUnique({ where: { key: DT_WORLD_SETTING_KEY } });
  if (!row?.value) return null;
  try {
    return normalizeDtWorld(JSON.parse(row.value));
  } catch {
    return null;
  }
}

async function writeWorldDb(world: DtWorldSave): Promise<DtWorldSave> {
  const next = normalizeDtWorld({ ...world, updatedAt: new Date().toISOString() });
  await db.setting.upsert({
    where: { key: DT_WORLD_SETTING_KEY },
    create: { key: DT_WORLD_SETTING_KEY, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

export async function GET() {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.user.email ?? "";
  const slot = slotFromEmail(email);
  const isDm = isDmEmail(email);
  const world = await readWorld();
  return NextResponse.json({
    identity: { email, name: session.user.name ?? null, slot, isDm },
    hasSave: !!world,
    world,
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.user.email ?? "";
  const slot = slotFromEmail(email);
  const isDm = isDmEmail(email) || session.user.role === UserRole.ADMINISTRATOR;
  const body = (await req.json()) as { world?: DtWorldSave; reset?: boolean };

  if (body.reset) {
    if (!isDm && slot !== "justin") {
      return NextResponse.json({ error: "Only the DM can reset DungeonTester." }, { status: 403 });
    }
    const fresh = await writeWorldDb(createNewDtWorld());
    return NextResponse.json({ world: fresh, hasSave: true });
  }

  if (!body.world) {
    return NextResponse.json({ error: "Missing world payload." }, { status: 400 });
  }

  if (!isDm && !slot) {
    return NextResponse.json({ error: "No party slot for this login." }, { status: 403 });
  }

  const existing = (await readWorld()) ?? createNewDtWorld();
  const merged = mergeDtWorld(existing, normalizeDtWorld(body.world), slot, isDm);
  const saved = await writeWorldDb(merged);
  return NextResponse.json({ world: saved, hasSave: true });
}
