"use client";

import { useEffect, useRef, useState } from "react";
import type { DmFocusTarget, DmReply, DmWorldHint } from "@/lib/downtown/party-chronicle/dm";

const QUICK: { id: string; label: string; message: string }[] = [
  { id: "where", label: "Where are we?", message: "Where are we?" },
  {
    id: "main",
    label: "Back to main story",
    message: "How do we get back to the main story?",
  },
  {
    id: "next",
    label: "Next main beat",
    message: "What’s the next main beat?",
  },
  {
    id: "hint",
    label: "Hint (no spoilers)",
    message: "Hint without spoilers",
  },
];

type ChatLine = {
  role: "party" | "dm";
  text: string;
  mode?: "llm" | "offline";
  focusTarget?: DmFocusTarget;
  focusLabel?: string;
  pathLabel?: string;
};

type Props = {
  open: boolean;
  onClose: () => void;
  worldHint: DmWorldHint | null;
  pathLabel?: string;
  onFocusMain: (target: DmFocusTarget) => void;
};

function renderReplyText(text: string) {
  // Lightweight **bold** for offline templates — no markdown dependency.
  const parts = text.split(/(\*\*[^*]+\*\*)/g);
  return parts.map((part, i) => {
    if (part.startsWith("**") && part.endsWith("**")) {
      return <strong key={i}>{part.slice(2, -2)}</strong>;
    }
    return <span key={i}>{part}</span>;
  });
}

export function DungeonMasterPanel({
  open,
  onClose,
  worldHint,
  pathLabel,
  onFocusMain,
}: Props) {
  const [input, setInput] = useState("");
  const [pending, setPending] = useState(false);
  const [lines, setLines] = useState<ChatLine[]>([
    {
      role: "dm",
      text: "I’m your Neverworld DM. Wander Map and side trails all you like — when you’re lost, ask how to find the main road again.",
      pathLabel,
    },
  ]);
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (open) bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [open, lines, pending]);

  async function ask(message: string) {
    const trimmed = message.trim();
    if (!trimmed || pending) return;
    setPending(true);
    setInput("");
    setLines((prev) => [...prev, { role: "party", text: trimmed }]);
    try {
      const res = await fetch("/api/downtown/party-chronicle/dm", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: trimmed, worldHint }),
      });
      const data = (await res.json()) as DmReply & { error?: string };
      if (!res.ok) {
        setLines((prev) => [
          ...prev,
          {
            role: "dm",
            text: data.error || "The DM lost their notes. Try again.",
            mode: "offline",
          },
        ]);
        return;
      }
      setLines((prev) => [
        ...prev,
        {
          role: "dm",
          text: data.reply,
          mode: data.mode,
          focusTarget: data.guidance?.focusTarget,
          focusLabel: data.guidance?.focusLabel,
          pathLabel: data.guidance?.pathLabel,
        },
      ]);
    } catch {
      setLines((prev) => [
        ...prev,
        {
          role: "dm",
          text: "Signal failed — check you’re logged in, then ask again.",
          mode: "offline",
        },
      ]);
    } finally {
      setPending(false);
    }
  }

  if (!open) return null;

  return (
    <div className="pc-dm-overlay" role="dialog" aria-label="Dungeon Master">
      <div className="pc-dm-panel">
        <header className="pc-dm-header">
          <div>
            <p className="pc-eyebrow text-[0.65rem]">Dungeon Master</p>
            <h2 className="pc-title text-xl">Neverworld coach</h2>
            {pathLabel && (
              <p className="pc-dm-path" title={pathLabel}>
                {pathLabel}
              </p>
            )}
          </div>
          <button type="button" className="pc-chip" onClick={onClose}>
            Close
          </button>
        </header>

        <div className="pc-dm-quick">
          {QUICK.map((q) => (
            <button
              key={q.id}
              type="button"
              className="pc-chip"
              disabled={pending}
              onClick={() => void ask(q.message)}
            >
              {q.label}
            </button>
          ))}
        </div>

        <div className="pc-dm-chat" aria-live="polite">
          {lines.map((line, idx) => (
            <div key={idx} className="pc-dm-bubble" data-role={line.role}>
              <p className="pc-dm-bubble-meta">
                {line.role === "dm" ? "DM" : "Party"}
                {line.mode ? ` · ${line.mode}` : ""}
              </p>
              <div className="pc-dm-bubble-text whitespace-pre-wrap">
                {renderReplyText(line.text)}
              </div>
              {line.role === "dm" && line.focusTarget && (
                <button
                  type="button"
                  className="pc-primary-btn mt-2"
                  onClick={() => onFocusMain(line.focusTarget!)}
                >
                  {line.focusLabel || "Focus main quest"}
                </button>
              )}
            </div>
          ))}
          {pending && (
            <div className="pc-dm-bubble" data-role="dm">
              <p className="pc-dm-bubble-meta">DM</p>
              <p className="pc-dm-bubble-text opacity-70">Consulting the chronicle…</p>
            </div>
          )}
          <div ref={bottomRef} />
        </div>

        <form
          className="pc-dm-compose"
          onSubmit={(e) => {
            e.preventDefault();
            void ask(input);
          }}
        >
          <input
            className="pc-dm-input"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask the DM…"
            disabled={pending}
            maxLength={2000}
            aria-label="Message the Dungeon Master"
          />
          <button type="submit" className="pc-primary-btn" disabled={pending || !input.trim()}>
            Ask
          </button>
        </form>
      </div>
    </div>
  );
}
