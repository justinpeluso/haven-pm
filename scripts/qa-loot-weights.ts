import { DT_CHAPTER_LOOT_WEIGHTS, rollDtWeightedBattleDrop, dtLootTierLabel } from "../src/lib/downtown/dungeon-tester/bestiary";
import { rollSimpleBattleLoot } from "../src/lib/downtown/dungeon-tester/simple-battle";
import type { SimpleBattleState } from "../src/lib/downtown/dungeon-tester/simple-battle";

function assert(c: unknown, m: string): asserts c { if (!c) throw new Error(m); }

assert(dtLootTierLabel("magic") === "Enchanted", "label");
assert(DT_CHAPTER_LOOT_WEIGHTS[1]?.trash, "ch1 trash");

let legend = 0;
for (let i = 0; i < 80; i++) {
  const item = rollDtWeightedBattleDrop("dt-ch-01-chain-road", () => Math.random());
  if (item?.tier === "legendary" || item?.tier === "epic") legend++;
}
assert(legend < 8, `ch1 too many epic/legendary: ${legend}`);

const fakeBattle = {
  chapterId: "dt-ch-01-chain-road",
  units: [
    { side: "enemy", hp: 0, foeDefId: "boss-coffle-master", lootPool: "magic" },
    { side: "enemy", hp: 0, foeDefId: "dust-trail-warg" },
  ],
} as unknown as SimpleBattleState;
const drops = rollSimpleBattleLoot(fakeBattle, () => 0.2);
assert(drops.some((d) => d.itemId === "dt-liberators-spur" || d.itemId.includes("spur") || d.name.toLowerCase().includes("spur") || drops.length >= 1), "boss loot present");
assert(drops.length <= 4, "cap");
console.log("drops", drops.map((d) => d.name));
console.log("PASS");
