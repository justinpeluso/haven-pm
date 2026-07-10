import { requirePermission } from "@/lib/auth/session";
import { Breadcrumbs } from "@/components/layout/breadcrumbs";
import { Card, CardContent } from "@/components/ui/card";

export default async function SearchPage() {
  await requirePermission("search:global");

  return (
    <div className="space-y-6">
      <div>
        <Breadcrumbs items={[{ label: "Search" }]} />
        <h1 className="mt-2 text-2xl font-bold">Global Search</h1>
        <p className="text-muted-foreground">
          Press <kbd className="rounded border px-1.5 py-0.5 text-xs font-mono">⌘K</kbd> anywhere to search instantly
        </p>
      </div>

      <Card>
        <CardContent className="py-12 text-center text-muted-foreground">
          <p>Use the search bar in the header or press ⌘K to find:</p>
          <ul className="mt-4 space-y-1 text-sm">
            <li>Properties, addresses, and units</li>
            <li>Tenants, prospects, and owners</li>
            <li>Maintenance requests and work orders</li>
            <li>Documents, notes, and calendar events</li>
            <li>Phone numbers, emails, and agents</li>
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
