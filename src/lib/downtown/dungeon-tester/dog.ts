/**
 * True Grit dog companion — when the hound joins crude ambushes.
 * Present by default; flees to camp if mean (sulking) and/or unfed (hunger).
 */

import type { CharacterSave, DogCompanion } from "@/lib/downtown/party-chronicle/types";

/** Battles without a feed before the dog hides at camp. */
export const DT_DOG_HUNGER_FLEE = 2;
/** Bond floor — below this the dog treats the owner as mean. */
export const DT_DOG_BOND_MEAN = 3;

export type DtDogBattlePresence = {
  joins: boolean;
  /** Short line for battle log / splash when absent. */
  note?: string;
};

export function normalizeDtDog(dog: DogCompanion | undefined | null): DogCompanion {
  return {
    name: dog?.name?.trim() || "Dog",
    breed: dog?.breed?.trim() || "trail hound",
    bond: Math.max(0, Math.min(100, dog?.bond ?? 10)),
    hp: Math.max(0, dog?.hp ?? 20),
    maxHp: Math.max(1, dog?.maxHp ?? 20),
    hunger: Math.max(0, dog?.hunger ?? 0),
    sulking: !!dog?.sulking,
  };
}

/** Whether this sealed hero's dog stands in the next ambush. */
export function dtDogJoinsBattle(char: CharacterSave | undefined | null): DtDogBattlePresence {
  if (!char?.created || !char.dog) {
    return { joins: false };
  }
  const dog = normalizeDtDog(char.dog);
  if (!dog.name) return { joins: false };

  if (dog.sulking || dog.bond < DT_DOG_BOND_MEAN) {
    return {
      joins: false,
      note: `${dog.name} hid at camp — you were mean, and trust is thin.`,
    };
  }
  if ((dog.hunger ?? 0) >= DT_DOG_HUNGER_FLEE) {
    return {
      joins: false,
      note: `${dog.name} ran back to camp hungry — feed them before the next fight.`,
    };
  }
  if (dog.hp <= 0) {
    return {
      joins: false,
      note: `${dog.name} is too hurt to fight — rest them at camp.`,
    };
  }
  return { joins: true };
}

/** After an ambush resolves — dog gets hungrier until fed. */
export function dtDogAfterBattle(char: CharacterSave): CharacterSave {
  if (!char.created || !char.dog) return char;
  const dog = normalizeDtDog(char.dog);
  return {
    ...char,
    dog: {
      ...dog,
      hunger: (dog.hunger ?? 0) + 1,
    },
  };
}

/**
 * Wipe aftermath for the Rememberer — hurt/hide/bond ding, never deleted.
 * Fought dogs keep battle HP (0 → sits next fight); sat-out dogs only hunger.
 */
export function dtDogAfterWipe(
  char: CharacterSave,
  opts: { fought: boolean; battleHp?: number }
): CharacterSave {
  if (!char.created || !char.dog) return char;
  const dog = normalizeDtDog(char.dog);
  if (!opts.fought) {
    return dtDogAfterBattle(char);
  }
  const hp = Math.max(0, Math.min(dog.maxHp, opts.battleHp ?? dog.hp));
  const bondDing = hp <= 0 ? 2 : 1;
  return {
    ...char,
    dog: {
      ...dog,
      hp,
      hunger: (dog.hunger ?? 0) + 1,
      bond: Math.max(0, dog.bond - bondDing),
    },
  };
}

/** Share scraps / clear sulk — call after jerky or explicit camp feed. */
export function dtFeedDog(char: CharacterSave, opts?: { bond?: number }): CharacterSave {
  if (!char.created || !char.dog) return char;
  const dog = normalizeDtDog(char.dog);
  const bondGain = opts?.bond ?? 2;
  return {
    ...char,
    dog: {
      ...dog,
      hunger: 0,
      sulking: false,
      bond: Math.min(100, dog.bond + bondGain),
      hp: Math.min(dog.maxHp, dog.hp + 6),
    },
  };
}

/** Mean treatment — dog sulks and will hide at camp until fed/called. */
export function dtBeMeanToDog(char: CharacterSave): CharacterSave {
  if (!char.created || !char.dog) return char;
  const dog = normalizeDtDog(char.dog);
  return {
    ...char,
    dog: {
      ...dog,
      sulking: true,
      bond: Math.max(0, dog.bond - 8),
    },
  };
}

export function dtDogBattlePower(dog: DogCompanion, ownerLevel: number): number {
  const bond = normalizeDtDog(dog).bond;
  return Math.max(2, Math.floor(2 + ownerLevel * 0.6 + bond / 30));
}
