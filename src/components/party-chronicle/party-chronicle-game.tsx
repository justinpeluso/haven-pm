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
  equipItem as engineEquip,
  partyAvgLevel,
  setHotbarSlot,
  spendSkillPoint,
  useHotbarAbility,
} from "@/lib/downtown/party-chronicle/engine";
import {
  availableSideQuests,
  completeSideQuest,
  cookRecipe,
  cookableRecipes,
  fleeRoadEncounter,
  startRoadEncounter,
} from "@/lib/downtown/party-chronicle/midgame";
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
  pickRicherWorld,
  saveSummary,
  worldHasProgress,
  writeWorld,
} from "@/lib/downtown/party-chronicle/persist";
import {
  BLANK_BASE_STATS,
  listCreateMagic,
  listCreateSkills,
  weaponsForClass,
  magicSlotsForClass,
} from "@/lib/downtown/party-chronicle/create";
import { canUnlockNode, getAbility, SKILL_TREES } from "@/lib/downtown/party-chronicle/skills";
import {
  chapterForNode,
  getChapter,
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
type MainTab = "story" | "camp" | "skills" | "gear" | "codex" | "party";

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
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [titleSave, setTitleSave] = useState<PartyWorldSave | null>(null);

  const mySlot = identity.slot;
  const acting = !!(world && mySlot && canAct(world, mySlot, identity.isDm));
  // Story panels are party-shared — any seated player (or DM) can pick so solo play never soft-locks.
  const canStory = !!(world && !world.endingId && (mySlot || identity.isDm));
  const storyActor: PlayerSlot | null = mySlot ?? (identity.isDm ? world?.activeSlot ?? "justin" : null);

  const enterFromSave = useCallback(
    (existing: PartyWorldSave) => {
      setWorld(existing);
      setTitleSave(existing);
      writeWorld(existing);
      if (existing.endingId) setPhase("ending");
      else if (mySlot && !existing.characters[mySlot].created) setPhase("create");
      else setPhase("play");
    },
    [mySlot]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = loadWorld();
      let server: PartyWorldSave | null = null;
      try {
        const res = await fetch("/api/downtown/party-chronicle");
        if (res.ok) {
          const data = (await res.json()) as { world: PartyWorldSave | null; hasSave?: boolean };
          server = data.world;
        }
      } catch {
        /* local fallback */
      }
      if (cancelled) return;

      const progressed = pickRicherWorld(
        worldHasProgress(local) ? local : null,
        worldHasProgress(server) ? server : null
      );
      const richer = progressed ?? pickRicherWorld(local, server);

      if (richer) {
        if (local && pickRicherWorld(local, server) === local && worldHasProgress(local)) {
          void fetch("/api/downtown/party-chronicle", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ world: local }),
          }).catch(() => undefined);
        }
        enterFromSave(richer);
      } else {
        setTitleSave(null);
        setPhase("title");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [enterFromSave]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 4200);
    return () => window.clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    if (saveStatus !== "saved" && saveStatus !== "error") return;
    const t = window.setTimeout(() => setSaveStatus("idle"), 2800);
    return () => window.clearTimeout(t);
  }, [saveStatus]);

  // Keep a local snapshot if the tab closes mid-session.
  useEffect(() => {
    if (!world) return;
    const flush = () => writeWorld(world);
    const onHide = () => {
      if (document.visibilityState === "hidden") flush();
    };
    window.addEventListener("beforeunload", flush);
    document.addEventListener("visibilitychange", onHide);
    return () => {
      window.removeEventListener("beforeunload", flush);
      document.removeEventListener("visibilitychange", onHide);
    };
  }, [world]);

  const persist = useCallback((next: PartyWorldSave) => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    writeWorld(stamped);
    setWorld(stamped);
    setTitleSave(stamped);
    if (stamped.endingId) setPhase("ending");
    void fetch("/api/downtown/party-chronicle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ world: stamped }),
    }).catch(() => undefined);
  }, []);

  const saveNow = useCallback(async () => {
    if (!world) return;
    setSaveStatus("saving");
    const stamped = { ...world, updatedAt: new Date().toISOString() };
    writeWorld(stamped);
    setWorld(stamped);
    setTitleSave(stamped);
    try {
      const res = await fetch("/api/downtown/party-chronicle", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world: stamped }),
      });
      if (!res.ok) throw new Error("save failed");
      const data = (await res.json()) as { world?: PartyWorldSave };
      if (data.world) {
        writeWorld(data.world);
        setWorld(data.world);
        setTitleSave(data.world);
      }
      setSaveStatus("saved");
      setFlash("Chronicle saved.");
    } catch {
      setSaveStatus("error");
      setFlash("Save failed — kept a local copy on this device.");
    }
  }, [world]);

  const storyNode = world ? getStoryNode(world.campaignNodeId) : null;
  const chapter = world ? chapterForNode(world.campaignNodeId) : null;
  const me = world && mySlot ? world.characters[mySlot] : null;
  const activeChar = world ? world.characters[world.activeSlot] : null;
  const hotbarView = activeChar ? describeHotbar(activeChar) : [];

  const startCampaign = () => {
    const has = worldHasProgress(titleSave) || worldHasProgress(loadWorld());
    if (has && !window.confirm("Start a NEW campaign? This erases the current Neverworld save for everyone.")) {
      return;
    }
    const fresh = createNewWorld();
    persist(fresh);
    setPhase(mySlot ? "create" : "play");
  };

  const continueCampaign = () => {
    const existing = titleSave ?? loadWorld();
    if (!existing) {
      setFlash("No save found.");
      return;
    }
    enterFromSave(existing);
    setFlash("Save restored.");
  };

  const leaveToTitle = () => {
    // Keep local + server saves — title offers Continue.
    if (world) {
      writeWorld(world);
      setTitleSave(world);
    } else {
      setTitleSave(loadWorld());
    }
    setWorld(null);
    setPhase("title");
  };

  const resetCampaign = () => {
    if (!identity.isDm) return;
    if (!window.confirm("Reset Neverworld for the whole party? This cannot be undone.")) return;
    clearWorld();
    setWorld(null);
    setTitleSave(null);
    setPhase("title");
    void fetch("/api/downtown/party-chronicle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true }),
    }).catch(() => undefined);
  };

  const onChoice = (choice: StoryChoice) => {
    if (!world || !storyActor || !canStory) return;
    startTransition(() => {
      const result = applyStoryChoice(world, storyActor, choice);
      persist(result.world);
      const msg = result.roll
        ? `d20 ${result.roll.d20} → ${result.roll.total} (${result.roll.success ? "hit" : "miss"}). ${result.message}`
        : result.message;
      setFlash(msg);
    });
  };

  const onContinue = () => {
    if (!world || !storyActor || !canStory || !storyNode) return;
    if (storyNode.kind !== "narrative" && storyNode.kind !== "montage") return;
    startTransition(() => {
      persist(acknowledgeNarrative(world, storyActor));
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

  const onRoadAmbush = () => {
    if (!world || !mySlot || !acting) return;
    const result = startRoadEncounter(world, mySlot);
    persist(result.world);
    setFlash(result.message);
    setTab("story");
  };

  const onFleeRoad = () => {
    if (!world || !mySlot || !acting) return;
    const result = fleeRoadEncounter(world, mySlot);
    persist(result.world);
    setFlash(result.message);
  };

  const onSideQuest = (questId: string) => {
    if (!world || !mySlot || !acting) return;
    const result = completeSideQuest(world, mySlot, questId);
    persist(result.world);
    setFlash(result.message);
  };

  const onCook = (recipeId: string) => {
    if (!world || !mySlot || !acting) return;
    const result = cookRecipe(world, mySlot, recipeId);
    persist(result.world);
    setFlash(result.message);
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
        <DowntownSubnav active="neverworld" />
        <p className="text-sm" style={{ color: "var(--dt-muted)" }}>
          Loading Neverworld…
        </p>
      </div>
    );
  }

  if (phase === "title") {
    const resume = titleSave ?? loadWorld();
    const canContinue = !!resume;
    return (
      <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
        <DowntownSubnav active="neverworld" />
        {flash && (
          <div className="pc-turn-banner" role="status">
            {flash}
          </div>
        )}
        <div className="pc-panel-jagged p-8 text-center space-y-4 max-w-lg mx-auto">
          <p className="pc-eyebrow">Haven PM · Downtown</p>
          <h1 className="pc-title text-4xl md:text-5xl">Neverworld</h1>
          <p className="text-sm leading-relaxed">
            Three heroes, three hounds, Justin → Rusty → Elisha. Choices steer Animal, Human, or Demon.
          </p>
          {mySlot && (
            <p className="text-xs font-bold" style={{ color: "var(--pc-magenta)" }}>
              Playing as {SLOT_DEFAULTS[mySlot].displayName}
            </p>
          )}
          {!mySlot && (
            <div className="pc-panel p-4 text-left space-y-2 max-w-sm mx-auto">
              <p className="pc-eyebrow">Party logins</p>
              <p className="text-xs">
                Use these at the Haven login screen (password <strong>password67</strong>):
              </p>
              <ul className="text-xs font-mono space-y-1">
                <li>player1@havenpm.com — Justin (DM)</li>
                <li>player2@havenpm.com — Rusty</li>
                <li>player3@havenpm.com — Elisha</li>
              </ul>
            </div>
          )}
          {canContinue && resume && (
            <div className="pc-panel p-3 text-left text-xs space-y-1">
              <p className="pc-eyebrow text-[0.65rem]">Saved chronicle</p>
              <p>{saveSummary(resume)}</p>
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
            {canContinue && (
              <button type="button" className="pc-primary-btn" onClick={continueCampaign}>
                Continue
              </button>
            )}
            <button
              type="button"
              className={canContinue ? "pc-chip" : "pc-primary-btn"}
              onClick={startCampaign}
            >
              New Campaign
            </button>
          </div>
          {canContinue && (
            <p className="text-[0.65rem] opacity-70">New Campaign asks before erasing the save.</p>
          )}
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
          setSaveStatus("saved");
          setFlash(
            ready
              ? "Character saved. Party sealed — Neverworld opens."
              : "Character saved. Waiting on the others."
          );
        }}
        onBack={leaveToTitle}
      />
    );
  }

  if (phase === "ending" && world?.endingId) {
    const ending = getEnding(world.endingId) ?? ENDING_BY_ID[world.endingId];
    const endNode = getStoryNode(world.campaignNodeId);
    return (
      <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
        <DowntownSubnav active="neverworld" />
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
          <button type="button" className="pc-chip mt-4" onClick={leaveToTitle}>
            Return to Title
          </button>
        </div>
      </div>
    );
  }

  if (!world || !storyNode) {
    return (
      <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
        <DowntownSubnav active="neverworld" />
        <p className="text-sm">Story node missing — reset the campaign.</p>
        {identity.isDm ? (
          <button type="button" className="pc-chip" onClick={resetCampaign}>
            Reset
          </button>
        ) : (
          <button type="button" className="pc-chip" onClick={leaveToTitle}>
            Return to Title
          </button>
        )}
      </div>
    );
  }

  const roadFoe = world.deckEncounter;
  const inRoadFight =
    !!world.deckEncounter && world.encounterEnemyHp != null && world.encounterEnemyHp > 0;
  const inStoryFight =
    storyNode.kind === "encounter" && world.encounterEnemyHp != null && world.encounterEnemyHp > 0;
  const inEncounter = inStoryFight || inRoadFight;
  const hasChoices =
    storyNode.kind === "conversation" || storyNode.kind === "path" || storyNode.kind === "encounter";
  const sideQuests = availableSideQuests(world);
  const actNum = getChapter(world.chapterId)?.chapter ?? 1;
  const campRecipes = mySlot ? cookableRecipes(world, mySlot) : [];

  return (
    <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
      <DowntownSubnav active="neverworld" />
      {flash && (
        <div className="pc-turn-banner" role="status">
          {flash}
        </div>
      )}

      <div className="pc-header-bar px-4 py-3 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="pc-eyebrow text-[0.65rem]" style={{ color: "var(--pc-ink)" }}>
            {chapter ? `Ch ${chapter.chapter} · ${chapter.title}` : "Neverworld"}
          </p>
          <h1 className="pc-title text-2xl md:text-3xl">{storyNode.title}</h1>
          <p className="text-xs font-bold">
            Turn {world.turnIndex} · Party ~L{partyAvgLevel(world)} · {progressionHint(partyAvgLevel(world))}
          </p>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          <button
            type="button"
            className="pc-chip"
            data-active={saveStatus === "saved"}
            disabled={saveStatus === "saving"}
            onClick={() => void saveNow()}
          >
            {saveStatus === "saving"
              ? "Saving…"
              : saveStatus === "saved"
                ? "Saved ✓"
                : saveStatus === "error"
                  ? "Retry Save"
                  : "Save"}
          </button>
          <button type="button" className="pc-chip" onClick={leaveToTitle}>
            Title
          </button>
          {identity.isDm && (
            <button type="button" className="pc-chip" onClick={resetCampaign}>
              Reset
            </button>
          )}
        </div>
      </div>

      <div className="pc-turn-banner" data-forest="true">
        {hasChoices || storyNode.kind === "narrative" || storyNode.kind === "montage"
          ? canStory
            ? acting
              ? `${SLOT_DEFAULTS[world.activeSlot].displayName}'s turn — pick a panel`
              : `Story open — ${SLOT_DEFAULTS[world.activeSlot].displayName}'s seat, anyone can choose`
            : "Log in with a party account to choose"
          : acting
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
                ["camp", "Camp"],
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

              {inRoadFight && roadFoe && (
                <div className="space-y-2">
                  <p className="pc-eyebrow">Road fight — {roadFoe.name}</p>
                  <Meter
                    label="Enemy HP"
                    value={world.encounterEnemyHp ?? 0}
                    max={roadFoe.maxHp}
                    tone="enemy"
                  />
                  <p className="text-[0.65rem] opacity-70">Use hotbar to strike. Open Camp to flee.</p>
                </div>
              )}

              {(storyNode.kind === "narrative" || storyNode.kind === "montage") && (
                <button type="button" className="pc-choice" disabled={!canStory} onClick={onContinue}>
                  {storyNode.kind === "montage"
                    ? `Train onward (+${storyNode.xpGrant} XP) →`
                    : "Continue →"}
                </button>
              )}

              {hasChoices && !canStory && (
                <p className="text-xs font-bold" style={{ color: "var(--pc-accent)" }}>
                  Log in as player1 / player2 / player3 to choose.
                </p>
              )}

              {hasChoices &&
                "choices" in storyNode &&
                storyNode.choices.map((choice) => (
                  <button
                    key={choice.id}
                    type="button"
                    className="pc-choice block w-full text-left mb-2"
                    disabled={!canStory}
                    onClick={() => onChoice(choice)}
                  >
                    <strong>{choice.label}</strong>
                    <span className="block text-[0.65rem] opacity-70">{choice.approach}</span>
                  </button>
                ))}
            </div>
          )}

          {tab === "camp" && (
            <div className="space-y-4">
              <p className="pc-eyebrow">Camp · Roads · Side quests</p>
              <p className="text-xs opacity-70">
                Mid-act filler for {world.chapterId}. Packs: encounters + side quests + cooking.
              </p>

              <div className="space-y-2">
                <p className="pc-eyebrow text-[0.65rem]">Road encounter</p>
                {inRoadFight && roadFoe ? (
                  <>
                    <p className="text-sm font-bold">{roadFoe.name}</p>
                    <Meter
                      label="Enemy HP"
                      value={world.encounterEnemyHp ?? 0}
                      max={roadFoe.maxHp}
                      tone="enemy"
                    />
                    <button
                      type="button"
                      className="pc-chip"
                      disabled={!acting}
                      onClick={onFleeRoad}
                    >
                      Flee road fight
                    </button>
                  </>
                ) : (
                  <button
                    type="button"
                    className="pc-choice"
                    disabled={!acting || inStoryFight}
                    onClick={onRoadAmbush}
                  >
                    Roll road ambush →
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <p className="pc-eyebrow text-[0.65rem]">
                  Side quests ({sideQuests.length} open · {(world.completedSideQuests ?? []).length}{" "}
                  done)
                </p>
                {sideQuests.length === 0 && (
                  <p className="text-xs opacity-70">No open side quests for this chapter.</p>
                )}
                {sideQuests.map((q) => (
                  <button
                    key={q.id}
                    type="button"
                    className="pc-choice block w-full text-left"
                    disabled={!acting || inRoadFight}
                    onClick={() => onSideQuest(q.id)}
                  >
                    <strong>{q.title}</strong>
                    <span className="block text-[0.65rem] opacity-70">
                      {q.kind} · {q.estimatedMinutes}m · +{q.rewards.xp} XP · {q.summary}
                    </span>
                  </button>
                ))}
              </div>

              <div className="space-y-2">
                <p className="pc-eyebrow text-[0.65rem]">Campfire cook (act ≤{actNum})</p>
                {campRecipes.slice(0, 8).map((r) => {
                  const canCook = r.ingredients.every((id) => me?.inventory.includes(id));
                  return (
                    <button
                      key={r.id}
                      type="button"
                      className="pc-chip block w-full text-left text-xs"
                      disabled={!acting || !canCook || inRoadFight}
                      onClick={() => onCook(r.id)}
                      title={r.blurb}
                    >
                      <strong>{r.name}</strong>
                      <span className="block opacity-70">
                        Need {r.ingredients.join(", ") || "nothing"} · heal {r.heal}
                        {(world.cookedRecipes ?? []).includes(r.id) ? " · cooked" : ""}
                      </span>
                    </button>
                  );
                })}
              </div>
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
  const initialClass = base.classId || def.suggestedClass;
  const skills = useMemo(() => listCreateSkills(), []);
  const magicOptions = useMemo(() => listCreateMagic(), []);

  const [name, setName] = useState(base.name || def.displayName);
  const [classId, setClassId] = useState<ClassId>(initialClass);
  const [dogName, setDogName] = useState(base.dog.name || def.dogName);
  const [dogBreed, setDogBreed] = useState(base.dog.breed || def.dogBreed);
  const [bumps, setBumps] = useState<Partial<Record<StatKey, number>>>({});
  const weapons = useMemo(() => weaponsForClass(classId), [classId]);
  const [weaponId, setWeaponId] = useState(() => weaponsForClass(initialClass)[0]?.id ?? "iron-sword");
  const [skillId, setSkillId] = useState(skills[0]?.id ?? "ab-power-strike");
  const [magicIds, setMagicIds] = useState<string[]>([]);
  const [createError, setCreateError] = useState<string | null>(null);

  const magicNeeded = magicSlotsForClass(classId);

  useEffect(() => {
    if (!weapons.some((w) => w.id === weaponId)) {
      setWeaponId(weapons[0]?.id ?? "iron-sword");
    }
  }, [weapons, weaponId]);

  useEffect(() => {
    setMagicIds((prev) => {
      if (prev.length === magicNeeded) return prev;
      const next = prev.slice(0, magicNeeded);
      while (next.length < magicNeeded && magicOptions[next.length]) {
        next.push(magicOptions[next.length].id);
      }
      return next;
    });
  }, [classId, magicNeeded, magicOptions]);

  const spent = useMemo(
    () => STAT_KEYS.reduce((s, k) => s + (bumps[k] ?? 0), 0),
    [bumps]
  );
  const left = STAT_POINT_BUY_POOL - spent;
  const preview = applyPointBuy(BLANK_BASE_STATS, bumps, STAT_POINT_BUY_POOL);

  const bump = (key: StatKey, delta: number) => {
    const cur = bumps[key] ?? 0;
    const next = cur + delta;
    if (next < 0) return;
    if (spent - cur + next > STAT_POINT_BUY_POOL) return;
    setBumps({ ...bumps, [key]: next });
  };

  const toggleMagic = (id: string) => {
    setMagicIds((prev) => {
      if (prev.includes(id)) return prev.filter((m) => m !== id);
      if (prev.length >= magicNeeded) {
        // Replace oldest pick when at capacity (single-slot classes feel snappier).
        return [...prev.slice(1), id];
      }
      return [...prev, id];
    });
  };

  const submit = () => {
    setCreateError(null);
    const result = completeCharacterCreation(base, {
      name,
      classId,
      dogName,
      dogBreed,
      statBumps: bumps,
      pool: STAT_POINT_BUY_POOL,
      kit: { weaponId, skillAbilityId: skillId, magicAbilityIds: magicIds },
    });
    if ("error" in result) {
      setCreateError(result.error);
      return;
    }
    onSave(result);
  };

  const kitReady = Boolean(weaponId && skillId && magicIds.length === magicNeeded && left >= 0);

  return (
    <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
      <DowntownSubnav active="neverworld" />
      <div className="pc-header-bar px-4 py-3">
        <h1 className="pc-title text-2xl">Neverworld — {def.displayName}</h1>
        <p className="text-xs font-bold">
          Blank stats · pick 1 weapon, 1 skill, and {magicNeeded} magic — wired to your hotbar.
        </p>
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="pc-panel p-4 pc-create-form space-y-2">
          <label htmlFor="pc-name">Hero name</label>
          <input id="pc-name" value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="pc-class">Class</label>
          <select
            id="pc-class"
            value={classId}
            onChange={(e) => {
              setClassId(e.target.value as ClassId);
              setBumps({});
              setCreateError(null);
            }}
          >
            {CLASS_IDS.map((id) => (
              <option key={id} value={id}>
                {CLASS_DEFS[id].name}
              </option>
            ))}
          </select>
          <p className="text-xs mb-2">{CLASS_DEFS[classId].blurb}</p>
          <label htmlFor="pc-dog">Hound</label>
          <input id="pc-dog" value={dogName} onChange={(e) => setDogName(e.target.value)} />
          <label htmlFor="pc-breed">Breed</label>
          <input id="pc-breed" value={dogBreed} onChange={(e) => setDogBreed(e.target.value)} />
        </div>

        <div className="pc-panel p-4 space-y-3">
          <p className="pc-eyebrow">Starter kit</p>
          <div>
            <p className="text-xs font-bold mb-1">Weapon (equipped)</p>
            <div className="flex flex-wrap gap-1">
              {weapons.map((w) => (
                <button
                  key={w.id}
                  type="button"
                  className="pc-chip text-[0.65rem]"
                  data-active={weaponId === w.id}
                  onClick={() => setWeaponId(w.id)}
                >
                  {w.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-1">Skill (hotbar slot 1)</p>
            <div className="flex flex-wrap gap-1">
              {skills.map((s) => (
                <button
                  key={s.id}
                  type="button"
                  className="pc-chip text-[0.65rem]"
                  data-active={skillId === s.id}
                  onClick={() => setSkillId(s.id)}
                  title={s.blurb}
                >
                  {s.name}
                </button>
              ))}
            </div>
          </div>
          <div>
            <p className="text-xs font-bold mb-1">
              Magic ({magicIds.length}/{magicNeeded})
            </p>
            <div className="flex flex-wrap gap-1">
              {magicOptions.map((m) => (
                <button
                  key={m.id}
                  type="button"
                  className="pc-chip text-[0.65rem]"
                  data-active={magicIds.includes(m.id)}
                  onClick={() => toggleMagic(m.id)}
                  title={m.blurb}
                >
                  {m.name}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="pc-panel p-4">
          <p className="pc-eyebrow">Point buy — {left} left (all stats start at 8)</p>
          <div className="space-y-2">
            {STAT_KEYS.map((key) => (
              <div key={key} className="flex items-center gap-2">
                <span className="w-10 font-bold text-sm">{STAT_LABELS[key]}</span>
                <button type="button" className="pc-chip px-2 py-0" onClick={() => bump(key, -1)}>
                  −
                </button>
                <span className="w-6 text-center font-bold">
                  {preview?.[key] ?? BLANK_BASE_STATS[key]}
                </span>
                <button type="button" className="pc-chip px-2 py-0" onClick={() => bump(key, 1)}>
                  +
                </button>
              </div>
            ))}
          </div>
          {createError && (
            <p className="text-xs font-bold mt-2" style={{ color: "var(--pc-magenta)" }}>
              {createError}
            </p>
          )}
          <div className="flex gap-2 mt-4">
            <button
              type="button"
              className="pc-primary-btn"
              disabled={!kitReady}
              onClick={submit}
            >
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
