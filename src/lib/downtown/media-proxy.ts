/** Allowlisted hosts for the downtown media proxy (no open proxy). */

const PLACEHOLDER = "/downtown-placeholder.svg";

export function isDowntownMediaHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  if (h === "upload.wikimedia.org" || h === "commons.wikimedia.org") return true;
  if (h === "archive.org" || h.endsWith(".archive.org")) return true;
  if (h === "tile.loc.gov") return true;
  if (h === "loc.gov" || h.endsWith(".loc.gov")) return true;
  return false;
}

export function absHttpsUrl(u: string): string {
  if (!u) return PLACEHOLDER;
  if (u.startsWith("//")) return `https:${u}`;
  if (u.startsWith("http://")) return `https://${u.slice(7)}`;
  if (u.startsWith("data:")) return PLACEHOLDER;
  return u;
}

/** Rewrite allowlisted remote https URLs through the same-origin proxy; leave local paths alone. */
export function proxiedDowntownMediaUrl(raw: string | null | undefined): string {
  if (!raw) return PLACEHOLDER;
  const url = absHttpsUrl(raw);
  if (url === PLACEHOLDER) return PLACEHOLDER;
  if (url.startsWith("/")) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol !== "https:") return PLACEHOLDER;
    if (!isDowntownMediaHost(parsed.hostname)) return url;
    return `/api/downtown/media?u=${encodeURIComponent(parsed.toString())}`;
  } catch {
    return PLACEHOLDER;
  }
}

export { PLACEHOLDER as DOWNTOWN_PLACEHOLDER };
