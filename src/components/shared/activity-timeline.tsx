import { formatDateTime } from "@/lib/utils";
import { cn } from "@/lib/utils";

interface TimelineItem {
  id: string;
  action: string;
  userName?: string | null;
  oldValue?: string | null;
  newValue?: string | null;
  notes?: string | null;
  createdAt: Date | string;
}

interface ActivityTimelineProps {
  items: TimelineItem[];
  className?: string;
}

export function ActivityTimeline({ items, className }: ActivityTimelineProps) {
  if (items.length === 0) {
    return (
      <p className="text-sm text-muted-foreground py-4 text-center">No activity yet</p>
    );
  }

  return (
    <div className={cn("space-y-4", className)}>
      {items.map((item, index) => (
        <div key={item.id} className="relative flex gap-4">
          {index < items.length - 1 && (
            <div className="absolute left-[7px] top-6 h-full w-px bg-border" />
          )}
          <div className="relative mt-1.5 h-3.5 w-3.5 shrink-0 rounded-full border-2 border-primary bg-background" />
          <div className="flex-1 space-y-1 pb-4">
            <div className="flex items-center gap-2">
              <p className="text-sm font-medium">{item.action}</p>
              {item.userName && (
                <span className="text-xs text-muted-foreground">by {item.userName}</span>
              )}
            </div>
            {(item.oldValue || item.newValue) && (
              <p className="text-xs text-muted-foreground">
                {item.oldValue && <span className="line-through">{item.oldValue}</span>}
                {item.oldValue && item.newValue && " → "}
                {item.newValue && <span className="font-medium text-foreground">{item.newValue}</span>}
              </p>
            )}
            {item.notes && (
              <p className="text-sm text-muted-foreground">{item.notes}</p>
            )}
            <p className="text-xs text-muted-foreground">{formatDateTime(item.createdAt)}</p>
          </div>
        </div>
      ))}
    </div>
  );
}
