import type { AnimalNpcDef } from "./types";

/**
 * Talking animal NPCs — speech-balloon friendly lines + alignment lean.
 * Quest hooks live in story.ts; this is the cast bible.
 */
export const ANIMAL_NPCS: AnimalNpcDef[] = [
  {
    id: "npc-fox-pip",
    name: "Pip",
    species: "fox",
    title: "Fox of the Pine Hollow",
    blurb: "A quick red tongue and quicker feet. She trades secrets for kindness — or shiny bits.",
    artId: "art-fox-pip",
    sceneId: "scene-pine-hollow",
    leans: "animal",
    balloonLines: [
      "Psst. Two-legs. Got crumbs? Got courage?",
      "The wild remembers who listens.",
      "Follow the soft path. Steel is loud.",
      "I smelled three futures. One smells like moss.",
    ],
  },
  {
    id: "npc-raven-corv",
    name: "Corv",
    species: "raven",
    title: "Raven of the Watchtower",
    blurb: "Black-winged counsel. Counts oaths, corpses, and crow-coins with equal care.",
    artId: "art-raven-corv",
    sceneId: "scene-raven-perch",
    leans: "human",
    balloonLines: [
      "Caw. Hold the line. Holds need heroes.",
      "People built this road. People must keep it.",
      "I remember names. Do you?",
      "Crown the living. Leave the wild to the wild.",
    ],
  },
  {
    id: "npc-wolf-ulfric",
    name: "Ulfric",
    species: "wolf",
    title: "Wolf of the Moon Ridge",
    blurb: "Grey pack-lord who speaks in low rumbles. Offers kinship — or a challenge.",
    artId: "art-wolf-ulfric",
    sceneId: "scene-wolf-ridge",
    leans: "animal",
    balloonLines: [
      "Run with us. Or run from us.",
      "Pack before crown.",
      "Your dogs already know the old song.",
      "Moon sees who bleeds for kin.",
    ],
  },
  {
    id: "npc-stag-aelwyn",
    name: "Aelwyn",
    species: "stag",
    title: "Stag of the Quiet Glade",
    blurb: "Antlers like cathedral ribs. Speaks of balance, mercy, and the cost of dominion.",
    artId: "art-stag-aelwyn",
    sceneId: "scene-stag-glade",
    leans: "human",
    balloonLines: [
      "Choose the hearth that shelters all.",
      "Power without pity is winter without spring.",
      "Three roads. One still has birdsong.",
      "Be steward — not sovereign of ash.",
    ],
  },
  {
    id: "npc-bear-bruna",
    name: "Bruna",
    species: "bear",
    title: "Bear of the Ember Slopes",
    blurb: "Honey-voiced mountain. Tests strength, then asks what you protect with it.",
    artId: "art-bear-bruna",
    sceneId: "scene-ember-hall",
    leans: "animal",
    balloonLines: [
      "Hit hard. Hug harder.",
      "Cave first. Conquest later.",
      "I keep cubs. What do you keep?",
      "Wake the wild. Sleep the empire.",
    ],
  },
  {
    id: "npc-serpent-nyx",
    name: "Nyx",
    species: "serpent",
    title: "Serpent Under the Ash",
    blurb: "Coil of dusk-speech. Promises power that unmakes soft limits — and soft hearts.",
    artId: "art-serpent-nyx",
    sceneId: "scene-ash-crown",
    leans: "demon",
    balloonLines: [
      "Hisss. Want more than crumbs?",
      "Laws are cages. I have keys.",
      "Ash remembers every kind lie.",
      "Take the throne. Burn the hesitation.",
    ],
  },
];

export const ANIMAL_NPC_BY_ID: Record<string, AnimalNpcDef> = Object.fromEntries(
  ANIMAL_NPCS.map((n) => [n.id, n])
);

export function getAnimalNpc(id: string): AnimalNpcDef | null {
  return ANIMAL_NPC_BY_ID[id] ?? null;
}
