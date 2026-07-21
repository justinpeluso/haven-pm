import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { LucideIcon } from "lucide-react";

interface StatCardProps {
  title: string;
  value: string | number;
  description?: string;
  icon?: LucideIcon;
  trend?: { value: number; label: string };
  className?: string;
}

export function StatCard({ title, value, description, icon: Icon, trend, className }: StatCardProps) {
  return (
    <Card className={cn("group relative overflow-hidden transition-all hover:shadow-md", className)}>
      <div className="absolute inset-0 bg-gradient-to-br from-primary/5 via-transparent to-transparent opacity-0 transition-opacity group-hover:opacity-100" />
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2 relative">
        <CardTitle className="text-sm font-medium text-muted-foreground">{title}</CardTitle>
        {Icon && (
          <div className="rounded-lg bg-primary/10 p-2 transition-colors group-hover:bg-primary/20">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        )}
      </CardHeader>
      <CardContent className="relative">
        <div className="text-2xl font-bold tracking-tight">{value}</div>
        {description && (
          <p className="text-xs text-muted-foreground mt-1">{description}</p>
        )}
        {trend && (
          <p className={cn(
            "text-xs mt-1 font-medium",
            trend.value >= 0 ? "text-emerald-600 dark:text-emerald-400" : "text-red-600 dark:text-red-400"
          )}>
            {trend.value >= 0 ? "↑" : "↓"} {Math.abs(trend.value)}% {trend.label}
          </p>
        )}
      </CardContent>
    </Card>
  );
}
