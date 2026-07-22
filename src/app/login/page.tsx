"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, Eye, EyeOff, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

type DemoAccount = { email: string; label: string };

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [pmOpen, setPmOpen] = useState(false);
  const [partyOpen, setPartyOpen] = useState(false);
  const [pmAccounts, setPmAccounts] = useState<DemoAccount[] | null>(null);
  const [partyAccounts, setPartyAccounts] = useState<DemoAccount[] | null>(null);
  const [demoPassword, setDemoPassword] = useState<string | null>(null);
  const [revealing, setRevealing] = useState<"pm" | "party" | null>(null);

  const loadDemoAccounts = async () => {
    const mod = await import("./demo-accounts");
    setPmAccounts([...mod.PM_ACCOUNTS]);
    setPartyAccounts([...mod.PARTY_ACCOUNTS]);
    setDemoPassword(mod.DEMO_PASSWORD);
    return mod;
  };

  const revealPm = async () => {
    if (pmOpen) {
      setPmOpen(false);
      return;
    }
    setRevealing("pm");
    try {
      if (!pmAccounts) await loadDemoAccounts();
      setPmOpen(true);
    } finally {
      setRevealing(null);
    }
  };

  const revealParty = async () => {
    if (partyOpen) {
      setPartyOpen(false);
      return;
    }
    setRevealing("party");
    try {
      if (!partyAccounts) await loadDemoAccounts();
      setPartyOpen(true);
    } finally {
      setRevealing(null);
    }
  };

  const fillAccount = (accountEmail: string) => {
    setEmail(accountEmail);
    if (demoPassword) setPassword(demoPassword);
    setError("");
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const result = await signIn("credentials", {
      email,
      password,
      redirect: false,
    });

    setLoading(false);

    if (result?.error) {
      setError("Invalid email or password");
      return;
    }

    const { isPartyLoginEmail } = await import("./demo-accounts");
    const dest = isPartyLoginEmail(email) ? "/true-grit" : "/dashboard";
    router.push(dest);
    router.refresh();
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-muted/30 p-4">
      <Card className="w-full max-w-md">
        <CardHeader className="text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-primary text-primary-foreground">
            <Building2 className="h-6 w-6" />
          </div>
          <CardTitle className="text-2xl">Welcome to Haven PM</CardTitle>
          <CardDescription>Sign in to your property management account</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="you@company.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  autoComplete="current-password"
                  className="pr-10"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 flex items-center px-3 text-muted-foreground hover:text-foreground"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  aria-pressed={showPassword}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" aria-hidden />
                  ) : (
                    <Eye className="h-4 w-4" aria-hidden />
                  )}
                </button>
              </div>
            </div>
            {error && <p className="text-sm text-destructive">{error}</p>}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">
              <button
                type="button"
                className="mb-0 flex w-full items-center justify-between font-medium text-foreground"
                onClick={() => void revealPm()}
                aria-expanded={pmOpen}
                disabled={revealing === "pm"}
              >
                <span>Haven PM demo accounts</span>
                <span className="text-[0.65rem] font-normal opacity-80">
                  {revealing === "pm" ? "…" : pmOpen ? "Hide" : "Show"}
                </span>
              </button>
              {pmOpen && pmAccounts ? (
                <ul className="mt-3 space-y-2">
                  {pmAccounts.map((p) => (
                    <li key={p.email} className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded border bg-background px-2 py-1 font-mono text-[0.7rem] hover:bg-accent"
                        onClick={() => fillAccount(p.email)}
                      >
                        {p.email}
                      </button>
                      <span>{p.label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>

            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs">
              <button
                type="button"
                className="mb-0 flex w-full items-center justify-between font-semibold text-amber-900 dark:text-amber-100"
                onClick={() => void revealParty()}
                aria-expanded={partyOpen}
                disabled={revealing === "party"}
              >
                <span>Dungeons and Dogs party logins</span>
                <span className="text-[0.65rem] font-normal opacity-80">
                  {revealing === "party" ? "…" : partyOpen ? "Hide" : "Show"}
                </span>
              </button>
              {partyOpen && partyAccounts ? (
                <ul className="mt-3 space-y-2 text-muted-foreground">
                  {partyAccounts.map((p) => (
                    <li key={p.email} className="flex flex-wrap items-center gap-2">
                      <button
                        type="button"
                        className="rounded border border-amber-500/50 bg-background px-2 py-1 font-mono text-[0.7rem] hover:bg-amber-500/15"
                        onClick={() => fillAccount(p.email)}
                      >
                        {p.email}
                      </button>
                      <span>{p.label}</span>
                    </li>
                  ))}
                </ul>
              ) : null}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
