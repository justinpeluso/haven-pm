import { notFound } from "next/navigation";
import { requirePermission } from "@/lib/auth/session";
import {
  getDowntownById,
  getDowntownDocuments,
  getDowntownProfile,
  getDowntownYoutube,
  getUsPeers,
} from "@/lib/downtown";
import { DowntownDetail } from "@/components/downtown/downtown-detail";

export default async function DowntownDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  await requirePermission("downtowns:read");
  const { id } = await params;
  const downtown = getDowntownById(id);
  if (!downtown) notFound();

  const profile = getDowntownProfile(downtown);
  const youtube = getDowntownYoutube(downtown.id);
  const documents = getDowntownDocuments(downtown.id);
  const mapUrl = `https://www.openstreetmap.org/#map=16/${downtown.center.lat}/${downtown.center.lng}`;

  return (
    <DowntownDetail
      id={downtown.id}
      initialDowntown={{
        id: downtown.id,
        name: downtown.name,
        state: downtown.state,
        county: downtown.county,
        milesFromAllegheny: downtown.milesFromAllegheny,
        downtownName: downtown.downtownName,
        center: downtown.center,
        radiusM: downtown.radiusM,
        tags: downtown.tags,
      }}
      initialMetrics={{
        ...downtown.baseline,
        dataSource: "baseline",
        samplePois: profile.sampleBusinesses.map((b) => ({
          name: b.name,
          category: b.category,
          street: b.street,
          note: b.note,
          status: b.status ?? "open",
        })),
      }}
      initialProfile={profile}
      peers={getUsPeers()}
      mapUrl={mapUrl}
      youtube={youtube}
      documents={documents}
    />
  );
}
