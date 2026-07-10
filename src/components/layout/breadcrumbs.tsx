import Link from "next/link";
import { ChevronRight, Home } from "lucide-react";
import { cn } from "@/lib/utils";

interface BreadcrumbItem {
  label: string;
  href?: string;
}

interface BreadcrumbsProps {
  items: BreadcrumbItem[];
  className?: string;
}

export function Breadcrumbs({ items, className }: BreadcrumbsProps) {
  return (
    <nav className={cn("flex items-center gap-1 text-sm text-muted-foreground", className)}>
      <Link href="/dashboard" className="hover:text-foreground transition-colors">
        <Home className="h-4 w-4" />
      </Link>
      {items.map((item, i) => (
        <span key={i} className="flex items-center gap-1">
          <ChevronRight className="h-4 w-4" />
          {item.href ? (
            <Link href={item.href} className="hover:text-foreground transition-colors">
              {item.label}
            </Link>
          ) : (
            <span className="text-foreground font-medium">{item.label}</span>
          )}
        </span>
      ))}
    </nav>
  );
}
