/** Neverworld — Skyrim / Middle-earth party RPG types */

export const STAT_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export const PLAYER_SLOT_ORDER = ["justin", "rusty", "elisha"] as const;
export type PlayerSlot = (typeof PLAYER_SLOT_ORDER)[number];

export const CLASS_IDS = [
  // Core fellowship
  "warrior",
  "ranger", // WoW Hunter
  "mage",
  "rogue", // Skyrim Thief
  "healer",
  "bard",
  // WoW
  "paladin",
  "priest",
  "deathknight",
  "shaman",
  "warlock",
  "monk",
  "druid",
  "demonhunter",
  "evoker",
  // Skyrim
  "assassin",
  "battlemage",
  "spellsword",
  "nightblade",
  "sorcerer",
  "warden",
  "necromancer",
  "barbarian",
  "knight",
] as const;
export type ClassId = (typeof CLASS_IDS)[number];

export const EQUIP_SLOTS = ["head", "chest", "hands", "legs", "weapon", "offhand", "accessory"] as const;
export type EquipSlot = (typeof EQUIP_SLOTS)[number];

export type GearTier = "common" | "magic" | "legendary";

export type SkillTreeId = "combat" | "magic" | "survival" | "speech" | "beastmaster";

export type AbilityKind = "skill" | "spell" | "shout" | "cook" | "heal" | "hound";

export type AbilityCost = { stamina?: number; mana?: number };

export type AbilityTarget =
  | "enemy"
  | "self"
  | "ally"
  | "party"
  | "dog"
  | "aoe";

export type AbilityDef = {
  id: string;
  name: string;
  tree: SkillTreeId;
  kind: AbilityKind;
  blurb: string;
  /** Skill-tree node that unlocks this hotbar ability */
  nodeId: string;
  cost?: AbilityCost;
  power: number;
  tags: string[];
  /** Optional explicit target; otherwise inferred from tags/kind. */
  target?: AbilityTarget;
};

/** Payload fired when a combat hotbar slot is used (UI + encounter engine). */
export type CombatUsePayload = {
  abilityId: string;
  slotIndex: number;
  name: string;
  kind: AbilityKind;
  tree: SkillTreeId;
  blurb: string;
  cost: AbilityCost;
  power: number;
  tags: string[];
  target: AbilityTarget;
  /** Flavor line for combat log / juice. */
  flavor: string;
};

export type SkillNode = {
  id: string;
  tree: SkillTreeId;
  name: string;
  blurb: string;
  cost: number;
  /** Node ids that must be unlocked first */
  requires: string[];
  /** Level gate */
  minLevel: number;
  grantsAbilityId?: string;
  statBump?: Partial<Stats>;
};

export type SkillTreeDef = {
  id: SkillTreeId;
  name: string;
  blurb: string;
  nodes: SkillNode[];
};

export type GearItem = {
  id: string;
  name: string;
  blurb: string;
  tier: GearTier;
  slot: EquipSlot | "consumable" | "misc";
  power?: number;
  armor?: number;
  heal?: number;
  /** Mana restored when drunk / used as a potion. */
  manaRestore?: number;
  cookBonus?: number;
  tags: string[];
};

/** Turn-based random / camp battle actions. */
export type BattleActionId =
  | "attack"
  | "powerUp"
  | "eat"
  | "spell"
  | "drinkHp"
  | "drinkMana";

export type BattleLootDrop = {
  itemId: string;
  name: string;
  rarity: "common" | "magic" | "rare" | "legendary";
};

export type BattleSummary = {
  victory: boolean;
  enemyName: string;
  isBoss: boolean;
  damageDealt: number;
  damageTaken: number;
  xp: number;
  gold: number;
  loot: BattleLootDrop[];
  turns: number;
};

export type BattleHeroState = {
  id: string;
  slot: PlayerSlot;
  name: string;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  power: number;
  armor: number;
  powerUpTurns: number;
};

export type BattleEnemyState = {
  id: string;
  name: string;
  blurb: string;
  hp: number;
  maxHp: number;
  power: number;
  armor: number;
  mana: number;
  maxMana: number;
  artId?: string;
  isBoss: boolean;
  xp: number;
  gold: number;
  lootPool: string;
  uniqueDrops?: string[];
  uniqueSkill?: {
    id: string;
    name: string;
    blurb: string;
    power: number;
    manaCost?: number;
  };
};

export type BattleState = {
  id: string;
  status: "active" | "victory" | "defeat";
  enemy: BattleEnemyState;
  heroes: BattleHeroState[];
  /** Combatant ids in order (hero slots + "enemy"). */
  turnQueue: string[];
  turnIndex: number;
  activeId: string;
  log: string[];
  stats: {
    damageDealt: number;
    damageTaken: number;
    turns: number;
  };
  summary: BattleSummary | null;
  startedAt: string;
};

export type DogCompanion = {
  name: string;
  breed: string;
  bond: number;
  hp: number;
  maxHp: number;
};

export type HotbarSlot = string | null;

/** ≥5 so Bard (1 skill + 4 magic) fits on the bar. */
export const HOTBAR_SIZE = 5;

export type CharacterSave = {
  slot: PlayerSlot;
  name: string;
  classId: ClassId;
  level: number;
  xp: number;
  skillPoints: number;
  stats: Stats;
  hp: number;
  maxHp: number;
  stamina: number;
  maxStamina: number;
  mana: number;
  maxMana: number;
  dog: DogCompanion;
  /** Unlocked skill node ids */
  unlockedNodes: string[];
  /** Ability ids learned */
  abilities: string[];
  /** Hotbar: ≥3 slots (we use 4) */
  hotbar: HotbarSlot[];
  inventory: string[];
  equipped: Partial<Record<EquipSlot, string | null>>;
  gold: number;
  flags: string[];
  /** Private conversation / path choices logged */
  choiceLog: { nodeId: string; choiceId: string; at: string }[];
  created: boolean;
};

/** Destiny tracks steered by path choices → finale endings. */
export const ALIGNMENT_PATHS = ["animal", "human", "demon"] as const;
export type AlignmentPath = (typeof ALIGNMENT_PATHS)[number];

export type AlignmentScores = Record<AlignmentPath, number>;

/** Comic-panel / illustration key for the 90s RPG UI. */
export type ComicArtRef = {
  /** Scene plate id (full panel background / establishing shot). */
  sceneId: string;
  /** Foreground illustration / portrait / splash id. */
  artId: string;
};

export type StoryChoice = {
  id: string;
  label: string;
  approach: string;
  /** Optional skill check */
  stat?: StatKey;
  dc?: number;
  /** Required ability or flag */
  requireFlag?: string;
  requireAbility?: string;
  /** Skill-check success branch (optional if `outcome` is set). */
  success?: StoryOutcome;
  fail?: StoryOutcome;
  /** Always apply (no check) */
  outcome?: StoryOutcome;
};

export type StoryOutcome = {
  text: string;
  xp?: number;
  gold?: number;
  flagsAdd?: string[];
  flagsRemove?: string[];
  itemId?: string;
  nextNodeId?: string;
  endingId?: string;
  healParty?: number;
  damage?: number;
  /** Cumulative destiny deltas (Animal / Human / Demon). */
  alignment?: Partial<AlignmentScores>;
  /** Optional reaction panel after the choice resolves. */
  artId?: string;
  sceneId?: string;
};

type StoryArtFields = {
  /** Establishing / panel background key for comic UI. */
  sceneId?: string;
  /** Portrait, creature plate, or splash illustration key. */
  artId?: string;
};

export type StoryNode =
  | ({
      id: string;
      kind: "narrative";
      title: string;
      body: string;
      speaker?: string;
      next: string;
      flagsAdd?: string[];
    } & StoryArtFields)
  | ({
      id: string;
      kind: "conversation";
      title: string;
      body: string;
      speaker: string;
      /** Talking beasts → render body in a speech balloon. */
      balloon?: boolean;
      npcId?: string;
      choices: StoryChoice[];
    } & StoryArtFields)
  | ({
      id: string;
      kind: "path";
      title: string;
      body: string;
      choices: StoryChoice[];
    } & StoryArtFields)
  | ({
      id: string;
      kind: "encounter";
      title: string;
      body: string;
      enemy: string;
      enemyHp: number;
      enemyPower: number;
      enemyArtId?: string;
      /** Victory / flee / special */
      choices: StoryChoice[];
    } & StoryArtFields)
  | ({
      id: string;
      kind: "ending";
      title: string;
      body: string;
      endingId: string;
      /** Full-bleed finale splash for comic UI. */
      splashArtId?: string;
    } & StoryArtFields)
  | ({
      id: string;
      kind: "montage";
      title: string;
      body: string;
      /** Compressed travel / training — still awards meaningful XP via next choice or auto. */
      xpGrant: number;
      next: string;
      flagsAdd?: string[];
    } & StoryArtFields);

export type ChapterDef = {
  id: string;
  chapter: number;
  /** Approximate level band this chapter is designed for */
  levelMin: number;
  levelMax: number;
  title: string;
  tagline: string;
  startNodeId: string;
  nodeIds: string[];
  /** Chapter title splash panel. */
  splashArtId?: string;
  sceneId?: string;
  /** Estimated solo play hours for this act (3-player turns multiply). */
  estimatedHours?: number;
};

export type EndingDef = {
  id: string;
  title: string;
  blurb: string;
  tone: "glory" | "shadow" | "bond" | "crown" | "exile";
  path?: AlignmentPath;
  /** Full-bleed comic splash for this finale. */
  splashArtId?: string;
  sceneId?: string;
  artId?: string;
};

/** Named speaking beast NPC for dialogue + quest hooks. */
export type AnimalNpcDef = {
  id: string;
  name: string;
  species: string;
  title: string;
  blurb: string;
  /** Default portrait / panel art. */
  artId: string;
  sceneId: string;
  /** Primary destiny this beast steers toward. */
  leans: AlignmentPath;
  /** Short lines that fit speech balloons (≤ ~90 chars preferred). */
  balloonLines: string[];
};

/** Mid-act road fight from encounter decks (not authored story nodes). */
export type DeckEncounterState = {
  id: string;
  name: string;
  maxHp: number;
  xp: number;
  gold: number;
  lootIds: string[];
  artId?: string;
};

export type PartyWorldSave = {
  version: 1;
  /** Whose turn in rotation */
  activeSlot: PlayerSlot;
  turnIndex: number;
  campaignNodeId: string;
  chapterId: string;
  partyFlags: string[];
  /** Running Animal / Human / Demon scores from path choices. */
  alignment: AlignmentScores;
  encounterEnemyHp: number | null;
  /** Active mid-act deck fight (null when idle / story-node fight). */
  deckEncounter: DeckEncounterState | null;
  /** Full turn-based battle overlay (random ambush / forced fight). */
  battle: BattleState | null;
  /** Cumulative ms of story/active play (drives random encounters). */
  storyPlayMs: number;
  /** Battles completed this campaign (schedules next ambush cadence). */
  battlesFought: number;
  /** storyPlayMs threshold for the next random battle. */
  nextEncounterAtMs: number;
  /** Completed side-quest ids. */
  completedSideQuests: string[];
  /** Recipe ids cooked at least once. */
  cookedRecipes: string[];
  log: string[];
  endingId: string | null;
  characters: Record<PlayerSlot, CharacterSave>;
  updatedAt: string;
  startedAt: string;
};

export type PlayerIdentity = {
  email: string;
  name: string | null;
  slot: PlayerSlot | null;
  isDm: boolean;
};
