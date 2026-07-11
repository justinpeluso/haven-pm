"use client";

import type { MouseEvent } from "react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhone, openPhoneMessageHref } from "@/lib/phone";

export function PhoneLink({
  phone,
  fromNumber,
  className,
  showIcon = true,
  label,
}: {
  phone: string | null | undefined;
  /** Your OpenPhone / Quo business number (optional but preferred) */
  fromNumber?: string | null;
  className?: string;
  showIcon?: boolean;
  label?: string;
}) {
  if (!phone?.trim()) return null;

  const href = openPhoneMessageHref(phone, fromNumber);
  const display = label || formatPhone(phone);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.stopPropagation();
  }

  return (
    <a
      href={href}
      onClick={handleClick}
      title={`Text ${display} in OpenPhone`}
      className={cn(
        "inline-flex items-center gap-1.5 font-medium text-primary underline-offset-2 hover:underline",
        className
      )}
    >
      {showIcon && <Phone className="h-3.5 w-3.5 shrink-0" />}
      <span>{display}</span>
    </a>
  );
}
