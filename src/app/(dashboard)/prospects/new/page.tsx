import { requirePermission } from "@/lib/auth/session";
import { db } from "@/lib/db";
import { NewProspectForm } from "@/components/prospects/new-prospect-form";

export default async function NewProspectPage() {
  await requirePermission("prospects:write");

  const properties = await db.property.findMany({
    where: { deletedAt: null },
    select: { id: true, name: true },
    orderBy: { name: "asc" },
  });

  return <NewProspectForm properties={properties} />;
}
