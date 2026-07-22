import { requirePermission } from "@/lib/auth/session";
import { getLeaseFormOptions } from "@/lib/actions/rent";
import { NewLeaseForm } from "@/components/leases/new-lease-form";

export default async function NewLeasePage({
  searchParams,
}: {
  searchParams: Promise<{ tenantId?: string }>;
}) {
  await requirePermission("leases:write");
  const params = await searchParams;
  const options = await getLeaseFormOptions();

  return (
    <NewLeaseForm
      tenants={options.tenants}
      units={options.units}
      defaultTenantId={params.tenantId}
    />
  );
}
