/**
 * Night ambush pool — rolled when sleeping at camp (~40% chance).
 */
import { DT_CREATURES, getDtCreature, type DtCreatureDef } from "./bestiary";

/** Chance a successful camp sleep triggers a night creature fight. */
export const NIGHT_AMBUSH_CHANCE = 0.4;

const NIGHT_IDS = [
  "pale-ember-moth",
  "grave-mist-hound",
  "camp-thief-gremlin",
  "moon-silk-spinner",
  "ash-wisp-stalker",
  "coffle-shade",
  "ridge-bat-swarm",
  "dream-tickler",
  "night-howler-lurker",
  "cold-iron-haunt",
] as const;

export type NightCreatureId = (typeof NIGHT_IDS)[number];

export function listNightCreatures(): DtCreatureDef[] {
  return NIGHT_IDS.map((id) => getDtCreature(id)).filter(
    (c): c is DtCreatureDef => !!c
  );
}

/** Weighted pick from the night pool (falls back to any `night`-tagged creature). */
export function rollNightCreature(rng: () => number = Math.random): DtCreatureDef {
  const pool = listNightCreatures();
  const tagged =
    pool.length > 0
      ? pool
      : DT_CREATURES.filter((c) => c.tags.includes("night"));
  if (!tagged.length) {
    return (
      DT_CREATURES[0] ?? {
        id: "night-howler-lurker",
        name: "Night-Howler",
        blurb: "Something moves beyond the firelight.",
        levelMin: 1,
        levelMax: 99,
        hp: 28,
        power: 6,
        armor: 1,
        xp: 16,
        gold: 6,
        tags: ["night"],
        artId: "enemy-night-howler",
        weight: 1,
        lootPool: "common",
      }
    );
  }
  const total = tagged.reduce((s, e) => s + (e.weight ?? 1), 0);
  let tick = rng() * total;
  for (const e of tagged) {
    tick -= e.weight ?? 1;
    if (tick <= 0) return e;
  }
  return tagged[tagged.length - 1]!;
}

export function isNightCreatureId(id: string): boolean {
  return (NIGHT_IDS as readonly string[]).includes(id) || !!getDtCreature(id)?.tags.includes("night");
}
