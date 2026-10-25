import { ChevronLeft, ChevronRight, Camera, Package, Megaphone } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { el } from "date-fns/locale";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, isWeekend, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns";
import { FORMAT_LABELS, type Task } from "@shared/schema";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { FORMAT_BADGE_CLASSES, getSeriesColor } from "@/lib/studio";

// Each kind of day gets its own colour, tuned for both light and dark theme
const EVENT_TYPES = [
  {
    type: "shoot",
    label: "Γύρισμα",
    dateField: "shootDate",
    timeField: "shootTime",
    icon: Camera,
    className:
      "bg-cyan-100 text-cyan-900 border-cyan-200 dark:bg-cyan-500/25 dark:text-cyan-100 dark:border-cyan-400/50",
    iconClassName: "text-cyan-600 dark:text-cyan-300",
  },
  {
    type: "delivery",
    label: "Παράδοση",
    dateField: "deliveryDate",
    timeField: "deliveryTime",
    icon: Package,
    className:
      "bg-orange-100 text-orange-900 border-orange-200 dark:bg-orange-500/25 dark:text-orange-100 dark:border-orange-400/50",
    iconClassName: "text-orange-600 dark:text-orange-300",
  },
  {
    type: "publish",
    label: "Δημοσίευση",
    dateField: "publishDate",
    timeField: "publishTime",
    icon: Megaphone,
    className:
      "bg-emerald-100 text-emerald-900 border-emerald-200 dark:bg-emerald-500/25 dark:text-emerald-100 dark:border-emerald-400/50",
    iconClassName: "text-emerald-600 dark:text-emerald-300",
  },
] as const;

const DONE_CLASSES = "bg-muted text-muted-foreground border-border line-through decoration-muted-foreground/50";

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
              className={`p-1 md:p-2 text-center text-xs font-semibold ${
                day === "Σάββατο" || day === "Κυριακή"
                  ? "bg-muted text-muted-foreground"
                  : "bg-secondary text-foreground/80"
              }`}
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
                className={`min-h-[72px] md:min-h-[100px] p-1 md:p-2 min-w-0 ${
                  isToday
                    ? "bg-accent ring-2 ring-inset ring-brand"
                    : isWeekend(day)
                      ? "bg-muted/60"
                      : "bg-card"
                } ${!isCurrentMonth ? "opacity-40" : ""}`}
                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
              >
                <div className="mb-1">
                  <span
                    className={`inline-flex items-center justify-center text-xs font-mono ${
                      isToday
                        ? "w-6 h-6 rounded-full bg-brand text-brand-foreground font-bold"
                        : "text-muted-foreground"
                    }`}
                  >
                    {format(day, "d")}
                  </span>
                </div>
                <div className="space-y-1">
                  {dayEvents.map(({ task, event }) => {
                    const isDone = task.status === "done";
                    const Icon = event.icon;
                    const time = task[event.timeField];
                    const chipClass = `flex w-full items-center gap-1 rounded-md border px-1.5 py-0.5 text-xs font-medium ${
                      isDone ? DONE_CLASSES : event.className
                    }`;
                    return (
                      <button
                        key={`${task.id}-${event.type}`}
                        onClick={() => onTaskClick(task)}
                        className="w-full text-left hover-elevate active-elevate-2 rounded-sm"
                        title={`${event.label}: ${task.title}`}
                        data-testid={`calendar-task-${task.id}-${event.type}`}
                      >
                        <div className={chipClass}>
                          <Icon className={`w-3 h-3 shrink-0 ${isDone ? "" : event.iconClassName}`} />
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
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>

        <div className="flex flex-wrap gap-4 mt-4 text-xs text-muted-foreground">
          {EVENT_TYPES.map(({ type, label, icon: Icon, className }) => (
            <div key={type} className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 ${className}`}>
              <Icon className="w-3 h-3" />
              <span>{label}</span>
            </div>
          ))}
          <div className={`flex items-center gap-1.5 rounded-md border px-2 py-0.5 ${DONE_CLASSES}`}>
            <span>Ολοκληρώθηκε</span>
          </div>
        </div>
      </div>
  );
}
