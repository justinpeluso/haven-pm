import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { hasPermission, isStaffRole } from "@/lib/permissions";
import { getTenantForUser } from "@/lib/tenant-scope";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { DocumentsList } from "@/components/documents/documents-list";
import { DocumentUploadForm } from "@/components/documents/document-upload-form";
import { EmptyState } from "@/components/shared/empty-state";
import { FileText } from "lucide-react";

export default async function DocumentsPage() {
  const session = await requirePermission("documents:read");
  const canUpload = hasPermission(session.user.role, "documents:write");
  const staff = isStaffRole(session.user.role);

  let tenantId: string | null = null;
  if (!staff) {
    const tenant = await getTenantForUser(session.user.id);
    if (!tenant) {
      return (
        <div className="space-y-6">
          <div>
            <Breadcrumbs items={[{ label: "Documents" }]} />
            <h1 className="mt-2 text-2xl font-bold">Documents</h1>
          </div>
          <EmptyState
            icon={FileText}
            title="No documents"
            description="Documents shared with you will appear here."
          />
        </div>
      );
    }
    tenantId = tenant.id;
  }

  const [documents, properties] = await Promise.all([
    db.document.findMany({
      where: {
        deletedAt: null,
        ...(tenantId ? { tenantId } : {}),
      },
      include: {
        property: { select: { name: true } },
        tenant: { include: { user: { select: { name: true } } } },
      },
      orderBy: { createdAt: "desc" },
      take: 100,
    }),
    canUpload
      ? db.property.findMany({
          where: { deletedAt: null },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
        })
      : Promise.resolve([]),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Documents" }]} />
        <h1 className="mt-2 text-2xl font-bold">Documents</h1>
        <p className="text-muted-foreground">{documents.length} documents</p>
      </div>

      {canUpload && <DocumentUploadForm properties={properties} />}

      {documents.length === 0 ? (
        <EmptyState
          icon={FileText}
          title="No documents yet"
          description={
            canUpload
              ? "Upload your first document using the form above."
              : "Documents will appear here when uploaded."
          }
        />
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
