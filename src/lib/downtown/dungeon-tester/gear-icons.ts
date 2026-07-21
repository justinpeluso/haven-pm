/**
 * DungeonTester gear icon catalog — frontier woodcut thumbs under
 * `public/dungeon-tester/gear/`. Every catalog item gets a named plate
 * or a category plate so Camp / Gear / poke art windows always show art.
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

/** Collectible art categories (plates live as `_cat-<id>[-n].svg`). */
export type DtGearArtCategory =
  | "blade"
  | "gun"
  | "bow"
  | "axe"
  | "staff"
  | "whip"
  | "polearm"
  | "shield"
  | "armor"
  | "helm"
  | "gloves"
  | "boots"
  | "vial"
  | "food"
  | "trinket"
  | "tool"
  | "cyber"
  | "unarmed";

const CATEGORY_VARIANTS: Record<DtGearArtCategory, number> = {
  blade: 3,
  gun: 2,
  bow: 2,
  axe: 2,
  staff: 2,
  whip: 1,
  polearm: 2,
  shield: 1,
  armor: 2,
  helm: 1,
  gloves: 1,
  boots: 1,
  vial: 2,
  food: 1,
  trinket: 2,
  tool: 2,
  cyber: 2,
  unarmed: 1,
};

const FALLBACK_BY_SLOT: Partial<Record<GearItem["slot"], string>> = {
  weapon: `${GEAR_ICON_DIR}/_cat-blade-0.svg`,
  offhand: `${GEAR_ICON_DIR}/_cat-shield-0.svg`,
  chest: `${GEAR_ICON_DIR}/_cat-armor-0.svg`,
  head: `${GEAR_ICON_DIR}/_cat-helm-0.svg`,
  hands: `${GEAR_ICON_DIR}/_cat-gloves-0.svg`,
  legs: `${GEAR_ICON_DIR}/_cat-boots-0.svg`,
  accessory: `${GEAR_ICON_DIR}/_cat-trinket-0.svg`,
  consumable: `${GEAR_ICON_DIR}/_cat-vial-0.svg`,
  misc: `${GEAR_ICON_DIR}/_cat-tool-0.svg`,
};

const FALLBACK_GENERIC = `${GEAR_ICON_DIR}/_cat-blade-0.svg`;

/** Stable 0..n-1 pick from item id. */
function hashVariant(id: string, n: number): number {
  if (n <= 1) return 0;
  let h = 0;
  for (let i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) >>> 0;
  return h % n;
}

function plateForCategory(
  cat: DtGearArtCategory,
  itemId: string,
  kind: "cat" | "plate" = "cat"
): string {
  const n = CATEGORY_VARIANTS[cat] ?? 1;
  const v = hashVariant(itemId, n);
  const prefix = kind === "plate" ? "_plate" : "_cat";
  return `${GEAR_ICON_DIR}/${prefix}-${cat}-${v}.svg`;
}

/**
 * Infer a collectible art category from slot + tags + name/id.
 * Prefer weapon-family tags so 300 weapons aren't one silhouette.
 */
export function resolveGearArtCategory(
  item: Pick<GearItem, "id" | "name" | "slot" | "tags"> | null | undefined,
  itemId?: string | null
): DtGearArtCategory {
  const id = (item?.id ?? itemId ?? "").toLowerCase();
  const name = (item?.name ?? "").toLowerCase();
  const hay = `${id} ${name}`;
  const tags = new Set((item?.tags ?? []).map((t) => t.toLowerCase()));
  const slot = item?.slot;

  if (id === "dt-unarmed-grit" || /unarmed|bare.?knuckle|fist/.test(hay)) {
    return "unarmed";
  }

  if (slot === "weapon" || tags.has("melee") || tags.has("ranged") || tags.has("firearm")) {
    if (tags.has("firearm") || /revolver|carbine|rifle|pistol|gun|needle-gun|shotgun/.test(hay)) {
      return tags.has("chrome") || tags.has("cyber") || tags.has("neon") ? "cyber" : "gun";
    }
    if (tags.has("bow") || /bow|crossbow/.test(hay)) return "bow";
    if (tags.has("whip") || /whip/.test(hay)) return "whip";
    if (tags.has("staff") || /staff|rod|wand|scepter/.test(hay)) return "staff";
    if (tags.has("axe") || /axe|hatchet|cleaver|maul/.test(hay)) return "axe";
    if (tags.has("reach") || /spear|pike|harpoon|lance|pole|halberd/.test(hay)) {
      return "polearm";
    }
    if (
      tags.has("chrome") ||
      tags.has("cyber") ||
      tags.has("neon") ||
      /chrome|neon|grid|fiber|barcode|coolant/.test(hay)
    ) {
      return "cyber";
    }
    return "blade";
  }

  if (slot === "offhand") {
    if (/tome|focus|lantern|book|grimoire/.test(hay)) return "tool";
    if (tags.has("chrome") || tags.has("cyber")) return "cyber";
    return "shield";
  }

  if (slot === "chest") return "armor";
  if (slot === "head") return "helm";
  if (slot === "hands") return "gloves";
  if (slot === "legs") return "boots";

  if (slot === "consumable") {
    if (tags.has("food") || /jerky|ration|meat|bread|trail/.test(hay)) return "food";
    return "vial";
  }

  if (slot === "accessory") {
    if (tags.has("cyber") || tags.has("cyberware") || /earpiece|chip|implant/.test(hay)) {
      return "cyber";
    }
    return "trinket";
  }

  if (slot === "misc") {
    if (tags.has("cyberware") || tags.has("cyber") || /chip|implant|earpiece|map/.test(hay)) {
      return "cyber";
    }
    if (tags.has("trinket") || /charm|token|badge|locket|amulet|spur|fang/.test(hay)) {
      return "trinket";
    }
    if (tags.has("scrap") || tags.has("quest") || /note|scrap|key|tool|wrench/.test(hay)) {
      return "tool";
    }
    return "trinket";
  }

  // Unknown / no catalog row — guess from id crumbs.
  if (/revolver|carbine|rifle|pistol|gun/.test(hay)) return "gun";
  if (/bow/.test(hay)) return "bow";
  if (/vial|poultice|stim|cider|flask|ampoule|capsule/.test(hay)) return "vial";
  if (/shield|buckler/.test(hay)) return "shield";
  if (/helm|hat|crown/.test(hay)) return "helm";
  if (/boot|greave|strider/.test(hay)) return "boots";
  if (/glove|gauntlet/.test(hay)) return "gloves";
  if (/coat|cloak|mail|jerkin|duster|harness|plate/.test(hay)) return "armor";
  return "blade";
}

export type DtGearIconOpts = {
  /**
   * When true, only return a src for weapons / off-hands (or known plates).
   * Prefer false so armor / consumables show in bag + gear sheet.
   */
  armsOnly?: boolean;
};

/**
 * Public URL for a gear item's icon / art plate.
 * Always returns a plate when armsOnly is false (never empty art window).
 */
export function dtGearIconSrc(
  itemId: string | null | undefined,
  opts: DtGearIconOpts = {}
): string | null {
  if (!itemId) return null;

  if (ICON_SET.has(itemId)) {
    return `${GEAR_ICON_DIR}/${itemId}.svg`;
  }

  // Bare-hands spirit card (not in gear catalog).
  if (itemId === "dt-unarmed-grit") {
    return plateForCategory("unarmed", itemId);
  }

  const item = getDtGear(itemId);
  const isArms = item?.slot === "weapon" || item?.slot === "offhand";

  if (opts.armsOnly && !isArms && !ICON_SET.has(itemId)) return null;

  const cat = resolveGearArtCategory(item, itemId);
  return plateForCategory(cat, itemId);
}

/**
 * Full-bleed collectible art for poke / Gear hero windows.
 * Always uses atmospheric category plates (not tiny named thumbs).
 */
export function getGearArtPlate(itemId: string | null | undefined): string {
  if (!itemId) return `${GEAR_ICON_DIR}/_plate-blade-0.svg`;
  if (itemId === "dt-unarmed-grit") {
    return plateForCategory("unarmed", itemId, "plate");
  }
  const item = getDtGear(itemId);
  const cat = resolveGearArtCategory(item, itemId);
  return plateForCategory(cat, itemId, "plate");
}

/** Category key used for the plate (named icons still report inferred cat). */
export function getGearArtCategory(
  itemId: string | null | undefined
): DtGearArtCategory | null {
  if (!itemId) return null;
  if (itemId === "dt-unarmed-grit") return "unarmed";
  const item = getDtGear(itemId);
  return resolveGearArtCategory(item, itemId);
}

export function dtGearHasIcon(itemId: string | null | undefined): boolean {
  return Boolean(dtGearIconSrc(itemId, { armsOnly: false }));
}
