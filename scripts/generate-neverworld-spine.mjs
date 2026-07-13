#!/usr/bin/env node
/**
 * Generate the long-form Neverworld campaign spine.
 *
 * The authored story in story.ts remains the source of truth for landmark
 * scenes and endings. This file supplies the road between those landmarks.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const OUT = join(__dirname, "..", "data", "party-chronicle", "story-spine.json");
const TARGET_HOURS = 300;
const CHAPTER_HOURS = 6;
const NODES_PER_CHAPTER = 15;

const AUTHORED = {
  opening: "node-ch1-arrive",
  goblinRoad: "node-ch2-road",
  emberHold: "node-ch3-hall",
  dragonWhisper: "node-ch4-ruin",
  mistyCrossing: "node-ch5-bridge",
  crownOfAsh: "node-ch6-ash",
  fellowship: "node-ch7-camp",
  worldEaterGate: "node-ch8-gate",
  lastCouncil: "node-ch9-council",
  choose: "node-ch9-choose",
  animalFinale: "node-finale-animal",
  humanFinale: "node-finale-human",
  demonFinale: "node-finale-demon",
  resolveFinale: "node-finale-resolve",
};

const ARCS = [
  {
    from: AUTHORED.opening,
    to: AUTHORED.goblinRoad,
    chapters: 6,
    title: "The Foxfire Roads",
    stakes: "Frostford's winter stores vanish along roads that move after moonrise",
  },
  {
    from: AUTHORED.goblinRoad,
    to: AUTHORED.emberHold,
    chapters: 6,
    title: "The Crooked Banner",
    stakes: "scattered goblin clans gather beneath a banner stitched with stolen names",
  },
  {
    from: AUTHORED.emberHold,
    to: AUTHORED.dragonWhisper,
    chapters: 6,
    title: "Embers Under Stone",
    stakes: "the holds feud while something ancient breathes beneath their forges",
  },
  {
    from: AUTHORED.dragonWhisper,
    to: AUTHORED.mistyCrossing,
    chapters: 6,
    title: "The Wyrm's Long Echo",
    stakes: "dragon whispers wake ruins, cults, and memories across the high forest",
  },
  {
    from: AUTHORED.mistyCrossing,
    to: AUTHORED.crownOfAsh,
    chapters: 6,
    title: "Kingdoms in the Fog",
    stakes: "three rival claimants turn the mist country into a war of promises",
  },
  {
    from: AUTHORED.crownOfAsh,
    to: AUTHORED.fellowship,
    chapters: 6,
    title: "The Ashen Pilgrimage",
    stakes: "Nyx's black-glass road offers power while quietly dividing the fellowship",
  },
  {
    from: AUTHORED.fellowship,
    to: AUTHORED.worldEaterGate,
    chapters: 6,
    title: "The Broken Fellowship",
    stakes: "beasts and holds must unite before the World-Eater's heralds count them separately",
  },
  {
    from: AUTHORED.worldEaterGate,
    to: AUTHORED.lastCouncil,
    chapters: 8,
    title: "The Last Wild March",
    stakes: "all roads collapse toward the final gate and every old promise comes due",
  },
];

const CHAPTER_SEEDS = [
  ["Pine Road After Dark", "Pip knows why the mile-stones have begun walking.", "pine-road", "The Lantern-Tail Gang"],
  ["The Hounds' First Oath", "Three wet noses find a trail no map admits.", "hound-oath", "Muzzle-Mask Poachers"],
  ["Foxfire Toll", "The cheapest bridge asks for the dearest memory.", "foxfire-toll", "The Toll-Moss Spirit"],
  ["Miller's Moon", "A village grinds flour for guests who died last winter.", "millers-moon", "The Moon-Mill Wight"],
  ["Roots Beneath Frostford", "The town's foundations remember an older forest.", "frostford-roots", "The Cellar Treant"],
  ["The Last Honest Signpost", "Every arrow points toward trouble, which is unusually helpful.", "honest-signpost", "The Road-Swapping Hag"],
  ["Crows Over Cart-Rut", "Corv's census has three hundred missing names.", "crow-cart-rut", "Banner-Tooth Raiders"],
  ["The Goblin Parliament", "Democracy arrives carrying seventeen knives.", "goblin-parliament", "Speaker Grinbolt"],
  ["Mud-Crown Market", "Anything can be bought, including yesterday.", "mud-crown-market", "The Receipt Eater"],
  ["Fort Splinter", "A wooden fort prepares for a war nobody declared.", "fort-splinter", "Captain Crooked-Nail"],
  ["The Banner That Bites", "Stolen names twitch in the seams.", "biting-banner", "The Rag-Crown Beast"],
  ["Road-King's Reckoning", "Mercy, law, or terror will decide who owns the ruts.", "road-king", "King Skritch the Third"],
  ["Bread and Bear Law", "Bruna arbitrates a bakery dispute with one enormous paw.", "bear-law", "The Flour Revenant"],
  ["The Seven Forge Feud", "Seven smiths, one meteor, and no patience.", "forge-feud", "Cinder-Sworn Duelists"],
  ["Ulfric's Winter Run", "The pack hunts the thing that has learned their howls.", "winter-run", "The Echo Wolf"],
  ["Thane Under the Mountain", "An old oath knocks from beneath the banquet hall.", "mountain-thane", "The Buried Thane"],
  ["Cindersong Rebellion", "The forge apprentices sing sparks into weapons.", "cindersong", "Master Bellows"],
  ["Stair of a Thousand Sparks", "Each step asks what kind of crown deserves a forge.", "spark-stair", "The Basalt Warden"],
  ["Antlers in the Ruin", "Aelwyn leads the party where architecture grows leaves.", "ruin-antlers", "The Mason Stag"],
  ["The Sleeping Scale", "Rusty finds a dragon scale warm enough to dream.", "sleeping-scale", "Scale-Dream Leeches"],
  ["Choir of Empty Helms", "Armor sings of heroes who never existed.", "empty-helms", "The Hollow Choirmaster"],
  ["Skybridge of Feathers", "Corv's shortest route is mostly falling.", "feather-skybridge", "The Gale Roc"],
  ["The Wyrm's Library", "Books shelve readers according to destiny.", "wyrm-library", "The Index Drake"],
  ["Thunder in the Nest", "A stolen egg puts every mountain under suspicion.", "thunder-nest", "The Broodstorm Wyvern"],
  ["Bellweather Ferry", "The river charges one secret per passenger.", "bellweather-ferry", "The Drowned Collector"],
  ["Reed-Crown Court", "Frogs, nobles, and frog nobles debate the flood.", "reed-crown", "Duke Croakmere"],
  ["The City Behind Fog", "A whole city appears only when nobody looks for it.", "fog-city", "The Unseen Bailiff"],
  ["Three Claimants' War", "Each ruler offers peace with a different knife behind it.", "claimants-war", "The Velvet Usurper"],
  ["Nyx's Glass Orchard", "Black fruit shows the future that wants you most.", "glass-orchard", "The Orchard Coil"],
  ["Siege of Misty Lanterns", "A thousand lights march where no army stands.", "misty-siege", "The Lantern General"],
  ["Road of Warm Ash", "Footprints ahead belong to the party tomorrow.", "warm-ash-road", "The Tomorrow Hounds"],
  ["The Soot Monastery", "Silent monks keep one dangerously loud bell.", "soot-monastery", "Abbot Cinder"],
  ["Pilgrims of Black Glass", "Nyx's faithful offer gifts with invisible strings.", "glass-pilgrims", "The Kindly Tempter"],
  ["Crown-Shard Mine", "Miners dig for authority and strike a buried command.", "crown-mine", "The Command Golem"],
  ["Feast of Hollow Plates", "The banquet consumes the appetite of every guest.", "hollow-feast", "Lady Starveling"],
  ["Ash at the Campfire", "Justin, Rusty, and Elisha finally say what the road has cost.", "ash-campfire", "The Fourth Chair"],
  ["Council of Teeth and Hands", "Ulfric demands equal pawprints on every treaty.", "teeth-hands", "The Treaty Flayer"],
  ["Corv's Unwritten Names", "The raven's missing ledger pages predict betrayals.", "unwritten-names", "The Ink Wraith"],
  ["The Houndmoon Muster", "Every loyal beast answers one impossible whistle.", "houndmoon", "The Leash-Maker"],
  ["Siege of Ember Hold", "Old friends defend walls against an enemy wearing their faces.", "ember-siege", "The Mirror Host"],
  ["The Wild Law Trial", "Aelwyn asks the fellowship to defend humanity before the beasts.", "wild-law-trial", "The Thorn Tribunal"],
  ["March of Three Banners", "Pack, hold, and ash advance beneath one uneasy sky.", "three-banners", "The Banner Eater"],
  ["Starless Ford", "The river reflects a sky where the World-Eater has already won.", "starless-ford", "The Reflection Maw"],
  ["Pip and the Impossible Door", "The smallest fox steals a key from the end of time.", "impossible-door", "The Hour-Keeper"],
  ["Ulfric's Last Hunt", "The wolf pursues the herald that cannot be smelled.", "last-hunt", "The Scentless Herald"],
  ["Corv at World's Edge", "One final census counts the living, dead, and undecided.", "worlds-edge", "The Last Enumerator"],
  ["Bruna Holds the Pass", "The bear plants her feet against an army.", "bruna-pass", "The Ash Titan"],
  ["Aelwyn's Dying Grove", "Saving the sacred trees may cost the road to the gate.", "dying-grove", "The Root of Hunger"],
  ["Nyx Uncoiled", "The serpent reveals which bargains were warnings.", "nyx-uncoiled", "Nyx's Shed Shadow"],
  ["Road to the Last Council", "Three friends, three hounds, and every consequence walk together.", "last-council-road", "The Crownless World-Eater"],
];

const SPEAKERS = [
  ["Pip", "npc-fox-pip", "art-fox-pip"],
  ["Corv", "npc-raven-corv", "art-raven-corv"],
  ["Ulfric", "npc-wolf-ulfric", "art-wolf-ulfric"],
  ["Bruna", "npc-bear-bruna", "art-bear-bruna"],
  ["Aelwyn", "npc-stag-aelwyn", "art-stag-aelwyn"],
  ["Nyx", "npc-serpent-nyx", "art-serpent-nyx"],
  ["Rusty", undefined, "art-party-arrive"],
  ["Elisha", undefined, "art-party-arrive"],
  ["Justin", undefined, "art-party-arrive"],
];

const KINDS = [
  "narrative",
  "path",
  "montage",
  "conversation",
  "encounter",
  "narrative",
  "path",
  "conversation",
  "montage",
  "encounter",
  "narrative",
  "conversation",
  "path",
  "encounter",
  "montage",
];

const BEATS = [
  "Arrival",
  "Fork in the Trail",
  "Roadwork",
  "Campfire Counsel",
  "First Clash",
  "Hidden Truth",
  "Price of Passage",
  "A Friend's Doubt",
  "The Long Way Around",
  "Midnight Ambush",
  "The Old Promise",
  "Council Before Dawn",
  "Choice of Crowns",
  "Chapter Reckoning",
  "Road Onward",
];

function pad(value) {
  return String(value).padStart(2, "0");
}

function sceneId(slug) {
  return `scene-spine-${slug}`;
}

function artFor(index) {
  return [
    "art-party-arrive",
    "art-fox-pip",
    "art-raven-corv",
    "art-wolf-ulfric",
    "art-bear-bruna",
    "art-stag-aelwyn",
    "art-serpent-nyx",
    "art-goblin-scout",
    "art-ember-thane",
    "art-dragon-silhouette",
    "art-demon-herald",
    "art-three-paths",
  ][index % 12];
}

function outcome(text, nextNodeId, chapterIndex, alignment, extra = {}) {
  return {
    text,
    xp: 20 + chapterIndex * 7,
    alignment,
    nextNodeId,
    ...extra,
  };
}

function makeChoices(nextNodeId, chapterIndex, title, mode = "path") {
  const prefix = `spine-${pad(chapterIndex + 1)}-${mode}`;
  return [
    {
      id: `${prefix}-wild`,
      label: "Trust the pack",
      approach: "Let the hounds lead; read spoor, wind, and frightened birds.",
      outcome: outcome(
        `The hounds choose a living road through ${title}. Pip calls it obvious after the danger passes.`,
        nextNodeId,
        chapterIndex,
        { animal: 2 },
        { flagsAdd: [`spine-${pad(chapterIndex + 1)}-wild`] },
      ),
    },
    {
      id: `${prefix}-hearth`,
      label: "Keep faith with the holds",
      approach: "Protect travelers, honor local law, and leave the road safer.",
      outcome: outcome(
        `Justin sets the watch, Rusty steadies the line, and Elisha gets everyone home from ${title}.`,
        nextNodeId,
        chapterIndex,
        { human: 2 },
        { flagsAdd: [`spine-${pad(chapterIndex + 1)}-hearth`] },
      ),
    },
    {
      id: `${prefix}-ash`,
      label: "Take the dangerous shortcut",
      approach: "Use the black-glass whisper before it can name its price.",
      outcome: outcome(
        `Power folds the road through ${title}. Nyx smiles somewhere just outside the panel.`,
        nextNodeId,
        chapterIndex,
        { demon: 2 },
        { flagsAdd: [`spine-${pad(chapterIndex + 1)}-ash`] },
      ),
    },
  ];
}

function makeNode({ chapterIndex, nodeIndex, chapter, nextNodeId, kind, level }) {
  const id = `node-spine-${pad(chapterIndex + 1)}-${pad(nodeIndex + 1)}`;
  const beat = BEATS[nodeIndex];
  const common = {
    id,
    kind,
    title: `${chapter.title}: ${beat}`,
    sceneId: sceneId(chapter.slug),
    artId: artFor(chapterIndex + nodeIndex),
  };
  const bodyBase =
    `${chapter.tagline} In this chapter of ${chapter.arcTitle}, Justin, Rusty, Elisha, and the hounds ` +
    `cross ${chapter.slug.replaceAll("-", " ")} while ${chapter.stakes}.`;

  if (kind === "narrative") {
    return {
      ...common,
      body: `${bodyBase}\n\nThe forest frames the moment like a bright ink panel: funny at the edges, dangerous in the center.`,
      speaker: nodeIndex === 10 ? "The Chronicle" : undefined,
      next: nextNodeId,
      ...(nodeIndex === 0 ? { flagsAdd: [`spine-chapter-${pad(chapterIndex + 1)}-started`] } : {}),
    };
  }

  if (kind === "montage") {
    return {
      ...common,
      body:
        `${bodyBase}\n\nDays pass in playable journeys: trail puzzles, camp meals, hound training, ` +
        `foraging, local favors, hidden caves, and hard-won miles.`,
      xpGrant: 35 + chapterIndex * 10 + nodeIndex * 2,
      next: nextNodeId,
      ...(nodeIndex === 14 ? { flagsAdd: [`spine-chapter-${pad(chapterIndex + 1)}-complete`] } : {}),
    };
  }

  if (kind === "conversation") {
    const [speaker, npcId, speakerArt] = SPEAKERS[(chapterIndex + nodeIndex) % SPEAKERS.length];
    return {
      ...common,
      artId: speakerArt,
      body:
        speaker === "Pip"
          ? `“Big chapter. Small fox. Sensible odds.” ${chapter.tagline}`
          : speaker === "Corv"
            ? `“Names first. Heroics second.” The trouble at ${chapter.title} needs a witness.`
            : speaker === "Ulfric"
              ? `“Pack does not mean agreement. It means nobody faces this alone.”`
              : speaker === "Bruna"
                ? `“We can debate after stew. We can fight after seconds.”`
                : speaker === "Aelwyn"
                  ? `“A road is a promise made by every foot that preserves it.”`
                  : speaker === "Nyx"
                    ? `“I only offer doors. You bring the wanting.”`
                    : `${speaker} studies the hounds, then the road. “We decide together. Even when it is slow.”`,
      speaker,
      ...(npcId ? { npcId, balloon: true } : {}),
      choices: makeChoices(nextNodeId, chapterIndex, chapter.title, `talk-${nodeIndex + 1}`),
    };
  }

  if (kind === "path") {
    return {
      ...common,
      body:
        `${bodyBase}\n\nThree routes open: a moss-soft animal trail, an oath-marked hold road, ` +
        `and a copper-lit cut through forbidden ground.`,
      choices: makeChoices(nextNodeId, chapterIndex, chapter.title, `path-${nodeIndex + 1}`),
    };
  }

  const bossFight = nodeIndex === 13;
  const enemyHp = Math.min(500, 24 + level * (bossFight ? 4 : 2) + chapterIndex * 3);
  const enemyPower = Math.min(50, 5 + Math.floor(level * 0.4) + (bossFight ? 5 : 0));
  return {
    ...common,
    artId: bossFight ? "art-demon-herald" : artFor(chapterIndex + nodeIndex + 5),
    body:
      `${chapter.enemy} blocks the next panel. The encounter supports a full battle, a clever skill check, ` +
      `or coordinated hound work; every route advances the chronicle.`,
    enemy: bossFight ? `${chapter.enemy}, Chapter Boss` : chapter.enemy,
    enemyHp,
    enemyPower,
    enemyArtId: bossFight ? "art-demon-herald" : artFor(chapterIndex + nodeIndex + 5),
    choices: [
      {
        id: `spine-${pad(chapterIndex + 1)}-fight-${nodeIndex + 1}`,
        label: bossFight ? "Finish the chapter battle" : "Stand and fight",
        approach: "Use the whole hotbar and keep the hounds out of the red arcs.",
        outcome: outcome(
          `${chapter.enemy} breaks before three friends fighting as one.`,
          nextNodeId,
          chapterIndex,
          { human: 1 },
          { gold: 8 + chapterIndex * 2, flagsAdd: [bossFight ? `spine-boss-${pad(chapterIndex + 1)}-beaten` : `spine-fight-${pad(chapterIndex + 1)}-${nodeIndex + 1}`] },
        ),
      },
      {
        id: `spine-${pad(chapterIndex + 1)}-outwit-${nodeIndex + 1}`,
        label: "Turn the terrain against it",
        approach: "Read the scene, spring the trap, and win without trading every blow.",
        stat: "wisdom",
        dc: Math.min(28, 9 + Math.floor(level / 6)),
        success: outcome(`Elisha spots the hinge in the battlefield. The whole threat folds around it.`, nextNodeId, chapterIndex, { animal: 1, human: 1 }),
        fail: outcome(`The clever plan becomes a loud plan, but Rusty drags it over the line.`, nextNodeId, chapterIndex, { human: 1 }, { damage: Math.min(35, 4 + Math.floor(level / 4)) }),
      },
      {
        id: `spine-${pad(chapterIndex + 1)}-hound-${nodeIndex + 1}`,
        label: "Run the hound maneuver",
        approach: "Justin calls the turn while three hounds split the enemy's attention.",
        outcome: outcome(`Claws drum over roots. The hounds return muddy, triumphant, and expecting treats.`, nextNodeId, chapterIndex, { animal: 2 }),
      },
    ],
  };
}

function flattenArcChapterMap() {
  const mapped = [];
  let seedIndex = 0;
  for (const arc of ARCS) {
    for (let i = 0; i < arc.chapters; i++) {
      const [title, tagline, slug, enemy] = CHAPTER_SEEDS[seedIndex];
      mapped.push({
        title,
        tagline,
        slug,
        enemy,
        arcTitle: arc.title,
        stakes: arc.stakes,
        fromAuthored: i === 0 ? arc.from : undefined,
        toAuthored: i === arc.chapters - 1 ? arc.to : undefined,
      });
      seedIndex++;
    }
  }
  return mapped;
}

const chapterPlans = flattenArcChapterMap();
if (chapterPlans.length !== 50 || CHAPTER_SEEDS.length !== 50) {
  throw new Error(`Expected 50 chapter plans, got ${chapterPlans.length}/${CHAPTER_SEEDS.length}`);
}

const chapters = [];
const nodes = [];
const handoffs = {};

for (let chapterIndex = 0; chapterIndex < chapterPlans.length; chapterIndex++) {
  const plan = chapterPlans[chapterIndex];
  const chapterNumber = chapterIndex + 1;
  const chapterId = `spine-${pad(chapterNumber)}-${plan.slug}`;
  const levelMin = 1 + Math.floor((chapterIndex * 100) / chapterPlans.length);
  const levelMax = chapterIndex === chapterPlans.length - 1
    ? 100
    : Math.max(levelMin, Math.floor(((chapterIndex + 1) * 100) / chapterPlans.length));
  const nodeIds = Array.from(
    { length: NODES_PER_CHAPTER },
    (_, nodeIndex) => `node-spine-${pad(chapterNumber)}-${pad(nodeIndex + 1)}`,
  );

  for (let nodeIndex = 0; nodeIndex < NODES_PER_CHAPTER; nodeIndex++) {
    const isLast = nodeIndex === NODES_PER_CHAPTER - 1;
    const nextNodeId = isLast
      ? (plan.toAuthored ?? `node-spine-${pad(chapterNumber + 1)}-01`)
      : nodeIds[nodeIndex + 1];
    nodes.push(
      makeNode({
        chapterIndex,
        nodeIndex,
        chapter: plan,
        nextNodeId,
        kind: KINDS[nodeIndex],
        level: Math.ceil((levelMin + levelMax) / 2),
      }),
    );
    if (isLast && plan.toAuthored) handoffs[nodeIds[nodeIndex]] = plan.toAuthored;
  }

  chapters.push({
    id: chapterId,
    chapter: chapterNumber,
    title: plan.title,
    tagline: plan.tagline,
    levelMin,
    levelMax,
    estimatedHours: CHAPTER_HOURS,
    startNodeId: nodeIds[0],
    nodeIds,
    sceneId: sceneId(plan.slug),
    splashArtId: `splash-spine-${plan.slug}`,
    ...(plan.fromAuthored ? { linksFromAuthored: plan.fromAuthored } : {}),
    ...(plan.toAuthored ? { linksToAuthored: plan.toAuthored } : {}),
  });
}

const totalHours = chapters.reduce((sum, chapter) => sum + chapter.estimatedHours, 0);
const ids = new Set(nodes.map((node) => node.id));
if (ids.size !== nodes.length) throw new Error("Generated duplicate story node IDs");
if (totalHours < 280 || totalHours > 320) throw new Error(`Hours out of range: ${totalHours}`);
if (chapters.some((chapter) => chapter.nodeIds.length < 12 || chapter.nodeIds.length > 18)) {
  throw new Error("Every chapter must contain 12–18 nodes");
}
for (const [from, to] of Object.entries(handoffs)) {
  if (!ids.has(from)) throw new Error(`Handoff source does not exist: ${from}`);
  if (!Object.values(AUTHORED).includes(to)) throw new Error(`Unknown authored handoff: ${to}`);
}

const kinds = Object.fromEntries(
  [...new Set(KINDS)].map((kind) => [kind, nodes.filter((node) => node.kind === kind).length]),
);
const stats = {
  chapters: chapters.length,
  nodes: nodes.length,
  totalEstimatedHours: totalHours,
  averageHoursPerChapter: totalHours / chapters.length,
  nodesPerChapter: NODES_PER_CHAPTER,
  handoffs: Object.keys(handoffs).length,
  levelRange: [Math.min(...chapters.map((chapter) => chapter.levelMin)), Math.max(...chapters.map((chapter) => chapter.levelMax))],
  nodeKinds: kinds,
  preservedAuthoredNodeIds: Object.values(AUTHORED),
};

const output = {
  version: 1,
  targetHours: TARGET_HOURS,
  minHours: 100,
  generatedAt: new Date().toISOString(),
  chapters,
  nodes,
  handoffs,
  stats,
};

mkdirSync(dirname(OUT), { recursive: true });
writeFileSync(OUT, `${JSON.stringify(output, null, 2)}\n`);

console.log(`Wrote ${OUT}`);
console.log(JSON.stringify(stats, null, 2));
console.log("Handoffs:");
for (const [from, to] of Object.entries(handoffs)) console.log(`  ${from} -> ${to}`);
