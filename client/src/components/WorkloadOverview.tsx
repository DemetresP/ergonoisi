import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangle } from "lucide-react";
import type { Task } from "@shared/schema";

interface WorkloadOverviewProps {
  tasks: Task[];
}

interface PersonStats {
  tasks: number;
  overdue: number;
}

export function WorkloadOverview({ tasks }: WorkloadOverviewProps) {
  const people = new Map<string, PersonStats>();
  const now = new Date();

  tasks.forEach((task) => {
    if (!task.assignee) return;
    
    const stats = people.get(task.assignee) || { tasks: 0, overdue: 0 };
    stats.tasks += 1;

    if (task.deliveryDate && task.status !== "done") {
      const deliveryDate = new Date(task.deliveryDate);
      if (deliveryDate < now) {
        stats.overdue += 1;
      }
    }

    people.set(task.assignee, stats);
  });

  if (people.size === 0) {
    return null;
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-lg font-semibold">Εργασίες Ομάδας</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {Array.from(people.entries()).map(([person, stats]) => (
            <div
              key={person}
              className="p-4 border rounded-lg hover-elevate transition-colors duration-150"
              data-testid={`workload-card-${person}`}
            >
              <div className="font-semibold mb-3">{person}</div>
              <div className="space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Tasks</span>
                  <span className="font-mono font-semibold" data-testid={`workload-tasks-${person}`}>
                    {stats.tasks}
                  </span>
                </div>
                {stats.overdue > 0 && (
                  <div className="flex items-center gap-1.5 text-destructive pt-1">
                    <AlertTriangle className="w-4 h-4" />
                    <span className="font-semibold" data-testid={`workload-overdue-${person}`}>
                      {stats.overdue} overdue
                    </span>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  );
}
