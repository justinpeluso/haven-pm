export const JP_GAMING_LINKS = [
  {
    id: "true-grit" as const,
    href: "/true-grit",
    label: "Dungeons and Dogs",
    hint: "Lost Brothers — Neon Wilderland",
  },
  {
    id: "emberreach" as const,
    href: "/emberreach",
    label: "Emberreach",
    hint: "Ashtrail Watch — third-person prototype",
  },
] as const;

export type JpGamingId = (typeof JP_GAMING_LINKS)[number]["id"];

const LAST_GAME_KEY = "jp-gaming-last";

export function isJpGamingPath(pathname: string): boolean {
  if (pathname === "/true-grit" || pathname.startsWith("/true-grit/")) return true;
  if (pathname === "/emberreach" || pathname.startsWith("/emberreach/")) return true;
  // Legacy bookmarks — still treated as gaming workspace while they redirect.
  if (pathname === "/neverworld" || pathname.startsWith("/neverworld/")) return true;
  return (
    pathname.startsWith("/downtown/neverworld") ||
    pathname.startsWith("/downtown/dungeon-tester") ||
    pathname.startsWith("/downtown/party-chronicle")
  );
}

export function jpGamingHrefForPath(pathname: string): string | null {
  for (const game of JP_GAMING_LINKS) {
    if (pathname === game.href || pathname.startsWith(`${game.href}/`)) {
      return game.href;
    }
  }
  if (isJpGamingPath(pathname)) return JP_GAMING_LINKS[0].href;
  return null;
}

export function readLastJpGamingHref(): string {
  if (typeof window === "undefined") return JP_GAMING_LINKS[0].href;
  const v = window.localStorage.getItem(LAST_GAME_KEY);
  if (JP_GAMING_LINKS.some((g) => g.href === v)) return v!;
  return JP_GAMING_LINKS[0].href;
}

export function writeLastJpGamingHref(href: string) {
  if (typeof window === "undefined") return;
  if (JP_GAMING_LINKS.some((g) => g.href === href)) {
    window.localStorage.setItem(LAST_GAME_KEY, href);
  }
}
