/**
 * DungeonTester gear icon catalog — frontier woodcut thumbs under
 * `public/dungeon-tester/gear/`. Every catalog item gets a named plate
 * (or a slot-matched fallback) so Camp / Gear / victory bags always show art.
 */

import { getDtGear } from "./gear";
import type { GearItem } from "../party-chronicle/types";

const GEAR_ICON_DIR = "/dungeon-tester/gear";

/** Item ids with a dedicated plate on disk (filename = `${id}.svg`). */
export const DT_GEAR_ICON_IDS = [
  // weapons
  "dt-frontier-revolver",
  "dt-ranch-carbine",
  "dt-stock-whip",
  "dt-iron-hatchet",
  "dt-orc-cleaver",
  "dt-ashwood-spear",
  "dt-yew-shortbow",
  "dt-moonsteel-saber",
  "dt-ashwood-longbow",
  "dt-ember-staff",
  "dt-bone-drum-cleaver",
  "dt-ash-veil-revolver",
  "dt-wilderland-oathblade",
  // off-hands
  "dt-plank-shield",
  "dt-ironwood-buckler",
  // chest
  "dt-hide-duster",
  "dt-hide-jerkin",
  "dt-ringmail-vest",
  "dt-widow-silk-cloak",
  "dt-bridge-stone-mail",
  // head
  "dt-sun-hat",
  "dt-pale-host-helm",
  "dt-broken-shackle-crown",
  // hands
  "dt-work-gloves",
  "dt-liberation-gauntlets",
  // legs
  "dt-spur-boots",
  "dt-mist-striders",
  "dt-ridge-scale-greaves",
  // accessories
  "dt-copper-spur",
  "dt-chain-scarf",
  "dt-warg-fang-charm",
  "dt-liberators-spur",
  // consumables
  "dt-trail-jerky",
  "dt-dust-poultice",
  "dt-greater-poultice",
  "dt-mana-cider",
] as const;

const ICON_SET = new Set<string>(DT_GEAR_ICON_IDS);

const FALLBACK_BY_SLOT: Partial<Record<GearItem["slot"], string>> = {
  weapon: `${GEAR_ICON_DIR}/_fallback-weapon.svg`,
  offhand: `${GEAR_ICON_DIR}/_fallback-offhand.svg`,
  chest: `${GEAR_ICON_DIR}/_fallback-chest.svg`,
  head: `${GEAR_ICON_DIR}/_fallback-head.svg`,
  hands: `${GEAR_ICON_DIR}/_fallback-hands.svg`,
  legs: `${GEAR_ICON_DIR}/_fallback-legs.svg`,
  accessory: `${GEAR_ICON_DIR}/_fallback-accessory.svg`,
  consumable: `${GEAR_ICON_DIR}/_fallback-consumable.svg`,
};

const FALLBACK_GENERIC = `${GEAR_ICON_DIR}/_fallback-weapon.svg`;

export type DtGearIconOpts = {
  /**
   * When true, only return a src for weapons / off-hands (or known plates).
   * Prefer false so armor / consumables show in bag + gear sheet.
   */
  armsOnly?: boolean;
};

/**
 * Public URL for a gear item's icon.
 * Returns null only when armsOnly and the item is non-arms with no plate.
 */
export function dtGearIconSrc(
  itemId: string | null | undefined,
  opts: DtGearIconOpts = {}
): string | null {
  if (!itemId) return null;

  if (ICON_SET.has(itemId)) {
    return `${GEAR_ICON_DIR}/${itemId}.svg`;
  }

  const item = getDtGear(itemId);
  const isArms = item?.slot === "weapon" || item?.slot === "offhand";

  if (opts.armsOnly && !isArms) return null;

  if (item?.slot && FALLBACK_BY_SLOT[item.slot]) {
    return FALLBACK_BY_SLOT[item.slot]!;
  }

  // Unknown id — still show a plate so the row isn't blank.
  return FALLBACK_GENERIC;
}

export function dtGearHasIcon(itemId: string | null | undefined): boolean {
  return Boolean(dtGearIconSrc(itemId, { armsOnly: false }));
}
