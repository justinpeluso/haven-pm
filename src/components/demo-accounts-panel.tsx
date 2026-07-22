"use client";

import { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type DemoAccount = { email: string; label: string };

type Payload = {
  password: string;
  pm: DemoAccount[];
  party: DemoAccount[];
  tenants?: DemoAccount[];
};

export function DemoAccountsPanel({
  compact = false,
}: {
  /** Tighter styling for embedding under the game shell. */
  compact?: boolean;
}) {
  const router = useRouter();
  const [data, setData] = useState<Payload | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [open, setOpen] = useState(false);
  const [switching, setSwitching] = useState<string | null>(null);

  useEffect(() => {
    if (!open || data) return;
    let cancelled = false;
    void (async () => {
      try {
        const res = await fetch("/api/demo-accounts");
        if (!res.ok) {
          if (!cancelled) setError("Demo accounts are only available to player 1 / admins.");
          return;
        }
        const json = (await res.json()) as Payload;
        if (!cancelled) setData(json);
      } catch {
        if (!cancelled) setError("Could not load demo accounts.");
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, data]);

  const switchTo = async (accountEmail: string) => {
    if (!data) return;
    setSwitching(accountEmail);
    setError(null);
    try {
      const result = await signIn("credentials", {
        email: accountEmail,
        password: data.password,
        redirect: false,
      });
      if (result?.error) {
        setError("Switch failed — check that account is seeded.");
        return;
      }
      const home = await fetch("/api/demo-accounts", { method: "POST" });
      const { path } = (await home.json()) as { path?: string };
      router.push(path ?? "/dashboard");
      router.refresh();
    } finally {
      setSwitching(null);
    }
  };

  const shell = compact
    ? "rounded-lg border border-amber-500/40 bg-amber-500/10 p-3 text-xs"
    : "rounded-lg border bg-card p-4 text-sm shadow-sm";

  return (
    <div className={shell}>
      <button
        type="button"
        className="flex w-full items-center justify-between font-semibold"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
      >
        <span>Demo / party accounts</span>
        <span className="text-[0.7rem] font-normal opacity-70">{open ? "Hide" : "Show"}</span>
      </button>
      {open ? (
        <div className="mt-3 space-y-4">
          {error ? <p className="text-destructive">{error}</p> : null}
          {!data && !error ? (
            <p className="flex items-center gap-2 text-muted-foreground">
              <Loader2 className="h-3.5 w-3.5 animate-spin" /> Loading…
            </p>
          ) : null}
          {data ? (
            <>
              <AccountList
                title="Haven PM"
                accounts={data.pm}
                switching={switching}
                onSwitch={switchTo}
              />
              <AccountList
                title="Tenant portal"
                accounts={data.tenants ?? []}
                switching={switching}
                onSwitch={switchTo}
              />
              <AccountList
                title="Dungeons and Dogs"
                accounts={data.party}
                switching={switching}
                onSwitch={switchTo}
              />
            </>
          ) : null}
        </div>
      ) : null}
    </div>
  );
}

function AccountList({
  title,
  accounts,
  switching,
  onSwitch,
}: {
  title: string;
  accounts: DemoAccount[];
  switching: string | null;
  onSwitch: (email: string) => void;
}) {
  return (
    <div>
      <p className="mb-2 text-[0.7rem] font-medium uppercase tracking-wide text-muted-foreground">
        {title}
      </p>
      <ul className="space-y-2">
        {accounts.map((a) => (
          <li key={a.email} className="flex flex-wrap items-center gap-2">
            <Button
              type="button"
              size="sm"
              variant="outline"
              className="h-7 font-mono text-[0.7rem]"
              disabled={!!switching}
              onClick={() => onSwitch(a.email)}
            >
              {switching === a.email ? (
                <Loader2 className="mr-1 h-3 w-3 animate-spin" />
              ) : null}
              {a.email}
            </Button>
            <span className="text-muted-foreground">{a.label}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
