import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { FORMAT_LABELS, type Task, type TaskHistoryEntry } from "@shared/schema";
import { STATUS_LABELS, WORK_TYPES } from "@/lib/studio";

interface TaskHistoryDialogProps {
  task: Task | null;
  onOpenChange: (open: boolean) => void;
}

const FIELD_LABELS: Record<string, string> = {
  title: "Τίτλος",
  shootDate: "Ημ. γυρίσματος",
  shootTime: "Ώρα γυρίσματος",
  deliveryDate: "Ημ. παράδοσης",
  deliveryTime: "Ώρα παράδοσης",
  publishDate: "Ημ. δημοσίευσης",
  publishTime: "Ώρα δημοσίευσης",
  notes: "Σημειώσεις",
  assignee: "Υπεύθυνος",
  workType: "Είδος εργασίας",
  status: "Κατάσταση",
  format: "Μορφή",
  series: "Σειρά",
  guest: "Καλεσμένος",
};

const ACTION_LABELS: Record<TaskHistoryEntry["action"], string> = {
  create: "δημιούργησε την εργασία",
  update: "άλλαξε",
  delete: "τη μετέφερε στον κάδο",
  restore: "την επανέφερε από τον κάδο",
};

function formatValue(field: string, value: unknown) {
  if (value === null || value === undefined) return "—";
  const str = String(value);
  if (field === "status") return STATUS_LABELS[str as keyof typeof STATUS_LABELS] ?? str;
  if (field === "workType") return WORK_TYPES.find((t) => t.value === str)?.label ?? str;
  if (field === "format") return FORMAT_LABELS[str as keyof typeof FORMAT_LABELS] ?? str;
  return str;
}

export function TaskHistoryDialog({ task, onOpenChange }: TaskHistoryDialogProps) {
  const { data: history = [], isLoading } = useQuery<TaskHistoryEntry[]>({
    queryKey: ["/api/tasks", task?.id, "history"],
    enabled: Boolean(task),
  });

  return (
    <Dialog open={Boolean(task)} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto" data-testid="dialog-task-history">
        <DialogHeader>
          <DialogTitle>Ιστορικό</DialogTitle>
          <DialogDescription>{task?.title}</DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Φόρτωση...</p>
        ) : history.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">
            Δεν υπάρχει καταγεγραμμένο ιστορικό. Οι αλλαγές καταγράφονται από τώρα και στο εξής.
          </p>
        ) : (
          <ol className="space-y-4 py-2">
            {history.map((entry) => (
              <li key={entry.id} className="border-l-2 pl-3" data-testid={`history-entry-${entry.id}`}>
                <div className="text-xs font-mono text-muted-foreground">
                  {format(parseISO(entry.at), "dd/MM/yyyy HH:mm")}
                </div>
                <div className="text-sm">
                  <span className="font-semibold" title={entry.byEmail}>
                    {entry.byName}
                  </span>{" "}
                  {ACTION_LABELS[entry.action]}
                </div>
                {entry.changes.length > 0 && (
                  <ul className="mt-1 space-y-0.5 text-sm">
                    {entry.changes.map((change) => (
                      <li key={change.field}>
                        <span className="text-muted-foreground">{FIELD_LABELS[change.field] ?? change.field}:</span>{" "}
                        <span className="line-through text-muted-foreground">{formatValue(change.field, change.from)}</span>
                        {" → "}
                        <span className="font-medium">{formatValue(change.field, change.to)}</span>
                      </li>
                    ))}
                  </ul>
                )}
              </li>
            ))}
          </ol>
        )}
      </DialogContent>
    </Dialog>
  );
}
