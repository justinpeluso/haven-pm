import { requirePermission } from "@/lib/auth/session";
import { listDowntowns } from "@/lib/downtown";
import { DowntownNews } from "@/components/downtown/downtown-news";

export default async function DowntownNewsPage() {
  await requirePermission("downtowns:read");
  const towns = listDowntowns().map((d) => ({
    id: d.id,
    name: d.name,
    state: d.state,
    county: d.county,
  }));
  return <DowntownNews towns={towns} />;
}
