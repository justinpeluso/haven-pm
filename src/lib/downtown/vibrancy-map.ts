/** Procedural CBD overhead layout for vibrancy infographic. Stable per town name. */

export type ParcelKind = "shop" | "cafe" | "retail" | "service" | "lot";

export type Parcel = {
  id: string;
  x: number;
  y: number;
  w: number;
  h: number;
  kind: ParcelKind;
  /** 0–1: when fill exceeds this, parcel activates */
  threshold: number;
  rotation: number;
  hasAwning: boolean;
  hasPatio: boolean;
  /** slight hue offset index into palette */
  tint: number;
};

export type Street = {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  width: number;
  main: boolean;
};

export type TreeSpot = { x: number; y: number; r: number };

export type VibrancyMapLayout = {
  viewBox: string;
  streets: Street[];
  parcels: Parcel[];
  trees: TreeSpot[];
  plaza: { x: number; y: number; w: number; h: number } | null;
  river: { path: string } | null;
  label: string;
};

function hashString(s: string): number {
  let h = 2166136261;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

function mulberry32(seed: number) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const KINDS: ParcelKind[] = ["shop", "cafe", "retail", "service"];

function pickKind(rand: () => number, tags: string[]): ParcelKind {
  if (rand() < 0.08) return "lot";
  const tagBoost = tags.some((t) => /college|main_street|river/i.test(t));
  if (tagBoost && rand() < 0.28) return rand() < 0.55 ? "cafe" : "shop";
  return KINDS[Math.floor(rand() * KINDS.length)]!;
}

/**
 * Build a schematic CBD block layout from town identity.
 * `radiusM` nudges block density (smaller radius → tighter main street).
 */
export function buildVibrancyMap(opts: {
  name: string;
  state: string;
  downtownName: string;
  tags: string[];
  radiusM: number;
}): VibrancyMapLayout {
  const seed = hashString(`${opts.name}|${opts.state}|${opts.downtownName}`);
  const rand = mulberry32(seed);

  const W = 640;
  const H = 420;
  const skew = (rand() - 0.5) * 0.08;
  const rotateGrid = (rand() - 0.5) * 6;

  const dense = opts.radiusM < 450;
  const mainY = H * (0.42 + (rand() - 0.5) * 0.08);
  const crossXs = dense
    ? [W * 0.22, W * 0.5, W * 0.78]
    : [W * 0.28, W * 0.55, W * 0.78];

  const streets: Street[] = [
    {
      x1: 24,
      y1: mainY,
      x2: W - 24,
      y2: mainY + skew * W,
      width: 22,
      main: true,
    },
    {
      x1: 40,
      y1: mainY - 78,
      x2: W - 40,
      y2: mainY - 78 + skew * W * 0.6,
      width: 12,
      main: false,
    },
    {
      x1: 48,
      y1: mainY + 86,
      x2: W - 48,
      y2: mainY + 86 + skew * W * 0.5,
      width: 12,
      main: false,
    },
  ];

  for (const cx of crossXs) {
    streets.push({
      x1: cx,
      y1: 36,
      x2: cx + skew * 40,
      y2: H - 36,
      width: cx === crossXs[1] ? 16 : 11,
      main: false,
    });
  }

  const parcels: Parcel[] = [];
  let pid = 0;

  const rows: { y: number; side: "n" | "s"; depth: number }[] = [
    { y: mainY - 14, side: "n", depth: 28 + rand() * 10 },
    { y: mainY + 14, side: "s", depth: 26 + rand() * 12 },
    { y: mainY - 92, side: "n", depth: 22 + rand() * 8 },
    { y: mainY + 100, side: "s", depth: 22 + rand() * 8 },
  ];

  for (const row of rows) {
    let x = 36 + rand() * 18;
    const end = W - 40;
    while (x < end - 28) {
      const gapBeforeCross = crossXs.some((cx) => Math.abs(x - cx) < 18);
      if (gapBeforeCross) {
        x += 22 + rand() * 8;
        continue;
      }

      const w = 18 + rand() * (dense ? 22 : 28);
      const h = row.depth * (0.85 + rand() * 0.3);
      const kind = pickKind(rand, opts.tags);
      const threshold =
        kind === "lot" ? 0.92 : 0.08 + rand() * 0.82 + (row.side === "s" && row.y > mainY + 50 ? 0.05 : 0);

      const y =
        row.side === "n" ? row.y - h - (streets[0]!.width / 2 - 2) : row.y + streets[0]!.width / 2 - 2;

      parcels.push({
        id: `p${pid++}`,
        x,
        y: y + skew * (x / W) * 12,
        w: Math.min(w, end - x),
        h,
        kind,
        threshold: Math.min(0.98, threshold),
        rotation: rotateGrid * 0.15 + (rand() - 0.5) * 1.2,
        hasAwning: kind !== "lot" && rand() > 0.35,
        hasPatio: kind === "cafe" && rand() > 0.4,
        tint: Math.floor(rand() * 4),
      });

      x += w + 4 + rand() * 7;
    }
  }

  // A few freestanding corner parcels
  for (let i = 0; i < 4; i++) {
    const cx = crossXs[i % crossXs.length]!;
    const north = i % 2 === 0;
    const w = 16 + rand() * 14;
    const h = 18 + rand() * 12;
    parcels.push({
      id: `c${pid++}`,
      x: cx + 14 + rand() * 6,
      y: north ? mainY - 70 - rand() * 20 : mainY + 40 + rand() * 30,
      w,
      h,
      kind: pickKind(rand, opts.tags),
      threshold: 0.2 + rand() * 0.7,
      rotation: (rand() - 0.5) * 2,
      hasAwning: rand() > 0.4,
      hasPatio: false,
      tint: Math.floor(rand() * 4),
    });
  }

  const trees: TreeSpot[] = [];
  const treeCount = 10 + Math.floor(rand() * 8);
  for (let i = 0; i < treeCount; i++) {
    trees.push({
      x: 50 + rand() * (W - 100),
      y: 40 + rand() * (H - 80),
      r: 3.5 + rand() * 3,
    });
  }

  const plaza =
    rand() > 0.35
      ? {
          x: W * (0.58 + rand() * 0.08),
          y: mainY - 48,
          w: 36 + rand() * 28,
          h: 28 + rand() * 16,
        }
      : null;

  const hasRiver = opts.tags.some((t) => /river/i.test(t)) || rand() > 0.72;
  const river = hasRiver
    ? {
        path:
          rand() > 0.5
            ? `M 8 ${H * 0.82} Q ${W * 0.3} ${H * 0.72} ${W * 0.55} ${H * 0.88} T ${W - 8} ${H * 0.78}`
            : `M ${W * 0.88} 12 Q ${W * 0.78} ${H * 0.35} ${W * 0.92} ${H * 0.55} T ${W * 0.82} ${H - 12}`,
      }
    : null;

  return {
    viewBox: `0 0 ${W} ${H}`,
    streets,
    parcels: parcels.sort((a, b) => a.threshold - b.threshold),
    trees,
    plaza,
    river,
    label: opts.downtownName || `${opts.name} CBD`,
  };
}

/** Vacancy readout that tracks the slider through the town's baseline. */
export function vacancyAtFill(
  fill: number,
  baselineVibrancy: number,
  baselineVacancy: number
): number {
  const v = clamp(fill, 0, 100);
  const baseV = clamp(baselineVibrancy, 0, 100);
  const baseVac = clamp(baselineVacancy, 0, 100);

  if (v <= baseV) {
    const vac0 = Math.min(92, baseVac + baseV * 0.38);
    const t = baseV <= 0 ? 1 : v / baseV;
    return Math.round(vac0 + (baseVac - vac0) * t);
  }

  const vac100 = Math.max(1, Math.round(baseVac * 0.1));
  const t = (v - baseV) / Math.max(100 - baseV, 1);
  return Math.round(baseVac + (vac100 - baseVac) * t);
}

function clamp(n: number, min: number, max: number) {
  return Math.max(min, Math.min(max, n));
}
