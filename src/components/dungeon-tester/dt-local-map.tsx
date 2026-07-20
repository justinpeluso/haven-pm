"use client";

import {
  dtBeatProgressT,
  dtBeatState,
  dtBeatsForChapter,
  dtLocalMapSrc,
  dtLocalProgress,
  dtLocalStripLeftPct,
  dtNearestBeatLabel,
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
  const leftPct = dtLocalStripLeftPct(t);
  const beats = dtBeatsForChapter(chapterId);
  const nearest = dtNearestBeatLabel(chapterId, campaignNodeId);
  const nearestAheadId =
    beats.find(
      (beat) => dtBeatState(chapterId, campaignNodeId, beat) === "ahead"
    )?.id ?? null;

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
          {nearest ? ` · ${nearest}` : null}
        </p>
      </div>
      <div className={`dt-local-map-plate${replay ? " is-replay" : ""}`}>
        <img
          className="dt-local-map-art"
          src={dtLocalMapSrc(localMapId)}
          alt={`${region?.name ?? "Chapter"} march map`}
          loading="lazy"
        />
        {beats.map((beat) => {
          const beatT = dtBeatProgressT(chapterId, beat);
          const state = dtBeatState(chapterId, campaignNodeId, beat);
          const showLabelMobile =
            state === "here" || beat.id === nearestAheadId;
          return (
            <div
              key={beat.id}
              className={
                showLabelMobile
                  ? "dt-local-map-beat is-label-mobile"
                  : "dt-local-map-beat"
              }
              data-kind={beat.kind}
              data-state={state}
              style={{ left: `${dtLocalStripLeftPct(beatT)}%` }}
              title={`${beat.label} (${beat.kind})`}
              aria-label={`${beat.label}, ${beat.kind}, ${state}`}
            >
              <span className="dt-local-map-beat-hit" aria-hidden />
              <span className="dt-local-map-beat-glyph" aria-hidden />
              <span className="dt-local-map-beat-label">{beat.label}</span>
            </div>
          );
        })}
        <div
          className="dt-local-map-you"
          style={{ left: `${leftPct}%` }}
          title="You are here"
        >
          <span className="dt-local-map-you-dot" />
          <span className="dt-local-map-you-label">{replay ? "Revisit" : "You"}</span>
        </div>
      </div>
    </div>
  );
}
