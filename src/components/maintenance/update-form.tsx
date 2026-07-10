"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateMaintenanceRequest } from "@/lib/actions/maintenance";
import { Button } from "@/components/ui/button";
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
import { Input } from "@/components/ui/input";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface MaintenanceUpdateFormProps {
  requestId: string;
  currentStatus: string;
  currentPriority: string;
  assignedStaffId: string | null;
  staff: { id: string; name: string | null }[];
}

export function MaintenanceUpdateForm({
  requestId,
  currentStatus,
  currentPriority,
  assignedStaffId,
  staff,
}: MaintenanceUpdateFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState(currentStatus);
  const [priority, setPriority] = useState(currentPriority);
  const [staffId, setStaffId] = useState(assignedStaffId || "");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);

    const formData = new FormData(e.currentTarget);
    formData.set("status", status);
    formData.set("priority", priority);
    if (staffId) formData.set("assignedStaffId", staffId);

    const result = await updateMaintenanceRequest(requestId, formData);
    setLoading(false);
    if (result.error) {
      toast({ title: "Update failed", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Changes saved" });
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Update Request</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>Status</Label>
            <Select value={status} onValueChange={setStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {["SUBMITTED", "ASSIGNED", "SCHEDULED", "IN_PROGRESS", "WAITING_ON_PARTS", "COMPLETED", "CLOSED"].map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Priority</Label>
            <Select value={priority} onValueChange={setPriority}>
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
            <Label>Assign To</Label>
            <Select value={staffId} onValueChange={setStaffId}>
              <SelectTrigger>
                <SelectValue placeholder="Select staff" />
              </SelectTrigger>
              <SelectContent>
                {staff.map((s) => (
                  <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="vendor">Vendor</Label>
            <Input id="vendor" name="vendor" placeholder="Vendor name" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="cost">Cost</Label>
            <Input id="cost" name="cost" type="number" step="0.01" placeholder="0.00" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="targetCompletion">Target Completion</Label>
            <Input id="targetCompletion" name="targetCompletion" type="date" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="internalNotes">Internal Notes</Label>
            <Textarea id="internalNotes" name="internalNotes" rows={3} />
          </div>

          <Button type="submit" className="w-full" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Changes
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
