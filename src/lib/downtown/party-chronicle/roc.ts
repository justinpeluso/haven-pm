/**
 * NeverWorld R.O.C. — Rolling Outcome Chart (1996 heritage homage).
 *
 * Core formula:
 *   Final ROC = exploding d100 + Attribute Modifier + Skill Value + Situational Mods
 *
 * Exploding percentiles: a natural 96–100 on any d100 re-rolls and adds
 * (classic “explode upward”; chain continues while 96–100). Totals can exceed 100.
 *
 * Outcome bands (10 tiers — never binary hit/miss):
 *   1  Catastrophic   ≤ 15
 *   2  Standard fail  16–35
 *   3  Narrow fail    36–49
 *   4  Mixed success  50–64   (success + complication)
 *   5  Basic success  65–79
 *   6  Strong success 80–94   (+ minor XP flavor)
 *   7  Critical       95–119  (+ XP / temp skill bump flavor)
 *   8  Legendary      120–199
 *   9  Divine         200–699 (wish / favor flavor)
 *  10  Immortality    700+    (transcendence easter egg / ending flag)
 *
 * OCF vs DCF margin maps into HP damage bands so existing HP combat stays intact.
 */

export const ROC_EXPLODE_MIN = 96;

export type RocTierId =
  | "catastrophic"
  | "failure"
  | "narrow_fail"
  | "mixed"
  | "basic"
  | "strong"
  | "critical"
  | "legendary"
  | "divine"
  | "immortality";

export type RocTier = {
  id: RocTierId;
  rank: number;
  name: string;
  blurb: string;
  /** Relative wound/severity vs defender (negative = self-hurt / miss). */
  severity: number;
  success: boolean;
  xpBonus: number;
  flagsAdd?: string[];
};

/**
 * Chart thresholds — inclusive min for each band (sorted ascending).
 * Immortality at 700+ is intentional easter-egg rarity.
 */
export const ROC_TIERS: { min: number; tier: RocTier }[] = [
  {
    min: 700,
    tier: {
      id: "immortality",
      rank: 10,
      name: "Immortality",
      blurb: "The sealed world cracks — transcendence flickers.",
      severity: 4.5,
      success: true,
      xpBonus: 50,
      flagsAdd: ["roc-immortality", "pathway-transcend"],
    },
  },
  {
    min: 200,
    tier: {
      id: "divine",
      rank: 9,
      name: "Divine Favor",
      blurb: "Old gods lean close and smile once.",
      severity: 3.2,
      success: true,
      xpBonus: 20,
      flagsAdd: ["roc-divine"],
    },
  },
  {
    min: 120,
    tier: {
      id: "legendary",
      rank: 8,
      name: "Legendary Success",
      blurb: "A deed the races will argue about for centuries.",
      severity: 2.4,
      success: true,
      xpBonus: 12,
    },
  },
  {
    min: 95,
    tier: {
      id: "critical",
      rank: 7,
      name: "Critical Success",
      blurb: "Clean, dazzling, almost unfair.",
      severity: 1.85,
      success: true,
      xpBonus: 6,
    },
  },
  {
    min: 80,
    tier: {
      id: "strong",
      rank: 6,
      name: "Strong Success",
      blurb: "The pathway opens wider.",
      severity: 1.45,
      success: true,
      xpBonus: 3,
    },
  },
  {
    min: 65,
    tier: {
      id: "basic",
      rank: 5,
      name: "Basic Success",
      blurb: "It works — no poetry required.",
      severity: 1.0,
      success: true,
      xpBonus: 0,
    },
  },
  {
    min: 50,
    tier: {
      id: "mixed",
      rank: 4,
      name: "Mixed Success",
      blurb: "You succeed, and the world charges a fee.",
      severity: 0.7,
      success: true,
      xpBonus: 0,
    },
  },
  {
    min: 36,
    tier: {
      id: "narrow_fail",
      rank: 3,
      name: "Narrow Failure",
      blurb: "Almost — a setback, not a collapse.",
      severity: 0.15,
      success: false,
      xpBonus: 0,
    },
  },
  {
    min: 16,
    tier: {
      id: "failure",
      rank: 2,
      name: "Standard Failure",
      blurb: "The sealed world shrugs you off.",
      severity: -0.25,
      success: false,
      xpBonus: 0,
    },
  },
  {
    min: Number.NEGATIVE_INFINITY,
    tier: {
      id: "catastrophic",
      rank: 1,
      name: "Catastrophic Failure",
      blurb: "Myth bites back.",
      severity: -0.85,
      success: false,
      xpBonus: 0,
    },
  },
];

export type RocRollBreakdown = {
  /** Individual d100 faces (including explode chain). */
  dice: number[];
  diceTotal: number;
  attributeMod: number;
  skillValue: number;
  situational: number;
  total: number;
  exploded: boolean;
};

export type RocResult = RocRollBreakdown & {
  tier: RocTier;
  /** One-line combat/story log. */
  label: string;
};

export function rollExplodingD100(rng: () => number = Math.random): {
  dice: number[];
  total: number;
  exploded: boolean;
} {
  const dice: number[] = [];
  let total = 0;
  let exploded = false;
  // Safety cap — immortality shouldn't come from infinite loops in one click.
  for (let guard = 0; guard < 12; guard++) {
    const face = 1 + Math.floor(rng() * 100);
    dice.push(face);
    total += face;
    if (face < ROC_EXPLODE_MIN) break;
    exploded = true;
  }
  return { dice, total, exploded };
}

/** Classic NeverWorld-style attribute modifier from a 3–20ish score. */
export function rocAttributeMod(score: number): number {
  return Math.floor((score - 10) / 2) * 5;
}

export function tierForTotal(total: number): RocTier {
  for (const row of ROC_TIERS) {
    if (total >= row.min) return row.tier;
  }
  return ROC_TIERS[ROC_TIERS.length - 1]!.tier;
}

export type ResolveRocOpts = {
  attributeScore?: number;
  /** Skill / weapon / spell contribution (flat). */
  skillValue?: number;
  /** Power-up, cover, bonds, pathway, etc. */
  situational?: number;
  rng?: () => number;
};

/**
 * Resolve a full R.O.C. check.
 * Final = exploding d100 + attrMod + skill + situational.
 */
export function resolveRoc(opts: ResolveRocOpts = {}): RocResult {
  const rng = opts.rng ?? Math.random;
  const { dice, total: diceTotal, exploded } = rollExplodingD100(rng);
  const attributeMod = rocAttributeMod(opts.attributeScore ?? 10);
  const skillValue = opts.skillValue ?? 0;
  const situational = opts.situational ?? 0;
  const total = diceTotal + attributeMod + skillValue + situational;
  const tier = tierForTotal(total);
  const diceStr = exploded ? `${dice.join("+")}★` : String(dice[0] ?? 0);
  const mods = attributeMod + skillValue + situational;
  const modStr =
    mods === 0 ? "" : mods > 0 ? `+${mods}` : `${mods}`;
  const label = `ROC ${total} [${diceStr}${modStr}] — ${tier.name}`;
  return {
    dice,
    diceTotal,
    attributeMod,
    skillValue,
    situational,
    total,
    exploded,
    tier,
    label,
  };
}

/**
 * Map OCF (offensive ROC) vs DCF (defensive ROC) margin into HP damage.
 * Keeps existing HP economy while severity comes from the chart.
 */
export function rocDamageFromMargin(
  basePower: number,
  offense: RocResult,
  defenseTotal: number,
  opts?: { minHit?: number; armor?: number }
): { damage: number; margin: number; glancing: boolean } {
  const margin = offense.total - defenseTotal;
  const sev = offense.tier.severity;
  let raw = basePower * Math.max(0.15, sev);
  // Margin soft-scales: every 20 points of edge ≈ +15% damage.
  raw *= 1 + Math.max(-0.4, Math.min(1.2, margin / 80));
  const armor = opts?.armor ?? 0;
  let damage = Math.max(opts?.minHit ?? 0, Math.round(raw) - Math.floor(armor * 0.5));
  const glancing = offense.tier.id === "mixed" || offense.tier.id === "narrow_fail";
  if (!offense.tier.success && offense.tier.severity <= 0) {
    damage = 0;
  } else if (!offense.tier.success && offense.tier.severity > 0) {
    damage = Math.max(1, Math.floor(damage * 0.35));
  }
  if (glancing && damage > 0) damage = Math.max(1, Math.floor(damage * 0.75));
  return { damage, margin, glancing };
}

/** Defensive chart roll for a foe (simple skill from power/armor). */
export function resolveDefenseRoc(
  opts: { armor?: number; power?: number; level?: number; rng?: () => number } = {}
): RocResult {
  const skill = Math.round((opts.armor ?? 0) * 3 + (opts.power ?? 0) * 1.5 + (opts.level ?? 1));
  return resolveRoc({
    attributeScore: 10 + Math.floor((opts.level ?? 1) / 5),
    skillValue: skill,
    situational: 0,
    rng: opts.rng,
  });
}

/** Convert legacy story DC (~8–20 on d20) into a ROC target band midpoint. */
export function storyDcToRocTarget(dc: number): number {
  // d20 DC 10 ≈ ROC 50, DC 15 ≈ 70, DC 20 ≈ 90
  return Math.round(30 + dc * 4);
}
