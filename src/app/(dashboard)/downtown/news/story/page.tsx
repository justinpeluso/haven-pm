import { requirePermission } from "@/lib/auth/session";
import { DowntownNewsStory } from "@/components/downtown/downtown-news-story";

type SearchParams = Promise<Record<string, string | string[] | undefined>>;

function one(v: string | string[] | undefined) {
  if (Array.isArray(v)) return v[0] ?? "";
  return v ?? "";
}

export default async function DowntownNewsStoryPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requirePermission("downtowns:read");
  const sp = await searchParams;
  const url = one(sp.url);
  const id = one(sp.id);
  const title = one(sp.title);
  const source = one(sp.source);
  const publishedAt = one(sp.publishedAt) || null;
  const snippet = one(sp.snippet);
  const downtownName = one(sp.downtownName);
  const state = one(sp.state);

  if (!url) {
    return (
      <div className="downtown-shell p-6 text-sm" style={{ color: "var(--dt-muted)" }}>
        Missing story URL.{" "}
        <a href="/downtown/news" className="underline">
          Back to Local CBD News
        </a>
      </div>
    );
  }

  return (
    <DowntownNewsStory
      id={id}
      url={url}
      title={title}
      source={source}
      publishedAt={publishedAt}
      snippet={snippet}
      downtownName={downtownName}
      state={state}
    />
  );
}
