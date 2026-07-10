"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { sendMessage } from "@/lib/actions/shared";
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
import { Loader2, Send } from "lucide-react";
import { toast } from "@/hooks/use-toast";

interface ComposeFormProps {
  users: { id: string; name: string | null; email: string }[];
}

export function ComposeForm({ users }: ComposeFormProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [receiverId, setReceiverId] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!receiverId) return;

    setLoading(true);
    const formData = new FormData(e.currentTarget);
    formData.set("receiverId", receiverId);

    const result = await sendMessage(formData);
    setLoading(false);

    if (result.error) {
      toast({ title: "Failed to send", description: result.error, variant: "destructive" });
      return;
    }

    toast({ title: "Message sent" });
    setReceiverId("");
    (e.target as HTMLFormElement).reset();
    router.refresh();
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Compose Message</CardTitle>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <Label>To</Label>
            <Select value={receiverId} onValueChange={setReceiverId} required>
              <SelectTrigger>
                <SelectValue placeholder="Select recipient" />
              </SelectTrigger>
              <SelectContent>
                {users.map((u) => (
                  <SelectItem key={u.id} value={u.id}>
                    {u.name || u.email}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label htmlFor="subject">Subject</Label>
            <Input id="subject" name="subject" placeholder="Optional subject" />
          </div>

          <div className="space-y-2">
            <Label htmlFor="body">Message</Label>
            <Textarea id="body" name="body" required rows={4} placeholder="Write your message..." />
          </div>

          <Button type="submit" disabled={loading || !receiverId}>
            {loading ? (
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Send className="mr-2 h-4 w-4" />
            )}
            Send
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}
