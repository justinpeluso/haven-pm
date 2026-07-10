"use client";

import { useSearchParams } from "next/navigation";
import { AlertCircle, X } from "lucide-react";
import { useState } from "react";
import { Button } from "@/components/ui/button";

export function PageAlerts() {
  const searchParams = useSearchParams();
  const [dismissed, setDismissed] = useState(false);
  const error = searchParams.get("error");

  if (dismissed || !error) return null;

  const messages: Record<string, string> = {
    unauthorized: "You don't have permission to access that page.",
  };

  return (
    <div className="mb-6 flex items-start gap-3 rounded-lg border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm">
      <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
      <p className="flex-1 text-destructive">
        {messages[error] || "An error occurred."}
      </p>
      <Button
        variant="ghost"
        size="icon"
        className="h-6 w-6 shrink-0"
        onClick={() => setDismissed(true)}
      >
        <X className="h-4 w-4" />
      </Button>
    </div>
  );
}
