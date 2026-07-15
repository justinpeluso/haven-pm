import { requirePermission } from "@/lib/auth/session";
import { ComputerHelperApp } from "@/components/computer-helper/computer-helper-app";

export default async function ComputerHelperPage() {
  await requirePermission("downtowns:read");
  return <ComputerHelperApp />;
}
