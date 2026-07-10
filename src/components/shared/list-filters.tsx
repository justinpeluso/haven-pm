"use client";

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";

export interface FilterOption {
  key: string;
  label: string;
  options: { value: string; label: string }[];
}

interface ListFiltersProps {
  filters: FilterOption[];
}

export function ListFilters({ filters }: ListFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value === "all") {
      params.delete(key);
    } else {
      params.set(key, value);
    }
    const qs = params.toString();
    router.push(qs ? `${pathname}?${qs}` : pathname);
  };

  const clearAll = () => router.push(pathname);

  const hasActive = filters.some((f) => {
    const val = searchParams.get(f.key);
    return val && val !== "all";
  });

  return (
    <div className="flex flex-wrap items-center gap-2">
      {filters.map((filter) => (
        <Select
          key={filter.key}
          value={searchParams.get(filter.key) || "all"}
          onValueChange={(v) => setFilter(filter.key, v)}
        >
          <SelectTrigger className="h-9 w-[160px]">
            <SelectValue placeholder={filter.label} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All {filter.label}</SelectItem>
            {filter.options.map((opt) => (
              <SelectItem key={opt.value} value={opt.value}>
                {opt.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      ))}
      {hasActive && (
        <Button variant="ghost" size="sm" onClick={clearAll} className="h-9">
          <X className="mr-1 h-3 w-3" />
          Clear
        </Button>
      )}
    </div>
  );
}
