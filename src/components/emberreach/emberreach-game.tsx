"use client";

import { useEffect, useRef } from "react";
import { Game } from "@/lib/emberreach/game";
import "./emberreach.css";

export function EmberreachGame() {
  const rootRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hpRef = useRef<HTMLDivElement>(null);
  const focusRef = useRef<HTMLDivElement>(null);
  const questRef = useRef<HTMLParagraphElement>(null);
  const toastRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = rootRef.current;
    const canvas = canvasRef.current;
    const hp = hpRef.current;
    const focus = focusRef.current;
    const quest = questRef.current;
    const toast = toastRef.current;
    if (!root || !canvas || !hp || !focus || !quest || !toast) return;

    const game = new Game(canvas, root, { hp, focus, quest, toast });
    game.start();
    return () => game.dispose();
  }, []);

  return (
    <div ref={rootRef} className="emberreach">
      <canvas ref={canvasRef} className="emberreach-canvas" />
      <div className="emberreach-hud">
        <div className="emberreach-brand">Emberreach</div>
        <div className="emberreach-panel emberreach-quest">
          <div className="emberreach-panel-title">Ashtrail Watch</div>
          <p ref={questRef}>
            Defeat the cinder wolves near the standing stones (0/3).
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
        <div ref={toastRef} className="emberreach-toast hidden" />
        <div className="emberreach-help">
          WASD move · Mouse orbit · Left click strike · Q emberbolt · Space jump
          · Esc unlock mouse
        </div>
      </div>
    </div>
  );
}
