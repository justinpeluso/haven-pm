import { MessageStatus } from "@prisma/client";

export type PortalInboxFilter = "all" | "unread" | "read" | "working";

export function parsePortalInboxFilter(raw: string | undefined | null): PortalInboxFilter {
  if (raw === "unread" || raw === "read" || raw === "working") return raw;
  return "all";
}

export function matchesPortalInboxFilter(
  message: { agentWorking?: boolean; status: MessageStatus | string },
  filter: PortalInboxFilter
): boolean {
  const working = !!message.agentWorking;
  const read = message.status === MessageStatus.READ || message.status === "READ";
  switch (filter) {
    case "unread":
      return !working && !read;
    case "read":
      return !working && read;
    case "working":
      return working;
    default:
      return true;
  }
}

/** Agent-working first, then unread, then newest. */
export function sortPortalInboxMessages<
  T extends { agentWorking: boolean; status: MessageStatus; createdAt: Date },
>(rows: T[]): T[] {
  return [...rows].sort((a, b) => {
    const aWork = a.agentWorking ? 0 : 1;
    const bWork = b.agentWorking ? 0 : 1;
    if (aWork !== bWork) return aWork - bWork;
    const aRead = a.status === MessageStatus.READ ? 1 : 0;
    const bRead = b.status === MessageStatus.READ ? 1 : 0;
    if (aRead !== bRead) return aRead - bRead;
    return b.createdAt.getTime() - a.createdAt.getTime();
  });
}
