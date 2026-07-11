"use client";

import { useId, useMemo, useState } from "react";
import {
  buildVibrancyMap,
  vacancyAtFill,
  type Parcel,
  type ParcelKind,
} from "@/lib/downtown/vibrancy-map";

export type CbdVibrancyInfographicProps = {
  name: string;
  state: string;
  downtownName: string;
  tags: string[];
  vibrancy: number;
  vacancyEstimate: number;
  radiusM: number;
};

const FILL_COLORS: Record<Exclude<ParcelKind, "lot">, string[]> = {
  shop: ["#3d9a7a", "#2f7d64", "#4aad8a", "#357a62"],
  cafe: ["#c47a3d", "#a86532", "#d4894a", "#b87238"],
  retail: ["#c4a35a", "#a88a48", "#d4b56e", "#b8964e"],
  service: ["#5a8aa8", "#4a738c", "#6a9ab8", "#547e96"],
};

function parcelOpacity(fill: number, threshold: number): number {
  const t = threshold * 100;
  if (fill < t - 8) return 0;
  if (fill >= t + 6) return 1;
  return (fill - (t - 8)) / 14;
}

function parcelScale(opacity: number): number {
  if (opacity <= 0) return 0.72;
  return 0.72 + 0.28 * opacity;
}

function Icon({ kind, x, y }: { kind: ParcelKind; x: number; y: number }) {
  if (kind === "cafe") {
    return (
      <g transform={`translate(${x} ${y})`} aria-hidden>
        <circle cx="0" cy="-1" r="2.2" fill="currentColor" opacity="0.9" />
        <path d="M-2.5 2.2h5" stroke="currentColor" strokeWidth="0.8" strokeLinecap="round" />
      </g>
    );
  }
  if (kind === "shop") {
    return (
      <g transform={`translate(${x} ${y})`} aria-hidden>
        <rect x="-2.4" y="-2.2" width="4.8" height="4.4" rx="0.4" fill="none" stroke="currentColor" strokeWidth="0.9" />
        <path d="M-1.2 -0.4h2.4M-1.2 1.2h2.4" stroke="currentColor" strokeWidth="0.7" />
      </g>
    );
  }
  if (kind === "retail") {
    return (
      <g transform={`translate(${x} ${y})`} aria-hidden>
        <path
          d="M-2.6 -1.2 L0 -2.8 L2.6 -1.2 V2.4 H-2.6 Z"
          fill="none"
          stroke="currentColor"
          strokeWidth="0.85"
        />
      </g>
    );
  }
  if (kind === "service") {
    return (
      <g transform={`translate(${x} ${y})`} aria-hidden>
        <circle cx="0" cy="0" r="2.4" fill="none" stroke="currentColor" strokeWidth="0.85" />
        <circle cx="0" cy="0" r="0.7" fill="currentColor" />
      </g>
    );
  }
  return null;
}

function ParcelFootprint({
  parcel,
  fill,
}: {
  parcel: Parcel;
  fill: number;
}) {
  const op = parcelOpacity(fill, parcel.threshold);
  const scale = parcelScale(op);
  const cx = parcel.x + parcel.w / 2;
  const cy = parcel.y + parcel.h / 2;
  const vacant = parcel.kind === "lot" || op < 0.15;

  const fillColor =
    parcel.kind === "lot"
      ? "transparent"
      : FILL_COLORS[parcel.kind][parcel.tint % 4]!;

  return (
    <g
      className="cbd-vib-parcel"
      transform={`translate(${cx} ${cy}) rotate(${parcel.rotation}) scale(${scale}) translate(${-cx} ${-cy})`}
      opacity={vacant && parcel.kind !== "lot" ? Math.max(0.25, op) : vacant ? 0.55 : 0.35 + op * 0.65}
    >
      {/* vacant / empty outline */}
      <rect
        x={parcel.x}
        y={parcel.y}
        width={parcel.w}
        height={parcel.h}
        rx="1.2"
        fill={vacant ? "rgba(232,238,242,0.03)" : fillColor}
        stroke={vacant ? "var(--dt-line)" : "rgba(14,20,25,0.45)"}
        strokeWidth={vacant ? 1.1 : 0.8}
        strokeDasharray={vacant ? "3 2.5" : undefined}
      />

      {!vacant && parcel.hasAwning && op > 0.35 && (
        <rect
          x={parcel.x + 1}
          y={parcel.y + parcel.h - 4.5}
          width={parcel.w - 2}
          height={3.2}
          rx="0.6"
          fill="rgba(14,20,25,0.35)"
          opacity={op}
        />
      )}

      {!vacant && parcel.hasPatio && op > 0.45 && (
        <g opacity={op * 0.85}>
          <circle cx={parcel.x + parcel.w * 0.3} cy={parcel.y + parcel.h + 4} r="2.2" fill="rgba(196,163,90,0.35)" />
          <circle cx={parcel.x + parcel.w * 0.7} cy={parcel.y + parcel.h + 4.5} r="2" fill="rgba(196,163,90,0.28)" />
        </g>
      )}

      {!vacant && op > 0.55 && parcel.kind !== "lot" && (
        <g
          opacity={Math.min(1, (op - 0.55) / 0.35)}
          color="rgba(14,20,25,0.55)"
        >
          <Icon kind={parcel.kind} x={cx} y={cy} />
        </g>
      )}
    </g>
  );
}

export function CbdVibrancyInfographic({
  name,
  state,
  downtownName,
  tags,
  vibrancy,
  vacancyEstimate,
  radiusM,
}: CbdVibrancyInfographicProps) {
  const uid = useId();
  const sliderId = `${uid}-slider`;
  const baseline = Math.round(Math.max(0, Math.min(100, vibrancy)));
  const [fill, setFill] = useState(baseline);

  const layout = useMemo(
    () =>
      buildVibrancyMap({
        name,
        state,
        downtownName,
        tags,
        radiusM,
      }),
    [name, state, downtownName, tags, radiusM]
  );

  const liveVacancy = vacancyAtFill(fill, baseline, vacancyEstimate);
  const activeCount = layout.parcels.filter(
    (p) => p.kind !== "lot" && parcelOpacity(fill, p.threshold) > 0.4
  ).length;
  const walkInTotal = layout.parcels.filter((p) => p.kind !== "lot").length;

  return (
    <section
      className="cbd-vib downtown-panel"
      aria-label={`Main Street activation map for ${downtownName || name}`}
    >
      <header className="cbd-vib-head">
        <div>
          <p className="cbd-vib-eyebrow">Overhead · walk-in storefronts</p>
          <h3 className="cbd-vib-title">{layout.label}</h3>
          <p className="cbd-vib-sub">
            Slide activation to fill vacant lots with shops, cafés, and street-level retail —
            not office towers.
          </p>
        </div>
        <div className="cbd-vib-readouts" aria-live="polite">
          <div>
            <span className="cbd-vib-readout-label">Vibrancy</span>
            <span className="downtown-stat cbd-vib-readout-val" style={{ color: "var(--dt-good)" }}>
              {Math.round(fill)}
            </span>
          </div>
          <div>
            <span className="cbd-vib-readout-label">Vacancy est.</span>
            <span className="downtown-stat cbd-vib-readout-val" style={{ color: "var(--dt-warn)" }}>
              {liveVacancy}%
            </span>
          </div>
          <div>
            <span className="cbd-vib-readout-label">Storefronts</span>
            <span className="downtown-stat cbd-vib-readout-val">
              {activeCount}/{walkInTotal}
            </span>
          </div>
        </div>
      </header>

      <div className="cbd-vib-stage">
        <svg
          className="cbd-vib-svg"
          viewBox={layout.viewBox}
          role="img"
          aria-label={`Schematic overhead of ${layout.label}. ${activeCount} of ${walkInTotal} walk-in businesses visible at ${Math.round(fill)} percent vibrancy.`}
        >
          <defs>
            <pattern id={`${uid}-grid`} width="28" height="28" patternUnits="userSpaceOnUse">
              <path
                d="M 28 0 L 0 0 0 28"
                fill="none"
                stroke="rgba(42,58,69,0.45)"
                strokeWidth="0.6"
              />
            </pattern>
            <linearGradient id={`${uid}-ground`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#121a20" />
              <stop offset="100%" stopColor="#0e1419" />
            </linearGradient>
            <linearGradient id={`${uid}-water`} x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="rgba(90,138,168,0.15)" />
              <stop offset="50%" stopColor="rgba(90,138,168,0.28)" />
              <stop offset="100%" stopColor="rgba(90,138,168,0.12)" />
            </linearGradient>
          </defs>

          <rect width="640" height="420" fill={`url(#${uid}-ground)`} />
          <rect width="640" height="420" fill={`url(#${uid}-grid)`} opacity="0.55" />

          {layout.river && (
            <path
              d={layout.river.path}
              fill="none"
              stroke={`url(#${uid}-water)`}
              strokeWidth="28"
              strokeLinecap="round"
              opacity="0.9"
            />
          )}

          {layout.plaza && (
            <rect
              x={layout.plaza.x}
              y={layout.plaza.y}
              width={layout.plaza.w}
              height={layout.plaza.h}
              rx="2"
              fill="rgba(61,154,122,0.08)"
              stroke="rgba(61,154,122,0.25)"
              strokeWidth="1"
              strokeDasharray="4 3"
            />
          )}

          {layout.streets.map((s, i) => (
            <line
              key={`st-${i}`}
              x1={s.x1}
              y1={s.y1}
              x2={s.x2}
              y2={s.y2}
              stroke={s.main ? "rgba(42,58,69,0.95)" : "rgba(42,58,69,0.7)"}
              strokeWidth={s.width}
              strokeLinecap="square"
            />
          ))}
          {layout.streets
            .filter((s) => s.main)
            .map((s, i) => (
              <line
                key={`lane-${i}`}
                x1={s.x1}
                y1={s.y1}
                x2={s.x2}
                y2={s.y2}
                stroke="rgba(196,163,90,0.18)"
                strokeWidth="1.2"
                strokeDasharray="6 8"
              />
            ))}

          {layout.trees.map((t, i) => {
            const treeOp = 0.2 + parcelOpacity(fill, 0.15 + (i % 7) * 0.1) * 0.55;
            return (
              <circle
                key={`tree-${i}`}
                cx={t.x}
                cy={t.y}
                r={t.r}
                fill="rgba(61,154,122,0.35)"
                opacity={treeOp}
              />
            );
          })}

          {layout.parcels.map((p) => (
            <ParcelFootprint key={p.id} parcel={p} fill={fill} />
          ))}

          {/* compass / scale chrome */}
          <g transform="translate(28 382)" opacity="0.7">
            <text fill="var(--dt-muted)" fontSize="9" letterSpacing="0.12em">
              N
            </text>
            <path d="M4 14 L8 4 L12 14 Z" fill="var(--dt-accent)" opacity="0.8" />
          </g>
          <g transform="translate(520 388)" opacity="0.65">
            <line x1="0" y1="0" x2="80" y2="0" stroke="var(--dt-muted)" strokeWidth="1" />
            <text x="40" y="-4" textAnchor="middle" fill="var(--dt-muted)" fontSize="8">
              ~{Math.round(radiusM / 2)}m block
            </text>
          </g>
        </svg>

        <div className="cbd-vib-legend" aria-hidden>
          <span>
            <i className="cbd-vib-swatch" data-kind="vacant" /> Vacant
          </span>
          <span>
            <i className="cbd-vib-swatch" data-kind="shop" /> Shop
          </span>
          <span>
            <i className="cbd-vib-swatch" data-kind="cafe" /> Café
          </span>
          <span>
            <i className="cbd-vib-swatch" data-kind="retail" /> Retail
          </span>
          <span>
            <i className="cbd-vib-swatch" data-kind="service" /> Service
          </span>
        </div>
      </div>

      <div className="cbd-vib-controls">
        <div className="cbd-vib-slider-row">
          <label htmlFor={sliderId} className="cbd-vib-slider-label">
            Main Street activation
          </label>
          <span className="downtown-stat cbd-vib-slider-pct" aria-hidden>
            {Math.round(fill)}%
          </span>
        </div>
        <input
          id={sliderId}
          className="cbd-vib-range"
          type="range"
          min={0}
          max={100}
          step={1}
          value={fill}
          onChange={(e) => setFill(Number(e.target.value))}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={Math.round(fill)}
          aria-valuetext={`${Math.round(fill)} percent vibrancy, ${liveVacancy} percent vacancy estimate`}
        />
        <div className="cbd-vib-slider-ends">
          <span>Empty lots</span>
          <button
            type="button"
            className="cbd-vib-baseline"
            onClick={() => setFill(baseline)}
            title="Reset to current baseline"
          >
            Baseline {baseline}
          </button>
          <span>Full storefronts</span>
        </div>
      </div>
    </section>
  );
}
