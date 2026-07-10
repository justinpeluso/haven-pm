"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProspect } from "@/lib/actions/prospects";
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
import { Checkbox } from "@/components/ui/checkbox";

interface NewProspectFormProps {
  properties: { id: string; name: string }[];
}

export function NewProspectForm({ properties }: NewProspectFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [selectedProperties, setSelectedProperties] = useState<string[]>([]);

  const toggleProperty = (id: string) => {
    setSelectedProperties((prev) =>
      prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id]
    );
  };

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    selectedProperties.forEach((id) => formData.append("propertyIds", id));

    const result = await createProspect(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push(`/prospects/${result.id}`);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Prospects", href: "/prospects" },
            { label: "Add Prospect" },
          ]}
        />
        <h1 className="mt-2 text-2xl font-bold">Add Prospect</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Lead Information</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">Full Name</Label>
                <Input id="name" name="name" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" name="email" type="email" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone">Phone</Label>
                <Input id="phone" name="phone" type="tel" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="leadSource">Lead Source</Label>
                <Input id="leadSource" name="leadSource" placeholder="Zillow, Referral, Website..." />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="budget">Budget ($/mo)</Label>
                <Input id="budget" name="budget" type="number" min={0} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="moveDate">Desired Move Date</Label>
                <Input id="moveDate" name="moveDate" type="date" />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="pets">Pets</Label>
              <Input id="pets" name="pets" placeholder="No pets, 1 cat, etc." />
            </div>

            {properties.length > 0 && (
              <div className="space-y-2">
                <Label>Interested Properties</Label>
                <div className="space-y-2 rounded-lg border p-3">
                  {properties.map((p) => (
                    <label key={p.id} className="flex items-center gap-2 text-sm cursor-pointer">
                      <Checkbox
                        checked={selectedProperties.includes(p.id)}
                        onCheckedChange={() => toggleProperty(p.id)}
                      />
                      {p.name}
                    </label>
                  ))}
                </div>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={3} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Prospect
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
