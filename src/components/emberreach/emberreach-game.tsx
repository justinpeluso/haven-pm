"use client";

import { useEffect, useRef } from "react";
import { ABILITIES } from "@/lib/emberreach/abilities";
import { Game } from "@/lib/emberreach/game";
import "./emberreach.css";

export function EmberreachGame() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hpRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const questRef = useRef<HTMLParagraphElement>(null);
  const objectiveRef = useRef<HTMLParagraphElement>(null);
  const levelRef = useRef<HTMLDivElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);
  const abilityRootRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const hp = hpRef.current;
    const focus = focusRef.current;
    const quest = questRef.current;
    const objective = objectiveRef.current;
    const level = levelRef.current;
    const toast = toastRef.current;
    const abilityRoot = abilityRootRef.current;
    if (
      !root ||
      !canvas ||
      !hp ||
      !focus ||
      !quest ||
      !objective ||
      !level ||
      !toast ||
      !abilityRoot
    ) {
      return;
    }

    const game = new Game(canvas, root, {
      hp,
      focus,
      quest,
      objective,
      level,
      toast,
      abilityRoot,
    });
    game.start();
    return () => game.dispose();
  }, []);

  return (
    <div ref={rootRef} className="emberreach">
      <canvas ref={canvasRef} className="emberreach-canvas" />
      <div className="emberreach-hud">
        <div className="emberreach-brand">Emberreach</div>
        <div ref={levelRef} className="emberreach-level">
          Level 1 / 10
        </div>
        <div className="emberreach-panel emberreach-quest">
          <div className="emberreach-panel-title">Ashtrail Watch</div>
          <p ref={questRef} className="emberreach-quest-title">
            Level 1 — Ash Whelps
          </p>
          <p ref={objectiveRef} className="emberreach-objective">
            Two young cinders prowl the stones. (0/2)
          </p>
        </div>
        <div className="emberreach-panel emberreach-bars">
          <div className="emberreach-bar">
            <span>Health</span>
            <div className="emberreach-track">
              <div ref={hpRef} className="emberreach-fill emberreach-fill-hp" />
            </div>
          </div>
          <div className="emberreach-bar">
            <span>Focus</span>
            <div className="emberreach-track">
              <div
                ref={focusRef}
                className="emberreach-fill emberreach-fill-focus"
              />
            </div>
          </div>
        </div>

        <div
          ref={abilityRootRef}
          className="emberreach-abilities"
          aria-label="Abilities"
        >
          {ABILITIES.map((ability) => (
            <div
              key={ability.id}
              className="emberreach-ability"
              data-ability={ability.id}
              data-locked="true"
              data-ready="false"
              title={`${ability.name} — ${ability.hint}`}
            >
              <span className="emberreach-ability-slot">{ability.slot}</span>
              <span className="emberreach-ability-name">{ability.name}</span>
              <span className="emberreach-ability-key">{ability.key}</span>
              <div className="emberreach-ability-cd" />
              <div className="emberreach-ability-lock">Lv {ability.unlockLevel}</div>
            </div>
          ))}
        </div>

        <div ref={toastRef} className="emberreach-toast hidden" />
        <div className="emberreach-help">
          WASD move · Mouse look · 1/LMB Strike · Q Bolt · E Dash · R Ward · F
          Ashstorm · Space jump
        </div>
      </div>
    </div>
  );
}
