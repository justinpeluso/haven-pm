"use client";

import {
  useCallback,
  useRef,
  useState,
  type MouseEvent,
  type PointerEvent,
  type WheelEvent,
} from "react";
import {
  DT_MAP_LANDMARKS,
  DT_MAP_REGIONS,
  DT_MAP_TITLE,
  dtRegionForChapter,
  dtRegionUnlocked,
  dtWorldMapSrc,
  type DtMapRegion,
} from "@/lib/downtown/dungeon-tester/maps";

type Props = {
  open: boolean;
  chapterId: string;
  furthestChapterId: string;
  replayRegionId?: string | null;
  onClose: () => void;
  onEnterRegion: (regionId: string) => void;
  onReturnToMarch?: () => void;
};

export function DtWorldMap({
  open,
  chapterId,
  furthestChapterId,
  replayRegionId,
  onClose,
  onEnterRegion,
  onReturnToMarch,
}: Props) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [hoverId, setHoverId] = useState<string | null>(null);
  const dragRef = useRef<{
    x: number;
    y: number;
    tx: number;
    ty: number;
    moved: boolean;
  } | null>(null);
  const viewportRef = useRef<HTMLDivElement | null>(null);

  const currentRegion = dtRegionForChapter(chapterId);
  const hoverRegion =
    DT_MAP_REGIONS.find((r) => r.id === hoverId) ??
    DT_MAP_LANDMARKS.find((l) => l.id === hoverId);

  const resetView = useCallback(() => {
    setScale(1);
    setTx(0);
    setTy(0);
  }, []);

  if (!open) return null;

  const onWheel = (e: WheelEvent) => {
    e.preventDefault();
    const next = Math.min(3.2, Math.max(0.7, scale * (e.deltaY < 0 ? 1.08 : 0.92)));
    setScale(next);
  };

  const onPointerDown = (e: PointerEvent) => {
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
    dragRef.current = { x: e.clientX, y: e.clientY, tx, ty, moved: false };
  };

  const onPointerMove = (e: PointerEvent) => {
    const d = dragRef.current;
    if (!d) return;
    const dx = e.clientX - d.x;
    const dy = e.clientY - d.y;
    if (Math.abs(dx) + Math.abs(dy) > 4) d.moved = true;
    setTx(d.tx + dx);
    setTy(d.ty + dy);
  };

  const onPointerUp = () => {
    dragRef.current = null;
  };

  const pinClick = (region: DtMapRegion, e: MouseEvent) => {
    e.stopPropagation();
    if (dragRef.current?.moved) return;
    if (!dtRegionUnlocked(region, furthestChapterId)) return;
    onEnterRegion(region.id);
  };

  return (
    <div className="dt-world-map" role="dialog" aria-modal="true" aria-label={DT_MAP_TITLE}>
      <div className="dt-world-map-chrome">
        <div>
          <p className="dt-section-label">World map</p>
          <h2 className="dt-world-map-title">{DT_MAP_TITLE}</h2>
          <p className="dt-world-map-hint">
            Scroll to zoom · drag to pan · unlocked pins revisit without story rewards
          </p>
        </div>
        <div className="dt-world-map-actions">
          <button type="button" className="dt-btn" data-variant="secondary" onClick={resetView}>
            Reset view
          </button>
          {replayRegionId && onReturnToMarch ? (
            <button
              type="button"
              className="dt-btn"
              data-variant="primary"
              onClick={onReturnToMarch}
            >
              Return to march
            </button>
          ) : null}
          <button type="button" className="dt-btn" data-variant="tertiary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>

      <div
        ref={viewportRef}
        className="dt-world-map-viewport"
        onWheel={onWheel}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
      >
        <div
          className="dt-world-map-stage"
          style={{
            transform: `translate(${tx}px, ${ty}px) scale(${scale})`,
          }}
        >
          <img
            className="dt-world-map-art"
            src={dtWorldMapSrc()}
            alt="Wilderland atlas"
            draggable={false}
          />
          {DT_MAP_LANDMARKS.map((lm) => (
            <button
              key={lm.id}
              type="button"
              className="dt-world-map-landmark"
              style={{ left: `${lm.x}%`, top: `${lm.y}%` }}
              title={lm.name}
              onMouseEnter={() => setHoverId(lm.id)}
              onMouseLeave={() => setHoverId(null)}
            >
              <span className="dt-world-map-landmark-dot" data-kind={lm.kind} />
            </button>
          ))}
          {DT_MAP_REGIONS.map((region) => {
            const unlocked = dtRegionUnlocked(region, furthestChapterId);
            const here = currentRegion?.id === region.id;
            const replaying = replayRegionId === region.id;
            return (
              <button
                key={region.id}
                type="button"
                className="dt-world-map-pin"
                data-unlocked={unlocked ? "1" : "0"}
                data-here={here ? "1" : "0"}
                data-replay={replaying ? "1" : "0"}
                style={{ left: `${region.pin.x}%`, top: `${region.pin.y}%` }}
                title={
                  unlocked
                    ? `${region.name} — click to revisit`
                    : `${region.name} — locked until the march reaches it`
                }
                disabled={!unlocked}
                onMouseEnter={() => setHoverId(region.id)}
                onMouseLeave={() => setHoverId(null)}
                onClick={(e) => pinClick(region, e)}
              >
                <span className="dt-world-map-pin-dot" />
                <span className="dt-world-map-pin-label">{region.name}</span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="dt-world-map-footer">
        {hoverRegion && "blurb" in hoverRegion ? (
          <p>
            <strong>{hoverRegion.name}</strong> — {hoverRegion.blurb}
            {!dtRegionUnlocked(hoverRegion, furthestChapterId)
              ? " (locked)"
              : ""}
          </p>
        ) : hoverRegion ? (
          <p>
            <strong>{hoverRegion.name}</strong> — landmark
          </p>
        ) : (
          <p>Hover a pin or landmark. Future roads stay visible but locked.</p>
        )}
      </div>
    </div>
  );
}
