"use client";

import { useEffect, useId, useState } from "react";
import Link from "next/link";
import { ChevronDown } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { cn } from "@/lib/utils";

export const JP_GAMING_LINKS = [
  {
    id: "neverworld" as const,
    href: "/downtown/neverworld",
    label: "Neverworld",
    hint: "Party Chronicle",
  },
  {
    id: "dungeon-tester" as const,
    href: "/downtown/dungeon-tester",
    label: "DungeonTester",
  },
] as const;

export type JpGamingId = (typeof JP_GAMING_LINKS)[number]["id"];

export type DowntownSubnavActive =
  | "intel"
  | "gallery"
  | "news"
  | "historical"
  | JpGamingId;

function isGameActive(active: DowntownSubnavActive): active is JpGamingId {
  return JP_GAMING_LINKS.some((g) => g.id === active);
}

export function DowntownSubnav({
  active,
}: {
  active: DowntownSubnavActive;
}) {
  const gameActive = isGameActive(active);
  const activeGame = JP_GAMING_LINKS.find((g) => g.id === active);
  const [mobileGamesOpen, setMobileGamesOpen] = useState(gameActive);
  const mobilePanelId = useId();

  useEffect(() => {
    if (gameActive) setMobileGamesOpen(true);
  }, [gameActive, active]);

  return (
    <div className="mb-5 flex flex-wrap items-center gap-2 border-b border-[var(--dt-line)] pb-4">
      <Link href="/downtown" className="downtown-chip" data-active={active === "intel"}>
        Market intel
      </Link>

      {/* Desktop: JP Gaming dropdown */}
      <div className="hidden sm:block">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="downtown-chip"
              data-active={gameActive}
              aria-label={
                activeGame ? `JP Gaming, ${activeGame.label} selected` : "JP Gaming"
              }
            >
              JP Gaming
              {activeGame ? (
                <span className="normal-case tracking-normal opacity-80">· {activeGame.label}</span>
              ) : null}
              <ChevronDown className="h-3 w-3 opacity-70" aria-hidden />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent
            align="start"
            className="min-w-[14rem] border-[#2a3a45] bg-[#152028] text-[#e8eef2]"
          >
            {JP_GAMING_LINKS.map((game) => {
              const isCurrent = active === game.id;
              return (
                <DropdownMenuItem key={game.id} asChild>
                  <Link
                    href={game.href}
                    className={cn(
                      "cursor-pointer focus:bg-[#1c2a33] focus:text-[#e8eef2]",
                      isCurrent && "bg-[#1c2a33] text-[#c4a35a]"
                    )}
                    aria-current={isCurrent ? "page" : undefined}
                  >
                    <span className="flex flex-col gap-0.5">
                      <span className="text-sm font-medium">{game.label}</span>
                      {"hint" in game && game.hint ? (
                        <span className="text-xs text-[#8aa0ad]">{game.hint}</span>
                      ) : null}
                    </span>
                  </Link>
                </DropdownMenuItem>
              );
            })}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Mobile: expandable JP Gaming */}
      <button
        type="button"
        className="downtown-chip sm:hidden"
        data-active={gameActive}
        aria-expanded={mobileGamesOpen}
        aria-controls={mobilePanelId}
        aria-label={activeGame ? `JP Gaming, ${activeGame.label} selected` : "JP Gaming"}
        onClick={() => setMobileGamesOpen((o) => !o)}
      >
        JP Gaming
        {activeGame ? (
          <span className="normal-case tracking-normal opacity-80">· {activeGame.label}</span>
        ) : null}
        <ChevronDown
          className={cn("h-3 w-3 opacity-70 transition-transform", mobileGamesOpen && "rotate-180")}
          aria-hidden
        />
      </button>
      {mobileGamesOpen ? (
        <div
          id={mobilePanelId}
          className="flex basis-full flex-wrap gap-2 sm:hidden"
          role="group"
          aria-label="JP Gaming games"
        >
          {JP_GAMING_LINKS.map((game) => (
            <Link
              key={game.id}
              href={game.href}
              className="downtown-chip"
              data-active={active === game.id}
              aria-current={active === game.id ? "page" : undefined}
            >
              {game.label}
              {"hint" in game && game.hint ? (
                <span className="normal-case tracking-normal opacity-70">/ {game.hint}</span>
              ) : null}
            </Link>
          ))}
        </div>
      ) : null}

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
