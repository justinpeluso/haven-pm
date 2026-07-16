import { UserRole } from "@prisma/client";
import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { hasPermission } from "@/lib/permissions";
import {
  DT_DEFAULT_SLOT_ID,
  DT_LEGACY_WORLD_SETTING_KEY,
  DT_SLOT_IDS,
  createNewDtWorld,
  dtWorldSettingKey,
  isDtSaveSlotId,
  mergeDtWorld,
  normalizeDtWorld,
  parseDtSaveSlotId,
  summarizeDtWorld,
  type DtSaveSlotId,
  type DtSlotSummary,
  type DtWorldSave,
} from "@/lib/downtown/dungeon-tester";
import { isDmEmail, slotFromEmail } from "@/lib/downtown/party-chronicle/players";

async function readSettingJson(key: string): Promise<unknown | null> {
  const row = await db.setting.findUnique({ where: { key } });
  if (!row?.value) return null;
  try {
    return JSON.parse(row.value);
  } catch {
    return null;
  }
}

async function writeWorldDb(slotId: DtSaveSlotId, world: DtWorldSave): Promise<DtWorldSave> {
  const next = normalizeDtWorld({ ...world, updatedAt: new Date().toISOString() });
  const key = dtWorldSettingKey(slotId);
  await db.setting.upsert({
    where: { key },
    create: { key, value: JSON.stringify(next) },
    update: { value: JSON.stringify(next) },
  });
  return next;
}

async function deleteWorldDb(slotId: DtSaveSlotId): Promise<void> {
  const key = dtWorldSettingKey(slotId);
  try {
    await db.setting.delete({ where: { key } });
  } catch {
    /* missing ok */
  }
}

/** Migrate legacy single-world key into slot 1 once. */
async function migrateLegacyWorld(): Promise<void> {
  const slot1Key = dtWorldSettingKey("1");
  const existing = await db.setting.findUnique({ where: { key: slot1Key } });
  if (existing?.value) return;
  const legacy = await readSettingJson(DT_LEGACY_WORLD_SETTING_KEY);
  if (!legacy) return;
  const world = normalizeDtWorld(legacy);
  await writeWorldDb("1", world);
}

async function readWorld(slotId: DtSaveSlotId): Promise<DtWorldSave | null> {
  await migrateLegacyWorld();
  const raw = await readSettingJson(dtWorldSettingKey(slotId));
  if (!raw) return null;
  return normalizeDtWorld(raw);
}

async function listSlotSummaries(): Promise<DtSlotSummary[]> {
  await migrateLegacyWorld();
  const out: DtSlotSummary[] = [];
  for (const id of DT_SLOT_IDS) {
    const world = await readWorld(id);
    out.push(summarizeDtWorld(id, world));
  }
  return out;
}

export async function GET(req: Request) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }
  const email = session.user.email ?? "";
  const slot = slotFromEmail(email);
  const isDm = isDmEmail(email);
  const url = new URL(req.url);
  const slotId = parseDtSaveSlotId(url.searchParams.get("slot") ?? DT_DEFAULT_SLOT_ID);
  const world = await readWorld(slotId);
  const slots = await listSlotSummaries();
  return NextResponse.json({
    identity: { email, name: session.user.name ?? null, slot, isDm },
    activeSlotId: slotId,
    slots,
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
  const seat = slotFromEmail(email);
  const isDm = isDmEmail(email) || session.user.role === UserRole.ADMINISTRATOR;
  const body = (await req.json()) as {
    world?: DtWorldSave;
    reset?: boolean;
    deleteSlot?: boolean;
    slotId?: string;
  };

  const slotId = parseDtSaveSlotId(body.slotId ?? DT_DEFAULT_SLOT_ID);
  if (body.slotId != null && !isDtSaveSlotId(body.slotId)) {
    return NextResponse.json({ error: "Invalid save slot." }, { status: 400 });
  }

  if (body.deleteSlot) {
    if (!isDm && seat !== "justin") {
      return NextResponse.json(
        { error: "Only the DM can delete a True Grit save slot." },
        { status: 403 }
      );
    }
    await deleteWorldDb(slotId);
    const slots = await listSlotSummaries();
    return NextResponse.json({
      world: null,
      hasSave: false,
      activeSlotId: slotId,
      slots,
      deleted: true,
    });
  }

  if (body.reset) {
    if (!isDm && seat !== "justin") {
      return NextResponse.json(
        { error: "Only the DM can reset a True Grit save slot." },
        { status: 403 }
      );
    }
    const fresh = await writeWorldDb(slotId, createNewDtWorld());
    const slots = await listSlotSummaries();
    return NextResponse.json({ world: fresh, hasSave: true, activeSlotId: slotId, slots });
  }

  if (!body.world) {
    return NextResponse.json({ error: "Missing world payload." }, { status: 400 });
  }

  if (!isDm && !seat) {
    return NextResponse.json({ error: "No party seat for this login." }, { status: 403 });
  }

  const existing = (await readWorld(slotId)) ?? createNewDtWorld();
  const merged = mergeDtWorld(existing, normalizeDtWorld(body.world), seat, isDm);
  const saved = await writeWorldDb(slotId, merged);
  const slots = await listSlotSummaries();
  return NextResponse.json({ world: saved, hasSave: true, activeSlotId: slotId, slots });
}
