import { NextRequest, NextResponse } from "next/server";
import { get } from "@vercel/blob";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";
import { isStaffRole } from "@/lib/permissions";
import { isBlobUrl, isLocalUploadUrl, readLocalUpload } from "@/lib/uploads";
import path from "path";

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id } = await params;
  const staff = isStaffRole(session.user.role);

  const photo = await db.maintenancePhoto.findFirst({
    where: {
      id,
      ...(staff
        ? {}
        : { request: { tenant: { userId: session.user.id }, deletedAt: null } }),
    },
    select: { id: true, url: true, caption: true },
  });

  if (!photo) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  try {
    if (isLocalUploadUrl(photo.url)) {
      const file = await readLocalUpload(path.basename(photo.url));
      return new NextResponse(new Uint8Array(file), {
        headers: {
          "Content-Type": "image/jpeg",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    if (isBlobUrl(photo.url)) {
      const result = await get(photo.url, { access: "private" });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      return new NextResponse(result.stream, {
        headers: {
          "Content-Type": result.blob.contentType || "image/jpeg",
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    return NextResponse.redirect(photo.url);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
