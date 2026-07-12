/**
 * Comic panel / illustration catalog for the 90s RPG UI.
 * Keys map to assets under `public/party-chronicle/` (SVG/PNG).
 */

export type ComicArtEntry = {
  id: string;
  kind: "scene" | "portrait" | "enemy" | "splash" | "chapter" | "balloon-bg";
  label: string;
  /** Relative path under /party-chronicle/ */
  src: string;
};

/** All illustration keys referenced by story nodes. */
export const COMIC_ART: Record<string, ComicArtEntry> = {
  // --- Chapter splashes ---
  "splash-ch1-frostford": {
    id: "splash-ch1-frostford",
    kind: "chapter",
    label: "Frostford dawn",
    src: "splash/ch1-frostford.svg",
  },
  "splash-ch2-goblin-road": {
    id: "splash-ch2-goblin-road",
    kind: "chapter",
    label: "Goblin Road",
    src: "splash/ch2-goblin-road.svg",
  },
  "splash-ch3-ember-hold": {
    id: "splash-ch3-ember-hold",
    kind: "chapter",
    label: "Hold of Embers",
    src: "splash/ch3-ember-hold.svg",
  },
  "splash-ch4-dragon-whisper": {
    id: "splash-ch4-dragon-whisper",
    kind: "chapter",
    label: "Dragon Whisper",
    src: "splash/ch4-dragon-whisper.svg",
  },
  "splash-ch5-misty-crossing": {
    id: "splash-ch5-misty-crossing",
    kind: "chapter",
    label: "Misty Crossing",
    src: "splash/ch5-misty-crossing.svg",
  },
  "splash-ch6-crown-ash": {
    id: "splash-ch6-crown-ash",
    kind: "chapter",
    label: "Crown of Ash",
    src: "splash/ch6-crown-ash.svg",
  },
  "splash-ch7-fellowship": {
    id: "splash-ch7-fellowship",
    kind: "chapter",
    label: "Fellowship Strain",
    src: "splash/ch7-fellowship.svg",
  },
  "splash-ch8-worldeater": {
    id: "splash-ch8-worldeater",
    kind: "chapter",
    label: "World-Eater Gate",
    src: "splash/ch8-worldeater.svg",
  },
  "splash-ch9-last-council": {
    id: "splash-ch9-last-council",
    kind: "chapter",
    label: "Last Council",
    src: "splash/ch9-last-council.svg",
  },
  "splash-ending-animal": {
    id: "splash-ending-animal",
    kind: "splash",
    label: "Wild Crown finale",
    src: "splash/ending-animal.svg",
  },
  "splash-ending-human": {
    id: "splash-ending-human",
    kind: "splash",
    label: "Hearth Crown finale",
    src: "splash/ending-human.svg",
  },
  "splash-ending-demon": {
    id: "splash-ending-demon",
    kind: "splash",
    label: "Ash Throne finale",
    src: "splash/ending-demon.svg",
  },

  // --- Scenes ---
  "scene-frostford-gate": {
    id: "scene-frostford-gate",
    kind: "scene",
    label: "Frostford gate",
    src: "scenes/frostford-gate.svg",
  },
  "scene-pine-hollow": {
    id: "scene-pine-hollow",
    kind: "scene",
    label: "Pine hollow",
    src: "scenes/pine-hollow.svg",
  },
  "scene-goblin-camp": {
    id: "scene-goblin-camp",
    kind: "scene",
    label: "Goblin campfire",
    src: "scenes/goblin-camp.svg",
  },
  "scene-raven-perch": {
    id: "scene-raven-perch",
    kind: "scene",
    label: "Raven watchtower",
    src: "scenes/raven-perch.svg",
  },
  "scene-ember-hall": {
    id: "scene-ember-hall",
    kind: "scene",
    label: "Ember Hold hall",
    src: "scenes/ember-hall.svg",
  },
  "scene-wolf-ridge": {
    id: "scene-wolf-ridge",
    kind: "scene",
    label: "Moonlit ridge",
    src: "scenes/wolf-ridge.svg",
  },
  "scene-dragon-ruin": {
    id: "scene-dragon-ruin",
    kind: "scene",
    label: "Dragon-scored ruin",
    src: "scenes/dragon-ruin.svg",
  },
  "scene-stag-glade": {
    id: "scene-stag-glade",
    kind: "scene",
    label: "Stag glade",
    src: "scenes/stag-glade.svg",
  },
  "scene-misty-bridge": {
    id: "scene-misty-bridge",
    kind: "scene",
    label: "Misty bridge",
    src: "scenes/misty-bridge.svg",
  },
  "scene-ash-crown": {
    id: "scene-ash-crown",
    kind: "scene",
    label: "Ash crown chamber",
    src: "scenes/ash-crown.svg",
  },
  "scene-fellowship-camp": {
    id: "scene-fellowship-camp",
    kind: "scene",
    label: "Fellowship camp",
    src: "scenes/fellowship-camp.svg",
  },
  "scene-worldeater-gate": {
    id: "scene-worldeater-gate",
    kind: "scene",
    label: "World-Eater gate",
    src: "scenes/worldeater-gate.svg",
  },
  "scene-last-council": {
    id: "scene-last-council",
    kind: "scene",
    label: "Last council circle",
    src: "scenes/last-council.svg",
  },
  "scene-wild-crown": {
    id: "scene-wild-crown",
    kind: "scene",
    label: "Wild Crown horizon",
    src: "scenes/wild-crown.svg",
  },
  "scene-hearth-crown": {
    id: "scene-hearth-crown",
    kind: "scene",
    label: "Hearth Crown plaza",
    src: "scenes/hearth-crown.svg",
  },
  "scene-ash-throne": {
    id: "scene-ash-throne",
    kind: "scene",
    label: "Ash Throne",
    src: "scenes/ash-throne.svg",
  },

  // --- Animal portraits ---
  "art-fox-pip": {
    id: "art-fox-pip",
    kind: "portrait",
    label: "Pip the Fox",
    src: "portraits/fox-pip.svg",
  },
  "art-raven-corv": {
    id: "art-raven-corv",
    kind: "portrait",
    label: "Corv the Raven",
    src: "portraits/raven-corv.svg",
  },
  "art-wolf-ulfric": {
    id: "art-wolf-ulfric",
    kind: "portrait",
    label: "Ulfric the Wolf",
    src: "portraits/wolf-ulfric.svg",
  },
  "art-stag-aelwyn": {
    id: "art-stag-aelwyn",
    kind: "portrait",
    label: "Aelwyn the Stag",
    src: "portraits/stag-aelwyn.svg",
  },
  "art-bear-bruna": {
    id: "art-bear-bruna",
    kind: "portrait",
    label: "Bruna the Bear",
    src: "portraits/bear-bruna.svg",
  },
  "art-serpent-nyx": {
    id: "art-serpent-nyx",
    kind: "portrait",
    label: "Nyx the Serpent",
    src: "portraits/serpent-nyx.svg",
  },

  // --- Party / foe plates ---
  "art-party-arrive": {
    id: "art-party-arrive",
    kind: "portrait",
    label: "Party at the gate",
    src: "portraits/party-arrive.svg",
  },
  "art-goblin-scout": {
    id: "art-goblin-scout",
    kind: "enemy",
    label: "Goblin scout",
    src: "enemies/goblin-scout.svg",
  },
  "art-ember-thane": {
    id: "art-ember-thane",
    kind: "portrait",
    label: "Ember Hold thane",
    src: "portraits/ember-thane.svg",
  },
  "art-dragon-silhouette": {
    id: "art-dragon-silhouette",
    kind: "enemy",
    label: "Dragon silhouette",
    src: "enemies/dragon-silhouette.svg",
  },
  "art-demon-herald": {
    id: "art-demon-herald",
    kind: "enemy",
    label: "Demon herald",
    src: "enemies/demon-herald.svg",
  },
  "art-three-paths": {
    id: "art-three-paths",
    kind: "portrait",
    label: "Three destiny roads",
    src: "portraits/three-paths.svg",
  },
  "art-ending-animal": {
    id: "art-ending-animal",
    kind: "splash",
    label: "Animal ending plate",
    src: "endings/animal.svg",
  },
  "art-ending-human": {
    id: "art-ending-human",
    kind: "splash",
    label: "Human ending plate",
    src: "endings/human.svg",
  },
  "art-ending-demon": {
    id: "art-ending-demon",
    kind: "splash",
    label: "Demon ending plate",
    src: "endings/demon.svg",
  },
};

export function comicArtSrc(id: string): string {
  const entry = COMIC_ART[id];
  return entry ? `/party-chronicle/${entry.src}` : `/party-chronicle/scenes/missing.svg`;
}

export function getComicArt(id: string): ComicArtEntry | null {
  return COMIC_ART[id] ?? null;
}
