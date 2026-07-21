import type { VariantProps } from "class-variance-authority";
import { badgeVariants } from "@/components/ui/badge";

export type BadgeVariant = VariantProps<typeof badgeVariants>["variant"];

/**
 * Get the appropriate badge variant for a priority level
 */
export function getPriorityBadgeVariant(priority: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    LOW: "secondary",
    MEDIUM: "default",
    HIGH: "warning",
    EMERGENCY: "destructive",
  };
  return map[priority] || "default";
}

/**
 * Get the appropriate badge variant for a maintenance status
 */
export function getStatusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    SUBMITTED: "info",
    ASSIGNED: "info",
    SCHEDULED: "warning",
    IN_PROGRESS: "warning",
    WAITING_ON_PARTS: "warning",
    COMPLETED: "success",
    CLOSED: "secondary",
  };
  return map[status] || "default";
}

/**
 * Get the appropriate badge variant for a unit status
 */
export function getUnitStatusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    OCCUPIED: "success",
    AVAILABLE: "info",
    VACANT: "warning",
    NOTICE_GIVEN: "warning",
    MAINTENANCE: "destructive",
    RENOVATION: "secondary",
  };
  return map[status] || "default";
}

/**
 * Get the appropriate badge variant for a prospect status
 */
export function getProspectStatusBadgeVariant(status: string): BadgeVariant {
  const map: Record<string, BadgeVariant> = {
    NEW: "info",
    CONTACTED: "warning",
    SHOWING_SCHEDULED: "warning",
    APPLICATION_SUBMITTED: "info",
    APPLICATION_APPROVED: "success",
    APPLICATION_DENIED: "destructive",
    LEASE_SIGNED: "success",
    LEASE_DECLINED: "destructive",
  };
  return map[status] || "default";
}

/**
 * Format a status string for display (replace underscores with spaces, capitalize)
 */
export function formatStatusDisplay(status: string): string {
  return status.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}
