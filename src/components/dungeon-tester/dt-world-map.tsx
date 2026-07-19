"use client";

import {
  useCallback,
  useEffect,
  useMemo,
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
  dtFurthestChapterNumber,
  dtRegionForChapter,
  dtRegionUnlocked,
  dtWorldMapSrc,
  type DtMapRegion,
} from "@/lib/downtown/dungeon-tester/maps";
import {
  DT_SIDE_QUEST_BAND_LABEL,
  DT_SIDE_QUESTS,
  dtSideQuestUnlocked,
  type DtSideQuest,
  type DtSideQuestBand,
} from "@/lib/downtown/dungeon-tester/side-quests";

const LOCKED_FOOTER = "Still ahead of the march.";
const LOCKED_SIDE_FOOTER = "That side job is still ahead of the march.";
const DEFAULT_FOOTER =
  "Hover a pin, side job, or landmark. Future roads stay visible but locked.";
const ATLAS_HINT =
  "Scroll zoom · drag pan · unlocked pins revisit · side jobs pause the main story";

type BandFilter = "all" | DtSideQuestBand;

type Props = {
  open: boolean;
  chapterId: string;
  furthestChapterId: string;
  replayRegionId?: string | null;
  activeSideQuestId?: string | null;
  completedSideQuestIds?: string[];
  onClose: () => void;
  onEnterRegion: (regionId: string) => void;
  onEnterSideQuest: (questId: string) => void;
  onReturnToMarch?: () => void;
};

type HoverTarget =
  | { kind: "region"; id: string }
  | { kind: "landmark"; id: string }
  | { kind: "side"; id: string }
  | null;

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

function sideQuestGlyph(quest: DtSideQuest): string {
  const n = Number(quest.id.replace(/\D/g, "")) || 0;
  const variants = ["!", "◆", "☠"];
  return variants[n % variants.length] ?? "!";
}

function sideQuestStatus(
  quest: DtSideQuest,
  furthestChapterNumber: number,
  activeSideQuestId: string | null | undefined,
  completed: Set<string>
): "active" | "done" | "unlocked" | "locked" {
  if (!dtSideQuestUnlocked(quest, furthestChapterNumber)) return "locked";
  if (activeSideQuestId === quest.id) return "active";
  if (completed.has(quest.id)) return "done";
  return "unlocked";
}

export function DtWorldMap({
  open,
  chapterId,
  furthestChapterId,
  replayRegionId,
  activeSideQuestId,
  completedSideQuestIds,
  onClose,
  onEnterRegion,
  onEnterSideQuest,
  onReturnToMarch,
}: Props) {
  const [scale, setScale] = useState(1);
  const [tx, setTx] = useState(0);
  const [ty, setTy] = useState(0);
  const [hover, setHover] = useState<HoverTarget>(null);
  const [bandFilter, setBandFilter] = useState<BandFilter>("all");
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
  const furthestNum = dtFurthestChapterNumber(furthestChapterId);
  const completed = useMemo(
    () => new Set(completedSideQuestIds ?? []),
    [completedSideQuestIds]
  );

  const visibleSideQuests = useMemo(() => {
    if (bandFilter === "all") return DT_SIDE_QUESTS;
    return DT_SIDE_QUESTS.filter((q) => q.unlockBand === bandFilter);
  }, [bandFilter]);

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

  const sideClick = (quest: DtSideQuest, e: MouseEvent) => {
    e.stopPropagation();
    if (dragRef.current?.moved) return;
    if (!dtSideQuestUnlocked(quest, furthestNum)) {
      flashFooter(LOCKED_SIDE_FOOTER);
      return;
    }
    onEnterSideQuest(quest.id);
  };

  const footerCopy = (() => {
    if (footerFlash) {
      return (
        <p className="dt-world-map-footer-flash" data-tone="locked">
          {footerFlash}
        </p>
      );
    }

    if (hover?.kind === "side") {
      const quest = DT_SIDE_QUESTS.find((q) => q.id === hover.id);
      if (quest) {
        const status = sideQuestStatus(
          quest,
          furthestNum,
          activeSideQuestId,
          completed
        );
        const statusNote =
          status === "locked"
            ? " · Locked"
            : status === "active"
              ? " · Active side job"
              : status === "done"
                ? " · Cleared"
                : " · Side job — pauses main story";
        return (
          <div className="dt-world-map-footer-detail">
            <p>
              <strong>{quest.title}</strong> — {quest.blurb}
              {statusNote}
            </p>
            <p className="dt-world-map-footer-meta">
              {DT_SIDE_QUEST_BAND_LABEL[quest.unlockBand]}
              {quest.regionHint ? ` · Near ${quest.regionHint}` : ""}
              {quest.rewardHint ? ` · ${quest.rewardHint}` : ""}
            </p>
          </div>
        );
      }
    }

    if (hover?.kind === "region") {
      const region = DT_MAP_REGIONS.find((r) => r.id === hover.id);
      if (region) {
        const status = pinStatus(
          region,
          furthestChapterId,
          currentRegion?.id,
          replayRegionId
        );
        const statusNote =
          status === "locked"
            ? " · Locked"
            : status === "here"
              ? " · Live march"
              : status === "revisit"
                ? " · Practice revisit"
                : " · Cleared — practice";
        return (
          <div className="dt-world-map-footer-detail">
            <p>
              <strong>{region.name}</strong> — {region.blurb}
              {statusNote}
            </p>
            <p className="dt-world-map-footer-meta">
              Main road · Chapter {region.chapter}
              {region.terrain?.length ? ` · ${region.terrain.join(", ")}` : ""}
            </p>
          </div>
        );
      }
    }

    if (hover?.kind === "landmark") {
      const lm = DT_MAP_LANDMARKS.find((l) => l.id === hover.id);
      if (lm) {
        return (
          <p>
            <strong>{lm.name}</strong> — {lm.blurb ?? "landmark"}
          </p>
        );
      }
    }

    return (
      <div className="dt-world-map-footer-detail">
        <p>{DEFAULT_FOOTER}</p>
        <p className="dt-world-map-footer-meta">
          {visibleSideQuests.length} side jobs shown
          {bandFilter === "all" ? "" : ` · ${DT_SIDE_QUEST_BAND_LABEL[bandFilter]}`}
          {" · "}
          Furthest march ch.{furthestNum}
        </p>
      </div>
    );
  })();

  const bandChips: { id: BandFilter; label: string }[] = [
    { id: "all", label: "All" },
    { id: 1, label: "Band 1" },
    { id: 2, label: "Band 2" },
    { id: 3, label: "Band 3" },
    { id: 4, label: "Band 4" },
  ];

  return (
    <div className="dt-world-map" role="dialog" aria-modal="true" aria-label={DT_MAP_TITLE}>
      <div className="dt-world-map-chrome">
        <div>
          <p className="dt-section-label">World map</p>
          <h2 className="dt-world-map-title">{DT_MAP_TITLE}</h2>
          <p className="dt-world-map-hint">{ATLAS_HINT}</p>
          <div className="dt-world-map-legend" aria-label="Map legend">
            <span className="dt-world-map-legend-item" data-kind="main">
              <span className="dt-world-map-legend-swatch" data-kind="main" />
              Main road
            </span>
            <span className="dt-world-map-legend-item" data-kind="side">
              <span className="dt-world-map-legend-swatch" data-kind="side">
                ◆
              </span>
              Side job
            </span>
            <span className="dt-world-map-legend-item" data-kind="locked">
              <span className="dt-world-map-legend-swatch" data-kind="locked" />
              Locked
            </span>
          </div>
          <div className="dt-world-map-filters" role="group" aria-label="Side quest band filter">
            {bandChips.map((chip) => (
              <button
                key={String(chip.id)}
                type="button"
                className="dt-world-map-filter-chip"
                data-active={bandFilter === chip.id ? "1" : "0"}
                onClick={() => setBandFilter(chip.id)}
              >
                {chip.label}
              </button>
            ))}
          </div>
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
            src={`${dtWorldMapSrc()}?v=3`}
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
              onMouseEnter={() => setHover({ kind: "landmark", id: lm.id })}
              onMouseLeave={() => setHover(null)}
              onFocus={() => setHover({ kind: "landmark", id: lm.id })}
              onBlur={() => setHover(null)}
            >
              <span className="dt-world-map-landmark-dot" data-kind={lm.kind} />
            </button>
          ))}
          {visibleSideQuests.map((quest) => {
            const status = sideQuestStatus(
              quest,
              furthestNum,
              activeSideQuestId,
              completed
            );
            const unlocked = status !== "locked";
            const chip =
              status === "active"
                ? "SIDE"
                : status === "done"
                  ? "DONE"
                  : status === "locked"
                    ? "LOCKED"
                    : null;
            return (
              <button
                key={quest.id}
                type="button"
                className="dt-world-map-side-pin"
                data-status={status}
                data-band={quest.unlockBand}
                data-unlocked={unlocked ? "1" : "0"}
                style={{ left: `${quest.pin.x}%`, top: `${quest.pin.y}%` }}
                aria-label={
                  status === "locked"
                    ? `${quest.title} — locked side job`
                    : status === "active"
                      ? `${quest.title} — active side job`
                      : status === "done"
                        ? `${quest.title} — cleared side job`
                        : `${quest.title} — side job, pauses main story`
                }
                aria-disabled={!unlocked}
                onMouseEnter={() => setHover({ kind: "side", id: quest.id })}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ kind: "side", id: quest.id })}
                onBlur={() => setHover(null)}
                onClick={(e) => sideClick(quest, e)}
              >
                <span className="dt-world-map-side-pin-glyph" aria-hidden="true">
                  {sideQuestGlyph(quest)}
                </span>
                {chip ? (
                  <span className="dt-world-map-pin-chip" data-status={status}>
                    {chip}
                  </span>
                ) : null}
                <span className="dt-world-map-side-pin-label">{quest.title}</span>
              </button>
            );
          })}
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
                onMouseEnter={() => setHover({ kind: "region", id: region.id })}
                onMouseLeave={() => setHover(null)}
                onFocus={() => setHover({ kind: "region", id: region.id })}
                onBlur={() => setHover(null)}
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
