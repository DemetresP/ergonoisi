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
import { Card, CardContent } from "@/components/ui/card";
import { Calendar, Plus, Clock } from "lucide-react";
import { useState } from "react";
import { isAdmin } from "@shared/admin";

interface TaskFormProps {
  onSubmit: (task: {
    title: string;
    shootDate: string;
    deliveryDate: string;
    deliveryTime: string;
    notes: string;
    assignee: string;
    workType: "shoot" | "edit" | "upload";
    tag: "newsit" | "tlife" | "zappit";
  }) => void;
  isPending?: boolean;
  userEmail?: string | null;
}

const TEAM_MEMBERS = ["Δημήτρης", "Ντίνος", "Χρυσάνθη"];
const TAGS = ["newsit", "tlife", "zappit"] as const;
const WORK_TYPES = [
  { value: "shoot", label: "Γύρισμα" },
  { value: "edit", label: "Μοντάζ" },
  { value: "upload", label: "Φόρτωμα" },
] as const;

export function TaskForm({ onSubmit, isPending, userEmail }: TaskFormProps) {
  const userIsAdmin = isAdmin(userEmail);
  
  const [title, setTitle] = useState("");
  const [shootDate, setShootDate] = useState("");
  const [shootTime, setShootTime] = useState("");
  const [deliveryDate, setDeliveryDate] = useState("");
  const [deliveryTime, setDeliveryTime] = useState("");
  const [notes, setNotes] = useState("");
  const [assignee, setAssignee] = useState(userIsAdmin ? TEAM_MEMBERS[0] : "");
  const [workType, setWorkType] = useState<"shoot" | "edit" | "upload">("shoot");
  const [tag, setTag] = useState<"newsit" | "tlife" | "zappit">("tlife");

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    
    // Build task data, excluding restricted fields for non-admin users
    const taskData: any = {
      title,
      shootDate,
      notes,
      workType,
      tag,
    };
    
    // Only include assignee, shootTime, deliveryDate, and deliveryTime if user is admin
    if (userIsAdmin) {
      taskData.assignee = assignee;
      taskData.shootTime = shootTime;
      taskData.deliveryDate = deliveryDate;
      taskData.deliveryTime = deliveryTime;
    }
    
    onSubmit(taskData);
    
    // Reset form
    setTitle("");
    setShootDate("");
    setShootTime("");
    setDeliveryDate("");
    setDeliveryTime("");
    setNotes("");
    setAssignee(userIsAdmin ? TEAM_MEMBERS[0] : "");
    setWorkType("shoot");
    setTag("tlife");
  };

  return (
    <Card>
      <CardContent className="p-6">
        <form onSubmit={handleSubmit}>
          <div className="grid gap-6">
            <div className="grid gap-2">
              <Label htmlFor="title" className="text-sm font-semibold">
                Project Title
              </Label>
              <Input
                id="title"
                placeholder="e.g., Shoot with Tasos"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
                data-testid="input-title"
                className="h-10"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="shootDate" className="text-sm font-semibold">
                  <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Production Date
                </Label>
                <Input
                  id="shootDate"
                  type="date"
                  value={shootDate}
                  onChange={(e) => setShootDate(e.target.value)}
                  data-testid="input-shoot-date"
                  className="h-10 font-mono text-sm"
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="shootTime" className="text-sm font-semibold">
                  <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Production Time {!userIsAdmin && <span className="text-xs text-muted-foreground">(Admin only)</span>}
                </Label>
                <Input
                  id="shootTime"
                  type="text"
                  placeholder="HH:MM (e.g., 09:00)"
                  pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
                  value={shootTime}
                  onChange={(e) => setShootTime(e.target.value)}
                  data-testid="input-shoot-time"
                  className="h-10 font-mono text-sm"
                  maxLength={5}
                  disabled={!userIsAdmin}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="deliveryDate" className="text-sm font-semibold">
                  <Calendar className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Delivery Date {!userIsAdmin && <span className="text-xs text-muted-foreground">(Admin only)</span>}
                </Label>
                <Input
                  id="deliveryDate"
                  type="date"
                  value={deliveryDate}
                  onChange={(e) => setDeliveryDate(e.target.value)}
                  data-testid="input-delivery-date"
                  className="h-10 font-mono text-sm"
                  disabled={!userIsAdmin}
                />
              </div>

              <div className="grid gap-2">
                <Label htmlFor="deliveryTime" className="text-sm font-semibold">
                  <Clock className="w-4 h-4 inline mr-1.5 -mt-0.5" />
                  Delivery Time {!userIsAdmin && <span className="text-xs text-muted-foreground">(Admin only)</span>}
                </Label>
                <Input
                  id="deliveryTime"
                  type="text"
                  placeholder="HH:MM (e.g., 18:30)"
                  pattern="([01]?[0-9]|2[0-3]):[0-5][0-9]"
                  value={deliveryTime}
                  onChange={(e) => setDeliveryTime(e.target.value)}
                  data-testid="input-delivery-time"
                  className="h-10 font-mono text-sm"
                  maxLength={5}
                  disabled={!userIsAdmin}
                />
              </div>
            </div>

            <div className="grid gap-2">
              <Label htmlFor="notes" className="text-sm font-semibold">
                Notes
              </Label>
              <Textarea
                id="notes"
                placeholder="Add any additional notes or details about this project..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                data-testid="input-notes"
                className="min-h-[80px] resize-y"
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="grid gap-2">
                <Label htmlFor="assignee" className="text-sm font-semibold">
                  Assigned To {!userIsAdmin && <span className="text-xs text-muted-foreground">(Admin only)</span>}
                </Label>
                <Select value={assignee} onValueChange={setAssignee} disabled={!userIsAdmin}>
                  <SelectTrigger id="assignee" data-testid="select-assignee" className="h-10">
                    <SelectValue placeholder={!userIsAdmin ? "—" : "Select assignee"} />
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
                <Label htmlFor="workType" className="text-sm font-semibold">
                  Είδος Εργασίας
                </Label>
                <Select value={workType} onValueChange={(value: "shoot" | "edit" | "upload") => setWorkType(value)}>
                  <SelectTrigger id="workType" data-testid="select-work-type" className="h-10">
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
                <Label htmlFor="tag" className="text-sm font-semibold">
                  Tag
                </Label>
                <Select value={tag} onValueChange={(value: "newsit" | "tlife" | "zappit") => setTag(value)}>
                  <SelectTrigger id="tag" data-testid="select-tag" className="h-10">
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

            <div className="flex justify-end">
              <Button
                type="submit"
                disabled={isPending}
                data-testid="button-add-task"
                className="gap-2"
              >
                <Plus className="w-4 h-4" />
                Add Task
              </Button>
            </div>
          </div>
        </form>
      </CardContent>
    </Card>
  );
}
