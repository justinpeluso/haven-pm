"use client";

import type { MouseEvent } from "react";
import { Phone } from "lucide-react";
import { cn } from "@/lib/utils";
import { formatPhone, openPhoneInboxHref } from "@/lib/phone";

export function PhoneLink({
  phone,
  inboxUrl,
  className,
  showIcon = true,
  label,
}: {
  phone: string | null | undefined;
  /** OpenPhone / Quo inbox URL (Settings → SMS portal) */
  inboxUrl?: string | null;
  className?: string;
  showIcon?: boolean;
  label?: string;
}) {
  if (!phone?.trim()) return null;

  const href = openPhoneInboxHref(inboxUrl);
  const display = label || formatPhone(phone);

  function handleClick(e: MouseEvent<HTMLAnchorElement>) {
    e.stopPropagation();
  }

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      onClick={handleClick}
      title={`Open OpenPhone inbox to text ${display}`}
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
