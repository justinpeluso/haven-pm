import { requirePermission } from "@/lib/auth/session";
import {
  getInventoryStats,
  listDowntowns,
  regionalVsPeers,
} from "@/lib/downtown";
import { DowntownHub } from "@/components/downtown/downtown-hub";

export default async function DowntownPage() {
  await requirePermission("downtowns:read");
  const downtowns = listDowntowns();
  const stats = getInventoryStats();
  const compare = regionalVsPeers(stats.avgVibrancy, stats.medianVacancy);

  return (
    <DowntownHub
      stats={stats}
      compare={compare}
      initial={downtowns.map((d) => ({
        id: d.id,
        name: d.name,
        state: d.state,
        county: d.county,
        milesFromAllegheny: d.milesFromAllegheny,
        downtownName: d.downtownName,
        tags: d.tags,
        vibrancy: d.baseline.vibrancy,
        vacancyEstimate: d.baseline.vacancyEstimate,
        mix: d.baseline.mix,
        poiCount: d.baseline.poiCount,
      }))}
    />
  );
}
