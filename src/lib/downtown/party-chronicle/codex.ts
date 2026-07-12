/** In-game codex — estimated hours per act for the ~50h campaign. */

import { hoursSummary, TARGET_PLAYTIME_HOURS } from "./campaign";

export const CODEX_HOURS = hoursSummary();

export function codexHoursTotal(): number {
  return CODEX_HOURS.totalHours;
}

export { TARGET_PLAYTIME_HOURS };
