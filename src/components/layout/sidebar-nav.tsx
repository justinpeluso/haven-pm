"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Building2, Check, ChevronDown, Gamepad2 } from "lucide-react";
import { cn } from "@/lib/utils";
import { getNavItemsForRole } from "@/lib/navigation";
import {
  isJpGamingPath,
  jpGamingHrefForPath,
  JP_GAMING_LINKS,
  readLastJpGamingHref,
  writeLastJpGamingHref,
} from "@/lib/jp-gaming";
import { UserRole } from "@prisma/client";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type WorkspaceId = "haven" | "jp-gaming";

const WORKSPACE_KEY = "haven-workspace";

interface SidebarNavProps {
  role: UserRole;
  collapsed?: boolean;
  onNavigate?: () => void;
  company?: {
    name: string;
    website: string;
  };
}

function readStoredWorkspace(): WorkspaceId | null {
  if (typeof window === "undefined") return null;
  const v = window.localStorage.getItem(WORKSPACE_KEY);
  return v === "haven" || v === "jp-gaming" ? v : null;
}

function writeStoredWorkspace(id: WorkspaceId) {
  if (typeof window === "undefined") return;
  window.localStorage.setItem(WORKSPACE_KEY, id);
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
  const router = useRouter();
  const navItems = getNavItemsForRole(role);
  const canAccessGaming = navItems.some((item) => item.href === "/downtown");
  const gamingPath = isJpGamingPath(pathname);

  const [workspace, setWorkspace] = useState<WorkspaceId>(() =>
    gamingPath ? "jp-gaming" : "haven"
  );

  useEffect(() => {
    if (gamingPath) {
      setWorkspace("jp-gaming");
      writeStoredWorkspace("jp-gaming");
      const href = jpGamingHrefForPath(pathname);
      if (href) writeLastJpGamingHref(href);
      return;
    }
    // Dashboard is shared — keep stored workspace if set
    if (pathname === "/dashboard" || pathname.startsWith("/dashboard/")) {
      const stored = readStoredWorkspace();
      if (stored) setWorkspace(stored);
      return;
    }
    // Any other Haven route forces Haven workspace
    setWorkspace("haven");
    writeStoredWorkspace("haven");
  }, [pathname, gamingPath]);

  const brandName = company?.name || "Haven PM";
  const isGaming = workspace === "jp-gaming" && canAccessGaming;

  const havenItems = useMemo(
    () => navItems.filter((item) => item.href !== "/dashboard"),
    [navItems]
  );

  const switchWorkspace = (next: WorkspaceId) => {
    setWorkspace(next);
    writeStoredWorkspace(next);
    if (next === "jp-gaming") {
      if (!gamingPath) {
        router.push(readLastJpGamingHref());
      }
    } else if (gamingPath) {
      router.push("/dashboard");
    }
    onNavigate?.();
  };

  return (
    <>
      <div className="flex h-14 items-center gap-1 border-b px-2">
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className={cn(
                "group flex h-full min-w-0 flex-1 origin-left items-center gap-2 rounded-lg px-2 py-1.5 text-left",
                "transition-[background-color,transform,box-shadow] duration-200 ease-out",
                "hover:scale-[1.03] hover:bg-sidebar-accent hover:shadow-sm",
                "dark:hover:bg-white/12 dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.08)]",
                "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring",
                "data-[state=open]:bg-sidebar-accent data-[state=open]:scale-[1.03]",
                "dark:data-[state=open]:bg-white/12"
              )}
              aria-label="Switch workspace"
            >
              <div
                className={cn(
                  "flex h-8 w-8 shrink-0 items-center justify-center rounded-lg transition-transform duration-200 ease-out",
                  "group-hover:scale-110 group-data-[state=open]:scale-110",
                  isGaming
                    ? "bg-amber-600 text-white"
                    : "bg-primary text-primary-foreground"
                )}
              >
                {isGaming ? (
                  <Gamepad2 className="h-4 w-4" />
                ) : (
                  <Building2 className="h-4 w-4" />
                )}
              </div>
              {!collapsed && (
                <div className="min-w-0 flex-1">
                  <span className="block truncate text-sm font-semibold">
                    {isGaming ? "JP Gaming" : brandName}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {isGaming ? "Games" : "Property Management"}
                  </span>
                </div>
              )}
              {!collapsed && (
                <ChevronDown
                  className="h-4 w-4 shrink-0 text-muted-foreground transition-transform duration-200 group-hover:translate-y-px group-data-[state=open]:rotate-180"
                  aria-hidden
                />
              )}
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start" className="min-w-[14rem]">
            <DropdownMenuLabel>Switch workspace</DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onSelect={() => switchWorkspace("haven")}
              className="gap-2"
            >
              <Building2 className="h-4 w-4" />
              <span className="flex-1">Haven</span>
              {!isGaming ? <Check className="h-4 w-4" /> : null}
            </DropdownMenuItem>
            {canAccessGaming ? (
              <DropdownMenuItem
                onSelect={() => switchWorkspace("jp-gaming")}
                className="gap-2"
              >
                <Gamepad2 className="h-4 w-4" />
                <span className="flex-1">JP Gaming</span>
                {isGaming ? <Check className="h-4 w-4" /> : null}
              </DropdownMenuItem>
            ) : null}
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <nav className="flex-1 space-y-1 overflow-y-auto p-2">
        {navItems.some((i) => i.href === "/dashboard") ? (
          <Link
            href="/dashboard"
            onClick={onNavigate}
            className={navLinkClass(
              pathname === "/dashboard" || pathname.startsWith("/dashboard/")
            )}
            title={collapsed ? "Dashboard" : undefined}
          >
            {(() => {
              const dash = navItems.find((i) => i.href === "/dashboard");
              const Icon = dash?.icon;
              return Icon ? <Icon className="h-4 w-4 shrink-0" /> : null;
            })()}
            {!collapsed && <span>Dashboard</span>}
          </Link>
        ) : null}

        {isGaming ? (
          JP_GAMING_LINKS.map((game) => {
            const isCurrent =
              pathname === game.href || pathname.startsWith(`${game.href}/`);
            return (
              <Link
                key={game.id}
                href={game.href}
                onClick={onNavigate}
                aria-current={isCurrent ? "page" : undefined}
                className={navLinkClass(isCurrent)}
                title={collapsed ? game.label : undefined}
              >
                <Gamepad2 className="h-4 w-4 shrink-0" />
                {!collapsed && (
                  <span className="min-w-0">
                    <span className="block">{game.label}</span>
                    {"hint" in game && game.hint ? (
                      <span className="block text-xs font-normal text-muted-foreground">
                        {game.hint}
                      </span>
                    ) : null}
                  </span>
                )}
              </Link>
            );
          })
        ) : (
          havenItems.map((item) => {
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
          })
        )}
      </nav>
    </>
  );
}
