import { requirePermission } from "@/lib/auth/session";
import { SimsRealLifeGame } from "@/components/downtown/sims-real-life-game";

export default async function SimsRealLifePage() {
  await requirePermission("downtowns:read");
  return <SimsRealLifeGame />;
}
