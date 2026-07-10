import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DocumentsList } from "@/components/documents/documents-list";

export default async function DocumentsPage() {
  await requirePermission("documents:read");

  const documents = await db.document.findMany({
    where: { deletedAt: null },
    include: {
      property: { select: { name: true } },
      tenant: { include: { user: { select: { name: true } } } },
    },
    orderBy: { createdAt: "desc" },
    take: 100,
  });

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Documents" }]} />
        <h1 className="mt-2 text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground">{documents.length} documents</p>
      </div>

      {documents.length === 0 ? (
        <p className="text-center text-muted-foreground py-12">No documents yet</p>
      ) : (
        <DocumentsList
          documents={documents.map((d) => ({
            id: d.id,
            name: d.name,
            url: d.url,
            mimeType: d.mimeType,
            type: d.type,
            createdAt: d.createdAt,
            property: d.property,
            tenant: d.tenant,
          }))}
        />
      )}
    </div>
  );
}
