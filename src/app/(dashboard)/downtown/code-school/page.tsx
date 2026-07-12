import { requirePermission } from "@/lib/auth/session";
import { CodeSchoolGame } from "@/components/downtown/code-school-game";

export default async function CodeSchoolPage() {
  await requirePermission("downtowns:read");
  return <CodeSchoolGame />;
}
