"use client";

import { useMemo, useRef, useState } from "react";
import {
  ensureExploreState,
  planExplorePath,
  resolveWandererOption,
  stepExplore,
} from "@/lib/downtown/party-chronicle/explore-walk";
import type { PartyWorldSave, PlayerSlot } from "@/lib/downtown/party-chronicle/types";
import {
  BIOME_COLORS,
  BIOME_IDS,
  BIOME_LABELS,
  MAP_VIEW_RADIUS,
  tilesInView,
  type BiomeId,
} from "@/lib/downtown/party-chronicle/world-map";
import "./world-map.css";

type Props = {
  world: PartyWorldSave;
  mySlot: PlayerSlot | null;
  canWalk: boolean;
  isDm: boolean;
  pending: boolean;
  onWorld: (next: PartyWorldSave, flash?: string, opts?: { switchToStory?: boolean }) => void;
};

export function WorldMapPanel({ world, mySlot, canWalk, isDm, pending, onWorld }: Props) {
  const ensured = useMemo(() => ensureExploreState(world), [world]);
  const explore = ensured.explore!;
  const [walking, setWalking] = useState(false);
  const [pathHint, setPathHint] = useState<{ x: number; y: number }[]>([]);
  const walkLock = useRef(false);

  const tiles = useMemo(
    () => tilesInView(explore.seed, explore.x, explore.y, MAP_VIEW_RADIUS),
    [explore.seed, explore.x, explore.y]
  );

  const size = MAP_VIEW_RADIUS * 2 + 1;
  const busy = pending || walking || !!explore.pendingWanderer || world.battle?.status === "active";

  const runPath = async (path: { x: number; y: number }[]) => {
    if (!mySlot || walkLock.current || !path.length) return;
    walkLock.current = true;
    setWalking(true);
    setPathHint(path);
    let cur = ensured;
    try {
      for (const step of path) {
        const result = stepExplore(cur, mySlot, step.x, step.y, { isDm });
        cur = result.world;
        onWorld(cur, result.message, { switchToStory: false });
        setPathHint((p) => p.slice(1));
        if (result.startedBattle || result.wanderer) break;
        await new Promise((r) => window.setTimeout(r, 140));
      }
    } finally {
      walkLock.current = false;
      setWalking(false);
      setPathHint([]);
    }
  };

  const onTileClick = (x: number, y: number, walkable: boolean) => {
    if (!canWalk || !mySlot || busy || !walkable) return;
    if (x === explore.x && y === explore.y) return;
    const path = planExplorePath(ensured, x, y);
    if (!path.length) {
      onWorld(ensured, "No clear path — try a nearer tile.");
      return;
    }
    void runPath(path);
  };

  const onWanderer = (optionId: string) => {
    if (!mySlot || !canWalk) return;
    const result = resolveWandererOption(ensured, mySlot, optionId, { isDm });
    onWorld(result.world, result.message, { switchToStory: result.switchToStory });
  };

  const underfoot = BIOME_LABELS[(explore.biomeId as BiomeId) ?? "grassland"] ?? explore.biomeId;
  const hintSet = useMemo(() => new Set(pathHint.map((p) => `${p.x},${p.y}`)), [pathHint]);

  return (
    <div className="pc-worldmap space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-2">
        <div>
          <p className="pc-eyebrow text-[0.65rem]">Overworld · click to walk</p>
          <h2 className="pc-title text-xl m-0">Neverworld Map</h2>
          <p className="text-sm opacity-90 mt-1">
            Underfoot: <strong>{underfoot}</strong>
            <span className="opacity-70">
              {" "}
              · ({explore.x}, {explore.y}) · {explore.moves} steps
            </span>
          </p>
        </div>
        <p className="text-[0.7rem] opacity-75 max-w-[16rem]">
          Walk the infinite wilds. Fights and travelers find you on the trail. Campfire Chronicle
          keeps the main story.
        </p>
      </div>

      <div
        className="pc-worldmap-grid"
        style={{
          gridTemplateColumns: `repeat(${size}, minmax(0, 1fr))`,
        }}
        role="grid"
        aria-label="Neverworld overworld"
      >
        {tiles.map((t) => {
          const here = t.x === explore.x && t.y === explore.y;
          const onPath = hintSet.has(`${t.x},${t.y}`);
          const colors = BIOME_COLORS[t.biome] ?? BIOME_COLORS.grassland;
          const elevShade = Math.round((t.elev - 0.5) * 28);
          return (
            <button
              key={`${t.x},${t.y}`}
              type="button"
              role="gridcell"
              className="pc-worldmap-tile"
              data-biome={t.biome}
              data-here={here || undefined}
              data-path={onPath || undefined}
              data-blocked={!t.walkable || undefined}
              disabled={!canWalk || busy || !t.walkable}
              title={`${BIOME_LABELS[t.biome]} (${t.x}, ${t.y})`}
              style={{
                background: `linear-gradient(160deg, ${colors.fill} 0%, ${colors.edge} 100%)`,
                filter: elevShade ? `brightness(${100 + elevShade}%)` : undefined,
              }}
              onClick={() => onTileClick(t.x, t.y, t.walkable)}
            >
              {here && <span className="pc-worldmap-party" aria-label="Party" />}
              {t.biome === "cave" && !here && <span className="pc-worldmap-mark">⌂</span>}
              {t.biome === "mountain" && !here && <span className="pc-worldmap-mark">▴</span>}
              {t.biome === "river" && !here && <span className="pc-worldmap-mark">≈</span>}
            </button>
          );
        })}
      </div>

      <div className="pc-worldmap-legend">
        {BIOME_IDS.filter((id) => id !== "ocean").map((id) => (
          <span key={id} className="pc-worldmap-legend-item">
            <i style={{ background: BIOME_COLORS[id].fill }} />
            {BIOME_LABELS[id]}
          </span>
        ))}
        <span className="pc-worldmap-legend-item">
          <i style={{ background: BIOME_COLORS.ocean.fill }} />
          Ocean (blocked)
        </span>
      </div>

      {!canWalk && (
        <p className="text-sm opacity-80">Waiting on another seat — map walks on your turn (or DM).</p>
      )}

      {explore.pendingWanderer && (
        <div className="pc-wanderer-overlay" role="dialog" aria-label="Traveler approaches">
          <div className="pc-wanderer-card">
            <p className="pc-eyebrow">A traveler approaches…</p>
            <h3 className="pc-title text-lg m-0">{explore.pendingWanderer.name}</h3>
            <p className="text-sm mt-2 leading-relaxed">{explore.pendingWanderer.blurb}</p>
            <div className="flex flex-col gap-2 mt-3">
              {explore.pendingWanderer.options.map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  className="pc-choice"
                  disabled={!canWalk || pending}
                  onClick={() => onWanderer(opt.id)}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
