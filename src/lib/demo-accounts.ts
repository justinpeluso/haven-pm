import { UserRole } from "@prisma/client";

/** Demo logins — only exposed via authenticated API to player1 / admins. */

export const DEMO_PASSWORD = "Chomps123";

export const PM_ACCOUNTS = [
  { email: "justin@havenpm.com", label: "Justin Peluso (Administrator)" },
  { email: "admin@havenpm.com", label: "Alex (Administrator)" },
  { email: "michelle@havenpm.com", label: "Michelle Turcan (Administrator)" },
  { email: "manager@havenpm.com", label: "Property Manager" },
  { email: "agent@havenpm.com", label: "Leasing Agent" },
  { email: "maintenance@havenpm.com", label: "Maintenance Staff" },
  { email: "office@havenpm.com", label: "Office Staff" },
] as const;

export const PARTY_ACCOUNTS = [
  { email: "player1@havenpm.com", label: "Justin — DM + Player 1" },
  { email: "player2@havenpm.com", label: "Rusty — Player 2" },
  { email: "player3@havenpm.com", label: "Elisha — Player 3" },
  { email: "player4@havenpm.com", label: "Eric Prendergast — Player 4" },
  { email: "player5@havenpm.com", label: "Dad — Player 5" },
] as const;

export const TENANT_PORTAL_ACCOUNTS = [
  { email: "portal@havenpm.com", label: "Demo Tenant — portal play login" },
  { email: "tenant@havenpm.com", label: "Sample Tenant" },
] as const;

const PARTY_EMAILS = new Set<string>([
  ...PARTY_ACCOUNTS.map((p) => p.email),
  "eric@havenpm.com",
  "dad@havenpm.com",
]);

export function isPartyLoginEmail(email: string): boolean {
  return PARTY_EMAILS.has(email.trim().toLowerCase());
}

/** Player 1 (DM seat) or any Haven administrator. */
export function canViewDemoAccounts(user: {
  email?: string | null;
  role?: UserRole | string | null;
}): boolean {
  const email = (user.email ?? "").trim().toLowerCase();
  if (email === "player1@havenpm.com") return true;
  if (user.role === UserRole.ADMINISTRATOR || user.role === "ADMINISTRATOR") {
    return true;
  }
  return false;
}
