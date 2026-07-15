"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { DowntownSubnav } from "@/components/downtown/downtown-subnav";
import { BattleOverlay } from "@/components/party-chronicle/battle-overlay";
import type { BattleActionOpts } from "@/lib/downtown/party-chronicle/battle";
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
  BattleActionId,
  ClassId,
  PlayerIdentity,
  StatKey,
} from "@/lib/downtown/party-chronicle/types";
import { CLASS_IDS, PLAYER_SLOT_ORDER, STAT_KEYS } from "@/lib/downtown/party-chronicle/types";
import {
  DT_TARGET_PLAYTIME_HOURS,
  addPlaytime,
  applyDtBattleAction,
  chooseFrame,
  clearLocalDtWorld,
  continueFrame,
  createNewDtWorld,
  dismissDtBattle,
  formatPlaytimeHud,
  getFrame,
  normalizeDtWorld,
  readLocalDtWorld,
  sealDtCharacter,
  writeLocalDtWorld,
  type DtWorldSave,
} from "@/lib/downtown/dungeon-tester";
import "@/components/party-chronicle/party-chronicle.css";
import "./dungeon-tester.css";

type Phase = "title" | "create" | "play";

const STAT_POOL = 27;

export function DungeonTesterGame({ identity }: { identity: PlayerIdentity }) {
  const mySlot = identity.slot;
  const [phase, setPhase] = useState<Phase>("title");
  const [world, setWorld] = useState<DtWorldSave | null>(null);
  const [flash, setFlash] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [bootstrapped, setBootstrapped] = useState(false);
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
  };

  const onSeal = (sealed: DtWorldSave) => {
    persist(sealed);
    setPhase("play");
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

  const onBattleAction = (action: BattleActionId, opts?: BattleActionOpts) => {
    if (!world || !mySlot) return;
    setPending(true);
    const r = applyDtBattleAction(world, mySlot, action, opts);
    persist(r.world);
    if (r.message) setFlash(r.message);
    setPending(false);
  };

  const onDismissBattle = () => {
    if (!world) return;
    persist(dismissDtBattle(world));
  };

  const frame = world ? getFrame(world.campaignNodeId) : undefined;
  const sealedCount = world
    ? PLAYER_SLOT_ORDER.filter((s) => world.characters[s]?.created).length
    : 0;
  const playHud = formatPlaytimeHud(world?.storyPlayMs ?? 0, DT_TARGET_PLAYTIME_HOURS);

  if (!bootstrapped) {
    return (
      <div className="downtown-shell dungeon-tester space-y-3">
        <DowntownSubnav active="dungeon-tester" />
        <p className="dt-tagline">Loading DungeonTester…</p>
      </div>
    );
  }

  return (
    <div className="downtown-shell dungeon-tester space-y-3">
      <DowntownSubnav active="dungeon-tester" />

      <div className="dt-hud-bar" aria-live="polite">
        <span>
          Play time <strong>{playHud}</strong>
        </span>
        <span>
          Frames <strong>{world?.framesAdvanced ?? 0}</strong>
          {world ? ` · next ambush @ ${world.nextEncounterAtFrame}` : null}
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
            like Neverworld (Justin, Rusty, Elisha, Eric). Battles have no pressure clocks; the HUD
            still counts toward ~30 hours.
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
                  </div>
                  <div>
                    {c.created
                      ? `${c.name} · Lv${c.level} · ${c.hp}/${c.maxHp} HP`
                      : "Unsealed"}
                  </div>
                </div>
              );
            })}
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
          ) : (
            <div className="dt-panel">
              <div className="dt-comic-strip">
                <div className="dt-comic-plate" aria-hidden>
                  {frame?.title?.split(" ")[0] ?? "Road"}
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
                    <button type="button" className="dt-btn" onClick={() => setPhase("title")}>
                      Title
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {world.battle && mySlot ? (
            <BattleOverlay
              world={{
                version: 1,
                activeSlot: world.activeSlot,
                turnIndex: world.turnIndex,
                campaignNodeId: world.campaignNodeId,
                chapterId: world.chapterId,
                partyFlags: world.partyFlags,
                alignment: { animal: 0, human: 0, demon: 0 },
                pathway: { giver: 0, taker: 0 },
                encounterEnemyHp: world.encounterEnemyHp,
                deckEncounter: null,
                battle: world.battle,
                storyPlayMs: world.storyPlayMs,
                battlesFought: world.battlesFought,
                nextEncounterAtMs: world.nextEncounterAtMs,
                completedSideQuests: [],
                cookedRecipes: [],
                log: world.log,
                endingId: world.endingId,
                characters: world.characters,
                startedAt: world.startedAt,
                updatedAt: world.updatedAt,
              }}
              mySlot={mySlot}
              canAct={!!world.characters[mySlot]?.created}
              pending={pending}
              onAction={onBattleAction}
              onDismiss={onDismissBattle}
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
