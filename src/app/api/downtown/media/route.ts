import { NextRequest, NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { hasPermission } from "@/lib/permissions";
import { isDowntownMediaHost } from "@/lib/downtown/media-proxy";

export const runtime = "nodejs";

const USER_AGENT =
  "HavenPM/1.0 (downtown media proxy; +https://haven-pm.vercel.app; contact: admin@havenpm.com)";
const MAX_BYTES = 12 * 1024 * 1024;
const MAX_REDIRECTS = 5;
const FETCH_TIMEOUT_MS = 20_000;

function badRequest(message: string, status = 400) {
  return NextResponse.json({ error: message }, { status });
}

function parseTarget(raw: string | null): URL | null {
  if (!raw) return null;
  let decoded = raw;
  try {
    decoded = decodeURIComponent(raw);
  } catch {
    /* keep raw */
  }
  try {
    const url = new URL(decoded);
    if (url.protocol !== "https:") return null;
    if (!isDowntownMediaHost(url.hostname)) return null;
    return url;
  } catch {
    return null;
  }
}

async function fetchWithRetry(url: URL): Promise<Response> {
  let current = url;
  for (let hop = 0; hop <= MAX_REDIRECTS; hop++) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), FETCH_TIMEOUT_MS);
    let res: Response;
    try {
      res = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        signal: controller.signal,
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "image/*,*/*;q=0.8",
        },
      });
    } finally {
      clearTimeout(timer);
    }

    if (res.status === 429) {
      await new Promise((r) => setTimeout(r, 400));
      const retry = await fetch(current.toString(), {
        method: "GET",
        redirect: "manual",
        headers: {
          "User-Agent": USER_AGENT,
          Accept: "image/*,*/*;q=0.8",
        },
      });
      if (retry.status === 429) return retry;
      res = retry;
    }

    if ([301, 302, 303, 307, 308].includes(res.status)) {
      const loc = res.headers.get("location");
      if (!loc) return res;
      const next = new URL(loc, current);
      if (next.protocol !== "https:" || !isDowntownMediaHost(next.hostname)) {
        return new Response(null, { status: 502 });
      }
      current = next;
      continue;
    }

    return res;
  }
  return new Response(null, { status: 502 });
}

export async function GET(req: NextRequest) {
  const session = await auth();
  if (!session?.user || !hasPermission(session.user.role, "downtowns:read")) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const target = parseTarget(req.nextUrl.searchParams.get("u"));
  if (!target) return badRequest("Invalid or disallowed media URL");

  try {
    const upstream = await fetchWithRetry(target);
    if (!upstream.ok) {
      return NextResponse.json(
        { error: "Upstream fetch failed", status: upstream.status },
        { status: upstream.status === 404 ? 404 : 502 }
      );
    }

    const contentType = (upstream.headers.get("content-type") || "").toLowerCase();
    if (
      contentType &&
      !contentType.startsWith("image/") &&
      !contentType.includes("octet-stream")
    ) {
      return badRequest("Upstream response is not an image", 415);
    }

    const lenHeader = upstream.headers.get("content-length");
    if (lenHeader && Number(lenHeader) > MAX_BYTES) {
      return badRequest("Image too large", 413);
    }

    const buf = Buffer.from(await upstream.arrayBuffer());
    if (buf.byteLength > MAX_BYTES) {
      return badRequest("Image too large", 413);
    }

    const headers = new Headers();
    headers.set("Content-Type", contentType || "image/jpeg");
    headers.set(
      "Cache-Control",
      "public, max-age=86400, s-maxage=604800, stale-while-revalidate=86400"
    );
    headers.set("X-Content-Type-Options", "nosniff");

    return new NextResponse(buf, { status: 200, headers });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Fetch failed";
    return NextResponse.json({ error: message }, { status: 502 });
  }
}
