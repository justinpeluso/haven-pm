"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProperty } from "@/lib/actions/properties";
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
import { Loader2, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface PropertyEditFormProps {
  property: {
    id: string;
    name: string;
    addressLine1: string;
    addressLine2: string | null;
    city: string;
    state: string;
    zipCode: string;
    status: string;
    ownerId: string | null;
    squareFootage: number | null;
    bedrooms: number | null;
    bathrooms: number | null;
    rentAmount: number | null;
    securityDeposit: number | null;
    parking: string | null;
    internalNotes: string | null;
  };
  owners: { id: string; name: string }[];
}

export function PropertyEditForm({ property, owners }: PropertyEditFormProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateProperty(property.id, formData);
    setLoading(false);

    if (result.error) {
      toast({ title: "Update failed", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Property updated" });
    setOpen(false);
    router.refresh();
  };

  if (!open) {
    return (
      <Button variant="outline" size="sm" onClick={() => setOpen(true)}>
        <Pencil className="mr-2 h-4 w-4" />
        Edit Property
      </Button>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Edit Property</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="name">Property Name</Label>
            <Input id="name" name="name" required defaultValue={property.name} />
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine1">Address</Label>
              <Input id="addressLine1" name="addressLine1" required defaultValue={property.addressLine1} />
            </div>
            <div className="space-y-2 sm:col-span-2">
              <Label htmlFor="addressLine2">Address Line 2</Label>
              <Input id="addressLine2" name="addressLine2" defaultValue={property.addressLine2 || ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input id="city" name="city" required defaultValue={property.city} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input id="state" name="state" required maxLength={2} defaultValue={property.state} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="zipCode">ZIP Code</Label>
              <Input id="zipCode" name="zipCode" required defaultValue={property.zipCode} />
            </div>
            <div className="space-y-2">
              <Label>Status</Label>
              <Select name="status" defaultValue={property.status}>
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
              <Select name="ownerId" defaultValue={property.ownerId || undefined}>
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
              <Input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={property.bedrooms ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="bathrooms">Bathrooms</Label>
              <Input id="bathrooms" name="bathrooms" type="number" min={0} step={0.5} defaultValue={property.bathrooms ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="squareFootage">Sq Ft</Label>
              <Input id="squareFootage" name="squareFootage" type="number" min={0} defaultValue={property.squareFootage ?? ""} />
            </div>
          </div>

          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor="rentAmount">Rent Amount</Label>
              <Input id="rentAmount" name="rentAmount" type="number" min={0} step={0.01} defaultValue={property.rentAmount ?? ""} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="securityDeposit">Security Deposit</Label>
              <Input id="securityDeposit" name="securityDeposit" type="number" min={0} step={0.01} defaultValue={property.securityDeposit ?? ""} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="parking">Parking</Label>
            <Input id="parking" name="parking" defaultValue={property.parking || ""} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalNotes">Internal Notes</Label>
            <Textarea id="internalNotes" name="internalNotes" rows={3} defaultValue={property.internalNotes || ""} />
          </div>

          <div className="flex gap-2">
            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
