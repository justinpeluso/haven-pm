"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { DowntownSubnav } from "@/components/downtown/downtown-subnav";
import { ENDING_BY_ID } from "@/lib/downtown/party-chronicle/alignment";
import { getAnimalNpc } from "@/lib/downtown/party-chronicle/animals";
import { comicArtSrc } from "@/lib/downtown/party-chronicle/art";
import { hoursSummary } from "@/lib/downtown/party-chronicle/campaign";
import {
  acknowledgeNarrative,
  applyStoryChoice,
  canAct,
  chapterForNode,
  equipItem as engineEquip,
  partyAvgLevel,
  setHotbarSlot,
  spendSkillPoint,
  useHotbarAbility,
} from "@/lib/downtown/party-chronicle/engine";
import { getGear } from "@/lib/downtown/party-chronicle/gear";
import { describeHotbar, listAssignableAbilities } from "@/lib/downtown/party-chronicle/hotbar";
import {
  CLASS_DEFS,
  SLOT_DEFAULTS,
  STAT_POINT_BUY_POOL,
} from "@/lib/downtown/party-chronicle/players";
import {
  applyPointBuy,
  clearWorld,
  completeCharacterCreation,
  createBlankCharacter,
  createNewWorld,
  loadWorld,
  writeWorld,
} from "@/lib/downtown/party-chronicle/persist";
import { canUnlockNode, getAbility, SKILL_TREES } from "@/lib/downtown/party-chronicle/skills";
import {
  getEnding,
  getStoryNode,
  progressionHint,
} from "@/lib/downtown/party-chronicle/story";
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
  type StoryChoice,
} from "@/lib/downtown/party-chronicle/types";
import "@/components/party-chronicle/party-chronicle.css";

type UiPhase = "boot" | "title" | "create" | "play" | "ending";
type MainTab = "story" | "skills" | "gear" | "codex" | "party";

const STAT_LABELS: Record<StatKey, string> = {
  strength: "STR",
  dexterity: "DEX",
  constitution: "CON",
  intelligence: "INT",
  wisdom: "WIS",
  charisma: "CHA",
};

const CODEX = hoursSummary();

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
  tone: "hp" | "stamina" | "mana" | "enemy" | "xp";
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

function sceneSrc(node: { sceneId?: string; artId?: string; splashArtId?: string } | null) {
  const id = node?.sceneId ?? node?.artId ?? node?.splashArtId ?? "scene-frostford-gate";
  return comicArtSrc(id);
}

export function PartyChronicleGame({ identity }: { identity: PlayerIdentity }) {
  const [phase, setPhase] = useState<UiPhase>("boot");
  const [world, setWorld] = useState<PartyWorldSave | null>(null);
  const [tab, setTab] = useState<MainTab>("story");
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const [assignIdx, setAssignIdx] = useState<number | null>(null);

  const mySlot = identity.slot;
  const acting = !!(world && mySlot && canAct(world, mySlot, identity.isDm));

  useEffect(() => {
    const existing = loadWorld();
    if (existing) {
      setWorld(existing);
      if (existing.endingId) setPhase("ending");
      else if (mySlot && !existing.characters[mySlot].created) setPhase("create");
      else if (PLAYER_SLOT_ORDER.every((s) => existing.characters[s].created)) setPhase("play");
      else setPhase(mySlot ? "create" : "play");
    } else {
      setPhase("title");
    }
  }, [mySlot]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 4200);
    return () => window.clearTimeout(t);
  }, [flash]);

  const persist = useCallback((next: PartyWorldSave) => {
    writeWorld(next);
    setWorld(next);
    if (next.endingId) setPhase("ending");
  }, []);

  const storyNode = world ? getStoryNode(world.campaignNodeId) : null;
  const chapter = world ? chapterForNode(world.campaignNodeId) : null;
  const me = world && mySlot ? world.characters[mySlot] : null;
  const activeChar = world ? world.characters[world.activeSlot] : null;
  const hotbarView = activeChar ? describeHotbar(activeChar) : [];

  const startCampaign = () => {
    const fresh = createNewWorld();
    persist(fresh);
    setPhase(mySlot ? "create" : "play");
  };

  const resetCampaign = () => {
    clearWorld();
    setWorld(null);
    setPhase("title");
  };

  const onChoice = (choice: StoryChoice) => {
    if (!world || !mySlot || !acting) return;
    startTransition(() => {
      const result = applyStoryChoice(world, mySlot, choice);
      persist(result.world);
      const msg = result.roll
        ? `d20 ${result.roll.d20} → ${result.roll.total} (${result.roll.success ? "hit" : "miss"}). ${result.message}`
        : result.message;
      setFlash(msg);
    });
  };

  const onContinue = () => {
    if (!world || !mySlot || !acting || !storyNode) return;
    if (storyNode.kind !== "narrative" && storyNode.kind !== "montage") return;
    startTransition(() => {
      persist(acknowledgeNarrative(world, mySlot));
    });
  };

  const onHotbar = (slotIndex: number) => {
    if (!world || !mySlot || !acting) return;
    const abilityId = world.characters[mySlot].hotbar[slotIndex];
    if (!abilityId) return;
    startTransition(() => {
      const result = useHotbarAbility(world, mySlot, abilityId);
      persist(result.world);
      setFlash(result.message);
    });
  };

  const onUnlock = (nodeId: string) => {
    if (!world || !mySlot) return;
    const result = spendSkillPoint(world, mySlot, nodeId);
    if ("error" in result && result.error) {
      setFlash(result.error);
      return;
    }
    persist(result.world);
    setFlash("Skill unlocked.");
  };

  const onAssignHotbar = (abilityId: string | null) => {
    if (!world || !mySlot || assignIdx == null) return;
    const char = setHotbarSlot(world.characters[mySlot], assignIdx, abilityId);
    persist({ ...world, characters: { ...world.characters, [mySlot]: char } });
    setAssignIdx(null);
  };

  const onEquip = (itemId: string) => {
    if (!world || !mySlot) return;
    const result = engineEquip(world.characters[mySlot], itemId);
    if ("error" in result) {
      setFlash(result.error);
      return;
    }
    persist({ ...world, characters: { ...world.characters, [mySlot]: result } });
  };

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
            Three heroes, three hounds, Justin → Rusty → Elisha. Choices steer Animal, Human, or Demon.
          </p>
          {mySlot && (
            <p className="text-xs font-bold" style={{ color: "var(--pc-magenta)" }}>
              Playing as {SLOT_DEFAULTS[mySlot].displayName}
            </p>
          )}
          {!mySlot && (
            <p className="text-xs">
              Log in as player1@ / player2@ / player3@havenpm.com (password67) to claim a seat.
            </p>
          )}
          <button type="button" className="pc-primary-btn" onClick={startCampaign}>
            New Campaign
          </button>
        </div>
      </div>
    );
  }

  if (phase === "create" && world && mySlot) {
    return (
      <CreatePhase
        slot={mySlot}
        base={world.characters[mySlot]}
        onSave={(char) => {
          const next = {
            ...world,
            characters: { ...world.characters, [mySlot]: char },
            log: [`${char.name} joins with ${char.dog.name}.`, ...world.log].slice(0, 80),
          };
          persist(next);
          const ready = PLAYER_SLOT_ORDER.every((s) => next.characters[s].created);
          setPhase(ready || char.created ? "play" : "create");
          setFlash(ready ? "Party sealed — the Chronicle opens." : "Character sealed. Waiting on the others.");
        }}
        onBack={resetCampaign}
      />
    );
  }

  if (phase === "ending" && world?.endingId) {
    const ending = getEnding(world.endingId) ?? ENDING_BY_ID[world.endingId];
    const endNode = getStoryNode(world.campaignNodeId);
    return (
      <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
        <DowntownSubnav active="party" />
        <div className="pc-ending space-y-4">
          <p className="pc-eyebrow" style={{ color: "var(--pc-cyan)" }}>
            Chronicle Complete
          </p>
          <h1 className="pc-title">{ending?.title ?? endNode?.title ?? "Finale"}</h1>
          <p className="text-sm max-w-md mx-auto whitespace-pre-wrap">
            {endNode && "body" in endNode ? endNode.body : ending?.blurb}
          </p>
          <div className="pc-comic-frame max-w-md mx-auto">
            <img
              src={sceneSrc({
                splashArtId: ending?.splashArtId,
                sceneId: ending?.sceneId,
                artId: ending?.artId,
              })}
              alt=""
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
        <p className="text-sm">Story node missing — reset the campaign.</p>
        <button type="button" className="pc-chip" onClick={resetCampaign}>
          Reset
        </button>
      </div>
    );
  }

  const inEncounter =
    storyNode.kind === "encounter" && world.encounterEnemyHp != null && world.encounterEnemyHp > 0;
  const hasChoices =
    storyNode.kind === "conversation" || storyNode.kind === "path" || storyNode.kind === "encounter";

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
            {chapter ? `Ch ${chapter.chapter} · ${chapter.title}` : "Party Chronicle"}
          </p>
          <h1 className="pc-title text-2xl md:text-3xl">{storyNode.title}</h1>
          <p className="text-xs font-bold">
            Turn {world.turnIndex} · Party ~L{partyAvgLevel(world)} · {progressionHint(partyAvgLevel(world))}
          </p>
        </div>
        <button type="button" className="pc-chip" onClick={resetCampaign}>
          Reset
        </button>
      </div>

      <div className="pc-turn-banner">
        {acting
          ? `${SLOT_DEFAULTS[world.activeSlot].displayName}'s turn — your move!`
          : `${SLOT_DEFAULTS[world.activeSlot].displayName}'s turn — watch the panel`}
        {pending ? " …" : ""}
      </div>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)_minmax(0,1fr)]">
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
                    {isActive ? " ★" : ""}
                  </p>
                  <p className="text-[0.65rem]">
                    {CLASS_DEFS[c.classId].name} · Lv {c.level}
                  </p>
                  <Meter label="HP" value={c.hp} max={c.maxHp} tone="hp" />
                  <p className="text-[0.6rem] mt-1">
                    {c.dog.name} (bond {c.dog.bond})
                  </p>
                </div>
              </div>
            );
          })}
          <div className="pt-2">
            <p className="pc-eyebrow text-[0.65rem]">Destiny</p>
            <div className="flex gap-2 text-[0.65rem] font-bold">
              <span>A {world.alignment.animal}</span>
              <span>H {world.alignment.human}</span>
              <span>D {world.alignment.demon}</span>
            </div>
          </div>
        </aside>

        <section className="pc-panel p-4 space-y-4 order-1 xl:order-2 min-h-[20rem]">
          <div className="flex flex-wrap gap-2 border-b-2 border-[var(--pc-border)] pb-2">
            {(
              [
                ["story", "Comic"],
                ["skills", "Skills"],
                ["gear", "Gear"],
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
                  src={sceneSrc(storyNode)}
                  alt=""
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/party-chronicle/chapter-splash.svg";
                  }}
                />
                {inEncounter && <div className="pc-action-burst" />}
              </div>

              {storyNode.kind === "conversation" && storyNode.balloon ? (
                <div
                  className="pc-balloon"
                  data-thought={storyNode.speaker.toLowerCase().includes("thought")}
                >
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

              {inEncounter && storyNode.kind === "encounter" && (
                <div className="space-y-2">
                  <p className="pc-eyebrow">Combat — {storyNode.enemy}</p>
                  <Meter
                    label="Enemy HP"
                    value={world.encounterEnemyHp ?? 0}
                    max={storyNode.enemyHp}
                    tone="enemy"
                  />
                </div>
              )}

              {(storyNode.kind === "narrative" || storyNode.kind === "montage") && (
                <button type="button" className="pc-choice" disabled={!acting} onClick={onContinue}>
                  {storyNode.kind === "montage"
                    ? `Train onward (+${storyNode.xpGrant} XP) →`
                    : "Continue →"}
                </button>
              )}

              {hasChoices &&
                "choices" in storyNode &&
                storyNode.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className="pc-choice block w-full text-left mb-2"
                    disabled={!acting}
                    onClick={() => onChoice(choice)}
                  >
                    <strong>{choice.label}</strong>
                    <span className="block text-[0.65rem] opacity-70">{choice.approach}</span>
                  </button>
                ))}
            </div>
          )}

          {tab === "skills" && me && (
            <SkillsPanel
              char={me}
              canEdit={!!mySlot && me.slot === mySlot}
              assignIdx={assignIdx}
              onAssignIdx={setAssignIdx}
              onUnlock={onUnlock}
              onAssignHotbar={onAssignHotbar}
            />
          )}

          {tab === "gear" && me && (
            <InventoryPanel char={me} canEdit={!!mySlot} onEquip={onEquip} />
          )}

          {tab === "codex" && (
            <div className="space-y-2">
              <p className="pc-eyebrow">Campaign Codex (~{CODEX.totalHours}h)</p>
              {CODEX.acts.map((act) => (
                <div key={act.id} className="pc-codex-row">
                  <strong>
                    {act.title} (L{act.levelMin}–{act.levelMax})
                  </strong>
                  <span>{act.estimatedHours}h</span>
                </div>
              ))}
              <p className="text-[0.65rem] pt-2 opacity-70">{CODEX.note}</p>
            </div>
          )}

          {tab === "party" && (
            <div className="space-y-4">
              {PLAYER_SLOT_ORDER.map((slot) => (
                <CharacterSheet
                  key={slot}
                  char={world.characters[slot]}
                  highlight={world.activeSlot === slot}
                />
              ))}
            </div>
          )}

          <div className="pc-log">
            {world.log.map((line, i) => (
              <p key={`${i}-${line.slice(0, 12)}`} style={{ opacity: i === 0 ? 1 : 0.65 }}>
                {line}
              </p>
            ))}
          </div>
        </section>

        <aside className="pc-panel p-4 space-y-3 order-3">
          <p className="pc-eyebrow">Active Hero</p>
          {activeChar && (
            <>
              <p className="font-bold">{activeChar.name}</p>
              <p className="text-xs">{CLASS_DEFS[activeChar.classId].name}</p>
              <Meter label="HP" value={activeChar.hp} max={activeChar.maxHp} tone="hp" />
              <Meter
                label="Stamina"
                value={activeChar.stamina}
                max={activeChar.maxStamina}
                tone="stamina"
              />
              <Meter label="Mana" value={activeChar.mana} max={activeChar.maxMana} tone="mana" />
              <p className="pc-eyebrow text-[0.65rem] pt-2">Hotbar ({HOTBAR_SIZE})</p>
              <div className="pc-hotbar">
                {hotbarView.map((slot) => (
                  <button
                    key={slot.index}
                    type="button"
                    className="pc-hotbar-slot"
                    data-ready={slot.ready}
                    disabled={!acting || !slot.abilityId || !slot.ready}
                    onClick={() => mySlot === world.activeSlot && onHotbar(slot.index)}
                    title={slot.name ?? "Empty"}
                  >
                    <span className="pc-slot-num">{slot.index + 1}</span>
                    {slot.name ?? "—"}
                  </button>
                ))}
              </div>
              <p className="text-[0.65rem]">
                {activeChar.dog.name} · {activeChar.dog.breed}
              </p>
            </>
          )}
        </aside>
      </div>
    </div>
  );
}

function SkillsPanel({
  char,
  canEdit,
  assignIdx,
  onAssignIdx,
  onUnlock,
  onAssignHotbar,
}: {
  char: CharacterSave;
  canEdit: boolean;
  assignIdx: number | null;
  onAssignIdx: (i: number | null) => void;
  onUnlock: (nodeId: string) => void;
  onAssignHotbar: (abilityId: string | null) => void;
}) {
  const assignable = listAssignableAbilities(char);
  return (
    <div className="space-y-4">
      <p className="pc-eyebrow">
        Skill points: {char.skillPoints} · Abilities {char.abilities.length}
      </p>
      <div className="pc-hotbar">
        {char.hotbar.map((id, i) => (
          <button
            key={i}
            type="button"
            className="pc-hotbar-slot"
            data-active={assignIdx === i}
            disabled={!canEdit}
            onClick={() => onAssignIdx(assignIdx === i ? null : i)}
          >
            <span className="pc-slot-num">{i + 1}</span>
            {id ? getAbility(id)?.name ?? id : "Empty"}
          </button>
        ))}
      </div>
      {assignIdx != null && (
        <div className="flex flex-wrap gap-2">
          <button type="button" className="pc-chip" onClick={() => onAssignHotbar(null)}>
            Clear slot
          </button>
          {assignable.map((a) => (
            <button key={a.id} type="button" className="pc-chip" onClick={() => onAssignHotbar(a.id)}>
              {a.name}
            </button>
          ))}
        </div>
      )}
      {SKILL_TREES.map((tree) => (
        <div key={tree.id} className="space-y-2">
          <p className="pc-eyebrow">{tree.name}</p>
          <p className="text-[0.65rem] opacity-70">{tree.blurb}</p>
          {tree.nodes.map((node) => {
            const unlocked = char.unlockedNodes.includes(node.id);
            const gate = canUnlockNode(char, node.id);
            return (
              <button
                key={node.id}
                type="button"
                className="pc-choice block w-full text-left"
                disabled={!canEdit || unlocked || !gate.ok}
                onClick={() => onUnlock(node.id)}
              >
                <strong>
                  {node.name}
                  {unlocked ? " ✓" : ` (${node.cost}pt · L${node.minLevel})`}
                </strong>
                <span className="block text-[0.65rem] opacity-70">{node.blurb}</span>
              </button>
            );
          })}
        </div>
      ))}
    </div>
  );
}

function CharacterSheet({ char, highlight }: { char: CharacterSave; highlight: boolean }) {
  return (
    <div className={`pc-panel p-3 bg-white/60 ${highlight ? "ring-2 ring-[var(--pc-cyan)]" : ""}`}>
      <p className="font-bold">
        {char.name} · {CLASS_DEFS[char.classId].name} · Lv {char.level}
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
        Gold {char.gold} · Dog: {char.dog.name} · Hotbar {char.hotbar.filter(Boolean).length}/{HOTBAR_SIZE}
      </p>
    </div>
  );
}

function InventoryPanel({
  char,
  canEdit,
  onEquip,
}: {
  char: CharacterSave;
  canEdit: boolean;
  onEquip: (id: string) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="pc-eyebrow">Equipment — {char.name}</p>
      <div className="grid grid-cols-2 gap-2 text-xs">
        {EQUIP_SLOTS.map((slot) => {
          const eqId = char.equipped[slot];
          const item = eqId ? getGear(eqId) : null;
          return (
            <div key={slot} className="pc-stat-box text-left">
              <strong>{slot}</strong>
              {item ? item.name : "—"}
            </div>
          );
        })}
      </div>
      <p className="pc-eyebrow text-[0.65rem]">Inventory</p>
      <div className="flex flex-wrap gap-2">
        {char.inventory.map((id) => {
          const item = getGear(id);
          if (!item) return null;
          return (
            <button
              key={id}
              type="button"
              className="pc-inv-slot"
              disabled={!canEdit || item.slot === "consumable" || item.slot === "misc"}
              onClick={() => onEquip(id)}
              title={item.blurb}
            >
              {item.name.slice(0, 10)}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function CreatePhase({
  slot,
  base,
  onSave,
  onBack,
}: {
  slot: PlayerSlot;
  base: CharacterSave;
  onSave: (char: CharacterSave) => void;
  onBack: () => void;
}) {
  const def = SLOT_DEFAULTS[slot];
  const [name, setName] = useState(base.name || def.displayName);
  const [classId, setClassId] = useState<ClassId>(base.classId || def.suggestedClass);
  const [dogName, setDogName] = useState(base.dog.name || def.dogName);
  const [dogBreed, setDogBreed] = useState(base.dog.breed || def.dogBreed);
  const [bumps, setBumps] = useState<Partial<Record<StatKey, number>>>({});

  const spent = useMemo(
    () => STAT_KEYS.reduce((s, k) => s + (bumps[k] ?? 0), 0),
    [bumps]
  );
  const left = STAT_POINT_BUY_POOL - spent;
  const preview = applyPointBuy(CLASS_DEFS[classId].baseStats, bumps, STAT_POINT_BUY_POOL);

  const bump = (key: StatKey, delta: number) => {
    const cur = bumps[key] ?? 0;
    const next = cur + delta;
    if (next < 0) return;
    if (spent - cur + next > STAT_POINT_BUY_POOL) return;
    setBumps({ ...bumps, [key]: next });
  };

  const submit = () => {
    const blank = createBlankCharacter(slot, classId);
    const result = completeCharacterCreation(blank, {
      name,
      classId,
      dogName,
      dogBreed,
      statBumps: bumps,
      pool: STAT_POINT_BUY_POOL,
    });
    if ("error" in result) return;
    onSave(result);
  };

  return (
    <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
      <DowntownSubnav active="party" />
      <div className="pc-header-bar px-4 py-3">
        <h1 className="pc-title text-2xl">Character Creation — {def.displayName}</h1>
        <p className="text-xs font-bold">Class starters fill ≥3 hotbar slots from landed skill trees.</p>
      </div>
      <div className="grid gap-4 md:grid-cols-2">
        <div className="pc-panel p-4 pc-create-form">
          <label htmlFor="pc-name">Hero name</label>
          <input id="pc-name" value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="pc-class">Class</label>
          <select
            id="pc-class"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value as ClassId);
              setBumps({});
            }}
          >
            {CLASS_IDS.map((id) => (
              <option key={id} value={id}>
                {CLASS_DEFS[id].name}
              </option>
            ))}
          </select>
          <p className="text-xs mb-3">{CLASS_DEFS[classId].blurb}</p>
          <label htmlFor="pc-dog">Hound</label>
          <input id="pc-dog" value={dogName} onChange={(e) => setDogName(e.target.value)} />
          <label htmlFor="pc-breed">Breed</label>
          <input id="pc-breed" value={dogBreed} onChange={(e) => setDogBreed(e.target.value)} />
        </div>
        <div className="pc-panel p-4">
          <p className="pc-eyebrow">Point buy — {left} left</p>
          <div className="space-y-2">
            {STAT_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-10 font-bold text-sm">{STAT_LABELS[key]}</span>
                <button type="button" className="pc-chip px-2 py-0" onClick={() => bump(key, -1)}>
                  −
                </button>
                <span className="w-6 text-center font-bold">{preview?.[key] ?? CLASS_DEFS[classId].baseStats[key]}</span>
                <button type="button" className="pc-chip px-2 py-0" onClick={() => bump(key, 1)}>
                  +
                </button>
              </div>
            ))}
          </div>
          <div className="flex gap-2 mt-4">
            <button type="button" className="pc-primary-btn" disabled={left < 0} onClick={submit}>
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
