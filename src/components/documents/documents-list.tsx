"use client";

import { useState } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DocumentPreview } from "@/components/documents/document-preview";
import { formatDate } from "@/lib/utils";
import { Eye } from "lucide-react";

export interface DocumentItem {
  id: string;
  name: string;
  url: string;
  mimeType: string | null;
  type: string;
  createdAt: string | Date;
  property?: { name: string } | null;
  tenant?: { user: { name: string | null } } | null;
}

export function DocumentsList({ documents }: { documents: DocumentItem[] }) {
  const [preview, setPreview] = useState<DocumentItem | null>(null);

  return (
    <>
      <div className="space-y-2">
        {documents.map((doc) => (
          <Card key={doc.id}>
            <CardContent className="flex items-center justify-between p-4">
              <div>
                <p className="font-medium">{doc.name}</p>
                <p className="text-sm text-muted-foreground">
                  {doc.type.replace(/_/g, " ")}
                  {doc.property && ` · ${doc.property.name}`}
                  {doc.tenant && ` · ${doc.tenant.user.name}`}
                </p>
                <p className="text-xs text-muted-foreground mt-1">{formatDate(doc.createdAt)}</p>
              </div>
              <div className="flex items-center gap-2">
                <Badge variant="outline">{doc.mimeType?.split("/")[1] || "file"}</Badge>
                <Button variant="outline" size="sm" onClick={() => setPreview(doc)}>
                  <Eye className="mr-1 h-4 w-4" />
                  Preview
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <DocumentPreview
        open={!!preview}
        onOpenChange={(open) => !open && setPreview(null)}
        document={preview}
      />
    </>
  );
}
