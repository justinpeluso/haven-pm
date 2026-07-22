import type { Metadata } from "next";
import { UserRole } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { DungeonTesterGame } from "@/components/dungeon-tester/dungeon-tester-game";
import { DemoAccountsPanel } from "@/components/demo-accounts-panel";
import { canViewDemoAccounts } from "@/lib/demo-accounts";
import { isDmEmail, slotFromEmail } from "@/lib/downtown/party-chronicle/players";
import type { PlayerIdentity } from "@/lib/downtown/party-chronicle/types";

export const metadata: Metadata = {
  title: "Dungeons and Dogs: Lost Brothers",
  description:
    "Adult pulp. Three amnesiac brothers and a dog in the Neon Wilderland — Helix Dominion, Project Pale, woods without names.",
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
  const showDemoAccounts = canViewDemoAccounts(session.user);
  return (
    <div className="space-y-3">
      {showDemoAccounts ? <DemoAccountsPanel compact /> : null}
      <DungeonTesterGame identity={identity} />
    </div>
  );
}
