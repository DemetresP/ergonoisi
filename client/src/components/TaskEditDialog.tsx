import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Clock } from "lucide-react";
import { useState, useEffect } from "react";
import type { Task, TaskFormat } from "@shared/schema";
import { isAdmin } from "@shared/admin";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { FORMATS, NO_SERIES, WORK_TYPES, type WorkType } from "@/lib/studio";

interface TaskEditDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
  isPending?: boolean;
  userEmail?: string | null;
  guestSuggestions?: string[];
}

// Keep a value that is no longer in the admin's list selectable (e.g. older tasks)
function withCurrent(list: string[], current: string) {
  return current && !list.includes(current) ? [...list, current] : list;
}

export function TaskEditDialog({
  task,
  open,
  onOpenChange,
  onSave,
  isPending,
  userEmail,
  guestSuggestions = [],
}: TaskEditDialogProps) {
  const { team, series: seriesList } = useStudioSettings();
  const [title, setTitle] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [shootTime, setShootTime] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [notes, setNotes] = useState("");
  const [assignee, setAssignee] = useState("");
  const [workType, setWorkType] = useState<WorkType>("shoot");
  const [format, setFormat] = useState<TaskFormat>("reel");
  const [series, setSeries] = useState(NO_SERIES);
  const [guest, setGuest] = useState("");

  const userIsAdmin = isAdmin(userEmail);

  useEffect(() => {
    if (task) {
      setTitle(task.title);
      setShootDate(task.shootDate || "");
      setShootTime(task.shootTime || "");
      setDeliveryDate(task.deliveryDate || "");
      setDeliveryTime(task.deliveryTime || "");
      setNotes(task.notes || "");
      setAssignee(task.assignee || "");
      setWorkType(task.workType || "shoot");
      setFormat(task.format || "reel");
      setSeries(task.series || NO_SERIES);
      setGuest(task.guest || "");
    }
  }, [task]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!task) return;

    // Build update data, excluding restricted fields for non-admin users
    const updates: any = {
      title,
      shootDate: shootDate || null,
      notes: notes || null,
      workType,
      format,
      series: series === NO_SERIES ? null : series,
      guest: guest.trim() || null,
    };

    // Only include assignee, shootTime, deliveryDate, and deliveryTime if user is admin
    if (userIsAdmin) {
      if (assignee) updates.assignee = assignee;
      updates.shootTime = shootTime || null;
      updates.deliveryDate = deliveryDate || null;
      updates.deliveryTime = deliveryTime || null;
    }

    onSave(task.id, updates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px] max-h-[90vh] overflow-y-auto" data-testid="dialog-edit-task">
        <DialogHeader>
          <DialogTitle>Edit Task</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6 py-4">
            <div className="grid gap-2">
              <Label htmlFor="edit-title" className="text-sm font-semibold">
                Project Title
              </Label>
              <Input
                id="edit-title"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                data-testid="input-edit-title"
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-format" className="text-sm font-semibold">
                  Μορφή
                </Label>
                <Select value={format} onValueChange={(value: TaskFormat) => setFormat(value)}>
                  <SelectTrigger id="edit-format" data-testid="select-edit-format" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-series" className="text-sm font-semibold">
                  Σειρά
                </Label>
                <Select value={series} onValueChange={setSeries}>
                  <SelectTrigger id="edit-series" data-testid="select-edit-series" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_SERIES}>—</SelectItem>
                    {withCurrent(seriesList, task?.series || "").map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-guest" className="text-sm font-semibold">
                Δημοσιογράφος / Καλεσμένος
              </Label>
              <Input
                id="edit-guest"
                list="edit-guest-suggestions"
                placeholder="π.χ. Μονεμβασιώτης"
                value={guest}
                onChange={(e) => setGuest(e.target.value)}
                data-testid="input-edit-guest"
                className="h-10"
              />
              <datalist id="edit-guest-suggestions">
                {guestSuggestions.map((g) => (
                  <option key={g} value={g} />
                ))}
              </datalist>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-shootDate" className="text-sm font-semibold">
                  <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Production Date
                </Label>
                <Input
                  id="edit-shootDate"
                  type="date"
                  value={shootDate}
                  onChange={(e) => setShootDate(e.target.value)}
                  data-testid="input-edit-shoot-date"
                  className="h-10 font-mono text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-shootTime" className="text-sm font-semibold">
                  <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Production Time {!userIsAdmin && <span className="text-xs text-muted-foreground">(Admin only)</span>}
                </Label>
                <Input
                  id="edit-shootTime"
                  type="text"
                  placeholder="HH:MM (e.g., 09:00)"
                  pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
                  value={shootTime}
                  onChange={(e) => setShootTime(e.target.value)}
                  data-testid="input-edit-shoot-time"
                  className="h-10 font-mono text-sm"
                  maxLength={5}
                  disabled={!userIsAdmin}
                />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-deliveryDate" className="text-sm font-semibold">
                  <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Delivery Date {!userIsAdmin && <span className="text-xs text-muted-foreground">(Admin only)</span>}
                </Label>
                <Input
                  id="edit-deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  data-testid="input-edit-delivery-date"
                  className="h-10 font-mono text-sm"
                  disabled={!userIsAdmin}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-deliveryTime" className="text-sm font-semibold">
                  <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Delivery Time {!userIsAdmin && <span className="text-xs text-muted-foreground">(Admin only)</span>}
                </Label>
                <Input
                  id="edit-deliveryTime"
                  type="text"
                  placeholder="HH:MM (e.g., 18:30)"
                  pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  data-testid="input-edit-delivery-time"
                  className="h-10 font-mono text-sm"
                  maxLength={5}
                  disabled={!userIsAdmin}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="edit-notes" className="text-sm font-semibold">
                Notes
              </Label>
              <Textarea
                id="edit-notes"
                placeholder="Add any additional notes or details about this project..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="input-edit-notes"
                className="min-h-[80px] resize-y"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-assignee" className="text-sm font-semibold">
                  Assigned To {!userIsAdmin && <span className="text-xs text-muted-foreground">(Admin only)</span>}
                </Label>
                <Select value={assignee} onValueChange={setAssignee} disabled={!userIsAdmin}>
                  <SelectTrigger id="edit-assignee" data-testid="select-edit-assignee" className="h-10">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {withCurrent(team, task?.assignee || "").map((member) => (
                      <SelectItem key={member} value={member}>
                        {member}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid gap-2">
                <Label htmlFor="edit-workType" className="text-sm font-semibold">
                  Είδος Εργασίας
                </Label>
                <Select value={workType} onValueChange={(value: WorkType) => setWorkType(value)}>
                  <SelectTrigger id="edit-workType" data-testid="select-edit-work-type" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {WORK_TYPES.map((type) => (
                      <SelectItem key={type.value} value={type.value}>
                        {type.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => onOpenChange(false)}
                data-testid="button-cancel-edit"
              >
                Cancel
              </Button>
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-save-edit"
              >
                Save Changes
              </Button>
            </div>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
