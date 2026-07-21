/**
 * Kill → victory + loot → merge mustn't undo → dismiss grants.
 * Solo auto-claims items; multiplayer uses Take/Pass.
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
  claimSimpleBattleLootDrop,
  unclaimedLootDrops,
} from "../src/lib/downtown/dungeon-tester/simple-battle";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(`FAIL: ${msg}`);
}

function seal(
  world: ReturnType<typeof createNewDtWorld>,
  slot: "justin" | "rusty",
  name: string
) {
  const classId = "warrior" as const;
  const magicNeed = magicSlotsForClass(classId);
  const sealed = sealDtCharacter(world, slot, {
    name,
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
  assert(!("error" in sealed), `seal ${slot} failed`);
  return sealed;
}

function fightToVictory(world: ReturnType<typeof createNewDtWorld>) {
  let w = world;
  let r = startSimpleBattle(w, { rng: () => 0.1 });
  w = markSimpleBattleSplashDone(r.world);
  assert(w.battle?.status === "active", "battle minted");

  let guards = 0;
  while (w.battle?.status === "active" && guards++ < 120) {
    const b = w.battle!;
    if (b.phase === "enemy") {
      w = advanceSimpleBattleEnemyPhase(w, () => 0.2).world;
      continue;
    }
    const foe = b.units.find((u) => u.side === "enemy" && u.hp > 0);
    const livingHero = b.units.find(
      (u) => u.side === "hero" && u.hp > 0 && u.actionsLeft > 0 && !u.isDog
    );
    if (!livingHero) {
      if (b.phase === "player") {
        w = {
          ...w,
          battle: { ...b, phase: "enemy", focusHeroId: null },
        };
      }
      continue;
    }
    if (!foe) break;
    const act = performSimpleBattleAction(w, livingHero.id, "attack", foe.id, () => 0.99);
    w = act.world;
  }
  return w;
}

// --- Solo: auto-claim on finish ---
let world = seal(createNewDtWorld(), "justin", "Justin");
world = fightToVictory(world);

assert(world.battle?.status === "victory", `expected victory, got ${world.battle?.status}`);
assert(world.battle.phase === "summary", "summary phase");
assert((world.battle.lootDrops?.length ?? 0) >= 1, "lootDrops present");
assert(world.battle.goldXpGranted === true, "gold/xp granted on finish");
assert(world.battle.rewardsPending === false, "solo loot auto-claimed");
assert(unclaimedLootDrops(world.battle).length === 0, "no unclaimed solo loot");
const midGold = world.characters.justin!.gold;
const midInv = world.characters.justin!.inventory.length;
assert(midInv >= 1, "loot already in bag on victory");
console.log("solo victory loot:", world.battle.lootDrops?.map((d) => d.name));

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

const pollStyle = mergeSimpleBattle(staleActive, world.battle);
assert(pollStyle?.status === "victory", `poll-style merge kept victory, got ${pollStyle?.status}`);

world = dismissSimpleBattle(world);
assert(!world.battle, "battle cleared");
assert(world.characters.justin!.inventory.length === midInv, "dismiss did not double loot");
assert(world.characters.justin!.gold === midGold, "dismiss did not double gold");
console.log("OK solo gold", world.characters.justin!.gold, "inv", world.characters.justin!.inventory.length);

// --- Multi: loot stays on table until Take ---
let multi = seal(createNewDtWorld(), "justin", "Justin");
multi = seal(multi, "rusty", "Rusty");
multi = fightToVictory(multi);
assert(multi.battle?.status === "victory", "multi victory");
assert(multi.battle.goldXpGranted === true, "multi gold granted");
assert((multi.battle.lootDrops?.length ?? 0) >= 1, "multi has loot");
assert(unclaimedLootDrops(multi.battle).length >= 1, "multi loot unclaimed");
assert(multi.battle.rewardsPending === true, "rewardsPending while loot open");
const blocked = dismissSimpleBattle(multi);
assert(!!blocked.battle, "dismiss blocked while loot unclaimed");
const claimed = claimSimpleBattleLootDrop(multi, 0, "justin");
assert(!("error" in claimed), "claim ok");
multi = claimed.world;
while (unclaimedLootDrops(multi.battle).length > 0) {
  const idx = multi.battle!.lootDrops!.findIndex((d) => !d.claimedBy);
  const next = claimSimpleBattleLootDrop(multi, idx, "rusty");
  assert(!("error" in next), "claim remaining");
  multi = next.world;
}
assert(multi.battle?.rewardsPending === false, "loot cleared");
multi = dismissSimpleBattle(multi);
assert(!multi.battle, "multi dismiss ok");
console.log("OK multi claim flow");

// Seat lock
let seat = seal(createNewDtWorld(), "justin", "Justin");
seat = seal(seat, "rusty", "Rusty");
seat = markSimpleBattleSplashDone(startSimpleBattle(seat, { rng: () => 0.1 }).world);
const rustyUnit = seat.battle!.units.find(
  (u) => u.side === "hero" && u.slot === "rusty" && !u.isDog
)!;
const foe = seat.battle!.units.find((u) => u.side === "enemy" && u.hp > 0)!;
const denied = performSimpleBattleAction(seat, rustyUnit.id, "attack", foe.id, {
  actorSlot: "justin",
  isDm: false,
});
assert(denied.message === "Not your hero.", `seat lock: ${denied.message}`);
console.log("OK seat lock");

console.log("PASS");
