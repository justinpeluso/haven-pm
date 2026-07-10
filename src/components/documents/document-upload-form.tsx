"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { uploadDocument } from "@/lib/actions/documents";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2, Upload } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const DOC_TYPES = [
  "LEASE", "INSPECTION_REPORT", "NOTICE", "MOVE_IN_CHECKLIST",
  "SIGNED_DOCUMENT", "PHOTO", "SPREADSHEET", "OTHER",
] as const;

interface DocumentUploadFormProps {
  properties: { id: string; name: string }[];
}

export function DocumentUploadForm({ properties }: DocumentUploadFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await uploadDocument(formData);
    setLoading(false);

    if (result.error) {
      toast({ title: "Upload failed", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Document uploaded" });
    (e.target as HTMLFormElement).reset();
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Upload Document</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="file">File</Label>
            <Input id="file" name="file" type="file" required accept=".pdf,.jpg,.jpeg,.png,.gif,.webp,.doc,.docx,.xls,.xlsx" />
            <p className="text-xs text-muted-foreground">PDF, images, Word, Excel — max 10MB</p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="name">Display Name</Label>
            <Input id="name" name="name" required placeholder="Lease Agreement" />
          </div>

          <div className="space-y-2">
            <Label>Document Type</Label>
            <Select name="type" defaultValue="OTHER" required>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {properties.length > 0 && (
            <div className="space-y-2 sm:col-span-2">
              <Label>Link to Property (optional)</Label>
              <Select name="propertyId">
                <SelectTrigger>
                  <SelectValue placeholder="No property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading}>
              {loading ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <Upload className="mr-2 h-4 w-4" />
              )}
              Upload
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
