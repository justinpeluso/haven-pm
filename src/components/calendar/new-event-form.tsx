"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createCalendarEvent } from "@/lib/actions/shared";
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

interface NewEventFormProps {
  properties: { id: string; name: string }[];
  staff: { id: string; name: string | null }[];
}

export function NewEventForm({ properties, staff }: NewEventFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const result = await createCalendarEvent(formData);

    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }

    router.push("/calendar");
  };

  const now = new Date();
  const defaultStart = new Date(now.getTime() + 24 * 60 * 60 * 1000);
  defaultStart.setMinutes(0, 0, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 60 * 60 * 1000);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <Breadcrumbs
          items={[
            { label: "Calendar", href: "/calendar" },
            { label: "New Event" },
          ]}
        />
        <h1 className="mt-2 text-2xl font-bold">Schedule Event</h1>
      </div>

      <Card>
        <CardContent className="pt-6">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="title">Title</Label>
              <Input id="title" name="title" required />
            </div>

            <div className="space-y-2">
              <Label>Event Type</Label>
              <Select name="type" defaultValue="SHOWING" required>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["SHOWING", "MAINTENANCE", "INSPECTION", "MOVE_IN", "MOVE_OUT", "STAFF_EVENT", "OTHER"].map((t) => (
                    <SelectItem key={t} value={t}>{t.replace(/_/g, " ")}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Property</Label>
              <Select name="propertyId">
                <SelectTrigger>
                  <SelectValue placeholder="Optional" />
                </SelectTrigger>
                <SelectContent>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assign To</Label>
              <Select name="assigneeId">
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

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="startAt">Start</Label>
                <Input
                  id="startAt"
                  name="startAt"
                  type="datetime-local"
                  required
                  defaultValue={defaultStart.toISOString().slice(0, 16)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="endAt">End</Label>
                <Input
                  id="endAt"
                  name="endAt"
                  type="datetime-local"
                  required
                  defaultValue={defaultEnd.toISOString().slice(0, 16)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Recurrence</Label>
              <Select name="recurrence" defaultValue="NONE">
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {["NONE", "DAILY", "WEEKLY", "MONTHLY"].map((r) => (
                    <SelectItem key={r} value={r}>{r}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="notes">Notes</Label>
              <Textarea id="notes" name="notes" rows={2} />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}

            <Button type="submit" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Create Event
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
