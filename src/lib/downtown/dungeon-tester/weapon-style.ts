/**
 * Weapon combat style — maps gear tags/names to melee / ranged / magic / support
 * and the primary scaling attribute for each style.
 */

import type { GearItem } from "../party-chronicle/types";

export type WeaponStyle = "melee" | "ranged" | "magic" | "support";

export type WeaponScalingStat =
  | "strength"
  | "dexterity"
  | "intelligence"
  | "wisdom";

type StyleSource = Pick<GearItem, "id" | "name" | "tags" | "slot">;

const STYLE_SCALING: Record<WeaponStyle, WeaponScalingStat> = {
  melee: "strength",
  ranged: "dexterity",
  magic: "intelligence",
  support: "wisdom",
};

function haystack(item: StyleSource): { hay: string; tags: Set<string> } {
  const id = (item.id ?? "").toLowerCase();
  const name = (item.name ?? "").toLowerCase();
  const hay = `${id} ${name}`;
  const tags = new Set((item.tags ?? []).map((t) => t.toLowerCase()));
  return { hay, tags };
}

function isSupport(hay: string, tags: Set<string>): boolean {
  if (tags.has("support") || tags.has("heal") || tags.has("buff") || tags.has("ward")) {
    return true;
  }
  // Name cues — keep tight so "Choir Drum Shiv" / "Lantern Jar Blade" stay melee.
  return /\b(heal|healing|healer|buff|support|warding|restore|sanctuary|bless)\b/.test(
    hay
  );
}

function isRanged(hay: string, tags: Set<string>): boolean {
  if (tags.has("firearm") || tags.has("bow") || tags.has("ranged")) return true;
  return /revolver|carbine|rifle|pistol|shotgun|needle-gun|\bgun\b|crossbow|\bbow\b/.test(
    hay
  );
}

function isMagic(hay: string, tags: Set<string>): boolean {
  if (tags.has("staff") || tags.has("wand") || tags.has("magic") || tags.has("caster")) {
    return true;
  }
  if (/\b(staff|wand|scepter|sceptre|rod|grimoire|arcane|spell)\b/.test(hay)) {
    return true;
  }
  // Chrome / neon caster vibes (not firearms — those already resolved as ranged).
  // Word boundaries matter: "witch" must not match inside "switchblade".
  const chromeCaster =
    tags.has("chrome") ||
    tags.has("neon") ||
    tags.has("cyber") ||
    /\b(chrome|neon|cyber|fiber|barcode|coolant|grid)\b/.test(hay);
  if (
    chromeCaster &&
    /\b(focus|tome|orb|cane|baton|channel|caster|mage|witch|sorcer)\b/.test(hay)
  ) {
    return true;
  }
  return false;
}

/**
 * Infer combat style from weapon tags and name.
 * Priority: support → ranged → magic → melee (default).
 */
export function resolveWeaponStyle(item: StyleSource): WeaponStyle {
  const { hay, tags } = haystack(item);

  if (isSupport(hay, tags)) return "support";
  if (isRanged(hay, tags)) return "ranged";
  if (isMagic(hay, tags)) return "magic";

  // Explicit melee family tags (whip / blade / axe) or default weapon.
  if (
    tags.has("melee") ||
    tags.has("whip") ||
    tags.has("axe") ||
    tags.has("blade") ||
    /whip|blade|saber|sword|axe|hatchet|cleaver|maul|knife|dagger|spear|pike|lance|halberd|gauntlet|fist|unarmed/.test(
      hay
    )
  ) {
    return "melee";
  }

  return "melee";
}

/** Primary attribute used when a weapon of this style deals damage / effects. */
export function scalingStatForStyle(style: WeaponStyle): WeaponScalingStat {
  return STYLE_SCALING[style];
}
