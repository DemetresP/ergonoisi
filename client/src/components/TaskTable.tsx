import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import type { Task } from "@shared/schema";
import { useState } from "react";
import { isAdmin } from "@shared/admin";

interface TaskTableProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, status: "todo" | "inprogress" | "done") => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  userEmail?: string | null;
}

export function TaskTable({ tasks, onUpdateStatus, onEdit, onDelete, userEmail }: TaskTableProps) {
  const userIsAdmin = isAdmin(userEmail);
  const [sortField, setSortField] = useState<"deliveryDate" | "shootDate" | null>("deliveryDate");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  const sortedTasks = [...tasks].sort((a, b) => {
    if (!sortField) return 0;
    
    const aValue = a[sortField] || "9999-12-31";
    const bValue = b[sortField] || "9999-12-31";
    
    const comparison = aValue.localeCompare(bValue);
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const isOverdue = (task: Task) => {
    if (!task.deliveryDate || task.status === "done") return false;
    return new Date(task.deliveryDate) < new Date();
  };

  const handleSort = (field: "deliveryDate" | "shootDate") => {
    if (sortField === field) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc");
    } else {
      setSortField(field);
      setSortDirection("asc");
    }
  };

  if (tasks.length === 0) {
    return (
      <div className="text-center py-16 px-4 border rounded-lg" data-testid="empty-state">
        <div className="max-w-sm mx-auto">
          <div className="w-16 h-16 bg-muted rounded-full flex items-center justify-center mx-auto mb-4">
            <Pencil className="w-8 h-8 text-muted-foreground" />
          </div>
          <h3 className="text-lg font-semibold mb-2">No tasks yet</h3>
          <p className="text-sm text-muted-foreground">
            Create your first task to start managing your film production schedule.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-hidden">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">Project</TableHead>
            <TableHead 
              className="font-semibold cursor-pointer hover-elevate"
              onClick={() => handleSort("shootDate")}
              data-testid="header-shoot-date"
            >
              Production Date
            </TableHead>
            <TableHead 
              className="font-semibold cursor-pointer hover-elevate"
              onClick={() => handleSort("deliveryDate")}
              data-testid="header-delivery-date"
            >
              Delivery
            </TableHead>
            <TableHead className="font-semibold">Notes</TableHead>
            <TableHead className="font-semibold">Assignee</TableHead>
            <TableHead className="font-semibold">Work Type</TableHead>
            <TableHead className="font-semibold">Status</TableHead>
            <TableHead className="font-semibold">Tag</TableHead>
            <TableHead className="font-semibold text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => {
            const overdue = isOverdue(task);
            return (
              <TableRow
                key={task.id}
                className="hover-elevate transition-colors duration-150"
                data-testid={`task-row-${task.id}`}
              >
                <TableCell className="font-medium">{task.title}</TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  {task.shootDate || "-"}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground">
                  <div className="flex flex-col gap-0.5">
                    <span>{task.deliveryDate || "-"}</span>
                    {task.deliveryTime && (
                      <span className="text-xs">{task.deliveryTime}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-sm text-muted-foreground max-w-[200px]">
                  {task.notes ? (
                    <span className="line-clamp-2" title={task.notes}>
                      {task.notes}
                    </span>
                  ) : (
                    "-"
                  )}
                </TableCell>
                <TableCell>{task.assignee}</TableCell>
                <TableCell>
                  {task.workType === 'shoot' ? 'Γύρισμα' : 
                   task.workType === 'edit' ? 'Μοντάζ' : 
                   'Φόρτωμα'}
                </TableCell>
                <TableCell>
                  <Select
                    value={task.status}
                    onValueChange={(value) =>
                      onUpdateStatus(task.id, value as "todo" | "inprogress" | "done")
                    }
                  >
                    <SelectTrigger 
                      className="w-[140px] h-8 border-0 focus:ring-0 px-0"
                      data-testid={`select-status-${task.id}`}
                    >
                      <SelectValue asChild>
                        <StatusBadge status={task.status as any} isOverdue={overdue} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">To Do</SelectItem>
                      <SelectItem value="inprogress">In Progress</SelectItem>
                      <SelectItem value="done">Done</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge 
                    variant="outline" 
                    className={`font-mono text-xs ${
                      task.tag === 'newsit' 
                        ? 'bg-black text-white border-black dark:bg-black dark:text-white dark:border-white' 
                        : task.tag === 'zappit'
                        ? 'bg-purple-500 text-white border-purple-500 dark:bg-purple-600 dark:text-white dark:border-purple-400'
                        : 'bg-pink-500 text-white border-pink-500 dark:bg-pink-600 dark:text-white dark:border-pink-400'
                    }`}
                    data-testid={`badge-tag-${task.id}`}
                  >
                    {task.tag}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(task)}
                      data-testid={`button-edit-${task.id}`}
                      aria-label="Edit task"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    {userIsAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(task.id)}
                        data-testid={`button-delete-${task.id}`}
                        aria-label="Delete task"
                      >
                        <Trash2 className="w-4 h-4" />
                      </Button>
                    )}
                  </div>
                </TableCell>
              </TableRow>
            );
          })}
        </TableBody>
      </Table>
    </div>
  );
}
