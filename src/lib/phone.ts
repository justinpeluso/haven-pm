/** Phone helpers + OpenPhone / Quo compose deep links */

export function phoneDigits(phone: string | null | undefined): string {
  if (!phone) return "";
  return phone.replace(/[^\d]/g, "");
}

/** Format as (412) 555-0100 when possible */
export function formatPhone(phone: string | null | undefined): string {
  if (!phone) return "—";
  const d = phoneDigits(phone);
  if (d.length === 10) {
    return `(${d.slice(0, 3)}) ${d.slice(3, 6)}-${d.slice(6)}`;
  }
  if (d.length === 11 && d.startsWith("1")) {
    return `(${d.slice(1, 4)}) ${d.slice(4, 7)}-${d.slice(7)}`;
  }
  return phone;
}

/**
 * Opens Quo / OpenPhone message composer to `toPhone`.
 * Uses openphone:// deep link (works with Quo mobile + desktop apps).
 * `fromPhone` should be your OpenPhone business number when available.
 */
export function openPhoneMessageHref(
  toPhone: string,
  fromPhone?: string | null
): string {
  const to = phoneDigits(toPhone);
  if (!to) return "#";

  const params = new URLSearchParams();
  params.set("number", to);
  const from = phoneDigits(fromPhone || "");
  if (from) params.set("from", from);

  return `openphone://message?${params.toString()}`;
}

/** Demo Pittsburgh-area fake numbers: (412) 555-0xxx */
export function demoPittsburghPhone(suffix: number): string {
  const n = Math.max(0, Math.min(9999, suffix));
  return `(412) 555-${String(n).padStart(4, "0")}`;
}
