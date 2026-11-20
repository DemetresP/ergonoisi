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
import { Eye, History, Pencil, Trash2 } from "lucide-react";
import { StatusBadge } from "./StatusBadge";
import { FORMAT_LABELS, type Task } from "@shared/schema";
import { useState } from "react";
import { canChangeStatus, canEditTask, type TaskPermissionUser } from "@shared/permissions";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { FORMAT_BADGE_CLASSES, STATUS_LABELS, formatShortDate, getSeriesColor, getWorkTypeLabel } from "@/lib/studio";

type DateField = "shootDate" | "deliveryDate" | "publishDate";
// "next" orders by each task's earliest date (shoot, delivery or publish)
type SortField = DateField | "next";

const TIME_FIELDS: Record<DateField, "shootTime" | "deliveryTime" | "publishTime"> = {
  shootDate: "shootTime",
  deliveryDate: "deliveryTime",
  publishDate: "publishTime",
};

const NO_DATE = "9999-12-31 99:99";

// "2026-11-20 09:00"-style key so date and time sort together as text
function dateKey(task: Task, field: DateField) {
  const date = task[field];
  if (!date) return NO_DATE;
  return `${date} ${task[TIME_FIELDS[field]] || "00:00"}`;
}

function sortKey(task: Task, field: SortField) {
  if (field !== "next") return dateKey(task, field);
  return (["shootDate", "deliveryDate", "publishDate"] as const)
    .map((f) => dateKey(task, f))
    .reduce((earliest, key) => (key < earliest ? key : earliest), NO_DATE);
}

interface TaskTableProps {
  tasks: Task[];
  onUpdateStatus: (taskId: string, status: "todo" | "inprogress" | "done") => void;
  onEdit: (task: Task) => void;
  onDelete: (taskId: string) => void;
  onHistory: (task: Task) => void;
  permissionUser: TaskPermissionUser;
}

export function TaskTable({ tasks, onUpdateStatus, onEdit, onDelete, onHistory, permissionUser }: TaskTableProps) {
  const userIsAdmin = permissionUser.isAdmin;
  const { series: seriesList } = useStudioSettings();
  const [sortField, setSortField] = useState<SortField>("next");
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc");

  // Tasks without the date always go last, whichever direction
  const sortedTasks = [...tasks].sort((a, b) => {
    const aKey = sortKey(a, sortField);
    const bKey = sortKey(b, sortField);
    if (aKey === NO_DATE || bKey === NO_DATE) return aKey === bKey ? 0 : aKey === NO_DATE ? 1 : -1;
    const comparison = aKey.localeCompare(bKey);
    return sortDirection === "asc" ? comparison : -comparison;
  });

  const sortArrow = (field: SortField) => (sortField === field ? (sortDirection === "asc" ? " ↑" : " ↓") : "");

  const isOverdue = (task: Task) => {
    if (!task.deliveryDate || task.status === "done") return false;
    return new Date(task.deliveryDate) < new Date();
  };

  // Click a date column: ascending, then descending, then back to the default chronological order
  const handleSort = (field: DateField) => {
    if (sortField !== field) {
      setSortField(field);
      setSortDirection("asc");
    } else if (sortDirection === "asc") {
      setSortDirection("desc");
    } else {
      setSortField("next");
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
          <h3 className="text-lg font-semibold mb-2">Δεν υπάρχουν εργασίες</h3>
          <p className="text-sm text-muted-foreground">
            Πρόσθεσε την πρώτη εργασία ή φτιάξε το πρόγραμμα της εβδομάδας με AI.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="border rounded-lg overflow-x-auto">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead className="font-semibold">
              Εργασία
              {sortField === "next" && (
                <span className="ml-1 text-xs font-normal text-muted-foreground">(χρονολογικά)</span>
              )}
            </TableHead>
            <TableHead
              className="font-semibold cursor-pointer hover-elevate"
              onClick={() => handleSort("shootDate")}
              data-testid="header-shoot-date"
            >
              Γύρισμα{sortArrow("shootDate")}
            </TableHead>
            <TableHead
              className="font-semibold cursor-pointer hover-elevate"
              onClick={() => handleSort("deliveryDate")}
              data-testid="header-delivery-date"
            >
              Παράδοση{sortArrow("deliveryDate")}
            </TableHead>
            <TableHead
              className="font-semibold cursor-pointer hover-elevate"
              onClick={() => handleSort("publishDate")}
              data-testid="header-publish-date"
            >
              Δημοσίευση{sortArrow("publishDate")}
            </TableHead>
            <TableHead className="font-semibold">Σημειώσεις</TableHead>
            <TableHead className="font-semibold">Υπεύθυνος</TableHead>
            <TableHead className="font-semibold">Είδος</TableHead>
            <TableHead className="font-semibold">Κατάσταση</TableHead>
            <TableHead className="font-semibold">Μορφή</TableHead>
            <TableHead className="font-semibold text-right">
              <span className="sr-only">Ενέργειες</span>
            </TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {sortedTasks.map((task) => {
            const overdue = isOverdue(task);
            const editable = canEditTask(task, permissionUser);
            const statusEditable = canChangeStatus(task, permissionUser);
            return (
              <TableRow
                key={task.id}
                className="hover-elevate transition-colors duration-150"
                data-testid={`task-row-${task.id}`}
              >
                <TableCell>
                  <div className="font-medium">{task.title}</div>
                  {(task.series || task.guest) && (
                    <div className="flex flex-wrap items-center gap-1.5 mt-1">
                      {task.series && (
                        <Badge
                          variant="outline"
                          className={`text-[10px] px-1.5 py-0 ${getSeriesColor(task.series, seriesList)}`}
                        >
                          {task.series}
                        </Badge>
                      )}
                      {task.guest && (
                        <span className="text-xs text-muted-foreground">με {task.guest}</span>
                      )}
                    </div>
                  )}
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <span>{formatShortDate(task.shootDate) || "-"}</span>
                    {task.shootTime && (
                      <span className="text-xs">{task.shootTime}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <span>{formatShortDate(task.deliveryDate) || "-"}</span>
                    {task.deliveryTime && (
                      <span className="text-xs">{task.deliveryTime}</span>
                    )}
                  </div>
                </TableCell>
                <TableCell className="font-mono text-sm text-muted-foreground whitespace-nowrap">
                  <div className="flex flex-col gap-0.5">
                    <span>{formatShortDate(task.publishDate) || "-"}</span>
                    {task.publishTime && (
                      <span className="text-xs">{task.publishTime}</span>
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
                  {getWorkTypeLabel(task.workType)}
                </TableCell>
                <TableCell>
                  <Select
                    value={task.status}
                    onValueChange={(value) =>
                      onUpdateStatus(task.id, value as "todo" | "inprogress" | "done")
                    }
                    disabled={!statusEditable}
                  >
                    <SelectTrigger
                      className="w-[160px] h-8 border-0 focus:ring-0 px-0 disabled:opacity-100 disabled:cursor-default"
                      title={statusEditable ? undefined : "Μόνο ο υπεύθυνος αλλάζει την κατάσταση"}
                      data-testid={`select-status-${task.id}`}
                    >
                      <SelectValue asChild>
                        <StatusBadge status={task.status as any} isOverdue={overdue} />
                      </SelectValue>
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="todo">{STATUS_LABELS.todo}</SelectItem>
                      <SelectItem value="inprogress">{STATUS_LABELS.inprogress}</SelectItem>
                      <SelectItem value="done">{STATUS_LABELS.done}</SelectItem>
                    </SelectContent>
                  </Select>
                </TableCell>
                <TableCell>
                  <Badge
                    variant="outline"
                    className={`text-xs ${FORMAT_BADGE_CLASSES[task.format]}`}
                    data-testid={`badge-format-${task.id}`}
                  >
                    {FORMAT_LABELS[task.format]}
                  </Badge>
                </TableCell>
                <TableCell className="text-right">
                  <div className="flex items-center justify-end gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEdit(task)}
                      data-testid={`button-edit-${task.id}`}
                      aria-label={editable ? "Επεξεργασία" : "Προβολή"}
                    >
                      {editable ? <Pencil className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </Button>
                    {userIsAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onHistory(task)}
                        data-testid={`button-history-${task.id}`}
                        aria-label="Ιστορικό"
                      >
                        <History className="w-4 h-4" />
                      </Button>
                    )}
                    {userIsAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onDelete(task.id)}
                        data-testid={`button-delete-${task.id}`}
                        aria-label="Μεταφορά στον κάδο"
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
