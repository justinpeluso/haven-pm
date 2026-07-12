"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { DowntownSubnav } from "@/components/downtown/downtown-subnav";
import { EMPTY_ALIGNMENT, ENDING_BY_ID, mergeAlignment, resolveEndingId } from "@/lib/downtown/party-chronicle/alignment";
import { getAnimalNpc } from "@/lib/downtown/party-chronicle/animals";
import { comicArtSrc } from "@/lib/downtown/party-chronicle/art";
import { GEAR_CATALOG, STARTER_GEAR_BY_CLASS, getGear } from "@/lib/downtown/party-chronicle/gear";
import {
  CLASS_DEFS,
  SLOT_DEFAULTS,
  STAT_POINT_BUY_POOL,
  slotFromEmail,
} from "@/lib/downtown/party-chronicle/players";
import { getAbility, SKILL_TREES, unlockSkillNode } from "@/lib/downtown/party-chronicle/skills";
import {
  START_CHAPTER_ID,
  START_NODE_ID,
  STORY_NODE_BY_ID,
} from "@/lib/downtown/party-chronicle/story";
import {
  createNewWorld as createLibWorld,
  clearWorld,
  loadWorld as loadLibWorld,
  writeWorld as writeLibWorld,
  SAVE_KEY as LIB_SAVE_KEY,
} from "@/lib/downtown/party-chronicle/persist";
import {
  CLASS_IDS,
  EQUIP_SLOTS,
  HOTBAR_SIZE,
  PLAYER_SLOT_ORDER,
  STAT_KEYS,
  type CharacterSave,
  type ClassId,
  type EquipSlot,
  type PartyWorldSave,
  type PlayerIdentity,
  type PlayerSlot,
  type StatKey,
} from "@/lib/downtown/party-chronicle/types";
import "@/components/party-chronicle/party-chronicle.css";

type UiPhase = "boot" | "title" | "create" | "play" | "ending";
type MainTab = "story" | "skills" | "inventory" | "codex" | "party";

const SAVE_KEY = LIB_SAVE_KEY;

const STAT_LABELS: Record<StatKey, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const CLASS_STARTER_ABILITIES: Record<ClassId, string[]> = {
  warrior: ["ab-power-strike", "ab-iron-guard", "ab-cleave"],
  paladin: ["ab-power-strike", "ab-lay-hands", "ab-war-horn"],
  ranger: ["ab-power-strike", "ab-hound-bond", "ab-flanking-fang"],
  mage: ["ab-arcane-spark", "ab-frostbite", "ab-lay-hands"],
  rogue: ["ab-power-strike", "ab-silver-tongue", "ab-flanking-fang"],
};

/** 50-hour campaign codex — swap when lib/codex.ts lands. */
const CODEX_ACTS: { act: number; title: string; hours: number; chapter: string }[] = [
  { act: 1, title: "Frostford Dawn", hours: 4, chapter: "ch1-frostford" },
  { act: 2, title: "Goblin Road", hours: 5, chapter: "ch2-goblin-road" },
  { act: 3, title: "Hold of Embers", hours: 5, chapter: "ch3-ember-hold" },
  { act: 4, title: "Dragon Whisper", hours: 6, chapter: "ch4-dragon-whisper" },
  { act: 5, title: "Misty Crossing", hours: 5, chapter: "ch5-misty-crossing" },
  { act: 6, title: "Crown of Ash", hours: 6, chapter: "ch6-crown-ash" },
  { act: 7, title: "Fellowship Strain", hours: 5, chapter: "ch7-fellowship" },
  { act: 8, title: "World-Eater Gate", hours: 6, chapter: "ch8-worldeater" },
  { act: 9, title: "Last Council", hours: 4, chapter: "ch9-last-council" },
  { act: 10, title: "Chronicle's End", hours: 4, chapter: "ch10-endings" },
];

/** Full campaign nodes from lib (branching chapters + finales). */
const STARTER_STORY = STORY_NODE_BY_ID;

function endingNodeId(endingId: string): string {
  if (endingId === "ending-animal") return "node-finale-animal";
  if (endingId === "ending-human") return "node-finale-human";
  return "node-finale-demon";
}

function createEmptyHotbar(): (string | null)[] {
  return Array.from({ length: HOTBAR_SIZE }, () => null);
}

function createBlankCharacter(slot: PlayerSlot): CharacterSave {
  const def = SLOT_DEFAULTS[slot];
  const classId = def.suggestedClass;
  const cls = CLASS_DEFS[classId];
  return {
    slot,
    name: def.displayName,
    classId,
    level: 1,
    xp: 0,
    skillPoints: 0,
    stats: { ...cls.baseStats },
    hp: cls.hp,
    maxHp: cls.hp,
    stamina: cls.stamina,
    maxStamina: cls.stamina,
    mana: cls.mana,
    maxMana: cls.mana,
    dog: {
      name: def.dogName,
      breed: def.dogBreed,
      bond: 10,
      hp: 20,
      maxHp: 20,
    },
    unlockedNodes: [],
    abilities: [],
    hotbar: createEmptyHotbar(),
    inventory: [],
    equipped: {},
    gold: 10,
    flags: [],
    choiceLog: [],
    created: false,
  };
}

function finalizeCharacter(char: CharacterSave, classId: ClassId, name: string, stats: CharacterSave["stats"]): CharacterSave {
  const cls = CLASS_DEFS[classId];
  const abilities = CLASS_STARTER_ABILITIES[classId];
  const hotbar = createEmptyHotbar();
  abilities.slice(0, HOTBAR_SIZE).forEach((id, i) => {
    hotbar[i] = id;
  });
  const starterGear = STARTER_GEAR_BY_CLASS[classId] ?? [];
  return {
    ...char,
    name: name.trim() || char.name,
    classId,
    stats,
    hp: cls.hp,
    maxHp: cls.hp,
    stamina: cls.stamina,
    maxStamina: cls.stamina,
    mana: cls.mana,
    maxMana: cls.mana,
    abilities: [...abilities],
    hotbar,
    inventory: [...starterGear],
    equipped: {
      weapon: starterGear.find((id) => getGear(id)?.slot === "weapon") ?? null,
      chest: starterGear.find((id) => getGear(id)?.slot === "chest") ?? null,
    },
    created: true,
  };
}

function createNewWorld(): PartyWorldSave {
  const now = new Date().toISOString();
  const characters = Object.fromEntries(
    PLAYER_SLOT_ORDER.map((slot) => [slot, createBlankCharacter(slot)])
  ) as Record<PlayerSlot, CharacterSave>;
  return {
    version: 1,
    activeSlot: "justin",
    turnIndex: 0,
    campaignNodeId: START_NODE_ID,
    chapterId: START_CHAPTER_ID,
    partyFlags: [],
    alignment: { ...EMPTY_ALIGNMENT },
    encounterEnemyHp: null,
    log: ["The Chronicle begins at Frostford."],
    endingId: null,
    characters,
    updatedAt: now,
    startedAt: now,
  };
}

function loadWorld(): PartyWorldSave | null {
  if (typeof window === "undefined") return null;
  try {
    const raw = localStorage.getItem(SAVE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as PartyWorldSave;
  } catch {
    return null;
  }
}

function writeWorld(world: PartyWorldSave) {
  const next = { ...world, updatedAt: new Date().toISOString() };
  localStorage.setItem(SAVE_KEY, JSON.stringify(next));
  return next;
}

function advanceTurn(world: PartyWorldSave): PartyWorldSave {
  const idx = PLAYER_SLOT_ORDER.indexOf(world.activeSlot);
  const nextSlot = PLAYER_SLOT_ORDER[(idx + 1) % PLAYER_SLOT_ORDER.length]!;
  return { ...world, activeSlot: nextSlot, turnIndex: world.turnIndex + 1 };
}

function pushLog(world: PartyWorldSave, line: string): PartyWorldSave {
  return { ...world, log: [line, ...world.log].slice(0, 40) };
}

function meterPct(value: number, max: number) {
  return max > 0 ? Math.round(Math.min(100, Math.max(0, (value / max) * 100))) : 0;
}

function Meter({
  label,
  value,
  max,
  tone,
}: {
  label: string;
  value: number;
  max: number;
  tone: "hp" | "stamina" | "mana" | "enemy";
}) {
  return (
    <div>
      <div className="flex justify-between text-[0.65rem] font-bold mb-0.5">
        <span>{label}</span>
        <span>
          {value}/{max}
        </span>
      </div>
      <div className="pc-meter" data-tone={tone}>
        <span style={{ width: `${meterPct(value, max)}%` }} />
      </div>
    </div>
  );
}

export function PartyChronicleGame({ identity }: { identity: PlayerIdentity }) {
  const userEmail = identity.email;
  const userName = identity.name;
  const isAdmin = identity.isDm;
  const [phase, setPhase] = useState<UiPhase>("boot");
  const [world, setWorld] = useState<PartyWorldSave | null>(null);
  const [tab, setTab] = useState<MainTab>("story");
  const [flash, setFlash] = useState<string | null>(null);
  const [adminSlot, setAdminSlot] = useState<PlayerSlot>("justin");
  const [createSlot, setCreateSlot] = useState<PlayerSlot>("justin");

  const mappedSlot = slotFromEmail(userEmail);
  const effectiveSlot = mappedSlot ?? (isAdmin ? adminSlot : null);
  const isSpectator = isAdmin && !mappedSlot;

  const canEditSlot = useCallback(
    (slot: PlayerSlot) => {
      if (mappedSlot) return mappedSlot === slot;
      if (isAdmin) return adminSlot === slot;
      return false;
    },
    [mappedSlot, isAdmin, adminSlot]
  );

  const canActOnTurn = useCallback(() => {
    if (!world) return false;
    if (isSpectator) return false;
    if (mappedSlot) return world.activeSlot === mappedSlot;
    if (isAdmin) return world.activeSlot === adminSlot;
    return false;
  }, [world, isSpectator, mappedSlot, isAdmin, adminSlot]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      let existing = loadWorld();
      try {
        const res = await fetch("/api/downtown/party-chronicle");
        if (res.ok) {
          const data = (await res.json()) as { world: PartyWorldSave };
          existing = data.world;
          writeWorld(data.world);
        }
      } catch {
        /* local fallback */
      }
      if (cancelled) return;
      if (existing) {
        setWorld(existing);
        const allCreated = PLAYER_SLOT_ORDER.every((s) => existing!.characters[s].created);
        if (existing.endingId) setPhase("ending");
        else if (allCreated) setPhase("play");
        else setPhase("create");
      } else {
        setPhase("title");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 4000);
    return () => window.clearTimeout(t);
  }, [flash]);

  const persist = useCallback((next: PartyWorldSave) => {
    const saved = writeWorld(next);
    setWorld(saved);
    void fetch("/api/downtown/party-chronicle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ world: saved }),
    }).catch(() => undefined);
    return saved;
  }, []);

  const storyNode = world ? STARTER_STORY[world.campaignNodeId] : null;
  const activeChar = world?.characters[world.activeSlot];

  const allCreated = useMemo(
    () => world != null && PLAYER_SLOT_ORDER.every((s) => world.characters[s].created),
    [world]
  );

  function startNewCampaign() {
    const fresh = createNewWorld();
    persist(fresh);
    setCreateSlot(mappedSlot ?? adminSlot);
    setPhase("create");
  }

  function resetCampaign() {
    localStorage.removeItem(SAVE_KEY);
    setWorld(null);
    setPhase("title");
    void fetch("/api/downtown/party-chronicle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    }).catch(() => undefined);
  }

  function applyStoryOutcome(outcome: {
    text: string;
    xp?: number;
    gold?: number;
    flagsAdd?: string[];
    alignment?: Partial<Record<"animal" | "human" | "demon", number>>;
    nextNodeId?: string;
    endingId?: string;
  }) {
    if (!world || !canActOnTurn()) return;
    let next = { ...world };
    next = mergeAlignmentIntoWorld(next, outcome.alignment);
    if (outcome.flagsAdd) next = { ...next, partyFlags: [...next.partyFlags, ...outcome.flagsAdd] };
    next = pushLog(next, outcome.text);

    const char = next.characters[next.activeSlot];
    let updatedChar = { ...char };
    if (outcome.xp) updatedChar = { ...updatedChar, xp: updatedChar.xp + outcome.xp };
    if (outcome.gold) updatedChar = { ...updatedChar, gold: updatedChar.gold + outcome.gold };
    next = {
      ...next,
      characters: { ...next.characters, [next.activeSlot]: updatedChar },
    };

    if (outcome.endingId) {
      const endingId = outcome.endingId ?? resolveEndingId(next.alignment);
      next = {
        ...next,
        endingId,
        campaignNodeId: endingNodeId(endingId),
        encounterEnemyHp: null,
      };
      persist(next);
      setPhase("ending");
      return;
    }

    if (outcome.nextNodeId) {
      const target = STARTER_STORY[outcome.nextNodeId];
      if (target?.kind === "encounter") {
        next = { ...next, campaignNodeId: outcome.nextNodeId, encounterEnemyHp: target.enemyHp };
      } else {
        next = { ...next, campaignNodeId: outcome.nextNodeId, encounterEnemyHp: null };
      }
    }

    next = advanceTurn(next);
    persist(next);
  }

  function mergeAlignmentIntoWorld(w: PartyWorldSave, delta?: Partial<Record<"animal" | "human" | "demon", number>>) {
    return { ...w, alignment: mergeAlignment(w.alignment, delta) };
  }

  function continueNarrative() {
    if (!world || !storyNode || storyNode.kind !== "narrative" || !canActOnTurn()) return;
    const nextId = storyNode.next;
    const target = STARTER_STORY[nextId];
    let next: PartyWorldSave = {
      ...world,
      campaignNodeId: nextId,
      encounterEnemyHp: target?.kind === "encounter" ? target.enemyHp : null,
    };
    if (storyNode.flagsAdd) {
      next = { ...next, partyFlags: [...next.partyFlags, ...storyNode.flagsAdd] };
    }
    next = pushLog(next, `→ ${storyNode.title}`);
    next = advanceTurn(next);
    persist(next);
  }

  function useHotbar(slotIndex: number) {
    if (!world || !activeChar || !canActOnTurn()) return;
    const abilityId = activeChar.hotbar[slotIndex];
    if (!abilityId) return;
    const ability = getAbility(abilityId);
    if (!ability) return;

    const staminaCost = ability.cost?.stamina ?? 0;
    const manaCost = ability.cost?.mana ?? 0;
    if (activeChar.stamina < staminaCost || activeChar.mana < manaCost) {
      setFlash("Not enough stamina or mana!");
      return;
    }

    let nextChar: CharacterSave = {
      ...activeChar,
      stamina: Math.max(0, activeChar.stamina - staminaCost),
      mana: Math.max(0, activeChar.mana - manaCost),
    };

    let next = { ...world, characters: { ...world.characters, [world.activeSlot]: nextChar } };
    let logLine = `${activeChar.name} uses ${ability.name}!`;

    if (ability.kind === "heal") {
      const heal = ability.power;
      nextChar = {
        ...nextChar,
        hp: Math.min(nextChar.maxHp, nextChar.hp + heal),
      };
      logLine += ` Restored ${heal} HP.`;
    } else if (ability.power > 0 && next.encounterEnemyHp != null) {
      const dmg = ability.power;
      const newHp = Math.max(0, next.encounterEnemyHp - dmg);
      next = { ...next, encounterEnemyHp: newHp };
      logLine += ` ${dmg} damage!`;
      if (newHp <= 0 && storyNode?.kind === "encounter") {
        logLine += " Enemy defeated!";
        const winChoice = storyNode.choices[0];
        if (winChoice?.outcome) {
          next = pushLog(next, logLine);
          persist(next);
          applyStoryOutcome(winChoice.outcome);
          return;
        }
      }
    }

    next = {
      ...next,
      characters: { ...next.characters, [world.activeSlot]: nextChar },
    };
    next = pushLog(next, logLine);
    next = advanceTurn(next);
    persist(next);
  }

  function equipItem(itemId: string) {
    if (!world || !effectiveSlot || !canEditSlot(effectiveSlot)) return;
    const char = world.characters[effectiveSlot];
    const item = getGear(itemId);
    if (!item || item.slot === "consumable" || item.slot === "misc") return;
    if (!char.inventory.includes(itemId)) return;

    const slot = item.slot as EquipSlot;
    const nextEquipped = { ...char.equipped, [slot]: itemId };
    persist({
      ...world,
      characters: {
        ...world.characters,
        [effectiveSlot]: { ...char, equipped: nextEquipped },
      },
    });
    setFlash(`Equipped ${item.name}.`);
  }

  function unequipSlot(slot: EquipSlot) {
    if (!world || !effectiveSlot || !canEditSlot(effectiveSlot)) return;
    const char = world.characters[effectiveSlot];
    persist({
      ...world,
      characters: {
        ...world.characters,
        [effectiveSlot]: { ...char, equipped: { ...char.equipped, [slot]: null } },
      },
    });
  }

  if (phase === "boot") {
    return (
      <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
        <DowntownSubnav active="party" />
        <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
          Loading Chronicle…
        </p>
      </div>
    );
  }

  if (phase === "title") {
    return (
      <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
        <DowntownSubnav active="party" />
        <div className="pc-panel-jagged p-8 text-center space-y-4 max-w-lg mx-auto">
          <p className="pc-eyebrow">Haven PM · Downtown</p>
          <h1 className="pc-title text-4xl md:text-5xl">Party Chronicle</h1>
          <p className="text-sm leading-relaxed">
            A 90s comic-book RPG for three heroes — Justin, Rusty, and Elisha — and their hounds. Turn order
            rotates. Destiny tracks Animal, Human, or Demon.
          </p>
          {mappedSlot && (
            <p className="text-xs font-bold" style={{ color: "var(--pc-magenta)" }}>
              Playing as {SLOT_DEFAULTS[mappedSlot].displayName}
            </p>
          )}
          {isSpectator && (
            <p className="text-xs font-bold" style={{ color: "var(--pc-cyan)" }}>
              Admin spectator — pick a slot to play, or watch the party.
            </p>
          )}
          <button type="button" className="pc-chip text-base px-6 py-2" onClick={startNewCampaign}>
            New Campaign
          </button>
        </div>
      </div>
    );
  }

  if (phase === "create" && world) {
    return (
      <CreatePhase
        world={world}
        createSlot={createSlot}
        setCreateSlot={setCreateSlot}
        canEditSlot={canEditSlot}
        isAdmin={isAdmin}
        adminSlot={adminSlot}
        setAdminSlot={setAdminSlot}
        mappedSlot={mappedSlot}
        onSave={(slot, char) => {
          const next = {
            ...world,
            characters: { ...world.characters, [slot]: char },
          };
          const saved = persist(next);
          const done = PLAYER_SLOT_ORDER.every((s) => saved.characters[s].created);
          if (done) setPhase("play");
          else {
            const nextSlot = PLAYER_SLOT_ORDER.find((s) => !saved.characters[s].created);
            if (nextSlot) setCreateSlot(nextSlot);
          }
        }}
        onBack={resetCampaign}
      />
    );
  }

  if (phase === "ending" && world?.endingId) {
    const ending = ENDING_BY_ID[world.endingId];
    return (
      <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
        <DowntownSubnav active="party" />
        <div className="pc-ending space-y-4">
          <p className="pc-eyebrow" style={{ color: "var(--pc-cyan)" }}>
            Chronicle Complete
          </p>
          <h1 className="pc-title">{ending?.title ?? "Finale"}</h1>
          <p className="text-sm max-w-md mx-auto">{ending?.blurb ?? world.endingId}</p>
          <div className="pc-comic-frame max-w-md mx-auto">
            <img
              src={comicArtSrc(ending?.splashArtId ?? "splash-ending-human")}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
          <div className="flex flex-wrap gap-3 justify-center pt-4">
            <span className="pc-chip" data-active="true">
              Animal {world.alignment.animal}
            </span>
            <span className="pc-chip" data-active="true">
              Human {world.alignment.human}
            </span>
            <span className="pc-chip" data-active="true">
              Demon {world.alignment.demon}
            </span>
          </div>
          <button type="button" className="pc-chip mt-4" onClick={resetCampaign}>
            Return to Title
          </button>
        </div>
      </div>
    );
  }

  if (!world || !storyNode) {
    return (
      <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
        <DowntownSubnav active="party" />
        <p className="text-sm">Story node missing.</p>
      </div>
    );
  }

  const inEncounter = storyNode.kind === "encounter" && world.encounterEnemyHp != null && world.encounterEnemyHp > 0;
  const acting = canActOnTurn();

  return (
    <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
      <DowntownSubnav active="party" />
      {flash && (
        <div className="pc-turn-banner" role="status">
          {flash}
        </div>
      )}

      <div className="pc-header-bar px-4 py-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="pc-eyebrow text-[0.65rem]" style={{ color: "var(--pc-ink)" }}>
            Party Chronicle
          </p>
          <h1 className="pc-title text-2xl md:text-3xl">
            {storyNode.title}
          </h1>
          <p className="text-xs font-bold">
            Turn {world.turnIndex + 1} · {userName ?? userEmail}
            {isSpectator ? " (spectating)" : ""}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {isAdmin && !mappedSlot && (
            <select
              className="text-xs border-2 border-black px-2 py-1 bg-white"
              value={adminSlot}
              onChange={(e) => setAdminSlot(e.target.value as PlayerSlot)}
            >
              {PLAYER_SLOT_ORDER.map((s) => (
                <option key={s} value={s}>
                  Play as {SLOT_DEFAULTS[s].displayName}
                </option>
              ))}
            </select>
          )}
          <button type="button" className="pc-chip" onClick={resetCampaign}>
            Reset
          </button>
        </div>
      </div>

      <div className="pc-turn-banner">
        {acting
          ? `${SLOT_DEFAULTS[world.activeSlot].displayName}'s turn — your move!`
          : `${SLOT_DEFAULTS[world.activeSlot].displayName}'s turn — watch the panel`}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
        {/* Party strip */}
        <aside className="pc-panel p-4 space-y-3 order-2 xl:order-1">
          <p className="pc-eyebrow">Party</p>
          {PLAYER_SLOT_ORDER.map((slot) => {
            const c = world.characters[slot];
            const isActive = world.activeSlot === slot;
            return (
              <div
                key={slot}
                className="flex gap-2 items-start border-b-2 border-dashed border-[var(--pc-kraft-dark)] pb-2"
              >
                <div className="pc-portrait" data-active={isActive}>
                  {c.name.slice(0, 2).toUpperCase()}
                </div>
                <div className="min-w-0 flex-1">
                  <p className="font-bold text-sm">
                    {c.name}
                    {isActive && " ★"}
                  </p>
                  <p className="text-[0.65rem]">{CLASS_DEFS[c.classId].name} · Lv {c.level}</p>
                  <Meter label="HP" value={c.hp} max={c.maxHp} tone="hp" />
                  <p className="text-[0.6rem] mt-1">
                    🐕 {c.dog.name} (bond {c.dog.bond})
                  </p>
                </div>
              </div>
            );
          })}
          <div className="pt-2">
            <p className="pc-eyebrow text-[0.65rem]">Destiny</p>
            <div className="flex gap-1 text-[0.65rem] font-bold">
              <span>A {world.alignment.animal}</span>
              <span>H {world.alignment.human}</span>
              <span>D {world.alignment.demon}</span>
            </div>
          </div>
        </aside>

        {/* Main stage */}
        <section className="pc-panel p-4 space-y-4 order-1 xl:order-2 min-h-[20rem]">
          <div className="flex flex-wrap gap-2 border-b-2 border-[var(--pc-border)] pb-2">
            {(
              [
                ["story", "Comic"],
                ["skills", "Skills"],
                ["inventory", "Gear"],
                ["codex", "Codex"],
                ["party", "Sheets"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                className="pc-chip"
                data-active={tab === id}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
          </div>

          {tab === "story" && (
            <div className="space-y-4">
              <div className="pc-comic-frame relative">
                <div className="pc-speed-lines" />
                <img
                  src={comicArtSrc(storyNode.sceneId ?? storyNode.artId ?? "scene-frostford-gate")}
                  alt=""
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/party-chronicle/chapter-splash.svg";
                  }}
                />
                {inEncounter && <div className="pc-action-burst" />}
              </div>

              {storyNode.kind === "conversation" && storyNode.balloon ? (
                <div className="pc-balloon" data-thought={storyNode.speaker.includes("thought")}>
                  <p className="pc-balloon-speaker">{storyNode.speaker}</p>
                  {storyNode.body}
                  {storyNode.npcId && (
                    <p className="text-[0.65rem] mt-2 opacity-70">
                      {getAnimalNpc(storyNode.npcId)?.title ?? ""}
                    </p>
                  )}
                </div>
              ) : (
                <div className="pc-panel p-3 bg-white/80">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap">{storyNode.body}</p>
                </div>
              )}

              {inEncounter && (
                <div className="space-y-2">
                  <p className="pc-eyebrow">Combat — {storyNode.enemy}</p>
                  <Meter label="Enemy HP" value={world.encounterEnemyHp ?? 0} max={storyNode.enemyHp} tone="enemy" />
                  {activeChar && (
                    <div className="space-y-1">
                      <p className="text-[0.65rem] font-bold">{activeChar.name}&apos;s resources</p>
                      <Meter label="Stamina" value={activeChar.stamina} max={activeChar.maxStamina} tone="stamina" />
                      <Meter label="Mana" value={activeChar.mana} max={activeChar.maxMana} tone="mana" />
                    </div>
                  )}
                  <div className="pc-hotbar">
                    {activeChar?.hotbar.map((abilityId, i) => {
                      const ability = abilityId ? getAbility(abilityId) : null;
                      const ready = Boolean(
                        ability &&
                          activeChar.stamina >= (ability.cost?.stamina ?? 0) &&
                          activeChar.mana >= (ability.cost?.mana ?? 0)
                      );
                      return (
                        <button
                          key={i}
                          type="button"
                          className="pc-hotbar-slot"
                          data-ready={ready}
                          disabled={!acting || !abilityId || !ready}
                          onClick={() => useHotbar(i)}
                          title={ability?.blurb}
                        >
                          <span className="pc-slot-num">{i + 1}</span>
                          {ability?.name ?? "—"}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {storyNode.kind === "narrative" && (
                <button type="button" className="pc-chip" disabled={!acting} onClick={continueNarrative}>
                  Continue →
                </button>
              )}

              {(storyNode.kind === "conversation" || storyNode.kind === "path") &&
                storyNode.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className="pc-chip block w-full text-left mb-2"
                    disabled={!acting}
                    onClick={() => {
                      const out = choice.outcome ?? choice.success;
                      if (out) applyStoryOutcome(out);
                    }}
                  >
                    {choice.label}
                  </button>
                ))}

              {storyNode.kind === "encounter" && !inEncounter && storyNode.choices[0]?.outcome && (
                <button
                  type="button"
                  className="pc-chip"
                  disabled={!acting}
                  onClick={() => applyStoryOutcome(storyNode.choices[0]!.outcome!)}
                >
                  Loot the camp →
                </button>
              )}
            </div>
          )}

          {tab === "inventory" && effectiveSlot && (
            <InventoryPanel
              char={world.characters[effectiveSlot]}
              canEdit={canEditSlot(effectiveSlot)}
              onEquip={equipItem}
              onUnequip={unequipSlot}
            />
          )}

          {tab === "codex" && (
            <div className="space-y-2">
              <p className="pc-eyebrow">50-Hour Campaign Codex</p>
              <p className="text-xs mb-3">
                Total: {CODEX_ACTS.reduce((s, a) => s + a.hours, 0)} hours across {CODEX_ACTS.length} acts.
              </p>
              {CODEX_ACTS.map((act) => (
                <div key={act.act} className="pc-codex-row">
                  <strong>
                    Act {act.act}: {act.title}
                  </strong>
                  <span>{act.hours}h</span>
                </div>
              ))}
              <p className="text-[0.65rem] pt-2 opacity-70">
                Current chapter: {world.chapterId}
              </p>
            </div>
          )}

          {tab === "party" && (
            <div className="space-y-4">
              {PLAYER_SLOT_ORDER.map((slot) => (
                <CharacterSheet key={slot} char={world.characters[slot]} highlight={world.activeSlot === slot} />
              ))}
            </div>
          )}

          <div className="pc-log">
            {world.log.map((line, i) => (
              <p key={i} style={{ opacity: i === 0 ? 1 : 0.65 }}>
                {line}
              </p>
            ))}
          </div>
        </section>

        {/* Hotbar sidebar (always visible in combat) */}
        <aside className="pc-panel p-4 space-y-3 order-3">
          <p className="pc-eyebrow">Active Hero</p>
          {activeChar && (
            <>
              <p className="font-bold">{activeChar.name}</p>
              <p className="text-xs">{CLASS_DEFS[activeChar.classId].name}</p>
              <Meter label="HP" value={activeChar.hp} max={activeChar.maxHp} tone="hp" />
              <Meter label="Stamina" value={activeChar.stamina} max={activeChar.maxStamina} tone="stamina" />
              <Meter label="Mana" value={activeChar.mana} max={activeChar.maxMana} tone="mana" />
              <p className="pc-eyebrow text-[0.65rem] pt-2">Hotbar</p>
              <div className="pc-hotbar">
                {activeChar.hotbar.map((abilityId, i) => {
                  const ability = abilityId ? getAbility(abilityId) : null;
                  return (
                    <button
                      key={i}
                      type="button"
                      className="pc-hotbar-slot"
                      disabled={!inEncounter || !acting || !abilityId}
                      onClick={() => useHotbar(i)}
                      title={ability?.blurb}
                    >
                      <span className="pc-slot-num">{i + 1}</span>
                      {ability?.name ?? "—"}
                    </button>
                  );
                })}
              </div>
              <p className="text-[0.65rem]">
                🐕 {activeChar.dog.name} · {activeChar.dog.breed}
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function CharacterSheet({ char, highlight }: { char: CharacterSave; highlight: boolean }) {
  return (
    <div className={`pc-panel p-3 bg-white/60 ${highlight ? "ring-2 ring-[var(--pc-cyan)]" : ""}`}>
      <p className="font-bold">
        {char.name} · {CLASS_DEFS[char.classId].name}
      </p>
      <div className="pc-stat-grid mt-2">
        {STAT_KEYS.map((k) => (
          <div key={k} className="pc-stat-box">
            <strong>{STAT_LABELS[k]}</strong>
            {char.stats[k]}
          </div>
        ))}
      </div>
      <p className="text-[0.65rem] mt-2">
        Gold {char.gold} · Dog: {char.dog.name}
      </p>
    </div>
  );
}

function InventoryPanel({
  char,
  canEdit,
  onEquip,
  onUnequip,
}: {
  char: CharacterSave;
  canEdit: boolean;
  onEquip: (id: string) => void;
  onUnequip: (slot: EquipSlot) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="pc-eyebrow">Equipment — {char.name}</p>
      {!canEdit && <p className="text-xs">View only (not your character).</p>}
      <div className="grid grid-cols-2 gap-2 text-xs">
        {EQUIP_SLOTS.map((slot) => {
          const eqId = char.equipped[slot];
          const item = eqId ? getGear(eqId) : null;
          return (
            <div key={slot} className="pc-stat-box text-left">
              <strong>{slot}</strong>
              {item ? item.name : "—"}
              {canEdit && item && (
                <button type="button" className="block text-[0.6rem] underline mt-1" onClick={() => onUnequip(slot)}>
                  Unequip
                </button>
              )}
            </div>
          );
        })}
      </div>
      <p className="pc-eyebrow text-[0.65rem]">Inventory</p>
      <div className="flex flex-wrap gap-2">
        {char.inventory.map((id) => {
          const item = getGear(id);
          if (!item) return null;
          const isEquipped = Object.values(char.equipped).includes(id);
          return (
            <button
              key={id}
              type="button"
              className="pc-inv-slot"
              data-equipped={isEquipped}
              disabled={!canEdit || item.slot === "consumable" || item.slot === "misc"}
              onClick={() => onEquip(id)}
              title={item.blurb}
            >
              {item.name.slice(0, 8)}
            </button>
          );
        })}
      </div>
      <p className="text-[0.65rem] opacity-70">{GEAR_CATALOG.length} items in catalog.</p>
    </div>
  );
}

function CreatePhase({
  world,
  createSlot,
  setCreateSlot,
  canEditSlot,
  isAdmin,
  adminSlot,
  setAdminSlot,
  mappedSlot,
  onSave,
  onBack,
}: {
  world: PartyWorldSave;
  createSlot: PlayerSlot;
  setCreateSlot: (s: PlayerSlot) => void;
  canEditSlot: (s: PlayerSlot) => boolean;
  isAdmin: boolean;
  adminSlot: PlayerSlot;
  setAdminSlot: (s: PlayerSlot) => void;
  mappedSlot: PlayerSlot | null;
  onSave: (slot: PlayerSlot, char: CharacterSave) => void;
  onBack: () => void;
}) {
  const base = world.characters[createSlot];
  const [name, setName] = useState(base.name);
  const [classId, setClassId] = useState<ClassId>(base.classId);
  const [stats, setStats] = useState({ ...base.stats });
  const [dogName, setDogName] = useState(base.dog.name);

  const cls = CLASS_DEFS[classId];
  const baseTotal = STAT_KEYS.reduce((s, k) => s + cls.baseStats[k], 0);
  const currentTotal = STAT_KEYS.reduce((s, k) => s + stats[k], 0);
  const pointsUsed = currentTotal - baseTotal;
  const pointsLeft = STAT_POINT_BUY_POOL - pointsUsed;

  const editable = canEditSlot(createSlot);

  function bumpStat(key: StatKey, delta: number) {
    if (!editable) return;
    const next = stats[key] + delta;
    if (next < 6 || next > 18) return;
    const newTotal = currentTotal + delta;
    if (newTotal - baseTotal > STAT_POINT_BUY_POOL) return;
    setStats({ ...stats, [key]: next });
  }

  function submit() {
    if (!editable) return;
    const char = finalizeCharacter(base, classId, name, stats);
    char.dog = { ...char.dog, name: dogName.trim() || char.dog.name };
    onSave(createSlot, char);
  }

  return (
    <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
      <DowntownSubnav active="party" />
      <div className="pc-header-bar px-4 py-3">
        <h1 className="pc-title text-2xl">Character Creation</h1>
        <p className="text-xs font-bold">Forge your hero before the Chronicle opens.</p>
      </div>

      <div className="flex flex-wrap gap-2">
        {PLAYER_SLOT_ORDER.map((slot) => {
          const c = world.characters[slot];
          return (
            <button
              key={slot}
              type="button"
              className="pc-chip"
              data-active={createSlot === slot}
              data-turn={world.activeSlot === slot}
              onClick={() => {
                setCreateSlot(slot);
                const ch = world.characters[slot];
                setName(ch.name);
                setClassId(ch.classId);
                setStats({ ...ch.stats });
                setDogName(ch.dog.name);
              }}
            >
              {SLOT_DEFAULTS[slot].displayName}
              {c.created ? " ✓" : ""}
            </button>
          );
        })}
        {isAdmin && !mappedSlot && (
          <select
            className="text-xs border-2 border-black px-2 py-1 ml-auto"
            value={adminSlot}
            onChange={(e) => setAdminSlot(e.target.value as PlayerSlot)}
          >
            {PLAYER_SLOT_ORDER.map((s) => (
              <option key={s} value={s}>
                Edit as {SLOT_DEFAULTS[s].displayName}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        <div className="pc-panel p-4 pc-create-form">
          {!editable && (
            <p className="text-sm font-bold mb-3" style={{ color: "var(--pc-magenta)" }}>
              View only — {SLOT_DEFAULTS[createSlot].displayName} is another player&apos;s sheet.
            </p>
          )}
          <label htmlFor="pc-name">Hero name</label>
          <input
            id="pc-name"
            value={name}
            disabled={!editable}
            onChange={(e) => setName(e.target.value)}
          />
          <label htmlFor="pc-class">Class</label>
          <select
            id="pc-class"
            value={classId}
            disabled={!editable}
            onChange={(e) => {
              const id = e.target.value as ClassId;
              setClassId(id);
              setStats({ ...CLASS_DEFS[id].baseStats });
            }}
          >
            {CLASS_IDS.map((id) => (
              <option key={id} value={id}>
                {CLASS_DEFS[id].name}
              </option>
            ))}
          </select>
          <p className="text-xs mb-3">{CLASS_DEFS[classId].blurb}</p>
          <label htmlFor="pc-dog">Hound companion</label>
          <input
            id="pc-dog"
            value={dogName}
            disabled={!editable}
            onChange={(e) => setDogName(e.target.value)}
          />
          <p className="text-[0.65rem] opacity-70">{SLOT_DEFAULTS[createSlot].dogBreed}</p>
        </div>

        <div className="pc-panel p-4">
          <p className="pc-eyebrow">Stats — {pointsLeft} points left</p>
          <div className="space-y-2">
            {STAT_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-10 font-bold text-sm">{STAT_LABELS[key]}</span>
                <button type="button" className="pc-chip px-2 py-0" disabled={!editable} onClick={() => bumpStat(key, -1)}>
                  −
                </button>
                <span className="w-6 text-center font-bold">{stats[key]}</span>
                <button type="button" className="pc-chip px-2 py-0" disabled={!editable} onClick={() => bumpStat(key, 1)}>
                  +
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" className="pc-chip" disabled={!editable || pointsLeft !== 0} onClick={submit}>
              Seal Character
            </button>
            <button type="button" className="pc-chip" onClick={onBack}>
              Abort
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
