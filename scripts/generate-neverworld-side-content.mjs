#!/usr/bin/env node

import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
const dataDir = path.join(root, "data", "party-chronicle");

const epithets = [
  "Ashen",
  "Briar",
  "Cinder",
  "Drowned",
  "Ebon",
  "Frost",
  "Gloam",
  "Hollow",
  "Iron",
  "Jade",
];
const forms = [
  { noun: "Warg", tag: "beast", artId: "art-wolf-ulfric", skill: "Rending Howl" },
  { noun: "Myrmidon", tag: "humanoid", artId: "art-goblin-scout", skill: "Warband Rush" },
  { noun: "Oracle", tag: "arcane", artId: "art-serpent-nyx", skill: "Crooked Prophecy" },
  { noun: "Colossus", tag: "construct", artId: "art-bear-bruna", skill: "Faultline Stomp" },
  { noun: "Harbinger", tag: "spirit", artId: "art-raven-corv", skill: "Doomfeather Gale" },
  { noun: "Reaver", tag: "humanoid", artId: "art-ember-thane", skill: "Scorching Cleave" },
  { noun: "Hart", tag: "beast", artId: "art-stag-aelwyn", skill: "Crown of Thorns" },
  { noun: "Drake", tag: "dragon", artId: "art-dragon-silhouette", skill: "Skyfire Torrent" },
  { noun: "Hydra", tag: "beast", artId: "art-serpent-nyx", skill: "Many-Mawed Fury" },
  { noun: "Dreadlord", tag: "demon", artId: "art-demon-herald", skill: "Abyssal Edict" },
];
const regions = [
  "Frostford",
  "Goblin Road",
  "Ember Hall",
  "Dragon Ruin",
  "Misty Bridge",
  "Wolf Ridge",
  "Ash Crown",
  "Fellowship Camp",
  "Worldeater Gate",
  "Last Council",
];
const scenes = [
  "scene-frostford-gate",
  "scene-goblin-camp",
  "scene-ember-hall",
  "scene-dragon-ruin",
  "scene-misty-bridge",
  "scene-wolf-ridge",
  "scene-ash-crown",
  "scene-fellowship-camp",
  "scene-worldeater-gate",
  "scene-last-council",
];

const slug = (value) =>
  value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "");

const sideBosses = [];
const expandedQuests = [];

for (let index = 0; index < 100; index += 1) {
  const level = index + 1;
  const act = Math.floor(index / 10) + 1;
  const epithet = epithets[Math.floor(index / 10)];
  const form = forms[index % forms.length];
  const name = `${epithet} ${form.noun} of ${regions[act - 1]}`;
  const id = `side-${slug(epithet)}-${slug(form.noun)}-${String(index + 1).padStart(3, "0")}`;
  const trophyId = `side-trophy-${String(index + 1).padStart(3, "0")}`;
  const skillId = `side-skill-${String(index + 1).padStart(3, "0")}`;
  const hp = Math.round(95 + level * 17 + level ** 1.35 * 2.5);
  const power = Math.round(11 + level * 1.75);
  const armor = Math.round(1 + level * 0.32);

  sideBosses.push({
    id,
    name,
    blurb: `A notorious ${form.tag} whose challenge has become a whispered test among hunters.`,
    levelMin: level,
    levelMax: Math.min(100, level + 8),
    hp,
    power,
    armor,
    xp: Math.round(70 + level * 22),
    gold: Math.round(15 + level * 6.5),
    tags: ["boss", "side-boss", form.tag],
    artId: form.artId,
    uniqueSkill: {
      id: skillId,
      name: form.skill,
      blurb: `Unleashes the signature technique of the ${epithet.toLowerCase()} hunt.`,
      power: Math.round(power * 1.4),
      manaCost: 0,
    },
    uniqueDrops: [trophyId],
    weight: 1,
  });

  expandedQuests.push({
    id: `sq-hunt-${id}`,
    actId: `act-${act}`,
    title: `Hunt: ${name}`,
    estimatedMinutes: 35 + (index % 4) * 10,
    kind: index % 3 === 0 ? "gear" : "exploration",
    summary: `Track and defeat ${name} (${id}), then bring proof of the hunt back to camp.`,
    steps: [
      `Gather rumors about ${name}`,
      `Track ${id} through ${regions[act - 1]}`,
      `Defeat ${name}`,
      `Record the ${trophyId} in the hunting ledger`,
    ],
    rewards: {
      xp: Math.round(45 + level * 14),
      gold: Math.round(10 + level * 4),
      itemIds: [],
      flagsAdd: [`side-boss-felled:${id}`, `side-hunt-act-${act}`],
      alignment: index % 2 === 0 ? { animal: 1 } : { human: 1 },
    },
    artId: form.artId,
    sceneId: scenes[act - 1],
    npcId: null,
  });
}

await mkdir(dataDir, { recursive: true });
await Promise.all([
  writeFile(
    path.join(dataDir, "side-bosses.json"),
    `${JSON.stringify({ bosses: sideBosses }, null, 2)}\n`
  ),
  writeFile(
    path.join(dataDir, "side-quests-expanded.json"),
    `${JSON.stringify({ sideQuests: expandedQuests }, null, 2)}\n`
  ),
]);

console.log(`Generated ${sideBosses.length} side bosses.`);
console.log(`Generated ${expandedQuests.length} boss-hunt side quests.`);
console.log(`Level coverage: ${sideBosses[0].levelMin}-${sideBosses.at(-1).levelMin}.`);
