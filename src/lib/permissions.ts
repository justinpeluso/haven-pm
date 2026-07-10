import { UserRole } from "@prisma/client";

export type Permission =
  | "properties:read"
  | "properties:write"
  | "properties:delete"
  | "units:read"
  | "units:write"
  | "tenants:read"
  | "tenants:write"
  | "leases:read"
  | "leases:write"
  | "maintenance:read"
  | "maintenance:write"
  | "maintenance:assign"
  | "prospects:read"
  | "prospects:write"
  | "calendar:read"
  | "calendar:write"
  | "documents:read"
  | "documents:write"
  | "messages:read"
  | "messages:write"
  | "reports:read"
  | "reports:export"
  | "settings:read"
  | "settings:write"
  | "users:read"
  | "users:write"
  | "audit:read"
  | "search:global"
  | "notes:write"
  | "notifications:read";

const ROLE_PERMISSIONS: Record<UserRole, Permission[]> = {
  ADMINISTRATOR: [
    "properties:read", "properties:write", "properties:delete",
    "units:read", "units:write",
    "tenants:read", "tenants:write",
    "leases:read", "leases:write",
    "maintenance:read", "maintenance:write", "maintenance:assign",
    "prospects:read", "prospects:write",
    "calendar:read", "calendar:write",
    "documents:read", "documents:write",
    "messages:read", "messages:write",
    "reports:read", "reports:export",
    "settings:read", "settings:write",
    "users:read", "users:write",
    "audit:read", "search:global", "notes:write", "notifications:read",
  ],
  PROPERTY_MANAGER: [
    "properties:read", "properties:write",
    "units:read", "units:write",
    "tenants:read", "tenants:write",
    "leases:read", "leases:write",
    "maintenance:read", "maintenance:write", "maintenance:assign",
    "prospects:read", "prospects:write",
    "calendar:read", "calendar:write",
    "documents:read", "documents:write",
    "messages:read", "messages:write",
    "reports:read", "reports:export",
    "settings:read",
    "search:global", "notes:write", "notifications:read",
  ],
  LEASING_AGENT: [
    "properties:read",
    "units:read",
    "tenants:read",
    "leases:read",
    "maintenance:read",
    "prospects:read", "prospects:write",
    "calendar:read", "calendar:write",
    "documents:read", "documents:write",
    "messages:read", "messages:write",
    "reports:read",
    "search:global", "notes:write", "notifications:read",
  ],
  MAINTENANCE_STAFF: [
    "properties:read",
    "units:read",
    "maintenance:read", "maintenance:write",
    "calendar:read",
    "documents:read",
    "messages:read", "messages:write",
    "search:global", "notes:write", "notifications:read",
  ],
  OFFICE_STAFF: [
    "properties:read",
    "units:read",
    "tenants:read",
    "leases:read",
    "maintenance:read",
    "prospects:read",
    "calendar:read", "calendar:write",
    "documents:read", "documents:write",
    "messages:read", "messages:write",
    "reports:read",
    "search:global", "notes:write", "notifications:read",
  ],
  TENANT: [
    "maintenance:read", "maintenance:write",
    "documents:read",
    "messages:read", "messages:write",
    "notifications:read",
  ],
  PROSPECT: [
    "properties:read",
    "messages:read", "messages:write",
    "notifications:read",
  ],
};

export function hasPermission(role: UserRole, permission: Permission): boolean {
  return ROLE_PERMISSIONS[role]?.includes(permission) ?? false;
}

export function hasAnyPermission(role: UserRole, permissions: Permission[]): boolean {
  return permissions.some((p) => hasPermission(role, p));
}

export function canAccessCalendar(role: UserRole): boolean {
  return hasPermission(role, "calendar:read");
}

export function isStaffRole(role: UserRole): boolean {
  return role !== UserRole.TENANT && role !== UserRole.PROSPECT;
}

export const ROLE_LABELS: Record<UserRole, string> = {
  ADMINISTRATOR: "Administrator",
  PROPERTY_MANAGER: "Property Manager",
  LEASING_AGENT: "Leasing Agent",
  MAINTENANCE_STAFF: "Maintenance Staff",
  OFFICE_STAFF: "Office Staff",
  TENANT: "Tenant",
  PROSPECT: "Prospect",
};

export const STAFF_ROLES: UserRole[] = [
  UserRole.ADMINISTRATOR,
  UserRole.PROPERTY_MANAGER,
  UserRole.LEASING_AGENT,
  UserRole.MAINTENANCE_STAFF,
  UserRole.OFFICE_STAFF,
];
