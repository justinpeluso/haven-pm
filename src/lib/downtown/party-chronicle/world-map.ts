/**
 * Chunk-based procedural Neverworld overworld.
 * Deterministic from exploreSeed — neighbors generate as the party walks.
 */

export const CHUNK_SIZE = 16;
/** Visible half-extent around the party (odd grid ≈ 15×15). */
export const MAP_VIEW_RADIUS = 7;
/** Max A* path length for a click. */
export const MAX_PATH_STEPS = 14;

export const BIOME_IDS = [
  "grassland",
  "forest",
  "desert",
  "snow",
  "ice",
  "mountain",
  "cave",
  "river",
  "ocean",
  "autumn",
  "summer",
  "swamp",
] as const;

export type BiomeId = (typeof BIOME_IDS)[number];

export type WorldTile = {
  x: number;
  y: number;
  biome: BiomeId;
  walkable: boolean;
  elev: number;
};

export type WorldChunk = {
  cx: number;
  cy: number;
  tiles: WorldTile[];
};

export const BIOME_LABELS: Record<BiomeId, string> = {
  grassland: "Green land",
  forest: "Deep forest",
  desert: "Sunbaked dunes",
  snow: "Snow fields",
  ice: "Ice sheet",
  mountain: "High peaks",
  cave: "Cave mouth",
  river: "River ford",
  ocean: "Open ocean",
  autumn: "Autumn woods",
  summer: "Summer meadow",
  swamp: "Mire & reeds",
};

export const BIOME_COLORS: Record<BiomeId, { fill: string; edge: string }> = {
  grassland: { fill: "#3d8a4a", edge: "#1e4a28" },
  forest: { fill: "#1f5c38", edge: "#0c2e1c" },
  desert: { fill: "#d4a85c", edge: "#8a6430" },
  snow: { fill: "#e8f0f4", edge: "#8aa0b0" },
  ice: { fill: "#b8dce8", edge: "#4a7890" },
  mountain: { fill: "#6a6864", edge: "#2e2c28" },
  cave: { fill: "#3a322c", edge: "#1a1410" },
  river: { fill: "#3a7a9a", edge: "#1a4058" },
  ocean: { fill: "#1a4a6a", edge: "#0a2840" },
  autumn: { fill: "#c47a3d", edge: "#6a3a18" },
  summer: { fill: "#7cbc4a", edge: "#3a6820" },
  swamp: { fill: "#4a6a48", edge: "#243828" },
};

export function hashSeed(input: string): number {
  let h = 2166136261;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number) {
  return () => {
    let t = (seed += 0x6d2b79f5);
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function hash2(seed: number, x: number, y: number): number {
  let h = seed ^ Math.imul(x | 0, 374761393) ^ Math.imul(y | 0, 668265263);
  h = Math.imul(h ^ (h >>> 13), 1274126177);
  return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
}

function valueNoise(seed: number, x: number, y: number, scale: number): number {
  const nx = x / scale;
  const ny = y / scale;
  const x0 = Math.floor(nx);
  const y0 = Math.floor(ny);
  const fx = nx - x0;
  const fy = ny - y0;
  const sx = fx * fx * (3 - 2 * fx);
  const sy = fy * fy * (3 - 2 * fy);
  const n00 = hash2(seed, x0, y0);
  const n10 = hash2(seed, x0 + 1, y0);
  const n01 = hash2(seed, x0, y0 + 1);
  const n11 = hash2(seed, x0 + 1, y0 + 1);
  const ix0 = n00 * (1 - sx) + n10 * sx;
  const ix1 = n01 * (1 - sx) + n11 * sx;
  return ix0 * (1 - sy) + ix1 * sy;
}

function fbm(seed: number, x: number, y: number, scale: number, octaves = 3): number {
  let amp = 1;
  let freq = 1;
  let sum = 0;
  let norm = 0;
  for (let i = 0; i < octaves; i++) {
    sum += amp * valueNoise(seed + i * 97, x * freq, y * freq, scale);
    norm += amp;
    amp *= 0.5;
    freq *= 2;
  }
  return sum / norm;
}

function voronoiCell(seed: number, x: number, y: number, cellSize: number): number {
  const cx = Math.floor(x / cellSize);
  const cy = Math.floor(y / cellSize);
  let best = Infinity;
  let bestId = 0;
  for (let oy = -1; oy <= 1; oy++) {
    for (let ox = -1; ox <= 1; ox++) {
      const ix = cx + ox;
      const iy = cy + oy;
      const jx = (ix + 0.5 + hash2(seed, ix, iy) - 0.5) * cellSize;
      const jy = (iy + 0.5 + hash2(seed + 11, ix, iy) - 0.5) * cellSize;
      const d = (x - jx) ** 2 + (y - jy) ** 2;
      if (d < best) {
        best = d;
        bestId = Math.floor(hash2(seed + 23, ix, iy) * 1_000_000);
      }
    }
  }
  return bestId;
}

const LAND_BIOMES: BiomeId[] = [
  "grassland",
  "forest",
  "desert",
  "snow",
  "ice",
  "mountain",
  "autumn",
  "summer",
  "swamp",
];

function landBiomeFromClimate(
  seed: number,
  x: number,
  y: number,
  elev: number,
  temp: number,
  moist: number
): BiomeId {
  if (elev > 0.72) {
    if (temp < 0.35) return "ice";
    if (hash2(seed + 41, x, y) < 0.12) return "cave";
    return "mountain";
  }
  if (elev > 0.62 && hash2(seed + 43, x, y) < 0.08) return "cave";

  const cell = voronoiCell(seed + 7, x, y, 28);
  const pick = LAND_BIOMES[cell % LAND_BIOMES.length]!;

  if (temp < 0.28) return moist > 0.55 ? "ice" : "snow";
  if (temp > 0.72 && moist < 0.35) return "desert";
  if (moist > 0.72 && elev < 0.45) return "swamp";
  if (temp > 0.55 && moist > 0.45 && moist < 0.7) return "summer";
  if (temp > 0.35 && temp < 0.55 && moist > 0.4) {
    return pick === "desert" || pick === "snow" || pick === "ice" ? "autumn" : pick;
  }
  if (moist > 0.5) return pick === "desert" ? "forest" : pick === "snow" ? "forest" : pick;
  return pick === "ice" || pick === "snow" ? "grassland" : pick;
}

export function biomeAt(seed: number, x: number, y: number): { biome: BiomeId; elev: number } {
  const elev = fbm(seed, x, y, 48, 4);
  const temp = fbm(seed + 101, x, y, 64, 3);
  const moist = fbm(seed + 202, x, y, 40, 3);
  const continent = fbm(seed + 303, x, y, 96, 3);

  if (continent < 0.32 && elev < 0.42) {
    return { biome: "ocean", elev };
  }

  const ridge = Math.abs(fbm(seed + 404, x, y, 22, 2) - 0.5) * 2;
  if (continent >= 0.32 && ridge < 0.08 && elev > 0.28 && elev < 0.65) {
    return { biome: "river", elev };
  }

  if (continent < 0.38 && elev < 0.48) {
    return { biome: "ocean", elev };
  }

  return {
    biome: landBiomeFromClimate(seed, x, y, elev, temp, moist),
    elev,
  };
}

export function isWalkableBiome(biome: BiomeId): boolean {
  return biome !== "ocean";
}

export function tileAt(seed: number, x: number, y: number): WorldTile {
  const { biome, elev } = biomeAt(seed, x, y);
  return {
    x,
    y,
    biome,
    walkable: isWalkableBiome(biome),
    elev,
  };
}

export function chunkKey(cx: number, cy: number): string {
  return `${cx},${cy}`;
}

export function worldToChunk(x: number, y: number): { cx: number; cy: number } {
  return {
    cx: Math.floor(x / CHUNK_SIZE),
    cy: Math.floor(y / CHUNK_SIZE),
  };
}

export function generateChunk(seed: number, cx: number, cy: number): WorldChunk {
  const tiles: WorldTile[] = [];
  const ox = cx * CHUNK_SIZE;
  const oy = cy * CHUNK_SIZE;
  for (let ly = 0; ly < CHUNK_SIZE; ly++) {
    for (let lx = 0; lx < CHUNK_SIZE; lx++) {
      tiles.push(tileAt(seed, ox + lx, oy + ly));
    }
  }
  return { cx, cy, tiles };
}

export function findNearestWalkable(
  seed: number,
  x: number,
  y: number,
  maxR = 24
): { x: number; y: number } {
  if (tileAt(seed, x, y).walkable) return { x, y };
  for (let r = 1; r <= maxR; r++) {
    for (let dy = -r; dy <= r; dy++) {
      for (let dx = -r; dx <= r; dx++) {
        if (Math.max(Math.abs(dx), Math.abs(dy)) !== r) continue;
        const t = tileAt(seed, x + dx, y + dy);
        if (t.walkable) return { x: t.x, y: t.y };
      }
    }
  }
  return { x: 0, y: 0 };
}

type PathNode = { x: number; y: number; g: number; f: number };

export function findPath(
  seed: number,
  fromX: number,
  fromY: number,
  toX: number,
  toY: number,
  maxSteps = MAX_PATH_STEPS
): { x: number; y: number }[] {
  const goal = tileAt(seed, toX, toY);
  if (!goal.walkable) return [];
  if (fromX === toX && fromY === toY) return [];

  const key = (x: number, y: number) => `${x},${y}`;
  const open = new Map<string, PathNode>();
  const closed = new Set<string>();
  const start: PathNode = {
    x: fromX,
    y: fromY,
    g: 0,
    f: Math.abs(toX - fromX) + Math.abs(toY - fromY),
  };
  open.set(key(fromX, fromY), start);
  const came = new Map<string, { x: number; y: number }>();

  while (open.size) {
    let best: PathNode | null = null;
    for (const n of open.values()) {
      if (!best || n.f < best.f) best = n;
    }
    if (!best) break;
    open.delete(key(best.x, best.y));
    if (best.x === toX && best.y === toY) {
      const path: { x: number; y: number }[] = [];
      let cx = best.x;
      let cy = best.y;
      while (!(cx === fromX && cy === fromY)) {
        path.push({ x: cx, y: cy });
        const p = came.get(key(cx, cy));
        if (!p) break;
        cx = p.x;
        cy = p.y;
      }
      path.reverse();
      return path.slice(0, maxSteps);
    }
    closed.add(key(best.x, best.y));
    if (best.g >= maxSteps) continue;

    for (const [dx, dy] of [
      [1, 0],
      [-1, 0],
      [0, 1],
      [0, -1],
    ] as const) {
      const nx = best.x + dx;
      const ny = best.y + dy;
      const nk = key(nx, ny);
      if (closed.has(nk)) continue;
      if (!tileAt(seed, nx, ny).walkable) continue;
      const g = best.g + 1;
      const h = Math.abs(toX - nx) + Math.abs(toY - ny);
      const f = g + h;
      const prev = open.get(nk);
      if (prev && prev.g <= g) continue;
      open.set(nk, { x: nx, y: ny, g, f });
      came.set(nk, { x: best.x, y: best.y });
    }
  }
  return [];
}

export function tilesInView(
  seed: number,
  centerX: number,
  centerY: number,
  radius = MAP_VIEW_RADIUS
): WorldTile[] {
  const out: WorldTile[] = [];
  for (let y = centerY - radius; y <= centerY + radius; y++) {
    for (let x = centerX - radius; x <= centerX + radius; x++) {
      out.push(tileAt(seed, x, y));
    }
  }
  return out;
}

export function encounterChanceForBiome(biome: BiomeId): number {
  switch (biome) {
    case "cave":
      return 0.28;
    case "forest":
    case "swamp":
      return 0.22;
    case "mountain":
    case "desert":
      return 0.2;
    case "snow":
    case "ice":
      return 0.18;
    case "river":
      return 0.16;
    case "autumn":
    case "summer":
    case "grassland":
      return 0.14;
    default:
      return 0.12;
  }
}

export function biomeFoeKeywords(biome: BiomeId): string[] {
  switch (biome) {
    case "snow":
      return ["frost", "snow", "ice", "warg", "hare"];
    case "ice":
      return ["ice", "frost", "hoar"];
    case "desert":
      return ["ash", "ember", "bandit", "sand", "scorp", "drake"];
    case "forest":
      return ["forest", "briar", "goblin", "wolf", "lurker"];
    case "swamp":
      return ["mire", "swamp", "slime", "adder", "witch"];
    case "mountain":
      return ["peak", "mountain", "dragon", "ash", "titan"];
    case "cave":
      return ["cave", "undead", "slime", "mite", "goblin"];
    case "river":
      return ["river", "pike", "mire", "crab"];
    case "ocean":
      return ["river", "pike", "slime"];
    case "autumn":
      return ["crow", "raven", "forest", "wolf", "bandit"];
    case "summer":
      return ["hare", "bandit", "goblin", "wolf"];
    case "grassland":
    default:
      return ["goblin", "bandit", "wolf", "crow"];
  }
}

export function biomeFoeReskin(biome: BiomeId): string | null {
  if (biome === "desert") return "Dune Scorpion";
  if (biome === "ice") return "Ice Wight";
  if (biome === "cave") return "Cave Crawler";
  return null;
}
