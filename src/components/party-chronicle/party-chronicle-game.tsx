"use client";

import { useCallback, useEffect, useMemo, useState, useTransition } from "react";
import { DowntownSubnav } from "@/components/downtown/downtown-subnav";
import { ENDING_BY_ID } from "@/lib/downtown/party-chronicle/alignment";
import { getAnimalNpc } from "@/lib/downtown/party-chronicle/animals";
import { comicArtSrc, getComicArt } from "@/lib/downtown/party-chronicle/art";
import {
  campaignProgressReport,
  journeyTrail,
  preferCampaignProgress,
  unionPartyFlags,
} from "@/lib/downtown/party-chronicle/journey";
import { hoursSummary } from "@/lib/downtown/party-chronicle/campaign";
import {
  acknowledgeNarrative,
  applyStoryChoice,
  canAct,
  equipItem as engineEquip,
  partyAvgLevel,
  progressGateForNode,
  rescueFromStrandedEnding,
  rewindFromEnding,
  salvageInventoryItem,
  setHotbarSlot,
  spendSkillPoint,
  unequipSlot as engineUnequip,
  useHotbarAbility,
  useInventoryConsumable,
} from "@/lib/downtown/party-chronicle/engine";
import { MAX_LEVEL, xpProgress } from "@/lib/downtown/party-chronicle/progression";
import {
  AMBUSH_INTERVAL_MS,
  dismissBattleSummary,
  ensureEncounterSchedule,
  isAmbushTimerPaused,
  performBattleAction,
  readSpellbook,
  startRandomBattle,
  tickBattleTimers,
  tickStoryPlay,
} from "@/lib/downtown/party-chronicle/battle";
import {
  availableSideQuests,
  buyFromCampMerchant,
  campMerchantStock,
  campSleepCooldownMs,
  campSleepsRemaining,
  CAMP_SLEEP_MAX,
  CAMP_SLEEP_WINDOW_MS,
  cookRecipe,
  cookableRecipes,
  fleeRoadEncounter,
  sleepAtCamp,
} from "@/lib/downtown/party-chronicle/midgame";
import {
  abandonSideQuest,
  advanceSideQuest,
  dismissFailedQuest,
  startSideQuest,
  tickSideQuestTimer,
} from "@/lib/downtown/party-chronicle/quest-run";
import {
  digForLoot,
  stumbleOnChest,
} from "@/lib/downtown/party-chronicle/exploration";
import { SideQuestOverlay } from "@/components/party-chronicle/side-quest-overlay";
import { getGear, gearCatalogStats } from "@/lib/downtown/party-chronicle/gear";
import { bestiaryStats, isSpellbookItem } from "@/lib/downtown/party-chronicle/bestiary";
import { formatProperty, itemProperties } from "@/lib/downtown/party-chronicle/stats";
import { PaperdollPanel } from "@/components/party-chronicle/paperdoll";
import { GearTipBody } from "@/components/party-chronicle/gear-hover-tip";
import { describeHotbar, listAssignableAbilities } from "@/lib/downtown/party-chronicle/hotbar";
import {
  CLASS_DEFS,
  SLOT_DEFAULTS,
  STAT_POINT_BUY_POOL,
} from "@/lib/downtown/party-chronicle/players";
import { pathwayLabel, NEVERWORLD_HERITAGE } from "@/lib/downtown/party-chronicle/pathway";
import { applyRaceToStats, RACE_DEFS, RACE_IDS, type RaceId } from "@/lib/downtown/party-chronicle/races";
import {
  applyPointBuy,
  clearWorld,
  completeCharacterCreation,
  createBlankCharacter,
  createNewWorld,
  loadWorld,
  mergeBattleAndAmbush,
  pickRicherWorld,
  preferActiveSideQuest,
  preferAmbushClocks,
  preferBattleState,
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
  type BattleActionId,
  type CharacterSave,
  type ClassId,
  type EquipSlot,
  type PartyWorldSave,
  type PlayerIdentity,
  type PlayerSlot,
  type StatKey,
  type StoryChoice,
} from "@/lib/downtown/party-chronicle/types";
import { BattleOverlay } from "@/components/party-chronicle/battle-overlay";
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
  compact,
}: {
  label: string;
  value: number;
  max: number;
  tone: "hp" | "stamina" | "mana" | "enemy" | "xp";
  compact?: boolean;
}) {
  return (
    <div className={compact ? "pc-meter-wrap pc-meter-wrap--compact" : "pc-meter-wrap"}>
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

/** XP toward next level — fill % from `xpProgress`. */
function XpMeter({ xp, compact }: { xp: number; compact?: boolean }) {
  const prog = xpProgress(xp);
  const maxed = prog.level >= MAX_LEVEL;
  return (
    <Meter
      label={maxed ? `XP · Lv ${prog.level} MAX` : `XP · Lv ${prog.level}`}
      value={maxed ? prog.need : prog.into}
      max={prog.need}
      tone="xp"
      compact={compact}
    />
  );
}

function sceneSrc(node: { sceneId?: string; artId?: string; splashArtId?: string } | null) {
  const id = node?.sceneId ?? node?.artId ?? node?.splashArtId ?? "scene-frostford-gate";
  return comicArtSrc(id);
}

function portraitSrc(node: { artId?: string; sceneId?: string } | null) {
  if (!node?.artId) return null;
  if (node.sceneId && node.artId === node.sceneId) return null;
  const entry = getComicArt(node.artId);
  if (!entry) return null;
  if (entry.kind === "scene" || entry.kind === "chapter") return null;
  return comicArtSrc(node.artId);
}

function shortMapLabel(title: string): string {
  const compact = title.replace(/^(the|a|an)\s+/i, "").trim();
  return compact.length > 15 ? `${compact.slice(0, 14).trimEnd()}…` : compact;
}

function JourneyMinimap({
  world,
  sideQuest,
  focusSideQuest,
}: {
  world: PartyWorldSave;
  sideQuest?: {
    questId: string;
    title: string;
    sceneId?: string;
  } | null;
  focusSideQuest?: boolean;
}) {
  const { stops, here } = journeyTrail(world);
  const progress = campaignProgressReport(world);
  const focusingSide = Boolean(focusSideQuest && sideQuest);

  const questStop = focusingSide
    ? (() => {
        const byScene = sideQuest!.sceneId
          ? stops.find((s) => s.sceneId === sideQuest!.sceneId)
          : undefined;
        if (byScene) {
          return {
            ...byScene,
            title: sideQuest!.title,
            short: shortMapLabel(sideQuest!.title),
            state: "here" as const,
          };
        }
        const anchor = here ?? stops[0];
        return {
          chapterId: `side:${sideQuest!.questId}`,
          chapter: anchor?.chapter ?? 0,
          title: sideQuest!.title,
          short: shortMapLabel(sideQuest!.title),
          sceneId: sideQuest!.sceneId ?? anchor?.sceneId ?? "scene-frostford-gate",
          x: Math.min(92, (anchor?.x ?? 50) + 10),
          y: Math.max(10, (anchor?.y ?? 50) - 10),
          state: "here" as const,
        };
      })()
    : null;

  const mapStops = focusingSide
    ? [
        ...stops.map((s) =>
          s.state === "here" ? { ...s, state: "visited" as const } : s
        ),
        ...(questStop ? [questStop] : []),
      ]
    : stops;
  const points = mapStops.map((s) => `${s.x},${s.y}`).join(" ");

  return (
    <div className="pc-panel p-3 space-y-2">
      <div className="flex items-end justify-between gap-2">
        <p className="pc-eyebrow text-[0.65rem]">
          {focusingSide ? "Side trail map" : "Realm map"} · {progress.percent < 0.1 && progress.hoursDone > 0
            ? "<0.1"
            : progress.percent < 1
              ? progress.percent.toFixed(1)
              : Math.round(progress.percent * 10) / 10}
          % of ~{progress.hoursTarget}h
        </p>
        <p className="text-[0.65rem] font-bold" style={{ color: "var(--pc-accent)" }}>
          {focusingSide && questStop
            ? `Here: ${questStop.short}`
            : here
              ? `Here: ${here.short}`
              : "Charting…"}
        </p>
      </div>
      {focusingSide && here ? (
        <p className="text-[0.65rem] opacity-80">
          Side quest: {sideQuest!.title} · Main road: {here.short}
        </p>
      ) : (
        <p className="text-[0.65rem] opacity-80">
          Comic page Act {progress.chapterNum} of {progress.chapterTotal} ·{" "}
          {progress.battlesFought} battles · {progress.sideQuestsDone} side quests
        </p>
      )}
      <div className="pc-journey-map" aria-label={focusingSide ? "Side trail map" : "Journey minimap"}>
        <svg viewBox="0 0 100 100" className="pc-journey-svg" role="img">
          <defs>
            <linearGradient id="journeyTrail" x1="0" y1="0" x2="1" y2="1">
              <stop offset="0%" stopColor="#5ecf9a" stopOpacity="0.9" />
              <stop offset="100%" stopColor="#e8c96a" stopOpacity="0.9" />
            </linearGradient>
          </defs>
          <rect width="100" height="100" rx="2" fill="#0a1410" />
          <path d="M0 70 Q25 55 50 68 T100 60 L100 100 L0 100Z" fill="#163828" opacity="0.9" />
          <path d="M0 82 Q40 72 70 80 T100 75 L100 100 L0 100Z" fill="#1a4030" opacity="0.8" />
          <polyline
            points={points}
            fill="none"
            stroke="url(#journeyTrail)"
            strokeWidth="1.6"
            strokeLinecap="round"
            strokeLinejoin="round"
            opacity="0.85"
          />
          {mapStops.map((s) => (
            <g key={s.chapterId}>
              <circle
                cx={s.x}
                cy={s.y}
                r={s.state === "here" ? 3.6 : 2.4}
                className={`pc-journey-node pc-journey-node--${s.state}`}
              />
              {s.state === "here" && (
                <circle cx={s.x} cy={s.y} r="5.5" className="pc-journey-pulse" />
              )}
            </g>
          ))}
        </svg>
        <ol className="pc-journey-legend">
          {mapStops.map((s) => (
            <li key={s.chapterId} data-state={s.state}>
              <span className="pc-journey-dot" />
              <span>
                {focusingSide && s.chapterId.startsWith("side:")
                  ? `Side · ${s.short}`
                  : `${s.chapter}. ${s.short}`}
                {s.state === "here" ? " ← you" : ""}
              </span>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}

export function PartyChronicleGame({ identity }: { identity: PlayerIdentity }) {
  const [phase, setPhase] = useState<UiPhase>("boot");
  const [world, setWorld] = useState<PartyWorldSave | null>(null);
  const [tab, setTab] = useState<MainTab>("story");
  /** Side quest stays on the save; panel can park so the party returns to the main spine. */
  const [questPanelOpen, setQuestPanelOpen] = useState(true);
  const [flash, setFlash] = useState<string | null>(null);
  /** Comic pop when the Camp merchant sale goes through — replace on each buy. */
  const [merchantSold, setMerchantSold] = useState<{
    id: number;
    spent: number;
    goldLeft: number;
  } | null>(null);
  const [pending, startTransition] = useTransition();
  const [assignIdx, setAssignIdx] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved" | "error">("idle");
  const [titleSave, setTitleSave] = useState<PartyWorldSave | null>(null);

  const mySlot = identity.slot;
  const meReady = !!(world && mySlot && world.characters[mySlot]?.created);
  const acting = !!(world && mySlot && meReady && canAct(world, mySlot, identity.isDm));
  // Sealed heroes only — uncreated seats are routed to character create.
  const canStory = !!(world && !world.endingId && mySlot && meReady);
  const storyActor: PlayerSlot | null = mySlot;

  const waitingOnCreate = world
    ? PLAYER_SLOT_ORDER.filter((s) => !world.characters[s]?.created)
    : [];

  const enterFromSave = useCallback(
    (existing: PartyWorldSave) => {
      const rescued = rescueFromStrandedEnding(existing);
      const scheduled = ensureEncounterSchedule(rescued);
      setWorld(scheduled);
      setTitleSave(scheduled);
      writeWorld(scheduled);
      if (scheduled.endingId) setPhase("ending");
      else if (mySlot && !scheduled.characters[mySlot]?.created) {
        setPhase("create");
        setFlash(
          `${SLOT_DEFAULTS[mySlot].displayName} — create your hero to join. Justin already opened the chronicle.`
        );
      } else {
        setPhase("play");
        if (rescued !== existing) {
          setFlash("Pulled you back onto the main road — that ending plate was early.");
        }
      }
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

      // Prefer server campaign for multiplayer. Only push local if server is empty
      // or local is strictly ahead on sealed heroes + turn without missing server seals.
      const progressed = pickRicherWorld(
        worldHasProgress(server) ? server : null,
        worldHasProgress(local) ? local : null
      );
      const richer = progressed ?? pickRicherWorld(server, local);

      if (richer) {
        const localCreated = local
          ? PLAYER_SLOT_ORDER.filter((s) => local.characters[s]?.created).length
          : 0;
        const serverCreated = server
          ? PLAYER_SLOT_ORDER.filter((s) => server.characters[s]?.created).length
          : 0;
        const localAhead =
          !!local &&
          !!server &&
          localCreated >= serverCreated &&
          (local.turnIndex ?? 0) > (server.turnIndex ?? 0) &&
          PLAYER_SLOT_ORDER.every(
            (s) => !server.characters[s]?.created || local.characters[s]?.created
          );
        if (local && worldHasProgress(local) && (!server || !worldHasProgress(server) || localAhead)) {
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

  // Pull party updates so Justin sees Rusty/Elisha after they create.
  useEffect(() => {
    if (phase !== "play" && phase !== "create") return;
    let cancelled = false;
    const tick = async () => {
      try {
        const res = await fetch("/api/downtown/party-chronicle");
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as { world: PartyWorldSave | null };
        const remote = data.world;
        if (!remote || cancelled) return;
        setWorld((prev) => {
          const base = pickRicherWorld(remote, prev) ?? remote;
          const characters = { ...base.characters };
          for (const s of PLAYER_SLOT_ORDER) {
            if (remote.characters[s]?.created) {
              characters[s] = remote.characters[s];
            }
          }
          // Narrative Continue moves the map without turnIndex — compare journey rank.
          const campaign = preferCampaignProgress(remote, base);
          const takeRemoteSeat = (remote.turnIndex ?? 0) > (base.turnIndex ?? 0);
          const campaignSlice: PartyWorldSave = {
            ...base,
            characters,
            activeSlot: takeRemoteSeat ? remote.activeSlot : campaign.activeSlot,
            turnIndex: Math.max(remote.turnIndex ?? 0, base.turnIndex ?? 0),
            campaignNodeId: campaign.campaignNodeId,
            chapterId: campaign.chapterId,
            partyFlags: unionPartyFlags(remote.partyFlags, base.partyFlags),
            alignment: campaign.alignment,
            pathway: campaign.pathway ?? base.pathway,
            encounterEnemyHp: campaign.encounterEnemyHp,
            deckEncounter: campaign.deckEncounter,
            completedSideQuests:
              (remote.completedSideQuests?.length ?? 0) >=
              (base.completedSideQuests?.length ?? 0)
                ? remote.completedSideQuests
                : base.completedSideQuests,
            cookedRecipes:
              (remote.cookedRecipes?.length ?? 0) >= (base.cookedRecipes?.length ?? 0)
                ? remote.cookedRecipes
                : base.cookedRecipes,
            activeSideQuest: preferActiveSideQuest(
              base.activeSideQuest,
              remote.activeSideQuest,
              {
                existingUpdatedAt: base.updatedAt,
                incomingUpdatedAt: remote.updatedAt,
              }
            ),
            log: remote.log?.length ? remote.log : base.log,
            endingId: campaign.endingId,
            updatedAt: remote.updatedAt || base.updatedAt,
          };
          // pickRicherWorld often prefers remote (newer/equal updatedAt) and would
          // drop local ambush progress — seed clocks + battle from prev first.
          const localSeed: PartyWorldSave = {
            ...campaignSlice,
            storyPlayMs: prev?.storyPlayMs ?? campaignSlice.storyPlayMs,
            battlesFought: prev?.battlesFought ?? campaignSlice.battlesFought,
            nextEncounterAtMs:
              prev?.nextEncounterAtMs ?? campaignSlice.nextEncounterAtMs,
            battle: prev?.battle ?? campaignSlice.battle,
          };
          const next = mergeBattleAndAmbush(localSeed, remote);
          writeWorld(next);
          setTitleSave(next);
          return next;
        });
        if (mySlot) {
          const sealed = !!remote.characters[mySlot]?.created;
          if (!sealed) setPhase("create");
          else if (phase === "create") setPhase(remote.endingId && (remote.battlesFought ?? 0) >= 80 ? "ending" : "play");
        }
      } catch {
        /* ignore */
      }
    };
    const id = window.setInterval(tick, 6000);
    const onFocus = () => void tick();
    window.addEventListener("focus", onFocus);
    return () => {
      cancelled = true;
      window.clearInterval(id);
      window.removeEventListener("focus", onFocus);
    };
  }, [phase, mySlot]);

  useEffect(() => {
    if (!flash) return;
    const t = window.setTimeout(() => setFlash(null), 4200);
    return () => window.clearTimeout(t);
  }, [flash]);

  useEffect(() => {
    if (!merchantSold) return;
    const t = window.setTimeout(() => setMerchantSold(null), 2000);
    return () => window.clearTimeout(t);
  }, [merchantSold]);

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

  // Never let an uncreated seat sit in the comic panel — force create.
  useEffect(() => {
    if (phase !== "play" || !mySlot || !world) return;
    if (!world.characters[mySlot]?.created) setPhase("create");
  }, [phase, mySlot, world]);

  // Track story/active time → random battles every 90s of eligible play.
  // Also tick battle clocks: 30s idle → foe strikes; 10 min hard cap.
  // DM-only authority (avoids multi-client ambush races). Timer pauses in fights.
  useEffect(() => {
    if (phase !== "play") return;
    if (!identity.isDm) return;
    const id = window.setInterval(() => {
      setWorld((prev) => {
        if (!prev || prev.endingId) return prev;

        if (prev.battle?.status === "active") {
          let cur = prev;
          const qTick = tickSideQuestTimer(cur);
          cur = qTick.world;
          if (qTick.message) setFlash(qTick.message);

          const ticked = tickBattleTimers(cur);
          cur = ticked.world;
          if (ticked.message) setFlash(ticked.message);

          if (cur !== prev) {
            writeWorld(cur);
            void fetch("/api/downtown/party-chronicle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ world: cur }),
            }).catch(() => undefined);
          }
          return cur;
        }

        // Overall side-quest trail clock (runs even between battles).
        if (prev.activeSideQuest?.status === "active") {
          const qTick = tickSideQuestTimer(prev);
          if (qTick.world !== prev) {
            writeWorld(qTick.world);
            if (qTick.message) setFlash(qTick.message);
            void fetch("/api/downtown/party-chronicle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ world: qTick.world }),
            }).catch(() => undefined);
            return qTick.world;
          }
        }

        if (prev.battle?.status === "victory" || prev.battle?.status === "defeat") return prev;
        if (isAmbushTimerPaused(prev)) return prev;
        const { world: ticked, shouldStartBattle } = tickStoryPlay(prev, 1000);
        if (!shouldStartBattle) {
          if (ticked.storyPlayMs !== prev.storyPlayMs) writeWorld(ticked);
          // Push ambush clock every ~15s so 6s polls cannot forever replay a stale server clock.
          const prevBucket = Math.floor((prev.storyPlayMs ?? 0) / 15_000);
          const nextBucket = Math.floor((ticked.storyPlayMs ?? 0) / 15_000);
          if (nextBucket > prevBucket) {
            void fetch("/api/downtown/party-chronicle", {
              method: "POST",
              headers: { "Content-Type": "application/json" },
              body: JSON.stringify({ world: ticked }),
            }).catch(() => undefined);
          }
          return ticked;
        }
        const started = startRandomBattle(ticked);
        if (!started.world.battle) {
          // Start failed (no heroes / ending) — do not soft-lock on a forever-due clock.
          const deferred: PartyWorldSave = {
            ...ticked,
            nextEncounterAtMs: (ticked.storyPlayMs ?? 0) + AMBUSH_INTERVAL_MS,
          };
          writeWorld(deferred);
          setFlash(started.message || "Ambush failed to start — timer reset.");
          return deferred;
        }
        writeWorld(started.world);
        setFlash(started.message);
        setTab("story");
        void fetch("/api/downtown/party-chronicle", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ world: started.world }),
        }).catch(() => undefined);
        return started.world;
      });
    }, 1000);
    return () => window.clearInterval(id);
  }, [phase, identity.isDm]);

  const persistAsync = useCallback(async (next: PartyWorldSave) => {
    const stamped = { ...next, updatedAt: new Date().toISOString() };
    writeWorld(stamped);
    setWorld(stamped);
    setTitleSave(stamped);
    if (stamped.endingId) setPhase("ending");
    const res = await fetch("/api/downtown/party-chronicle", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ world: stamped }),
    });
    if (!res.ok) throw new Error("save failed");
    const data = (await res.json()) as { world?: PartyWorldSave };
    if (data.world) {
      // Keep the further map pin if the round-trip somehow lagged behind Continue.
      const campaign = preferCampaignProgress(stamped, data.world);
      // Functional update so ticks during the await are not rewound by a staler reply.
      let mergedOut: PartyWorldSave = data.world;
      setWorld((prev) => {
        const live = prev ?? stamped;
        const clocks = preferAmbushClocks(live, data.world!);
        const battle = preferBattleState(live.battle, data.world!.battle, {
          existingUpdatedAt: live.updatedAt,
          incomingUpdatedAt: data.world!.updatedAt,
        });
        mergedOut = {
          ...data.world!,
          campaignNodeId: campaign.campaignNodeId,
          chapterId: campaign.chapterId,
          partyFlags: unionPartyFlags(stamped.partyFlags, data.world!.partyFlags),
          // Null must win when we intentionally cleared an early ending.
          endingId: campaign.endingId,
          alignment: campaign.alignment,
          pathway: campaign.pathway ?? data.world!.pathway,
          turnIndex: Math.max(stamped.turnIndex ?? 0, data.world!.turnIndex ?? 0),
          // This POST owns the trail: abandon stays cleared; start/advance keep the run
          // even if a laggy merge reply briefly omitted activeSideQuest.
          activeSideQuest:
            stamped.activeSideQuest == null
              ? null
              : preferActiveSideQuest(stamped.activeSideQuest, data.world!.activeSideQuest),
          ...clocks,
          battle,
        };
        return mergedOut;
      });
      writeWorld(mergedOut);
      setTitleSave(mergedOut);
      return mergedOut;
    }
    return stamped;
  }, []);

  const persist = useCallback((next: PartyWorldSave) => {
    void persistAsync(next).catch(() => undefined);
  }, [persistAsync]);

  const saveNow = useCallback(async () => {
    if (!world) return;
    setSaveStatus("saving");
    try {
      await persistAsync(world);
      setSaveStatus("saved");
      setFlash("Chronicle saved.");
    } catch {
      setSaveStatus("error");
      setFlash("Save failed — kept a local copy on this device.");
    }
  }, [world, persistAsync]);

  const storyNode = world ? getStoryNode(world.campaignNodeId) : null;
  const chapter = world ? chapterForNode(world.campaignNodeId) : null;
  const me = world && mySlot ? world.characters[mySlot] : null;
  const activeChar = world ? world.characters[world.activeSlot] : null;
  const hotbarView = activeChar ? describeHotbar(activeChar) : [];

  const startCampaign = () => {
    if (!identity.isDm) {
      setFlash("Only Justin (DM) can start a new campaign.");
      return;
    }
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
    setFlash(existing.endingId ? "Finale restored — you can rewind and keep playing." : "Save restored.");
  };

  const keepPlayingFromEnding = () => {
    const existing = world ?? titleSave ?? loadWorld();
    if (!existing) {
      setFlash("No save found.");
      return;
    }
    // Force a playable landmark — don't rely on soft rescue that sync can ignore.
    const flags = Array.from(
      new Set([...(existing.partyFlags ?? []), "rescued-from-early-ending", "visited:ch2-goblin-road"])
    );
    const fixed: PartyWorldSave = {
      ...existing,
      endingId: null,
      campaignNodeId: "node-ch2-road",
      chapterId: "ch2-goblin-road",
      encounterEnemyHp: null,
      deckEncounter: null,
      partyFlags: flags,
      updatedAt: new Date().toISOString(),
      log: [
        "Back on the Goblin Road — that ending plate was early. Keep playing the main road.",
        ...existing.log,
      ].slice(0, 80),
    };
    setPhase("play");
    setTab("story");
    setFlash("Back on the Goblin Road — choices should appear again.");
    void persistAsync(fixed)
      .then((saved) => {
        setWorld(saved);
        setTitleSave(saved);
      })
      .catch(() => {
        writeWorld(fixed);
        setWorld(fixed);
        setTitleSave(fixed);
        setFlash("Saved locally — retry Save if the map jumps back.");
      });
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
      const next = acknowledgeNarrative(world, storyActor);
      persist(next);
      if (next.campaignNodeId === world.campaignNodeId) {
        const gate = progressGateForNode(world, storyNode.next);
        setFlash(
          !gate.ok && gate.reason
            ? gate.reason
            : (next.log[0] ?? "The road ahead isn't open yet — try Camp, then return via Comic.")
        );
        setTab("camp");
      } else {
        setTab("story");
      }
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
    // Prefer full turn-based battle overlay; fall back to legacy deck if already fighting.
    if (world.battle?.status === "active") {
      setFlash("Already in battle.");
      return;
    }
    const result = startRandomBattle(world);
    persist(result.world);
    setFlash(result.message);
    setTab("story");
  };

  const onBattleAction = (action: BattleActionId, opts?: { spellId?: string; itemId?: string; x?: number; y?: number }) => {
    if (!world || !mySlot) return;
    startTransition(() => {
      const result = performBattleAction(world, mySlot, action, opts);
      persist(result.world);
      setFlash(result.message);
    });
  };

  const onDismissBattle = () => {
    if (!world) return;
    const questLive = world.activeSideQuest?.status === "active";
    const next = dismissBattleSummary(world);
    persist(next);
    setFlash(
      questLive
        ? "Back to the side quest — trail clock still running."
        : "Back to the chronicle."
    );
  };

  const onReadSpellbook = (itemId: string) => {
    if (!world || !mySlot) return;
    const result = readSpellbook(world, mySlot, itemId);
    persist(result.world);
    setFlash(result.message);
  };

  const onFleeRoad = () => {
    if (!world || !mySlot || !acting) return;
    const result = fleeRoadEncounter(world, mySlot);
    persist(result.world);
    setFlash(result.message);
  };

  const onCampSleep = () => {
    if (!world || !mySlot || !acting) return;
    const result = sleepAtCamp(world, mySlot, { isDm: identity.isDm });
    persist(result.world);
    setFlash(result.message);
  };

  const onBuyMerchant = (itemId: string) => {
    if (!world || !mySlot || !acting) return;
    const beforeGold = world.characters[mySlot]?.gold ?? 0;
    const result = buyFromCampMerchant(world, mySlot, itemId, { isDm: identity.isDm });
    persist(result.world);
    setFlash(result.message);
    const afterGold = result.world.characters[mySlot]?.gold ?? 0;
    if (afterGold < beforeGold) {
      setMerchantSold({
        id: Date.now(),
        spent: beforeGold - afterGold,
        goldLeft: afterGold,
      });
    }
  };

  const onSideQuest = (questId: string) => {
    if (!world || !mySlot || !acting) return;
    const result = startSideQuest(world, mySlot, questId, { isDm: identity.isDm });
    persist(result.world);
    setFlash(result.message);
    setQuestPanelOpen(true);
    setTab("camp");
  };

  const onQuestAdvance = () => {
    if (!world || !mySlot || !acting) return;
    const result = advanceSideQuest(world, mySlot, { isDm: identity.isDm });
    persist(result.world);
    setFlash(result.message);
    if (result.world.battle?.status === "active") setTab("story");
    if (!result.world.activeSideQuest) {
      setQuestPanelOpen(true);
      setTab("story");
      setFlash(`${result.message} — back on the main quest.`);
    }
  };

  const onQuestAbandon = () => {
    if (!world || !mySlot || !acting) return;
    const result = abandonSideQuest(world, mySlot, { isDm: identity.isDm });
    let next = result.world;
    if (next.battle?.status === "victory" || next.battle?.status === "defeat") {
      next = dismissBattleSummary(next);
    }
    persist(next);
    setFlash(`${result.message} — resume the main quest on Comic.`);
    setQuestPanelOpen(true);
    setTab("story");
  };

  const onQuestDismissFailed = () => {
    if (!world) return;
    persist(dismissFailedQuest(world));
    setQuestPanelOpen(true);
    setTab("story");
  };

  const returnToMainQuest = () => {
    if (
      world &&
      (world.battle?.status === "victory" || world.battle?.status === "defeat")
    ) {
      persist(dismissBattleSummary(world));
    }
    setQuestPanelOpen(false);
    setTab("story");
    setFlash("Main quest open — side trail is parked (clock still runs).");
  };

  const resumeSideQuestPanel = () => {
    setQuestPanelOpen(true);
    setTab("camp");
  };

  const onCook = (recipeId: string) => {
    if (!world || !mySlot || !acting) return;
    const result = cookRecipe(world, mySlot, recipeId);
    persist(result.world);
    setFlash(result.message);
  };

  const onStumbleChest = () => {
    if (!world || !mySlot || !acting) return;
    const result = stumbleOnChest(world, mySlot);
    persist(result.world);
    setFlash(result.message);
  };

  const onDigHole = () => {
    if (!world || !mySlot || !acting) return;
    const result = digForLoot(world, mySlot);
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
    setFlash(`Equipped ${getGear(itemId)?.name ?? itemId}.`);
  };

  const onUnequip = (slot: EquipSlot) => {
    if (!world || !mySlot) return;
    const result = engineUnequip(world.characters[mySlot], slot);
    if ("error" in result) {
      setFlash(result.error);
      return;
    }
    persist({ ...world, characters: { ...world.characters, [mySlot]: result } });
    setFlash(`Unequipped ${slot}.`);
  };

  const onSalvage = (itemId: string) => {
    if (!world || !mySlot) return;
    const result = salvageInventoryItem(world.characters[mySlot], itemId);
    if ("error" in result) {
      setFlash(result.error);
      return;
    }
    persist({
      ...world,
      characters: { ...world.characters, [mySlot]: result.char },
      log: [
        `Broke down ${result.name} for ${result.gold}g.`,
        ...world.log,
      ].slice(0, 80),
    });
    setFlash(`Broke down ${result.name} → +${result.gold}g scrap.`);
  };

  const onUseConsumable = (itemId: string) => {
    if (!world || !mySlot) return;
    const before = world.characters[mySlot];
    const result = useInventoryConsumable(before, itemId);
    if ("error" in result) {
      setFlash(result.error);
      return;
    }
    const item = getGear(itemId);
    const bits: string[] = [];
    if (item?.heal) bits.push(`+${item.heal} HP`);
    if (item?.manaRestore) bits.push(`+${item.manaRestore} Mana`);
    if (item?.staminaRestore || item?.tags.includes("stamina")) {
      bits.push(`+${item.staminaRestore ?? 15} Stam`);
    }
    persist({ ...world, characters: { ...world.characters, [mySlot]: result } });
    setFlash(`Used ${item?.name ?? itemId}${bits.length ? ` (${bits.join(", ")})` : ""}.`);
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
    const mustCreate =
      !!mySlot && !!resume && !resume.characters[mySlot]?.created && worldHasProgress(resume);
    const missing = resume
      ? PLAYER_SLOT_ORDER.filter((s) => !resume.characters[s]?.created).map(
          (s) => SLOT_DEFAULTS[s].displayName
        )
      : [];
    return (
      <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
        <DowntownSubnav active="neverworld" />
        {flash && (
          <div className="pc-turn-banner" role="status" data-forest="true">
            {flash}
          </div>
        )}
        <div className="pc-panel-jagged p-8 text-center space-y-4 max-w-lg mx-auto">
          <p className="pc-eyebrow">Haven PM · Downtown</p>
          <h1 className="pc-title text-4xl md:text-5xl">Neverworld</h1>
          <p className="text-sm leading-relaxed">{NEVERWORLD_HERITAGE.title}</p>
          <p className="text-xs opacity-80">
            Four heroes, four hounds · Justin → Rusty → Elisha → Eric · Pathways (Giver/Taker) · R.O.C. checks
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
                <li>player4@havenpm.com — Eric Prendergast</li>
              </ul>
            </div>
          )}
          {canContinue && resume && (
            <div className="pc-panel p-3 text-left text-xs space-y-1">
              <p className="pc-eyebrow text-[0.65rem]">Saved chronicle</p>
              <p>{saveSummary(resume)}</p>
              {missing.length > 0 && (
                <p style={{ color: "var(--pc-accent)" }}>
                  Still need hero sheets: {missing.join(", ")}
                </p>
              )}
            </div>
          )}
          {mustCreate && (
            <div className="pc-turn-banner" data-forest="true">
              Justin started the game — create {SLOT_DEFAULTS[mySlot!].displayName} to join the party
            </div>
          )}
          <div className="flex flex-col sm:flex-row gap-3 justify-center items-center pt-2">
            {canContinue && (
              <button
                type="button"
                className="pc-primary-btn"
                onClick={resume?.endingId ? keepPlayingFromEnding : continueCampaign}
              >
                {resume?.endingId
                  ? "Keep Playing"
                  : mustCreate
                    ? `Create ${SLOT_DEFAULTS[mySlot!].displayName}`
                    : "Continue"}
              </button>
            )}
            <button
              type="button"
              className={canContinue ? "pc-chip" : "pc-primary-btn"}
              onClick={startCampaign}
              disabled={!identity.isDm && canContinue}
              title={!identity.isDm && canContinue ? "Only Justin (DM) can start a new campaign" : undefined}
            >
              New Campaign
            </button>
          </div>
          {canContinue && identity.isDm && (
            <p className="text-[0.65rem] opacity-70">New Campaign asks before erasing the save.</p>
          )}
          {canContinue && !identity.isDm && (
            <p className="text-[0.65rem] opacity-70">
              Join the live campaign — only Justin can reset/new.
            </p>
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
        world={world}
        onSave={(char) => {
          const next = {
            ...world,
            characters: { ...world.characters, [mySlot]: char },
            log: [`${char.name} joins with ${char.dog.name}.`, ...world.log].slice(0, 80),
          };
          setSaveStatus("saving");
          void persistAsync(next)
            .then((saved) => {
              const ready = PLAYER_SLOT_ORDER.every((s) => saved.characters[s].created);
              const stillWaiting = PLAYER_SLOT_ORDER.filter((s) => !saved.characters[s].created).map(
                (s) => SLOT_DEFAULTS[s].displayName
              );
              setPhase("play");
              setSaveStatus("saved");
              setFlash(
                ready
                  ? "Character saved to the party chronicle."
                  : `Character saved. Still waiting on ${stillWaiting.join(" & ")}. It's ${SLOT_DEFAULTS[saved.activeSlot].displayName}'s turn.`
              );
            })
            .catch(() => {
              setSaveStatus("error");
              setFlash("Character kept on this device, but server save failed — hit Save again.");
              setPhase("play");
            });
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
          <div className="flex flex-wrap gap-3 justify-center pt-2">
            <button type="button" className="pc-primary-btn" onClick={keepPlayingFromEnding}>
              Keep Playing
            </button>
            <button type="button" className="pc-chip" onClick={leaveToTitle}>
              Return to Title
            </button>
          </div>
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
  const battleActive = world.battle?.status === "active";
  const inBattle = !!world.battle;
  const questRunActive = world.activeSideQuest?.status === "active";
  const mainProgress = campaignProgressReport(world);
  // Victory/defeat summaries always show (loot/XP + dismiss). Active fights keep
  // current priority over a parked quest panel when the battle is live.
  const battleSummaryOpen =
    world.battle?.status === "victory" || world.battle?.status === "defeat";
  const showBattleOverlay = !!world.battle && (battleActive || battleSummaryOpen);
  const showQuestOverlay =
    !!world.activeSideQuest &&
    questPanelOpen &&
    !battleActive &&
    !battleSummaryOpen;
  const showParkedQuestBanner =
    questRunActive && !questPanelOpen && !battleActive && !battleSummaryOpen;
  const hasChoices =
    storyNode.kind === "conversation" || storyNode.kind === "path" || storyNode.kind === "encounter";
  const sideQuests = availableSideQuests(world);
  const actNum = getChapter(world.chapterId)?.chapter ?? 1;
  const campRecipes = mySlot ? cookableRecipes(world, mySlot) : [];
  const bestiary = bestiaryStats();
  const storySecs = Math.floor((world.storyPlayMs ?? 0) / 1000);
  const untilBattle = Math.max(
    0,
    Math.ceil(((world.nextEncounterAtMs ?? 0) - (world.storyPlayMs ?? 0)) / 1000)
  );
  const nextStoryId =
    storyNode.kind === "narrative" || storyNode.kind === "montage" ? storyNode.next : null;
  const nextGate = nextStoryId ? progressGateForNode(world, nextStoryId) : { ok: true as const };
  const sleepBlocked =
    !acting ||
    inRoadFight ||
    battleActive ||
    inStoryFight ||
    questRunActive ||
    campSleepsRemaining(world) <= 0;
  let campSleepHint: string | null = null;
  if (questRunActive) {
    campSleepHint = "Park or finish the side quest before sleeping.";
  } else if (battleActive || inRoadFight || inStoryFight) {
    campSleepHint = "Finish the battle before sleeping.";
  } else if (!acting) {
    campSleepHint = "Not your turn.";
  } else if (campSleepsRemaining(world) <= 0) {
    const waitMin = Math.max(1, Math.ceil(campSleepCooldownMs(world) / 60_000));
    campSleepHint = `Next sleep in ~${waitMin}m.`;
  }

  return (
    <div className="downtown-shell party-comic party-rpg90s party-chronicle space-y-5">
      <DowntownSubnav active="neverworld" />
      {showBattleOverlay && world.battle && (
        <BattleOverlay
          world={world}
          mySlot={mySlot}
          canAct={!!mySlot && !!world.characters[mySlot]?.created}
          pending={pending}
          onAction={onBattleAction}
          onDismiss={onDismissBattle}
        />
      )}
      {showQuestOverlay && world.activeSideQuest && (
        <SideQuestOverlay
          quest={world.activeSideQuest}
          canAct={acting}
          inBattle={false}
          mainQuestLabel={mainProgress.detail}
          onAdvance={onQuestAdvance}
          onAbandon={onQuestAbandon}
          onDismissFailed={onQuestDismissFailed}
          onReturnToMain={returnToMainQuest}
        />
      )}
      {questRunActive && battleActive && (
        <div className="pc-turn-banner" data-forest="true" role="status">
          Quest “{world.activeSideQuest!.title}” — trail clock still running during battle
        </div>
      )}
      {showParkedQuestBanner && world.activeSideQuest && (
        <div className="pc-turn-banner" data-forest="true" role="status">
          <span>
            Side trail parked: {world.activeSideQuest.title} — main quest is live (
            {mainProgress.label})
          </span>
          <button type="button" className="pc-chip ml-2" onClick={resumeSideQuestPanel}>
            Resume side quest
          </button>
          <button
            type="button"
            className="pc-chip ml-2"
            onClick={() => {
              setTab("story");
              setFlash(`Main quest: ${mainProgress.nodeTitle}`);
            }}
          >
            Open Comic
          </button>
        </div>
      )}
      {flash && (
        <div className="pc-turn-banner" role="status">
          {flash}
        </div>
      )}

      <div className="pc-header-bar px-4 py-3 flex flex-wrap items-end justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="pc-eyebrow text-[0.65rem]" style={{ color: "var(--pc-ink)" }}>
            {chapter
              ? `Act ${mainProgress.chapterNum} · ${chapter.title}`
              : "Neverworld"}
          </p>
          <h1 className="pc-title text-2xl md:text-3xl">{storyNode.title}</h1>
          <p className="text-xs font-bold">
            Turn {world.turnIndex} · Party ~L{partyAvgLevel(world)} · {progressionHint(partyAvgLevel(world))}
            {" · "}
            Story {Math.floor(storySecs / 60)}:{String(storySecs % 60).padStart(2, "0")}
            {!inBattle ? ` · Next ambush ~${untilBattle}s` : " · In battle"}
            {me ? ` · ${me.gold}g` : ""}
          </p>
          <div className="pc-main-progress mt-2" aria-label="Main quest progress">
            <div className="pc-main-progress-meta">
              <span>{mainProgress.label}</span>
              <span>
                comic Act {mainProgress.chapterNum}/{mainProgress.chapterTotal}
              </span>
            </div>
            <div className="pc-main-progress-track">
              <div
                className="pc-main-progress-fill"
                style={{
                  width: `${Math.max(mainProgress.percent, mainProgress.percent > 0 ? 0.4 : 0)}%`,
                }}
              />
            </div>
            <p className="pc-main-progress-detail">{mainProgress.detail}</p>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 items-center">
          {me && (
            <span className="pc-chip" aria-label="Gold" title="Your gold">
              {me.gold}g
            </span>
          )}
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
              : `Story open — ${SLOT_DEFAULTS[world.activeSlot].displayName}'s seat, anyone sealed can choose`
            : mySlot && !meReady
              ? `Create ${SLOT_DEFAULTS[mySlot].displayName} before you can play`
              : "Log in with a party account to choose"
          : acting
            ? `${SLOT_DEFAULTS[world.activeSlot].displayName}'s turn — your move!`
            : `${SLOT_DEFAULTS[world.activeSlot].displayName}'s turn — watch the panel`}
        {pending ? " …" : ""}
      </div>

      {waitingOnCreate.length > 0 && (
        <p className="text-xs font-bold text-center" style={{ color: "var(--pc-accent)" }}>
          Waiting on character create:{" "}
          {waitingOnCreate.map((s) => SLOT_DEFAULTS[s].displayName).join(", ")}. They should log in
          as player2@ / player3@ and seal a hero.
        </p>
      )}

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
                    {!c.created ? " · NEED CREATE" : ""}
                  </p>
                  <p className="text-[0.65rem]">
                    {c.created
                      ? `${CLASS_DEFS[c.classId].name} · Lv ${c.level}`
                      : "Waiting on character create"}
                  </p>
                  <Meter label="HP" value={c.hp} max={c.maxHp} tone="hp" />
                  <Meter label="Mana" value={c.mana} max={c.maxMana} tone="mana" />
                  {c.created && <XpMeter xp={c.xp} compact />}
                  <p className="text-[0.6rem] mt-1">
                    {c.created ? `${c.dog.name} (bond ${c.dog.bond})` : "No hound sealed yet"}
                  </p>
                </div>
              </div>
            );
          })}
          <div className="pt-2">
            <p className="pc-eyebrow text-[0.65rem]">Destiny · Pathway</p>
            <div className="flex flex-wrap gap-2 text-[0.65rem] font-bold">
              <span>A {world.alignment.animal}</span>
              <span>H {world.alignment.human}</span>
              <span>D {world.alignment.demon}</span>
              <span>· {pathwayLabel(world.pathway ?? { giver: 0, taker: 0 })}</span>
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
                <img
                  src={sceneSrc(storyNode)}
                  alt={getComicArt(storyNode.sceneId ?? "")?.label ?? storyNode.title}
                  className="pc-scene-art"
                  onError={(e) => {
                    (e.target as HTMLImageElement).src = "/party-chronicle/scenes/missing.svg";
                  }}
                />
                {portraitSrc(storyNode) && (
                  <div className="pc-portrait-overlay">
                    <img
                      src={portraitSrc(storyNode)!}
                      alt={getComicArt(storyNode.artId ?? "")?.label ?? ""}
                      onError={(e) => {
                        (e.currentTarget as HTMLImageElement).style.display = "none";
                      }}
                    />
                  </div>
                )}
                <div className="pc-speed-lines" />
                {inEncounter && <div className="pc-action-burst" />}
                <p className="pc-scene-caption">{storyNode.title}</p>
              </div>

              <JourneyMinimap
                world={world}
                sideQuest={
                  world.activeSideQuest
                    ? {
                        questId: world.activeSideQuest.questId,
                        title: world.activeSideQuest.title,
                        sceneId: world.activeSideQuest.sceneId,
                      }
                    : null
                }
                focusSideQuest={questRunActive && questPanelOpen}
              />

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

              {storyNode.kind === "ending" && (
                <div className="space-y-2">
                  <p className="text-xs font-bold" style={{ color: "var(--pc-accent)" }}>
                    This ending plate has no choices — you hit it too early. Jump back to the main
                    road.
                  </p>
                  <button type="button" className="pc-primary-btn" onClick={keepPlayingFromEnding}>
                    Back to the main road →
                  </button>
                </div>
              )}

              {!hasChoices &&
                storyNode.kind !== "narrative" &&
                storyNode.kind !== "montage" &&
                storyNode.kind !== "ending" &&
                !inEncounter && (
                  <button type="button" className="pc-choice" disabled={!canStory} onClick={onContinue}>
                    Continue →
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
              <div className="pc-main-quest-card">
                <p className="pc-eyebrow text-[0.65rem]">Main quest · stay on track</p>
                <p className="font-bold text-sm">{mainProgress.nodeTitle}</p>
                <p className="text-[0.65rem] opacity-80 mt-1">{mainProgress.campBlurb}</p>
                {!nextGate.ok && nextGate.reason && (
                  <p className="text-[0.65rem] mt-2" style={{ color: "var(--pc-accent)" }}>
                    {nextGate.reason}
                  </p>
                )}
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    className="pc-primary-btn"
                    onClick={() => {
                      if (
                        storyNode.kind === "ending" ||
                        world.endingId ||
                        chapter?.id === "ch10-endings"
                      ) {
                        keepPlayingFromEnding();
                        return;
                      }
                      setTab("story");
                      setFlash(`Main quest: ${mainProgress.nodeTitle}`);
                    }}
                  >
                    {storyNode.kind === "ending" || world.endingId
                      ? "Back to the main road →"
                      : "Return to main quest →"}
                  </button>
                  {questRunActive && (
                    <button type="button" className="pc-chip" onClick={resumeSideQuestPanel}>
                      Open side quest panel
                    </button>
                  )}
                </div>
              </div>

              <p className="pc-eyebrow">Camp · Roads · Side quests</p>
              <p className="text-xs opacity-70">
                Side trails help unlock later chapters — park them anytime and resume Comic for the
                spine. Mid-act filler for {world.chapterId}.
              </p>

              <div className="space-y-2">
                <p className="pc-eyebrow text-[0.65rem]">
                  Rest · Sleep ({campSleepsRemaining(world)}/{CAMP_SLEEP_MAX} this{" "}
                  {CAMP_SLEEP_WINDOW_MS / 60_000}m)
                </p>
                <p className="text-xs opacity-70">
                  Sleep restores HP, mana, and stamina for the acting hero (and the hound). Up to{" "}
                  {CAMP_SLEEP_MAX} sleeps every {CAMP_SLEEP_WINDOW_MS / 60_000} real minutes.
                </p>
                <button
                  type="button"
                  className="pc-primary-btn"
                  disabled={sleepBlocked}
                  title={campSleepHint ?? "Sleep at camp — restore HP & mana"}
                  onClick={onCampSleep}
                >
                  Sleep at camp → restore HP &amp; mana
                </button>
                {campSleepHint && (
                  <p className="text-xs opacity-70" style={{ color: "var(--pc-accent)" }}>
                    {campSleepHint}
                  </p>
                )}
              </div>

              <div className="pc-merchant relative space-y-2">
                <p className="pc-eyebrow text-[0.65rem]">
                  Camp merchant · your purse {me?.gold ?? 0}g
                </p>
                <p className="text-xs opacity-70">
                  A traveling peddler — potions, rations, and a few weapons for coin.
                </p>
                {merchantSold && (
                  <div
                    key={merchantSold.id}
                    className="pc-merchant-sold"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="pc-merchant-sold-label">SOLD</span>
                    <span className="pc-merchant-sold-spend">−{merchantSold.spent}g</span>
                    <span className="pc-merchant-sold-purse">{merchantSold.goldLeft}g left</span>
                  </div>
                )}
                <div className="space-y-2">
                  {campMerchantStock().map((offer) => (
                    <button
                      key={offer.itemId}
                      type="button"
                      className="pc-choice block w-full text-left"
                      disabled={
                        !acting ||
                        inRoadFight ||
                        battleActive ||
                        inStoryFight ||
                        (me?.gold ?? 0) < offer.price
                      }
                      onClick={() => onBuyMerchant(offer.itemId)}
                    >
                      <strong>
                        {offer.name} — {offer.price}g
                      </strong>
                      <span className="block text-[0.65rem] opacity-70">
                        {offer.tier} · {offer.blurb}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-2">
                <p className="pc-eyebrow text-[0.65rem]">
                  Road battle · Bestiary {bestiary.creatures}+{bestiary.bosses} bosses
                </p>
                {inBattle ? (
                  <p className="text-sm font-bold">Battle in progress — finish the overlay.</p>
                ) : inRoadFight && roadFoe ? (
                  <>
                    <p className="text-sm font-bold">{roadFoe.name} (legacy hotbar fight)</p>
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
                    Force road ambush →
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <p className="pc-eyebrow text-[0.65rem]">
                  Trail luck · chests &amp; digging ({world.explorationFinds ?? 0} finds)
                </p>
                <p className="text-xs opacity-70">
                  Stumble on a chest or dig where the dogs paw — real catalog loot, gold, and XP.
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="pc-choice"
                    disabled={!acting || inRoadFight || inBattle || inStoryFight}
                    onClick={onStumbleChest}
                  >
                    Stumble on a treasure chest →
                  </button>
                  <button
                    type="button"
                    className="pc-choice"
                    disabled={!acting || inRoadFight || inBattle || inStoryFight}
                    onClick={onDigHole}
                  >
                    Dig a hole for loot →
                  </button>
                </div>
                {world.lastExploration && (
                  <div className="pc-codex-row text-xs">
                    <strong>{world.lastExploration.title}</strong>
                    <span className="block opacity-80 mt-1">{world.lastExploration.blurb}</span>
                    <span className="block opacity-70 mt-1">
                      {world.lastExploration.itemNames.join(", ") || "empty"} · +
                      {world.lastExploration.gold}g · +{world.lastExploration.xp} XP
                    </span>
                  </div>
                )}
              </div>

              <div className="space-y-2">
                <p className="pc-eyebrow text-[0.65rem]">
                  Side quests ({sideQuests.length} open · {(world.completedSideQuests ?? []).length}{" "}
                  done)
                </p>
                {world.activeSideQuest?.status === "active" && (
                  <p className="text-xs font-bold" style={{ color: "var(--pc-cyan)" }}>
                    On trail: {world.activeSideQuest.title} — use the quest panel (timer live)
                  </p>
                )}
                {sideQuests.length === 0 && !world.activeSideQuest && (
                  <p className="text-xs opacity-70">No open side quests for this chapter.</p>
                )}
                {sideQuests.map((q) => {
                  const onTrail =
                    world.activeSideQuest?.status === "active" &&
                    world.activeSideQuest.questId === q.id;
                  return (
                  <button
                    key={q.id}
                    type="button"
                    className="pc-choice block w-full text-left"
                    disabled={
                      !acting ||
                      inRoadFight ||
                      battleActive ||
                      world.activeSideQuest?.status === "active"
                    }
                    onClick={() => onSideQuest(q.id)}
                  >
                    <strong>
                      {onTrail ? "On trail · " : ""}
                      {q.title}
                    </strong>
                    <span className="block text-[0.65rem] opacity-70">
                      {q.kind} · {q.estimatedMinutes}m timed run · +{q.rewards.xp} XP · {q.summary}
                    </span>
                  </button>
                  );
                })}
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
            <InventoryPanel
              char={me}
              canEdit={!!mySlot}
              onEquip={onEquip}
              onUnequip={onUnequip}
              onUseConsumable={onUseConsumable}
              onReadSpellbook={onReadSpellbook}
              onSalvage={onSalvage}
            />
          )}

          {tab === "codex" && (
            <div className="space-y-2">
              <p className="pc-eyebrow">Campaign Codex (~{CODEX.totalHours}h)</p>
              <p className="text-xs leading-relaxed opacity-90">{NEVERWORLD_HERITAGE.codex}</p>
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
              <XpMeter xp={activeChar.xp} />
              <p className="text-sm font-bold mt-1" style={{ color: "var(--pc-accent)" }}>
                Gold {activeChar.gold}g
              </p>
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
  const prog = xpProgress(char.xp);
  return (
    <div className={`pc-panel p-3 bg-white/60 ${highlight ? "ring-2 ring-[var(--pc-cyan)]" : ""}`}>
      <p className="font-bold">
        {char.name} · {char.raceId ? `${RACE_DEFS[char.raceId].name} · ` : ""}
        {CLASS_DEFS[char.classId].name} · Lv {char.level}
      </p>
      <div className="mt-2 space-y-1">
        <Meter label="HP" value={char.hp} max={char.maxHp} tone="hp" />
        <Meter label="Mana" value={char.mana} max={char.maxMana} tone="mana" />
        {char.created && <XpMeter xp={char.xp} />}
      </div>
      <div className="pc-stat-grid mt-2">
        {STAT_KEYS.map((k) => (
          <div key={k} className="pc-stat-box">
            <strong>{STAT_LABELS[k]}</strong>
            {char.stats[k]}
          </div>
        ))}
      </div>
      <p className="text-[0.65rem] mt-2">
        {prog.level >= MAX_LEVEL
          ? `XP MAX · Gold ${char.gold}`
          : `XP ${prog.into}/${prog.need} toward Lv ${prog.level + 1} · Gold ${char.gold}`}{" "}
        · Dog: {char.dog.name} · Hotbar {char.hotbar.filter(Boolean).length}/{HOTBAR_SIZE}
      </p>
    </div>
  );
}

function InventoryPanel({
  char,
  canEdit,
  onEquip,
  onUnequip,
  onUseConsumable,
  onReadSpellbook,
  onSalvage,
}: {
  char: CharacterSave;
  canEdit: boolean;
  onEquip: (id: string) => void;
  onUnequip: (slot: EquipSlot) => void;
  onUseConsumable: (id: string) => void;
  onReadSpellbook: (id: string) => void;
  onSalvage: (id: string) => void;
}) {
  const catalog = gearCatalogStats();
  const worn = new Set(
    EQUIP_SLOTS.map((s) => char.equipped[s]).filter(Boolean) as string[]
  );

  return (
    <div className="space-y-4">
      <p className="pc-eyebrow">
        Paperdoll — {char.name} · catalog {catalog.total} items / {catalog.sets} sets
      </p>
      <PaperdollPanel char={char} canEdit={canEdit} onUnequip={onUnequip} />

      <p className="pc-eyebrow text-[0.65rem]">
        Inventory — Use potions &amp; food · Break down unequipped gear for scrap gold
      </p>
      <div className="pc-inv-grid" style={{ gridTemplateColumns: "repeat(auto-fill, minmax(8.5rem, 1fr))" }}>
        {char.inventory.map((id, idx) => {
          const item = getGear(id);
          if (!item) return null;
          const spellbook = isSpellbookItem(id);
          const consumable = item.slot === "consumable";
          const equippable =
            item.slot !== "consumable" && item.slot !== "misc" && !spellbook;
          const equipped = worn.has(id);
          const props = itemProperties(item).slice(0, 3);
          const usable =
            consumable &&
            ((item.heal ?? 0) > 0 ||
              (item.manaRestore ?? 0) > 0 ||
              (item.staminaRestore ?? 0) > 0 ||
              item.tags.includes("stamina") ||
              item.tags.includes("dog"));

          return (
            <div
              key={`${id}-${idx}`}
              className="pc-inv-card pc-gear-hover"
              data-tier={item.tier}
              data-equipped={equipped ? "true" : "false"}
            >
              <div className="pc-inv-card-name">
                {equipped ? "● " : ""}
                {item.name}
              </div>
              <div className="pc-inv-card-meta">
                {item.slot}
                {item.setId ? ` · set` : ""}
                {item.heal ? ` · +${item.heal} HP` : ""}
                {item.manaRestore ? ` · +${item.manaRestore} MP` : ""}
                {props.length
                  ? ` · ${props.map(formatProperty).join(", ")}`
                  : ""}
              </div>
              <div className="pc-inv-actions">
                {equippable && (
                  <button
                    type="button"
                    className="pc-btn-tiny"
                    disabled={!canEdit || equipped}
                    onClick={() => onEquip(id)}
                  >
                    {equipped ? "Worn" : "Equip"}
                  </button>
                )}
                {usable && (
                  <button
                    type="button"
                    className="pc-btn-tiny"
                    disabled={!canEdit}
                    onClick={() => onUseConsumable(id)}
                  >
                    Use
                  </button>
                )}
                {spellbook && (
                  <button
                    type="button"
                    className="pc-btn-tiny"
                    disabled={!canEdit}
                    onClick={() => onReadSpellbook(id)}
                  >
                    Read
                  </button>
                )}
                <button
                  type="button"
                  className="pc-btn-tiny"
                  disabled={!canEdit || equipped}
                  title={
                    equipped
                      ? "Unequip before breaking down"
                      : "Break down for scrap gold"
                  }
                  onClick={() => onSalvage(id)}
                >
                  Break down
                </button>
              </div>
              <GearTipBody item={item} />
            </div>
          );
        })}
      </div>
    </div>
  );
}

function CreatePhase({
  slot,
  base,
  world,
  onSave,
  onBack,
}: {
  slot: PlayerSlot;
  base: CharacterSave;
  world: PartyWorldSave;
  onSave: (char: CharacterSave) => void;
  onBack: () => void;
}) {
  const def = SLOT_DEFAULTS[slot];
  const initialClass = base.classId || def.suggestedClass;
  const skills = useMemo(() => listCreateSkills(), []);
  const magicOptions = useMemo(() => listCreateMagic(), []);
  const sealed = PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created).map(
    (s) => world.characters[s].name
  );
  const waiting = PLAYER_SLOT_ORDER.filter((s) => !world.characters[s]?.created && s !== slot).map(
    (s) => SLOT_DEFAULTS[s].displayName
  );
  const campaignStarted = worldHasProgress(world) && sealed.length > 0;

  const [name, setName] = useState(base.name || def.displayName);
  const [classId, setClassId] = useState<ClassId>(initialClass);
  const [raceId, setRaceId] = useState<RaceId>(base.raceId ?? "human");
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
  const previewBought = applyPointBuy(BLANK_BASE_STATS, bumps, STAT_POINT_BUY_POOL);
  const preview = previewBought ? applyRaceToStats(previewBought, raceId) : null;

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
      raceId,
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
      {campaignStarted && (
        <div className="pc-turn-banner" data-forest="true">
          Campaign already rolling — seal {def.displayName} to jump in. Turn:{" "}
          {SLOT_DEFAULTS[world.activeSlot].displayName}
        </div>
      )}
      <div className="pc-header-bar px-4 py-3">
        <h1 className="pc-title text-2xl">Create {def.displayName}</h1>
        <p className="text-xs font-bold">
          {NEVERWORLD_HERITAGE.create}
        </p>
        <p className="text-xs opacity-80">
          Blank stats · pick race, 1 weapon, 1 skill, and {magicNeeded} magic — wired to your hotbar.
        </p>
        {sealed.length > 0 && (
          <p className="text-[0.7rem] mt-1" style={{ color: "var(--pc-accent)" }}>
            Already in: {sealed.join(", ")}
            {waiting.length > 0 ? ` · Still needed: ${waiting.join(", ")}` : ""}
          </p>
        )}
      </div>
      <div className="grid gap-4 lg:grid-cols-3">
        <div className="pc-panel p-4 pc-create-form space-y-2">
          <label htmlFor="pc-name">Hero name</label>
          <input id="pc-name" value={name} onChange={(e) => setName(e.target.value)} />
          <label htmlFor="pc-race">Race</label>
          <select
            id="pc-race"
            value={raceId}
            onChange={(e) => setRaceId(e.target.value as RaceId)}
          >
            {RACE_IDS.map((id) => (
              <option key={id} value={id}>
                {RACE_DEFS[id].name}
              </option>
            ))}
          </select>
          <p className="text-xs mb-2">{RACE_DEFS[raceId].blurb}</p>
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
