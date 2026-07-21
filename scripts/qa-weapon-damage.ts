/**
 * Verify weapon damage scaling in simple battle.
 * Run: npx tsx scripts/qa-weapon-damage.ts
 */
import {
  listCreateMagic,
  listCreateSkills,
  magicSlotsForClass,
} from "../src/lib/downtown/party-chronicle/create";
import { getGear } from "../src/lib/downtown/party-chronicle/gear";
import { getDtGear } from "../src/lib/downtown/dungeon-tester/gear";
import {
  createNewDtWorld,
  sealDtCharacter,
} from "../src/lib/downtown/dungeon-tester/persist";
import {
  startSimpleBattle,
  performSimpleBattleAction,
} from "../src/lib/downtown/dungeon-tester/simple-battle";
import {
  resolveWeaponScaling,
  scaleByStat,
} from "../src/lib/downtown/dungeon-tester/weapon-scaling";
import { resolveWeaponStyle } from "../src/lib/downtown/dungeon-tester/weapon-style";
import type { CharacterSave } from "../src/lib/downtown/party-chronicle/types";
import type { DtWorldSave } from "../src/lib/downtown/dungeon-tester/types";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function resolveItem(id: string) {
  return getDtGear(id) ?? getGear(id);
}

// --- unit: scaleByStat ---
const unitCases: [number, number, number][] = [
  [4, 10, 4],
  [4, 15, 6],
  [4, 20, 8],
  [5, 12, 6],
  [2, 8, 1],
];
for (const [base, stat, expect] of unitCases) {
  const got = scaleByStat(base, stat);
  assert(got === expect, `scaleByStat(${base},${stat})=${got} want ${expect}`);
}
console.log("scaleByStat unit cases OK");

const oak = resolveItem("oak-staff");
const sword = resolveItem("iron-sword");
assert(oak, "oak-staff missing");
assert(sword, "iron-sword missing");
assert(resolveWeaponStyle(oak) === "magic", `oak style=${resolveWeaponStyle(oak)}`);
assert(resolveWeaponStyle(sword) === "melee", `sword style=${resolveWeaponStyle(sword)}`);
console.log("styles OK — oak magic, sword melee; power", oak.power, sword.power);

function sealHero(
  weaponId: string,
  classId: "mage" | "warrior",
  stats: Partial<CharacterSave["stats"]>
): DtWorldSave {
  let world = createNewDtWorld();
  const magicNeed = magicSlotsForClass(classId);
  const sealed = sealDtCharacter(world, "justin", {
    name: "Tester",
    classId,
    raceId: "human",
    dogName: "Scout",
    dogBreed: "hound",
    statBumps: {
      strength: 0,
      constitution: 5,
      dexterity: 0,
      wisdom: 0,
      intelligence: 0,
      charisma: 0,
    },
    kit: {
      weaponId,
      skillAbilityId: listCreateSkills()[0]?.id ?? "ab-power-strike",
      magicAbilityIds: listCreateMagic()
        .slice(0, magicNeed)
        .map((m) => m.id),
    },
  });
  assert(!("error" in sealed), `seal: ${"error" in sealed ? sealed.error : ""}`);
  world = sealed;
  const char = world.characters.justin!;
  char.equipped = { ...char.equipped, weapon: weaponId };
  if (!char.inventory.includes(weaponId)) {
    char.inventory = [...char.inventory, weaponId];
  }
  char.stats = {
    ...char.stats,
    strength: 10,
    dexterity: 10,
    constitution: 15,
    intelligence: 10,
    wisdom: 10,
    charisma: 10,
    ...stats,
  };
  // Keep them fight-ready after stat overwrite.
  char.hp = Math.max(char.hp || 0, char.maxHp || 20);
  char.maxHp = Math.max(char.maxHp || 0, char.hp);
  char.mana = Math.max(char.mana || 0, char.maxMana || 10);
  char.stamina = Math.max(char.stamina || 0, char.maxStamina || 10);
  return world;
}

function attackDamage(
  weaponId: string,
  classId: "mage" | "warrior",
  stats: Partial<CharacterSave["stats"]>
): {
  dealt: number;
  rawExpectedMin: number;
  rawExpectedMax: number;
  heroPower: number;
  scaleStat: string;
  scaleValue: number;
  foeArmor: number;
  message: string;
} {
  let world = sealHero(weaponId, classId, stats);
  const char = world.characters.justin!;
  const weapon = resolveItem(weaponId)!;
  const scaling = resolveWeaponScaling(weapon, char.stats);

  // Fixed rng so float variance is known (hero attack adds floor(rng()*5) → 0..4)
  const seq = [0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0, 0.0];
  let i = 0;
  const rng = () => seq[i++ % seq.length]!;

  let r = startSimpleBattle(world, { rng, foeId: "rat" });
  world = r.world;
  assert(world.battle, "battle missing");
  world.battle = { ...world.battle, splashDone: true, phase: "player" };

  const hero = world.battle.units.find((u) => u.side === "hero" && !u.isDog)!;
  const foe = world.battle.units.find((u) => u.side === "enemy")!;
  const hp0 = foe.hp;

  r = performSimpleBattleAction(world, hero.id, "attack", foe.id, rng);
  world = r.world;
  const foeAfter = world.battle!.units.find((u) => u.id === foe.id)!;
  const dealt = hp0 - foeAfter.hp;

  // Expected: scaleByStat(heroPower * moveMult≈1, stat) + 0..4 − armor, min 1
  // With rng always 0, variance term is 0.
  const scaled = scaleByStat(hero.power, scaling.statValue);
  const rawExpectedMin = Math.max(1, scaled + 0 - (foe.armor ?? 0));
  const rawExpectedMax = Math.max(1, scaled + 4 - (foe.armor ?? 0));

  return {
    dealt,
    rawExpectedMin,
    rawExpectedMax,
    heroPower: hero.power,
    scaleStat: scaling.statKey,
    scaleValue: scaling.statValue,
    foeArmor: foe.armor ?? 0,
    message: r.message,
  };
}

const oakHighInt = attackDamage("oak-staff", "mage", { intelligence: 20 });
const oakLowInt = attackDamage("oak-staff", "mage", { intelligence: 10 });
const oakHighStr = attackDamage("oak-staff", "mage", {
  intelligence: 10,
  strength: 20,
});
const swordHighStr = attackDamage("iron-sword", "warrior", { strength: 20 });
const swordLowStr = attackDamage("iron-sword", "warrior", { strength: 10 });

console.log("oak INT20", oakHighInt);
console.log("oak INT10", oakLowInt);
console.log("oak STR20 INT10 (should ~match INT10)", oakHighStr);
console.log("sword STR20", swordHighStr);
console.log("sword STR10", swordLowStr);

assert(
  oakHighInt.dealt > oakLowInt.dealt,
  `oak INT20 dealt ${oakHighInt.dealt} should beat INT10 ${oakLowInt.dealt}`
);
assert(
  oakHighStr.dealt === oakLowInt.dealt,
  `oak should ignore STR — got STR20=${oakHighStr.dealt} INT10=${oakLowInt.dealt}`
);
assert(
  swordHighStr.dealt > swordLowStr.dealt,
  `sword STR20 ${swordHighStr.dealt} should beat STR10 ${swordLowStr.dealt}`
);
assert(
  oakHighInt.dealt >= oakHighInt.rawExpectedMin &&
    oakHighInt.dealt <= oakHighInt.rawExpectedMax,
  `oak dealt ${oakHighInt.dealt} outside ${oakHighInt.rawExpectedMin}-${oakHighInt.rawExpectedMax}`
);

console.log("PASS weapon damage scaling");
