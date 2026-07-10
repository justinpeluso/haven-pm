"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { updateProspectStatus } from "@/lib/actions/prospects";
import { createNote } from "@/lib/actions/shared";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const STATUSES = [
  "NEW", "CONTACTED", "SHOWING_SCHEDULED", "APPLICATION_SENT",
  "APPLICATION_RECEIVED", "APPROVED", "DENIED", "LEASED", "ARCHIVED",
] as const;

interface ProspectActionsProps {
  prospectId: string;
  currentStatus: string;
}

export function ProspectActions({ prospectId, currentStatus }: ProspectActionsProps) {
  const router = useRouter();
  const [status, setStatus] = useState(currentStatus);
  const [note, setNote] = useState("");
  const [savingStatus, setSavingStatus] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const handleStatusChange = async (newStatus: string) => {
    setStatus(newStatus);
    setSavingStatus(true);
    const result = await updateProspectStatus(prospectId, newStatus);
    setSavingStatus(false);
    if (result.error) {
      toast({ title: "Failed to update status", description: result.error, variant: "destructive" });
      setStatus(currentStatus);
      return;
    }
    toast({ title: "Status updated", description: `Pipeline stage set to ${newStatus.replace(/_/g, " ")}` });
    router.refresh();
  };

  const handleAddNote = async () => {
    if (!note.trim()) return;
    setSavingNote(true);
    const formData = new FormData();
    formData.set("content", note);
    formData.set("prospectId", prospectId);
    const result = await createNote(formData);
    setSavingNote(false);
    if (result.error) {
      toast({ title: "Failed to add note", description: result.error, variant: "destructive" });
      return;
    }
    toast({ title: "Note added" });
    setNote("");
    router.refresh();
  };

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Pipeline Status</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="space-y-2">
            <Label>Current stage</Label>
            <Select value={status} onValueChange={handleStatusChange} disabled={savingStatus}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {STATUSES.map((s) => (
                  <SelectItem key={s} value={s}>{s.replace(/_/g, " ")}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          {savingStatus && (
            <p className="flex items-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-3 w-3 animate-spin" /> Saving...
            </p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Add Note</CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <Textarea
            value={note}
            onChange={(e) => setNote(e.target.value)}
            rows={3}
            placeholder="Call summary, preferences, follow-up..."
          />
          <Button onClick={handleAddNote} disabled={savingNote || !note.trim()} size="sm">
            {savingNote && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            Save Note
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
