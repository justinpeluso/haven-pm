"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { SimpleBattleOverlay } from "@/components/dungeon-tester/simple-battle-overlay";
import { DtGearSheet } from "@/components/dungeon-tester/dt-gear-sheet";
import { DtGearIcon } from "@/components/dungeon-tester/dt-gear-icon";
import { DtHeroFigure } from "@/components/dungeon-tester/dt-hero-figure";
import { DtLocalMap } from "@/components/dungeon-tester/dt-local-map";
import { DtWorldMap } from "@/components/dungeon-tester/dt-world-map";
import { DtPokeCard } from "@/components/dungeon-tester/dt-poke-card";
import {
  BLANK_BASE_STATS,
  listCreateMagic,
  listCreateSkills,
  magicSlotsForClass,
  weaponsForClass,
} from "@/lib/downtown/party-chronicle/create";
import { CLASS_DEFS, SLOT_DEFAULTS } from "@/lib/downtown/party-chronicle/players";
import { applyPointBuy } from "@/lib/downtown/party-chronicle/persist";
import { RACE_DEFS, RACE_IDS, type RaceId } from "@/lib/downtown/party-chronicle/races";
import type {
  ClassId,
  EquipSlot,
  PlayerIdentity,
  StatKey,
} from "@/lib/downtown/party-chronicle/types";
import { CLASS_IDS, PLAYER_SLOT_ORDER, STAT_KEYS } from "@/lib/downtown/party-chronicle/types";
import { xpProgress } from "@/lib/downtown/party-chronicle/progression";
import {
  DT_DEFAULT_SLOT_ID,
  DT_HAT_LABEL,
  DT_HATS,
  DT_HAIR_COLORS,
  DT_HAIR_LABEL,
  DT_HAIR_STYLES,
  DT_OUTFIT_HEX,
  DT_OUTFITS,
  DT_SKIN_TONES,
  DT_SLOT_IDS,
  DT_TARGET_PLAYTIME_HOURS,
  addPlaytime,
  asPartyWorld,
  campMerchantStock,
  campSleepCooldownMs,
  campSleepsRemaining,
  CAMP_SLEEP_MAX,
  CAMP_SLEEP_WINDOW_MS,
  chooseFrame,
  clearLocalDtWorld,
  clearSimpleBattleFx,
  continueFrame,
  createNewDtWorld,
  defaultDtHeroLook,
  dismissDtBattle,
  fleeDtBattle,
  claimSimpleBattleVictoryRewards,
  dtArtSrc,
  dtBuyFromCampMerchant,
  dtCampDisbandCompanion,
  dtCampDogFetch,
  dtCampFeedDog,
  dtCampMeanToDog,
  dtDigForLoot,
  dtDogCanFetch,
  dtDogJoinsBattle,
  dtEquipItem,
  dtForceAmbush,
  dtReadSpellbook,
  dtSalvageItem,
  dtSceneArtSrc,
  dtSleepAtCamp,
  dtStumbleOnChest,
  dtUnequipSlot,
  dtUseConsumable,
  dtLoadoutSummary,
  enterDtMapReplay,
  enterDtSideQuest,
  exitDtMapReplay,
  exitDtSideQuest,
  getDtSideQuest,
  isDtSideQuestTerminal,
  resolveDtSideQuestReward,
  formatPlaytimeHud,
  formatGearTier,
  gearTierAttr,
  getDtArt,
  getFrame,
  normalizeDtDog,
  getDtDogPokeCard,
  synthesizeCompanionPokeCard,
  sexLabel,
  normalizeDtHeroLook,
  resolveFrameBody,
  visibleFrameChoices,
  listLocalDtSlotSummaries,
  mergeDtWorld,
  mergeSimpleBattle,
  normalizeDtWorld,
  pickRicherDtWorld,
  advanceSimpleBattleEnemyPhase,
  markSimpleBattleSplashDone,
  performSimpleBattleAction,
  simpleBattleProgressScore,
  readActiveDtSlotId,
  readLocalDtWorld,
  sealDtCharacter,
  summarizeDtWorld,
  writeActiveDtSlotId,
  writeLocalDtWorld,
  type DtFrame,
  type DtHeroLook,
  type DtSaveSlotId,
  type DtSlotSummary,
  type DtWorldSave,
  type SimpleBattleActionId,
} from "@/lib/downtown/dungeon-tester";
import "@/components/party-chronicle/party-chronicle.css";
import "./dungeon-tester.css";

type Phase = "title" | "create" | "play";
type PlayTab = "story" | "camp" | "gear";

const STAT_POOL = 27;
const FALLBACK_PLATE = "/dungeon-tester/scenes/dusty-trail.svg";

/** Tertiary escape links — only for screens without the play location bar. */
function DtBackBar({
  backs,
}: {
  backs: Array<{
    label: string;
    onClick?: () => void;
    href?: string;
    primary?: boolean;
    disabled?: boolean;
  }>;
}) {
  if (!backs.length) return null;
  return (
    <div className="dt-actions dt-back-row" role="navigation" aria-label="Back">
      {backs.map((b) =>
        b.href ? (
          <Link key={b.label} href={b.href} className="dt-btn" data-variant="tertiary">
            ← {b.label}
          </Link>
        ) : (
          <button
            key={b.label}
            type="button"
            className="dt-btn"
            data-variant={b.primary ? "primary" : "tertiary"}
            disabled={b.disabled}
            onClick={b.onClick}
          >
            ← {b.label}
          </button>
        )
      )}
    </div>
  );
}

function hpStatusLabel(hp: number, maxHp: number): string {
  if (hp <= 0) return "Down";
  const pct = hp / Math.max(1, maxHp);
  if (pct >= 0.7) return "Healthy";
  if (pct >= 0.35) return "Wounded";
  return "Critical";
}

function DtPartySeat({
  slot,
  char,
  isYou,
  isTurn,
}: {
  slot: (typeof PLAYER_SLOT_ORDER)[number];
  char: DtWorldSave["characters"][(typeof PLAYER_SLOT_ORDER)[number]] | undefined;
  isYou?: boolean;
  isTurn?: boolean;
}) {
  const sealed = !!char?.created;
  const status = sealed && char ? hpStatusLabel(char.hp, char.maxHp) : "Unsealed";
  return (
    <div
      className="dt-seat"
      data-sealed={sealed ? "true" : "false"}
      data-you={isYou ? "true" : "false"}
      data-turn={isTurn ? "true" : "false"}
      data-status={sealed ? status.toLowerCase() : "empty"}
    >
      <div className="dt-seat-portrait">
        {sealed && char ? (
          <DtHeroFigure
            look={normalizeDtHeroLook(char.dtLook, slot)}
            compact
            className="dt-seat-figure"
          />
        ) : (
          <span className="dt-seat-empty" aria-hidden>
            ?
          </span>
        )}
      </div>
      <div className="dt-seat-body">
        <div className="dt-seat-slot">
          {SLOT_DEFAULTS[slot].displayName}
          {isYou ? " · you" : ""}
          {isTurn ? " · turn" : ""}
        </div>
        {sealed && char ? (
          <>
            <strong className="dt-seat-name">{char.name}</strong>
            <div className="dt-seat-stats">
              <span>Lv {char.level}</span>
              <span className="dt-seat-hp">
                {char.hp}/{char.maxHp} HP
              </span>
              <span>{char.gold}g</span>
            </div>
            <div className="dt-seat-status" data-status={status.toLowerCase()}>
              {status}
            </div>
            <div className="dt-seat-bar" aria-hidden>
              <span
                style={{
                  width: `${Math.max(0, Math.min(100, Math.round((char.hp / Math.max(1, char.maxHp)) * 100)))}%`,
                }}
              />
            </div>
          </>
        ) : (
          <div className="dt-seat-name dt-seat-open">Need create</div>
        )}
      </div>
    </div>
  );
}

function frameSceneSrc(frame: Pick<DtFrame, "sceneId" | "artId"> | null | undefined): string {
  if (frame?.sceneId) return dtSceneArtSrc(frame.sceneId);
  if (frame?.artId) return dtArtSrc(frame.artId);
  return dtSceneArtSrc(null);
}

/** Subject plate when artId is distinct from the scene backdrop (enemy / portrait / etc.). */
function frameSubjectSrc(frame: Pick<DtFrame, "sceneId" | "artId"> | null | undefined): string | null {
  if (!frame?.artId) return null;
  if (frame.sceneId && frame.artId === frame.sceneId) return null;
  const entry = getDtArt(frame.artId);
  if (!entry || entry.kind === "scene" || entry.kind === "splash" || entry.kind === "frame") {
    return null;
  }
  return dtArtSrc(frame.artId);
}

export function DungeonTesterGame({ identity }: { identity: PlayerIdentity }) {
  const mySlot = identity.slot;
  const [phase, setPhase] = useState<Phase>("title");
  const [tab, setTab] = useState<PlayTab>("story");
  const [worldMapOpen, setWorldMapOpen] = useState(false);
  const [world, setWorld] = useState<DtWorldSave | null>(null);
  const [activeSlotId, setActiveSlotId] = useState<DtSaveSlotId>(DT_DEFAULT_SLOT_ID);
  const [slotSummaries, setSlotSummaries] = useState<DtSlotSummary[]>(() =>
    DT_SLOT_IDS.map((id) => summarizeDtWorld(id, null))
  );
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [merchantSold, setMerchantSold] = useState<{
    id: number;
    spent: number;
    goldLeft: number;
  } | null>(null);
  const playTickRef = useRef<number | null>(null);
  const activeSlotRef = useRef<DtSaveSlotId>(DT_DEFAULT_SLOT_ID);
  activeSlotRef.current = activeSlotId;
  const worldRef = useRef(world);
  // Never clobber eager persist stamps with a stale React snapshot on render.
  useEffect(() => {
    if (!world) {
      worldRef.current = null;
      return;
    }
    const cur = worldRef.current;
    if (!cur) {
      worldRef.current = world;
      return;
    }
    if (
      cur.battle &&
      world.battle &&
      cur.battle.id === world.battle.id &&
      simpleBattleProgressScore(cur.battle) > simpleBattleProgressScore(world.battle)
    ) {
      return;
    }
    if (cur.updatedAt && world.updatedAt && cur.updatedAt > world.updatedAt) {
      return;
    }
    worldRef.current = world;
  }, [world]);

  const refreshSlotSummaries = useCallback((serverSlots?: DtSlotSummary[]) => {
    if (serverSlots?.length) {
      setSlotSummaries(serverSlots);
      return;
    }
    setSlotSummaries(listLocalDtSlotSummaries());
  }, []);

  const persist = useCallback(
    (next: DtWorldSave, opts?: { sync?: boolean; slotId?: DtSaveSlotId }) => {
      const slotId = opts?.slotId ?? activeSlotRef.current;
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      // Sync worldRef before paint so enemy-advance / action timers never see a
      // stale phase and double-fire (looked like auto-combat + flash).
      worldRef.current = stamped;
      setWorld(stamped);
      writeLocalDtWorld(stamped, slotId);
      refreshSlotSummaries();
      if (opts?.sync === false) return;
      void fetch("/api/downtown/dungeon-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world: stamped, slotId }),
      })
        .then(async (res) => {
          if (!res.ok) return;
          const data = (await res.json()) as {
            world?: DtWorldSave;
            slots?: DtSlotSummary[];
          };
          if (data.slots) refreshSlotSummaries(data.slots);
          if (data.world && slotId === activeSlotRef.current) {
            // Merge against *current* world — never use stale closure stamped alone.
            // Out-of-order POSTs were rolling enemy-advance back to phase:"enemy".
            setWorld((prev) => {
              const base = prev ?? stamped;
              // This POST cleared the fight (flee/dismiss) — never resurrect it.
              if (!stamped.battle) {
                const next = normalizeDtWorld({
                  ...mergeDtWorld(
                    base,
                    normalizeDtWorld(data.world!),
                    mySlot,
                    identity.isDm,
                    { seatTie: "existing" }
                  ),
                  battle: null,
                  clearedBattleId:
                    stamped.clearedBattleId ??
                    base.clearedBattleId ??
                    prev?.clearedBattleId ??
                    null,
                  storyPlayMs: Math.max(base.storyPlayMs ?? 0, stamped.storyPlayMs ?? 0),
                  framesAdvanced: Math.max(
                    base.framesAdvanced ?? 0,
                    stamped.framesAdvanced ?? 0
                  ),
                });
                worldRef.current = next;
                writeLocalDtWorld(next, slotId);
                return next;
              }
              const merged = mergeDtWorld(
                base,
                normalizeDtWorld(data.world!),
                mySlot,
                identity.isDm,
                { seatTie: "existing" }
              );
              let localBattle = mergeSimpleBattle(base.battle, merged.battle);
              const cleared = stamped.clearedBattleId || base.clearedBattleId;
              if (cleared && localBattle?.id === cleared) localBattle = null;
              const next = normalizeDtWorld({
                ...merged,
                battle: localBattle,
                clearedBattleId: cleared ?? merged.clearedBattleId ?? null,
                storyPlayMs: Math.max(base.storyPlayMs ?? 0, merged.storyPlayMs ?? 0),
                framesAdvanced: Math.max(
                  base.framesAdvanced ?? 0,
                  merged.framesAdvanced ?? 0
                ),
              });
              worldRef.current = next;
              writeLocalDtWorld(next, slotId);
              return next;
            });
          }
        })
        .catch(() => {
          /* offline ok — local save holds */
        });
    },
    [identity.isDm, mySlot, refreshSlotSummaries]
  );

  const applyBootWorld = useCallback(
    (
      slotId: DtSaveSlotId,
      server: DtWorldSave | null,
      local: DtWorldSave | null,
      serverSlots?: DtSlotSummary[]
    ) => {
      writeActiveDtSlotId(slotId);
      setActiveSlotId(slotId);
      const richer = pickRicherDtWorld(
        server ? normalizeDtWorld(server) : null,
        local
      );
      let merged: DtWorldSave | null = richer;
      if (server && local) {
        merged = mergeDtWorld(
          normalizeDtWorld(server),
          local,
          mySlot,
          identity.isDm
        );
        // Prefer local sealed sheet for my seat if richer; keep peer seals from server.
        const characters = { ...merged.characters };
        for (const s of PLAYER_SLOT_ORDER) {
          const remote = server.characters[s];
          const loc = local.characters[s];
          if (remote?.created && !loc?.created) characters[s] = remote;
          else if (loc?.created && !remote?.created) characters[s] = loc;
          else if (remote?.created && loc?.created) {
            const rScore =
              (remote.choiceLog?.length ?? 0) + remote.xp + remote.level * 10;
            const lScore = (loc.choiceLog?.length ?? 0) + loc.xp + loc.level * 10;
            characters[s] = lScore >= rScore ? loc : remote;
          }
        }
        merged = normalizeDtWorld({ ...merged, characters });
      }
      if (merged) {
        worldRef.current = merged;
        setWorld(merged);
        writeLocalDtWorld(merged, slotId);
        if (
          local &&
          (!server ||
            (local.framesAdvanced ?? 0) > (server.framesAdvanced ?? 0) ||
            (mySlot && local.characters[mySlot]?.created && !server.characters[mySlot]?.created))
        ) {
          void fetch("/api/downtown/dungeon-tester", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ world: merged, slotId }),
          }).catch(() => undefined);
        }
      } else {
        worldRef.current = null;
        setWorld(null);
      }
      refreshSlotSummaries(serverSlots);
    },
    [identity.isDm, mySlot, refreshSlotSummaries]
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const slotId = readActiveDtSlotId();
      const local = readLocalDtWorld(slotId);
      try {
        const res = await fetch(`/api/downtown/dungeon-tester?slot=${slotId}`);
        if (res.ok) {
          const data = (await res.json()) as {
            world: DtWorldSave | null;
            hasSave: boolean;
            slots?: DtSlotSummary[];
            activeSlotId?: DtSaveSlotId;
          };
          if (!cancelled) {
            applyBootWorld(slotId, data.world, local, data.slots);
            setBootstrapped(true);
            return;
          }
        }
      } catch {
        /* use local */
      }
      if (!cancelled) {
        applyBootWorld(slotId, null, local);
        setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [applyBootWorld]);

  // Visible campaign playtime toward ~30h (not battle pressure clocks).
  useEffect(() => {
    if (phase !== "play" || !world) return;
    if (playTickRef.current) window.clearInterval(playTickRef.current);
    playTickRef.current = window.setInterval(() => {
      const slotId = activeSlotRef.current;
        setWorld((prev) => {
          if (!prev) return prev;
          const next = addPlaytime(prev, 1000);
          worldRef.current = next;
          writeLocalDtWorld(next, slotId);
          return next;
        });
      }, 1000);
    return () => {
      if (playTickRef.current) window.clearInterval(playTickRef.current);
    };
  }, [phase, !!world]);

  // Periodic API sync of playtime / progress.
  useEffect(() => {
    if (phase !== "play" || !world) return;
    const id = window.setInterval(() => {
      const slotId = activeSlotRef.current;
      const local = readLocalDtWorld(slotId);
      if (!local) return;
      void fetch("/api/downtown/dungeon-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world: local, slotId }),
      }).catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(id);
  }, [phase, !!world]);

  // Pull peer seals / campaign so late joiners see the party without refresh.
  useEffect(() => {
    if (phase !== "play" && phase !== "create") return;
    let cancelled = false;
    const tick = async () => {
      const slotId = activeSlotRef.current;
      try {
        const res = await fetch(`/api/downtown/dungeon-tester?slot=${slotId}`);
        if (!res.ok || cancelled) return;
        const data = (await res.json()) as {
          world: DtWorldSave | null;
          slots?: DtSlotSummary[];
        };
        const remote = data.world;
        if (data.slots) refreshSlotSummaries(data.slots);
        if (!remote || cancelled) return;
        setWorld((prev) => {
          const base = prev ?? normalizeDtWorld(remote);
          // Keep local bag/HP on ties so a stale poll cannot resurrect a used potion.
          const merged = mergeDtWorld(base, normalizeDtWorld(remote), mySlot, identity.isDm, {
            seatTie: "existing",
          });
          // Sticky local fight: never swap ids / clear splashDone while active.
          // Never resurrect a fled/dismissed battle.id from poll.
          let localBattle =
            prev?.battle?.status === "active"
              ? mergeSimpleBattle(prev.battle, merged.battle)
              : prev?.battle == null
                ? null
                : merged.battle;
          const cleared = prev?.clearedBattleId || merged.clearedBattleId;
          if (cleared && localBattle?.id === cleared) localBattle = null;
          // Peer-started ambush: accept only if we have no local fight and didn't clear this id.
          if (
            prev?.battle == null &&
            merged.battle?.status === "active" &&
            merged.battle.id !== cleared
          ) {
            localBattle = merged.battle;
          }
          const next = normalizeDtWorld({
            ...merged,
            battle: localBattle,
            clearedBattleId: cleared ?? null,
            storyPlayMs: Math.max(prev?.storyPlayMs ?? 0, merged.storyPlayMs ?? 0),
            framesAdvanced: Math.max(prev?.framesAdvanced ?? 0, merged.framesAdvanced ?? 0),
          });
          worldRef.current = next;
          writeLocalDtWorld(next, slotId);
          return next;
        });
        if (mySlot) {
          const sealed = !!remote.characters[mySlot]?.created;
          if (!sealed) {
            setPhase("create");
          } else if (phase === "create") {
            setPhase("play");
          }
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
  }, [phase, mySlot, identity.isDm, refreshSlotSummaries]);

  useEffect(() => {
    if (!bootstrapped || !world || !mySlot) return;
    if ((phase === "play" || phase === "title") && !world.characters[mySlot]?.created) {
      // Stay on title until they pick Continue — but never let play skip create.
      if (phase === "play") setPhase("create");
    }
  }, [bootstrapped, world, mySlot, phase]);

  const selectSaveSlot = async (slotId: DtSaveSlotId) => {
    writeActiveDtSlotId(slotId);
    activeSlotRef.current = slotId;
    setActiveSlotId(slotId);
    setPhase("title");
    const local = readLocalDtWorld(slotId);
    try {
      const res = await fetch(`/api/downtown/dungeon-tester?slot=${slotId}`);
      if (res.ok) {
        const data = (await res.json()) as {
          world: DtWorldSave | null;
          slots?: DtSlotSummary[];
        };
        applyBootWorld(slotId, data.world, local, data.slots);
        setFlash(`Loaded ${summarizeDtWorld(slotId, data.world ?? local).label}.`);
        return;
      }
    } catch {
      /* local */
    }
    applyBootWorld(slotId, null, local);
    setFlash(`Loaded Slot ${slotId} (local).`);
  };

  const canResetSlot = identity.isDm || mySlot === "justin";

  const startFresh = (slotId: DtSaveSlotId = activeSlotId) => {
    writeActiveDtSlotId(slotId);
    activeSlotRef.current = slotId;
    setActiveSlotId(slotId);
    const summary = slotSummaries.find((s) => s.id === slotId);
    const localExisting = readLocalDtWorld(slotId);
    const occupied = !!(summary?.hasSave || localExisting);
    if (occupied && !canResetSlot) {
      setFlash("Only the DM can restart a slot already in progress.");
      return;
    }
    const fresh = createNewDtWorld();
    clearLocalDtWorld(slotId);
    worldRef.current = fresh;
    setWorld(fresh);
    writeLocalDtWorld(fresh, slotId);
    refreshSlotSummaries();
    void fetch("/api/downtown/dungeon-tester", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reset: true, slotId }),
    })
      .then(async (res) => {
        if (!res.ok) {
          // Empty slot: push fresh world without merge wipe concerns.
          persist(fresh, { slotId });
          return;
        }
        const data = (await res.json()) as {
          world?: DtWorldSave;
          slots?: DtSlotSummary[];
        };
        if (data.slots) refreshSlotSummaries(data.slots);
        const next = data.world ? normalizeDtWorld(data.world) : fresh;
        worldRef.current = next;
        setWorld(next);
        writeLocalDtWorld(next, slotId);
      })
      .catch(() => {
        persist(fresh, { slotId });
      });
    if (mySlot) setPhase("create");
    else setPhase("play");
    setTab("story");
    setFlash(`New Lost Brothers march on Slot ${slotId}.`);
  };

  const continueSave = async (slotId: DtSaveSlotId = activeSlotId) => {
    writeActiveDtSlotId(slotId);
    activeSlotRef.current = slotId;
    setActiveSlotId(slotId);
    let w: DtWorldSave | null = readLocalDtWorld(slotId);
    try {
      const res = await fetch(`/api/downtown/dungeon-tester?slot=${slotId}`);
      if (res.ok) {
        const data = (await res.json()) as {
          world: DtWorldSave | null;
          slots?: DtSlotSummary[];
        };
        if (data.slots) refreshSlotSummaries(data.slots);
        if (data.world) {
          w = w
            ? mergeDtWorld(normalizeDtWorld(data.world), w, mySlot, identity.isDm)
            : normalizeDtWorld(data.world);
        }
      }
    } catch {
      /* local */
    }
    if (!w) {
      startFresh(slotId);
      return;
    }
    worldRef.current = w;
    setWorld(w);
    persist(w, { slotId });
    if (mySlot && !w.characters[mySlot]?.created) {
      setPhase("create");
      setFlash(
        `${SLOT_DEFAULTS[mySlot].displayName} — create your hero to join. The march is already underway.`
      );
    } else {
      setPhase("play");
    }
    setTab("story");
  };

  const deleteSaveSlot = async (slotId: DtSaveSlotId) => {
    if (!identity.isDm && mySlot !== "justin") {
      setFlash("Only the DM can delete a save slot.");
      return;
    }
    clearLocalDtWorld(slotId);
    try {
      const res = await fetch("/api/downtown/dungeon-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ deleteSlot: true, slotId }),
      });
      if (res.ok) {
        const data = (await res.json()) as { slots?: DtSlotSummary[] };
        refreshSlotSummaries(data.slots);
      }
    } catch {
      refreshSlotSummaries();
    }
    if (slotId === activeSlotId) {
      setWorld(null);
    }
    setFlash(`Cleared Slot ${slotId}.`);
  };

  const onSeal = (sealed: DtWorldSave) => {
    persist(sealed);
    setPhase("play");
    setTab("story");
    setFlash(`${sealed.characters[mySlot!]?.name ?? "Hero"} sealed.`);
  };

  const onContinue = () => {
    if (!world) return;
    const r = continueFrame(world);
    persist(r.world);
    if (r.message) setFlash(r.message);
  };

  const onChoose = (choiceId: string) => {
    if (!world) return;
    const r = chooseFrame(world, choiceId);
    persist(r.world);
    if (r.message) setFlash(r.message);
  };

  const onEnterMapRegion = (regionId: string) => {
    if (!world) return;
    const r = enterDtMapReplay(world, regionId);
    persist(r.world);
    if (r.message) setFlash(r.message);
    setWorldMapOpen(false);
    setTab("story");
  };

  const onEnterSideQuest = (questId: string) => {
    if (!world) return;
    try {
      const r = enterDtSideQuest(world, questId);
      persist(r.world);
      if (r.message) setFlash(r.message);
    } finally {
      // Always leave the atlas — even soft failures should not trap the player.
      setWorldMapOpen(false);
      setTab("story");
    }
  };

  const onReturnToMarch = () => {
    if (!world) return;
    const r = exitDtMapReplay(world);
    persist(r.world);
    if (r.message) setFlash(r.message);
    setWorldMapOpen(false);
    setTab("story");
  };

  const onReturnToMainStory = () => {
    if (!world) return;
    const r = exitDtSideQuest(world);
    persist(r.world);
    if (r.message) setFlash(r.message);
    setWorldMapOpen(false);
    setTab("story");
  };

  /** Handler-owned pending flag — never mirror React `pending` every render. */
  const pendingRef = useRef(false);
  /** Short in-flight lock only (not a permanent id:round latch). */
  const enemyAdvanceInFlightRef = useRef(false);

  const onBattleEnemyAdvance = () => {
    const current = worldRef.current;
    if (!current?.battle || current.battle.phase !== "enemy") return;
    // In-flight only — overlay watchdog may retry after we clear.
    if (enemyAdvanceInFlightRef.current || pendingRef.current) return;
    enemyAdvanceInFlightRef.current = true;
    pendingRef.current = true;
    setPending(true);
    try {
      const r = advanceSimpleBattleEnemyPhase(current);
      persist(r.world);
      if (r.message) setFlash(r.message);
    } finally {
      enemyAdvanceInFlightRef.current = false;
      pendingRef.current = false;
      setPending(false);
    }
  };

  const onBattleAction = (
    heroId: string,
    action: SimpleBattleActionId,
    targetId?: string
  ) => {
    // Player actions ONLY from explicit UI clicks — never from timers/effects.
    const current = worldRef.current;
    if (!current?.battle || pendingRef.current) return;
    if (current.battle.phase !== "player" || current.battle.status !== "active") {
      return;
    }
    pendingRef.current = true;
    setPending(true);
    try {
      const r = performSimpleBattleAction(current, heroId, action, targetId);
      persist(r.world);
      if (r.message) setFlash(r.message);
    } finally {
      pendingRef.current = false;
      setPending(false);
    }
  };

  const onDismissBattle = () => {
    const current = worldRef.current;
    if (!current?.battle) return;
    enemyAdvanceInFlightRef.current = false;
    persist(dismissDtBattle(current));
    setTab("story");
    setFlash(
      current.battle.status === "victory"
        ? "You won — gear stowed. Story resumes."
        : "Road clears — story resumes."
    );
  };

  const onFleeBattle = () => {
    const current = worldRef.current;
    if (!current?.battle) return;
    enemyAdvanceInFlightRef.current = false;
    const r = fleeDtBattle(current);
    persist(r.world);
    setTab("story");
    setFlash(r.message);
  };

  const onBattleFxDone = () => {
    const current = worldRef.current;
    if (!current?.battle?.fx?.length) return;
    // Keep rays/floats through deferred enemy phase; clear after foes resolve.
    if (current.battle.phase === "enemy") return;
    persist(clearSimpleBattleFx(current), { sync: false });
  };

  const onBattleSplashDone = () => {
    const current = worldRef.current;
    if (!current?.battle || current.battle.splashDone) return;
    // Sync so server/poll cannot resurrect splashDone:false mid-fight.
    persist(markSimpleBattleSplashDone(current));
  };

  useEffect(() => {
    enemyAdvanceInFlightRef.current = false;
  }, [world?.battle?.id]);

  useEffect(() => {
    if (world?.battle?.phase !== "enemy") {
      enemyAdvanceInFlightRef.current = false;
    }
  }, [world?.battle?.phase, world?.battle?.round]);

  // Older saves may still be on victory with rewardsPending — claim so inventory shows loot.
  useEffect(() => {
    const current = worldRef.current;
    const b = current?.battle;
    if (!current || !b || b.status !== "victory" || b.rewardsPending === false) return;
    persist(claimSimpleBattleVictoryRewards(current));
  }, [world?.battle?.id, world?.battle?.status, world?.battle?.rewardsPending]);

  const battleActive = world?.battle?.status === "active";
  const battleOpen = !!world?.battle;
  const acting =
    !!mySlot &&
    !!world?.characters[mySlot]?.created &&
    (identity.isDm || world?.activeSlot === mySlot);
  const me = mySlot && world ? world.characters[mySlot] : null;
  const meXp = me ? xpProgress(me.xp) : null;

  // Space / Enter advances story when Continue is the only primary action.
  useEffect(() => {
    if (phase !== "play" || tab !== "story" || !world || world.endingId || world.battle) return;
    const frameNow = getFrame(world.campaignNodeId);
    if (!frameNow?.next || (frameNow.choices?.length ?? 0) > 0) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Enter" && e.key !== " ") return;
      const t = e.target as HTMLElement | null;
      if (t && (t.tagName === "INPUT" || t.tagName === "TEXTAREA" || t.tagName === "SELECT" || t.isContentEditable)) {
        return;
      }
      e.preventDefault();
      onContinue();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [phase, tab, world?.campaignNodeId, world?.endingId, world?.battle, onContinue]);

  const onCampSleep = () => {
    if (!world || !mySlot) return;
    const r = dtSleepAtCamp(world, mySlot, { isDm: identity.isDm });
    persist(r.world);
    setFlash(r.message);
  };

  const onBuyMerchant = (itemId: string) => {
    if (!world || !mySlot) return;
    const before = world.characters[mySlot]?.gold ?? 0;
    const r = dtBuyFromCampMerchant(world, mySlot, itemId, { isDm: identity.isDm });
    persist(r.world);
    setFlash(r.message);
    const after = r.world.characters[mySlot]?.gold ?? before;
    if (after < before) {
      setMerchantSold({ id: Date.now(), spent: before - after, goldLeft: after });
    }
  };

  const onForceAmbush = () => {
    if (!world) return;
    const r = dtForceAmbush(world);
    persist(r.world);
    setFlash(r.message);
  };

  const onFeedDog = () => {
    if (!world || !mySlot) return;
    const r = dtCampFeedDog(world, mySlot);
    if ("error" in r) {
      setFlash(r.error);
      return;
    }
    persist(r.world);
    setFlash(r.message);
  };

  const onMeanToDog = () => {
    if (!world || !mySlot) return;
    const r = dtCampMeanToDog(world, mySlot);
    if ("error" in r) {
      setFlash(r.error);
      return;
    }
    persist(r.world);
    setFlash(r.message);
  };

  const onDogFetch = () => {
    if (!world || !mySlot) return;
    const r = dtCampDogFetch(world, mySlot);
    if ("error" in r) {
      setFlash(r.error);
      return;
    }
    persist(r.world);
    setFlash(r.message);
  };

  const onDisbandCompanion = () => {
    if (!world || !mySlot) return;
    const r = dtCampDisbandCompanion(world, mySlot);
    if ("error" in r) {
      setFlash(r.error);
      return;
    }
    persist(r.world);
    setFlash(r.message);
  };

  const onChest = () => {
    if (!world || !mySlot) return;
    const r = dtStumbleOnChest(world, mySlot);
    persist(r.world);
    setFlash(r.message);
  };

  const onDig = () => {
    if (!world || !mySlot) return;
    const r = dtDigForLoot(world, mySlot);
    persist(r.world);
    setFlash(r.message);
  };

  const onEquip = (itemId: string) => {
    if (!world || !mySlot) return;
    const r = dtEquipItem(world, mySlot, itemId);
    if ("error" in r) {
      setFlash(r.error);
      return;
    }
    persist(r.world);
    setFlash(r.message);
  };

  const onUnequip = (slot: EquipSlot) => {
    if (!world || !mySlot) return;
    const r = dtUnequipSlot(world, mySlot, slot);
    if ("error" in r) {
      setFlash(r.error);
      return;
    }
    persist(r.world);
    setFlash(r.message);
  };

  const onUseConsumable = (itemId: string) => {
    if (!world || !mySlot) return;
    const r = dtUseConsumable(world, mySlot, itemId);
    if ("error" in r) {
      setFlash(r.error);
      return;
    }
    persist(r.world);
    setFlash(r.message);
  };

  const onSalvage = (itemId: string) => {
    if (!world || !mySlot) return;
    const r = dtSalvageItem(world, mySlot, itemId);
    if ("error" in r) {
      setFlash(r.error);
      return;
    }
    persist(r.world);
    setFlash(r.message);
  };

  const onReadSpellbook = (itemId: string) => {
    if (!world || !mySlot) return;
    const r = dtReadSpellbook(world, mySlot, itemId);
    persist(r.world);
    setFlash(r.message);
  };

  const frame = world ? getFrame(world.campaignNodeId) : undefined;
  const activeSideQuest = world?.sideQuest
    ? getDtSideQuest(world.sideQuest.questId)
    : undefined;
  const activeSideQuestTitle = activeSideQuest?.title;
  const sideQuestTerminal = !!(world?.sideQuest && isDtSideQuestTerminal(world));
  const sideQuestRewardPreview =
    world && activeSideQuest && sideQuestTerminal
      ? resolveDtSideQuestReward(activeSideQuest, world)
      : null;
  const plateScene = frameSceneSrc(frame);
  const plateSubject = frameSubjectSrc(frame);
  const sealedCount = world
    ? PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created).length
    : 0;
  const playHud = formatPlaytimeHud(world?.storyPlayMs ?? 0, DT_TARGET_PLAYTIME_HOURS);

  const sleepBlocked =
    !acting ||
    battleActive ||
    !world ||
    campSleepsRemaining(asPartyWorld(world)) <= 0;
  let campSleepHint: string | null = null;
  if (battleActive) campSleepHint = "Finish the battle before sleeping.";
  else if (!acting) campSleepHint = "Not your turn.";
  else if (world && campSleepsRemaining(asPartyWorld(world)) <= 0) {
    const waitMin = Math.max(1, Math.ceil(campSleepCooldownMs(asPartyWorld(world)) / 60_000));
    campSleepHint = `Next sleep in ~${waitMin}m.`;
  }

  if (!bootstrapped) {
    return (
      <div className="downtown-shell dungeon-tester party-comic party-rpg90s party-chronicle">
        <p className="dt-tagline">Loading Dungeons and Dogs…</p>
      </div>
    );
  }

  const shellClass =
    "downtown-shell dungeon-tester party-comic party-rpg90s party-chronicle";

  return (
    <div className={shellClass}>

      {flash ? <p className="dt-flash">{flash}</p> : null}

      {phase === "title" && (
        <div className="dt-panel dt-title-panel">
          <h1 className="dt-title-hero">Dungeons and Dogs</h1>
          <p className="dt-tagline">
            Lost Brothers — three amnesiac men and a dog wake in the Neon Wilderland: cyberpunk steel
            under a Middle-earth canopy, spirits in the fog, dragons on the ridgeline. Adult R-rated
            pulp. Helix Dominion sells names; Project Pale wiped theirs. Oregon Trail page, short
            comic frames, party seats like Neverworld (Justin, Rusty, Elisha, Eric). Late joiners
            seal a hero anytime; save slots keep separate campaigns. Battles stay crude combat —
            grit over polish.
          </p>

          <div className="dt-slot-list" role="list" aria-label="Save slots">
            {slotSummaries.map((s) => {
              const active = s.id === activeSlotId;
              const playLabel = formatPlaytimeHud(s.storyPlayMs, DT_TARGET_PLAYTIME_HOURS);
              return (
                <div
                  key={s.id}
                  className="dt-slot-card"
                  data-active={active ? "true" : "false"}
                  role="listitem"
                >
                  <button
                    type="button"
                    className="dt-slot-select"
                    onClick={() => void selectSaveSlot(s.id)}
                  >
                    <strong>{s.label}</strong>
                    <span>
                      {s.hasSave
                        ? `${s.sealedCount}/4 sealed · ${s.heroNames.join(", ") || "empty party"} · frame ${s.framesAdvanced} · ${playLabel}`
                        : "Empty — start a fresh march"}
                    </span>
                  </button>
                  <div className="dt-actions">
                    <button
                      type="button"
                      className="dt-btn"
                      data-variant="primary"
                      onClick={() => void continueSave(s.id)}
                    >
                      {s.hasSave || (active && sealedCount > 0) ? "Continue" : "New"}
                    </button>
                    <button
                      type="button"
                      className="dt-btn"
                      data-variant="secondary"
                      disabled={
                        !!(s.hasSave || (active && sealedCount > 0)) &&
                        !identity.isDm &&
                        mySlot !== "justin"
                      }
                      onClick={() => {
                        if (
                          s.hasSave &&
                          typeof window !== "undefined" &&
                          !window.confirm(`Start a new campaign on ${s.label}? This slot only.`)
                        ) {
                          return;
                        }
                        startFresh(s.id);
                      }}
                    >
                      New campaign
                    </button>
                    <button
                      type="button"
                      className="dt-btn"
                      data-variant="tertiary"
                      disabled={!s.hasSave || (!identity.isDm && mySlot !== "justin")}
                      onClick={() => {
                        if (
                          typeof window !== "undefined" &&
                          !window.confirm(`Delete ${s.label}? This cannot be undone.`)
                        ) {
                          return;
                        }
                        void deleteSaveSlot(s.id);
                      }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          <div className="dt-party-row">
            {PLAYER_SLOT_ORDER.map((slot) => (
              <DtPartySeat
                key={slot}
                slot={slot}
                char={world?.characters[slot]}
                isYou={slot === mySlot}
              />
            ))}
          </div>
          {!mySlot && (
            <p className="dt-tagline">
              Log in as player1–4 (or justin@ / eric@) to seal a seat. Admins can watch.
            </p>
          )}
        </div>
      )}

      {phase === "create" && mySlot && world && (
        <CreateSeat
          world={world}
          slot={mySlot}
          onCancel={() => setPhase("title")}
          onSeal={onSeal}
        />
      )}

      {phase === "play" && world && (
        <>
          <div className="dt-play-nav" role="tablist" aria-label="Dungeons and Dogs">
            {(
              [
                ["story", "Story"],
                ["camp", "Camp"],
                ["gear", "Gear"],
              ] as const
            ).map(([id, label]) => (
              <button
                key={id}
                type="button"
                role="tab"
                aria-selected={tab === id}
                className="dt-btn"
                data-variant={tab === id ? "primary" : "secondary"}
                disabled={!!world.battle && id !== "story"}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
            <button
              type="button"
              className="dt-btn"
              data-variant="tertiary"
              onClick={() => setPhase("title")}
            >
              Title
            </button>
          </div>

          {world.endingId ? (
            <div className="dt-panel">
              <h2 className="dt-frame-title">March beat complete</h2>
              <p className="dt-frame-body">
                Ending flag <strong>{world.endingId}</strong>. More Dungeons and Dogs spine and hours toward
                the thirty still wait beyond this road — or start a new campaign from the title.
              </p>
              <div className="dt-actions">
                <button type="button" className="dt-btn" data-variant="primary" onClick={() => setPhase("title")}>
                  Title
                </button>
              </div>
            </div>
          ) : null}

          {!world.endingId && tab === "story" ? (
            <div className="dt-panel dt-story-panel">
              <DtLocalMap
                chapterId={world.chapterId}
                campaignNodeId={world.campaignNodeId}
                replay={!!world.mapReplay}
              />
              <div className="dt-map-toolbar">
                <button
                  type="button"
                  className="dt-btn"
                  data-variant="secondary"
                  disabled={!!world.battle}
                  onClick={() => setWorldMapOpen(true)}
                >
                  World Map
                </button>
                {world.sideQuest ? (
                  <button
                    type="button"
                    className="dt-btn"
                    data-variant="primary"
                    disabled={!!world.battle}
                    onClick={onReturnToMainStory}
                  >
                    Return to main story
                  </button>
                ) : null}
                {world.mapReplay ? (
                  <button
                    type="button"
                    className="dt-btn"
                    data-variant="primary"
                    disabled={!!world.battle}
                    onClick={onReturnToMarch}
                  >
                    Return to march
                  </button>
                ) : null}
                {world.sideQuest ? (
                  <p className="dt-map-side-quest-banner">
                    {`Side quest${
                      activeSideQuestTitle ? ` — ${activeSideQuestTitle}` : ""
                    } — main story paused`}
                  </p>
                ) : null}
                {sideQuestRewardPreview ? (
                  <p className="dt-side-quest-victory" role="status">
                    {`Side job done — claimed ${sideQuestRewardPreview.claimLabel}`}
                  </p>
                ) : null}
                {world.mapReplay ? (
                  <p className="dt-map-replay-banner">
                    Revisiting — no story rewards. Practice fights keep battle loot.
                  </p>
                ) : null}
              </div>
              <div className="dt-comic-strip">
                <div className="dt-comic-plate">
                  <img
                    className="dt-comic-plate-scene"
                    src={plateScene}
                    alt={getDtArt(frame?.sceneId ?? frame?.artId ?? "")?.label ?? frame?.title ?? "Scene"}
                    onError={(e) => {
                      const img = e.currentTarget;
                      if (img.dataset.fallback === "1") return;
                      img.dataset.fallback = "1";
                      img.src = FALLBACK_PLATE;
                    }}
                  />
                  {plateSubject ? (
                    <img
                      className="dt-comic-plate-subject"
                      src={plateSubject}
                      alt={getDtArt(frame?.artId ?? "")?.label ?? ""}
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : null}
                </div>
                <div className="dt-frame-copy">
                  <p className="dt-hud-meta">
                    {world.chapterId} · {world.campaignNodeId}
                    {world.mapReplay ? " · revisit" : ""}
                    {world.sideQuest ? " · side quest" : ""}
                  </p>
                  <h2 className="dt-frame-title">{frame?.title ?? "Missing frame"}</h2>
                  <p className="dt-frame-body">
                    {frame
                      ? resolveFrameBody(frame, world.partyFlags)
                      : "Spine gap — check data/dungeon-tester."}
                  </p>
                  <div className="dt-actions dt-story-actions">
                    {frame?.choices?.length ? (
                      visibleFrameChoices(frame, world.partyFlags).map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="dt-btn"
                          data-variant="primary"
                          disabled={!!world.battle}
                          onClick={() => onChoose(c.id)}
                        >
                          {c.label}
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        className="dt-btn dt-btn-continue"
                        data-variant="primary"
                        disabled={!!world.battle || !frame?.next}
                        onClick={onContinue}
                      >
                        Continue
                        <kbd className="dt-shortcut">Space</kbd>
                      </button>
                    )}
                    {mySlot && !world.characters[mySlot].created ? (
                      <button
                        type="button"
                        className="dt-btn"
                        data-variant="secondary"
                        onClick={() => setPhase("create")}
                      >
                        Seal my seat
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {phase === "play" && world && !world.endingId ? (
            <DtWorldMap
              open={worldMapOpen}
              chapterId={world.chapterId}
              furthestChapterId={world.furthestChapterId}
              replayRegionId={world.mapReplay?.regionId}
              activeSideQuestId={world.sideQuest?.questId}
              completedSideQuestIds={world.completedSideQuests}
              onClose={() => setWorldMapOpen(false)}
              onEnterRegion={onEnterMapRegion}
              onEnterSideQuest={onEnterSideQuest}
              onReturnToMarch={
                world.mapReplay
                  ? onReturnToMarch
                  : world.sideQuest
                    ? onReturnToMainStory
                    : undefined
              }
            />
          ) : null}

          {!world.endingId && tab === "camp" ? (
            <div className="dt-panel dt-camp-panel">
              <div className="dt-camp-hero">
                <p className="dt-section-label">Camp · Rest & Supply</p>
                <p className="dt-section-title">{frame?.title ?? world.campaignNodeId}</p>
                <p className="dt-section-hint">
                  Sleep, buy trail goods, dig for caches, or force a road fight — then back to Story.
                </p>
                <div className="dt-actions dt-camp-hero-actions">
                  <button
                    type="button"
                    className="dt-btn"
                    data-variant="primary"
                    disabled={!!world.battle}
                    onClick={() => setTab("story")}
                  >
                    Back to Story
                  </button>
                  <button
                    type="button"
                    className="dt-btn"
                    data-variant="secondary"
                    disabled={!!world.battle || !me}
                    onClick={() => setTab("gear")}
                  >
                    Gear / Inventory
                  </button>
                </div>
              </div>

              <div className="dt-camp-section">
                <p className="dt-section-label">
                  Rest · Sleep ({world ? campSleepsRemaining(asPartyWorld(world)) : 0}/{CAMP_SLEEP_MAX}{" "}
                  this {CAMP_SLEEP_WINDOW_MS / 60_000}m)
                </p>
                <p className="dt-section-hint">
                  Restores HP, mana, and stamina for the acting hero (and their dog). Saves with the
                  march.
                </p>
                <button
                  type="button"
                  className="dt-btn"
                  data-variant="primary"
                  disabled={sleepBlocked}
                  title={
                    campSleepHint ??
                    "Sleep at camp — restore HP & mana (40% chance of a night ambush)"
                  }
                  onClick={onCampSleep}
                >
                  Sleep at camp → restore HP &amp; mana
                </button>
                {campSleepHint ? (
                  <p className="dt-section-hint dt-section-hint-accent">
                    {campSleepHint}
                  </p>
                ) : (
                  <p className="dt-section-hint">
                    Rest easy… or not — night creatures sometimes stalk the firelight.
                  </p>
                )}
                {me ? (
                  <div className="dt-vitals" aria-label="Hero vitals">
                    <div className="dt-vital" data-kind="hp">
                      <div className="dt-vital-head">
                        <span className="dt-vital-label">HP</span>
                        <strong className="dt-vital-num">
                          {me.hp}/{me.maxHp}
                        </strong>
                      </div>
                      <div className="dt-vital-bar">
                        <span
                          style={{
                            width: `${Math.max(0, Math.min(100, Math.round((me.hp / Math.max(1, me.maxHp)) * 100)))}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="dt-vital" data-kind="mana">
                      <div className="dt-vital-head">
                        <span className="dt-vital-label">MP</span>
                        <strong className="dt-vital-num">
                          {me.mana}/{me.maxMana}
                        </strong>
                      </div>
                      <div className="dt-vital-bar">
                        <span
                          style={{
                            width: `${Math.max(0, Math.min(100, Math.round((me.mana / Math.max(1, me.maxMana)) * 100)))}%`,
                          }}
                        />
                      </div>
                    </div>
                    <div className="dt-vital" data-kind="stamina">
                      <div className="dt-vital-head">
                        <span className="dt-vital-label">ST</span>
                        <strong className="dt-vital-num">
                          {me.stamina}/{me.maxStamina}
                        </strong>
                      </div>
                      <div className="dt-vital-bar">
                        <span
                          style={{
                            width: `${Math.max(0, Math.min(100, Math.round((me.stamina / Math.max(1, me.maxStamina)) * 100)))}%`,
                          }}
                        />
                      </div>
                    </div>
                  </div>
                ) : null}
              </div>

              {me ? (
                <div className="dt-camp-bag dt-camp-section space-y-2">
                  <p className="dt-section-label">
                    Equipped &amp; Bag · {me.name} · {me.gold}g
                  </p>
                  <p className="dt-section-hint">
                    Empty slots auto-fill when you buy or dig. Equip anything else from Camp here.
                  </p>
                  {(() => {
                    const loadout = dtLoadoutSummary(me);
                    const bagEditable = acting && !battleActive;
                    return (
                      <>
                        <div className="dt-inv-block">
                          <p className="dt-bag-sublabel">Equipped</p>
                          <div className="dt-equipped-row">
                            {loadout.worn.length ? (
                              loadout.worn.map((w) => (
                                <span
                                  key={w.slot}
                                  className="dt-equipped-chip"
                                  data-tier={gearTierAttr(w.tier)}
                                  title={`${w.slot} · ${formatGearTier(w.tier)}`}
                                >
                                  <DtGearIcon
                                    itemId={w.id}
                                    name={w.name}
                                    size="md"
                                  />
                                  <span className="dt-equipped-slot">{w.slot}</span>
                                  <span className="dt-equipped-name">{w.name}</span>
                                </span>
                              ))
                            ) : (
                              <span className="dt-section-hint">
                                Nothing equipped — equip from the bag.
                              </span>
                            )}
                          </div>
                        </div>
                        <div className="dt-inv-block">
                          <p className="dt-bag-sublabel">
                            Bag
                            {loadout.bag.length ? (
                              <span className="dt-bag-count">{loadout.bag.length}</span>
                            ) : null}
                          </p>
                          <div className="dt-bag-list">
                            {loadout.bag.map((item, idx) => (
                              <div
                                key={`${item.id}-${idx}`}
                                className="dt-bag-row"
                                data-equipped={item.equipped ? "true" : "false"}
                                data-tier={gearTierAttr(item.tier)}
                                data-upgrade={item.upgrade ?? undefined}
                              >
                                <div className="dt-bag-main">
                                  <div className="dt-bag-title-row">
                                    <DtGearIcon
                                      itemId={item.id}
                                      name={item.name}
                                      size="md"
                                    />
                                    {item.equipped ? (
                                      <span className="dt-bag-flag" data-kind="equipped">
                                        Equipped
                                      </span>
                                    ) : null}
                                    {item.upgrade ? (
                                      <span
                                        className="dt-bag-flag"
                                        data-kind={item.upgrade}
                                        title={
                                          item.upgrade === "empty"
                                            ? "Nothing equipped in this slot"
                                            : "Better combat score than equipped"
                                        }
                                      >
                                        {item.upgrade === "empty" ? "Empty slot" : "↑ Upgrade"}
                                      </span>
                                    ) : null}
                                    <strong className="dt-bag-name">{item.name}</strong>
                                  </div>
                                  <span className="dt-bag-meta">
                                    <span
                                      className="dt-bag-tier"
                                      data-tier={gearTierAttr(item.tier)}
                                    >
                                      {formatGearTier(item.tier)}
                                    </span>
                                    <span className="dt-bag-slot">{item.slot}</span>
                                  </span>
                                  {item.stats.length ? (
                                    <span className="dt-bag-stats">
                                      {item.stats.join(" · ")}
                                    </span>
                                  ) : null}
                                </div>
                                <div className="dt-bag-actions">
                                  {item.equippable && !item.equipped ? (
                                    <button
                                      type="button"
                                      className="pc-btn-tiny"
                                      disabled={!bagEditable}
                                      onClick={() => onEquip(item.id)}
                                    >
                                      Equip
                                    </button>
                                  ) : null}
                                  {item.consumable ? (
                                    <button
                                      type="button"
                                      className="pc-btn-tiny"
                                      disabled={!bagEditable}
                                      onClick={() => onUseConsumable(item.id)}
                                    >
                                      Use
                                    </button>
                                  ) : null}
                                </div>
                              </div>
                            ))}
                            {!loadout.bag.length ? (
                              <p className="dt-section-hint">
                                Bag empty — visit the peddler or dig.
                              </p>
                            ) : null}
                          </div>
                        </div>
                      </>
                    );
                  })()}
                </div>
              ) : null}

              <div className="dt-camp-section dt-merchant relative space-y-2">
                <p className="dt-section-label">
                  Trail Peddler · Your Purse {me?.gold ?? 0}g
                </p>
                <p className="dt-section-hint">
                  Frontier rations, poultices, and trail arms — bought goods go to your bag (and
                  empty slots).
                </p>
                {merchantSold ? (
                  <div
                    key={merchantSold.id}
                    className="dt-merchant-sold"
                    role="status"
                    aria-live="polite"
                  >
                    <span className="dt-merchant-sold-label">Sold</span>
                    <span className="dt-merchant-sold-spend">−{merchantSold.spent}g</span>
                    <span className="dt-merchant-sold-purse">{merchantSold.goldLeft}g left</span>
                  </div>
                ) : null}
                <div className="dt-merchant-list">
                  {campMerchantStock().map((offer) => (
                    <button
                      key={offer.itemId}
                      type="button"
                      className="dt-merchant-offer"
                      disabled={!acting || battleActive || (me?.gold ?? 0) < offer.price}
                      onClick={() => onBuyMerchant(offer.itemId)}
                    >
                      <strong className="dt-bag-name">
                        {offer.name} — {offer.price}g
                      </strong>
                      <span className="dt-bag-meta">
                        {offer.tier} · {offer.blurb}
                      </span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="dt-camp-section">
                <p className="dt-section-label">Hound · Camp Companion</p>
                {me?.created ? (
                  <>
                    <p className="dt-section-hint">
                      {normalizeDtDog(me.dog).name} · bond {normalizeDtDog(me.dog).bond} · hunger{" "}
                      {normalizeDtDog(me.dog).hunger ?? 0}
                      {normalizeDtDog(me.dog).sulking ? " · sulking" : ""}
                      {" · "}
                      {dtDogJoinsBattle(me).joins
                        ? "joins ambushes"
                        : dtDogJoinsBattle(me).note ?? "hiding at camp"}
                    </p>
                    <div className="dt-camp-dog-card">
                      <DtPokeCard
                        card={{
                          ...getDtDogPokeCard(),
                          name: normalizeDtDog(me.dog).name,
                        }}
                        hp={normalizeDtDog(me.dog).hp}
                        maxHp={normalizeDtDog(me.dog).maxHp}
                        size="md"
                        ally
                      />
                    </div>
                    <div className="dt-actions">
                      <button
                        type="button"
                        className="dt-btn"
                        disabled={!acting || battleActive}
                        onClick={onFeedDog}
                      >
                        Feed dog →
                      </button>
                      <button
                        type="button"
                        className="dt-btn"
                        disabled={!acting || battleActive}
                        onClick={onMeanToDog}
                      >
                        Shove dog away (mean) →
                      </button>
                    </div>

                    <p className="dt-section-label" style={{ marginTop: "1rem" }}>
                      Trail Fetch · Found People
                    </p>
                    <p className="dt-section-hint">
                      Send your dog to fetch a random person (sex, race, and class roll). They stick
                      until you disband them — then the dog can find someone new.
                    </p>
                    {me.fetchedCompanion ? (
                      <>
                        <div className="dt-camp-dog-card">
                          <DtPokeCard
                            card={synthesizeCompanionPokeCard({
                              id: me.fetchedCompanion.id,
                              name: me.fetchedCompanion.name,
                              sexLabel: sexLabel(me.fetchedCompanion.sex),
                              raceName:
                                RACE_DEFS[me.fetchedCompanion.raceId]?.name ??
                                me.fetchedCompanion.raceId,
                              className:
                                CLASS_DEFS[me.fetchedCompanion.classId]?.name ??
                                me.fetchedCompanion.classId,
                              level: me.fetchedCompanion.level,
                            })}
                            hp={me.fetchedCompanion.hp}
                            maxHp={me.fetchedCompanion.maxHp}
                            size="md"
                            ally
                          />
                        </div>
                        <p className="dt-section-hint">
                          {me.fetchedCompanion.name} · {sexLabel(me.fetchedCompanion.sex)} ·{" "}
                          {RACE_DEFS[me.fetchedCompanion.raceId]?.name ??
                            me.fetchedCompanion.raceId}{" "}
                          ·{" "}
                          {CLASS_DEFS[me.fetchedCompanion.classId]?.name ??
                            me.fetchedCompanion.classId}{" "}
                          · Lv {me.fetchedCompanion.level} · {me.fetchedCompanion.xp} XP
                        </p>
                        <div className="dt-actions">
                          <button
                            type="button"
                            className="dt-btn"
                            disabled={!acting || battleActive}
                            onClick={onDisbandCompanion}
                          >
                            Disband {me.fetchedCompanion.name} →
                          </button>
                        </div>
                      </>
                    ) : (
                      <div className="dt-actions">
                        <button
                          type="button"
                          className="dt-btn"
                          data-variant="primary"
                          disabled={
                            !acting || battleActive || !dtDogCanFetch(me).ok
                          }
                          title={dtDogCanFetch(me).reason}
                          onClick={onDogFetch}
                        >
                          Send dog to fetch someone →
                        </button>
                      </div>
                    )}
                    {!me.fetchedCompanion && !dtDogCanFetch(me).ok ? (
                      <p className="dt-section-hint dt-section-hint-accent">
                        {dtDogCanFetch(me).reason}
                      </p>
                    ) : null}
                  </>
                ) : (
                  <p className="dt-section-hint">Seal a hero to bring a dog.</p>
                )}
              </div>

              <div className="dt-camp-section">
                <p className="dt-section-label">Road Battle · Crude Ambush</p>
                {battleOpen ? (
                  <p className="dt-section-title">Battle in progress — finish the overlay.</p>
                ) : (
                  <button
                    type="button"
                    className="dt-btn"
                    disabled={!acting}
                    onClick={onForceAmbush}
                  >
                    Force road ambush →
                  </button>
                )}
              </div>

              <div className="dt-camp-section">
                <p className="dt-section-label">
                  Trail Luck · Chests &amp; Digging ({world.explorationFinds ?? 0} finds)
                </p>
                <div className="dt-actions">
                  <button
                    type="button"
                    className="dt-btn"
                    disabled={!acting || battleActive}
                    onClick={onChest}
                  >
                    Stumble on a treasure chest →
                  </button>
                  <button
                    type="button"
                    className="dt-btn"
                    disabled={!acting || battleActive}
                    onClick={onDig}
                  >
                    Dig a hole for loot →
                  </button>
                </div>
                {world.lastExploration ? (
                  <div className="dt-explore-result">
                    <strong className="dt-explore-title">{world.lastExploration.title}</strong>
                    <span className="dt-section-hint">{world.lastExploration.blurb}</span>
                    <span className="dt-bag-meta">
                      {world.lastExploration.itemNames.join(", ") || "empty"} · +
                      {world.lastExploration.gold}g · +{world.lastExploration.xp} XP
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!world.endingId && tab === "gear" && me && mySlot ? (
            <div className="dt-panel dt-gear-panel">
              <DtGearSheet
                char={me}
                slot={mySlot}
                canEdit={!battleActive}
                onEquip={onEquip}
                onUnequip={onUnequip}
                onUseConsumable={onUseConsumable}
                onReadSpellbook={onReadSpellbook}
                onSalvage={onSalvage}
              />
            </div>
          ) : null}

          {me?.created ? (
            <div className="dt-hero-panel" aria-label="Your hero">
              <div className="dt-hero-portrait">
                <DtHeroFigure
                  look={normalizeDtHeroLook(me.dtLook, mySlot!)}
                  className="dt-hero-panel-figure"
                />
              </div>
              <div className="dt-hero-panel-body">
                <p className="dt-section-label">
                  {SLOT_DEFAULTS[mySlot!].displayName}
                  {world.activeSlot === mySlot ? " · your turn" : ""}
                </p>
                <strong className="dt-hero-panel-name">{me.name}</strong>
                <span className="dt-hero-panel-meta">
                  Lv {me.level} · {CLASS_DEFS[me.classId].name} · {me.gold}g
                </span>
                <div className="dt-vitals dt-hero-vitals" aria-label="HP ST XP">
                  <div className="dt-vital" data-kind="hp">
                    <div className="dt-vital-head">
                      <span className="dt-vital-label">HP</span>
                      <strong className="dt-vital-num">
                        {me.hp}/{me.maxHp}
                      </strong>
                    </div>
                    <div className="dt-vital-bar">
                      <span
                        style={{
                          width: `${Math.max(0, Math.min(100, Math.round((me.hp / Math.max(1, me.maxHp)) * 100)))}%`,
                        }}
                      />
                    </div>
                  </div>
                  <div className="dt-vital" data-kind="stamina">
                    <div className="dt-vital-head">
                      <span className="dt-vital-label">ST</span>
                      <strong className="dt-vital-num">
                        {me.stamina}/{me.maxStamina}
                      </strong>
                    </div>
                    <div className="dt-vital-bar">
                      <span
                        style={{
                          width: `${Math.max(0, Math.min(100, Math.round((me.stamina / Math.max(1, me.maxStamina)) * 100)))}%`,
                        }}
                      />
                    </div>
                  </div>
                  {meXp ? (
                    <div className="dt-vital" data-kind="xp">
                      <div className="dt-vital-head">
                        <span className="dt-vital-label">XP</span>
                        <strong className="dt-vital-num">
                          {meXp.into}/{meXp.need}
                        </strong>
                      </div>
                      <div className="dt-vital-bar">
                        <span style={{ width: `${meXp.pct}%` }} />
                      </div>
                    </div>
                  ) : null}
                </div>
              </div>
            </div>
          ) : null}

          <div className="dt-party-row">
            {PLAYER_SLOT_ORDER.map((slot) => (
              <DtPartySeat
                key={slot}
                slot={slot}
                char={world.characters[slot]}
                isYou={slot === mySlot}
                isTurn={world.activeSlot === slot}
              />
            ))}
          </div>

          <div className="dt-hud-bar" aria-live="polite">
            <span className="dt-hud-block">
              <span className="dt-hud-block-label">Slot</span>
              <strong className="dt-hud-block-value">{activeSlotId}</strong>
            </span>
            <span className="dt-hud-block">
              <span className="dt-hud-block-label">Playtime</span>
              <strong className="dt-hud-block-value">{playHud}</strong>
            </span>
            <span className="dt-hud-block">
              <span className="dt-hud-block-label">Frame</span>
              <strong className="dt-hud-block-value">{world.framesAdvanced}</strong>
            </span>
            <span className="dt-hud-block">
              <span className="dt-hud-block-label">Party</span>
              <strong className="dt-hud-block-value">{sealedCount}/4</strong>
            </span>
          </div>

          {battleOpen && world.battle ? (
            <SimpleBattleOverlay
              battle={world.battle}
              mySlot={mySlot}
              canAct={!!mySlot && !!world.characters[mySlot]?.created}
              pending={pending}
              onAction={onBattleAction}
              onDismiss={onDismissBattle}
              onFlee={onFleeBattle}
              onFxDone={onBattleFxDone}
              onEnemyAdvance={onBattleEnemyAdvance}
              onSplashDone={onBattleSplashDone}
              hero={me}
              onEquip={onEquip}
              onUnequip={onUnequip}
              onUseConsumable={onUseConsumable}
            />
          ) : null}
        </>
      )}
    </div>
  );
}

function CreateSeat({
  world,
  slot,
  onSeal,
  onCancel,
}: {
  world: DtWorldSave;
  slot: NonNullable<PlayerIdentity["slot"]>;
  onSeal: (w: DtWorldSave) => void;
  onCancel: () => void;
}) {
  const def = SLOT_DEFAULTS[slot];
  const base = world.characters[slot];
  const skills = useMemo(() => listCreateSkills(), []);
  const magicOptions = useMemo(() => listCreateMagic(), []);
  const [name, setName] = useState(base.name || def.displayName);
  const [classId, setClassId] = useState<ClassId>(base.classId || def.suggestedClass);
  const [raceId, setRaceId] = useState<RaceId>(base.raceId ?? "human");
  const [dogName, setDogName] = useState(base.dog.name || def.dogName);
  const [dogBreed, setDogBreed] = useState(base.dog.breed || def.dogBreed);
  const [look, setLook] = useState<DtHeroLook>(() =>
    normalizeDtHeroLook(base.dtLook, slot)
  );
  const [bumps, setBumps] = useState<Partial<Record<StatKey, number>>>({});
  const weapons = useMemo(() => weaponsForClass(classId), [classId]);
  const [weaponId, setWeaponId] = useState(() => weaponsForClass(def.suggestedClass)[0]?.id ?? "iron-sword");
  const [skillId, setSkillId] = useState(skills[0]?.id ?? "ab-power-strike");
  const [magicIds, setMagicIds] = useState<string[]>([]);
  const [error, setError] = useState<string | null>(null);
  const magicNeeded = magicSlotsForClass(classId);

  useEffect(() => {
    if (!weapons.some((w) => w.id === weaponId)) {
      setWeaponId(weapons[0]?.id ?? "iron-sword");
    }
  }, [weapons, weaponId]);

  useEffect(() => {
    setMagicIds((prev) => {
      const next = prev.slice(0, magicNeeded);
      while (next.length < magicNeeded && magicOptions[next.length]) {
        next.push(magicOptions[next.length]!.id);
      }
      return next;
    });
  }, [classId, magicNeeded, magicOptions]);

  const spent = STAT_KEYS.reduce((s, k) => s + (bumps[k] ?? 0), 0);
  const left = STAT_POOL - spent;

  const quickSeal = () => {
    const kitMagic = magicOptions.slice(0, magicNeeded).map((m) => m.id);
    const result = sealDtCharacter(world, slot, {
      name: def.displayName,
      classId: def.suggestedClass,
      raceId: "human",
      dogName: def.dogName,
      dogBreed: def.dogBreed,
      look: defaultDtHeroLook(slot),
      statBumps: { strength: 5, constitution: 5, dexterity: 5, wisdom: 4, intelligence: 4, charisma: 4 },
      kit: {
        weaponId: weaponsForClass(def.suggestedClass)[0]?.id ?? "iron-sword",
        skillAbilityId: skills[0]?.id ?? "ab-power-strike",
        magicAbilityIds: kitMagic,
      },
    });
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onSeal(result);
  };

  const submit = () => {
    setError(null);
    if (!applyPointBuy(BLANK_BASE_STATS, bumps, STAT_POOL)) {
      setError("Stat spend exceeds pool.");
      return;
    }
    const result = sealDtCharacter(world, slot, {
      name,
      classId,
      raceId,
      dogName,
      dogBreed,
      look,
      statBumps: bumps,
      kit: { weaponId, skillAbilityId: skillId, magicAbilityIds: magicIds },
    });
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onSeal(result);
  };

  const setLookKey = <K extends keyof DtHeroLook>(key: K, value: DtHeroLook[K]) => {
    setLook((prev) => ({ ...prev, [key]: value }));
  };

  return (
    <div className="dt-panel dt-create space-y-2">
      <DtBackBar backs={[{ label: "Title", onClick: onCancel, primary: true }]} />
      <h2 className="dt-frame-title">Seal {def.displayName}&apos;s seat</h2>
      <p className="dt-tagline">
        You woke without a name in the Woods Without Names — pick a look, then claim a callsign.
        Class and kit next. Your figure shows in camp, party row, and ambushes. Dogs optional; the
        Rememberer already knows more than you do.
      </p>
      {error ? <p className="dt-flash">{error}</p> : null}

      <div className="dt-look-studio">
        <p className="dt-section-label">Character look</p>
        <div className="dt-look-studio-row">
          <DtHeroFigure look={look} label={name || def.displayName} className="dt-look-preview" />
          <div className="dt-look-controls">
            <label>
              Skin
              <select
                value={look.skin}
                onChange={(e) => setLookKey("skin", e.target.value as DtHeroLook["skin"])}
              >
                {DT_SKIN_TONES.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hair
              <select
                value={look.hair}
                onChange={(e) => setLookKey("hair", e.target.value as DtHeroLook["hair"])}
              >
                {DT_HAIR_STYLES.map((id) => (
                  <option key={id} value={id}>
                    {DT_HAIR_LABEL[id]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hair color
              <select
                value={look.hairColor}
                onChange={(e) => setLookKey("hairColor", e.target.value as DtHeroLook["hairColor"])}
              >
                {DT_HAIR_COLORS.map((id) => (
                  <option key={id} value={id}>
                    {id}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Outfit
              <select
                value={look.outfit}
                onChange={(e) => setLookKey("outfit", e.target.value as DtHeroLook["outfit"])}
              >
                {DT_OUTFITS.map((id) => (
                  <option key={id} value={id}>
                    {DT_OUTFIT_HEX[id].label}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Hat
              <select
                value={look.hat}
                onChange={(e) => setLookKey("hat", e.target.value as DtHeroLook["hat"])}
              >
                {DT_HATS.map((id) => (
                  <option key={id} value={id}>
                    {DT_HAT_LABEL[id]}
                  </option>
                ))}
              </select>
            </label>
            <button
              type="button"
              className="dt-btn"
              onClick={() => setLook(defaultDtHeroLook(slot))}
            >
              Reset seat default
            </button>
          </div>
        </div>
      </div>

      <label>
        Name
        <input value={name} onChange={(e) => setName(e.target.value)} />
      </label>
      <label>
        Class
        <select value={classId} onChange={(e) => setClassId(e.target.value as ClassId)}>
          {CLASS_IDS.map((id) => (
            <option key={id} value={id}>
              {CLASS_DEFS[id].name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Race
        <select value={raceId} onChange={(e) => setRaceId(e.target.value as RaceId)}>
          {RACE_IDS.map((id) => (
            <option key={id} value={id}>
              {id}
            </option>
          ))}
        </select>
      </label>
      <label>
        Dog name
        <input value={dogName} onChange={(e) => setDogName(e.target.value)} />
      </label>
      <label>
        Dog breed
        <input value={dogBreed} onChange={(e) => setDogBreed(e.target.value)} />
      </label>
      <p className="dt-tagline">Stat bumps left: {left}</p>
      <div className="dt-party-row">
        {STAT_KEYS.map((key) => (
          <div key={key} className="dt-seat">
            <div>{key}</div>
            <div className="dt-actions">
              <button
                type="button"
                className="dt-btn"
                onClick={() =>
                  setBumps((b) => ({ ...b, [key]: Math.max(0, (b[key] ?? 0) - 1) }))
                }
              >
                −
              </button>
              <span>{(BLANK_BASE_STATS[key] ?? 8) + (bumps[key] ?? 0)}</span>
              <button
                type="button"
                className="dt-btn"
                disabled={left <= 0}
                onClick={() => setBumps((b) => ({ ...b, [key]: (b[key] ?? 0) + 1 }))}
              >
                +
              </button>
            </div>
          </div>
        ))}
      </div>
      <label>
        Weapon
        <select value={weaponId} onChange={(e) => setWeaponId(e.target.value)}>
          {weapons.map((w) => (
            <option key={w.id} value={w.id}>
              {w.name}
            </option>
          ))}
        </select>
      </label>
      <label>
        Skill
        <select value={skillId} onChange={(e) => setSkillId(e.target.value)}>
          {skills.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </select>
      </label>
      <p className="dt-tagline">Magic picks ({magicIds.length}/{magicNeeded})</p>
      <div className="dt-actions">
        {magicOptions.map((m) => {
          const on = magicIds.includes(m.id);
          return (
            <button
              key={m.id}
              type="button"
              className="dt-btn"
              data-variant={on ? "primary" : "secondary"}
              onClick={() => {
                setMagicIds((prev) => {
                  if (prev.includes(m.id)) return prev.filter((x) => x !== m.id);
                  if (prev.length >= magicNeeded) return [...prev.slice(1), m.id];
                  return [...prev, m.id];
                });
              }}
            >
              {m.name}
            </button>
          );
        })}
      </div>
      <div className="dt-actions">
        <button type="button" className="dt-btn" data-variant="primary" onClick={submit}>
          Seal hero
        </button>
        <button type="button" className="dt-btn" onClick={quickSeal}>
          Quick seal defaults
        </button>
        <button type="button" className="dt-btn" data-variant="tertiary" onClick={onCancel}>
          ← Back to Title
        </button>
      </div>
    </div>
  );
}
