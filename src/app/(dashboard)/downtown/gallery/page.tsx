import { requirePermission } from "@/lib/auth/session";
import { listGalleryCards } from "@/lib/downtown/gallery";
import { DowntownGallery } from "@/components/downtown/downtown-gallery";

export default async function DowntownGalleryPage() {
  await requirePermission("downtowns:read");
  // Prefetched cache — slim list payload (hero + a few thumbs + local fallback)
  const cards = listGalleryCards().map((c) => {
    const photos = c.images.filter((i) => i.kind !== "map").slice(0, 4);
    const fallback = c.images.find((i) => i.kind === "map");
    return {
      ...c,
      images: fallback ? [...photos, fallback] : photos,
    };
  });
  return <DowntownGallery initial={cards} />;
}
