"use client";

import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { ExternalLink, Download } from "lucide-react";

interface DocumentPreviewProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  document: {
    id: string;
    name: string;
    url: string;
    mimeType?: string | null;
  } | null;
}

function downloadPath(document: { id: string; url: string }) {
  // Always prefer the auth’d proxy so private Blob + local uploads work the same.
  return `/api/documents/${document.id}/download`;
}

export function DocumentPreview({ open, onOpenChange, document }: DocumentPreviewProps) {
  if (!document) return null;

  const href = downloadPath(document);
  const isPdf = document.mimeType === "application/pdf" || document.url.endsWith(".pdf");
  const isImage = document.mimeType?.startsWith("image/");

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] flex flex-col">
        <DialogHeader>
          <DialogTitle className="flex items-center justify-between pr-8">
            <span className="truncate">{document.name}</span>
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <a href={href} download>
                  <Download className="mr-1 h-4 w-4" />
                  Download
                </a>
              </Button>
              <Button variant="outline" size="sm" asChild>
                <a href={href} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="mr-1 h-4 w-4" />
                  Open
                </a>
              </Button>
            </div>
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 min-h-[60vh] overflow-hidden rounded-lg border bg-muted/30">
          {isPdf ? (
            <iframe
              src={href}
              className="h-[60vh] w-full"
              title={document.name}
            />
          ) : isImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={href}
              alt={document.name}
              className="mx-auto max-h-[60vh] object-contain p-4"
            />
          ) : (
            <div className="flex h-[60vh] flex-col items-center justify-center gap-4 text-muted-foreground">
              <p>Preview not available for this file type</p>
              <Button asChild>
                <a href={href} target="_blank" rel="noopener noreferrer">
                  Open in new tab
                </a>
              </Button>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}
