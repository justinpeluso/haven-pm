export const JP_GAMING_LINKS = [
  {
    id: "neverworld" as const,
    href: "/neverworld",
    label: "Neverworld",
    hint: "Party Chronicle",
  },
  {
    id: "dungeon-tester" as const,
    href: "/true-grit",
    label: "True Grit",
  },
] as const;

export type JpGamingId = (typeof JP_GAMING_LINKS)[number]["id"];

export function isJpGamingPath(pathname: string): boolean {
  if (pathname === "/neverworld" || pathname.startsWith("/neverworld/")) return true;
  if (pathname === "/true-grit" || pathname.startsWith("/true-grit/")) return true;
  return (
    pathname.startsWith("/downtown/neverworld") ||
    pathname.startsWith("/downtown/dungeon-tester") ||
    pathname.startsWith("/downtown/party-chronicle")
  );
}
