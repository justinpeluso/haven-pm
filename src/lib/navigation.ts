import { UserRole } from "@prisma/client";
import {
  Building2,
  Calendar,
  ClipboardList,
  FileText,
  Home,
  Landmark,
  MessageSquare,
  Search,
  Settings,
  Users,
  Wrench,
  BarChart3,
  UserPlus,
  ScrollText,
} from "lucide-react";
import { hasPermission, type Permission } from "@/lib/permissions";

export interface NavItem {
  title: string;
  href: string;
  icon: React.ComponentType<{ className?: string }>;
  permission?: Permission;
  roles?: UserRole[];
}

export const mainNavItems: NavItem[] = [
  { title: "Dashboard", href: "/dashboard", icon: Home },
  { title: "Properties", href: "/properties", icon: Building2, permission: "properties:read" },
  { title: "Downtown", href: "/downtown", icon: Landmark, permission: "downtowns:read" },
  { title: "Maintenance", href: "/maintenance", icon: Wrench, permission: "maintenance:read" },
  { title: "Prospects", href: "/prospects", icon: UserPlus, permission: "prospects:read" },
  { title: "Calendar", href: "/calendar", icon: Calendar, permission: "calendar:read" },
  { title: "Tenants", href: "/tenants", icon: Users, permission: "tenants:read" },
  { title: "Leases", href: "/leases", icon: ScrollText, permission: "leases:read" },
  { title: "Documents", href: "/documents", icon: FileText, permission: "documents:read" },
  { title: "Messages", href: "/messages", icon: MessageSquare, permission: "messages:read" },
  { title: "Reports", href: "/reports", icon: BarChart3, permission: "reports:read" },
  { title: "Audit Log", href: "/audit", icon: ClipboardList, permission: "audit:read" },
  { title: "Search", href: "/search", icon: Search, permission: "search:global" },
];

export const bottomNavItems: NavItem[] = [
  { title: "Settings", href: "/settings", icon: Settings, permission: "settings:read" },
];

export function getNavItemsForRole(role: UserRole): NavItem[] {
  const filterItems = (items: NavItem[]) =>
    items.filter((item) => {
      if (item.roles && !item.roles.includes(role)) return false;
      if (item.permission && !hasPermission(role, item.permission)) return false;
      return true;
    });

  // Tenant-specific nav
  if (role === UserRole.TENANT) {
    return [
      { title: "Dashboard", href: "/dashboard", icon: Home },
      { title: "Maintenance", href: "/maintenance", icon: Wrench },
      { title: "Documents", href: "/documents", icon: FileText },
      { title: "Messages", href: "/messages", icon: MessageSquare },
    ];
  }

  // Prospect-specific nav
  if (role === UserRole.PROSPECT) {
    return [
      { title: "Dashboard", href: "/dashboard", icon: Home },
      { title: "Properties", href: "/properties", icon: Building2 },
      { title: "Messages", href: "/messages", icon: MessageSquare },
    ];
  }

  // Maintenance staff nav
  if (role === UserRole.MAINTENANCE_STAFF) {
    return [
      { title: "Dashboard", href: "/dashboard", icon: Home },
      { title: "Work Orders", href: "/maintenance", icon: Wrench },
      { title: "Properties", href: "/properties", icon: Building2 },
      { title: "Messages", href: "/messages", icon: MessageSquare },
    ];
  }

  return [...filterItems(mainNavItems), ...filterItems(bottomNavItems)];
}

export const quickActions = [
  { title: "New Maintenance Request", href: "/maintenance/new", permission: "maintenance:write" as Permission },
  { title: "New Lease", href: "/leases/new", permission: "leases:write" as Permission },
  { title: "Add Prospect", href: "/prospects/new", permission: "prospects:write" as Permission },
  { title: "Schedule Showing", href: "/calendar/new", permission: "calendar:write" as Permission },
  { title: "Add Property", href: "/properties/new", permission: "properties:write" as Permission },
];
