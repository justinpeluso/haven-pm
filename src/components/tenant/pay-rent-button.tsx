"use client";

import { useState } from "react";
import { CreditCard, ExternalLink, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatCurrency } from "@/lib/utils";

interface PayRentButtonProps {
  rentAmount?: number;
  provider: "external" | "stripe";
  externalUrl: string;
}

export function PayRentButton({ rentAmount, provider, externalUrl }: PayRentButtonProps) {
  const [loading, setLoading] = useState(false);

  const handleClick = async () => {
    if (provider === "external") {
      window.open(externalUrl, "_blank", "noopener,noreferrer");
      return;
    }

    setLoading(true);
    try {
      const res = await fetch("/api/payments/checkout", { method: "POST" });
      const data = await res.json();
      if (data.url) {
        window.location.href = data.url;
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <Button size="lg" onClick={handleClick} disabled={loading}>
      {loading ? (
        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
      ) : (
        <CreditCard className="mr-2 h-4 w-4" />
      )}
      Pay Rent
      {provider === "external" && <ExternalLink className="ml-2 h-3 w-3" />}
      {rentAmount && (
        <span className="ml-2 opacity-80">({formatCurrency(rentAmount)})</span>
      )}
    </Button>
  );
}
