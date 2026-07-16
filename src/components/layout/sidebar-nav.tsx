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
  const [gamesOpen, setGamesOpen] = useState(gamingActive);

  useEffect(() => {
    if (gamingActive) setGamesOpen(true);
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
        {navItems.map((item) => {
          const isActive =
            item.href === "/downtown"
              ? pathname === "/downtown" ||
                (pathname.startsWith("/downtown/") && !isJpGamingPath(pathname))
              : pathname === item.href || pathname.startsWith(`${item.href}/`);
          const Icon = item.icon;
          return (
            <div key={item.href}>
              <Link
                href={item.href}
                onClick={onNavigate}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-accent-foreground"
                    : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                )}
                title={collapsed ? item.title : undefined}
              >
                <Icon className="h-4 w-4 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>

              {item.href === "/downtown" && showJpGaming && collapsed ? (
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "mt-1 flex w-full items-center justify-center rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                        gamingActive
                          ? "bg-sidebar-accent text-sidebar-accent-foreground"
                          : "text-sidebar-foreground hover:bg-sidebar-accent/50"
                      )}
                      title="JP Gaming"
                      aria-label="JP Gaming"
                      aria-haspopup="menu"
                    >
                      <Gamepad2 className="h-4 w-4 shrink-0" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent side="right" align="start" className="min-w-[12rem]">
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
                  </DropdownMenuContent>
                </DropdownMenu>
              ) : null}

              {item.href === "/downtown" && showJpGaming && !collapsed ? (
                <div className="mt-1 space-y-1">
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
                        "h-4 w-4 shrink-0 opacity-70 transition-transform",
                        gamesOpen && "rotate-180"
                      )}
                      aria-hidden
                    />
                  </button>
                  {gamesOpen ? (
                    <div id="jp-gaming-nav" className="space-y-0.5 pl-4" role="group" aria-label="JP Gaming">
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
          );
        })}
      </nav>
    </>
  );
}
