import { requirePermission } from "@/lib/auth/session";
import { listGalleryCards } from "@/lib/downtown/gallery";
import { DowntownGallery } from "@/components/downtown/downtown-gallery";

export default async function DowntownGalleryPage() {
  await requirePermission("downtowns:read");
  const cards = listGalleryCards();

  return <DowntownGallery initial={cards} />;
}
