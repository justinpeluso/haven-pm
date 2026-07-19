"use client";

import {
  dtLocalMapSrc,
  dtLocalProgress,
  dtRegionForChapter,
} from "@/lib/downtown/dungeon-tester/maps";

type Props = {
  chapterId: string;
  campaignNodeId: string;
  replay?: boolean;
};

export function DtLocalMap({ chapterId, campaignNodeId, replay }: Props) {
  const region = dtRegionForChapter(chapterId);
  const localMapId = region?.localMapId ?? "local-ch-01";
  const { t, index, total } = dtLocalProgress(chapterId, campaignNodeId);
  // Keep marker on the painted path band (~12%–88% of width).
  const leftPct = 12 + t * 76;

  return (
    <div className="dt-local-map" aria-label="Local march map">
      <div className="dt-local-map-head">
        <p className="dt-section-label">Local map</p>
        <p className="dt-local-map-title">
          {region?.name ?? chapterId}
          {replay ? <span className="dt-local-map-replay"> · revisit</span> : null}
        </p>
        <p className="dt-local-map-meta">
          Beat {index + 1} / {total}
        </p>
      </div>
      <div className="dt-local-map-plate">
        <img
          className="dt-local-map-art"
          src={dtLocalMapSrc(localMapId)}
          alt={`${region?.name ?? "Chapter"} march map`}
        />
        <div
          className="dt-local-map-you"
          style={{ left: `${leftPct}%` }}
          title="You are here"
        >
          <span className="dt-local-map-you-dot" />
          <span className="dt-local-map-you-label">You</span>
        </div>
      </div>
    </div>
  );
}
