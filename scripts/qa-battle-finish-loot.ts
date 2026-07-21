/**
 * Kill → victory + loot → merge mustn't undo → dismiss grants.
 * Run: node --import tsx scripts/qa-battle-finish-loot.ts
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
  dismissSimpleBattle,
  mergeSimpleBattle,
  markSimpleBattleSplashDone,
  advanceSimpleBattleEnemyPhase,
} from "../src/lib/downtown/dungeon-tester/simple-battle";

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
assert(!("error" in sealed), `seal failed`);
world = sealed;

let r = startSimpleBattle(world, { rng: () => 0.1 });
world = markSimpleBattleSplashDone(r.world);
assert(world.battle?.status === "active", "battle minted");

const enemy = world.battle!.units.find((u) => u.side === "enemy")!;
console.log("foe start", enemy.name, enemy.hp, "armor", enemy.armor);

let guards = 0;
while (world.battle?.status === "active" && guards++ < 120) {
  const b = world.battle!;
  if (b.phase === "enemy") {
    world = advanceSimpleBattleEnemyPhase(world, () => 0.2).world;
    continue;
  }
  const foe = b.units.find((u) => u.side === "enemy" && u.hp > 0);
  const livingHero = b.units.find((u) => u.side === "hero" && u.hp > 0 && u.actionsLeft > 0);
  if (!livingHero) {
    if (b.phase === "player") {
      world = {
        ...world,
        battle: { ...b, phase: "enemy", focusHeroId: null },
      };
    }
    continue;
  }
  if (!foe) break;
  const act = performSimpleBattleAction(world, livingHero.id, "attack", foe.id, () => 0.99);
  world = act.world;
}

assert(world.battle?.status === "victory", `expected victory, got ${world.battle?.status}`);
assert(world.battle.phase === "summary", "summary phase");
assert((world.battle.lootDrops?.length ?? 0) >= 1, "lootDrops present");
// Rewards grant on finish so the end screen can show live bag — not deferred to dismiss.
assert(world.battle.rewardsPending === false, "rewards already claimed on finish");
const midGold = world.characters.justin!.gold;
const midInv = world.characters.justin!.inventory.length;
assert(midInv >= 1, "loot already in bag on victory");
console.log("victory loot:", world.battle.lootDrops?.map((d) => d.name));
console.log("stats:", world.battle.combatStats);

const staleActive = {
  ...world.battle!,
  status: "active" as const,
  phase: "player" as const,
  lootDrops: [],
  rewardsPending: false,
  units: world.battle!.units.map((u) =>
    u.side === "enemy" ? { ...u, hp: Math.max(1, Math.floor(u.maxHp * 0.05)) } : u
  ),
};
const merged = mergeSimpleBattle(world.battle, staleActive);
assert(merged?.status === "victory", `merge kept victory, got ${merged?.status}`);
assert((merged?.lootDrops?.length ?? 0) >= 1, "merge kept loot");

// Poll-style: local victory must beat a remote stale active when merged the other way too.
const pollStyle = mergeSimpleBattle(staleActive, world.battle);
assert(pollStyle?.status === "victory", `poll-style merge kept victory, got ${pollStyle?.status}`);

world = dismissSimpleBattle(world);
assert(!world.battle, "battle cleared");
// Dismiss must not double-pay — gold/inv stay at post-victory levels.
assert(world.characters.justin!.inventory.length === midInv, "dismiss did not double loot");
assert(world.characters.justin!.gold === midGold, "dismiss did not double gold");
console.log("OK gold", world.characters.justin!.gold, "inv", world.characters.justin!.inventory.length);
console.log("PASS");
