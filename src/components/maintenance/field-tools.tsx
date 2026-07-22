"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  scheduleMaintenanceVisit,
  uploadMaintenancePhoto,
} from "@/lib/actions/maintenance";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

export function MaintenancePhotoUpload({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);

  return (
    <form
      className="space-y-3"
      onSubmit={async (e) => {
        e.preventDefault();
        setPending(true);
        const result = await uploadMaintenancePhoto(
          requestId,
          new FormData(e.currentTarget)
        );
        setPending(false);
        if (result.error) {
          toast({ title: "Upload failed", description: result.error, variant: "destructive" });
          return;
        }
        toast({ title: "Photo uploaded" });
        e.currentTarget.reset();
        router.refresh();
      }}
    >
      <div className="space-y-1">
        <Label htmlFor="photo-file">Photo</Label>
        <Input id="photo-file" name="file" type="file" accept="image/*" required />
      </div>
      <div className="space-y-1">
        <Label htmlFor="photo-caption">Caption</Label>
        <Input id="photo-caption" name="caption" placeholder="Optional" />
      </div>
      <Button type="submit" size="sm" disabled={pending}>
        {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
        Upload photo
      </Button>
    </form>
  );
}

export function MaintenanceScheduleForm({ requestId }: { requestId: string }) {
  const router = useRouter();
  const [pending, setPending] = useState(false);
  const defaultStart = new Date();
  defaultStart.setHours(defaultStart.getHours() + 24, 0, 0, 0);
  const defaultEnd = new Date(defaultStart.getTime() + 2 * 60 * 60 * 1000);

  const toLocal = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Schedule visit</CardTitle>
      </CardHeader>
      <CardContent>
        <form
          className="space-y-3"
          onSubmit={async (e) => {
            e.preventDefault();
            setPending(true);
            const result = await scheduleMaintenanceVisit(
              requestId,
              new FormData(e.currentTarget)
            );
            setPending(false);
            if (result.error) {
              toast({
                title: "Schedule failed",
                description: result.error,
                variant: "destructive",
              });
              return;
            }
            toast({ title: "Visit scheduled" });
            router.refresh();
          }}
        >
          <div className="space-y-1">
            <Label htmlFor="startAt">Start</Label>
            <Input
              id="startAt"
              name="startAt"
              type="datetime-local"
              defaultValue={toLocal(defaultStart)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="endAt">End</Label>
            <Input
              id="endAt"
              name="endAt"
              type="datetime-local"
              defaultValue={toLocal(defaultEnd)}
              required
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="sched-notes">Notes for tenant</Label>
            <Textarea id="sched-notes" name="notes" rows={2} />
          </div>
          <Button type="submit" size="sm" className="w-full" disabled={pending}>
            {pending ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}
            Schedule & notify tenant
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
