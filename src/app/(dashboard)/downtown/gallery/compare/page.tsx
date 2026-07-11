import { requirePermission } from "@/lib/auth/session";
import { DowntownCompare } from "@/components/downtown/downtown-compare";

export default async function DowntownComparePage({
  searchParams,
}: {
  searchParams: Promise<{ ids?: string }>;
}) {
  await requirePermission("downtowns:read");
  const sp = await searchParams;
  const ids = (sp.ids ?? "")
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 4);

  if (ids.length < 2) {
    return (
      <div className="downtown-shell p-6 text-sm" style={{ color: "var(--dt-muted)" }}>
        Select at least 2 downtowns from the{" "}
        <a href="/downtown/gallery" className="underline">
          gallery
        </a>{" "}
        to compare.
      </div>
    );
  }

  return <DowntownCompare ids={ids} />;
}
