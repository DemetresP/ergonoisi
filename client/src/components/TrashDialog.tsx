import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { useMutation, useQuery } from "@tanstack/react-query";
import { format, parseISO } from "date-fns";
import { RotateCcw } from "lucide-react";
import type { Task } from "@shared/schema";
import { apiRequest, queryClient } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { ConfirmDeleteButton } from "./ConfirmDeleteButton";

interface TrashDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function TrashDialog({ open, onOpenChange }: TrashDialogProps) {
  const { toast } = useToast();
  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks/trash"],
    enabled: open,
  });

  const restore = useMutation({
    mutationFn: async (id: string) => apiRequest("POST", `/api/tasks/${id}/restore`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/trash"] });
      toast({ title: "Επαναφέρθηκε", description: "Η εργασία επέστρεψε στη λίστα." });
    },
    onError: () => {
      toast({ title: "Σφάλμα", description: "Η επαναφορά απέτυχε.", variant: "destructive" });
    },
  });

  const removeForever = useMutation({
    mutationFn: async (id: string) => apiRequest("DELETE", `/api/tasks/${id}/permanent`),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks/trash"] });
      toast({ title: "Διαγράφηκε οριστικά", description: "Η εργασία σβήστηκε για πάντα." });
    },
    onError: () => {
      toast({ title: "Σφάλμα", description: "Η οριστική διαγραφή απέτυχε.", variant: "destructive" });
    },
  });

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[560px] max-h-[85vh] overflow-y-auto" data-testid="dialog-trash">
        <DialogHeader>
          <DialogTitle>Κάδος</DialogTitle>
          <DialogDescription>
            Οι διαγραμμένες εργασίες μένουν εδώ και μπορούν να επανέλθουν. Το «Οριστικά» τις σβήνει για πάντα.
          </DialogDescription>
        </DialogHeader>
        {isLoading ? (
          <p className="text-sm text-muted-foreground py-4">Φόρτωση...</p>
        ) : tasks.length === 0 ? (
          <p className="text-sm text-muted-foreground py-4">Ο κάδος είναι άδειος.</p>
        ) : (
          <ul className="divide-y">
            {tasks.map((task) => (
              <li key={task.id} className="flex items-center justify-between gap-4 py-3">
                <div className="min-w-0">
                  <div className="font-medium truncate">{task.title}</div>
                  {task.deletedAt && (
                    <div className="text-xs text-muted-foreground">
                      {format(parseISO(task.deletedAt), "dd/MM/yyyy HH:mm")}
                      {task.deletedBy ? ` · ${task.deletedBy}` : ""}
                    </div>
                  )}
                </div>
                <div className="flex flex-wrap justify-end gap-2 shrink-0">
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1.5"
                    onClick={() => restore.mutate(task.id)}
                    disabled={restore.isPending}
                    data-testid={`button-restore-${task.id}`}
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    Επαναφορά
                  </Button>
                  <ConfirmDeleteButton
                    size="sm"
                    label="Οριστικά"
                    title="Οριστική διαγραφή;"
                    description={`Η «${task.title}» και το ιστορικό της θα σβηστούν για πάντα. Αυτό δεν αναιρείται.`}
                    confirmLabel="Διαγραφή για πάντα"
                    onConfirm={() => removeForever.mutate(task.id)}
                    disabled={removeForever.isPending}
                    testId={`button-delete-forever-${task.id}`}
                  />
                </div>
              </li>
            ))}
          </ul>
        )}
      </DialogContent>
    </Dialog>
  );
}
