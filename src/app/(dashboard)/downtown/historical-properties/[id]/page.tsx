import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import { getHistoricalProperty } from "@/lib/downtown/historical-properties";
import { DowntownHistoricalDossier } from "@/components/downtown/downtown-historical-dossier";

type Props = {
  params: Promise<{ id: string }>;
};

export default async function HistoricalPropertyDossierPage({ params }: Props) {
  await requirePermission("downtowns:read");
  const { id } = await params;
  const property = getHistoricalProperty(id);
  if (!property) notFound();
  return <DowntownHistoricalDossier property={property} />;
}
