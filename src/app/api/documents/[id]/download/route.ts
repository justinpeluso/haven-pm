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

  const document = await db.document.findFirst({
    where: {
      id,
      deletedAt: null,
      ...(staff ? {} : { tenant: { userId: session.user.id } }),
    },
    select: { id: true, url: true, mimeType: true, fileName: true, name: true },
  });

  if (!document) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const disposition = `inline; filename="${(document.fileName || document.name).replace(/"/g, "")}"`;

  try {
    if (isLocalUploadUrl(document.url)) {
      const filename = path.basename(document.url);
      const file = await readLocalUpload(filename);
      return new NextResponse(new Uint8Array(file), {
        headers: {
          "Content-Type": document.mimeType || "application/octet-stream",
          "Content-Disposition": disposition,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    if (isBlobUrl(document.url)) {
      const result = await get(document.url, { access: "private" });
      if (!result || result.statusCode !== 200 || !result.stream) {
        return NextResponse.json({ error: "File not found" }, { status: 404 });
      }
      return new NextResponse(result.stream, {
        headers: {
          "Content-Type":
            result.blob.contentType ||
            document.mimeType ||
            "application/octet-stream",
          "Content-Disposition": disposition,
          "Cache-Control": "private, max-age=3600",
        },
      });
    }

    return NextResponse.redirect(document.url);
  } catch {
    return NextResponse.json({ error: "File not found" }, { status: 404 });
  }
}
