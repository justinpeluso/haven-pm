/**
 * True Grit hero appearance — simple frontier looks for create + battle.
 * Independent of Neverworld class comic plates (those read as odd placeholders).
 */

import type { PlayerSlot } from "@/lib/downtown/party-chronicle/types";

export const DT_SKIN_TONES = ["fair", "tan", "bronze", "deep"] as const;
export type DtSkinTone = (typeof DT_SKIN_TONES)[number];

export const DT_HAIR_STYLES = ["short", "wavy", "long", "braid", "bald"] as const;
export type DtHairStyle = (typeof DT_HAIR_STYLES)[number];

export const DT_HAIR_COLORS = ["black", "brown", "auburn", "blonde", "gray", "white"] as const;
export type DtHairColor = (typeof DT_HAIR_COLORS)[number];

export const DT_OUTFITS = ["duster", "vest", "poncho", "marshal", "trail-coat"] as const;
export type DtOutfit = (typeof DT_OUTFITS)[number];

export const DT_HATS = ["none", "stetson", "bandana", "sun-hat", "hood"] as const;
export type DtHat = (typeof DT_HATS)[number];

export type DtHeroLook = {
  skin: DtSkinTone;
  hair: DtHairStyle;
  hairColor: DtHairColor;
  outfit: DtOutfit;
  hat: DtHat;
};

export const DT_SKIN_HEX: Record<DtSkinTone, string> = {
  fair: "#e8c4a0",
  tan: "#c9956c",
  bronze: "#a06b45",
  deep: "#6b3f28",
};

export const DT_HAIR_HEX: Record<DtHairColor, string> = {
  black: "#1a1512",
  brown: "#4a3020",
  auburn: "#8a3a22",
  blonde: "#c9a86a",
  gray: "#8a8680",
  white: "#e8e4dc",
};

export const DT_OUTFIT_HEX: Record<DtOutfit, { coat: string; trim: string; label: string }> = {
  duster: { coat: "#5c4030", trim: "#2a1c14", label: "Trail duster" },
  vest: { coat: "#3d5a45", trim: "#1e2e24", label: "Range vest" },
  poncho: { coat: "#8b3a2a", trim: "#4a1e16", label: "Dust poncho" },
  marshal: { coat: "#3a4555", trim: "#1a222c", label: "Marshal coat" },
  "trail-coat": { coat: "#6a5a3a", trim: "#3a3020", label: "Trail coat" },
};

export const DT_HAT_LABEL: Record<DtHat, string> = {
  none: "No hat",
  stetson: "Stetson",
  bandana: "Bandana",
  "sun-hat": "Sun hat",
  hood: "Hood",
};

export const DT_HAIR_LABEL: Record<DtHairStyle, string> = {
  short: "Short",
  wavy: "Wavy",
  long: "Long",
  braid: "Braid",
  bald: "Bald",
};

const SLOT_DEFAULTS: Record<PlayerSlot, DtHeroLook> = {
  justin: {
    skin: "tan",
    hair: "short",
    hairColor: "brown",
    outfit: "marshal",
    hat: "stetson",
  },
  rusty: {
    skin: "bronze",
    hair: "wavy",
    hairColor: "auburn",
    outfit: "vest",
    hat: "bandana",
  },
  elisha: {
    skin: "fair",
    hair: "long",
    hairColor: "blonde",
    outfit: "trail-coat",
    hat: "sun-hat",
  },
  eric: {
    skin: "deep",
    hair: "braid",
    hairColor: "black",
    outfit: "duster",
    hat: "hood",
  },
};

function pick<T extends string>(raw: unknown, allowed: readonly T[], fallback: T): T {
  return typeof raw === "string" && (allowed as readonly string[]).includes(raw)
    ? (raw as T)
    : fallback;
}

export function defaultDtHeroLook(slot?: PlayerSlot | null): DtHeroLook {
  if (slot && SLOT_DEFAULTS[slot]) return { ...SLOT_DEFAULTS[slot] };
  return { ...SLOT_DEFAULTS.justin };
}

export function normalizeDtHeroLook(
  raw: unknown,
  slot?: PlayerSlot | null
): DtHeroLook {
  const base = defaultDtHeroLook(slot);
  if (!raw || typeof raw !== "object") return base;
  const o = raw as Partial<DtHeroLook>;
  return {
    skin: pick(o.skin, DT_SKIN_TONES, base.skin),
    hair: pick(o.hair, DT_HAIR_STYLES, base.hair),
    hairColor: pick(o.hairColor, DT_HAIR_COLORS, base.hairColor),
    outfit: pick(o.outfit, DT_OUTFITS, base.outfit),
    hat: pick(o.hat, DT_HATS, base.hat),
  };
}
