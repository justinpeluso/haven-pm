import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import {
  WORLD_SETTING_KEY,
  createNewWorld,
  mergeIncomingWorld,
  normalizeWorld,
} from "@/lib/downtown/party-chronicle/persist";
import { isDmEmail, slotFromEmail } from "@/lib/downtown/party-chronicle/players";
import type { PartyWorldSave, PlayerSlot } from "@/lib/downtown/party-chronicle/types";
import { PLAYER_SLOT_ORDER } from "@/lib/downtown/party-chronicle/types";

function redactWorld(world: PartyWorldSave, viewerSlot: PlayerSlot | null, isDm: boolean): PartyWorldSave {
  if (isDm) return world;
  const characters = { ...world.characters };
  for (const slot of PLAYER_SLOT_ORDER) {
    if (slot === viewerSlot) continue;
    const c = characters[slot];
    characters[slot] = {
      ...c,
      // Hide private sheets from other players
      inventory: [],
      equipped: {},
      abilities: [],
      hotbar: c.hotbar.map(() => null),
      unlockedNodes: [],
      choiceLog: [],
      flags: [],
      gold: 0,
    };
  }
  return { ...world, characters };
}

async function readWorld(): Promise<PartyWorldSave> {
  const row = await db.setting.findUnique({ where: { key: WORLD_SETTING_KEY } });
  if (!row?.value) return createNewWorld();
  try {
    return normalizeWorld(JSON.parse(row.value) as PartyWorldSave);
  } catch {
    return createNewWorld();
  }
}

async function writeWorldDb(world: PartyWorldSave): Promise<PartyWorldSave> {
  const next = normalizeWorld({ ...world, updatedAt: new Date().toISOString() });
  await db.setting.upsert({
    where: { key: WORLD_SETTING_KEY },
    create: { key: WORLD_SETTING_KEY, value: JSON.stringify(next) },
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
    world: redactWorld(world, slot, isDm),
  });
}

export async function POST(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.user.email ?? "";
  const slot = slotFromEmail(email);
  const isDm = isDmEmail(email);
  const body = (await req.json()) as { world?: PartyWorldSave; reset?: boolean };

  if (body.reset) {
    if (!isDm && slot !== "justin") {
      return NextResponse.json({ error: "Only the DM can reset the chronicle." }, { status: 403 });
    }
    const fresh = await writeWorldDb(createNewWorld());
    return NextResponse.json({ world: redactWorld(fresh, slot, isDm) });
  }

  if (!body.world) {
    return NextResponse.json({ error: "Missing world payload." }, { status: 400 });
  }

  if (!isDm && !slot) {
    return NextResponse.json({ error: "No party slot for this login." }, { status: 403 });
  }

  const existing = await readWorld();
  const merged = mergeIncomingWorld(existing, body.world, slot, isDm);
  const saved = await writeWorldDb(merged);
  return NextResponse.json({ world: redactWorld(saved, slot, isDm) });
}
