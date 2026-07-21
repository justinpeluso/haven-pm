/**
 * Story turn gate + auto-pass after Continue when 2+ sealed.
 * Run: node --import tsx scripts/qa-coop-turns.ts
 */
import {
  listCreateMagic,
  listCreateSkills,
  magicSlotsForClass,
  weaponsForClass,
} from "../src/lib/downtown/party-chronicle/create";
import {
  dtCanAdvanceStory,
  dtPassTurn,
  dtSealedPartySlots,
} from "../src/lib/downtown/dungeon-tester/camp";
import { continueFrame } from "../src/lib/downtown/dungeon-tester/engine";
import { createNewDtWorld, sealDtCharacter } from "../src/lib/downtown/dungeon-tester/persist";

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

let world = seal(createNewDtWorld(), "justin", "Justin");
assert(dtSealedPartySlots(world).length === 1, "one sealed");
assert(dtCanAdvanceStory(world, "justin"), "solo can advance");
assert(dtCanAdvanceStory(world, "rusty") === false, "unsealed cannot");

world = seal(world, "rusty", "Rusty");
assert(dtSealedPartySlots(world).length === 2, "two sealed");
world = { ...world, activeSlot: "justin" };
assert(dtCanAdvanceStory(world, "justin"), "justin turn");
assert(dtCanAdvanceStory(world, "rusty") === false, "rusty waits");
assert(dtCanAdvanceStory(world, "rusty", { isDm: true }), "dm override");

const before = world.activeSlot;
const advanced = continueFrame(world);
// May or may not move frames depending on spine, but when it does and 2+ sealed, turn passes.
if (advanced.world.campaignNodeId !== world.campaignNodeId) {
  assert(
    advanced.world.activeSlot !== before || advanced.world.turnIndex > world.turnIndex,
    "auto-pass after continue"
  );
  console.log("continue advanced frame + turn", before, "→", advanced.world.activeSlot);
} else {
  console.log("continue did not advance frame (spine gated) — checking passTurn");
}

world = { ...world, activeSlot: "justin" };
const passed = dtPassTurn(world, "justin");
assert(!("error" in passed), "pass ok");
assert(passed.world.activeSlot === "rusty", "pass to rusty");

const denied = dtPassTurn(passed.world, "justin");
assert("error" in denied, "not your turn");

console.log("PASS");
