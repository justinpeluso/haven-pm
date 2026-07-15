/**
 * Engine smoke: after START BATTLE, waiting without player actions must not
 * deal hero damage or advance to enemy. Merge must not prefer bare enemy over idle player.
 *
 *   npx tsx scripts/qa-battle-idle-no-auto.ts
 */
import {
  listCreateMagic,
  listCreateSkills,
  magicSlotsForClass,
  weaponsForClass,
} from "../src/lib/downtown/party-chronicle/create";
import { createNewDtWorld, mergeDtWorld, sealDtCharacter } from "../src/lib/downtown/dungeon-tester/persist";
import {
  startSimpleBattle,
  performSimpleBattleAction,
  advanceSimpleBattleEnemyPhase,
  mergeSimpleBattle,
  simpleBattleProgressScore,
  markSimpleBattleSplashDone,
} from "../src/lib/downtown/dungeon-tester/simple-battle";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

const classId = "warrior" as const;
const magicNeed = magicSlotsForClass(classId);

function sealJustin(world: ReturnType<typeof createNewDtWorld>) {
  const sealed = sealDtCharacter(world, "justin", {
    name: "Justin",
    classId,
    raceId: "human",
    dogName: "Scout",
    dogBreed: "hound",
    statBumps: {
      strength: 5,
      constitution: 5,
      dexterity: 5,
      wisdom: 4,
      intelligence: 4,
      charisma: 4,
    },
    kit: {
      weaponId: weaponsForClass(classId)[0]?.id ?? "iron-sword",
      skillAbilityId: listCreateSkills()[0]?.id ?? "ab-power-strike",
      magicAbilityIds: listCreateMagic()
        .slice(0, magicNeed)
        .map((m) => m.id),
    },
  });
  assert(!("error" in sealed), "seal");
  return sealed;
}

let world = sealJustin(createNewDtWorld());
world = startSimpleBattle(world).world;
world = markSimpleBattleSplashDone(world);
assert(world.battle?.phase === "player", "start on player");
assert(world.battle?.round === 1, "round 1");

const justin0 = world.battle!.units.find((u) => u.name === "Justin")!;
const foe0 = world.battle!.units.find((u) => u.side === "enemy")!;
const justinHp0 = justin0.hp;
const foeHp0 = foe0.hp;
const log0 = world.battle!.log.length;

// Simulate "wait 5s" — only enemy-advance tick (should no-op on player phase)
for (let i = 0; i < 5; i++) {
  const r = advanceSimpleBattleEnemyPhase(world);
  world = r.world;
}
assert(world.battle?.phase === "player", "still player after idle advances");
assert(world.battle?.round === 1, "still round 1");
assert(
  world.battle!.units.find((u) => u.name === "Justin")!.hp === justinHp0,
  "Justin HP unchanged while idle"
);
assert(
  world.battle!.units.find((u) => u.side === "enemy")!.hp === foeHp0,
  "foe HP unchanged — no auto Justin attack"
);
assert(world.battle!.log.length === log0, "combat log idle");
assert(
  !world.battle!.log.some((l) => /Justin hits|Justin casts/i.test(l)),
  "no Justin damage lines"
);

// Corrupt bare enemy phase (no hero spent an action) must NOT outrank idle player.
const idle = world.battle!;
const bareEnemy = {
  ...idle,
  phase: "enemy" as const,
  message: "Enemy turn…",
};
assert(
  simpleBattleProgressScore(idle) >= simpleBattleProgressScore(bareEnemy),
  "idle player must outrank bare enemy phase"
);
const mergedBare = mergeSimpleBattle(idle, bareEnemy);
assert(mergedBare?.phase === "player", `bare enemy must not win merge (got ${mergedBare?.phase})`);

// Legitimate peer attack (spent action) may advance past idle.
const peerAttack = {
  ...idle,
  phase: "enemy" as const,
  message: "Enemy turn…",
  log: [...idle.log, "Justin hits foe for 9."],
  units: idle.units.map((u) =>
    u.side === "hero"
      ? { ...u, actionsLeft: 0 }
      : u.side === "enemy"
        ? { ...u, hp: Math.max(1, u.hp - 9) }
        : u
  ),
};
assert(
  simpleBattleProgressScore(peerAttack) > simpleBattleProgressScore(idle),
  "real attack progress outranks idle"
);
assert(mergeSimpleBattle(idle, peerAttack)?.phase === "enemy", "peer attack merges forward");

// World-level merge of bare enemy must keep idle player
const worldEnemy = {
  ...world,
  battle: bareEnemy,
  storyPlayMs: (world.storyPlayMs ?? 0) + 5000,
};
const worldMerged = mergeDtWorld(world, worldEnemy, "justin", true);
assert(
  worldMerged.battle?.phase === "player",
  `mergeDtWorld must keep idle player (got ${worldMerged.battle?.phase})`
);

// After a real click, enemy advance may run — then player waits again with no further Justin hits
let r = performSimpleBattleAction(world, justin0.id, "attack", foe0.id);
world = r.world;
assert(world.battle?.phase === "enemy", "real attack → enemy");
r = advanceSimpleBattleEnemyPhase(world);
world = r.world;
assert(world.battle?.phase === "player", "after enemy → player");
const logAfter = world.battle!.log.length;
const foeAfter = world.battle!.units.find((u) => u.side === "enemy")!.hp;
for (let i = 0; i < 5; i++) {
  world = advanceSimpleBattleEnemyPhase(world).world;
}
assert(world.battle!.log.length === logAfter, "no further auto combat while waiting on player");
assert(
  world.battle!.units.find((u) => u.side === "enemy")!.hp === foeAfter,
  "foe HP stable on idle player turn"
);

console.log("PASS idle/no-auto battle smoke");
