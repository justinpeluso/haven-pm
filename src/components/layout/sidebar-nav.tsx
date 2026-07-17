"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { Building2, ChevronDown, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItemsForRole } from "@/lib/navigation";
import { JP_GAMING_LINKS } from "@/components/downtown/downtown-subnav";
import { UserRole } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface SidebarNavProps {
  role: UserRole;
  collapsed?: boolean;
  onNavigate?: () => void;
  company?: {
    name: string;
    website: string;
  };
}

function isJpGamingPath(pathname: string): boolean {
  return JP_GAMING_LINKS.some(
    (g) => pathname === g.href || pathname.startsWith(`${g.href}/`)
  );
}

const navLinkClass = (active: boolean) =>
  cn(
    "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
    active
      ? "bg-sidebar-accent text-sidebar-accent-foreground"
      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
  );

export function SidebarNav({
  role,
  collapsed = false,
  onNavigate,
  company,
}: SidebarNavProps) {
  const pathname = usePathname();
  const navItems = getNavItemsForRole(role);
  const brandName = company?.name || "Haven PM";
  const showJpGaming = navItems.some((item) => item.href === "/downtown");
  const gamingActive = isJpGamingPath(pathname);
  const [havenOpen, setHavenOpen] = useState(true);
  const [gamesOpen, setGamesOpen] = useState(gamingActive);

  useEffect(() => {
    if (gamingActive) {
      setHavenOpen(true);
      setGamesOpen(true);
    }
  }, [gamingActive, pathname]);

  return (
    <>
      <div className="flex h-14 items-center gap-2 border-b px-4">
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <Building2 className="h-4 w-4" />
        </div>
        {!collapsed && (
          <div className="min-w-0 flex-1">
            <span className="block truncate text-sm font-semibold">{brandName}</span>
            <span className="text-xs text-muted-foreground">Property Management</span>
          </div>
        )}
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {showJpGaming && collapsed ? (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  gamingActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                title="Haven"
                aria-label="Haven"
                aria-haspopup="menu"
              >
                <Building2 className="h-4 w-4 shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent side="right" align="start" className="min-w-[12rem]">
              <DropdownMenuSub>
                <DropdownMenuSubTrigger
                  className={cn(
                    "font-medium",
                    gamingActive && "bg-accent"
                  )}
                >
                  <Gamepad2 className="mr-2 h-4 w-4" />
                  JP Gaming
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="min-w-[12rem]">
                  {JP_GAMING_LINKS.map((game) => {
                    const isCurrent =
                      pathname === game.href || pathname.startsWith(`${game.href}/`);
                    return (
                      <DropdownMenuItem key={game.id} asChild>
                        <Link
                          href={game.href}
                          onClick={onNavigate}
                          aria-current={isCurrent ? "page" : undefined}
                          className={cn(isCurrent && "bg-accent")}
                        >
                          <span className="flex flex-col gap-0.5">
                            <span>{game.label}</span>
                            {"hint" in game && game.hint ? (
                              <span className="text-xs text-muted-foreground">{game.hint}</span>
                            ) : null}
                          </span>
                        </Link>
                      </DropdownMenuItem>
                    );
                  })}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
            </DropdownMenuContent>
          </DropdownMenu>
        ) : null}

        {showJpGaming && !collapsed ? (
          <div className="space-y-1">
            <button
              type="button"
              onClick={() => setHavenOpen((o) => !o)}
              className={navLinkClass(gamingActive)}
              aria-expanded={havenOpen}
              aria-controls="haven-nav"
            >
              <Building2 className="h-4 w-4 shrink-0" />
              <span className="flex-1 text-left">Haven</span>
              <ChevronDown
                className={cn(
                  "h-4 w-4 shrink-0 text-sidebar-foreground/80 transition-transform",
                  havenOpen && "rotate-180"
                )}
                aria-hidden
              />
            </button>

            {havenOpen ? (
              <div id="haven-nav" className="space-y-1 pl-3" role="group" aria-label="Haven">
                <button
                  type="button"
                  onClick={() => setGamesOpen((o) => !o)}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                    gamingActive
                      ? "bg-sidebar-accent text-sidebar-accent-foreground"
                      : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                  )}
                  aria-expanded={gamesOpen}
                  aria-controls="jp-gaming-nav"
                >
                  <Gamepad2 className="h-4 w-4 shrink-0" />
                  <span className="flex-1 text-left">JP Gaming</span>
                  <ChevronDown
                    className={cn(
                      "h-4 w-4 shrink-0 text-sidebar-foreground/80 transition-transform",
                      gamesOpen && "rotate-180"
                    )}
                    aria-hidden
                  />
                </button>

                {gamesOpen ? (
                  <div
                    id="jp-gaming-nav"
                    className="space-y-0.5 pl-4"
                    role="group"
                    aria-label="JP Gaming"
                  >
                    {JP_GAMING_LINKS.map((game) => {
                      const isCurrent =
                        pathname === game.href || pathname.startsWith(`${game.href}/`);
                      return (
                        <Link
                          key={game.id}
                          href={game.href}
                          onClick={onNavigate}
                          aria-current={isCurrent ? "page" : undefined}
                          className={cn(
                            "block rounded-lg px-3 py-2 text-sm transition-colors",
                            isCurrent
                              ? "bg-sidebar-accent font-medium text-sidebar-accent-foreground"
                              : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                          )}
                        >
                          <span className="block">{game.label}</span>
                          {"hint" in game && game.hint ? (
                            <span className="block text-xs text-muted-foreground">{game.hint}</span>
                          ) : null}
                        </Link>
                      );
                    })}
                  </div>
                ) : null}
              </div>
            ) : null}
          </div>
        ) : null}

        {navItems.map((item) => {
          const isActive =
            item.href === "/downtown"
              ? pathname === "/downtown" ||
                (pathname.startsWith("/downtown/") && !isJpGamingPath(pathname))
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={onNavigate}
              className={navLinkClass(isActive)}
              title={collapsed ? item.title : undefined}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.title}</span>}
            </Link>
          );
        })}
      </nav>
    </>
  );
}
