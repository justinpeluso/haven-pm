import { requirePermission } from "@/lib/auth/session";
import {
  listHistoricalProperties,
  historicalPropertiesGeneratedAt,
} from "@/lib/downtown/historical-properties";
import { DowntownHistoricalList } from "@/components/downtown/downtown-historical-list";

export default async function HistoricalPropertiesPage() {
  await requirePermission("downtowns:read");
  const properties = listHistoricalProperties();
  const generatedAt = historicalPropertiesGeneratedAt();
  return <DowntownHistoricalList properties={properties} generatedAt={generatedAt} />;
}
