"use client";

import { useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { Loader2, Trash2 } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { updateCalendarEvent, deleteCalendarEvent } from "@/lib/actions/calendar";
import type { CalendarEventItem } from "@/components/calendar/calendar-view";

const TYPE_COLORS: Record<string, string> = {
  SHOWING: "#3b82f6",
  MAINTENANCE: "#f97316",
  INSPECTION: "#8b5cf6",
  MOVE_IN: "#22c55e",
  MOVE_OUT: "#ef4444",
  STAFF_EVENT: "#6b7280",
  OTHER: "#9ca3af",
};

const EVENT_TYPES = [
  "SHOWING", "MAINTENANCE", "INSPECTION", "MOVE_IN", "MOVE_OUT", "STAFF_EVENT", "OTHER",
] as const;

interface EventDetailDialogProps {
  event: CalendarEventItem | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (event: CalendarEventItem) => void;
  onDeleted: (eventId: string) => void;
  properties: { id: string; name: string }[];
  staff: { id: string; name: string | null }[];
  canEdit: boolean;
}

function toLocalDatetimeValue(iso: string) {
  const d = parseISO(iso);
  const offset = d.getTimezoneOffset();
  const local = new Date(d.getTime() - offset * 60000);
  return local.toISOString().slice(0, 16);
}

export function EventDetailDialog({
  event,
  open,
  onOpenChange,
  onUpdated,
  onDeleted,
  properties,
  staff,
  canEdit,
}: EventDetailDialogProps) {
  const [loading, setLoading] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState("");

  const [title, setTitle] = useState("");
  const [type, setType] = useState<string>("SHOWING");
  const [propertyId, setPropertyId] = useState<string>("");
  const [assigneeId, setAssigneeId] = useState<string>("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [notes, setNotes] = useState("");
  const [recurrence, setRecurrence] = useState("NONE");

  useEffect(() => {
    if (!event) return;
    setTitle(event.title);
    setType(event.type);
    setPropertyId(event.propertyId || "");
    setAssigneeId(event.assigneeId || "");
    setStartAt(toLocalDatetimeValue(event.startAt));
    setEndAt(toLocalDatetimeValue(event.endAt));
    setNotes(event.notes || "");
    setRecurrence(event.recurrence || "NONE");
    setError("");
  }, [event]);

  if (!event) return null;

  const color = event.color || TYPE_COLORS[event.type] || TYPE_COLORS.OTHER;

  const handleSave = async () => {
    setLoading(true);
    setError("");

    const result = await updateCalendarEvent(event.id, {
      title,
      type,
      propertyId: propertyId || null,
      assigneeId: assigneeId || null,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      notes: notes || null,
      recurrence,
      color: TYPE_COLORS[type] || color,
    });

    setLoading(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    const property = properties.find((p) => p.id === propertyId);
    const assignee = staff.find((s) => s.id === assigneeId);

    onUpdated({
      ...event,
      title,
      type,
      propertyId: propertyId || undefined,
      assigneeId: assigneeId || undefined,
      startAt: new Date(startAt).toISOString(),
      endAt: new Date(endAt).toISOString(),
      notes: notes || null,
      recurrence,
      color: TYPE_COLORS[type] || color,
      property: property ? { name: property.name } : null,
      assignee: assignee ? { name: assignee.name } : null,
    });

    onOpenChange(false);
  };

  const handleDelete = async () => {
    if (!confirm("Delete this event?")) return;
    setDeleting(true);
    const result = await deleteCalendarEvent(event.id);
    setDeleting(false);
    if (result.error) {
      setError(result.error);
      return;
    }
    onDeleted(event.id);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md sm:max-w-lg">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div
              className="h-3 w-3 rounded-full shrink-0"
              style={{ backgroundColor: color }}
            />
            <DialogTitle className="text-left">
              {canEdit ? "Edit Event" : "Event Details"}
            </DialogTitle>
          </div>
          {!canEdit && (
            <Badge variant="outline" className="w-fit">
              {event.type.replace(/_/g, " ")}
            </Badge>
          )}
        </DialogHeader>

        {canEdit ? (
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="evt-title">Title</Label>
              <Input
                id="evt-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
              />
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label>Type</Label>
                <Select value={type} onValueChange={setType}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {EVENT_TYPES.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t.replace(/_/g, " ")}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Recurrence</Label>
                <Select value={recurrence} onValueChange={setRecurrence}>
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
            </div>

            <div className="space-y-2">
              <Label>Property</Label>
              <Select
                value={propertyId || "none"}
                onValueChange={(v) => setPropertyId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select property" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">None</SelectItem>
                  {properties.map((p) => (
                    <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Assigned To</Label>
              <Select
                value={assigneeId || "none"}
                onValueChange={(v) => setAssigneeId(v === "none" ? "" : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select staff" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">Unassigned</SelectItem>
                  {staff.map((s) => (
                    <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="evt-start">Start</Label>
                <Input
                  id="evt-start"
                  type="datetime-local"
                  value={startAt}
                  onChange={(e) => setStartAt(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="evt-end">End</Label>
                <Input
                  id="evt-end"
                  type="datetime-local"
                  value={endAt}
                  onChange={(e) => setEndAt(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="evt-notes">Notes</Label>
              <Textarea
                id="evt-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={3}
                placeholder="Additional details..."
              />
            </div>

            {error && <p className="text-sm text-destructive">{error}</p>}
          </div>
        ) : (
          <div className="space-y-3 py-2 text-sm">
            <div>
              <p className="font-medium text-base">{event.title}</p>
              <p className="text-muted-foreground">{event.type.replace(/_/g, " ")}</p>
            </div>
            <div className="grid gap-2">
              <p>
                <span className="text-muted-foreground">When: </span>
                {format(parseISO(event.startAt), "EEE, MMM d · h:mm a")}
                {" – "}
                {format(parseISO(event.endAt), "h:mm a")}
              </p>
              {event.property && (
                <p>
                  <span className="text-muted-foreground">Property: </span>
                  {event.property.name}
                  {event.unit && ` · Unit ${event.unit.unitNumber}`}
                </p>
              )}
              {event.assignee?.name && (
                <p>
                  <span className="text-muted-foreground">Assigned: </span>
                  {event.assignee.name}
                </p>
              )}
              {event.notes && (
                <p>
                  <span className="text-muted-foreground">Notes: </span>
                  {event.notes}
                </p>
              )}
            </div>
          </div>
        )}

        <DialogFooter className="gap-2 sm:gap-0">
          {canEdit && (
            <Button
              type="button"
              variant="destructive"
              size="sm"
              onClick={handleDelete}
              disabled={deleting || loading}
              className="mr-auto"
            >
              {deleting ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Trash2 className="h-4 w-4" />
              )}
            </Button>
          )}
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            {canEdit ? "Cancel" : "Close"}
          </Button>
          {canEdit && (
            <Button onClick={handleSave} disabled={loading || deleting}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Changes
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
