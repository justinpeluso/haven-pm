/**
 * DungeonTester — shell (persist/story/engine/battle) + content packs (art/encounters/gear/bestiary).
 */

export * from "./types";
export * from "./persist";
export * from "./story";
export * from "./engine";
export * from "./simple-battle";
export * from "./battle";
export * from "./camp";
export * from "./loadout";
export * from "./art";
export * from "./encounters";
export * from "./bestiary";
export * from "./gear";
export * from "./gear-display";
export * from "./gear-icons";
export * from "./look";
export * from "./dog";

import { DT_ART } from "./art";
import { dtEncounterStats } from "./encounters";
import { dtBestiaryStats } from "./bestiary";
import { dtGearStats } from "./gear";
import { DT_GEAR_ICON_IDS } from "./gear-icons";

export function dungeonTesterPackStats() {
  return {
    ...dtEncounterStats(),
    ...dtBestiaryStats(),
    ...dtGearStats(),
    artEntries: Object.keys(DT_ART).length,
    gearIcons: DT_GEAR_ICON_IDS.length,
  };
}
