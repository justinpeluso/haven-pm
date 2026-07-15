"use client";

import Link from "next/link";

export function DowntownSubnav({
  active,
}: {
  active: "intel" | "gallery" | "news" | "historical" | "neverworld" | "dungeon-tester";
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-[var(--dt-line)] pb-4">
      <Link href="/downtown" className="downtown-chip" data-active={active === "intel"}>
        Market intel
      </Link>
      <Link
        href="/downtown/neverworld"
        className="downtown-chip"
        data-active={active === "neverworld"}
      >
        Neverworld
      </Link>
      <Link
        href="/downtown/dungeon-tester"
        className="downtown-chip"
        data-active={active === "dungeon-tester"}
      >
        DungeonTester
      </Link>
      <Link href="/downtown/news" className="downtown-chip" data-active={active === "news"}>
        Local CBD News
      </Link>
      <Link href="/downtown/gallery" className="downtown-chip" data-active={active === "gallery"}>
        Gallery
      </Link>
      <Link
        href="/downtown/historical-properties"
        className="downtown-chip"
        data-active={active === "historical"}
      >
        Historical Properties
      </Link>
      <span className="ml-auto text-xs" style={{ color: "var(--dt-muted)" }}>
        Downtown Properties
      </span>
    </div>
  );
}
