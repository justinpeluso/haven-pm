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
  simpleBattleShouldSkipSplash,
  ensureSimpleBattleSplashConsistency,
  mergeSimpleBattle,
  simpleBattleProgressScore,
  fleeSimpleBattle,
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
assert(typeof world.battle!.id === "string" && world.battle!.id.length > 0, "stable battle id");
assert(world.battle!.splashDone !== true, "splash not done yet");
const battleId0 = world.battle!.id;

// Splash skip: brand-new fight must show; mid-fight must never restart.
assert(
  simpleBattleShouldSkipSplash(world.battle!) === false,
  "new battle should allow splash"
);
{
  const mid = ensureSimpleBattleSplashConsistency({
    ...world.battle!,
    round: 3,
    phase: "enemy",
    splashDone: false,
    log: ["Justin hits foe for 9.", "— Round 3 —", "Ambush!"],
  });
  assert(mid.splashDone === true, "mid-fight remount stamps splashDone");
  assert(
    simpleBattleShouldSkipSplash({ ...mid, splashDone: false, round: 3 }) === true,
    "round≥2 skips splash even if flag missing"
  );
  const advanced = { ...world.battle!, round: 4, phase: "player" as const, splashDone: true };
  const stale = {
    ...world.battle!,
    round: 3,
    phase: "enemy" as const,
    splashDone: false,
    message: "Enemy turn…",
  };
  assert(
    simpleBattleProgressScore(advanced) > simpleBattleProgressScore(stale),
    "player round 4 outranks stale enemy round 3"
  );
  // Bare enemy (no hero spent) must not outrank idle player at same round.
  {
    const idleP = { ...world.battle!, phase: "player" as const, splashDone: true };
    const bareE = { ...idleP, phase: "enemy" as const, message: "Enemy turn…" };
    assert(
      simpleBattleProgressScore(idleP) >= simpleBattleProgressScore(bareE),
      "idle player outranks bare enemy phase"
    );
  }
  const merged = mergeSimpleBattle(advanced, stale);
  assert(merged?.round === 4 && merged?.phase === "player", "merge must not regress turn");
  assert(merged?.splashDone === true, "merge keeps sticky splashDone");
}
const blocked = startSimpleBattle(world);
assert(blocked.world.battle?.id === battleId0, "second start blocked while overlay open");
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

// Flee clears an active fight for soft-lock recovery.
{
  let w = createNewDtWorld();
  const sealed2 = sealDtCharacter(w, "justin", {
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
  assert(!("error" in sealed2), "seal for flee test");
  w = sealed2;
  w = startSimpleBattle(w).world;
  assert(w.battle?.status === "active", "active for flee");
  const fled = fleeSimpleBattle(w);
  assert(fled.world.battle === null, "flee clears active battle");
  console.log("flee ok:", fled.message);
}

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
