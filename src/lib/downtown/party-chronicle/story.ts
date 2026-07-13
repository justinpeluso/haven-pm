import { endingNodeIdForPath, ENDING_BY_ID, ENDING_DEFS, resolveEndingId } from "./alignment";
import { mergeStorySpine } from "./spine";
import type { ChapterDef, EndingDef, StoryNode } from "./types";

export { ENDING_BY_ID, ENDING_DEFS, resolveEndingId, endingNodeIdForPath };

/**
 * Party Chronicle branching story — comic panel keys on every major beat.
 * Destiny foreshadowing early; Animal / Human / Demon finales at the end.
 */

const AUTHORED_STORY_NODES: StoryNode[] = [
  // ─── Ch 1: Frostford ─────────────────────────────────────────────
  {
    id: "node-ch1-arrive",
    kind: "narrative",
    title: "Frostford Gate",
    body: `Snow dusts the timber gate. Justin, Rusty, and Elisha — three travelers and three hounds — step into Frostford under a pale dawn.

Somewhere past the pines, something watches. Not goblin. Not man. A destiny clearing its throat.`,
    sceneId: "scene-frostford-gate",
    artId: "art-party-arrive",
    next: "node-ch1-pip",
    flagsAdd: ["ch1-started"],
  },
  {
    id: "node-ch1-pip",
    kind: "conversation",
    title: "A Fox in the Hollow",
    speaker: "Pip",
    npcId: "npc-fox-pip",
    balloon: true,
    body: "Psst. Two-legs. Got crumbs? Got courage?",
    sceneId: "scene-pine-hollow",
    artId: "art-fox-pip",
    choices: [
      {
        id: "pip-share",
        label: "Share trail rations",
        approach: "Kneel and offer food without reaching for steel.",
        outcome: {
          text: "Pip’s ears flick. “Soft hands. Good. The wild will remember.”",
          xp: 12,
          flagsAdd: ["met-pip", "pip-friend"],
          alignment: { animal: 2 },
          nextNodeId: "node-ch1-path",
          artId: "art-fox-pip",
        },
      },
      {
        id: "pip-bargain",
        label: "Trade for news",
        approach: "Ask what she knows about the road ahead — fair deal.",
        outcome: {
          text: "“Goblin Road stinks. Watchtower raven tells truths. Pay attention.”",
          xp: 10,
          gold: 5,
          flagsAdd: ["met-pip", "pip-deal"],
          alignment: { human: 1, animal: 1 },
          nextNodeId: "node-ch1-path",
        },
      },
      {
        id: "pip-threat",
        label: "Scare her off",
        approach: "Steel out — claim the hollow as party ground.",
        outcome: {
          text: "Pip vanishes. A hiss of laughter lingers: “Ash likes the loud ones.”",
          xp: 6,
          flagsAdd: ["met-pip", "pip-scared"],
          alignment: { demon: 2 },
          nextNodeId: "node-ch1-path",
          artId: "art-serpent-nyx",
        },
      },
    ],
  },
  {
    id: "node-ch1-path",
    kind: "path",
    title: "Three Smells on the Wind",
    body: `Pip’s words hang in the cold. Three smells: moss (wild kinship), hearth-smoke (holds and oaths), and something like burnt copper (a throne of ash).

The party chooses how to leave Frostford.`,
    sceneId: "scene-frostford-gate",
    artId: "art-three-paths",
    choices: [
      {
        id: "ch1-moss",
        label: "Take the soft path",
        approach: "Skirt the pines. Listen more than march.",
        outcome: {
          text: "Moss under boot. Distant howl — almost welcome.",
          xp: 8,
          alignment: { animal: 1 },
          flagsAdd: ["foreshadow-animal"],
          nextNodeId: "node-ch2-road",
        },
      },
      {
        id: "ch1-hearth",
        label: "Stick to the hold road",
        approach: "Post the gate watch. Promise Frostford you’ll return.",
        outcome: {
          text: "A thane’s runner salutes. “Keep the road for people.”",
          xp: 8,
          alignment: { human: 1 },
          flagsAdd: ["foreshadow-human"],
          nextNodeId: "node-ch2-road",
        },
      },
      {
        id: "ch1-copper",
        label: "Chase the copper smell",
        approach: "Follow the burnt-metal scent into the scrub.",
        outcome: {
          text: "A coin of black glass bites your glove. Nyx will smile later.",
          xp: 8,
          alignment: { demon: 1 },
          flagsAdd: ["foreshadow-demon", "nyx-coin"],
          nextNodeId: "node-ch2-road",
        },
      },
    ],
  },

  // ─── Ch 2: Goblin Road ───────────────────────────────────────────
  {
    id: "node-ch2-road",
    kind: "narrative",
    title: "Goblin Road",
    body: `Cart ruts and broken spears. The Goblin Road was built by people — and stolen by teeth.

A black shape wheels overhead. Corv, raven of the watchtower, wants a word.`,
    sceneId: "scene-goblin-camp",
    artId: "art-goblin-scout",
    next: "node-ch2-corv",
    flagsAdd: ["ch2-started"],
  },
  {
    id: "node-ch2-corv",
    kind: "conversation",
    title: "Raven Counsel",
    speaker: "Corv",
    npcId: "npc-raven-corv",
    balloon: true,
    body: "Caw. Hold the line. Holds need heroes.",
    sceneId: "scene-raven-perch",
    artId: "art-raven-corv",
    choices: [
      {
        id: "corv-oath",
        label: "Swear to clear the road",
        approach: "Public oath — for Frostford and every caravan.",
        outcome: {
          text: "Corv dips a wing. “Names matter. I will remember yours.”",
          xp: 14,
          flagsAdd: ["met-corv", "road-oath"],
          alignment: { human: 2 },
          nextNodeId: "node-ch2-fight",
        },
      },
      {
        id: "corv-hunt",
        label: "Hunt as predators",
        approach: "Stalk the goblin camp like a pack, not a patrol.",
        outcome: {
          text: "“Wild method. Effective.” Corv almost approves.",
          xp: 12,
          flagsAdd: ["met-corv", "pack-hunt"],
          alignment: { animal: 2 },
          nextNodeId: "node-ch2-fight",
        },
      },
      {
        id: "corv-terror",
        label: "Make an example",
        approach: "Promise fear so thick nothing returns to this road.",
        outcome: {
          text: "Corv’s eye hardens. “Fear builds thrones. Thrones burn holds.”",
          xp: 10,
          flagsAdd: ["met-corv", "terror-road"],
          alignment: { demon: 2 },
          nextNodeId: "node-ch2-fight",
        },
      },
    ],
  },
  {
    id: "node-ch2-fight",
    kind: "encounter",
    title: "Camp of Broken Spears",
    body: "Goblins spill from canvas. Your hotbar skills will matter — but so will what you do with the survivors.",
    sceneId: "scene-goblin-camp",
    artId: "art-goblin-scout",
    enemy: "Goblin scout pack",
    enemyHp: 28,
    enemyPower: 6,
    enemyArtId: "art-goblin-scout",
    choices: [
      {
        id: "gob-spare",
        label: "Drive them off alive",
        approach: "Break the line; leave a path to flee.",
        outcome: {
          text: "They scramble. The road breathes. Mercy is a kind of strength.",
          xp: 18,
          alignment: { human: 1, animal: 1 },
          flagsAdd: ["goblins-spared"],
          nextNodeId: "node-ch3-hall",
        },
      },
      {
        id: "gob-finish",
        label: "End it clean",
        approach: "No survivors. No second ambush.",
        outcome: {
          text: "Silence. Effective. The copper smell thickens.",
          xp: 18,
          alignment: { demon: 1, human: 1 },
          flagsAdd: ["goblins-cleared"],
          nextNodeId: "node-ch3-hall",
        },
      },
      {
        id: "gob-claim",
        label: "Claim the camp for the wild",
        approach: "Scatter salt and leave it for fox and wolf.",
        outcome: {
          text: "Pip would grin. The wild takes the trash heap back.",
          xp: 18,
          alignment: { animal: 2 },
          flagsAdd: ["camp-to-wild"],
          nextNodeId: "node-ch3-hall",
        },
      },
    ],
  },

  // ─── Ch 3: Ember Hold ────────────────────────────────────────────
  {
    id: "node-ch3-hall",
    kind: "narrative",
    title: "Hold of Embers",
    body: `Ember Hold’s gates open on forge-light. A thane offers beds, bread, and questions about destiny.

Outside the walls, a bear waits on the slopes — and a wolf on the ridge. Both speaking.`,
    sceneId: "scene-ember-hall",
    artId: "art-ember-thane",
    next: "node-ch3-bruna",
    flagsAdd: ["ch3-started"],
  },
  {
    id: "node-ch3-bruna",
    kind: "conversation",
    title: "Bear on the Slopes",
    speaker: "Bruna",
    npcId: "npc-bear-bruna",
    balloon: true,
    body: "Hit hard. Hug harder.",
    sceneId: "scene-ember-hall",
    artId: "art-bear-bruna",
    choices: [
      {
        id: "bruna-wrestle",
        label: "Accept her test",
        approach: "Wrestle fair — strength without cruelty.",
        stat: "strength",
        dc: 12,
        success: {
          text: "Bruna laughs like rolling stones. “Cave first. Conquest later.”",
          xp: 16,
          alignment: { animal: 2 },
          flagsAdd: ["met-bruna", "bruna-respect"],
          nextNodeId: "node-ch3-ulfric",
        },
        fail: {
          text: "You eat dirt. Bruna still nods. “Honest try. Wild likes that.”",
          xp: 8,
          alignment: { animal: 1 },
          flagsAdd: ["met-bruna"],
          nextNodeId: "node-ch3-ulfric",
        },
      },
      {
        id: "bruna-thane",
        label: "Invite her to the hold feast",
        approach: "Bridge wild and hearth with shared meat.",
        outcome: {
          text: "Bruna eyes the gate. “Maybe. If the thane keeps cubs safe.”",
          xp: 14,
          alignment: { human: 2, animal: 1 },
          flagsAdd: ["met-bruna", "bruna-feast"],
          nextNodeId: "node-ch3-ulfric",
        },
      },
    ],
  },
  {
    id: "node-ch3-ulfric",
    kind: "conversation",
    title: "Wolf on the Ridge",
    speaker: "Ulfric",
    npcId: "npc-wolf-ulfric",
    balloon: true,
    body: "Run with us. Or run from us.",
    sceneId: "scene-wolf-ridge",
    artId: "art-wolf-ulfric",
    choices: [
      {
        id: "ulf-pack",
        label: "Howl with the pack",
        approach: "Answer kinship. Let the dogs sing too.",
        outcome: {
          text: "Moonlight on fur. “Pack before crown,” Ulfric rumbles.",
          xp: 16,
          alignment: { animal: 3 },
          flagsAdd: ["met-ulfric", "pack-bond"],
          nextNodeId: "node-ch3-foreshadow",
        },
      },
      {
        id: "ulf-boundary",
        label: "Set a border treaty",
        approach: "Ridge for wolves; road for people — sealed in speech.",
        outcome: {
          text: "Ulfric’s ears tip. “Treaty is a human trick. …Useful.”",
          xp: 16,
          alignment: { human: 2, animal: 1 },
          flagsAdd: ["met-ulfric", "wolf-treaty"],
          nextNodeId: "node-ch3-foreshadow",
        },
      },
      {
        id: "ulf-dominate",
        label: "Challenge for alpha",
        approach: "Force submission. Wear the ridge as trophy.",
        outcome: {
          text: "Blood on snow. The pack yields — and remembers the taste.",
          xp: 14,
          alignment: { demon: 3 },
          flagsAdd: ["met-ulfric", "wolf-dominated"],
          nextNodeId: "node-ch3-foreshadow",
        },
      },
    ],
  },
  {
    id: "node-ch3-foreshadow",
    kind: "path",
    title: "Ember Prophecy",
    body: `In the thane’s hall, a cracked mural shows three crowns: antlers of living wood, a hearth-ring of joined hands, and a throne of smoking ash.

“Pick none yet,” the thane warns. “But walk knowing they wait.”`,
    sceneId: "scene-ember-hall",
    artId: "art-three-paths",
    choices: [
      {
        id: "mural-wood",
        label: "Touch the antler crown",
        approach: "Feel the pull of the Wild Crown.",
        outcome: {
          text: "Sap-scent. Pip’s laugh somewhere far.",
          xp: 10,
          alignment: { animal: 1 },
          flagsAdd: ["saw-wild-crown"],
          nextNodeId: "node-ch4-ruin",
        },
      },
      {
        id: "mural-hearth",
        label: "Touch the hearth-ring",
        approach: "Feel the pull of shared law.",
        outcome: {
          text: "Warmth. Corv’s wing-shadow on the stone.",
          xp: 10,
          alignment: { human: 1 },
          flagsAdd: ["saw-hearth-crown"],
          nextNodeId: "node-ch4-ruin",
        },
      },
      {
        id: "mural-ash",
        label: "Touch the ash throne",
        approach: "Feel the pull of unbound power.",
        outcome: {
          text: "Copper burn. Nyx whispers in the mortar.",
          xp: 10,
          alignment: { demon: 1 },
          flagsAdd: ["saw-ash-throne"],
          nextNodeId: "node-ch4-ruin",
        },
      },
    ],
  },

  // ─── Ch 4: Dragon Whisper ────────────────────────────────────────
  {
    id: "node-ch4-ruin",
    kind: "narrative",
    title: "Dragon Whisper",
    body: `A ruin scored by old fire. The air tastes of ozone and memory. Something vast once slept here — and may again.

In a quiet glade beyond the ruin, a stag waits with cathedral antlers.`,
    sceneId: "scene-dragon-ruin",
    artId: "art-dragon-silhouette",
    next: "node-ch4-aelwyn",
    flagsAdd: ["ch4-started"],
  },
  {
    id: "node-ch4-aelwyn",
    kind: "conversation",
    title: "Stag of the Quiet Glade",
    speaker: "Aelwyn",
    npcId: "npc-stag-aelwyn",
    balloon: true,
    body: "Choose the hearth that shelters all.",
    sceneId: "scene-stag-glade",
    artId: "art-stag-aelwyn",
    choices: [
      {
        id: "ael-steward",
        label: "Vow stewardship",
        approach: "Power as caretaking — not ownership.",
        outcome: {
          text: "Aelwyn bows. “Be steward — not sovereign of ash.”",
          xp: 20,
          alignment: { human: 3 },
          flagsAdd: ["met-aelwyn", "steward-vow"],
          nextNodeId: "node-ch4-whisper",
        },
      },
      {
        id: "ael-wild",
        label: "Vow to free the wild first",
        approach: "Holds can wait; the glen cannot.",
        outcome: {
          text: "“Then walk soft,” says the stag. “And loud when cubs cry.”",
          xp: 18,
          alignment: { animal: 3 },
          flagsAdd: ["met-aelwyn", "wild-first"],
          nextNodeId: "node-ch4-whisper",
        },
      },
      {
        id: "ael-reject",
        label: "Reject soft counsel",
        approach: "Dragons respect will — not sermons.",
        outcome: {
          text: "Aelwyn’s eyes dim. “Winter without spring, then.”",
          xp: 12,
          alignment: { demon: 2 },
          flagsAdd: ["met-aelwyn", "rejected-stag"],
          nextNodeId: "node-ch4-whisper",
        },
      },
    ],
  },
  {
    id: "node-ch4-whisper",
    kind: "path",
    title: "What the Ruin Whispers",
    body: "A voice without a throat: three futures again — pack-song, oath-song, hunger-song. The dragon is not here yet. The choice is.",
    sceneId: "scene-dragon-ruin",
    artId: "art-dragon-silhouette",
    choices: [
      {
        id: "whisper-pack",
        label: "Answer with a howl",
        approach: "Let animal truth shake the stones.",
        outcome: {
          text: "Echoes answer from the ridge.",
          xp: 12,
          alignment: { animal: 2 },
          nextNodeId: "node-ch5-bridge",
        },
      },
      {
        id: "whisper-oath",
        label: "Answer with an oath",
        approach: "Name your friends and your holds aloud.",
        outcome: {
          text: "The ruin steadies — like a hall finding its beams.",
          xp: 12,
          alignment: { human: 2 },
          nextNodeId: "node-ch5-bridge",
        },
      },
      {
        id: "whisper-hunger",
        label: "Answer with hunger",
        approach: "Demand the dragon’s power for yourself.",
        outcome: {
          text: "Something under the ash laughs with you.",
          xp: 12,
          alignment: { demon: 2 },
          flagsAdd: ["dragon-hunger"],
          nextNodeId: "node-ch5-bridge",
        },
      },
    ],
  },

  // ─── Ch 5: Misty Crossing ────────────────────────────────────────
  {
    id: "node-ch5-bridge",
    kind: "narrative",
    title: "Misty Crossing",
    body: `Fog swallows the bridge. Midway, the party must split attention: a caravan stranded, a wounded wolf, and a black-glass whisper from beneath the planks.

Destiny stops being subtle.`,
    sceneId: "scene-misty-bridge",
    artId: "art-three-paths",
    next: "node-ch5-triage",
    flagsAdd: ["ch5-started"],
  },
  {
    id: "node-ch5-triage",
    kind: "path",
    title: "Bridge Triage",
    body: "You cannot do all three perfectly. What you save teaches the chronicle who you are.",
    sceneId: "scene-misty-bridge",
    artId: "art-party-arrive",
    choices: [
      {
        id: "triage-wolf",
        label: "Save the wounded wolf",
        approach: "Kneel in the fog. Pack first.",
        outcome: {
          text: "Ulfric’s kin lives. The caravan curses — then limps on.",
          xp: 22,
          alignment: { animal: 3 },
          flagsAdd: ["bridge-wolf-saved"],
          nextNodeId: "node-ch5-nyx-tease",
        },
      },
      {
        id: "triage-people",
        label: "Save the caravan",
        approach: "Ropes, light, and ordered voices.",
        outcome: {
          text: "Children reach the far bank. The wolf’s breath fades in fog.",
          xp: 22,
          alignment: { human: 3 },
          flagsAdd: ["bridge-caravan-saved"],
          nextNodeId: "node-ch5-nyx-tease",
        },
      },
      {
        id: "triage-glass",
        label: "Take the black-glass gift",
        approach: "Pry the whisper-plank. Power now; costs later.",
        outcome: {
          text: "Nyx’s coil flashes under the bridge. “Good student.”",
          xp: 22,
          alignment: { demon: 3 },
          flagsAdd: ["bridge-nyx-gift", "met-nyx"],
          nextNodeId: "node-ch5-nyx-tease",
          artId: "art-serpent-nyx",
        },
      },
    ],
  },
  {
    id: "node-ch5-nyx-tease",
    kind: "conversation",
    title: "Serpent Under the Planks",
    speaker: "Nyx",
    npcId: "npc-serpent-nyx",
    balloon: true,
    body: "Hisss. Want more than crumbs?",
    sceneId: "scene-misty-bridge",
    artId: "art-serpent-nyx",
    choices: [
      {
        id: "nyx-refuse",
        label: "Refuse the coil",
        approach: "Step back. Keep your name your own.",
        outcome: {
          text: "Nyx shrugs in smoke. “Later, then.”",
          xp: 10,
          alignment: { human: 1, animal: 1 },
          flagsAdd: ["nyx-refused"],
          nextNodeId: "node-ch6-ash",
        },
      },
      {
        id: "nyx-bargain",
        label: "Bargain carefully",
        approach: "Ask terms. Write them in light.",
        outcome: {
          text: "“Terms are cages,” Nyx smiles. “But I’ll play.”",
          xp: 12,
          alignment: { human: 1, demon: 1 },
          flagsAdd: ["nyx-bargain"],
          nextNodeId: "node-ch6-ash",
        },
      },
      {
        id: "nyx-embrace",
        label: "Take the gift open-handed",
        approach: "No terms. Only hunger.",
        outcome: {
          text: "Ash kisses your pulse. The dogs whine.",
          xp: 14,
          alignment: { demon: 3 },
          flagsAdd: ["nyx-embrace"],
          nextNodeId: "node-ch6-ash",
        },
      },
    ],
  },

  // ─── Ch 6–8 compressed midgame ───────────────────────────────────
  {
    id: "node-ch6-ash",
    kind: "narrative",
    title: "Crown of Ash",
    body: `A chamber of soot-thrones. Not yet yours — unless you insist. The party feels the chronicle accelerating toward level’s endgame.`,
    sceneId: "scene-ash-crown",
    artId: "art-demon-herald",
    next: "node-ch6-choice",
    flagsAdd: ["ch6-started"],
  },
  {
    id: "node-ch6-choice",
    kind: "path",
    title: "Leave the Ash Untouched?",
    body: "Do you seal the chamber, claim a shard, or listen to the beasts urging you out?",
    sceneId: "scene-ash-crown",
    artId: "art-three-paths",
    choices: [
      {
        id: "ash-seal",
        label: "Seal it for the holds",
        approach: "Mortar, ward, and a posted watch.",
        outcome: {
          text: "Corv would approve. The ash sleeps — for now.",
          xp: 24,
          alignment: { human: 2 },
          nextNodeId: "node-ch7-camp",
        },
      },
      {
        id: "ash-leave-wild",
        label: "Collapse the entrance for the wild",
        approach: "No throne. No shrine. Only rock and roots.",
        outcome: {
          text: "Bruna would approve. The mountain keeps its secret.",
          xp: 24,
          alignment: { animal: 2 },
          nextNodeId: "node-ch7-camp",
        },
      },
      {
        id: "ash-shard",
        label: "Take an ash shard",
        approach: "Pocket the power. Pay later.",
        outcome: {
          text: "The shard ticks like a second heart.",
          xp: 24,
          alignment: { demon: 2 },
          flagsAdd: ["ash-shard"],
          nextNodeId: "node-ch7-camp",
        },
      },
    ],
  },
  {
    id: "node-ch7-camp",
    kind: "conversation",
    title: "Fellowship Strain",
    speaker: "Pip",
    npcId: "npc-fox-pip",
    balloon: true,
    body: "I smelled three futures. One smells like moss.",
    sceneId: "scene-fellowship-camp",
    artId: "art-fox-pip",
    choices: [
      {
        id: "camp-listen-beasts",
        label: "Hold council with the animals",
        approach: "Fox, raven, wolf, stag — equal seats at the fire.",
        outcome: {
          text: "Even Corv lands on the log. Fellowship expands.",
          xp: 20,
          alignment: { animal: 2, human: 2 },
          flagsAdd: ["beast-council"],
          nextNodeId: "node-ch8-gate",
        },
      },
      {
        id: "camp-people-vote",
        label: "Let the party vote as people",
        approach: "Justin, Rusty, Elisha — majority rules.",
        outcome: {
          text: "Human voices decide. The beasts watch, measuring.",
          xp: 20,
          alignment: { human: 2 },
          flagsAdd: ["people-vote"],
          nextNodeId: "node-ch8-gate",
        },
      },
      {
        id: "camp-force",
        label: "DM decree — no debate",
        approach: "Justin cuts the knot. Power settles arguments.",
        outcome: {
          text: "Silence around the fire. Effective. Costly.",
          xp: 16,
          alignment: { demon: 2 },
          flagsAdd: ["dm-decree"],
          nextNodeId: "node-ch8-gate",
        },
      },
    ],
  },
  {
    id: "node-ch8-gate",
    kind: "encounter",
    title: "World-Eater Gate",
    body: "The gate breathes cold starlight. A herald of hunger bars the way — half shadow, half grin.",
    sceneId: "scene-worldeater-gate",
    artId: "art-demon-herald",
    enemy: "Demon herald",
    enemyHp: 80,
    enemyPower: 14,
    enemyArtId: "art-demon-herald",
    choices: [
      {
        id: "gate-pack",
        label: "Fight as pack + party",
        approach: "Beasts and blades together.",
        outcome: {
          text: "Ulfric’s howl cracks the herald’s stance. The gate shudders open.",
          xp: 40,
          alignment: { animal: 2, human: 1 },
          flagsAdd: ["gate-opened"],
          nextNodeId: "node-ch9-council",
        },
      },
      {
        id: "gate-ward",
        label: "Fight with hold-wards",
        approach: "Oaths, light, and disciplined hotbar skills.",
        outcome: {
          text: "Aelwyn’s counsel made flesh. The herald breaks on law.",
          xp: 40,
          alignment: { human: 3 },
          flagsAdd: ["gate-opened"],
          nextNodeId: "node-ch9-council",
        },
      },
      {
        id: "gate-devour",
        label: "Turn hunger on hunger",
        approach: "Spend the ash shard / Nyx gift if you have it — or your own dark.",
        outcome: {
          text: "The herald bows. “Sibling.” The gate opens too easily.",
          xp: 40,
          alignment: { demon: 3 },
          flagsAdd: ["gate-opened", "herald-sibling"],
          nextNodeId: "node-ch9-council",
        },
      },
    ],
  },

  // ─── Ch 9: Last Council ──────────────────────────────────────────
  {
    id: "node-ch9-council",
    kind: "narrative",
    title: "Last Council",
    body: `Beyond the gate: a circle of standing stones. Pip, Corv, Ulfric, Aelwyn, Bruna, and Nyx — all present, all speaking.

The chronicle asks for a crown.`,
    sceneId: "scene-last-council",
    artId: "art-three-paths",
    next: "node-ch9-choose",
    flagsAdd: ["ch9-started"],
  },
  {
    id: "node-ch9-choose",
    kind: "path",
    title: "Name Your Crown",
    body: `You may follow the weight of your path — or force a destiny now.

(Engine tip: if you “trust the chronicle,” alignment scores pick Animal / Human / Demon.)`,
    sceneId: "scene-last-council",
    artId: "art-three-paths",
    choices: [
      {
        id: "choose-animal",
        label: "Claim the Wild Crown",
        approach: "Pack and glen write the law.",
        outcome: {
          text: "Antlers of living wood settle over the party’s shadows.",
          xp: 50,
          alignment: { animal: 5 },
          endingId: "ending-animal",
          nextNodeId: "node-finale-animal",
          artId: "art-ending-animal",
          sceneId: "scene-wild-crown",
        },
      },
      {
        id: "choose-human",
        label: "Claim the Hearth Crown",
        approach: "Oaths bind beast and hold alike.",
        outcome: {
          text: "Joined hands of light ring the stones.",
          xp: 50,
          alignment: { human: 5 },
          endingId: "ending-human",
          nextNodeId: "node-finale-human",
          artId: "art-ending-human",
          sceneId: "scene-hearth-crown",
        },
      },
      {
        id: "choose-demon",
        label: "Claim the Ash Throne",
        approach: "Power without pity. End the hesitation.",
        outcome: {
          text: "Copper fire. Nyx bows. The dogs go quiet.",
          xp: 50,
          alignment: { demon: 5 },
          endingId: "ending-demon",
          nextNodeId: "node-finale-demon",
          artId: "art-ending-demon",
          sceneId: "scene-ash-throne",
        },
      },
      {
        id: "choose-trust",
        label: "Trust the chronicle’s weight",
        approach: "Let cumulative choices decide — no last-second rewrite.",
        outcome: {
          text: "The stones hum. Your path answers for itself.",
          xp: 50,
          flagsAdd: ["trust-alignment"],
          // Engine resolves next via resolveFinaleNodeId(alignment)
          nextNodeId: "node-finale-resolve",
        },
      },
    ],
  },
  {
    id: "node-finale-resolve",
    kind: "narrative",
    title: "The Chronicle Answers",
    body: "Ink settles. The leading destiny steps forward — Animal, Human, or Demon — according to every howl, oath, and hunger you chose.",
    sceneId: "scene-last-council",
    artId: "art-three-paths",
    // Engine should rewrite `next` using resolveFinaleNodeId; default human tie-break
    next: "node-finale-human",
    flagsAdd: ["finale-resolving"],
  },

  // ─── Finales ─────────────────────────────────────────────────────
  {
    id: "node-finale-animal",
    kind: "ending",
    title: "The Wild Crown",
    endingId: "ending-animal",
    splashArtId: "splash-ending-animal",
    sceneId: "scene-wild-crown",
    artId: "art-ending-animal",
    body: `Antlers of living wood rise over Frostford’s hills. Pip dances. Ulfric howls. Bruna sleeps easy.

The holds still stand — but the law is written in moss and moon. Justin, Rusty, and Elisha are pack-stewards of a world that finally answered back.

Dogs run free at heel. The chronicle closes on birdsong.`,
  },
  {
    id: "node-finale-human",
    kind: "ending",
    title: "The Hearth Crown",
    endingId: "ending-human",
    splashArtId: "splash-ending-human",
    sceneId: "scene-hearth-crown",
    artId: "art-ending-human",
    body: `A ring of joined hands — people and speaking beasts — seals the World-Eater’s gate.

Corv keeps the names. Aelwyn blesses the roads. Ember Hold’s bread is shared under open sky.

Justin, Rusty, and Elisha wear no tyrant’s gold — only the Hearth Crown: stewardship, oath, and fellowship. The chronicle closes on warm light.`,
  },
  {
    id: "node-finale-demon",
    kind: "ending",
    title: "The Ash Throne",
    endingId: "ending-demon",
    splashArtId: "splash-ending-demon",
    sceneId: "scene-ash-throne",
    artId: "art-ending-demon",
    body: `Copper fire crowns the party. Nyx coils at the foot of the Ash Throne. The World-Eater kneels — then grins, recognizing kin.

Holds obey. Beasts flee or kneel. The dogs stay close, eyes bright with something not entirely dog.

Justin, Rusty, and Elisha end the hesitation. The chronicle closes on a beautiful, terrible silence.`,
  },
];

const AUTHORED_CHAPTERS: ChapterDef[] = [
  {
    id: "ch1-frostford",
    chapter: 1,
    levelMin: 1,
    levelMax: 4,
    title: "Frostford Gate",
    tagline: "Three travelers. One watching fox.",
    startNodeId: "node-ch1-arrive",
    nodeIds: ["node-ch1-arrive", "node-ch1-pip", "node-ch1-path"],
    splashArtId: "splash-ch1-frostford",
    sceneId: "scene-frostford-gate",
  },
  {
    id: "ch2-goblin-road",
    chapter: 2,
    levelMin: 5,
    levelMax: 9,
    title: "Goblin Road",
    tagline: "Raven counsel. Teeth on the cart ruts.",
    startNodeId: "node-ch2-road",
    nodeIds: ["node-ch2-road", "node-ch2-corv", "node-ch2-fight"],
    splashArtId: "splash-ch2-goblin-road",
    sceneId: "scene-goblin-camp",
  },
  {
    id: "ch3-ember-hold",
    chapter: 3,
    levelMin: 10,
    levelMax: 19,
    title: "Hold of Embers",
    tagline: "Bear, wolf, and a mural of three crowns.",
    startNodeId: "node-ch3-hall",
    nodeIds: ["node-ch3-hall", "node-ch3-bruna", "node-ch3-ulfric", "node-ch3-foreshadow"],
    splashArtId: "splash-ch3-ember-hold",
    sceneId: "scene-ember-hall",
  },
  {
    id: "ch4-dragon-whisper",
    chapter: 4,
    levelMin: 20,
    levelMax: 34,
    title: "Dragon Whisper",
    tagline: "Ruin-song and a stag’s hard mercy.",
    startNodeId: "node-ch4-ruin",
    nodeIds: ["node-ch4-ruin", "node-ch4-aelwyn", "node-ch4-whisper"],
    splashArtId: "splash-ch4-dragon-whisper",
    sceneId: "scene-dragon-ruin",
  },
  {
    id: "ch5-misty-crossing",
    chapter: 5,
    levelMin: 35,
    levelMax: 49,
    title: "Misty Crossing",
    tagline: "Triage on the bridge. Nyx under the planks.",
    startNodeId: "node-ch5-bridge",
    nodeIds: ["node-ch5-bridge", "node-ch5-triage", "node-ch5-nyx-tease"],
    splashArtId: "splash-ch5-misty-crossing",
    sceneId: "scene-misty-bridge",
  },
  {
    id: "ch6-crown-ash",
    chapter: 6,
    levelMin: 50,
    levelMax: 64,
    title: "Crown of Ash",
    tagline: "Seal, bury, or pocket the hunger.",
    startNodeId: "node-ch6-ash",
    nodeIds: ["node-ch6-ash", "node-ch6-choice"],
    splashArtId: "splash-ch6-crown-ash",
    sceneId: "scene-ash-crown",
  },
  {
    id: "ch7-fellowship",
    chapter: 7,
    levelMin: 65,
    levelMax: 79,
    title: "Fellowship Strain",
    tagline: "Who sits at the fire?",
    startNodeId: "node-ch7-camp",
    nodeIds: ["node-ch7-camp"],
    splashArtId: "splash-ch7-fellowship",
    sceneId: "scene-fellowship-camp",
  },
  {
    id: "ch8-worldeater",
    chapter: 8,
    levelMin: 80,
    levelMax: 89,
    title: "World-Eater Gate",
    tagline: "Herald of hunger. Hotbar and heart.",
    startNodeId: "node-ch8-gate",
    nodeIds: ["node-ch8-gate"],
    splashArtId: "splash-ch8-worldeater",
    sceneId: "scene-worldeater-gate",
  },
  {
    id: "ch9-last-council",
    chapter: 9,
    levelMin: 90,
    levelMax: 99,
    title: "Last Council",
    tagline: "Name your crown — or trust the ink.",
    startNodeId: "node-ch9-council",
    nodeIds: ["node-ch9-council", "node-ch9-choose", "node-finale-resolve"],
    splashArtId: "splash-ch9-last-council",
    sceneId: "scene-last-council",
  },
  {
    id: "ch10-endings",
    chapter: 10,
    levelMin: 100,
    levelMax: 100,
    title: "Chronicle's End",
    tagline: "Wild Crown · Hearth Crown · Ash Throne",
    startNodeId: "node-finale-animal",
    nodeIds: ["node-finale-animal", "node-finale-human", "node-finale-demon"],
    splashArtId: "splash-ending-human",
    sceneId: "scene-hearth-crown",
  },
];

const MERGED_STORY = mergeStorySpine(AUTHORED_STORY_NODES, AUTHORED_CHAPTERS);

export const STORY_NODES: StoryNode[] = MERGED_STORY.nodes;
export const CHAPTERS: ChapterDef[] = MERGED_STORY.chapters;
export const STORY_NODE_BY_ID: Record<string, StoryNode> = Object.fromEntries(
  STORY_NODES.map((node) => [node.id, node])
);

export const START_NODE_ID = "node-ch1-arrive";
export const START_CHAPTER_ID = "ch1-frostford";

export function getStoryNode(id: string): StoryNode | null {
  return STORY_NODE_BY_ID[id] ?? null;
}

export function getChapter(id: string): ChapterDef | null {
  return CHAPTERS.find((c) => c.id === id) ?? null;
}

/** Resolve which chapter owns a story node (for engine chapter transitions). */
export function chapterForNode(nodeId: string): ChapterDef | null {
  return CHAPTERS.find((c) => c.nodeIds.includes(nodeId)) ?? null;
}

export function chapterForLevel(level: number): ChapterDef {
  const found = [...CHAPTERS].reverse().find((c) => level >= c.levelMin);
  return found ?? CHAPTERS[0]!;
}

/** Used when flags include trust-alignment at node-finale-resolve. */
export function resolveFinaleNodeId(alignment: {
  animal: number;
  human: number;
  demon: number;
}): string {
  const endingId = resolveEndingId(alignment);
  const path = ENDING_DEFS.find((e) => e.id === endingId)?.path ?? "human";
  return endingNodeIdForPath(path);
}

export function listEndingDefs(): EndingDef[] {
  return ENDING_DEFS;
}

export function getEnding(id: string): EndingDef | undefined {
  return ENDING_DEFS.find((e) => e.id === id) ?? ENDING_BY_ID[id];
}

/** Mid-game scaffold hint for HUD / codex. */
export function progressionHint(partyLevel: number): string {
  const next = CHAPTERS.find((c) => partyLevel < c.levelMin) ?? CHAPTERS[CHAPTERS.length - 1]!;
  if (partyLevel >= 100) return "Chronicle's End — Animal, Human, or Demon awaits.";
  return `Next: ${next.title} (L${next.levelMin}–${next.levelMax})`;
}
