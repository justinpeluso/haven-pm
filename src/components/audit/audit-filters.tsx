"use client";

import { ListFilters } from "@/components/shared/list-filters";

interface AuditFiltersProps {
  entityTypes: string[];
  properties: { id: string; name: string }[];
}

export function AuditFilters({ entityTypes, properties }: AuditFiltersProps) {
  return (
    <ListFilters
      filters={[
        {
          key: "entityType",
          label: "Entity",
          options: entityTypes.map((t) => ({ value: t, label: t })),
        },
        {
          key: "propertyId",
          label: "Property",
          options: properties.map((p) => ({ value: p.id, label: p.name })),
        },
      ]}
    />
  );
}
