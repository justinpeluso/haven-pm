import { UserRole } from "@prisma/client";
import { requirePermission } from "@/lib/auth/session";
import { PartyChronicleGame } from "@/components/party-chronicle/party-chronicle-game";
import { isDmEmail, slotFromEmail } from "@/lib/downtown/party-chronicle/players";
import type { PlayerIdentity } from "@/lib/downtown/party-chronicle/types";

export default async function NeverworldPage() {
  const session = await requirePermission("downtowns:read");
  const email = session.user.email ?? "";
  const identity: PlayerIdentity = {
    email,
    name: session.user.name ?? null,
    slot: slotFromEmail(email),
    isDm: isDmEmail(email) || session.user.role === UserRole.ADMINISTRATOR,
  };
  return <PartyChronicleGame identity={identity} />;
}
