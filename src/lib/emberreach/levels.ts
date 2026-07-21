export type EnemyTier = {
  id: string;
  label: string;
  health: number;
  speed: number;
  damage: number;
  scale: number;
  bodyColor: number;
  headColor: number;
  glowColor: number;
  glowIntensity: number;
  attackRange: number;
  attackCooldown: number;
  aggroRange: number;
};

export type LevelDef = {
  level: number;
  title: string;
  blurb: string;
  enemy: EnemyTier;
  count: number;
};

export const LEVELS: LevelDef[] = [
  {
    level: 1,
    title: "Level 1 — Ash Whelps",
    blurb: "Two young cinders prowl the stones.",
    count: 2,
    enemy: {
      id: "ash-whelp",
      label: "Ash Whelp",
      health: 28,
      speed: 3.1,
      damage: 6,
      scale: 0.85,
      bodyColor: 0x3a281c,
      headColor: 0x4a3224,
      glowColor: 0xff8844,
      glowIntensity: 0.55,
      attackRange: 1.4,
      attackCooldown: 1.25,
      aggroRange: 26,
    },
  },
  {
    level: 2,
    title: "Level 2 — Cinder Wolves",
    blurb: "Harder pack hunters — stay sharp.",
    count: 2,
    enemy: {
      id: "cinder-wolf",
      label: "Cinder Wolf",
      health: 52,
      speed: 4.0,
      damage: 10,
      scale: 1.05,
      bodyColor: 0x2a1c18,
      headColor: 0x3a241c,
      glowColor: 0xff5522,
      glowIntensity: 0.95,
      attackRange: 1.55,
      attackCooldown: 1.05,
      aggroRange: 30,
    },
  },
  {
    level: 3,
    title: "Level 3 — Ember Brutes",
    blurb: "Thick hide. Hit them hard.",
    count: 2,
    enemy: {
      id: "ember-brute",
      label: "Ember Brute",
      health: 90,
      speed: 2.8,
      damage: 14,
      scale: 1.35,
      bodyColor: 0x1a1210,
      headColor: 0x2c1a14,
      glowColor: 0xff3300,
      glowIntensity: 1.25,
      attackRange: 1.75,
      attackCooldown: 1.35,
      aggroRange: 32,
    },
  },
  {
    level: 4,
    title: "Level 4 — Night Howlers",
    blurb: "Fast. Mean. Don't get surrounded.",
    count: 2,
    enemy: {
      id: "night-howler",
      label: "Night Howler",
      health: 70,
      speed: 5.2,
      damage: 12,
      scale: 1.1,
      bodyColor: 0x141820,
      headColor: 0x1c2430,
      glowColor: 0x66aaff,
      glowIntensity: 1.1,
      attackRange: 1.5,
      attackCooldown: 0.85,
      aggroRange: 36,
    },
  },
  {
    level: 5,
    title: "Level 5 — Ashlord Twins",
    blurb: "Final stand at the standing stones.",
    count: 2,
    enemy: {
      id: "ashlord",
      label: "Ashlord",
      health: 140,
      speed: 3.6,
      damage: 18,
      scale: 1.55,
      bodyColor: 0x120808,
      headColor: 0x2a1010,
      glowColor: 0xff2200,
      glowIntensity: 1.8,
      attackRange: 1.9,
      attackCooldown: 0.95,
      aggroRange: 40,
    },
  },
];
