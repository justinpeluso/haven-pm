"use client";

import {
  dtPokeTypeMeta,
  isDtGearSpiritKind,
  moveDamageNumber,
  moveEnergyCost,
  moveEffectSummary,
  spiritPowerNumber,
  type DtPokeCardDef,
  type DtPokeMoveDef,
} from "@/lib/downtown/dungeon-tester/poke-cards";
import { dtEnemyArtSrc } from "@/lib/downtown/dungeon-tester/art";
import { dtGearIconSrc } from "@/lib/downtown/dungeon-tester/gear-icons";
import { getDtGear } from "@/lib/downtown/dungeon-tester/gear";
import {
  formatGearTier,
  gearTierAttr,
} from "@/lib/downtown/dungeon-tester/gear-display";
import { battlePetArtSrc } from "@/lib/downtown/party-chronicle/art";

type Props = {
  card: DtPokeCardDef;
  /** Live HP when shown in battle. */
  hp?: number;
  maxHp?: number;
  /** Compact plate for strips / hover. */
  size?: "sm" | "md" | "lg";
  ally?: boolean;
  /** Override rarity ladder (common → legendary). */
  tier?: string;
  className?: string;
  onClick?: () => void;
};

function pct(cur: number, max: number): number {
  if (max <= 0) return 0;
  return Math.max(0, Math.min(100, (cur / max) * 100));
}

function isGearSpiritCard(card: DtPokeCardDef): boolean {
  if (isDtGearSpiritKind(card.kind)) return true;
  // Untagged dt-* plates that aren't chapter/foe ids still use gear art.
  return card.id.startsWith("dt-") && !card.id.startsWith("dt-ch");
}

/** Visual variant accents — weapon / armor / consumable / trinket / foe / dog. */
function resolveVariant(card: DtPokeCardDef): string {
  if (card.kind === "dog") return "dog";
  if (card.kind === "weapon") return "weapon";
  if (card.kind === "armor") return "armor";
  if (card.kind === "consumable") return "consumable";
  if (card.kind === "trinket") return "trinket";
  if (card.kind === "foe") return "foe";

  const gear = getDtGear(card.id);
  if (gear?.slot === "weapon") return "weapon";
  if (gear?.slot === "consumable") return "consumable";
  if (
    gear?.slot === "head" ||
    gear?.slot === "chest" ||
    gear?.slot === "hands" ||
    gear?.slot === "legs" ||
    gear?.slot === "offhand"
  ) {
    return "armor";
  }
  if (gear?.slot === "accessory" || gear?.slot === "misc") return "trinket";
  if (isGearSpiritCard(card)) return "gear";
  return "foe";
}

function resolveTier(card: DtPokeCardDef, override?: string): string {
  if (override) return gearTierAttr(override);
  const gear = getDtGear(card.id);
  if (gear) return gearTierAttr(gear.rarity ?? gear.tier);
  if (card.kind === "dog") return "rare";
  if (card.kind === "foe" || !isGearSpiritCard(card)) return "uncommon";
  return "common";
}

function stageLabel(variant: string, isGear: boolean): string {
  if (!isGear) return variant === "dog" ? "Companion" : "Wild";
  if (variant === "weapon") return "Weapon Spirit";
  if (variant === "armor") return "Armor Spirit";
  if (variant === "consumable") return "Field Kit";
  if (variant === "trinket") return "Trinket Spirit";
  return "Item Spirit";
}

function EnergyPips({ cost }: { cost: number }) {
  return (
    <span className="dt-poke-energy" aria-hidden>
      {Array.from({ length: Math.max(1, Math.min(3, cost)) }, (_, i) => (
        <i key={i} className="dt-poke-energy-pip" />
      ))}
    </span>
  );
}

function MoveRow({ move, index }: { move: DtPokeMoveDef; index: number }) {
  const dmg = moveDamageNumber(move);
  const cost = moveEnergyCost(move, index);
  const fx = moveEffectSummary(move);
  return (
    <li className="dt-poke-move" data-cost={cost}>
      <EnergyPips cost={cost} />
      <div className="dt-poke-move-body">
        <span className="dt-poke-move-name">{move.name}</span>
        {move.blurb ? (
          <span className="dt-poke-move-flavor">{move.blurb}</span>
        ) : (
          <span className="dt-poke-move-flavor">{fx}</span>
        )}
      </div>
      {dmg != null ? (
        <span className="dt-poke-move-dmg">{dmg}</span>
      ) : (
        <span className="dt-poke-move-dmg dt-poke-move-dmg-fx">{fx}</span>
      )}
    </li>
  );
}

export function DtPokeCard({
  card,
  hp,
  maxHp,
  size = "md",
  ally,
  tier: tierProp,
  className,
  onClick,
}: Props) {
  const isGearSpirit = isGearSpiritCard(card);
  const variant = resolveVariant(card);
  const tier = resolveTier(card, tierProp);
  const art =
    card.id === "dog-companion" || card.artId === "art-dog-companion"
      ? battlePetArtSrc()
      : isGearSpirit
        ? dtGearIconSrc(card.artId || card.id, { armsOnly: false }) ||
          "/dungeon-tester/gear/_fallback-weapon.svg"
        : dtEnemyArtSrc({ artId: card.artId, name: card.name, id: card.id });
  const showHp = typeof hp === "number" && typeof maxHp === "number" && maxHp > 0;
  const spiritHp = spiritPowerNumber(card);
  const primaryType = card.types[0] ? dtPokeTypeMeta(card.types[0]) : null;
  const moveLimit = isGearSpirit ? 3 : 4;
  const kindAttr =
    card.kind === "dog"
      ? "dog"
      : isGearSpirit
        ? variant === "weapon"
          ? "weapon"
          : variant
        : "foe";

  const shared = {
    className: `dt-poke-card ${className ?? ""}`,
    "data-size": size,
    "data-ally": ally ? "true" : "false",
    "data-kind": kindAttr,
    "data-variant": variant,
    "data-tier": tier,
    "aria-label": `${card.name} card`,
  } as const;

  const inner = (
    <>
      <div className="dt-poke-card-chrome" aria-hidden />
      <div className="dt-poke-card-foil" aria-hidden />
      <div className="dt-poke-card-frame">
        <header className="dt-poke-card-head">
          <div className="dt-poke-card-title-row">
            <span className="dt-poke-card-name">{card.name}</span>
            <span className="dt-poke-card-hp">
              <em>HP</em>
              {showHp ? hp : spiritHp}
            </span>
          </div>
          <div className="dt-poke-card-meta">
            <span className="dt-poke-stage">{stageLabel(variant, isGearSpirit)}</span>
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
          </div>
        </header>

        <div className="dt-poke-card-art">
          <div className="dt-poke-card-art-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art} alt="" draggable={false} />
          </div>
          <span className="dt-poke-rarity-ribbon" data-tier={tier}>
            {formatGearTier(tier)}
          </span>
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
        ) : (
          <div className="dt-poke-stats-strip" aria-hidden>
            <span>
              {primaryType ? primaryType.label : "Spirit"} · {spiritHp} HP
            </span>
            <span className="dt-poke-stats-tier">{formatGearTier(tier)}</span>
          </div>
        )}

        <ul className="dt-poke-moves">
          {card.moves.slice(0, moveLimit).map((m, i) => (
            <MoveRow key={m.id} move={m} index={i} />
          ))}
        </ul>

        <footer className="dt-poke-card-foot">
          <p className="dt-poke-card-blurb">{card.blurb}</p>
        </footer>
      </div>
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
