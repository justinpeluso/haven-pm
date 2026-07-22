"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { submitTenantPortalMessage } from "@/lib/actions/messages";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Loader2 } from "lucide-react";
import { toast } from "@/hooks/use-toast";

const TYPES = [
  { value: "GENERAL", label: "General question" },
  { value: "BILLING", label: "Billing / rent" },
  { value: "MAINTENANCE", label: "Maintenance (non-emergency)" },
  { value: "LEASE", label: "Lease / move" },
  { value: "NOISE", label: "Noise / neighbor" },
  { value: "OTHER", label: "Other" },
] as const;

const PRIORITIES = [
  { value: "LOW", label: "Low" },
  { value: "MEDIUM", label: "Medium" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
] as const;

export function TenantPortalMessageForm({
  defaultPhone = "",
}: {
  defaultPhone?: string;
}) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [type, setType] = useState<string>("GENERAL");
  const [priority, setPriority] = useState<string>("MEDIUM");
  const [phone, setPhone] = useState(defaultPhone);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    const form = e.currentTarget;
    const formData = new FormData(form);
    formData.set("type", type);
    formData.set("priority", priority);
    formData.set("callbackPhone", phone.trim());

    const result = await submitTenantPortalMessage(formData);
    setLoading(false);

    if (result.error) {
      toast({
        title: "Could not send",
        description: result.error,
        variant: "destructive",
      });
      return;
    }

    toast({
      title: "Message sent",
      description: "The office will see it in the Messages inbox.",
    });
    form.reset();
    setType("GENERAL");
    setPriority("MEDIUM");
    setPhone(phone.trim() || defaultPhone);
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Contact the office</CardTitle>
        <CardDescription>
          Send a message to property managers and agents. Include a phone number
          so we can reach you.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label>Type</Label>
              <Select value={type} onValueChange={setType} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPES.map((t) => (
                    <SelectItem key={t.value} value={t.value}>
                      {t.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Priority</Label>
              <Select value={priority} onValueChange={setPriority} required>
                <SelectTrigger>
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITIES.map((p) => (
                    <SelectItem key={p.value} value={p.value}>
                      {p.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="callbackPhone">Phone number</Label>
            <Input
              id="callbackPhone"
              name="callbackPhone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              placeholder="(412) 555-0100"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              required
            />
            <p className="text-xs text-muted-foreground">
              We’ll use this to call or text you back about this message.
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject (optional)</Label>
            <Input
              id="subject"
              name="subject"
              placeholder="Short summary"
              maxLength={200}
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Description</Label>
            <Textarea
              id="body"
              name="body"
              required
              rows={5}
              placeholder="What do you need help with?"
              maxLength={5000}
            />
          </div>

          <Button type="submit" disabled={loading} className="w-full sm:w-auto">
            {loading ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Sending…
              </>
            ) : (
              "Send message"
            )}
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
