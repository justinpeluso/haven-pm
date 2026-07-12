/**
 * Asset + class helpers for Sims Real Life CRPG chrome.
 * CSS is side-effect imported by the game shell.
 */

export const SIMS_ASSETS = {
  parchment: "/sims-real-life/parchment.svg",
  hexPattern: "/sims-real-life/hex-pattern.svg",
  frameOrnament: "/sims-real-life/frame-ornament.svg",
  portraitFrame: "/sims-real-life/portrait-frame.svg",
  divider: "/sims-real-life/divider.svg",
  cornerSet: "/sims-real-life/corner-set.svg",
  cornerTl: "/sims-real-life/corner-tl.svg",
  cornerTr: "/sims-real-life/corner-tr.svg",
  cornerBl: "/sims-real-life/corner-bl.svg",
  cornerBr: "/sims-real-life/corner-br.svg",
} as const;

/** Root wrapper classes — nest inside or as `downtown-shell sims-crpg`. */
export const SIMS_CRPG_ROOT = "sims-crpg";

export const SIMS_CLASS = {
  panel: "sims-panel",
  goldBorder: "sims-gold-border",
  goldBorderStrong: "sims-gold-border-strong",
  portrait: "sims-portrait",
  portraitLg: "sims-portrait sims-portrait-lg",
  portraitFill: "sims-portrait-fill",
  sectionLabel: "sims-section-label",
  title: "sims-title",
  subtitle: "sims-subtitle",
  divider: "sims-divider",
  bar: "sims-bar",
  chip: "sims-chip",
  mapSurface: "sims-map-surface",
  parchment: "sims-parchment",
  statCell: "sims-stat-cell",
  flash: "sims-flash",
  headerBand: "sims-header-band",
  actionRow: "sims-action-row",
} as const;
