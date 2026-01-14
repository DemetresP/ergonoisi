import { Badge } from "@/components/ui/badge";
import { ChevronLeft, ChevronRight, Camera, Package } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useState } from "react";
import { format, startOfMonth, endOfMonth, eachDayOfInterval, isSameMonth, isSameDay, addMonths, subMonths, startOfWeek, endOfWeek, parseISO } from "date-fns";
import type { Task } from "@shared/schema";

interface CalendarViewProps {
  tasks: Task[];
  onTaskClick: (task: Task) => void;
}

export function CalendarView({ tasks, onTaskClick }: CalendarViewProps) {
  const [currentMonth, setCurrentMonth] = useState(new Date());

  const monthStart = startOfMonth(currentMonth);
  const monthEnd = endOfMonth(currentMonth);
  const calendarStart = startOfWeek(monthStart, { weekStartsOn: 1 });
  const calendarEnd = endOfWeek(monthEnd, { weekStartsOn: 1 });

  const days = eachDayOfInterval({ start: calendarStart, end: calendarEnd });

  const getTasksForDate = (date: Date) => {
    return tasks.filter(task => {
      const shootDate = task.shootDate ? parseISO(task.shootDate) : null;
      const deliveryDate = task.deliveryDate ? parseISO(task.deliveryDate) : null;
      
      return (shootDate && isSameDay(shootDate, date)) || 
             (deliveryDate && isSameDay(deliveryDate, date));
    });
  };

  const getTaskType = (task: Task, date: Date) => {
    const shootDate = task.shootDate ? parseISO(task.shootDate) : null;
    const deliveryDate = task.deliveryDate ? parseISO(task.deliveryDate) : null;
    
    if (shootDate && isSameDay(shootDate, date)) return "shoot";
    if (deliveryDate && isSameDay(deliveryDate, date)) return "delivery";
    return null;
  };

  return (
    <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-lg font-semibold">
            {format(currentMonth, "MMMM yyyy")}
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
              Today
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
              className="bg-muted p-2 text-center text-xs font-semibold text-muted-foreground"
            >
              {day}
            </div>
          ))}

          {days.map((day, idx) => {
            const dayTasks = getTasksForDate(day);
            const isCurrentMonth = isSameMonth(day, currentMonth);
            const isToday = isSameDay(day, new Date());

            return (
              <div
                key={idx}
                className={`bg-background min-h-[100px] p-2 ${
                  !isCurrentMonth ? "opacity-40" : ""
                } ${isToday ? "bg-accent/20" : ""}`}
                data-testid={`calendar-day-${format(day, "yyyy-MM-dd")}`}
              >
                <div className={`text-xs font-mono mb-1 ${isToday ? "font-bold text-primary" : "text-muted-foreground"}`}>
                  {format(day, "d")}
                </div>
                <div className="space-y-1">
                  {dayTasks.map((task) => {
                    const taskType = getTaskType(task, day);
                    const isDone = task.status === 'done';
                    const badgeClass = isDone 
                      ? "w-full justify-start text-xs truncate gap-1 no-default-hover-elevate no-default-active-elevate bg-green-100 text-green-800 border-green-300 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800"
                      : "w-full justify-start text-xs truncate gap-1 no-default-hover-elevate no-default-active-elevate";
                    return (
                      <button
                        key={`${task.id}-${taskType}`}
                        onClick={() => onTaskClick(task)}
                        className="w-full text-left hover-elevate active-elevate-2 rounded-sm"
                        data-testid={`calendar-task-${task.id}`}
                      >
                        <Badge
                          variant={isDone ? "outline" : (taskType === "shoot" ? "default" : "secondary")}
                          className={badgeClass}
                        >
                          {taskType === "shoot" ? (
                            <Camera className="w-3 h-3 shrink-0" />
                          ) : (
                            <Package className="w-3 h-3 shrink-0" />
                          )}
                          <span className="truncate flex-1">
                            {taskType === "delivery" && task.deliveryTime && (
                              <span className="font-mono mr-1">{task.deliveryTime}</span>
                            )}
                            {task.title}
                          </span>
                          <span className={`text-[10px] font-semibold ml-1 shrink-0 px-1 py-0.5 rounded ${
                            task.tag === 'newsit'
                              ? 'bg-black text-white dark:bg-black dark:text-white'
                              : task.tag === 'zappit'
                              ? 'bg-purple-500 text-white dark:bg-purple-600 dark:text-white'
                              : 'bg-pink-500 text-white dark:bg-pink-600 dark:text-white'
                          }`}>
                            {task.tag}
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

        <div className="flex gap-4 mt-4 text-xs text-muted-foreground">
          <div className="flex items-center gap-1.5">
            <Camera className="w-3 h-3" />
            <span>Production Date</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Package className="w-3 h-3" />
            <span>Delivery Date</span>
          </div>
        </div>
      </div>
  );
}
