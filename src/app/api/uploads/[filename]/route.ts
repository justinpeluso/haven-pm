import { readFile } from "fs/promises";
import path from "path";
import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaffRole } from "@/lib/permissions";

const UPLOAD_DIR = process.env.UPLOAD_DIR || "./uploads";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ filename: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { filename } = await params;
  const safeName = path.basename(filename);
  if (!safeName || safeName.includes("..")) {
    return NextResponse.json({ error: "Invalid file" }, { status: 400 });
  }

  const url = `/api/uploads/${safeName}`;
  const staff = isStaffRole(session.user.role);

  if (!staff) {
    const document = await db.document.findFirst({
      where: {
        url,
        deletedAt: null,
        tenant: { userId: session.user.id },
      },
      select: { id: true },
    });

    const allowed =
      document ||
      (await db.maintenancePhoto.findFirst({
        where: {
          url,
          request: { tenant: { userId: session.user.id }, deletedAt: null },
        },
        select: { id: true },
      })) ||
      (await db.maintenanceAttachment.findFirst({
        where: {
          url,
          request: { tenant: { userId: session.user.id }, deletedAt: null },
        },
        select: { id: true },
      }));

    if (!allowed) {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }
  }

  const filePath = path.join(process.cwd(), UPLOAD_DIR, safeName);

  try {
    const file = await readFile(filePath);
    const ext = path.extname(safeName).toLowerCase();
    const mimeTypes: Record<string, string> = {
      ".pdf": "application/pdf",
      ".jpg": "image/jpeg",
      ".jpeg": "image/jpeg",
      ".png": "image/png",
      ".gif": "image/gif",
      ".webp": "image/webp",
    };

    return new NextResponse(file, {
      headers: {
        "Content-Type": mimeTypes[ext] || "application/octet-stream",
        "Cache-Control": "private, max-age=3600",
      },
    });
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
