"use client";

import { dtGearIconSrc } from "@/lib/downtown/dungeon-tester/gear-icons";

/**
 * Woodcut thumb for DungeonTester gear (weapons, armor, consumables).
 * Renders nothing only when armsOnly and the item has no arms plate.
 */
export function DtGearIcon({
  itemId,
  name,
  size = "md",
  armsOnly = false,
  className,
}: {
  itemId: string | null | undefined;
  name?: string;
  size?: "sm" | "md" | "lg";
  /** When true, skip non-weapon / non-offhand items without a named plate. */
  armsOnly?: boolean;
  className?: string;
}) {
  const src = dtGearIconSrc(itemId, { armsOnly });
  if (!src) return null;

  return (
    // eslint-disable-next-line @next/next/no-img-element -- static public SVG plate
    <img
      src={src}
      alt=""
      aria-hidden
      title={name}
      className={["dt-gear-icon", `dt-gear-icon-${size}`, className]
        .filter(Boolean)
        .join(" ")}
      draggable={false}
    />
  );
}
