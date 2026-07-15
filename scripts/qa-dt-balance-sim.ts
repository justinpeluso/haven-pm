/**
 * Quick win-rate / spawn sim for DT simple battle balance.
 * Run: npx tsx scripts/qa-dt-balance-sim.ts
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
  chapterNumberFromId,
  encounterSpawnTuning,
} from "../src/lib/downtown/dungeon-tester/simple-battle";
import { PLAYER_SLOT_ORDER } from "../src/lib/downtown/party-chronicle/types";

function seal(world: any, slot: any, classId: any) {
  const magicNeed = magicSlotsForClass(classId);
  const r = sealDtCharacter(world, slot, {
    name: String(slot),
    classId,
    raceId: "human",
    dogName: "D",
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
  if ("error" in r) throw new Error(r.error);
  return r;
}

function mkWorld(nHeroes: number, chapterId = "dt-ch-01-chain-road", battlesFought = 0) {
  let w = createNewDtWorld();
  w = { ...w, chapterId, battlesFought };
  const classes = ["warrior", "rogue", "ranger", "mage"] as const;
  for (let i = 0; i < nHeroes; i++) {
    w = seal(w, PLAYER_SLOT_ORDER[i], classes[i % 4]);
  }
  return w;
}

function playCareful(world: any, rng: () => number) {
  let guard = 0;
  while (world.battle?.status === "active" && guard++ < 200) {
    const heroes = world.battle.units.filter(
      (u: any) => u.side === "hero" && u.hp > 0 && u.actionsLeft > 0
    );
    const foes = world.battle.units.filter((u: any) => u.side === "enemy" && u.hp > 0);
    if (!heroes.length || !foes.length) break;
    const h = heroes[0];
    const wounded = world.battle.units.find(
      (u: any) => u.side === "hero" && u.hp > 0 && u.hp / u.maxHp < 0.45
    );
    let action: any = "attack";
    let target = foes.sort((a: any, b: any) => a.hp - b.hp)[0].id;
    if (wounded && h.hp / h.maxHp >= 0.5 && rng() < 0.7) {
      action = "heal";
      target = wounded.id;
    } else if (h.hp / h.maxHp < 0.4 && rng() < 0.55) {
      action = "potion";
      target = h.id;
    }
    world = performSimpleBattleAction(world, h.id, action, target, rng).world;
  }
  return world;
}

function mulberry(seed: number) {
  let t = seed >>> 0;
  return () => {
    t += 0x6d2b79f5;
    let r = Math.imul(t ^ (t >>> 15), 1 | t);
    r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
    return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
  };
}

console.log("tuning samples:");
for (const ch of [1, 2, 3, 5, 7]) {
  const t = encounterSpawnTuning(ch, ch === 1 ? 0 : 2);
  const counts = [0, 0, 0, 0];
  const rng = mulberry(ch * 99);
  for (let i = 0; i < 100; i++) counts[t.foeCount(rng)]++;
  console.log(
    `  ch${ch} hp×${t.hpMult} pw×${t.powerMult} foes≈`,
    counts.slice(1).map((n, i) => `${i + 1}:${n}`).join(" ")
  );
}

for (const [label, chapterId, battlesFought, n] of [
  ["ch1-first-4h", "dt-ch-01-chain-road", 0, 4],
  ["ch1-first-1h", "dt-ch-01-chain-road", 0, 1],
  ["ch1-later-4h", "dt-ch-01-chain-road", 3, 4],
  ["ch5-4h", "dt-ch-05-candlemire-gates", 5, 4],
] as const) {
  let wins = 0;
  const foeCounts: number[] = [];
  const foeHp: number[] = [];
  const foePw: number[] = [];
  for (let s = 0; s < 60; s++) {
    const rng = mulberry(2000 + s * 19 + n * 11);
    let w = mkWorld(n, chapterId, battlesFought);
    w = startSimpleBattle(w, { rng }).world;
    const enemies = w.battle!.units.filter((u: any) => u.side === "enemy");
    foeCounts.push(enemies.length);
    foeHp.push(...enemies.map((e: any) => e.hp));
    foePw.push(...enemies.map((e: any) => e.power));
    const hero = w.battle!.units.find((u: any) => u.side === "hero")!;
    if (hero.stamina == null || hero.maxStamina == null) throw new Error("missing stamina");
    w = playCareful(w, rng);
    if (w.battle?.status === "victory") wins++;
  }
  const avg = (a: number[]) => a.reduce((x, y) => x + y, 0) / a.length;
  console.log(
    `${label} ch#${chapterNumberFromId(chapterId)} win=${((wins / 60) * 100).toFixed(0)}% avgFoes=${avg(foeCounts).toFixed(2)} avgHp=${avg(foeHp).toFixed(1)} avgPw=${avg(foePw).toFixed(1)}`
  );
}
console.log("PASS balance sim");
