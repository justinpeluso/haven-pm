"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DowntownSubnav } from "@/components/downtown/downtown-subnav";
import { InventoryPanel } from "@/components/party-chronicle/inventory-panel";
import { SimpleBattleOverlay } from "@/components/dungeon-tester/simple-battle-overlay";
import {
  BLANK_BASE_STATS,
  listCreateMagic,
  listCreateSkills,
  magicSlotsForClass,
  weaponsForClass,
} from "@/lib/downtown/party-chronicle/create";
import { CLASS_DEFS, SLOT_DEFAULTS } from "@/lib/downtown/party-chronicle/players";
import { applyPointBuy } from "@/lib/downtown/party-chronicle/persist";
import { RACE_IDS, type RaceId } from "@/lib/downtown/party-chronicle/races";
import type {
  ClassId,
  EquipSlot,
  PlayerIdentity,
  StatKey,
} from "@/lib/downtown/party-chronicle/types";
import { CLASS_IDS, PLAYER_SLOT_ORDER, STAT_KEYS } from "@/lib/downtown/party-chronicle/types";
import {
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
  dismissDtBattle,
  dtArtSrc,
  dtBuyFromCampMerchant,
  dtDigForLoot,
  dtEquipItem,
  dtForceAmbush,
  dtReadSpellbook,
  dtSalvageItem,
  dtSceneArtSrc,
  dtSleepAtCamp,
  dtStumbleOnChest,
  dtUnequipSlot,
  dtUseConsumable,
  formatPlaytimeHud,
  getDtArt,
  getFrame,
  normalizeDtWorld,
  performSimpleBattleAction,
  readLocalDtWorld,
  sealDtCharacter,
  writeLocalDtWorld,
  type DtFrame,
  type DtWorldSave,
  type SimpleBattleActionId,
} from "@/lib/downtown/dungeon-tester";
import "@/components/party-chronicle/party-chronicle.css";
import "./dungeon-tester.css";

type Phase = "title" | "create" | "play";
type PlayTab = "story" | "camp" | "gear";

const STAT_POOL = 27;
const FALLBACK_PLATE = "/dungeon-tester/scenes/dusty-trail.svg";

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
  const [world, setWorld] = useState<DtWorldSave | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
  const [merchantSold, setMerchantSold] = useState<{
    id: number;
    spent: number;
    goldLeft: number;
  } | null>(null);
  const playTickRef = useRef<number | null>(null);

  const persist = useCallback(
    (next: DtWorldSave, opts?: { sync?: boolean }) => {
      const stamped = { ...next, updatedAt: new Date().toISOString() };
      setWorld(stamped);
      writeLocalDtWorld(stamped);
      if (opts?.sync === false) return;
      void fetch("/api/downtown/dungeon-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world: stamped }),
      }).catch(() => {
        /* offline ok — local save holds */
      });
    },
    []
  );

  useEffect(() => {
    let cancelled = false;
    (async () => {
      const local = readLocalDtWorld();
      try {
        const res = await fetch("/api/downtown/dungeon-tester");
        if (res.ok) {
          const data = (await res.json()) as { world: DtWorldSave | null; hasSave: boolean };
          if (!cancelled && data.world) {
            const merged =
              local && local.framesAdvanced > data.world.framesAdvanced
                ? normalizeDtWorld({
                    ...data.world,
                    framesAdvanced: local.framesAdvanced,
                    storyPlayMs: Math.max(local.storyPlayMs, data.world.storyPlayMs),
                    characters: local.characters,
                    battle: local.battle?.status === "active" ? local.battle : data.world.battle,
                    campaignNodeId: local.campaignNodeId,
                    framesSinceEncounter: local.framesSinceEncounter,
                    nextEncounterAtFrame: local.nextEncounterAtFrame,
                    campSleeps: local.campSleeps ?? data.world.campSleeps,
                    partyFlags: Array.from(
                      new Set([...(data.world.partyFlags ?? []), ...(local.partyFlags ?? [])])
                    ),
                  })
                : normalizeDtWorld(data.world);
            setWorld(merged);
            writeLocalDtWorld(merged);
            setBootstrapped(true);
            return;
          }
        }
      } catch {
        /* use local */
      }
      if (!cancelled) {
        if (local) setWorld(local);
        setBootstrapped(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Visible campaign playtime toward ~30h (not battle pressure clocks).
  useEffect(() => {
    if (phase !== "play" || !world) return;
    if (playTickRef.current) window.clearInterval(playTickRef.current);
    playTickRef.current = window.setInterval(() => {
      setWorld((prev) => {
        if (!prev) return prev;
        const next = addPlaytime(prev, 1000);
        writeLocalDtWorld(next);
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
      const local = readLocalDtWorld();
      if (!local) return;
      void fetch("/api/downtown/dungeon-tester", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ world: local }),
      }).catch(() => undefined);
    }, 15_000);
    return () => window.clearInterval(id);
  }, [phase, !!world]);

  useEffect(() => {
    if (!bootstrapped || !world || !mySlot) return;
    if (phase === "play" && !world.characters[mySlot]?.created) {
      setPhase("create");
    }
  }, [bootstrapped, world, mySlot, phase]);

  const startFresh = () => {
    const fresh = createNewDtWorld();
    persist(fresh);
    if (mySlot && !fresh.characters[mySlot]?.created) setPhase("create");
    else setPhase("play");
    setTab("story");
    setFlash("New Wilderland march opened.");
  };

  const continueSave = () => {
    const w = world ?? readLocalDtWorld();
    if (!w) {
      startFresh();
      return;
    }
    persist(w);
    if (mySlot && !w.characters[mySlot]?.created) setPhase("create");
    else setPhase("play");
    setTab("story");
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

  const onBattleAction = (
    heroId: string,
    action: SimpleBattleActionId,
    targetId?: string
  ) => {
    if (!world || pending) return;
    setPending(true);
    const r = performSimpleBattleAction(world, heroId, action, targetId);
    persist(r.world);
    if (r.message) setFlash(r.message);
    setPending(false);
  };

  const onDismissBattle = () => {
    if (!world) return;
    persist(dismissDtBattle(world));
    setTab("story");
    setFlash("Road clears — story resumes.");
  };

  const onBattleFxDone = () => {
    if (!world?.battle?.fx?.length) return;
    persist(clearSimpleBattleFx(world), { sync: false });
  };

  const battleActive = world?.battle?.status === "active";
  const battleOpen = !!world?.battle;
  const acting =
    !!mySlot &&
    !!world?.characters[mySlot]?.created &&
    (identity.isDm || world?.activeSlot === mySlot);
  const me = mySlot && world ? world.characters[mySlot] : null;

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
      <div className="downtown-shell dungeon-tester party-comic party-rpg90s party-chronicle space-y-3">
        <DowntownSubnav active="dungeon-tester" />
        <p className="dt-tagline">Loading DungeonTester…</p>
      </div>
    );
  }

  const shellClass =
    "downtown-shell dungeon-tester party-comic party-rpg90s party-chronicle space-y-3";

  return (
    <div className={shellClass}>
      <DowntownSubnav active="dungeon-tester" />

      <div className="dt-hud-bar" aria-live="polite">
        <span>
          Play time <strong>{playHud}</strong>
        </span>
        <span>
          Frames <strong>{world?.framesAdvanced ?? 0}</strong>
          {world
            ? ` · since fight ${world.framesSinceEncounter} · next ambush @ ${world.nextEncounterAtFrame}`
            : null}
        </span>
        <span>
          Party <strong>{sealedCount}/4</strong> sealed
        </span>
      </div>

      {flash ? <p className="dt-flash">{flash}</p> : null}

      {phase === "title" && (
        <div className="dt-panel space-y-3">
          <h1 className="dt-title-hero">DungeonTester</h1>
          <p className="dt-tagline">
            Dusty Wilderland liberation march — Oregon Trail page, short comic frames, party seats
            like Neverworld (Justin, Rusty, Elisha, Eric). Crude clip-art battles are DT-only —
            Camp and Inventory still share party gear helpers.
          </p>
          <div className="dt-party-row">
            {PLAYER_SLOT_ORDER.map((slot) => {
              const c = world?.characters[slot];
              return (
                <div key={slot} className="dt-seat" data-sealed={c?.created ? "true" : "false"}>
                  <div>{SLOT_DEFAULTS[slot].displayName}</div>
                  <div>{c?.created ? `${c.name} · ${CLASS_DEFS[c.classId].name}` : "Need create"}</div>
                </div>
              );
            })}
          </div>
          <div className="dt-actions">
            <button type="button" className="dt-btn" data-primary="true" onClick={continueSave}>
              {world && sealedCount > 0 ? "Continue march" : "Start march"}
            </button>
            <button
              type="button"
              className="dt-btn"
              onClick={() => {
                clearLocalDtWorld();
                startFresh();
              }}
            >
              New campaign
            </button>
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
          <div className="dt-party-row">
            {PLAYER_SLOT_ORDER.map((slot) => {
              const c = world.characters[slot];
              return (
                <div key={slot} className="dt-seat" data-sealed={c.created ? "true" : "false"}>
                  <div>
                    {SLOT_DEFAULTS[slot].displayName}
                    {slot === mySlot ? " (you)" : ""}
                    {world.activeSlot === slot ? " · turn" : ""}
                  </div>
                  <div>
                    {c.created
                      ? `${c.name} · Lv${c.level} · ${c.hp}/${c.maxHp} HP · ${c.gold}g`
                      : "Unsealed"}
                  </div>
                </div>
              );
            })}
          </div>

          <div className="pc-tab-row dt-actions" role="tablist" aria-label="DungeonTester panels">
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
                data-primary={tab === id ? "true" : "false"}
                disabled={!!world.battle && id !== "story"}
                onClick={() => setTab(id)}
              >
                {label}
              </button>
            ))}
            <button type="button" className="dt-btn" onClick={() => setPhase("title")}>
              Title
            </button>
          </div>

          {world.endingId ? (
            <div className="dt-panel">
              <h2 className="dt-frame-title">March beat complete</h2>
              <p className="dt-frame-body">
                Ending flag <strong>{world.endingId}</strong>. More Wilderland spine and hours toward
                the thirty still wait beyond this road — or start a new campaign from the title.
              </p>
              <div className="dt-actions">
                <button type="button" className="dt-btn" onClick={() => setPhase("title")}>
                  Title
                </button>
              </div>
            </div>
          ) : null}

          {!world.endingId && tab === "story" ? (
            <div className="dt-panel">
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
                <div>
                  <p className="text-[0.65rem] uppercase tracking-wide" style={{ color: "var(--dt-muted)" }}>
                    {world.chapterId} · {world.campaignNodeId}
                  </p>
                  <h2 className="dt-frame-title">{frame?.title ?? "Missing frame"}</h2>
                  <p className="dt-frame-body">{frame?.body ?? "Spine gap — check data/dungeon-tester."}</p>
                  <div className="dt-actions">
                    {frame?.choices?.length ? (
                      frame.choices.map((c) => (
                        <button
                          key={c.id}
                          type="button"
                          className="dt-btn"
                          data-primary="true"
                          disabled={!!world.battle}
                          onClick={() => onChoose(c.id)}
                        >
                          {c.label}
                        </button>
                      ))
                    ) : (
                      <button
                        type="button"
                        className="dt-btn"
                        data-primary="true"
                        disabled={!!world.battle || !frame?.next}
                        onClick={onContinue}
                      >
                        Continue →
                      </button>
                    )}
                    {mySlot && !world.characters[mySlot].created ? (
                      <button type="button" className="dt-btn" onClick={() => setPhase("create")}>
                        Seal my seat
                      </button>
                    ) : null}
                  </div>
                </div>
              </div>
            </div>
          ) : null}

          {!world.endingId && tab === "camp" ? (
            <div className="dt-panel space-y-4">
              <div className="pc-main-quest-card">
                <p className="pc-eyebrow text-[0.65rem]">Main march · stay on track</p>
                <p className="font-bold text-sm">{frame?.title ?? world.campaignNodeId}</p>
                <p className="text-[0.65rem] opacity-80 mt-1">
                  Rest and stock up here, then return to Story for the next comic frame.
                </p>
                <div className="flex flex-wrap gap-2 mt-3">
                  <button
                    type="button"
                    className="pc-primary-btn"
                    onClick={() => setTab("story")}
                  >
                    Return to story →
                  </button>
                </div>
              </div>

              <div className="space-y-2">
                <p className="pc-eyebrow text-[0.65rem]">
                  Rest · Sleep ({world ? campSleepsRemaining(asPartyWorld(world)) : 0}/{CAMP_SLEEP_MAX}{" "}
                  this {CAMP_SLEEP_WINDOW_MS / 60_000}m)
                </p>
                <p className="text-xs opacity-70">
                  Sleep restores HP, mana, and stamina for the acting hero (and the hound). Same Camp
                  rules as Neverworld.
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
                {campSleepHint ? (
                  <p className="text-xs opacity-70" style={{ color: "var(--pc-accent)" }}>
                    {campSleepHint}
                  </p>
                ) : null}
              </div>

              <div className="pc-merchant relative space-y-2">
                <p className="pc-eyebrow text-[0.65rem]">
                  Camp merchant · your purse {me?.gold ?? 0}g
                </p>
                <p className="text-xs opacity-70">
                  A traveling peddler — potions, rations, and a few weapons for coin.
                </p>
                {merchantSold ? (
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
                ) : null}
                <div className="space-y-2">
                  {campMerchantStock().map((offer) => (
                    <button
                      key={offer.itemId}
                      type="button"
                      className="pc-choice block w-full text-left"
                      disabled={!acting || battleActive || (me?.gold ?? 0) < offer.price}
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
                <p className="pc-eyebrow text-[0.65rem]">Road battle · DT crude ambush</p>
                {battleActive ? (
                  <p className="text-sm font-bold">Battle in progress — finish the overlay.</p>
                ) : (
                  <button
                    type="button"
                    className="pc-choice"
                    disabled={!acting}
                    onClick={onForceAmbush}
                  >
                    Force road ambush →
                  </button>
                )}
              </div>

              <div className="space-y-2">
                <p className="pc-eyebrow text-[0.65rem]">
                  Trail luck · chests &amp; digging ({world.explorationFinds ?? 0} finds)
                </p>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    className="pc-choice"
                    disabled={!acting || battleActive}
                    onClick={onChest}
                  >
                    Stumble on a treasure chest →
                  </button>
                  <button
                    type="button"
                    className="pc-choice"
                    disabled={!acting || battleActive}
                    onClick={onDig}
                  >
                    Dig a hole for loot →
                  </button>
                </div>
                {world.lastExploration ? (
                  <div className="pc-codex-row text-xs">
                    <strong>{world.lastExploration.title}</strong>
                    <span className="block opacity-80 mt-1">{world.lastExploration.blurb}</span>
                    <span className="block opacity-70 mt-1">
                      {world.lastExploration.itemNames.join(", ") || "empty"} · +
                      {world.lastExploration.gold}g · +{world.lastExploration.xp} XP
                    </span>
                  </div>
                ) : null}
              </div>
            </div>
          ) : null}

          {!world.endingId && tab === "gear" && me ? (
            <div className="dt-panel">
              <InventoryPanel
                char={me}
                canEdit={!!mySlot && !battleActive}
                onEquip={onEquip}
                onUnequip={onUnequip}
                onUseConsumable={onUseConsumable}
                onReadSpellbook={onReadSpellbook}
                onSalvage={onSalvage}
              />
            </div>
          ) : null}

          {battleOpen && world.battle ? (
            <SimpleBattleOverlay
              battle={world.battle}
              mySlot={mySlot}
              canAct={!!mySlot && !!world.characters[mySlot]?.created}
              pending={pending}
              onAction={onBattleAction}
              onDismiss={onDismissBattle}
              onFxDone={onBattleFxDone}
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
      statBumps: bumps,
      kit: { weaponId, skillAbilityId: skillId, magicAbilityIds: magicIds },
    });
    if ("error" in result) {
      setError(result.error);
      return;
    }
    onSeal(result);
  };

  return (
    <div className="dt-panel dt-create space-y-2">
      <h2 className="dt-frame-title">Seal {def.displayName}&apos;s seat</h2>
      <p className="dt-tagline">
        Same Neverworld create kit — blank point-buy, weapon, skill, magic. Dogs optional forever;
        name them now if you want.
      </p>
      {error ? <p className="dt-flash">{error}</p> : null}
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
              data-primary={on ? "true" : "false"}
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
        <button type="button" className="dt-btn" data-primary="true" onClick={submit}>
          Seal hero
        </button>
        <button type="button" className="dt-btn" onClick={quickSeal}>
          Quick seal defaults
        </button>
        <button type="button" className="dt-btn" onClick={onCancel}>
          Back
        </button>
      </div>
    </div>
  );
}
