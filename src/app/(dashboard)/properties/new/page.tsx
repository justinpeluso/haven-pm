import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NewPropertyForm } from "@/components/properties/new-property-form";

export default async function NewPropertyPage() {
  await requirePermission("properties:write");

  const owners = await db.owner.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <NewPropertyForm owners={owners} />;
}
