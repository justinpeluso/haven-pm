"use client";

import { useEffect, useMemo, useState } from "react";
import {
  DOWNTOWN_PLACEHOLDER,
  proxiedDowntownMediaUrl,
} from "@/lib/downtown/media-proxy";

type Props = {
  src?: string | null;
  fallbackSrc?: string | null;
  alt: string;
  className?: string;
};

/**
 * Chains primary → optional fallback → placeholder.
 * Allowlisted remote https URLs go through `/api/downtown/media`.
 */
export function DowntownSafeImg({ src, fallbackSrc, alt, className }: Props) {
  const chain = useMemo(() => {
    const raw = [src, fallbackSrc, DOWNTOWN_PLACEHOLDER].filter(
      (u, i, arr): u is string => Boolean(u) && arr.indexOf(u) === i
    );
    return raw.map(proxiedDowntownMediaUrl).filter(
      (u, i, arr) => arr.indexOf(u) === i
    );
  }, [src, fallbackSrc]);

  const [idx, setIdx] = useState(0);

  useEffect(() => {
    setIdx(0);
  }, [chain.join("|")]);

  const current = chain[Math.min(idx, chain.length - 1)] || DOWNTOWN_PLACEHOLDER;

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={current}
      alt={alt}
      className={className}
      loading="lazy"
      decoding="async"
      referrerPolicy="no-referrer"
      onError={() => {
        if (idx < chain.length - 1) setIdx((i) => i + 1);
      }}
    />
  );
}
