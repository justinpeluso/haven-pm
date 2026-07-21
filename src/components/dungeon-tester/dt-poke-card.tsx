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
  type DtPokeTypeId,
} from "@/lib/downtown/dungeon-tester/poke-cards";
import { dtEnemyArtSrc } from "@/lib/downtown/dungeon-tester/art";
import { getGearArtPlate } from "@/lib/downtown/dungeon-tester/gear-icons";
import { getDtGear } from "@/lib/downtown/dungeon-tester/gear";
import {
  formatGearTier,
  gearTierAttr,
} from "@/lib/downtown/dungeon-tester/gear-display";
import { battlePetArtSrc } from "@/lib/downtown/party-chronicle/art";
import { getGear } from "@/lib/downtown/party-chronicle/gear";

function resolveCardGear(id: string) {
  return getDtGear(id) ?? getGear(id);
}

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

  const gear = resolveCardGear(card.id);
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
  const gear = resolveCardGear(card.id);
  if (gear) return gearTierAttr(gear.rarity ?? gear.tier);
  if (card.kind === "dog") return "rare";
  if (card.kind === "foe" || !isGearSpiritCard(card)) return "uncommon";
  return "common";
}

function stageLabel(variant: string, isGear: boolean): string {
  if (!isGear) return variant === "dog" ? "Basic · Companion" : "Basic · Wild";
  if (variant === "weapon") return "Basic · Weapon Spirit";
  if (variant === "armor") return "Basic · Armor Spirit";
  if (variant === "consumable") return "Item · Field Kit";
  if (variant === "trinket") return "Item · Trinket";
  return "Basic · Item Spirit";
}

function TypeGem({
  typeId,
  size = "md",
}: {
  typeId: string;
  size?: "sm" | "md";
}) {
  const meta = dtPokeTypeMeta(typeId);
  const initial = (meta.label?.[0] ?? "?").toUpperCase();
  return (
    <span
      className={`dt-poke-type-gem${size === "sm" ? " dt-poke-type-gem-sm" : ""}`}
      title={meta.label}
      style={{ ["--poke-type" as string]: meta.color }}
      aria-label={meta.label}
    >
      <em aria-hidden>{initial}</em>
    </span>
  );
}

function EnergyPips({
  cost,
  color,
}: {
  cost: number;
  color: string;
}) {
  return (
    <span className="dt-poke-energy" aria-hidden>
      {Array.from({ length: Math.max(1, Math.min(3, cost)) }, (_, i) => (
        <i
          key={i}
          className="dt-poke-energy-pip"
          style={{ ["--poke-energy" as string]: color }}
        />
      ))}
    </span>
  );
}

function MoveRow({
  move,
  index,
  energyColor,
  compact,
}: {
  move: DtPokeMoveDef;
  index: number;
  energyColor: string;
  compact?: boolean;
}) {
  const dmg = moveDamageNumber(move);
  const cost = moveEnergyCost(move, index);
  const fx = moveEffectSummary(move);
  const flavor = move.blurb || fx;
  return (
    <li className="dt-poke-move" data-cost={cost}>
      <EnergyPips cost={cost} color={energyColor} />
      <div className="dt-poke-move-body">
        <span className="dt-poke-move-name">{move.name}</span>
        {!compact && flavor ? (
          <span className="dt-poke-move-flavor">{flavor}</span>
        ) : null}
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
        ? getGearArtPlate(card.artId || card.id)
        : dtEnemyArtSrc({ artId: card.artId, name: card.name, id: card.id });
  const showHp = typeof hp === "number" && typeof maxHp === "number" && maxHp > 0;
  const spiritHp = spiritPowerNumber(card);
  const primaryTypeId = (card.types[0] ?? "grit") as DtPokeTypeId;
  const primaryType = dtPokeTypeMeta(primaryTypeId);
  const energyColor = primaryType.color;
  const moveLimit = size === "sm" ? 2 : 3;
  const compactMoves = size === "sm";
  // Ally tint only for true companions — gear sheet should keep weapon/armor chrome.
  const allyChrome = Boolean(ally) && (variant === "dog" || card.kind === "dog");
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
    "data-ally": allyChrome ? "true" : "false",
    "data-kind": kindAttr,
    "data-variant": variant,
    "data-tier": tier,
    "data-gear": isGearSpirit ? "true" : "false",
    style: { ["--poke-type" as string]: primaryType.color },
    "aria-label": `${card.name} card`,
  } as const;

  const inner = (
    <>
      <div className="dt-poke-card-chrome" aria-hidden />
      <div className="dt-poke-card-bevel" aria-hidden />
      <div className="dt-poke-card-foil" aria-hidden />
      <div className="dt-poke-card-frame">
        <p className="dt-poke-stage">{stageLabel(variant, isGearSpirit)}</p>

        <header className="dt-poke-card-head">
          <span className="dt-poke-card-name">{card.name}</span>
          <span className="dt-poke-card-hp-pill">
            <em>HP</em>
            <strong>{showHp ? hp : spiritHp}</strong>
          </span>
          <TypeGem typeId={primaryTypeId} />
        </header>

        <div className="dt-poke-card-art">
          <div className="dt-poke-card-art-mat" aria-hidden />
          <div className="dt-poke-card-art-inner">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={art} alt="" draggable={false} />
          </div>
          <div className="dt-poke-card-art-foil" aria-hidden />
          <span className="dt-poke-rarity-mark" data-tier={tier}>
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
        ) : null}

        <ul className="dt-poke-moves">
          {card.moves.slice(0, moveLimit).map((m, i) => (
            <MoveRow
              key={m.id}
              move={m}
              index={i}
              energyColor={energyColor}
              compact={compactMoves}
            />
          ))}
        </ul>

        {size === "lg" ? (
          <footer className="dt-poke-card-foot">
            <span className="dt-poke-set-mark" aria-hidden>
              LB · Spirit
            </span>
          </footer>
        ) : null}
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
