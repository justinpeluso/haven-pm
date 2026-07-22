export type AbilityId =
  | "strike"
  | "emberbolt"
  | "dash"
  | "ward"
  | "ashstorm";

export type AbilityDef = {
  id: AbilityId;
  name: string;
  key: string;
  slot: string;
  focusCost: number;
  cooldown: number;
  /** Unlocked when starting this 1-based level (and later). */
  unlockLevel: number;
  hint: string;
};

export const ABILITIES: AbilityDef[] = [
  {
    id: "strike",
    name: "Strike",
    key: "LMB",
    slot: "1",
    focusCost: 0,
    cooldown: 0.4,
    unlockLevel: 1,
    hint: "Melee slash",
  },
  {
    id: "emberbolt",
    name: "Emberbolt",
    key: "Q",
    slot: "2",
    focusCost: 12,
    cooldown: 0.5,
    unlockLevel: 1,
    hint: "Fire bolt",
  },
  {
    id: "dash",
    name: "Cinder Dash",
    key: "E",
    slot: "3",
    focusCost: 14,
    cooldown: 2.8,
    unlockLevel: 2,
    hint: "Burst forward",
  },
  {
    id: "ward",
    name: "Ward Pulse",
    key: "R",
    slot: "4",
    focusCost: 18,
    cooldown: 5,
    unlockLevel: 3,
    hint: "Heal + blast",
  },
  {
    id: "ashstorm",
    name: "Ashstorm",
    key: "F",
    slot: "5",
    focusCost: 30,
    cooldown: 8,
    unlockLevel: 4,
    hint: "Triple bolts",
  },
];
