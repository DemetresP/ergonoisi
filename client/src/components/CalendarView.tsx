import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Camera, Package, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { el } from "date-fns/locale";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { FORMAT_LABELS, type Task } from "@shared/schema";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { FORMAT_BADGE_CLASSES, getSeriesColor } from "@/lib/studio";

const EVENT_TYPES = [
  { type: "shoot", label: "Γύρισμα", dateField: "shootDate", timeField: "shootTime", icon: Camera, variant: "default", className: "" },
  { type: "delivery", label: "Παράδοση", dateField: "deliveryDate", timeField: "deliveryTime", icon: Package, variant: "secondary", className: "" },
  {
    type: "publish",
    label: "Δημοσίευση",
    dateField: "publishDate",
    timeField: "publishTime",
    icon: Megaphone,
    variant: "outline",
    className: "bg-brand/15 text-foreground border-brand/50",
  },
] as const;

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const { series: seriesList } = useStudioSettings();
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  // A task can appear on up to three days: shoot, delivery and publish
  const getEventsForDate = (date: Date) =>
    tasks.flatMap((task) =>
      EVENT_TYPES.filter(({ dateField }) => {
        const value = task[dateField];
        return value ? isSameDay(parseISO(value), date) : false;
      }).map((event) => ({ task, event })),
    );

  return (
    <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            <span className="capitalize">{format(currentMonth, "LLLL yyyy", { locale: el })}</span>
          </h2>
          <div className="flex gap-2">
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(subMonths(currentMonth, 1))}
              data-testid="button-prev-month"
            >
              <ChevronLeft className="w-4 h-4" />
            </Button>
            <Button
              variant="outline"
              onClick={() => setCurrentMonth(new Date())}
              data-testid="button-today"
            >
              Σήμερα
            </Button>
            <Button
              variant="outline"
              size="icon"
              onClick={() => setCurrentMonth(addMonths(currentMonth, 1))}
              data-testid="button-next-month"
            >
              <ChevronRight className="w-4 h-4" />
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-px bg-border rounded-md overflow-hidden">
          {["Δευτέρα", "Τρίτη", "Τετάρτη", "Πέμπτη", "Παρασκευή", "Σάββατο", "Κυριακή"].map((day) => (
            <div
              key={day}
              className="bg-muted p-1 md:p-2 text-center text-xs font-semibold text-muted-foreground"
            >
              <span className="hidden md:inline">{day}</span>
              <span className="md:hidden">{day.slice(0, 3)}</span>
            </div>
          ))}

          {days.map((day, idx) => {
            const dayEvents = getEventsForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={idx}
                className={`bg-background min-h-[72px] md:min-h-[100px] p-1 md:p-2 min-w-0 ${
                  !isCurrentMonth ? "opacity-40" : ""
                } ${isToday ? "bg-accent/60" : ""}`}
                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
              >
                <div className={`text-xs font-mono mb-1 ${isToday ? "font-bold text-brand" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayEvents.map(({ task, event }) => {
                    const isDone = task.status === "done";
                    const Icon = event.icon;
                    const time = task[event.timeField];
                    const badgeClass = `w-full justify-start text-xs truncate gap-1 no-default-hover-elevate no-default-active-elevate ${
                      isDone
                        ? "bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                        : event.className
                    }`;
                    return (
                      <button
                        key={`${task.id}-${event.type}`}
                        onClick={() => onTaskClick(task)}
                        className="w-full text-left hover-elevate active-elevate-2 rounded-sm"
                        title={`${event.label}: ${task.title}`}
                        data-testid={`calendar-task-${task.id}-${event.type}`}
                      >
                        <Badge variant={isDone ? "outline" : event.variant} className={badgeClass}>
                          <Icon className="w-3 h-3 shrink-0" />
                          <span className="truncate flex-1">
                            {time && <span className="font-mono mr-1">{time}</span>}
                            {task.title}
                          </span>
                          <span
                            className={`text-[10px] font-semibold ml-1 shrink-0 px-1 py-0.5 rounded hidden md:inline ${
                              task.series ? getSeriesColor(task.series, seriesList) : FORMAT_BADGE_CLASSES[task.format]
                            }`}
                            title={task.series ? `${FORMAT_LABELS[task.format]} · ${task.series}` : FORMAT_LABELS[task.format]}
                          >
                            {task.series || FORMAT_LABELS[task.format]}
                          </span>
                        </Badge>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          {EVENT_TYPES.map(({ type, label, icon: Icon }) => (
            <div key={type} className="flex items-center gap-1.5">
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </div>
          ))}
        </div>
      </div>
  );
}
