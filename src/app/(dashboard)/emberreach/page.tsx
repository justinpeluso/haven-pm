import type { Metadata } from "next";
import { requirePermission } from "@/lib/auth/session";
import { EmberreachGame } from "@/components/emberreach/emberreach-game";

export const metadata: Metadata = {
  title: "Emberreach",
  description:
    "Original third-person Ashtrail prototype — explore, fight cinder wolves, clear the standing stones.",
};

export default async function EmberreachPage() {
  await requirePermission("downtowns:read");
  return <EmberreachGame />;
}
