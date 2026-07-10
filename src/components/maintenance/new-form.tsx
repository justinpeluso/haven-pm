"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createMaintenanceRequest } from "@/lib/actions/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface NewMaintenanceFormProps {
  properties: { id: string; name: string; units: { id: string; unitNumber: string }[] }[];
}

export function NewMaintenanceForm({ properties }: NewMaintenanceFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [propertyId, setPropertyId] = useState("");
  const selectedProperty = properties.find((p) => p.id === propertyId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    formData.set("propertyId", propertyId);

    const result = await createMaintenanceRequest(formData);

    if (result.error) {
      toast({ title: "Failed to submit", description: result.error, variant: "destructive" });
      setError(result.error);
      setLoading(false);
      return;
    }

    toast({ title: "Request submitted", description: "Maintenance request created successfully." });
    router.push(`/maintenance/${result.id}`);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Maintenance", href: "/maintenance" },
            { label: "New Request" },
          ]}
        />
        <h1 className="mt-2 text-2xl font-bold">New Maintenance Request</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Request Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label>Property</Label>
              <Select value={propertyId} onValueChange={setPropertyId} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {selectedProperty && selectedProperty.units.length > 0 && (
              <div className="space-y-2">
                <Label htmlFor="unitId">Unit (optional)</Label>
                <Select name="unitId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select unit" />
                  </SelectTrigger>
                  <SelectContent>
                    {selectedProperty.units.map((u) => (
                      <SelectItem key={u.id} value={u.id}>Unit {u.unitNumber}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required placeholder="Brief description of the issue" />
            </div>

            <div className="space-y-2">
              <Label>Category</Label>
              <Select name="category" required>
                <SelectTrigger>
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {["PLUMBING", "ELECTRICAL", "HVAC", "APPLIANCE", "STRUCTURAL", "PEST_CONTROL", "LANDSCAPING", "GENERAL", "OTHER"].map((c) => (
                    <SelectItem key={c} value={c}>{c.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Priority</Label>
              <Select name="priority" defaultValue="MEDIUM">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["LOW", "MEDIUM", "HIGH", "EMERGENCY"].map((p) => (
                    <SelectItem key={p} value={p}>{p}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="description">Description</Label>
              <Textarea id="description" name="description" required rows={4} placeholder="Describe the issue in detail..." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="tenantNotes">Additional Notes</Label>
              <Textarea id="tenantNotes" name="tenantNotes" rows={2} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading || !propertyId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Submit Request
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
