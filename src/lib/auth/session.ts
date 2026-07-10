import { auth } from "@/lib/auth";
import { hasPermission, type Permission } from "@/lib/permissions";
import { UserRole } from "@prisma/client";
import { redirect } from "next/navigation";

export async function getSession() {
  return auth();
}

export async function requireAuth() {
  const session = await auth();
  if (!session?.user) {
    redirect("/login");
  }
  return session;
}

export async function requirePermission(permission: Permission) {
  const session = await requireAuth();
  if (!hasPermission(session.user.role, permission)) {
    redirect("/dashboard?error=unauthorized");
  }
  return session;
}

export async function requireRole(...roles: UserRole[]) {
  const session = await requireAuth();
  if (!roles.includes(session.user.role)) {
    redirect("/dashboard?error=unauthorized");
  }
  return session;
}

export async function requireStaff() {
  const session = await requireAuth();
  const staffRoles: UserRole[] = [
    UserRole.ADMINISTRATOR,
    UserRole.PROPERTY_MANAGER,
    UserRole.LEASING_AGENT,
    UserRole.MAINTENANCE_STAFF,
    UserRole.OFFICE_STAFF,
  ];
  if (!staffRoles.includes(session.user.role)) {
    redirect("/dashboard");
  }
  return session;
}
