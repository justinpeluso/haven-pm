import { createNewDtWorld, sealDtCharacter } from "../src/lib/downtown/dungeon-tester/persist";
import {
  listCreateMagic,
  listCreateSkills,
  magicSlotsForClass,
  weaponsForClass,
} from "../src/lib/downtown/party-chronicle/create";
import {
  dtCampDisbandCompanion,
  dtCampDogFetch,
} from "../src/lib/downtown/dungeon-tester/camp";
import {
  performSimpleBattleAction,
  startSimpleBattle,
} from "../src/lib/downtown/dungeon-tester/simple-battle";

let world = createNewDtWorld();
const sealed = sealDtCharacter(world, "justin", {
  name: "Justin",
  classId: "warrior",
  raceId: "human",
  dogName: "Scout",
  dogBreed: "hound",
  statBumps: {
    strength: 5,
    constitution: 5,
    dexterity: 4,
    wisdom: 4,
    intelligence: 4,
    charisma: 5,
  },
  kit: {
    weaponId: weaponsForClass("warrior")[0]!.id,
    skillAbilityId: listCreateSkills()[0]!.id,
    magicAbilityIds: listCreateMagic()
      .slice(0, magicSlotsForClass("warrior"))
      .map((m) => m.id),
  },
});
if ("error" in sealed) throw new Error(String(sealed.error));
world = sealed;
world.characters.justin!.dog = {
  ...world.characters.justin!.dog,
  bond: 20,
  hunger: 0,
  sulking: false,
};

let r = dtCampDogFetch(world, "justin", () => 0.42);
if ("error" in r) throw new Error(r.error);
world = r.world;
const c = world.characters.justin!.fetchedCompanion!;
console.log("fetched", c.name, c.sex, c.raceId, c.classId, "Lv", c.level);

r = startSimpleBattle(world, { rng: () => 0.3 });
world = r.world;
world.battle = { ...world.battle!, splashDone: true, phase: "player" };
const companion = world.battle!.units.find((u) => u.isCompanion)!;
console.log("in battle", companion.name, "actions", companion.actionsLeft);
const foe = world.battle!.units.find((u) => u.side === "enemy")!;
const atk = performSimpleBattleAction(world, companion.id, "attack", foe.id, () => 0.1);
console.log("companion attack:", atk.message);

const d = dtCampDisbandCompanion({ ...atk.world, battle: null }, "justin");
if ("error" in d) throw new Error(d.error);
console.log("disbanded ok");
console.log("PASS");
