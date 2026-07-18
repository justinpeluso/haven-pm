import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatCurrency } from "@/lib/utils";

const LABELS: Record<string, string> = {
  managementFeePercent: "Management fee %",
  managementFlatFee: "Management flat fee",
  minFee: "Minimum fee",
  maxFee: "Maximum fee",
  waiveFeesWhenVacant: "Waive fees when vacant",
  reserve: "Reserve",
  homeWarrantyExpiration: "Home warranty expiration",
  insuranceExpiration: "Insurance expiration",
  taxYearEnd: "Tax year end (month)",
  description: "Description",
  listingDescription: "Listing description",
  revenue: "Revenue unit",
  tags: "Tags",
  marketRent: "Market rent",
  tenantType: "Tenant type",
  appfolioStatus: "AppFolio status",
  ownerName: "AppFolio owner",
  ownerPhone: "Owner phone",
  unitCount: "Unit count (AppFolio)",
};

const PREFERRED_ORDER = [
  "appfolioStatus",
  "tenantType",
  "managementFeePercent",
  "managementFlatFee",
  "minFee",
  "maxFee",
  "waiveFeesWhenVacant",
  "reserve",
  "taxYearEnd",
  "homeWarrantyExpiration",
  "insuranceExpiration",
  "marketRent",
  "revenue",
  "unitCount",
  "ownerName",
  "ownerPhone",
  "tags",
  "description",
  "listingDescription",
];

function formatValue(key: string, value: unknown): string {
  if (value == null || value === "") return "";
  if (typeof value === "boolean") return value ? "Yes" : "No";
  if (typeof value === "number") {
    if (
      key === "marketRent" ||
      key === "managementFlatFee" ||
      key === "minFee" ||
      key === "maxFee" ||
      key === "reserve"
    ) {
      return formatCurrency(value);
    }
    if (key === "managementFeePercent") return `${value}%`;
    return String(value);
  }
  if (Array.isArray(value)) return value.map(String).join(", ");
  if (typeof value === "object") return JSON.stringify(value);
  return String(value);
}

function mergeExtras(
  ...bags: Array<Record<string, unknown> | null | undefined>
): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const bag of bags) {
    if (!bag || typeof bag !== "object") continue;
    for (const [k, v] of Object.entries(bag)) {
      if (v == null || v === "") continue;
      if (out[k] == null) out[k] = v;
    }
  }
  return out;
}

export function AppFolioExtrasSection({
  extras,
  title = "AppFolio details",
  className,
}: {
  extras: Array<Record<string, unknown> | null | undefined> | Record<string, unknown> | null | undefined;
  title?: string;
  className?: string;
}) {
  const bags = Array.isArray(extras) ? extras : [extras];
  const merged = mergeExtras(...bags);
  const entries = Object.entries(merged).filter(([, v]) => formatValue("", v) !== "");
  if (entries.length === 0) return null;

  const ordered = [
    ...PREFERRED_ORDER.filter((k) => k in merged).map((k) => [k, merged[k]] as const),
    ...entries
      .filter(([k]) => !PREFERRED_ORDER.includes(k))
      .sort(([a], [b]) => a.localeCompare(b)),
  ];

  // Dedupe keys after preferred + rest
  const seen = new Set<string>();
  const rows = ordered.filter(([k]) => {
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });

  return (
    <Card className={className}>
      <CardHeader className="pb-3">
        <CardTitle className="text-base">{title}</CardTitle>
      </CardHeader>
      <CardContent>
        <dl className="grid gap-3 sm:grid-cols-2">
          {rows.map(([key, value]) => {
            const display = formatValue(key, value);
            if (!display) return null;
            return (
              <div key={key} className="min-w-0">
                <dt className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  {LABELS[key] ?? key}
                </dt>
                <dd className="mt-0.5 text-sm break-words">{display}</dd>
              </div>
            );
          })}
        </dl>
      </CardContent>
    </Card>
  );
}

/** Compact one-line badges for tenant cards */
export function AppFolioTenantHints({
  extras,
}: {
  extras: Record<string, unknown> | null | undefined;
}) {
  if (!extras) return null;
  const status = typeof extras.appfolioStatus === "string" ? extras.appfolioStatus : null;
  const type = typeof extras.tenantType === "string" ? extras.tenantType : null;
  if (!status && !type) return null;
  return (
    <p className="text-xs text-muted-foreground">
      {[status, type].filter(Boolean).join(" · ")}
    </p>
  );
}
