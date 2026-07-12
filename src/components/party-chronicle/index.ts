/**
 * Asset + class helpers for Party Chronicle comic / 90s-RPG chrome.
 * CSS is side-effect imported by the game shell.
 */

export const PARTY_ASSETS = {
  halftone: "/party-chronicle/halftone.svg",
  panelFrame: "/party-chronicle/panel-frame.svg",
  panelFrameJagged: "/party-chronicle/panel-frame-jagged.svg",
  speechBalloon: "/party-chronicle/speech-balloon.svg",
  thoughtBalloon: "/party-chronicle/thought-balloon.svg",
  portraitFrame: "/party-chronicle/portrait-frame.svg",
  portraitFrameHero: "/party-chronicle/portrait-frame-hero.svg",
  chapterSplash: "/party-chronicle/chapter-splash.svg",
  hotbarBox: "/party-chronicle/hotbar-box.svg",
  skillIconFrame: "/party-chronicle/skill-icon-frame.svg",
  speedLines: "/party-chronicle/speed-lines.svg",
  actionBurst: "/party-chronicle/action-burst.svg",
  hudBarCap: "/party-chronicle/hud-bar-cap.svg",
  inventorySlot: "/party-chronicle/inventory-slot.svg",
} as const;

/** Root wrapper classes — `downtown-shell party-comic party-rpg90s` (+ optional `party-chronicle` alias). */
export const PARTY_COMIC_ROOT = "party-comic";
export const PARTY_RPG90S_ROOT = "party-rpg90s";
/** @deprecated Prefer PARTY_COMIC_ROOT + PARTY_RPG90S_ROOT; kept for game shell alias. */
export const PARTY_CHRONICLE_ROOT = "party-chronicle";

export const PARTY_CLASS = {
  panel: "pc-panel",
  panelJagged: "pc-panel-jagged",
  dialogue: "pc-dialogue",
  balloon: "pc-balloon",
  balloonSpeaker: "pc-balloon-speaker",
  balloonTail: "pc-balloon-tail",
  speaker: "pc-speaker",
  portrait: "pc-portrait",
  portraitLg: "pc-portrait pc-portrait-lg",
  portraitFill: "pc-portrait-fill",
  portraitName: "pc-portrait-name",
  chapterSplash: "pc-chapter-splash",
  chapterNum: "pc-chapter-num",
  title: "pc-title",
  subtitle: "pc-subtitle",
  eyebrow: "pc-eyebrow",
  sectionLabel: "pc-section-label",
  hud: "pc-hud",
  hudRow: "pc-hud-row",
  statPill: "pc-stat-pill",
  meter: "pc-meter",
  bar: "pc-bar",
  barLabel: "pc-bar-label",
  hotbar: "pc-hotbar",
  hotbarSlot: "pc-hotbar-slot",
  hotbarKey: "pc-hotbar-key",
  slotNum: "pc-slot-num",
  skillGlyph: "pc-skill-glyph",
  invGrid: "pc-inv-grid",
  invSlot: "pc-inv-slot",
  burst: "pc-burst",
  actionBurst: "pc-action-burst",
  choice: "pc-choice",
  chip: "pc-chip",
  primaryBtn: "pc-primary-btn",
  headerBand: "pc-header-band",
  headerBar: "pc-header-bar",
  comicFrame: "pc-comic-frame",
  speedLines: "pc-speed-lines",
  turnBanner: "pc-turn-banner",
  statGrid: "pc-stat-grid",
  statBox: "pc-stat-box",
  codexRow: "pc-codex-row",
  ending: "pc-ending",
  createForm: "pc-create-form",
  log: "pc-log",
} as const;
