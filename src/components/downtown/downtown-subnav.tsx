"use client";

import Link from "next/link";

export function DowntownSubnav({
  active,
}: {
  active: "intel" | "gallery" | "news" | "historical" | "code-school" | "sims" | "party";
}) {
  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-[var(--dt-line)] pb-4">
      <Link href="/downtown" className="downtown-chip" data-active={active === "intel"}>
        Market intel
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
      <Link
        href="/downtown/code-school"
        className="downtown-chip"
        data-active={active === "code-school"}
      >
        Code School by JP
      </Link>
      <Link
        href="/downtown/sims-real-life"
        className="downtown-chip"
        data-active={active === "sims"}
      >
        Sims Real Life
      </Link>
      <Link
        href="/downtown/party-chronicle"
        className="downtown-chip"
        data-active={active === "party"}
      >
        Party Chronicle
      </Link>
      <span className="ml-auto text-xs" style={{ color: "var(--dt-muted)" }}>
        Downtown Properties
      </span>
    </div>
  );
}
