/** In-game codex — estimated hours per act for the ~50h campaign. */

import pack from "../../../../data/party-chronicle/codex-hours.json";
import { hoursSummary, TARGET_PLAYTIME_HOURS } from "./campaign";
import { sideQuestHoursSummary } from "./side-quests";
import { encounterDeckStats } from "./encounters";
import { gearCatalogStats } from "./gear";
import { RECIPES } from "./recipes";
import { ANIMAL_ARCS } from "./animal-arcs";
import { FORESHADOW_BEATS } from "./foreshadow";
import { FULL_ENDINGS } from "./endings";

export const CODEX_HOURS = hoursSummary();

export const CODEX_ACT_ROWS = pack.acts;

export const CODEX_LONGEVITY = {
  designSoloHours: pack.designSoloHours as number,
  threePlayerNote: pack.threePlayerMultiplierNote as string,
  systems: pack.longevitySystems as string[],
  sideQuestHours: sideQuestHoursSummary(),
  encounters: encounterDeckStats(),
  gear: gearCatalogStats(),
  recipes: RECIPES.length,
  animalArcs: ANIMAL_ARCS.length,
  foreshadowBeats: FORESHADOW_BEATS.length,
  endings: FULL_ENDINGS.length,
};

export function codexHoursTotal(): number {
  return CODEX_HOURS.totalHours;
}

/** Credible total: authored acts (~50) already include side/encounter budget. */
export function estimatedTotalHours(): {
  actHours: number;
  sideQuestHours: number;
  note: string;
} {
  const actHours = CODEX_HOURS.totalHours;
  const side = sideQuestHoursSummary();
  return {
    actHours,
    sideQuestHours: side.totalHours,
    note:
      "Act table sums to ~50h with side quests, decks, cooking, and animal arcs folded into each act budget. Clearing every side quest can stretch wall-clock toward the high end; 3-player turns multiply further.",
  };
}

export { TARGET_PLAYTIME_HOURS };
