export const JP_GAMING_LINKS = [
  {
    id: "neverworld" as const,
    href: "/neverworld",
    label: "Neverworld",
    hint: "Party Chronicle",
  },
  {
    id: "true-grit" as const,
    href: "/true-grit",
    label: "Dungeons and Dogs",
    hint: "Lost Brothers — Neon Wilderland",
  },
] as const;

export type JpGamingId = (typeof JP_GAMING_LINKS)[number]["id"];

const LAST_GAME_KEY = "jp-gaming-last";

export function isJpGamingPath(pathname: string): boolean {
  if (pathname === "/neverworld" || pathname.startsWith("/neverworld/")) return true;
  if (pathname === "/true-grit" || pathname.startsWith("/true-grit/")) return true;
  return (
    pathname.startsWith("/downtown/neverworld") ||
    pathname.startsWith("/downtown/dungeon-tester") ||
    pathname.startsWith("/downtown/party-chronicle")
  );
}

export function jpGamingHrefForPath(pathname: string): string | null {
  if (pathname === "/neverworld" || pathname.startsWith("/neverworld/")) {
    return "/neverworld";
  }
  if (pathname === "/true-grit" || pathname.startsWith("/true-grit/")) {
    return "/true-grit";
  }
  if (
    pathname.startsWith("/downtown/neverworld") ||
    pathname.startsWith("/downtown/party-chronicle")
  ) {
    return "/neverworld";
  }
  if (pathname.startsWith("/downtown/dungeon-tester")) {
    return "/true-grit";
  }
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
