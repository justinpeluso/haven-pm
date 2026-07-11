import type { BadgeProps } from "@/components/ui/badge";

export type OccupancyLabel = "Occupied" | "Partially Occupied" | "Vacant";

export function getOccupancy(units: { status: string }[]): {
  label: OccupancyLabel;
  occupied: number;
  total: number;
  available: number;
  badgeVariant: NonNullable<BadgeProps["variant"]>;
  description: string;
} {
  const total = units.length;
  const occupied = units.filter(
    (u) => u.status === "OCCUPIED" || u.status === "NOTICE_GIVEN"
  ).length;
  const available = units.filter(
    (u) => u.status === "AVAILABLE" || u.status === "VACANT"
  ).length;

  if (total === 0 || occupied === 0) {
    return {
      label: "Vacant",
      occupied,
      total,
      available,
      badgeVariant: "secondary",
      description:
        total === 0
          ? "No units on this property yet."
          : `All ${total} unit${total === 1 ? "" : "s"} are vacant and available to lease.`,
    };
  }

  if (occupied >= total) {
    return {
      label: "Occupied",
      occupied,
      total,
      available,
      badgeVariant: "success",
      description: `Fully occupied — ${occupied} of ${total} unit${total === 1 ? "" : "s"} leased.`,
    };
  }

  return {
    label: "Partially Occupied",
    occupied,
    total,
    available,
    badgeVariant: "warning",
    description: `${occupied} of ${total} units occupied · ${available} available.`,
  };
}

export function unitStatusBadgeVariant(
  status: string
): NonNullable<BadgeProps["variant"]> {
  switch (status) {
    case "OCCUPIED":
      return "success";
    case "NOTICE_GIVEN":
      return "warning";
    case "MAINTENANCE_HOLD":
      return "destructive";
    case "AVAILABLE":
      return "info";
    case "VACANT":
    default:
      return "secondary";
  }
}

export function formatUnitStatus(status: string): string {
  return status.replace(/_/g, " ");
}
