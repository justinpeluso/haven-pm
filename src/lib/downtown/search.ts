import Fuse from "fuse.js";
import type { DowntownRecord } from "./types";

export function searchDowntowns(
  downtowns: DowntownRecord[],
  q: string,
  filters?: { state?: "PA" | "OH" | "ALL"; maxMiles?: number; tag?: string }
): DowntownRecord[] {
  let list = downtowns;

  if (filters?.state && filters.state !== "ALL") {
    list = list.filter((d) => d.state === filters.state);
  }
  if (filters?.maxMiles != null) {
    list = list.filter((d) => d.milesFromAllegheny <= filters.maxMiles!);
  }
  if (filters?.tag) {
    list = list.filter((d) => d.tags.includes(filters.tag!));
  }

  const query = q.trim();
  if (!query) return list;

  const fuse = new Fuse(list, {
    keys: [
      { name: "name", weight: 0.4 },
      { name: "downtownName", weight: 0.25 },
      { name: "county", weight: 0.15 },
      { name: "state", weight: 0.05 },
      { name: "tags", weight: 0.15 },
    ],
    threshold: 0.35,
    ignoreLocation: true,
  });

  return fuse.search(query).map((r) => r.item);
}
