import {
  createNewWorld,
  mergeIncomingWorld,
  worldHasProgress,
  pickRicherWorld,
  completeCharacterCreation,
  normalizeWorld,
} from "../src/lib/downtown/party-chronicle/persist";
import {
  acknowledgeNarrative,
  applyStoryChoice,
  canAct,
  nextPlayableSlot,
} from "../src/lib/downtown/party-chronicle/engine";
import { getStoryNode } from "../src/lib/downtown/party-chronicle/story";
import { slotFromEmail, isDmEmail } from "../src/lib/downtown/party-chronicle/players";
import { PLAYER_SLOT_ORDER } from "../src/lib/downtown/party-chronicle/types";
import {
  weaponsForClass,
  listCreateSkills,
  listCreateMagic,
  magicSlotsForClass,
} from "../src/lib/downtown/party-chronicle/create";
import type { ClassId, PartyWorldSave, PlayerSlot } from "../src/lib/downtown/party-chronicle/types";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

function seal(
  world: PartyWorldSave,
  slot: PlayerSlot,
  classId: ClassId,
  name: string,
  dogName: string
): PartyWorldSave {
  const weapons = weaponsForClass(classId);
  const skills = listCreateSkills();
  const magic = listCreateMagic();
  const need = magicSlotsForClass(classId);
  const char = completeCharacterCreation(world.characters[slot], {
    name,
    classId,
    dogName,
    dogBreed: "Companion",
    statBumps: { wisdom: 1 },
    kit: {
      weaponId: weapons[0]!.id,
      skillAbilityId: skills[0]!.id,
      magicAbilityIds: magic.slice(0, need).map((m) => m.id),
    },
  });
  if ("error" in char) throw new Error(char.error);
  return {
    ...world,
    characters: { ...world.characters, [slot]: char },
  };
}

assert(slotFromEmail("player1@havenpm.com") === "justin", "p1");
assert(slotFromEmail("player2@havenpm.com") === "rusty", "p2");
assert(slotFromEmail("player3@havenpm.com") === "elisha", "p3");
assert(isDmEmail("player1@havenpm.com"), "dm");

let world = createNewWorld();
world = seal(world, "justin", "healer", "Justin", "Chompers");
world = acknowledgeNarrative(world, "justin");
assert(world.campaignNodeId === "node-ch1-pip", "pip");
assert(world.activeSlot === "justin", "turn held");

const pip = getStoryNode(world.campaignNodeId)!;
assert(pip && "choices" in pip, "choices");
world = applyStoryChoice(world, "justin", pip.choices[0]!).world;
// Only Justin sealed — rotation stays on sealed seats.
assert(world.activeSlot === "justin", `stay on sealed justin, got ${world.activeSlot}`);

world = { ...world, activeSlot: "elisha" };
world = normalizeWorld(world);
assert(world.activeSlot === "justin", `snap off empty seat, got ${world.activeSlot}`);

world = seal(world, "rusty", "ranger", "Rusty", "Copper");
assert(nextPlayableSlot(world, "justin") === "rusty", "next rusty");

// DM stale must not wipe Rusty
const dmStale: PartyWorldSave = {
  ...world,
  characters: { ...world.characters, rusty: createNewWorld().characters.rusty },
};
assert(!dmStale.characters.rusty.created, "stale blank");
const merged = mergeIncomingWorld(world, dmStale, "justin", true);
assert(merged.characters.rusty.created, "keep rusty");

// Non-DM create must not rewind campaign
const elishaLocal = seal(
  {
    ...createNewWorld(),
    characters: {
      ...createNewWorld().characters,
      justin: world.characters.justin,
    },
  },
  "elisha",
  "mage",
  "Elisha",
  "Lumen"
);
const afterElisha = mergeIncomingWorld(world, elishaLocal, "elisha", false);
assert(afterElisha.characters.elisha.created, "elisha sealed");
assert(afterElisha.campaignNodeId === world.campaignNodeId, "no rewind node");
assert(afterElisha.turnIndex === world.turnIndex, "no rewind turn");
assert(afterElisha.characters.justin.created, "justin kept");
assert(afterElisha.characters.rusty.created, "rusty kept");

const full = afterElisha;
assert(worldHasProgress(full), "progress");
assert(
  pickRicherWorld(dmStale, full)?.characters.elisha.created ||
    pickRicherWorld(dmStale, full) === full,
  "richer prefers more sealed"
);
const elishaTurn = normalizeWorld({ ...full, activeSlot: "elisha" });
assert(elishaTurn.activeSlot === "elisha", "elisha stays when sealed");
assert(canAct(elishaTurn, "elisha", false), "elisha acts");

console.log("OK first-run checks passed");
console.log({
  node: full.campaignNodeId,
  active: elishaTurn.activeSlot,
  created: PLAYER_SLOT_ORDER.map((s) => `${s}:${full.characters[s].created}`).join(", "),
});
