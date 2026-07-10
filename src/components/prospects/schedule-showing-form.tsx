"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { scheduleShowing } from "@/lib/actions/prospects";
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
import { Loader2, Calendar } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ScheduleShowingFormProps {
  prospectId: string;
  properties: { id: string; name: string; units: { id: string; unitNumber: string }[] }[];
  agents: { id: string; name: string | null }[];
  defaultAgentId?: string;
}

export function ScheduleShowingForm({
  prospectId,
  properties,
  agents,
  defaultAgentId,
}: ScheduleShowingFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [propertyId, setPropertyId] = useState(properties[0]?.id || "");
  const selectedProperty = properties.find((p) => p.id === propertyId);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("prospectId", prospectId);
    if (propertyId) formData.set("propertyId", propertyId);

    const result = await scheduleShowing(formData);
    setLoading(false);

    if (result.error) {
      toast({ title: "Failed to schedule", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Showing scheduled", description: "Calendar event created and prospect updated." });
    router.refresh();
  };

  const defaultStart = new Date(Date.now() + 24 * 60 * 60 * 1000);
  defaultStart.setMinutes(0, 0, 0);
  const defaultStartStr = defaultStart.toISOString().slice(0, 16);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-base">
          <Calendar className="h-4 w-4" />
          Schedule Showing
        </CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="grid gap-4 sm:grid-cols-2">
          <div className="space-y-2">
            <Label>Property</Label>
            <Select value={propertyId} onValueChange={setPropertyId}>
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
              <Label>Unit (optional)</Label>
              <Select name="unitId">
                <SelectTrigger>
                  <SelectValue placeholder="Any unit" />
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
            <Label>Agent</Label>
            <Select name="agentId" defaultValue={defaultAgentId || agents[0]?.id} required>
              <SelectTrigger>
                <SelectValue placeholder="Select agent" />
              </SelectTrigger>
              <SelectContent>
                {agents.map((a) => (
                  <SelectItem key={a.id} value={a.id}>{a.name || "Unnamed"}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="scheduledAt">Date & Time</Label>
            <Input id="scheduledAt" name="scheduledAt" type="datetime-local" required defaultValue={defaultStartStr} />
          </div>

          <div className="space-y-2">
            <Label htmlFor="duration">Duration (minutes)</Label>
            <Input id="duration" name="duration" type="number" min={15} step={15} defaultValue={30} />
          </div>

          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="notes">Notes</Label>
            <Textarea id="notes" name="notes" rows={2} placeholder="Access instructions, parking, etc." />
          </div>

          <div className="sm:col-span-2">
            <Button type="submit" disabled={loading || !propertyId}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Schedule Showing
            </Button>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
