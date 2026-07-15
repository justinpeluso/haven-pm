/**
 * QA: using a healing potion must survive mergeDtWorld (server POST + client poll).
 * Run: npx tsx scripts/qa-dt-potion-merge.ts
 */
import {
  listCreateMagic,
  listCreateSkills,
  magicSlotsForClass,
  weaponsForClass,
} from "../src/lib/downtown/party-chronicle/create";
import {
  createNewDtWorld,
  mergeDtWorld,
  sealDtCharacter,
} from "../src/lib/downtown/dungeon-tester/persist";
import { dtUseConsumable } from "../src/lib/downtown/dungeon-tester/camp";

function assert(cond: unknown, msg: string): asserts cond {
  if (!cond) throw new Error(msg);
}

const classId = "warrior" as const;
const magicNeed = magicSlotsForClass(classId);

const sealed = sealDtCharacter(createNewDtWorld(), "justin", {
  name: "Trailhand",
  classId,
  raceId: "human",
  dogName: "Dusty",
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
    magicAbilityIds: listCreateMagic().slice(0, magicNeed).map((m) => m.id),
  },
});
assert(!("error" in sealed), "seal failed");
let world = sealed;

const before = world.characters.justin;
assert(before.inventory.includes("dt-dust-poultice"), "starter poultice missing");

// Simulate damage so Use visibly heals.
world = {
  ...world,
  characters: {
    ...world.characters,
    justin: { ...before, hp: Math.max(1, before.hp - 20) },
  },
};
const damaged = world.characters.justin;
const hpBefore = damaged.hp;
const invBefore = [...damaged.inventory];
const poulticeBefore = invBefore.filter((id) => id === "dt-dust-poultice").length;

const used = dtUseConsumable(world, "justin", "dt-dust-poultice");
assert(!("error" in used), `use failed: ${"error" in used ? used.error : ""}`);
world = used.world;
const after = world.characters.justin;
const poulticeAfter = after.inventory.filter((id) => id === "dt-dust-poultice").length;
assert(poulticeAfter === poulticeBefore - 1, "potion not consumed");
assert(after.hp > hpBefore, `HP did not rise (${hpBefore} → ${after.hp})`);

// Stale server copy still has potion + lower HP.
const staleServer = {
  ...world,
  characters: {
    ...world.characters,
    justin: { ...damaged, inventory: invBefore, hp: hpBefore },
  },
};

// Server POST: existing=stale DB, incoming=fresh client
const posted = mergeDtWorld(staleServer, world, "justin", true);
assert(
  posted.characters.justin.inventory.filter((id) => id === "dt-dust-poultice").length ===
    poulticeAfter,
  "POST merge resurrected potion"
);
assert(posted.characters.justin.hp === after.hp, `POST merge rewound HP (${posted.characters.justin.hp})`);

// Client poll: existing=local used, incoming=stale remote
const polled = mergeDtWorld(world, staleServer, "justin", true, { seatTie: "existing" });
assert(
  polled.characters.justin.inventory.filter((id) => id === "dt-dust-poultice").length ===
    poulticeAfter,
  "poll merge resurrected potion"
);
assert(polled.characters.justin.hp === after.hp, `poll merge rewound HP (${polled.characters.justin.hp})`);

console.log("qa-dt-potion-merge: OK", {
  hp: `${hpBefore} → ${after.hp}`,
  poultice: `${poulticeBefore} → ${poulticeAfter}`,
});
