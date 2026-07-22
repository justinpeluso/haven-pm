import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import {
  DEMO_PASSWORD,
  PARTY_ACCOUNTS,
  PM_ACCOUNTS,
  TENANT_PORTAL_ACCOUNTS,
  canViewDemoAccounts,
  isPartyLoginEmail,
} from "@/lib/demo-accounts";

export async function GET() {
  const session = await auth();
  if (!session?.user || !canViewDemoAccounts(session.user)) {
    return NextResponse.json({ error: "Forbidden" }, { status: 403 });
  }
  return NextResponse.json({
    password: DEMO_PASSWORD,
    pm: PM_ACCOUNTS,
    party: PARTY_ACCOUNTS,
    tenants: TENANT_PORTAL_ACCOUNTS,
  });
}

/** Post-login home path (session must already exist). */
export async function POST() {
  const session = await auth();
  if (!session?.user?.email) {
    return NextResponse.json({ path: "/login" }, { status: 401 });
  }
  const path = isPartyLoginEmail(session.user.email) ? "/true-grit" : "/dashboard";
  return NextResponse.json({ path });
}
