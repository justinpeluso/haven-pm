/** Neverworld — Skyrim / Middle-earth party RPG types */

export const STAT_KEYS = ["strength", "dexterity", "constitution", "intelligence", "wisdom", "charisma"] as const;
export type StatKey = (typeof STAT_KEYS)[number];
export type Stats = Record<StatKey, number>;

export const PLAYER_SLOT_ORDER = ["justin", "rusty", "elisha", "eric", "dad"] as const;
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

/** Item rarity ladder. `magic` is a legacy alias for uncommon (Neverworld catalogs). */
export type GearTier =
  | "common"
  | "uncommon"
  | "magic"
  | "rare"
  | "epic"
  | "legendary";

/** Affix keys for gear bonuses (common = none; rare = 1; epic/legendary = 2). */
export const GEAR_PROPERTY_KEYS = [
  "strength",
  "dexterity",
  "constitution",
  "intelligence",
  "wisdom",
  "charisma",
  "maxHp",
  "maxMana",
  "atk",
  "def",
  "crit",
  "resist",
] as const;
export type GearPropertyKey = (typeof GEAR_PROPERTY_KEYS)[number];

export type GearProperty = {
  key: GearPropertyKey;
  value: number;
  /** Display label, e.g. "+3 STR" */
  label?: string;
};

export type GearSetBonus = {
  /** Pieces required (2, 3, or full set size). */
  pieces: number;
  properties: GearProperty[];
  blurb: string;
};

export type GearSetDef = {
  id: string;
  name: string;
  blurb: string;
  pieceIds: string[];
  bonuses: GearSetBonus[];
};

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
  /** Stamina restored when used (tea / food). */
  staminaRestore?: number;
  cookBonus?: number;
  tags: string[];
  /** Affixes — bonuses only; base ATK/DEF come from power/armor. Count by rarity: 0 / 1 / 2. */
  properties?: GearProperty[];
  /** Named set membership (Frostwarden, Emberfang, …). */
  setId?: string;
  /** Optional display rarity; defaults from tier. */
  rarity?: GearTier;
};

/** Turn-based random / camp battle actions. */
export type BattleActionId =
  | "attack"
  | "powerUp"
  | "eat"
  | "spell"
  | "drinkHp"
  | "drinkMana"
  | "wait"
  | "move";

/** HoMM-style battlefield cell. */
export type BattleGridPos = { x: number; y: number };

/** Unit token on the tactical grid (positions; HP lives on heroes/pets/enemy). */
export type BattleTacticalUnit = {
  id: string;
  side: "party" | "enemy";
  /** Present for party heroes. */
  heroSlot?: PlayerSlot;
  /** Dog companion token — HP lives on `BattleState.pets`. */
  kind?: "hero" | "pet" | "enemy";
  /** Owner hero slot when `kind === "pet"`. */
  ownerSlot?: PlayerSlot;
  x: number;
  y: number;
  /** Movement points this turn (HoMM-style steps). */
  speed: number;
  /** Attack reach in Chebyshev tiles (1 = melee adjacent). */
  range: number;
};

/**
 * Grid combat layer — optional for legacy saves; engine hydrates if missing.
 * Phase: move (optional reposition) → act (attack / skills / wait).
 */
export type BattleTacticalState = {
  cols: number;
  rows: number;
  units: BattleTacticalUnit[];
  phase: "move" | "act";
};

export type BattleLootDrop = {
  itemId: string;
  name: string;
  rarity: GearTier;
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
  /** Highest R.O.C. total scored this fight (flavor). */
  bestRoc?: number;
  lastRocLabel?: string;
};

/** Short battle statuses shown as icons on tokens. */
export type BattleStatusId = "powered" | "warded" | "healed" | "marked";

export type BattleStatus = {
  id: BattleStatusId;
  /** Remaining turns; 0 = this turn only / cosmetic. */
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
  statuses?: BattleStatus[];
};

/** Dog companion as a full tactical combatant (weaker than heroes). */
export type BattlePetState = {
  /** Combatant id — `pet-<ownerSlot>`. */
  id: string;
  ownerSlot: PlayerSlot;
  name: string;
  breed: string;
  hp: number;
  maxHp: number;
  power: number;
  armor: number;
};

export type BattleEnemyState = {
  /** Creature / boss def id. */
  id: string;
  /**
   * Combatant id on the turn queue + tactical grid.
   * First foe is `"enemy"` (legacy); extras are `"enemy-1"`, `"enemy-2"`, …
   */
  unitId?: string;
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

/** Transient battle juice — floaters + beams / swings / buff rings. */
export type BattleFxTone = "melee" | "spell" | "heal" | "buff";

export type BattleFxEvent = {
  id: string;
  /**
   * damage/heal/miss/crit = floating numbers;
   * beam/swing/buff/ko = board VFX.
   */
  kind: "damage" | "heal" | "miss" | "crit" | "flank" | "beam" | "swing" | "buff" | "ko";
  /** Present for numeric floaters. */
  amount?: number;
  /** Hit / heal / buff / KO recipient (enemy unit id or hero combatant id). */
  target: string;
  /** Attacker / caster for beams and swings. */
  source?: string;
  tone?: BattleFxTone;
  /** Grid cell for KO dissolve when the token is already removed. */
  cellX?: number;
  cellY?: number;
  at: string;
};

/** Battle pressure clocks (idle auto-hit / hard-cap defeat). Default `"on"` = Neverworld. */
export type BattleClockMode = "on" | "off";

export type BattleState = {
  id: string;
  status: "active" | "victory" | "defeat";
  /**
   * When `"off"`, skip 30s idle force-hit and 10 min hard-cap defeat.
   * Cosmetic 3-2-1 intro still runs. Absent / `"on"` = Neverworld defaults.
   */
  clockMode?: BattleClockMode;
  /**
   * Featured / lead foe (first living, else first in pack).
   * Kept in sync with `enemies` for legacy UI + summary copy.
   */
  enemy: BattleEnemyState;
  /**
   * Full enemy pack — length matches sealed heroes in the fight.
   * Absent on legacy single-foe saves (treat as `[enemy]`).
   */
  enemies?: BattleEnemyState[];
  heroes: BattleHeroState[];
  /**
   * Dog companions fighting as separate party units.
   * Absent on legacy saves (hydrate from character dogs when tactical is rebuilt).
   */
  pets?: BattlePetState[];
  /** Combatant ids in order (hero, pet, … then enemy unit ids). */
  turnQueue: string[];
  turnIndex: number;
  activeId: string;
  log: string[];
  stats: {
    damageDealt: number;
    damageTaken: number;
    turns: number;
    /** Peak R.O.C. total this battle. */
    bestRoc?: number;
  };
  /** Last resolved R.O.C. line for overlay. */
  lastRocLabel?: string | null;
  summary: BattleSummary | null;
  startedAt: string;
  /** When the current combatant's turn began (idle auto-act). */
  turnStartedAt?: string;
  /**
   * ISO time when the 3-2-1 intro ends and combat clocks / input unlock.
   * Absent on legacy battles (intro skipped).
   */
  introEndsAt?: string;
  /** Recent damage/heal pulses for floating combat numbers. */
  fxEvents?: BattleFxEvent[];
  /** HoMM-style grid map; hydrated if missing on legacy active battles. */
  tactical?: BattleTacticalState;
};

export type DogCompanion = {
  name: string;
  breed: string;
  bond: number;
  hp: number;
  maxHp: number;
  /** Battles since last feed — True Grit dogs flee when this climbs. */
  hunger?: number;
  /** Player was mean — dog hides at camp until fed / called. */
  sulking?: boolean;
};

/** Sex for dog-fetched trail people (random at find). */
export const FETCHED_SEXES = ["female", "male", "nonbinary"] as const;
export type FetchedSex = (typeof FETCHED_SEXES)[number];

/**
 * Person the dog fetches on the trail — one per hero until disbanded.
 * Playable/levelable; not a login party seat.
 */
export type DtFetchedCompanion = {
  id: string;
  name: string;
  sex: FetchedSex;
  raceId: RaceId;
  classId: ClassId;
  level: number;
  xp: number;
  skillPoints: number;
  stats: Stats;
  hp: number;
  maxHp: number;
  mana: number;
  maxMana: number;
  stamina: number;
  maxStamina: number;
  inventory: string[];
  equipped: Partial<Record<EquipSlot, string | null>>;
  dtLook?: {
    skin: string;
    hair: string;
    hairColor: string;
    outfit: string;
    hat: string;
  };
  foundAt: string;
};

export type HotbarSlot = string | null;

/** ≥5 so Bard (1 skill + 4 magic) fits on the bar. */
export const HOTBAR_SIZE = 5;

export type { RaceId } from "./races";
import type { RaceId } from "./races";

export type CharacterSave = {
  slot: PlayerSlot;
  name: string;
  classId: ClassId;
  /** Sealed-world race (NeverWorld homage). */
  raceId?: RaceId;
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
  /**
   * Trail person the dog fetched — stays until you disband them.
   * Null/undefined = dog is free to find someone new.
   */
  fetchedCompanion?: DtFetchedCompanion | null;
  /**
   * True Grit frontier appearance (optional).
   * Neverworld ignores this; DT create + battle use it instead of class comic plates.
   */
  dtLook?: {
    skin: string;
    hair: string;
    hairColor: string;
    outfit: string;
    hat: string;
  };
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
  /** Optional Pathway nudges (Giver / Taker). */
  pathway?: Partial<{ giver: number; taker: number }>;
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

/** Procedural overworld — click-to-walk map (Neverworld). */
export type ExploreWandererOption = {
  id: string;
  label: string;
  kind: "side_quest" | "main_hint" | "trade" | "new_path" | "leave";
  questId?: string;
};

export type ExploreWanderer = {
  id: string;
  name: string;
  blurb: string;
  biomeId: string;
  options: ExploreWandererOption[];
};

export type ExploreState = {
  /** Deterministic world seed (from startedAt). */
  seed: number;
  /** Party tile coordinates. */
  x: number;
  y: number;
  biomeId: string;
  /** Total tiles walked this campaign. */
  moves: number;
  movesSinceEncounter: number;
  movesSinceWanderer: number;
  /** Optional discovered chunk keys `"cx,cy"` (capped). */
  discoveredChunks?: string[];
  /** Active “traveler approaches” overlay. */
  pendingWanderer?: ExploreWanderer | null;
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
  /** Giver vs Taker pathway (NeverWorld homage) — beside destiny. */
  pathway?: { giver: number; taker: number };
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
  /** In-progress side quest run (Camp → playable steps + overall timer). */
  activeSideQuest?: {
    questId: string;
    title: string;
    summary: string;
    kind: string;
    artId?: string;
    sceneId?: string;
    startedAt: string;
    endsAt: string;
    estimatedMinutes: number;
    stepIndex: number;
    steps: {
      id: string;
      kind: "brief" | "travel" | "battle" | "resolve";
      label: string;
      blurb: string;
      done: boolean;
      foeId?: string;
      battleStarted?: boolean;
      battleWon?: boolean;
    }[];
    status: "active" | "success" | "failed_timeout";
    starterSlot: PlayerSlot;
  } | null;
  /** Recipe ids cooked at least once. */
  cookedRecipes: string[];
  /** Times the party opened a chest or dug a hole. */
  explorationFinds?: number;
  /** ISO timestamps of recent Camp sleeps (rate-limited: 5 / 20 min). */
  campSleeps?: string[];
  /** Last chest / dig result (for Camp UI flash). */
  lastExploration?: {
    kind: "chest" | "dig";
    title: string;
    blurb: string;
    gold: number;
    xp: number;
    itemIds: string[];
    itemNames: string[];
  } | null;
  /**
   * Procedural click-to-walk overworld (primary play loop).
   * Seeded from startedAt; chunks generate as the party walks.
   */
  explore?: ExploreState | null;
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
