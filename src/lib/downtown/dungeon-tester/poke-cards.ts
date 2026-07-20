/**
 * Pokémon-structure cards for Dungeon Tester foes + dog.
 * Types + signature moves — Lost Brothers tone, not franchise copy.
 */

import pokePack from "../../../../data/dungeon-tester/poke-cards.json";

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

export type DtPokeCardDef = {
  id: string;
  name: string;
  blurb: string;
  artId: string;
  /** foe (default) | dog | weapon spirit card */
  kind?: "foe" | "dog" | "weapon";
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

/** Weapon spirit card by gear id (`dt-frontier-revolver`, etc.). */
export function getDtWeaponPokeCard(
  weaponId: string | undefined | null
): DtPokeCardDef | undefined {
  if (!weaponId) return undefined;
  const card = getDtPokeCard(weaponId);
  if (!card) return undefined;
  return { ...card, kind: card.kind ?? "weapon" };
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
