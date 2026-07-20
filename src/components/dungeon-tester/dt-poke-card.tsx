"use client";

import {
  dtPokeTypeMeta,
  moveEffectSummary,
  type DtPokeCardDef,
} from "@/lib/downtown/dungeon-tester/poke-cards";
import { dtEnemyArtSrc } from "@/lib/downtown/dungeon-tester/art";
import { battlePetArtSrc } from "@/lib/downtown/party-chronicle/art";

type Props = {
  card: DtPokeCardDef;
  /** Live HP when shown in battle. */
  hp?: number;
  maxHp?: number;
  /** Compact plate for strips / hover. */
  size?: "sm" | "md" | "lg";
  ally?: boolean;
  className?: string;
  onClick?: () => void;
};

function pct(cur: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (cur / max) * 100));
}

export function DtPokeCard({
  card,
  hp,
  maxHp,
  size = "md",
  ally,
  className,
  onClick,
}: Props) {
  const art =
    card.id === "dog-companion" || card.artId === "art-dog-companion"
      ? battlePetArtSrc()
      : dtEnemyArtSrc({ artId: card.artId, name: card.name, id: card.id });
  const showHp = typeof hp === "number" && typeof maxHp === "number" && maxHp > 0;
  const shared = {
    className: `dt-poke-card ${className ?? ""}`,
    "data-size": size,
    "data-ally": ally ? "true" : "false",
    "aria-label": `${card.name} card`,
  } as const;

  const inner = (
    <>
      <div className="dt-poke-card-chrome" aria-hidden />
      <header className="dt-poke-card-head">
        <span className="dt-poke-card-name">{card.name}</span>
        <span className="dt-poke-card-types">
          {card.types.slice(0, 2).map((t) => {
            const meta = dtPokeTypeMeta(t);
            return (
              <span
                key={t}
                className="dt-poke-type"
                style={{ ["--poke-type" as string]: meta.color }}
              >
                {meta.label}
              </span>
            );
          })}
        </span>
      </header>

      <div className="dt-poke-card-art">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={art} alt="" draggable={false} />
      </div>

      {showHp ? (
        <div className="dt-poke-hp" title={`HP ${hp}/${maxHp}`}>
          <span className="dt-poke-hp-lab">HP</span>
          <div className="dt-poke-hp-track">
            <span style={{ width: `${pct(hp!, maxHp!)}%` }} />
          </div>
          <span className="dt-poke-hp-num">
            {hp}/{maxHp}
          </span>
        </div>
      ) : null}

      <p className="dt-poke-card-blurb">{card.blurb}</p>

      <ul className="dt-poke-moves">
        {card.moves.slice(0, 4).map((m) => (
          <li key={m.id}>
            <span className="dt-poke-move-name">{m.name}</span>
            <span className="dt-poke-move-fx">{moveEffectSummary(m)}</span>
          </li>
        ))}
      </ul>
    </>
  );

  if (onClick) {
    return (
      <button type="button" {...shared} onClick={onClick}>
        {inner}
      </button>
    );
  }
  return <div {...shared}>{inner}</div>;
}
