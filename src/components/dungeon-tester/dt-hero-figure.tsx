"use client";

import {
  DT_HAIR_HEX,
  DT_HAT_LABEL,
  DT_OUTFIT_HEX,
  DT_SKIN_HEX,
  type DtHeroLook,
} from "@/lib/downtown/dungeon-tester/look";

type Props = {
  look: DtHeroLook;
  /** Optional label under figure (create preview). */
  label?: string;
  className?: string;
  /** Compact battle / HUD scale. */
  compact?: boolean;
};

/**
 * Parametric frontier silhouette — replaces Neverworld class comic plates in DT.
 */
export function DtHeroFigure({ look, label, className, compact }: Props) {
  const skin = DT_SKIN_HEX[look.skin];
  const hair = DT_HAIR_HEX[look.hairColor];
  const outfit = DT_OUTFIT_HEX[look.outfit];
  const showHair = look.hair !== "bald" && look.hat !== "hood";

  return (
    <div
      className={className ?? "dt-hero-figure"}
      data-compact={compact ? "true" : "false"}
      data-outfit={look.outfit}
      title={label || DT_HAT_LABEL[look.hat]}
    >
      <svg
        className="dt-hero-figure-svg"
        viewBox="0 0 80 110"
        role="img"
        aria-label={label || "Hero look"}
      >
        {/* shadow */}
        <ellipse cx="40" cy="102" rx="22" ry="5" fill="rgba(0,0,0,0.28)" />

        {/* legs */}
        <path
          d="M28 78 L26 98 L36 98 L38 78 Z"
          fill={outfit.trim}
          stroke="#1a1410"
          strokeWidth="1.5"
        />
        <path
          d="M42 78 L44 98 L54 98 L52 78 Z"
          fill={outfit.trim}
          stroke="#1a1410"
          strokeWidth="1.5"
        />

        {/* torso / outfit */}
        {look.outfit === "poncho" ? (
          <path
            d="M18 48 L40 38 L62 48 L58 82 L22 82 Z"
            fill={outfit.coat}
            stroke="#1a1410"
            strokeWidth="2"
          />
        ) : look.outfit === "vest" ? (
          <>
            <path
              d="M26 44 L40 38 L54 44 L52 80 L28 80 Z"
              fill="#d8c8a8"
              stroke="#1a1410"
              strokeWidth="1.5"
            />
            <path
              d="M26 44 L40 38 L54 44 L50 72 L30 72 Z"
              fill={outfit.coat}
              stroke="#1a1410"
              strokeWidth="2"
            />
          </>
        ) : (
          <path
            d="M24 44 L40 36 L56 44 L54 80 L26 80 Z"
            fill={outfit.coat}
            stroke="#1a1410"
            strokeWidth="2"
          />
        )}
        {look.outfit === "marshal" ? (
          <path d="M32 50 L48 50 L46 62 L34 62 Z" fill="#c9a24a" opacity="0.85" />
        ) : null}

        {/* arms */}
        <path
          d="M24 48 L14 70 L22 72 L30 52 Z"
          fill={skin}
          stroke="#1a1410"
          strokeWidth="1.5"
        />
        <path
          d="M56 48 L66 70 L58 72 L50 52 Z"
          fill={skin}
          stroke="#1a1410"
          strokeWidth="1.5"
        />

        {/* neck + head — human proportions, not oversized comic blob */}
        <rect x="36" y="30" width="8" height="8" rx="2" fill={skin} stroke="#1a1410" strokeWidth="1.2" />
        <ellipse cx="40" cy="22" rx="14" ry="16" fill={skin} stroke="#1a1410" strokeWidth="2" />

        {/* hair */}
        {showHair && look.hair === "short" ? (
          <path
            d="M26 20 Q40 6 54 20 L52 24 Q40 16 28 24 Z"
            fill={hair}
            stroke="#1a1410"
            strokeWidth="1.2"
          />
        ) : null}
        {showHair && look.hair === "wavy" ? (
          <path
            d="M25 18 Q40 4 55 18 Q58 28 52 32 Q40 22 28 32 Q22 26 25 18 Z"
            fill={hair}
            stroke="#1a1410"
            strokeWidth="1.2"
          />
        ) : null}
        {showHair && look.hair === "long" ? (
          <path
            d="M26 16 Q40 2 54 16 L56 48 Q40 40 24 48 Z"
            fill={hair}
            stroke="#1a1410"
            strokeWidth="1.2"
          />
        ) : null}
        {showHair && look.hair === "braid" ? (
          <>
            <path
              d="M26 18 Q40 5 54 18 L50 26 Q40 18 30 26 Z"
              fill={hair}
              stroke="#1a1410"
              strokeWidth="1.2"
            />
            <path
              d="M48 26 Q56 40 50 56 Q46 48 44 36 Z"
              fill={hair}
              stroke="#1a1410"
              strokeWidth="1.2"
            />
          </>
        ) : null}

        {/* face */}
        <circle cx="34" cy="22" r="1.6" fill="#1a1410" />
        <circle cx="46" cy="22" r="1.6" fill="#1a1410" />
        <path d="M35 28 Q40 31 45 28" stroke="#1a1410" strokeWidth="1.4" fill="none" />

        {/* hat */}
        {look.hat === "stetson" ? (
          <>
            <ellipse cx="40" cy="12" rx="22" ry="4" fill={outfit.trim} stroke="#1a1410" strokeWidth="1.5" />
            <path
              d="M28 12 Q40 0 52 12 L50 16 Q40 10 30 16 Z"
              fill={outfit.coat}
              stroke="#1a1410"
              strokeWidth="1.5"
            />
          </>
        ) : null}
        {look.hat === "bandana" ? (
          <path
            d="M26 16 Q40 8 54 16 L50 22 Q40 18 30 22 Z"
            fill="#8b2e2e"
            stroke="#1a1410"
            strokeWidth="1.4"
          />
        ) : null}
        {look.hat === "sun-hat" ? (
          <>
            <ellipse cx="40" cy="14" rx="24" ry="5" fill="#c9a86a" stroke="#1a1410" strokeWidth="1.5" />
            <ellipse cx="40" cy="10" rx="12" ry="6" fill="#d8bc82" stroke="#1a1410" strokeWidth="1.3" />
          </>
        ) : null}
        {look.hat === "hood" ? (
          <path
            d="M24 28 Q26 6 40 4 Q54 6 56 28 L52 34 Q40 28 28 34 Z"
            fill={outfit.coat}
            stroke="#1a1410"
            strokeWidth="2"
          />
        ) : null}
      </svg>
      {label ? <span className="dt-hero-figure-label">{label}</span> : null}
    </div>
  );
}
