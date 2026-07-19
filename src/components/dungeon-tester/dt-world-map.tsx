"use client";

import {
  useCallback,
  useEffect,
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

const LOCKED_FOOTER = "Still ahead of the march.";
const DEFAULT_FOOTER =
  "Hover a pin or landmark. Future roads stay visible but locked.";
const ATLAS_HINT =
  "Scroll zoom · drag pan · unlocked pins revisit without story rewards";

type Props = {
  open: boolean;
  chapterId: string;
  furthestChapterId: string;
  replayRegionId?: string | null;
  onClose: () => void;
  onEnterRegion: (regionId: string) => void;
  onReturnToMarch?: () => void;
};

function pinStatus(
  region: DtMapRegion,
  furthestChapterId: string,
  currentRegionId: string | undefined,
  replayRegionId: string | null | undefined
): "here" | "revisit" | "unlocked" | "locked" {
  const unlocked = dtRegionUnlocked(region, furthestChapterId);
  if (!unlocked) return "locked";
  if (replayRegionId === region.id) return "revisit";
  if (currentRegionId === region.id && !replayRegionId) return "here";
  if (currentRegionId === region.id && replayRegionId) return "unlocked";
  return "unlocked";
}

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
  const [footerFlash, setFooterFlash] = useState<string | null>(null);
  const flashTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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

  const flashFooter = useCallback((message: string) => {
    if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    setFooterFlash(message);
    flashTimerRef.current = setTimeout(() => {
      setFooterFlash(null);
      flashTimerRef.current = null;
    }, 2200);
  }, []);

  useEffect(() => {
    return () => {
      if (flashTimerRef.current) clearTimeout(flashTimerRef.current);
    };
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
    if (!dtRegionUnlocked(region, furthestChapterId)) {
      flashFooter(LOCKED_FOOTER);
      return;
    }
    onEnterRegion(region.id);
  };

  const footerCopy = (() => {
    if (footerFlash) {
      return (
        <p className="dt-world-map-footer-flash" data-tone="locked">
          {footerFlash}
        </p>
      );
    }
    if (hoverRegion && "blurb" in hoverRegion && hoverRegion.blurb) {
      const status =
        "chapter" in hoverRegion
          ? pinStatus(
              hoverRegion,
              furthestChapterId,
              currentRegion?.id,
              replayRegionId
            )
          : null;
      const statusNote =
        status === "locked"
          ? " · Locked"
          : status === "here"
            ? " · Live march"
            : status === "revisit"
              ? " · Practice revisit"
              : status === "unlocked"
                ? " · Cleared — practice"
                : "";
      return (
        <p>
          <strong>{hoverRegion.name}</strong> — {hoverRegion.blurb}
          {statusNote}
        </p>
      );
    }
    if (hoverRegion) {
      return (
        <p>
          <strong>{hoverRegion.name}</strong> — landmark
        </p>
      );
    }
    return <p>{DEFAULT_FOOTER}</p>;
  })();

  return (
    <div className="dt-world-map" role="dialog" aria-modal="true" aria-label={DT_MAP_TITLE}>
      <div className="dt-world-map-chrome">
        <div>
          <p className="dt-section-label">World map</p>
          <h2 className="dt-world-map-title">{DT_MAP_TITLE}</h2>
          <p className="dt-world-map-hint">{ATLAS_HINT}</p>
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
            src={`${dtWorldMapSrc()}?v=2`}
            alt="Neon Wilderland atlas"
            draggable={false}
          />
          {DT_MAP_LANDMARKS.map((lm) => (
            <button
              key={lm.id}
              type="button"
              className="dt-world-map-landmark"
              style={{ left: `${lm.x}%`, top: `${lm.y}%` }}
              aria-label={lm.blurb ? `${lm.name}: ${lm.blurb}` : lm.name}
              onMouseEnter={() => setHoverId(lm.id)}
              onMouseLeave={() => setHoverId(null)}
              onFocus={() => setHoverId(lm.id)}
              onBlur={() => setHoverId(null)}
            >
              <span className="dt-world-map-landmark-dot" data-kind={lm.kind} />
            </button>
          ))}
          {DT_MAP_REGIONS.map((region) => {
            const status = pinStatus(
              region,
              furthestChapterId,
              currentRegion?.id,
              replayRegionId
            );
            const unlocked = status !== "locked";
            const chip =
              status === "here"
                ? "HERE"
                : status === "revisit"
                  ? "REVISIT"
                  : status === "locked"
                    ? "LOCKED"
                    : null;
            return (
              <button
                key={region.id}
                type="button"
                className="dt-world-map-pin"
                data-status={status}
                data-unlocked={unlocked ? "1" : "0"}
                data-here={status === "here" ? "1" : "0"}
                data-replay={status === "revisit" ? "1" : "0"}
                style={{ left: `${region.pin.x}%`, top: `${region.pin.y}%` }}
                aria-label={
                  status === "locked"
                    ? `${region.name} — locked`
                    : status === "here"
                      ? `${region.name} — live march here`
                      : status === "revisit"
                        ? `${region.name} — practice revisit`
                        : `${region.name} — cleared, practice revisit`
                }
                aria-disabled={!unlocked}
                onMouseEnter={() => setHoverId(region.id)}
                onMouseLeave={() => setHoverId(null)}
                onFocus={() => setHoverId(region.id)}
                onBlur={() => setHoverId(null)}
                onClick={(e) => pinClick(region, e)}
              >
                <span className="dt-world-map-pin-dot" aria-hidden="true" />
                {chip ? (
                  <span className="dt-world-map-pin-chip" data-status={status}>
                    {chip}
                  </span>
                ) : null}
                <span className="dt-world-map-pin-label">
                  {region.name}
                  {status === "locked" ? (
                    <span className="dt-world-map-pin-lock" aria-hidden="true">
                      {" "}
                      ⬡
                    </span>
                  ) : null}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      <div className="dt-world-map-footer">{footerCopy}</div>
    </div>
  );
}
