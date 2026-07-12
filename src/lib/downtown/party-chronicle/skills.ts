import type {
  AbilityDef,
  CharacterSave,
  ClassId,
  SkillNode,
  SkillTreeDef,
  Stats,
} from "./types";

/**
 * Skill trees + combat hotbar abilities for Party Chronicle.
 * Trees: Combat, Magic, Survival (cooking/healing), Speech, Beastmaster.
 */

export const SKILL_TREES: SkillTreeDef[] = [
  {
    id: "combat",
    name: "Path of the Blade",
    blurb: "Sword, bow, and shield — the craft of the hold and the road.",
    nodes: [
      {
        id: "cmb-strike",
        tree: "combat",
        name: "Power Strike",
        blurb: "A heavy blow that spends stamina for steel truth.",
        cost: 1,
        requires: [],
        minLevel: 1,
        grantsAbilityId: "ab-power-strike",
      },
      {
        id: "cmb-guard",
        tree: "combat",
        name: "Iron Guard",
        blurb: "Raise the shield; reduce the next wound.",
        cost: 1,
        requires: ["cmb-strike"],
        minLevel: 3,
        grantsAbilityId: "ab-iron-guard",
      },
      {
        id: "cmb-cleave",
        tree: "combat",
        name: "Whirlwind Cleave",
        blurb: "Sweep the goblin line like wheat before the scythe.",
        cost: 2,
        requires: ["cmb-strike"],
        minLevel: 8,
        grantsAbilityId: "ab-cleave",
      },
      {
        id: "cmb-bash",
        tree: "combat",
        name: "Shield Bash",
        blurb: "Rim to the teeth — open a gap for the next strike.",
        cost: 1,
        requires: ["cmb-guard"],
        minLevel: 6,
        grantsAbilityId: "ab-shield-bash",
      },
      {
        id: "cmb-execute",
        tree: "combat",
        name: "Dragonbane Edge",
        blurb: "Legendary finishing art against scaled foes.",
        cost: 3,
        requires: ["cmb-cleave", "cmb-bash"],
        minLevel: 25,
        grantsAbilityId: "ab-dragonbane",
        statBump: { strength: 1 },
      },
    ],
  },
  {
    id: "magic",
    name: "Arcane Song",
    blurb: "Frost, flame, and ward — the old tongues of mountain and star.",
    nodes: [
      {
        id: "mag-spark",
        tree: "magic",
        name: "Arcane Spark",
        blurb: "A cantrip that stingeth like nettles in winter.",
        cost: 1,
        requires: [],
        minLevel: 1,
        grantsAbilityId: "ab-arcane-spark",
      },
      {
        id: "mag-frost",
        tree: "magic",
        name: "Frostbite",
        blurb: "Skyrim's cold tongue — slow the foe's blood.",
        cost: 1,
        requires: ["mag-spark"],
        minLevel: 1,
        grantsAbilityId: "ab-frostbite",
      },
      {
        id: "mag-heal",
        tree: "magic",
        name: "Lay on Hands",
        blurb: "Warm light for wounds of friend or hound.",
        cost: 1,
        requires: ["mag-spark"],
        minLevel: 1,
        grantsAbilityId: "ab-lay-hands",
      },
      {
        id: "mag-ward",
        tree: "magic",
        name: "Novice Ward",
        blurb: "A shimmer of will that turns aside the first spark.",
        cost: 1,
        requires: ["mag-spark"],
        minLevel: 3,
        grantsAbilityId: "ab-novice-ward",
        statBump: { intelligence: 1 },
      },
      {
        id: "mag-fireball",
        tree: "magic",
        name: "Ember Storm",
        blurb: "A roaring sphere that remembers dragon-fire.",
        cost: 3,
        requires: ["mag-frost", "mag-ward"],
        minLevel: 15,
        grantsAbilityId: "ab-ember-storm",
        statBump: { intelligence: 1 },
      },
    ],
  },
  {
    id: "survival",
    name: "Hearth & Wild",
    blurb: "Campfire cooking, field healing, and trail craft.",
    nodes: [
      {
        id: "srv-cook",
        tree: "survival",
        name: "Campfire Stew",
        blurb: "Turn forage into a feast that knits bone and spirit.",
        cost: 1,
        requires: [],
        minLevel: 1,
        grantsAbilityId: "ab-camp-stew",
      },
      {
        id: "srv-bandage",
        tree: "survival",
        name: "Field Bandage",
        blurb: "Linen, herbs, and steady hands.",
        cost: 1,
        requires: [],
        minLevel: 1,
        grantsAbilityId: "ab-field-bandage",
      },
      {
        id: "srv-forge",
        tree: "survival",
        name: "Trail Forge",
        blurb: "Sharpen blades by starlight; +power for a span.",
        cost: 2,
        requires: ["srv-cook"],
        minLevel: 10,
        grantsAbilityId: "ab-trail-forge",
      },
      {
        id: "srv-poison",
        tree: "survival",
        name: "Nightshade Tip",
        blurb: "Coat the edge — a quiet venom of the dark woods.",
        cost: 2,
        requires: ["srv-bandage"],
        minLevel: 9,
        grantsAbilityId: "ab-nightshade",
      },
      {
        id: "srv-feast",
        tree: "survival",
        name: "Heroes' Feast",
        blurb: "A legendary meal that restores the fellowship.",
        cost: 3,
        requires: ["srv-cook", "srv-bandage"],
        minLevel: 30,
        grantsAbilityId: "ab-heroes-feast",
        statBump: { constitution: 1 },
      },
    ],
  },
  {
    id: "speech",
    name: "Silver Tongue",
    blurb: "Persuasion, intimidation, and the songs that open gates.",
    nodes: [
      {
        id: "spc-persuade",
        tree: "speech",
        name: "Silver Tongue",
        blurb: "Bend a merchant or a jarl without drawing steel.",
        cost: 1,
        requires: [],
        minLevel: 1,
        grantsAbilityId: "ab-silver-tongue",
      },
      {
        id: "spc-intimidate",
        tree: "speech",
        name: "War Horn Word",
        blurb: "A threat spoken like a battle-horn.",
        cost: 1,
        requires: ["spc-persuade"],
        minLevel: 6,
        grantsAbilityId: "ab-war-horn",
      },
      {
        id: "spc-rally",
        tree: "speech",
        name: "Rally Cry",
        blurb: "A shout that puts spine back into weary friends.",
        cost: 2,
        requires: ["spc-persuade"],
        minLevel: 8,
        grantsAbilityId: "ab-rally-cry",
      },
      {
        id: "spc-song",
        tree: "speech",
        name: "Lay of the Party",
        blurb: "A fellowship song that steadies hearts.",
        cost: 2,
        requires: ["spc-rally", "spc-intimidate"],
        minLevel: 12,
        grantsAbilityId: "ab-party-lay",
        statBump: { charisma: 1 },
      },
    ],
  },
  {
    id: "beastmaster",
    name: "Houndbond",
    blurb: "Your dog is no pet — a companion of the chronicle.",
    nodes: [
      {
        id: "bst-bond",
        tree: "beastmaster",
        name: "Hound's Bond",
        blurb: "Whistle and the companion answers.",
        cost: 1,
        requires: [],
        minLevel: 1,
        grantsAbilityId: "ab-hound-bond",
      },
      {
        id: "bst-flank",
        tree: "beastmaster",
        name: "Flanking Fang",
        blurb: "The dog strikes from the foe's blind side.",
        cost: 1,
        requires: ["bst-bond"],
        minLevel: 4,
        grantsAbilityId: "ab-flanking-fang",
      },
      {
        id: "bst-guard",
        tree: "beastmaster",
        name: "Watchful Guard",
        blurb: "The hound takes a blow meant for you.",
        cost: 2,
        requires: ["bst-bond"],
        minLevel: 9,
        grantsAbilityId: "ab-watchful-guard",
      },
      {
        id: "bst-howl",
        tree: "beastmaster",
        name: "Howl of the North",
        blurb: "A cry that thins goblin courage and stirs the pack.",
        cost: 2,
        requires: ["bst-flank"],
        minLevel: 15,
        grantsAbilityId: "ab-north-howl",
      },
      {
        id: "bst-legend",
        tree: "beastmaster",
        name: "Legendary Companion",
        blurb: "Bond deep enough to face dragons side by side.",
        cost: 3,
        requires: ["bst-howl", "bst-guard"],
        minLevel: 40,
        grantsAbilityId: "ab-legend-hound",
        statBump: { wisdom: 1 },
      },
    ],
  },
];

export const ABILITIES: AbilityDef[] = [
  {
    id: "ab-power-strike",
    name: "Power Strike",
    tree: "combat",
    kind: "skill",
    blurb: "Spend stamina for a crushing melee blow.",
    nodeId: "cmb-strike",
    cost: { stamina: 8 },
    power: 14,
    tags: ["melee", "physical"],
    target: "enemy",
  },
  {
    id: "ab-iron-guard",
    name: "Iron Guard",
    tree: "combat",
    kind: "skill",
    blurb: "Brace — reduce incoming damage this turn.",
    nodeId: "cmb-guard",
    cost: { stamina: 6 },
    power: 0,
    tags: ["defend"],
    target: "self",
  },
  {
    id: "ab-shield-bash",
    name: "Shield Bash",
    tree: "combat",
    kind: "skill",
    blurb: "Stun the line with the rim of your shield.",
    nodeId: "cmb-bash",
    cost: { stamina: 7 },
    power: 8,
    tags: ["melee", "physical", "stun"],
    target: "enemy",
  },
  {
    id: "ab-cleave",
    name: "Whirlwind Cleave",
    tree: "combat",
    kind: "skill",
    blurb: "Wide arc against clustered foes.",
    nodeId: "cmb-cleave",
    cost: { stamina: 12 },
    power: 18,
    tags: ["melee", "aoe"],
    target: "aoe",
  },
  {
    id: "ab-dragonbane",
    name: "Dragonbane Edge",
    tree: "combat",
    kind: "skill",
    blurb: "Legendary steel against dragons and worse.",
    nodeId: "cmb-execute",
    cost: { stamina: 16 },
    power: 32,
    tags: ["melee", "dragon", "legendary"],
    target: "enemy",
  },
  {
    id: "ab-arcane-spark",
    name: "Arcane Spark",
    tree: "magic",
    kind: "spell",
    blurb: "A cantrip of crackling aether.",
    nodeId: "mag-spark",
    cost: { mana: 4 },
    power: 10,
    tags: ["ranged", "arcane"],
    target: "enemy",
  },
  {
    id: "ab-frostbite",
    name: "Frostbite",
    tree: "magic",
    kind: "spell",
    blurb: "Cold that bites bone.",
    nodeId: "mag-frost",
    cost: { mana: 8 },
    power: 16,
    tags: ["ranged", "frost"],
    target: "enemy",
  },
  {
    id: "ab-lay-hands",
    name: "Lay on Hands",
    tree: "magic",
    kind: "heal",
    blurb: "Restore HP to self or hound.",
    nodeId: "mag-heal",
    cost: { mana: 10 },
    power: 20,
    tags: ["heal"],
    target: "ally",
  },
  {
    id: "ab-novice-ward",
    name: "Novice Ward",
    tree: "magic",
    kind: "spell",
    blurb: "Raise a thin veil against the next blow or bolt.",
    nodeId: "mag-ward",
    cost: { mana: 6 },
    power: 0,
    tags: ["defend", "ward"],
    target: "self",
  },
  {
    id: "ab-ember-storm",
    name: "Ember Storm",
    tree: "magic",
    kind: "spell",
    blurb: "A roaring sphere of remembered dragon-fire.",
    nodeId: "mag-fireball",
    cost: { mana: 18 },
    power: 28,
    tags: ["ranged", "fire", "aoe"],
    target: "aoe",
  },
  {
    id: "ab-camp-stew",
    name: "Campfire Stew",
    tree: "survival",
    kind: "cook",
    blurb: "Cook a restorative meal at camp.",
    nodeId: "srv-cook",
    cost: { stamina: 4 },
    power: 12,
    tags: ["cook", "heal"],
    target: "self",
  },
  {
    id: "ab-field-bandage",
    name: "Field Bandage",
    tree: "survival",
    kind: "heal",
    blurb: "Bind wounds with herbs and linen.",
    nodeId: "srv-bandage",
    cost: { stamina: 3 },
    power: 14,
    tags: ["heal"],
    target: "ally",
  },
  {
    id: "ab-trail-forge",
    name: "Trail Forge",
    tree: "survival",
    kind: "skill",
    blurb: "Sharpen gear — next strike hits harder.",
    nodeId: "srv-forge",
    cost: { stamina: 8 },
    power: 8,
    tags: ["buff"],
    target: "self",
  },
  {
    id: "ab-nightshade",
    name: "Nightshade Tip",
    tree: "survival",
    kind: "skill",
    blurb: "Poison the edge for a lingering sting.",
    nodeId: "srv-poison",
    cost: { stamina: 5 },
    power: 10,
    tags: ["poison", "melee"],
    target: "enemy",
  },
  {
    id: "ab-heroes-feast",
    name: "Heroes' Feast",
    tree: "survival",
    kind: "cook",
    blurb: "A legendary feast for the whole party.",
    nodeId: "srv-feast",
    cost: { stamina: 10 },
    power: 40,
    tags: ["cook", "heal", "party", "legendary"],
    target: "party",
  },
  {
    id: "ab-silver-tongue",
    name: "Silver Tongue",
    tree: "speech",
    kind: "skill",
    blurb: "Persuade without steel.",
    nodeId: "spc-persuade",
    cost: { stamina: 2 },
    power: 0,
    tags: ["speech", "social"],
    target: "enemy",
  },
  {
    id: "ab-war-horn",
    name: "War Horn Word",
    tree: "speech",
    kind: "shout",
    blurb: "Intimidate like a battle-horn.",
    nodeId: "spc-intimidate",
    cost: { stamina: 6 },
    power: 8,
    tags: ["speech", "fear"],
    target: "enemy",
  },
  {
    id: "ab-rally-cry",
    name: "Rally Cry",
    tree: "speech",
    kind: "shout",
    blurb: "Steady the fellowship with a war-cry.",
    nodeId: "spc-rally",
    cost: { stamina: 8 },
    power: 6,
    tags: ["speech", "buff", "party"],
    target: "party",
  },
  {
    id: "ab-party-lay",
    name: "Lay of the Party",
    tree: "speech",
    kind: "skill",
    blurb: "A song that steadies the fellowship.",
    nodeId: "spc-song",
    cost: { mana: 6 },
    power: 10,
    tags: ["speech", "buff", "party"],
    target: "party",
  },
  {
    id: "ab-hound-bond",
    name: "Hound's Bond",
    tree: "beastmaster",
    kind: "hound",
    blurb: "Call your dog to your side — restore bond.",
    nodeId: "bst-bond",
    cost: { stamina: 2 },
    power: 0,
    tags: ["dog"],
    target: "dog",
  },
  {
    id: "ab-flanking-fang",
    name: "Flanking Fang",
    tree: "beastmaster",
    kind: "hound",
    blurb: "Your companion bites from the flank.",
    nodeId: "bst-flank",
    cost: { stamina: 6 },
    power: 12,
    tags: ["dog", "melee"],
    target: "enemy",
  },
  {
    id: "ab-watchful-guard",
    name: "Watchful Guard",
    tree: "beastmaster",
    kind: "hound",
    blurb: "The hound intercepts a blow.",
    nodeId: "bst-guard",
    cost: { stamina: 5 },
    power: 0,
    tags: ["dog", "defend"],
    target: "self",
  },
  {
    id: "ab-north-howl",
    name: "Howl of the North",
    tree: "beastmaster",
    kind: "hound",
    blurb: "A cry that thins courage in the wild.",
    nodeId: "bst-howl",
    cost: { stamina: 10 },
    power: 10,
    tags: ["dog", "aoe", "fear"],
    target: "aoe",
  },
  {
    id: "ab-legend-hound",
    name: "Legendary Companion",
    tree: "beastmaster",
    kind: "hound",
    blurb: "Bond deep enough for dragons.",
    nodeId: "bst-legend",
    cost: { stamina: 10, mana: 6 },
    power: 24,
    tags: ["dog", "legendary"],
    target: "enemy",
  },
];

export function getAbility(id: string): AbilityDef | undefined {
  return ABILITIES.find((a) => a.id === id);
}

export function getNode(id: string): SkillNode | undefined {
  for (const tree of SKILL_TREES) {
    const n = tree.nodes.find((x) => x.id === id);
    if (n) return n;
  }
  return undefined;
}

export function allNodes(): SkillNode[] {
  return SKILL_TREES.flatMap((t) => t.nodes);
}

export function getTree(id: SkillTreeDef["id"]): SkillTreeDef | undefined {
  return SKILL_TREES.find((t) => t.id === id);
}

export type UnlockNodeResult =
  | { ok: true; character: CharacterSave; node: SkillNode; abilityId?: string }
  | { ok: false; reason: string };

export function canUnlockNode(
  character: CharacterSave,
  nodeId: string
): { ok: true } | { ok: false; reason: string } {
  const node = getNode(nodeId);
  if (!node) return { ok: false, reason: "Unknown skill node." };
  if (character.unlockedNodes.includes(nodeId)) {
    return { ok: false, reason: "Already unlocked." };
  }
  if (character.level < node.minLevel) {
    return { ok: false, reason: `Requires level ${node.minLevel}.` };
  }
  for (const req of node.requires) {
    if (!character.unlockedNodes.includes(req)) {
      const missing = getNode(req);
      return { ok: false, reason: `Requires ${missing?.name ?? req}.` };
    }
  }
  if (character.skillPoints < node.cost) {
    return { ok: false, reason: "Not enough skill points." };
  }
  return { ok: true };
}

function applyStatBump(stats: Stats, bump?: Partial<Stats>): Stats {
  if (!bump) return stats;
  const next = { ...stats };
  for (const key of Object.keys(bump) as (keyof Stats)[]) {
    const v = bump[key];
    if (typeof v === "number") next[key] = Math.min(20, (next[key] ?? 10) + v);
  }
  return next;
}

/** Spend points, unlock node, grant hotbar ability + optional stat bump. */
export function unlockSkillNode(
  character: CharacterSave,
  nodeId: string
): UnlockNodeResult {
  const gate = canUnlockNode(character, nodeId);
  if (!gate.ok) return gate;
  const node = getNode(nodeId)!;

  const abilities = [...character.abilities];
  if (node.grantsAbilityId && !abilities.includes(node.grantsAbilityId)) {
    abilities.push(node.grantsAbilityId);
  }

  const next: CharacterSave = {
    ...character,
    skillPoints: character.skillPoints - node.cost,
    unlockedNodes: [...character.unlockedNodes, nodeId],
    abilities,
    stats: applyStatBump(character.stats, node.statBump),
  };

  return { ok: true, character: next, node, abilityId: node.grantsAbilityId };
}

export function listUnlockableNodes(character: CharacterSave): SkillNode[] {
  return allNodes().filter((n) => canUnlockNode(character, n.id).ok);
}

/** Leftover points after create kit (abilities granted free at create). */
export const STARTER_SKILL_POINTS = 1;

/** Legacy auto-starter — Neverworld create uses player picks via create.ts. */
const COMBAT_STARTER = ["cmb-strike", "srv-bandage"] as const;
const COMBAT_ABILITIES = ["ab-power-strike", "ab-field-bandage"] as const;
const RANGER_STARTER = ["bst-bond", "cmb-strike"] as const;
const RANGER_ABILITIES = ["ab-hound-bond", "ab-power-strike"] as const;
const CASTER_STARTER = ["mag-spark", "mag-frost"] as const;
const CASTER_ABILITIES = ["ab-arcane-spark", "ab-frostbite"] as const;
const HEALER_STARTER = ["mag-spark", "mag-heal", "mag-ward"] as const;
const HEALER_ABILITIES = ["ab-arcane-spark", "ab-lay-hands", "ab-novice-ward"] as const;
const BARD_STARTER = ["mag-spark", "mag-frost", "mag-heal", "mag-ward"] as const;
const BARD_ABILITIES = ["ab-arcane-spark", "ab-frostbite", "ab-lay-hands", "ab-novice-ward"] as const;
const ROGUE_STARTER = ["spc-persuade", "cmb-strike"] as const;
const ROGUE_ABILITIES = ["ab-silver-tongue", "ab-power-strike"] as const;
const HYBRID_STARTER = ["cmb-strike", "mag-spark"] as const;
const HYBRID_ABILITIES = ["ab-power-strike", "ab-arcane-spark"] as const;
const SHAMAN_STARTER = ["mag-spark", "bst-bond", "mag-heal"] as const;
const SHAMAN_ABILITIES = ["ab-arcane-spark", "ab-hound-bond", "ab-lay-hands"] as const;
const BATTLEMAGE_STARTER = ["cmb-strike", "mag-spark", "mag-frost"] as const;
const BATTLEMAGE_ABILITIES = ["ab-power-strike", "ab-arcane-spark", "ab-frostbite"] as const;

export const CLASS_STARTER_NODES: Record<ClassId, string[]> = {
  warrior: [...COMBAT_STARTER],
  ranger: [...RANGER_STARTER],
  mage: [...CASTER_STARTER],
  healer: [...HEALER_STARTER],
  bard: [...BARD_STARTER],
  rogue: [...ROGUE_STARTER],
  paladin: [...COMBAT_STARTER],
  priest: [...HEALER_STARTER],
  deathknight: [...HYBRID_STARTER],
  shaman: [...SHAMAN_STARTER],
  warlock: [...CASTER_STARTER],
  monk: [...HEALER_STARTER],
  druid: [...HEALER_STARTER],
  demonhunter: [...HYBRID_STARTER],
  evoker: [...BARD_STARTER],
  assassin: [...ROGUE_STARTER],
  battlemage: [...BATTLEMAGE_STARTER],
  spellsword: [...BATTLEMAGE_STARTER],
  nightblade: [...HYBRID_STARTER],
  sorcerer: [...CASTER_STARTER],
  warden: [...RANGER_STARTER],
  necromancer: [...CASTER_STARTER],
  barbarian: [...COMBAT_STARTER],
  knight: [...COMBAT_STARTER],
};

export const CLASS_STARTER_ABILITIES: Record<ClassId, string[]> = {
  warrior: [...COMBAT_ABILITIES],
  ranger: [...RANGER_ABILITIES],
  mage: [...CASTER_ABILITIES],
  healer: [...HEALER_ABILITIES],
  bard: [...BARD_ABILITIES],
  rogue: [...ROGUE_ABILITIES],
  paladin: [...COMBAT_ABILITIES],
  priest: [...HEALER_ABILITIES],
  deathknight: [...HYBRID_ABILITIES],
  shaman: [...SHAMAN_ABILITIES],
  warlock: [...CASTER_ABILITIES],
  monk: [...HEALER_ABILITIES],
  druid: [...HEALER_ABILITIES],
  demonhunter: [...HYBRID_ABILITIES],
  evoker: [...BARD_ABILITIES],
  assassin: [...ROGUE_ABILITIES],
  battlemage: [...BATTLEMAGE_ABILITIES],
  spellsword: [...BATTLEMAGE_ABILITIES],
  nightblade: [...HYBRID_ABILITIES],
  sorcerer: [...CASTER_ABILITIES],
  warden: [...RANGER_ABILITIES],
  necromancer: [...CASTER_ABILITIES],
  barbarian: [...COMBAT_ABILITIES],
  knight: [...COMBAT_ABILITIES],
};

/** Non-magic starter skills offered at character create. */
export const CREATE_SKILL_ABILITIES = [
  "ab-power-strike",
  "ab-camp-stew",
  "ab-field-bandage",
  "ab-silver-tongue",
  "ab-hound-bond",
] as const;

/** Magic starter spells offered at character create. */
export const CREATE_MAGIC_ABILITIES = [
  "ab-arcane-spark",
  "ab-frostbite",
  "ab-lay-hands",
  "ab-novice-ward",
] as const;
