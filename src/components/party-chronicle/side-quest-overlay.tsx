"use client";

import { useEffect, useState } from "react";
import {
  formatQuestClock,
  questRemainingMs,
  type ActiveSideQuest,
} from "@/lib/downtown/party-chronicle/quest-run";
import { comicArtSrc } from "@/lib/downtown/party-chronicle/art";

export function SideQuestOverlay({
  quest,
  canAct,
  inBattle,
  onAdvance,
  onAbandon,
  onDismissFailed,
}: {
  quest: ActiveSideQuest;
  canAct: boolean;
  inBattle: boolean;
  onAdvance: () => void;
  onAbandon: () => void;
  onDismissFailed: () => void;
}) {
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [quest.questId, quest.startedAt]);

  const left = questRemainingMs(quest, now);
  const urgent = left <= 60_000;
  const step = quest.steps[quest.stepIndex];
  const art = quest.artId ? comicArtSrc(quest.artId) : comicArtSrc(quest.sceneId ?? "");

  if (quest.status === "failed_timeout") {
    return (
      <div className="pc-quest-overlay" role="dialog" aria-label="Side quest failed">
        <div className="pc-quest-frame">
          <p className="pc-eyebrow">Trail clock expired</p>
          <h2 className="pc-title text-xl">{quest.title}</h2>
          <p className="text-sm opacity-80">
            The side quest went cold. No rewards this run — try again from Camp when ready.
          </p>
          <button type="button" className="pc-primary-btn mt-4" onClick={onDismissFailed}>
            Back to Camp
          </button>
        </div>
      </div>
    );
  }

  const cta =
    step?.kind === "battle" && !step.battleWon
      ? step.battleStarted && inBattle
        ? "Finish the battle…"
        : "Enter the fight →"
      : step?.kind === "resolve"
        ? "Claim rewards →"
        : "Continue quest →";

  return (
    <div className="pc-quest-overlay" role="dialog" aria-label="Side quest">
      <div className="pc-quest-frame">
        <div className="pc-quest-header">
          <p className="pc-eyebrow">Side quest · {quest.kind}</p>
          <h2 className="pc-title text-xl md:text-2xl">{quest.title}</h2>
          <p
            className="pc-quest-clock"
            data-urgent={urgent ? "true" : "false"}
          >
            Overall trail clock {formatQuestClock(left)}
            <span className="opacity-70"> / {quest.estimatedMinutes}m</span>
          </p>
          <p className="text-xs opacity-80 mt-1">{quest.summary}</p>
        </div>

        {art && (
          <div className="pc-quest-art">
            <img
              src={art}
              alt=""
              onError={(e) => {
                (e.target as HTMLImageElement).style.display = "none";
              }}
            />
          </div>
        )}

        <ol className="pc-quest-steps">
          {quest.steps.map((s, i) => (
            <li
              key={s.id}
              data-current={i === quest.stepIndex ? "true" : "false"}
              data-done={s.done || s.battleWon ? "true" : "false"}
            >
              <strong>
                {s.kind === "battle" ? "⚔ " : ""}
                {s.label}
              </strong>
              {i === quest.stepIndex && (
                <span className="block text-[0.65rem] opacity-80 mt-0.5">{s.blurb}</span>
              )}
            </li>
          ))}
        </ol>

        {inBattle && (
          <p className="text-xs font-bold mt-2" style={{ color: "var(--pc-accent)" }}>
            Battle clocks are live (30s idle → foe strikes · 10 min hard cap). Quest clock keeps
            running.
          </p>
        )}

        <div className="pc-quest-actions">
          <button
            type="button"
            className="pc-primary-btn"
            disabled={!canAct || (inBattle && step?.kind === "battle" && !step.battleWon)}
            onClick={onAdvance}
          >
            {cta}
          </button>
          <button
            type="button"
            className="pc-chip"
            disabled={!canAct || inBattle}
            onClick={onAbandon}
          >
            Abandon quest
          </button>
        </div>
      </div>
    </div>
  );
}
