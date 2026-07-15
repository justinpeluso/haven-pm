/**
 * Smoke test DT simple battle engine (no browser).
 * Run: npx tsx scripts/qa-simple-battle.ts
 */
import {
  listCreateMagic,
  listCreateSkills,
  magicSlotsForClass,
  weaponsForClass,
} from "../src/lib/downtown/party-chronicle/create";
import { createNewDtWorld, sealDtCharacter } from "../src/lib/downtown/dungeon-tester/persist";
import {
  startSimpleBattle,
  performSimpleBattleAction,
  advanceSimpleBattleEnemyPhase,
  dismissSimpleBattle,
} from "../src/lib/downtown/dungeon-tester/simple-battle";
import { continueFrame } from "../src/lib/downtown/dungeon-tester/engine";
import {
  DT_ENCOUNTER_MIN_FRAMES,
  DT_ENCOUNTER_MAX_FRAMES,
} from "../src/lib/downtown/dungeon-tester/types";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

let world = createNewDtWorld();
const classId = "warrior" as const;
const magicNeed = magicSlotsForClass(classId);
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
assert(!("error" in sealed), `seal failed: ${"error" in sealed ? sealed.error : ""}`);
world = sealed;

console.log(
  "sealed ok — frames",
  world.framesAdvanced,
  "next@",
  world.nextEncounterAtFrame
);
assert(
  world.nextEncounterAtFrame >= DT_ENCOUNTER_MIN_FRAMES,
  "next encounter below min"
);
assert(
  world.nextEncounterAtFrame <= world.framesAdvanced + DT_ENCOUNTER_MAX_FRAMES,
  "next encounter above max window"
);

let r = startSimpleBattle(world);
world = r.world;
assert(world.battle?.status === "active", "battle should start");
assert(
  world.battle!.units.every((u) => typeof u.x === "number" && typeof u.y === "number"),
  "fixed spots"
);
assert(!("tactical" in (world.battle as object)), "no Neverworld tactical grid");
const enemies0 = world.battle!.units.filter((u) => u.side === "enemy");
const heroes0 = world.battle!.units.filter((u) => u.side === "hero");
assert(enemies0.length === 1, "ch1 first ambush should be 1 foe");
assert(
  typeof heroes0[0]?.stamina === "number" && typeof heroes0[0]?.maxStamina === "number",
  "hero stamina for FF bars"
);
assert(enemies0[0]!.hp <= Math.round(enemies0[0]!.maxHp), "enemy hp consistent");
console.log(
  "battle start:",
  world.battle!.message,
  "foes",
  enemies0.length,
  "enemyHp",
  enemies0[0]!.hp,
  "enemyPw",
  enemies0[0]!.power,
  "units",
  world.battle!.units.length
);

const hero0 = world.battle!.units.find((u) => u.side === "hero")!;
const foe0 = world.battle!.units.find((u) => u.side === "enemy")!;

r = performSimpleBattleAction(world, hero0.id, "attack", foe0.id);
world = r.world;
assert(world.battle!.fx.some((f) => f.kind === "ray"), "attack ray");
assert(
  world.battle!.fx.some((f) => f.kind === "float" && (f.label ?? "").includes("−")),
  "float −dmg"
);
console.log(
  "attack:",
  r.message,
  "fx",
  world.battle!.fx.map((f) => `${f.kind}${f.label ?? ""}`).join(",")
);
if (world.battle?.status === "active" && world.battle.phase === "enemy") {
  assert(world.battle.fx.length > 0, "player fx held into enemy phase");
  r = advanceSimpleBattleEnemyPhase(world);
  world = r.world;
  console.log("enemy advance →", world.battle?.phase, world.battle?.message);
}

let guard = 0;
while (world.battle && world.battle.status === "active" && guard++ < 100) {
  if (world.battle.phase === "enemy") {
    r = advanceSimpleBattleEnemyPhase(world);
    world = r.world;
    continue;
  }

  const h = world.battle.units.find(
    (u) => u.side === "hero" && u.actionsLeft > 0 && u.hp > 0
  );
  const e = world.battle.units.find((u) => u.side === "enemy" && u.hp > 0);
  if (!h || !e) break;

  if (guard === 2) {
    r = performSimpleBattleAction(world, h.id, "buff", h.id);
    world = r.world;
    const after = world.battle?.units.find((u) => u.id === h.id);
    console.log(
      "buff:",
      r.message,
      "haste",
      after?.haste,
      "actionsLeft",
      after?.actionsLeft
    );
    assert(after?.haste === true, "haste applied");
    continue;
  }
  if (guard === 3) {
    r = performSimpleBattleAction(world, h.id, "heal", h.id);
    world = r.world;
    console.log("heal:", r.message);
    continue;
  }
  if (guard === 4) {
    r = performSimpleBattleAction(world, h.id, "potion");
    world = r.world;
    console.log("potion:", r.message);
    continue;
  }
  if (guard === 5) {
    r = performSimpleBattleAction(world, h.id, "magic", e.id);
    world = r.world;
    console.log("magic:", r.message);
    continue;
  }

  r = performSimpleBattleAction(world, h.id, "attack", e.id);
  world = r.world;
  if (world.battle?.status === "active" && world.battle.round >= 2 && guard === 12) {
    console.log(
      "enemy→player round loop:",
      "round",
      world.battle.round,
      "phase",
      world.battle.phase
    );
    assert(
      world.battle.phase === "player" || world.battle.phase === "enemy",
      "still in combat loop"
    );
  }
}

assert(
  world.battle?.status === "victory" || world.battle?.status === "defeat",
  "battle should end"
);
console.log("end:", world.battle?.status, world.battle?.message);

world = dismissSimpleBattle(world);
assert(world.battle === null, "dismiss clears battle");
console.log("dismissed → story frame", world.campaignNodeId);

world = {
  ...world,
  nextEncounterAtFrame: world.framesAdvanced + 1,
  framesSinceEncounter: 99,
};
for (let i = 0; i < 8 && !world.battle; i++) {
  const cur = continueFrame(world);
  world = cur.world;
  if (cur.message) console.log("continue:", cur.message?.slice(0, 80));
}
assert(!!world.battle, "cadence continue should start ambush when due");
console.log(
  "cadence battle:",
  world.battle?.message,
  "frames",
  world.framesAdvanced
);
console.log("PASS all smoke checks");
