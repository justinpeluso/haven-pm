import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { db } from "@/lib/db";

export async function GET(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const unread = request.nextUrl.searchParams.get("unread") === "true";

  if (unread) {
    const count = await db.notification.count({
      where: { userId: session.user.id, isRead: false },
    });
    return NextResponse.json({ count });
  }

  const notifications = await db.notification.findMany({
    where: { userId: session.user.id },
    orderBy: { createdAt: "desc" },
    take: 50,
  });

  return NextResponse.json({ notifications });
}

export async function PATCH(request: NextRequest) {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { id, markAllRead } = await request.json();

  if (markAllRead) {
    await db.notification.updateMany({
      where: { userId: session.user.id, isRead: false },
      data: { isRead: true },
    });
  } else if (id) {
    await db.notification.updateMany({
      where: { id, userId: session.user.id },
      data: { isRead: true },
    });
  }

  return NextResponse.json({ success: true });
}
