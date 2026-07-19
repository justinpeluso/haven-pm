/**
 * Comic panel / illustration catalog for DungeonTester.
 * Physical plates live under `public/dungeon-tester/` (SVG stubs).
 * Story spine ids (`scene-dt-*`, `art-dt-*`, `splash-dt-*`) alias onto those plates.
 * Neverworld art stays under `party-chronicle/` — do not mix paths.
 */

import { registerExternalEnemyArt } from "@/lib/downtown/party-chronicle/art";
import { getDtBoss, getDtCreature } from "./bestiary";

export type DtArtKind = "scene" | "enemy" | "splash" | "frame" | "portrait";

export type DtArtEntry = {
  id: string;
  kind: DtArtKind;
  label: string;
  /** Relative path under /dungeon-tester/ */
  src: string;
};

/** Concrete SVG plates on disk. */
const PLATES = {
  // scenes
  "dusty-trail": "scenes/dusty-trail.svg",
  "coffle-camp": "scenes/coffle-camp.svg",
  "pine-pass": "scenes/pine-pass.svg",
  "spider-hollow": "scenes/spider-hollow.svg",
  "troll-bridge": "scenes/troll-bridge.svg",
  "orc-warcamp": "scenes/orc-warcamp.svg",
  "ash-pass": "scenes/ash-pass.svg",
  "liberation-fort": "scenes/liberation-fort.svg",
  "moonlit-ridge": "scenes/moonlit-ridge.svg",
  "chain-citadel": "scenes/chain-citadel.svg",
  // enemies
  "orc-skirmisher": "enemies/orc-skirmisher.svg",
  "ash-gut": "enemies/ash-gut.svg",
  "dust-warg": "enemies/dust-warg.svg",
  "night-howler": "enemies/night-howler.svg",
  "trail-webling": "enemies/trail-webling.svg",
  "silk-widow": "enemies/silk-widow.svg",
  "nest-mother": "enemies/nest-mother.svg",
  "bridge-brute": "enemies/bridge-brute.svg",
  "cave-troll": "enemies/cave-troll.svg",
  "ash-cloak": "enemies/ash-cloak.svg",
  "whip-hand": "enemies/whip-hand.svg",
  "coffle-guard": "enemies/coffle-guard.svg",
  "orc-rider": "enemies/orc-rider.svg",
  // splash / chrome
  "splash-ch1": "splash/ch1-trail.svg",
  "splash-ch5": "splash/ch5-ash.svg",
  "splash-finale": "splash/finale-liberation.svg",
  "panel-frame": "panel-frame.svg",
} as const;

type PlateKey = keyof typeof PLATES;

function entry(id: string, kind: DtArtKind, label: string, plate: PlateKey): DtArtEntry {
  return { id, kind, label, src: PLATES[plate] };
}

/** Canonical registry: plate keys + story-spine aliases. */
export const DT_ART: Record<string, DtArtEntry> = {
  // --- Plate ids (legacy / battle helpers) ---
  "scene-dusty-trail": entry("scene-dusty-trail", "scene", "Dusty trail", "dusty-trail"),
  "scene-coffle-camp": entry("scene-coffle-camp", "scene", "Coffle camp", "coffle-camp"),
  "scene-pine-pass": entry("scene-pine-pass", "scene", "Pine pass", "pine-pass"),
  "scene-spider-hollow": entry("scene-spider-hollow", "scene", "Spider hollow", "spider-hollow"),
  "scene-troll-bridge": entry("scene-troll-bridge", "scene", "Troll bridge", "troll-bridge"),
  "scene-orc-warcamp": entry("scene-orc-warcamp", "scene", "Orc warcamp", "orc-warcamp"),
  "scene-ash-pass": entry("scene-ash-pass", "scene", "Ash pass", "ash-pass"),
  "scene-liberation-fort": entry("scene-liberation-fort", "scene", "Liberation fort", "liberation-fort"),
  "scene-moonlit-ridge": entry("scene-moonlit-ridge", "scene", "Moonlit ridge", "moonlit-ridge"),
  "scene-chain-citadel": entry("scene-chain-citadel", "scene", "Chain citadel", "chain-citadel"),

  "enemy-orc-skirmisher": entry("enemy-orc-skirmisher", "enemy", "Thorn-Clan skirmisher", "orc-skirmisher"),
  "enemy-ash-gut": entry("enemy-ash-gut", "enemy", "Ash-Gut raider", "ash-gut"),
  "enemy-dust-warg": entry("enemy-dust-warg", "enemy", "Dust-Trail warg", "dust-warg"),
  "enemy-night-howler": entry("enemy-night-howler", "enemy", "Night-Howler", "night-howler"),
  "enemy-trail-webling": entry("enemy-trail-webling", "enemy", "Trail webling", "trail-webling"),
  "enemy-silk-widow": entry("enemy-silk-widow", "enemy", "Silk Widow", "silk-widow"),
  "enemy-nest-mother": entry("enemy-nest-mother", "enemy", "Nest Mother", "nest-mother"),
  "enemy-bridge-brute": entry("enemy-bridge-brute", "enemy", "Bridge brute", "bridge-brute"),
  "enemy-cave-troll": entry("enemy-cave-troll", "enemy", "Cave troll", "cave-troll"),
  "enemy-ash-cloak": entry("enemy-ash-cloak", "enemy", "Ash-Cloak outrider", "ash-cloak"),
  "enemy-whip-hand": entry("enemy-whip-hand", "enemy", "Whip-Hand", "whip-hand"),
  "enemy-coffle-guard": entry("enemy-coffle-guard", "enemy", "Coffle guard", "coffle-guard"),
  "enemy-orc-rider": entry("enemy-orc-rider", "enemy", "Orc rider", "orc-rider"),

  "splash-ch1-trail": entry("splash-ch1-trail", "splash", "Chapter 1 — Dust Road", "splash-ch1"),
  "splash-ch5-ash": entry("splash-ch5-ash", "splash", "Chapter 5 — Ash Pass", "splash-ch5"),
  "splash-finale-liberation": entry("splash-finale-liberation", "splash", "Finale — Broken Chains", "splash-finale"),
  "frame-panel": entry("frame-panel", "frame", "Comic panel frame", "panel-frame"),

  // --- Story spine scenes ---
  "scene-dt-chain-road": entry("scene-dt-chain-road", "scene", "Chain-Road", "coffle-camp"),
  "scene-dt-dust-and-debt": entry("scene-dt-dust-and-debt", "scene", "Dust and Debt", "dusty-trail"),
  "scene-dt-wanted-mark": entry("scene-dt-wanted-mark", "scene", "Wanted Mark", "pine-pass"),
  "scene-dt-river-of-brands": entry("scene-dt-river-of-brands", "scene", "River of Brands", "troll-bridge"),
  "scene-dt-candlemire-gates": entry("scene-dt-candlemire-gates", "scene", "Candlemire Gates", "liberation-fort"),
  "scene-dt-house-of-collars": entry("scene-dt-house-of-collars", "scene", "House of Collars", "chain-citadel"),
  "scene-dt-blood-mandolin": entry("scene-dt-blood-mandolin", "scene", "Blood Mandolin", "orc-warcamp"),
  "scene-dt-liberation-march": entry("scene-dt-liberation-march", "scene", "Liberation March", "liberation-fort"),
  "scene-dt-free-horizon": entry("scene-dt-free-horizon", "scene", "Free Horizon", "moonlit-ridge"),

  // --- Chapter splashes (chapters.json) ---
  "splash-dt-chain-road": entry("splash-dt-chain-road", "splash", "Chain-Road dawn", "splash-ch1"),
  "splash-dt-dust-and-debt": entry("splash-dt-dust-and-debt", "splash", "Dust and Debt", "dusty-trail"),
  "splash-dt-wanted-mark": entry("splash-dt-wanted-mark", "splash", "Wanted Mark", "pine-pass"),
  "splash-dt-river-of-brands": entry("splash-dt-river-of-brands", "splash", "River of Brands", "troll-bridge"),
  "splash-dt-candlemire-gates": entry("splash-dt-candlemire-gates", "splash", "Candlemire", "liberation-fort"),
  "splash-dt-house-of-collars": entry("splash-dt-house-of-collars", "splash", "House of Collars", "chain-citadel"),
  "splash-dt-blood-mandolin": entry("splash-dt-blood-mandolin", "splash", "Blood Mandolin", "orc-warcamp"),
  "splash-dt-liberation-march": entry("splash-dt-liberation-march", "splash", "Liberation March", "splash-ch5"),
  "splash-dt-free-horizon": entry("splash-dt-free-horizon", "splash", "Free Horizon", "splash-finale"),
};

/** Keyword → plate for the long art-dt-* spine list. */
function artAliasPlate(id: string): PlateKey {
  const k = id.toLowerCase();
  if (/warg|howler|hound|mastiff|wolf|pack|cavalry/.test(k)) return "night-howler";
  if (/dust-warg/.test(k)) return "dust-warg";
  if (/spider|muck|widow|webling|wicker/.test(k)) return "silk-widow";
  if (/troll|arena-troll|barge-troll|brute/.test(k)) return "bridge-brute";
  if (/cave|knuckle/.test(k)) return "cave-troll";
  if (/ash-cloak|shade|memory|spectat|pale|raven/.test(k)) return "ash-cloak";
  if (/whip|overseer|coffle|collar|chain|guard|enforcer|cade|knight|vern|warrant|quill|paid|spy/.test(k)) {
    return "whip-hand";
  }
  if (/rider|outrider|cavalry/.test(k)) return "orc-rider";
  if (/orc|goblin|chainer|mire|toll|elite|warcamp|grin|spear/.test(k)) return "orc-skirmisher";
  if (/horizon|free|liberation|march|ending/.test(k)) return "liberation-fort";
  if (/citadel|house|candlemire|gate|tower/.test(k)) return "chain-citadel";
  if (/bridge|river|brand|toll/.test(k)) return "troll-bridge";
  if (/pine|hill|lowhedge|east|road|campfire|tavern|dust|debt|wanted|mark/.test(k)) return "dusty-trail";
  if (/hollow|spider/.test(k)) return "spider-hollow";
  if (/ash|pass|storm/.test(k)) return "ash-pass";
  if (/mandolin|blood|warcamp/.test(k)) return "orc-warcamp";
  return "dusty-trail";
}

function ensureArt(id: string): DtArtEntry {
  if (DT_ART[id]) return DT_ART[id]!;
  const kind: DtArtKind = id.startsWith("scene-")
    ? "scene"
    : id.startsWith("splash-")
      ? "splash"
      : id.startsWith("enemy-") || id.startsWith("art-dt-")
        ? id.includes("ending") || id.includes("horizon")
          ? "portrait"
          : "enemy"
        : "portrait";
  const plate = artAliasPlate(id);
  const generated = entry(id, kind, id.replace(/^art-dt-|^scene-dt-|^splash-dt-/, ""), plate);
  DT_ART[id] = generated;
  return generated;
}

// Eagerly register known spine art ids so Object.keys(DT_ART) is complete for stats.
const SPINE_ART_IDS = [
  "art-dt-arena-trolls", "art-dt-barge-trolls", "art-dt-blood-mandolin", "art-dt-burning-tower-guards",
  "art-dt-cade-favorites", "art-dt-cade-host", "art-dt-campfire", "art-dt-candlemire-gates",
  "art-dt-chain-cages", "art-dt-chain-road", "art-dt-collar-off", "art-dt-collared-champions",
  "art-dt-dust-and-debt", "art-dt-dust-school", "art-dt-dust-warg", "art-dt-east-road",
  "art-dt-eastwind", "art-dt-elite-orcs", "art-dt-ending-justice", "art-dt-ending-mercy",
  "art-dt-ending-shared", "art-dt-free-horizon", "art-dt-freeman-mark", "art-dt-freemark-bridge",
  "art-dt-gate-guards", "art-dt-goblin-deal", "art-dt-goblin-hills", "art-dt-goblin-spear",
  "art-dt-grin-nail", "art-dt-horizon", "art-dt-house-blades", "art-dt-house-of-collars",
  "art-dt-last-enforcers", "art-dt-liberation-march", "art-dt-lowhedge", "art-dt-lyra-name",
  "art-dt-memory-shades", "art-dt-mire-orcs", "art-dt-muck-spiders", "art-dt-orc-chainer",
  "art-dt-orc-outriders", "art-dt-overseer-orcs", "art-dt-paid-knights", "art-dt-punishment-hounds",
  "art-dt-purse-cutter", "art-dt-quill-drill", "art-dt-quill-hat", "art-dt-river-of-brands",
  "art-dt-road-west", "art-dt-spectating-knights", "art-dt-spy-ravens", "art-dt-storm-wargs",
  "art-dt-tavern-rumor", "art-dt-three-warrants", "art-dt-toll-orcs", "art-dt-vern-caught",
  "art-dt-wanted-mark", "art-dt-war-mastiffs", "art-dt-warg-cavalry", "art-dt-warrant-paper",
  "art-dt-warrant-vern", "art-dt-wicker-sentries",
] as const;

for (const id of SPINE_ART_IDS) ensureArt(id);

const FALLBACK_SCENE = "scene-dusty-trail";
const FALLBACK_ENEMY = "enemy-orc-skirmisher";

export function dtArtSrc(id: string): string {
  const entry = ensureArt(id);
  return `/dungeon-tester/${entry.src}`;
}

export function getDtArt(id: string): DtArtEntry | null {
  return ensureArt(id);
}

/** Resolve encounter / creature artId → public URL under /dungeon-tester/. */
export function dtEnemyArtSrc(enemy: {
  artId?: string;
  enemyArtId?: string;
  name?: string;
  id?: string;
}): string {
  const preferred = enemy.enemyArtId || enemy.artId;
  if (preferred) return dtArtSrc(preferred);

  const key = `${enemy.id ?? ""} ${enemy.name ?? ""}`.toLowerCase();
  if (/warg|howler|wolf|alpha|pack|hound|mastiff|grave-mist|bat swarm/.test(key))
    return dtArtSrc("enemy-night-howler");
  if (/spider|widow|webling|nest|silk|spinner|muck|moth|tickler|dream-tick/.test(key))
    return dtArtSrc("enemy-silk-widow");
  if (/troll|brute|knuckle|hammer|gate|barge|arena|haunt|cold-iron/.test(key))
    return dtArtSrc("enemy-bridge-brute");
  if (/ash-cloak|pale-host|outrider|herald|shade|ash-wisp|coffle shade/.test(key))
    return dtArtSrc("enemy-ash-cloak");
  if (/whip|overseer|coffle|chain|guard|lieutenant|vorn|cade|warrant|quill/.test(key)) {
    return dtArtSrc("enemy-whip-hand");
  }
  if (/rider/.test(key)) return dtArtSrc("enemy-orc-rider");
  if (/orc|ash-gut|thorn|berserker|warlord|captain|goblin|mire|toll/.test(key)) {
    return dtArtSrc("enemy-orc-skirmisher");
  }
  return dtArtSrc(FALLBACK_ENEMY);
}

export function dtSceneArtSrc(sceneId?: string | null): string {
  if (sceneId) return dtArtSrc(sceneId);
  return dtArtSrc(FALLBACK_SCENE);
}

/** Crude battle map pools — chapter/area themes pick a small random plate. */
const SIMPLE_MAP_POOLS: Record<string, PlateKey[]> = {
  "dust-road": ["dusty-trail", "pine-pass", "moonlit-ridge"],
  "chain-yard": ["coffle-camp", "chain-citadel", "liberation-fort"],
  "thorn-hills": ["orc-warcamp", "ash-pass", "pine-pass"],
  cave: ["spider-hollow", "troll-bridge", "ash-pass"],
  swamp: ["spider-hollow", "coffle-camp", "moonlit-ridge"],
  ruins: ["chain-citadel", "liberation-fort", "troll-bridge"],
  forest: ["pine-pass", "dusty-trail", "moonlit-ridge"],
  campfire: ["dusty-trail", "coffle-camp", "orc-warcamp"],
};

export function simpleBattleMapSrc(theme: string, variant = 0): string {
  const pool = SIMPLE_MAP_POOLS[theme] ?? SIMPLE_MAP_POOLS["dust-road"]!;
  const plate = pool[Math.abs(variant) % pool.length]!;
  return `/dungeon-tester/${PLATES[plate]}`;
}

/** Prefer DT plates when looking up foe art (story + simple battle flavor). */
registerExternalEnemyArt((enemy) => {
  const id = enemy.id ?? "";
  const artId = enemy.artId ?? "";
  if (
    getDtCreature(id) ||
    getDtBoss(id) ||
    artId.startsWith("enemy-") ||
    artId.startsWith("art-dt-")
  ) {
    return dtEnemyArtSrc(enemy);
  }
  return null;
});
