"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createUnit, updateUnit } from "@/lib/actions/properties";
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
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Loader2, Plus, Pencil } from "lucide-react";
import { toast } from "@/hooks/use-toast";
import { formatCurrency } from "@/lib/utils";
import { Badge } from "@/components/ui/badge";

const UNIT_STATUSES = ["AVAILABLE", "OCCUPIED", "NOTICE_GIVEN", "VACANT", "MAINTENANCE_HOLD"] as const;

interface UnitItem {
  id: string;
  unitNumber: string;
  status: string;
  rentAmount: unknown;
  bedrooms: number | null;
  bathrooms: number | null;
  tenantName?: string | null;
}

interface UnitsManagerProps {
  propertyId: string;
  units: UnitItem[];
  canWrite: boolean;
}

export function UnitsManager({ propertyId, units, canWrite }: UnitsManagerProps) {
  const router = useRouter();
  const [addOpen, setAddOpen] = useState(false);
  const [editUnit, setEditUnit] = useState<UnitItem | null>(null);
  const [loading, setLoading] = useState(false);

  const handleAdd = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("propertyId", propertyId);
    const result = await createUnit(formData);
    setLoading(false);

    if (result.error) {
      toast({ title: "Failed to add unit", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Unit added" });
    setAddOpen(false);
    router.refresh();
  };

  const handleEdit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!editUnit) return;
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const result = await updateUnit(editUnit.id, formData);
    setLoading(false);

    if (result.error) {
      toast({ title: "Failed to update unit", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Unit updated" });
    setEditUnit(null);
    router.refresh();
  };

  return (
    <div className="space-y-4">
      {canWrite && (
        <Dialog open={addOpen} onOpenChange={setAddOpen}>
          <DialogTrigger asChild>
            <Button size="sm">
              <Plus className="mr-2 h-4 w-4" />
              Add Unit
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Unit</DialogTitle>
            </DialogHeader>
            <form onSubmit={handleAdd} className="space-y-4">
              <UnitFields />
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Add Unit
              </Button>
            </form>
          </DialogContent>
        </Dialog>
      )}

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
        {units.map((unit) => (
          <Card key={unit.id}>
            <CardHeader className="pb-2">
              <div className="flex items-center justify-between">
                <CardTitle className="text-sm">Unit {unit.unitNumber}</CardTitle>
                <div className="flex items-center gap-1">
                  <Badge variant="outline">{unit.status}</Badge>
                  {canWrite && (
                    <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setEditUnit(unit)}>
                      <Pencil className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm">
              <p>{formatCurrency(Number(unit.rentAmount))}/mo</p>
              {unit.bedrooms != null && <p>{unit.bedrooms} bed · {unit.bathrooms} bath</p>}
              {unit.tenantName && <p className="text-muted-foreground">Tenant: {unit.tenantName}</p>}
            </CardContent>
          </Card>
        ))}
      </div>

      <Dialog open={!!editUnit} onOpenChange={(open) => !open && setEditUnit(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Unit {editUnit?.unitNumber}</DialogTitle>
          </DialogHeader>
          {editUnit && (
            <form onSubmit={handleEdit} className="space-y-4">
              <UnitFields unit={editUnit} />
              <Button type="submit" disabled={loading} className="w-full">
                {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                Save Unit
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}

function UnitFields({ unit }: { unit?: UnitItem }) {
  return (
    <>
      <div className="space-y-2">
        <Label htmlFor="unitNumber">Unit Number</Label>
        <Input id="unitNumber" name="unitNumber" required defaultValue={unit?.unitNumber} placeholder="101" />
      </div>
      <div className="space-y-2">
        <Label>Status</Label>
        <Select name="status" defaultValue={unit?.status || "AVAILABLE"}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {UNIT_STATUSES.map((s) => (
              <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="bedrooms">Bedrooms</Label>
          <Input id="bedrooms" name="bedrooms" type="number" min={0} defaultValue={unit?.bedrooms ?? ""} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="bathrooms">Bathrooms</Label>
          <Input id="bathrooms" name="bathrooms" type="number" min={0} step={0.5} defaultValue={unit?.bathrooms ?? ""} />
        </div>
      </div>
      <div className="space-y-2">
        <Label htmlFor="rentAmount">Rent Amount</Label>
        <Input id="rentAmount" name="rentAmount" type="number" min={0} step={0.01} required defaultValue={unit ? Number(unit.rentAmount) : ""} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="depositAmount">Deposit</Label>
        <Input id="depositAmount" name="depositAmount" type="number" min={0} step={0.01} />
      </div>
    </>
  );
}
