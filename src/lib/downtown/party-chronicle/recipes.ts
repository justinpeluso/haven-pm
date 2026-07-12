/**
 * Cooking recipes — campfire longevity for the ~50h campaign.
 * Data pack: data/party-chronicle/recipes.json
 */

import pack from "../../../../data/party-chronicle/recipes.json";
import type { GearTier } from "./types";

export type RecipeDef = {
  id: string;
  name: string;
  blurb: string;
  tier: GearTier;
  actMin: number;
  ingredients: string[];
  heal: number;
  cookBonus: number;
  staminaRestore: number;
  manaRestore: number;
  bondRestore?: number;
  partyHeal?: number;
  flagsAdd?: string[];
  artId: string;
  tags: string[];
};

export const RECIPES: RecipeDef[] = pack.recipes as RecipeDef[];

export const RECIPE_BY_ID: Record<string, RecipeDef> = Object.fromEntries(
  RECIPES.map((r) => [r.id, r])
);

export function getRecipe(id: string): RecipeDef | undefined {
  return RECIPE_BY_ID[id];
}

export function recipesForAct(actNumber: number): RecipeDef[] {
  return RECIPES.filter((r) => r.actMin <= actNumber);
}

export function endingFeastForPath(path: "animal" | "human" | "demon"): RecipeDef | undefined {
  const id =
    path === "animal"
      ? "rec-wild-crown-feast"
      : path === "human"
        ? "rec-hearth-crown-feast"
        : "rec-ash-throne-feast";
  return RECIPE_BY_ID[id];
}
