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

/** Ten levels — gentler curve, two foes each stage. */
export const LEVELS: LevelDef[] = [
  {
    level: 1,
    title: "Level 1 — Ash Whelps",
    blurb: "Two young cinders prowl the stones.",
    count: 2,
    enemy: {
      id: "ash-whelp",
      label: "Ash Whelp",
      health: 20,
      speed: 2.5,
      damage: 4,
      scale: 0.82,
      bodyColor: 0x3a281c,
      headColor: 0x4a3224,
      glowColor: 0xff8844,
      glowIntensity: 0.55,
      attackRange: 1.35,
      attackCooldown: 1.5,
      aggroRange: 22,
    },
  },
  {
    level: 2,
    title: "Level 2 — Cinder Wolves",
    blurb: "Pack hunters. Cinder Dash unlocked.",
    count: 2,
    enemy: {
      id: "cinder-wolf",
      label: "Cinder Wolf",
      health: 34,
      speed: 3.2,
      damage: 6,
      scale: 1.0,
      bodyColor: 0x2a1c18,
      headColor: 0x3a241c,
      glowColor: 0xff5522,
      glowIntensity: 0.95,
      attackRange: 1.5,
      attackCooldown: 1.25,
      aggroRange: 26,
    },
  },
  {
    level: 3,
    title: "Level 3 — Ember Brutes",
    blurb: "Thick hide. Ward Pulse unlocked.",
    count: 2,
    enemy: {
      id: "ember-brute",
      label: "Ember Brute",
      health: 55,
      speed: 2.2,
      damage: 8,
      scale: 1.3,
      bodyColor: 0x1a1210,
      headColor: 0x2c1a14,
      glowColor: 0xff3300,
      glowIntensity: 1.25,
      attackRange: 1.65,
      attackCooldown: 1.55,
      aggroRange: 28,
    },
  },
  {
    level: 4,
    title: "Level 4 — Night Howlers",
    blurb: "Fast and mean. Ashstorm unlocked.",
    count: 2,
    enemy: {
      id: "night-howler",
      label: "Night Howler",
      health: 44,
      speed: 4.1,
      damage: 7,
      scale: 1.05,
      bodyColor: 0x141820,
      headColor: 0x1c2430,
      glowColor: 0x66aaff,
      glowIntensity: 1.1,
      attackRange: 1.45,
      attackCooldown: 1.05,
      aggroRange: 32,
    },
  },
  {
    level: 5,
    title: "Level 5 — Ashlord Twins",
    blurb: "Mid-trail champions at the stones.",
    count: 2,
    enemy: {
      id: "ashlord",
      label: "Ashlord",
      health: 72,
      speed: 2.9,
      damage: 10,
      scale: 1.4,
      bodyColor: 0x120808,
      headColor: 0x2a1010,
      glowColor: 0xff2200,
      glowIntensity: 1.6,
      attackRange: 1.8,
      attackCooldown: 1.2,
      aggroRange: 34,
    },
  },
  {
    level: 6,
    title: "Level 6 — Scorch Pups",
    blurb: "Whelps again — hotter and hungrier.",
    count: 2,
    enemy: {
      id: "ash-whelp",
      label: "Scorch Pup",
      health: 30,
      speed: 3.0,
      damage: 6,
      scale: 0.95,
      bodyColor: 0x4a2010,
      headColor: 0x5a2814,
      glowColor: 0xff6622,
      glowIntensity: 0.8,
      attackRange: 1.4,
      attackCooldown: 1.3,
      aggroRange: 26,
    },
  },
  {
    level: 7,
    title: "Level 7 — Ember Pack",
    blurb: "Wolves with denser ash fur.",
    count: 2,
    enemy: {
      id: "cinder-wolf",
      label: "Ember Packmate",
      health: 48,
      speed: 3.6,
      damage: 8,
      scale: 1.12,
      bodyColor: 0x2a1410,
      headColor: 0x3a1c14,
      glowColor: 0xff4411,
      glowIntensity: 1.15,
      attackRange: 1.55,
      attackCooldown: 1.1,
      aggroRange: 30,
    },
  },
  {
    level: 8,
    title: "Level 8 — Slag Brutes",
    blurb: "Heavy hitters. Keep moving.",
    count: 2,
    enemy: {
      id: "ember-brute",
      label: "Slag Brute",
      health: 78,
      speed: 2.35,
      damage: 11,
      scale: 1.45,
      bodyColor: 0x181010,
      headColor: 0x281414,
      glowColor: 0xff2200,
      glowIntensity: 1.4,
      attackRange: 1.75,
      attackCooldown: 1.4,
      aggroRange: 32,
    },
  },
  {
    level: 9,
    title: "Level 9 — Void Howlers",
    blurb: "Night howlers with colder fire.",
    count: 2,
    enemy: {
      id: "night-howler",
      label: "Void Howler",
      health: 58,
      speed: 4.5,
      damage: 9,
      scale: 1.15,
      bodyColor: 0x101828,
      headColor: 0x182438,
      glowColor: 0x88bbff,
      glowIntensity: 1.3,
      attackRange: 1.5,
      attackCooldown: 0.95,
      aggroRange: 36,
    },
  },
  {
    level: 10,
    title: "Level 10 — Ashlord Alphas",
    blurb: "Final stand. Clear the alphas.",
    count: 2,
    enemy: {
      id: "ashlord",
      label: "Ashlord Alpha",
      health: 95,
      speed: 3.2,
      damage: 12,
      scale: 1.6,
      bodyColor: 0x100606,
      headColor: 0x220c0c,
      glowColor: 0xff1100,
      glowIntensity: 2.0,
      attackRange: 1.9,
      attackCooldown: 1.1,
      aggroRange: 40,
    },
  },
];
