"use client";

import { useState, useMemo, useCallback, useRef } from "react";
import {
  format,
  startOfMonth,
  endOfMonth,
  startOfWeek,
  endOfWeek,
  eachDayOfInterval,
  addMonths,
  subMonths,
  addWeeks,
  subWeeks,
  isSameMonth,
  isSameDay,
  isToday,
  parseISO,
  differenceInMinutes,
} from "date-fns";
import { ChevronLeft, ChevronRight, Plus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { cn } from "@/lib/utils";
import { updateCalendarEventTime } from "@/lib/actions/calendar";
import { EventDetailDialog } from "@/components/calendar/event-detail-dialog";
import Link from "next/link";

export interface CalendarEventItem {
  id: string;
  title: string;
  type: string;
  startAt: string;
  endAt: string;
  allDay: boolean;
  color: string | null;
  notes: string | null;
  recurrence?: string;
  propertyId?: string;
  assigneeId?: string;
  property?: { name: string } | null;
  unit?: { unitNumber: string } | null;
  assignee?: { name: string | null } | null;
}

const TYPE_COLORS: Record<string, string> = {
  SHOWING: "#3b82f6",
  MAINTENANCE: "#f97316",
  INSPECTION: "#8b5cf6",
  MOVE_IN: "#22c55e",
  MOVE_OUT: "#ef4444",
  STAFF_EVENT: "#6b7280",
  OTHER: "#9ca3af",
};

type ViewMode = "month" | "week" | "agenda";

interface CalendarViewProps {
  events: CalendarEventItem[];
  properties: { id: string; name: string }[];
  staff: { id: string; name: string | null }[];
  canEdit?: boolean;
}

export function CalendarView({
  events: initialEvents,
  properties,
  staff,
  canEdit = true,
}: CalendarViewProps) {
  const [view, setView] = useState<ViewMode>("month");
  const [currentDate, setCurrentDate] = useState(new Date());
  const [events, setEvents] = useState(initialEvents);
  const [draggingId, setDraggingId] = useState<string | null>(null);
  const [selectedEvent, setSelectedEvent] = useState<CalendarEventItem | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const didDragRef = useRef(false);

  const parsedEvents = useMemo(
    () =>
      events.map((e) => ({
        ...e,
        start: parseISO(e.startAt),
        end: parseISO(e.endAt),
        color: e.color || TYPE_COLORS[e.type] || TYPE_COLORS.OTHER,
      })),
    [events]
  );

  const openEvent = (event: CalendarEventItem) => {
    if (didDragRef.current) return;
    setSelectedEvent(event);
    setDialogOpen(true);
  };

  const navigate = (dir: -1 | 1) => {
    if (view === "month") {
      setCurrentDate(dir === 1 ? addMonths(currentDate, 1) : subMonths(currentDate, 1));
    } else {
      setCurrentDate(dir === 1 ? addWeeks(currentDate, 1) : subWeeks(currentDate, 1));
    }
  };

  const handleDrop = useCallback(
    async (eventId: string, targetDate: Date) => {
      const event = parsedEvents.find((e) => e.id === eventId);
      if (!event) return;

      const durationMs = event.end.getTime() - event.start.getTime();
      const newStart = new Date(targetDate);
      newStart.setHours(event.start.getHours(), event.start.getMinutes(), 0, 0);
      const newEnd = new Date(newStart.getTime() + durationMs);

      setEvents((prev) =>
        prev.map((e) =>
          e.id === eventId
            ? { ...e, startAt: newStart.toISOString(), endAt: newEnd.toISOString() }
            : e
        )
      );

      await updateCalendarEventTime(eventId, newStart.toISOString(), newEnd.toISOString());
      didDragRef.current = true;
      setTimeout(() => { didDragRef.current = false; }, 200);
      setDraggingId(null);
    },
    [parsedEvents]
  );

  const headerLabel = useMemo(() => {
    if (view === "month") return format(currentDate, "MMMM yyyy");
    if (view === "week") {
      const ws = startOfWeek(currentDate, { weekStartsOn: 0 });
      const we = endOfWeek(currentDate, { weekStartsOn: 0 });
      return `${format(ws, "MMM d")} – ${format(we, "MMM d, yyyy")}`;
    }
    return "Agenda";
  }, [view, currentDate]);

  const eventsForDay = (day: Date) =>
    parsedEvents.filter((e) => isSameDay(e.start, day));

  const monthDays = useMemo(() => {
    const start = startOfWeek(startOfMonth(currentDate), { weekStartsOn: 0 });
    const end = endOfWeek(endOfMonth(currentDate), { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const weekDays = useMemo(() => {
    const start = startOfWeek(currentDate, { weekStartsOn: 0 });
    const end = endOfWeek(currentDate, { weekStartsOn: 0 });
    return eachDayOfInterval({ start, end });
  }, [currentDate]);

  const agendaEvents = useMemo(
    () => [...parsedEvents].sort((a, b) => a.start.getTime() - b.start.getTime()),
    [parsedEvents]
  );

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2">
          <Button variant="outline" size="icon" onClick={() => navigate(-1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="sm" onClick={() => setCurrentDate(new Date())}>
            Today
          </Button>
          <Button variant="outline" size="icon" onClick={() => navigate(1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
          <h2 className="ml-2 text-lg font-semibold">{headerLabel}</h2>
        </div>

        <div className="flex items-center gap-2">
          <Tabs value={view} onValueChange={(v) => setView(v as ViewMode)}>
            <TabsList>
              <TabsTrigger value="month">Month</TabsTrigger>
              <TabsTrigger value="week">Week</TabsTrigger>
              <TabsTrigger value="agenda">Agenda</TabsTrigger>
            </TabsList>
          </Tabs>
          {canEdit && (
            <Button size="sm" asChild>
              <Link href="/calendar/new">
                <Plus className="mr-1 h-4 w-4" />
                New Event
              </Link>
            </Button>
          )}
        </div>
      </div>

      <div className="flex flex-wrap gap-3 text-xs">
        {Object.entries(TYPE_COLORS).map(([type, color]) => (
          <div key={type} className="flex items-center gap-1.5">
            <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: color }} />
            <span className="text-muted-foreground">{type.replace(/_/g, " ")}</span>
          </div>
        ))}
      </div>

      {view === "month" && (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].map((d) => (
                <div key={d} className="p-2 text-center text-xs font-medium text-muted-foreground">
                  {d}
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7">
              {monthDays.map((day) => {
                const dayEvents = eventsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className={cn(
                      "min-h-[100px] border-b border-r p-1 transition-colors",
                      !isSameMonth(day, currentDate) && "bg-muted/30",
                      draggingId && "hover:bg-primary/5"
                    )}
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => draggingId && handleDrop(draggingId, day)}
                  >
                    <span
                      className={cn(
                        "inline-flex h-6 w-6 items-center justify-center rounded-full text-xs",
                        isToday(day) && "bg-primary text-primary-foreground font-medium"
                      )}
                    >
                      {format(day, "d")}
                    </span>
                    <div className="mt-1 space-y-0.5">
                      {dayEvents.slice(0, 3).map((event) => (
                        <EventChip
                          key={event.id}
                          event={event}
                          draggable={canEdit}
                          onClick={() => openEvent(event)}
                          onDragStart={() => {
                            didDragRef.current = false;
                            setDraggingId(event.id);
                          }}
                          onDragEnd={() => {
                            setDraggingId(null);
                            setTimeout(() => { didDragRef.current = false; }, 150);
                          }}
                        />
                      ))}
                      {dayEvents.length > 3 && (
                        <button
                          type="button"
                          className="text-[10px] text-muted-foreground pl-1 hover:text-foreground hover:underline"
                          onClick={() => {
                            setView("agenda");
                            setCurrentDate(day);
                          }}
                        >
                          +{dayEvents.length - 3} more
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "week" && (
        <Card>
          <CardContent className="p-0">
            <div className="grid grid-cols-7 border-b">
              {weekDays.map((day) => (
                <div key={day.toISOString()} className="border-r p-2 text-center">
                  <p className="text-xs text-muted-foreground">{format(day, "EEE")}</p>
                  <p className={cn("text-sm font-medium", isToday(day) && "text-primary")}>
                    {format(day, "d")}
                  </p>
                </div>
              ))}
            </div>
            <div className="grid grid-cols-7 min-h-[400px]">
              {weekDays.map((day) => {
                const dayEvents = eventsForDay(day);
                return (
                  <div
                    key={day.toISOString()}
                    className="border-r p-1 space-y-1"
                    onDragOver={(e) => e.preventDefault()}
                    onDrop={() => draggingId && handleDrop(draggingId, day)}
                  >
                    {dayEvents.map((event) => (
                      <EventChip
                        key={event.id}
                        event={event}
                        draggable={canEdit}
                        expanded
                        onClick={() => openEvent(event)}
                        onDragStart={() => {
                          didDragRef.current = false;
                          setDraggingId(event.id);
                        }}
                        onDragEnd={() => {
                          setDraggingId(null);
                          setTimeout(() => { didDragRef.current = false; }, 150);
                        }}
                      />
                    ))}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {view === "agenda" && (
        <div className="space-y-2">
          {agendaEvents.length === 0 ? (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                No events scheduled
              </CardContent>
            </Card>
          ) : (
            agendaEvents.map((event) => (
              <Card
                key={event.id}
                className="cursor-pointer transition-colors hover:bg-muted/50"
                onClick={() => openEvent(event)}
              >
                <CardContent className="flex items-start gap-4 p-4">
                  <div
                    className="mt-1 h-full w-1 self-stretch rounded-full"
                    style={{ backgroundColor: event.color }}
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium">{event.title}</p>
                      <span className="text-xs text-muted-foreground">
                        {event.type.replace(/_/g, " ")}
                      </span>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {format(event.start, "EEE, MMM d · h:mm a")}
                      {!event.allDay &&
                        ` – ${format(event.end, "h:mm a")} (${differenceInMinutes(event.end, event.start)} min)`}
                    </p>
                    {event.property && (
                      <p className="text-sm text-muted-foreground">{event.property.name}</p>
                    )}
                    {event.assignee?.name && (
                      <p className="text-xs text-muted-foreground">
                        Assigned: {event.assignee.name}
                      </p>
                    )}
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}

      <EventDetailDialog
        event={selectedEvent}
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        properties={properties}
        staff={staff}
        canEdit={canEdit}
        onUpdated={(updated) => {
          setEvents((prev) => prev.map((e) => (e.id === updated.id ? updated : e)));
          setSelectedEvent(updated);
        }}
        onDeleted={(id) => {
          setEvents((prev) => prev.filter((e) => e.id !== id));
          setSelectedEvent(null);
        }}
      />
    </div>
  );
}

function EventChip({
  event,
  draggable,
  expanded,
  onClick,
  onDragStart,
  onDragEnd,
}: {
  event: CalendarEventItem & { start: Date; end: Date; color: string };
  draggable?: boolean;
  expanded?: boolean;
  onClick?: () => void;
  onDragStart?: () => void;
  onDragEnd?: () => void;
}) {
  return (
    <button
      type="button"
      draggable={draggable}
      onDragStart={(e) => {
        e.stopPropagation();
        onDragStart?.();
      }}
      onDragEnd={onDragEnd}
      onClick={(e) => {
        e.stopPropagation();
        onClick?.();
      }}
      className={cn(
        "w-full text-left rounded px-1.5 py-0.5 text-[10px] text-white truncate transition-opacity hover:opacity-90",
        draggable && "cursor-grab active:cursor-grabbing",
        !draggable && "cursor-pointer",
        expanded && "text-xs py-1"
      )}
      style={{ backgroundColor: event.color }}
      title={`${event.title} — ${format(event.start, "h:mm a")}`}
    >
      {!expanded && (
        <>
          {format(event.start, "h:mm")} {event.title}
        </>
      )}
      {expanded && (
        <>
          <p className="font-medium">{event.title}</p>
          <p className="opacity-80">{format(event.start, "h:mm a")}</p>
        </>
      )}
    </button>
  );
}
