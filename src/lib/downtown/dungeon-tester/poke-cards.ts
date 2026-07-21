/**
 * Pokémon-structure cards for Dungeon Tester foes + dog.
 * Types + signature moves — Lost Brothers tone, not franchise copy.
 */

import pokePack from "../../../../data/dungeon-tester/poke-cards.json";
import { GEAR_CATALOG, getGear } from "../party-chronicle/gear";
import type { GearItem } from "../party-chronicle/types";
import { getDtGear } from "./gear";

export type DtPokeTypeId =
  | "grit"
  | "chrome"
  | "spirit"
  | "iron"
  | "ash"
  | "silk"
  | "dust"
  | "frost"
  | "venom"
  | "wild"
  | "chain"
  | "helix";

export type DtPokeMoveEffect =
  | "damage"
  | "drain"
  | "stun"
  | "buff"
  | "poison";

export type DtPokeMoveDef = {
  id: string;
  name: string;
  effects: DtPokeMoveEffect[];
  powerMult?: number;
  stunRounds?: number;
  poisonStacks?: number;
  drainPct?: number;
  powerBonus?: number;
  buffRounds?: number;
  blurb?: string;
};

/** Card kinds that use gear-icon art in the poke plate. */
export type DtGearSpiritKind =
  | "weapon"
  | "gear"
  | "item"
  | "armor"
  | "consumable"
  | "trinket";

export type DtPokeCardKind = "foe" | "dog" | DtGearSpiritKind;

const GEAR_SPIRIT_KINDS = new Set<string>([
  "weapon",
  "gear",
  "item",
  "armor",
  "consumable",
  "trinket",
]);

export function isDtGearSpiritKind(
  kind: string | undefined | null
): kind is DtGearSpiritKind {
  return Boolean(kind && GEAR_SPIRIT_KINDS.has(kind));
}

export type DtPokeCardDef = {
  id: string;
  name: string;
  blurb: string;
  artId: string;
  /** foe (default) | dog | weapon / gear / item spirit card */
  kind?: DtPokeCardKind;
  types: DtPokeTypeId[];
  moves: DtPokeMoveDef[];
};

export type DtPokeTypeMeta = {
  label: string;
  color: string;
};

const pack = pokePack as {
  version: number;
  types: Record<string, DtPokeTypeMeta>;
  cards: Record<string, DtPokeCardDef>;
};

export const DT_POKE_TYPES: Record<string, DtPokeTypeMeta> = pack.types ?? {};
export const DT_POKE_CARDS: Record<string, DtPokeCardDef> = pack.cards ?? {};
export const DT_DOG_POKE_CARD_ID = "dog-companion";

export function getDtPokeCard(id: string | undefined | null): DtPokeCardDef | undefined {
  if (!id) return undefined;
  return DT_POKE_CARDS[id];
}

export function getDtDogPokeCard(): DtPokeCardDef {
  return (
    DT_POKE_CARDS[DT_DOG_POKE_CARD_ID] ?? {
      id: DT_DOG_POKE_CARD_ID,
      name: "Trail Hound",
      blurb: "True grit on four legs.",
      artId: "art-dog-companion",
      types: ["grit", "helix"],
      moves: [
        {
          id: "true-grit-bite",
          name: "True Grit Bite",
          effects: ["damage"],
          powerMult: 1.25,
        },
      ],
    }
  );
}

/** Resolve a unit's poke card — dog companion or bestiary foeDefId. */
export function pokeCardForUnit(opts: {
  isDog?: boolean;
  foeDefId?: string;
}): DtPokeCardDef | undefined {
  if (opts.isDog) return getDtDogPokeCard();
  return getDtPokeCard(opts.foeDefId);
}

/** DT catalog → shared getGear → hand-authored Neverworld catalog scan. */
function resolveGearForSpirit(id: string): GearItem | undefined {
  return (
    getDtGear(id) ??
    getGear(id) ??
    GEAR_CATALOG.find((g) => g.id === id)
  );
}

function spiritKindForSlot(slot: GearItem["slot"]): DtGearSpiritKind {
  if (slot === "weapon") return "weapon";
  if (slot === "consumable") return "consumable";
  if (slot === "accessory" || slot === "misc") return "trinket";
  if (
    slot === "head" ||
    slot === "chest" ||
    slot === "hands" ||
    slot === "legs" ||
    slot === "offhand"
  ) {
    return "armor";
  }
  return "gear";
}

function typesForGearItem(item: GearItem): DtPokeTypeId[] {
  const tags = new Set((item.tags ?? []).map((t) => t.toLowerCase()));
  if (
    tags.has("staff") ||
    tags.has("wand") ||
    tags.has("arcane") ||
    tags.has("magic") ||
    tags.has("caster")
  ) {
    return ["spirit", "helix"];
  }
  if (tags.has("firearm") || tags.has("ranged") || tags.has("bow")) {
    return ["dust", "chrome"];
  }
  if (tags.has("heal") || tags.has("support")) return ["silk", "spirit"];
  if (item.slot === "consumable") return ["wild", "grit"];
  if (item.slot !== "weapon") return ["iron", "grit"];
  return ["grit", "dust"];
}

/**
 * Build a spirit plate from catalog gear when poke-cards.json has no entry
 * (starter Neverworld weapons, etc.). Never invent Bare Knuckles for real items.
 */
export function synthesizeGearPokeCard(item: GearItem): DtPokeCardDef {
  const power = Math.max(1, item.power ?? item.armor ?? 3);
  const mult = 0.85 + Math.min(0.55, power / 20);
  const kind = spiritKindForSlot(item.slot);
  const basicName =
    kind === "weapon" ? "Strike" : kind === "consumable" ? "Use" : "Ward";
  return {
    id: item.id,
    name: item.name,
    blurb: item.blurb || item.name,
    artId: item.id,
    kind,
    types: typesForGearItem(item),
    moves: [
      {
        id: `${item.id}-basic`,
        name: basicName,
        effects: ["damage"],
        powerMult: mult,
        blurb: item.blurb,
      },
      {
        id: `${item.id}-focus`,
        name: "Focused Blow",
        effects: ["damage"],
        powerMult: mult + 0.25,
      },
    ],
  };
}

/** Weapon spirit card by gear id (`dt-frontier-revolver`, etc.). */
export function getDtWeaponPokeCard(
  weaponId: string | undefined | null
): DtPokeCardDef | undefined {
  if (!weaponId) return undefined;
  const card = getDtPokeCard(weaponId);
  if (card && (!card.kind || card.kind === "weapon")) {
    return { ...card, kind: "weapon" };
  }
  const item = resolveGearForSpirit(weaponId);
  if (item?.slot === "weapon") {
    const spirit = getDtGearPokeCard(weaponId);
    return spirit ? { ...spirit, kind: "weapon" } : undefined;
  }
  return undefined;
}

/** Any gear spirit card (weapon, armor, consumable, misc) by item id. */
export function getDtGearPokeCard(
  gearId: string | undefined | null
): DtPokeCardDef | undefined {
  if (!gearId) return undefined;
  const card = getDtPokeCard(gearId);
  if (card) {
    if (card.kind !== "foe" && card.kind !== "dog") {
      if (isDtGearSpiritKind(card.kind)) return card;
      // Legacy / untagged dt-* gear plates default to generic gear spirit.
      if (!card.kind && gearId.startsWith("dt-")) {
        return { ...card, kind: "gear" };
      }
    }
  }
  const item = resolveGearForSpirit(gearId);
  if (item) return synthesizeGearPokeCard(item);
  return undefined;
}

/**
 * Museum / tip spirit for a gear id.
 * Bare Knuckles ONLY when `itemId` is empty/unarmed — never for oak-staff etc.
 */
export function resolveDtItemSpiritCard(
  itemId: string | null | undefined
): { item: GearItem | null; card: DtPokeCardDef } {
  if (!itemId || itemId === "dt-unarmed-grit") {
    return { item: null, card: getDtUnarmedPokeCard() };
  }
  const item = resolveGearForSpirit(itemId) ?? null;
  const card =
    getDtGearPokeCard(itemId) ??
    (item ? synthesizeGearPokeCard(item) : undefined);
  if (card) return { item, card };
  return { item: null, card: getDtUnarmedPokeCard() };
}

/** Bare-hands fallback when no weapon equipped. */
export function getDtUnarmedPokeCard(): DtPokeCardDef {
  return (
    DT_POKE_CARDS["dt-unarmed-grit"] ?? {
      id: "dt-unarmed-grit",
      name: "Bare Knuckles",
      blurb: "No steel — just scar tissue and bad decisions.",
      artId: "dt-unarmed-grit",
      kind: "weapon",
      types: ["grit", "dust"],
      moves: [
        {
          id: "knuckle-jab",
          name: "Knuckle Jab",
          effects: ["damage"],
          powerMult: 0.9,
        },
        {
          id: "haymaker",
          name: "Haymaker",
          effects: ["damage", "stun"],
          powerMult: 1.2,
          stunRounds: 1,
        },
      ],
    }
  );
}

export function dtPokeTypeMeta(typeId: string): DtPokeTypeMeta {
  return DT_POKE_TYPES[typeId] ?? { label: typeId, color: "#6a5a4a" };
}

export function dtPokeCardStats() {
  return {
    pokeCards: Object.keys(DT_POKE_CARDS).length,
    pokeTypes: Object.keys(DT_POKE_TYPES).length,
  };
}

/** Rotate through signature moves (prefer specials; skip pure buff sometimes if already buffed). */
export function pickDtPokeMove(
  card: DtPokeCardDef,
  moveCursor: number,
  opts?: { alreadyBuffed?: boolean; rng?: () => number }
): { move: DtPokeMoveDef; nextCursor: number } {
  const moves = card.moves?.length ? card.moves : [];
  if (!moves.length) {
    return {
      move: {
        id: "basic-strike",
        name: "Strike",
        effects: ["damage"],
        powerMult: 1,
      },
      nextCursor: 0,
    };
  }
  const rng = opts?.rng ?? Math.random;
  let idx = moveCursor % moves.length;
  let move = moves[idx]!;
  // If next is a buff and already buffed, skip ahead once.
  if (
    opts?.alreadyBuffed &&
    move.effects.includes("buff") &&
    !move.effects.includes("damage") &&
    moves.length > 1
  ) {
    idx = (idx + 1) % moves.length;
    move = moves[idx]!;
  }
  // Light chaos: 15% chance to jump to a random special instead of strict rotate.
  if (moves.length > 1 && rng() < 0.15) {
    idx = Math.floor(rng() * moves.length);
    move = moves[idx]!;
  }
  return { move, nextCursor: (idx + 1) % moves.length };
}

export function moveEffectSummary(move: DtPokeMoveDef): string {
  const tags: string[] = [];
  if (move.effects.includes("damage")) tags.push("dmg");
  if (move.effects.includes("drain")) tags.push("drain");
  if (move.effects.includes("stun")) tags.push("stun");
  if (move.effects.includes("poison")) tags.push("venom");
  if (move.effects.includes("buff")) tags.push("buff");
  return tags.join(" · ") || "—";
}

/** TCG-style damage numeral from powerMult (null for pure utility). */
export function moveDamageNumber(move: DtPokeMoveDef): number | null {
  const hits =
    move.effects.includes("damage") || move.effects.includes("drain");
  if (!hits) return null;
  const mult = move.powerMult ?? 1;
  const bonus = (move.powerBonus ?? 0) * 8;
  return Math.max(10, Math.round(mult * 40 + bonus));
}

/** Energy pip count (1–3) from move index + weight. */
export function moveEnergyCost(move: DtPokeMoveDef, index: number): number {
  const mult = move.powerMult ?? 1;
  if (index >= 2 || mult >= 1.45) return 3;
  if (index >= 1 || mult >= 1.2 || move.effects.length > 1) return 2;
  return 1;
}

/** Printed HP on spirit / foe plates when live HP isn't supplied. */
export function spiritPowerNumber(card: DtPokeCardDef): number {
  const peak = Math.max(
    1,
    ...card.moves.map((m) => m.powerMult ?? 1),
    1
  );
  let base = 60;
  if (card.kind === "dog") base = 90;
  else if (card.kind === "weapon") base = 70;
  else if (card.kind === "armor") base = 80;
  else if (card.kind === "consumable") base = 40;
  else if (card.kind === "trinket" || card.kind === "item") base = 50;
  else if (card.kind === "foe") base = 75;
  else if (isDtGearSpiritKind(card.kind) || card.id.startsWith("dt-")) base = 55;
  return Math.round(base + peak * 18);
}
