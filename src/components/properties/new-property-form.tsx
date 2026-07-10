"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createProperty } from "@/lib/actions/properties";
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

interface NewPropertyFormProps {
  owners: { id: string; name: string }[];
}

export function NewPropertyForm({ owners }: NewPropertyFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createProperty(formData);

    if (result.error) {
      toast({ title: "Failed to create property", description: result.error, variant: "destructive" });
      setError(result.error);
      setLoading(false);
      return;
    }

    toast({ title: "Property created" });
    router.push(`/properties/${result.id}`);
  };

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Properties", href: "/properties" },
            { label: "Add Property" },
          ]}
        />
        <h1 className="mt-2 text-2xl font-bold">Add Property</h1>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property Details</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="name">Property Name</Label>
              <Input id="name" name="name" required placeholder="Riverside Apartments" />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="addressLine1">Address</Label>
                <Input id="addressLine1" name="addressLine1" required />
              </div>
              <div className="space-y-2 sm:col-span-2">
                <Label htmlFor="addressLine2">Address Line 2</Label>
                <Input id="addressLine2" name="addressLine2" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input id="city" name="city" required />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input id="state" name="state" required maxLength={2} placeholder="OR" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="zipCode">ZIP Code</Label>
                <Input id="zipCode" name="zipCode" required />
              </div>
              <div className="space-y-2">
                <Label>Status</Label>
                <Select name="status" defaultValue="ACTIVE">
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {["ACTIVE", "INACTIVE", "UNDER_RENOVATION", "FOR_SALE"].map((s) => (
                      <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            {owners.length > 0 && (
              <div className="space-y-2">
                <Label>Owner</Label>
                <Select name="ownerId">
                  <SelectTrigger>
                    <SelectValue placeholder="Select owner (optional)" />
                  </SelectTrigger>
                  <SelectContent>
                    {owners.map((o) => (
                      <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-3">
              <div className="space-y-2">
                <Label htmlFor="bedrooms">Bedrooms</Label>
                <Input id="bedrooms" name="bedrooms" type="number" min={0} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="bathrooms">Bathrooms</Label>
                <Input id="bathrooms" name="bathrooms" type="number" min={0} step={0.5} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="squareFootage">Sq Ft</Label>
                <Input id="squareFootage" name="squareFootage" type="number" min={0} />
              </div>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="rentAmount">Rent Amount</Label>
                <Input id="rentAmount" name="rentAmount" type="number" min={0} step={0.01} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="securityDeposit">Security Deposit</Label>
                <Input id="securityDeposit" name="securityDeposit" type="number" min={0} step={0.01} />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="parking">Parking</Label>
              <Input id="parking" name="parking" placeholder="Covered garage, street, etc." />
            </div>

            <div className="space-y-2">
              <Label htmlFor="internalNotes">Internal Notes</Label>
              <Textarea id="internalNotes" name="internalNotes" rows={3} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Property
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
