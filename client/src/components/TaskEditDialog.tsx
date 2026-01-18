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
import type { Task } from "@shared/schema";
import { isAdmin } from "@shared/admin";

interface TaskEditDialogProps {
  task: Task | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSave: (taskId: string, updates: Partial<Task>) => void;
  isPending?: boolean;
  userEmail?: string | null;
}

const TEAM_MEMBERS = ["Δημήτρης", "Γιάννης", "Βασιλική"];
const TAGS = ["newsit", "tlife", "zappit"] as const;
const WORK_TYPES = [
  { value: "shoot", label: "Γύρισμα" },
  { value: "edit", label: "Μοντάζ" },
  { value: "upload", label: "Φόρτωμα" },
] as const;

export function TaskEditDialog({
  task,
  open,
  onOpenChange,
  onSave,
  isPending,
  userEmail,
}: TaskEditDialogProps) {
  const [title, setTitle] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [shootTime, setShootTime] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [notes, setNotes] = useState("");
  const [assignee, setAssignee] = useState("");
  const [workType, setWorkType] = useState<"shoot" | "edit" | "upload">("shoot");
  const [tag, setTag] = useState<"newsit" | "tlife" | "zappit">("tlife");
  
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
      const validWorkType = task.workType as "shoot" | "edit" | "upload" | undefined;
      setWorkType(validWorkType || "shoot");
      const validTag = task.tag as "newsit" | "tlife" | "zappit" | undefined;
      setTag(validTag || "tlife");
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
      tag,
    };
    
    // Only include assignee, shootTime, deliveryDate, and deliveryTime if user is admin
    if (userIsAdmin) {
      updates.assignee = assignee;
      updates.shootTime = shootTime || null;
      updates.deliveryDate = deliveryDate || null;
      updates.deliveryTime = deliveryTime || null;
    }

    onSave(task.id, updates);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]" data-testid="dialog-edit-task">
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

            <div className="grid grid-cols-3 gap-4">
              <div className="grid gap-2">
                <Label htmlFor="edit-assignee" className="text-sm font-semibold">
                  Assigned To {!userIsAdmin && <span className="text-xs text-muted-foreground">(Admin only)</span>}
                </Label>
                <Select value={assignee} onValueChange={setAssignee} disabled={!userIsAdmin}>
                  <SelectTrigger id="edit-assignee" data-testid="select-edit-assignee" className="h-10">
                    <SelectValue placeholder="—" />
                  </SelectTrigger>
                  <SelectContent>
                    {TEAM_MEMBERS.map((member) => (
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
                <Select value={workType} onValueChange={(value: "shoot" | "edit" | "upload") => setWorkType(value)}>
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

              <div className="grid gap-2">
                <Label htmlFor="edit-tag" className="text-sm font-semibold">
                  Tag
                </Label>
                <Select value={tag} onValueChange={(value: "newsit" | "tlife" | "zappit") => setTag(value)}>
                  <SelectTrigger id="edit-tag" data-testid="select-edit-tag" className="h-10">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {TAGS.map((t) => (
                      <SelectItem key={t} value={t}>
                        {t}
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
