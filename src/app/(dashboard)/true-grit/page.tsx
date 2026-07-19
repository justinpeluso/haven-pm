import type { Metadata } from "next";
import { UserRole } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { DungeonTesterGame } from "@/components/dungeon-tester/dungeon-tester-game";
import { isDmEmail, slotFromEmail } from "@/lib/downtown/party-chronicle/players";
import type { PlayerIdentity } from "@/lib/downtown/party-chronicle/types";

export const metadata: Metadata = {
  title: "Dungeons and Dogs",
  description:
    "Wilderland liberation march — warrants, collar yards, and a scarred marshal who drinks harder than he admits.",
};

export default async function DungeonsAndDogsPage() {
  const session = await requirePermission("downtowns:read");
  const email = session.user.email ?? "";
  const identity: PlayerIdentity = {
    email,
    name: session.user.name ?? null,
    slot: slotFromEmail(email),
    isDm: isDmEmail(email) || session.user.role === UserRole.ADMINISTRATOR,
  };
  return <DungeonTesterGame identity={identity} />;
}
