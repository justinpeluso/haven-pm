"use client";

import { useState } from "react";
import { signIn } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Building2, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

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

    const partyEmails = new Set([
      "player1@havenpm.com",
      "player2@havenpm.com",
      "player3@havenpm.com",
    ]);
    const dest = partyEmails.has(email.trim().toLowerCase())
      ? "/downtown/neverworld"
      : "/dashboard";
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
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>
            {error && (
              <p className="text-sm text-destructive">{error}</p>
            )}
            <Button type="submit" className="w-full" disabled={loading}>
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Sign in
            </Button>
          </form>

          <div className="mt-6 space-y-3">
            <div className="rounded-lg border border-amber-500/40 bg-amber-500/10 p-4 text-xs">
              <p className="font-semibold mb-2 text-amber-900 dark:text-amber-100">
                Neverworld party logins (password: password67)
              </p>
              <ul className="space-y-2 text-muted-foreground">
                {[
                  { email: "player1@havenpm.com", label: "Justin — DM + Player 1" },
                  { email: "player2@havenpm.com", label: "Rusty — Player 2" },
                  { email: "player3@havenpm.com", label: "Elisha — Player 3" },
                ].map((p) => (
                  <li key={p.email} className="flex flex-wrap items-center gap-2">
                    <button
                      type="button"
                      className="rounded border border-amber-500/50 bg-background px-2 py-1 font-mono text-[0.7rem] hover:bg-amber-500/15"
                      onClick={() => {
                        setEmail(p.email);
                        setPassword("password67");
                        setError("");
                      }}
                    >
                      {p.email}
                    </button>
                    <span>{p.label}</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="rounded-lg bg-muted p-4 text-xs text-muted-foreground">
              <p className="font-medium mb-2">Haven PM demo (password: password123)</p>
              <ul className="space-y-1">
                <li>admin@havenpm.com — Alex (Administrator)</li>
                <li>justin@havenpm.com — Justin Peluso (Administrator)</li>
                <li>michelle@havenpm.com — Michelle Turcan (Administrator)</li>
                <li>manager@havenpm.com — Property Manager</li>
                <li>agent@havenpm.com / agent2@ / agent3@ — Agents</li>
                <li>maintenance@havenpm.com — Maintenance Staff</li>
                <li>office@havenpm.com — Office Staff</li>
                <li>tenant@havenpm.com … tenant10@ — Tenants</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
