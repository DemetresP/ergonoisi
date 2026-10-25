import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useAuth } from "@/hooks/useAuth";
import { queryClient, apiRequest } from "@/lib/queryClient";
import { useToast } from "@/hooks/use-toast";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Textarea } from "@/components/ui/textarea";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Calendar, Download, Upload, LogOut, LayoutList, CalendarDays, Sparkles, Settings, Trash2 } from "lucide-react";
import * as XLSX from "xlsx";
import { TaskForm } from "@/components/TaskForm";
import { TaskTable } from "@/components/TaskTable";
import { WorkloadOverview } from "@/components/WorkloadOverview";
import { TaskEditDialog } from "@/components/TaskEditDialog";
import { CalendarView } from "@/components/CalendarView";
import { StudioSettingsDialog } from "@/components/StudioSettingsDialog";
import { ThemeToggle } from "@/components/ThemeToggle";
import { TaskHistoryDialog } from "@/components/TaskHistoryDialog";
import { TrashDialog } from "@/components/TrashDialog";
import { FORMAT_LABELS, type Task } from "@shared/schema";
import { canEditTask, type TaskPermissionUser } from "@shared/permissions";
import { isUnauthorizedError } from "@/lib/authUtils";
import { firebaseLogout } from "@/lib/firebaseAuth";
import { useStudioSettings } from "@/hooks/useStudioSettings";
import { FORMATS, STATUS_LABELS, getWorkTypeLabel } from "@/lib/studio";

const ALL = "__all__";
// Calendar is the default view; the last choice is remembered per device
const VIEW_MODE_KEY = "dashboardViewMode";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const { series: seriesList } = useStudioSettings();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [isTrashOpen, setIsTrashOpen] = useState(false);
  const [historyTask, setHistoryTask] = useState<Task | null>(null);
  const [viewMode, setViewModeState] = useState<"table" | "calendar">(() => {
    try {
      return localStorage.getItem(VIEW_MODE_KEY) === "table" ? "table" : "calendar";
    } catch {
      return "calendar";
    }
  });
  const setViewMode = (mode: "table" | "calendar") => {
    setViewModeState(mode);
    try {
      localStorage.setItem(VIEW_MODE_KEY, mode);
    } catch {
      // ignore
    }
  };
  const [aiScheduleText, setAiScheduleText] = useState("");
  const [formatFilter, setFormatFilter] = useState(ALL);
  const [seriesFilter, setSeriesFilter] = useState(ALL);

  const handleLogout = async () => {
    try {
      await firebaseLogout();
    } finally {
      queryClient.removeQueries({ queryKey: ["/api/auth/user"] });
      queryClient.removeQueries({ queryKey: ["/api/tasks"] });
      window.location.href = "/";
    }
  };

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const permissionUser: TaskPermissionUser = {
    uid: user?.id ?? "",
    isAdmin: Boolean(user?.isAdmin),
    memberName: user?.memberName ?? undefined,
  };

  const filteredTasks = tasks.filter(
    (task) =>
      (formatFilter === ALL || task.format === formatFilter) &&
      (seriesFilter === ALL || task.series === seriesFilter),
  );

  const guestSuggestions = Array.from(
    new Set(tasks.map((task) => task.guest).filter((guest): guest is string => Boolean(guest))),
  ).sort((a, b) => a.localeCompare(b, "el"));

  const createTask = useMutation({
    mutationFn: async (taskData: any) => {
      return await apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Η εργασία προστέθηκε",
        description: "Η νέα εργασία είναι στη λίστα.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Αποσυνδέθηκες",
          description: "Συνδέσου ξανά για να συνεχίσεις.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Σφάλμα",
        description: "Η εργασία δεν προστέθηκε. Δοκίμασε ξανά.",
        variant: "destructive",
      });
    },
  });

  const updateTask = useMutation({
    mutationFn: async ({ id, updates }: { id: string; updates: Partial<Task> }) => {
      return await apiRequest("PATCH", `/api/tasks/${id}`, updates);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setIsEditDialogOpen(false);
      setEditingTask(null);
      toast({
        title: "Αποθηκεύτηκε",
        description: "Οι αλλαγές σου αποθηκεύτηκαν.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Αποσυνδέθηκες",
          description: "Συνδέσου ξανά για να συνεχίσεις.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      toast({
        title: "Σφάλμα",
        description: error.message.startsWith("403")
          ? "Δεν έχεις δικαίωμα για αυτή την αλλαγή."
          : "Η αλλαγή δεν αποθηκεύτηκε. Δοκίμασε ξανά.",
        variant: "destructive",
      });
    },
  });

  const deleteTask = useMutation({
    mutationFn: async (id: string) => {
      return await apiRequest("DELETE", `/api/tasks/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Στον κάδο",
        description: "Η εργασία μεταφέρθηκε στον κάδο και μπορεί να επανέλθει.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Αποσυνδέθηκες",
          description: "Συνδέσου ξανά για να συνεχίσεις.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }

      if (error.message?.includes("404") || error.message?.includes("not found")) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({
          title: "Στον κάδο",
          description: "Η εργασία είχε ήδη αφαιρεθεί.",
        });
        return;
      }

      toast({
        title: "Σφάλμα",
        description: "Η διαγραφή απέτυχε. Δοκίμασε ξανά.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    const exportData = tasks.map((task) => ({
      "Τίτλος": task.title,
      "Ημ. γυρίσματος": task.shootDate || "",
      "Ώρα γυρίσματος": task.shootTime || "",
      "Ημ. παράδοσης": task.deliveryDate || "",
      "Ώρα παράδοσης": task.deliveryTime || "",
      "Ημ. δημοσίευσης": task.publishDate || "",
      "Ώρα δημοσίευσης": task.publishTime || "",
      "Υπεύθυνος": task.assignee || "",
      "Είδος": getWorkTypeLabel(task.workType),
      "Κατάσταση": STATUS_LABELS[task.status],
      "Μορφή": FORMAT_LABELS[task.format],
      "Σειρά": task.series || "",
      "Καλεσμένος": task.guest || "",
      "Σημειώσεις": task.notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Εργασίες");

    const fileName = `athenai-tasks-${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);

    toast({
      title: "Έγινε εξαγωγή",
      description: "Οι εργασίες αποθηκεύτηκαν σε Excel.",
    });
  };

  const handleImport = () => {
    const input = document.createElement("input");
    input.type = "file";
    input.accept = ".xlsx, .xls";
    input.onchange = async (e) => {
      const file = (e.target as HTMLInputElement).files?.[0];
      if (!file) return;

      try {
        const arrayBuffer = await file.arrayBuffer();
        const workbook = XLSX.read(arrayBuffer, { type: "array" });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const importedData = XLSX.utils.sheet_to_json(worksheet) as any[];

        if (!Array.isArray(importedData) || importedData.length === 0) {
          throw new Error("Invalid Excel format");
        }

        // First non-empty column among the Greek header and older English ones
        const pick = (row: any, ...keys: string[]) => {
          for (const key of keys) {
            if (row[key] !== undefined && row[key] !== "") return String(row[key]);
          }
          return null;
        };

        const parseWorkType = (value: string | null): "shoot" | "edit" | "upload" => {
          const str = (value || "").toLowerCase();
          if (str.includes("μοντάζ") || str === "edit") return "edit";
          if (str.includes("φόρτωμα") || str === "upload") return "upload";
          return "shoot";
        };

        const parseStatus = (value: string | null): "todo" | "inprogress" | "done" => {
          const str = (value || "").toLowerCase();
          if (str === "done" || str.includes("ολοκληρ")) return "done";
          if (str === "inprogress" || str.includes("εξέλιξη")) return "inprogress";
          return "todo";
        };

        for (const row of importedData) {
          await createTask.mutateAsync({
            title: pick(row, "Τίτλος", "Title", "title"),
            shootDate: pick(row, "Ημ. γυρίσματος", "Production Date", "Shoot Date", "shootDate"),
            shootTime: pick(row, "Ώρα γυρίσματος", "shootTime"),
            deliveryDate: pick(row, "Ημ. παράδοσης", "Delivery Date", "deliveryDate"),
            deliveryTime: pick(row, "Ώρα παράδοσης", "Delivery Time", "deliveryTime"),
            publishDate: pick(row, "Ημ. δημοσίευσης", "publishDate"),
            publishTime: pick(row, "Ώρα δημοσίευσης", "publishTime"),
            notes: pick(row, "Σημειώσεις", "Notes", "notes"),
            assignee: pick(row, "Υπεύθυνος", "Assignee", "assignee") || undefined,
            workType: parseWorkType(pick(row, "Είδος", "Work Type", "workType")),
            status: parseStatus(pick(row, "Κατάσταση", "Status", "status")),
            format: (pick(row, "Μορφή", "Format", "format") || "").toLowerCase().includes("podcast") ? "podcast" : "reel",
            series: pick(row, "Σειρά", "Series", "series"),
            guest: pick(row, "Καλεσμένος", "Guest", "guest"),
          });
        }

        toast({
          title: "Έγινε εισαγωγή",
          description: `Προστέθηκαν ${importedData.length} εργασίες.`,
        });
      } catch (error) {
        toast({
          title: "Η εισαγωγή απέτυχε",
          description: "Μη έγκυρο αρχείο. Έλεγξε το Excel.",
          variant: "destructive",
        });
      }
    };
    input.click();
  };

  const generateTasksWithAI = useMutation({
    mutationFn: async (scheduleText: string) => {
      const res = await apiRequest("POST", "/api/tasks/ai-generate", { scheduleText });
      return await res.json() as Task[];
    },
    onSuccess: (data: Task[]) => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      setAiScheduleText("");
      toast({
        title: "Το πρόγραμμα δημιουργήθηκε",
        description: `Προστέθηκαν ${data.length} εργασίες από το πρόγραμμά σου.`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Αποσυνδέθηκες",
          description: "Συνδέσου ξανά για να συνεχίσεις.",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/";
        }, 500);
        return;
      }
      console.error("AI generation error:", error);
      toast({
        title: "Σφάλμα",
        description: error.message || "Το AI δεν μπόρεσε να φτιάξει το πρόγραμμα. Δοκίμασε ξανά.",
        variant: "destructive",
      });
    },
  });

  const handleAIGenerate = () => {
    if (!aiScheduleText.trim()) {
      toast({
        title: "Κενό κείμενο",
        description: "Γράψε πρώτα το πρόγραμμα της εβδομάδας.",
        variant: "destructive",
      });
      return;
    }
    generateTasksWithAI.mutate(aiScheduleText);
  };

  const getUserInitials = () => {
    if (!user) return "U";
    const firstName = user.firstName || "";
    const lastName = user.lastName || "";
    return `${firstName.charAt(0)}${lastName.charAt(0)}`.toUpperCase() || "U";
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="border-b sticky top-0 bg-background z-50">
        <div className="max-w-7xl mx-auto px-4 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-zinc-900 dark:bg-zinc-800 rounded-md flex items-center justify-center">
              <Calendar className="w-5 h-5 text-brand" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">athenai.gr</h1>
          </div>

          <div className="flex items-center gap-1">
          <ThemeToggle />
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.email || "User"} />
                  <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <span className="text-sm hidden md:inline-block">{user?.email || "Χρήστης"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {user?.firstName || user?.lastName
                      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                      : "Χρήστης"}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              {user?.isAdmin && (
                <>
                  <DropdownMenuItem
                    onSelect={() => setIsSettingsOpen(true)}
                    className="cursor-pointer"
                    data-testid="button-studio-settings"
                  >
                    <Settings className="mr-2 h-4 w-4" />
                    Ρυθμίσεις studio
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onSelect={() => setIsTrashOpen(true)}
                    className="cursor-pointer"
                    data-testid="button-trash"
                  >
                    <Trash2 className="mr-2 h-4 w-4" />
                    Κάδος
                  </DropdownMenuItem>
                </>
              )}
              <DropdownMenuItem
                onSelect={(e) => {
                  e.preventDefault();
                  handleLogout();
                }}
                className="cursor-pointer"
                data-testid="button-logout"
              >
                <LogOut className="mr-2 h-4 w-4" />
                Αποσύνδεση
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-4 md:px-8 py-6 md:py-8">
        <div className="mb-6">
          <h2 className="text-2xl md:text-3xl font-bold tracking-tight mb-2">
            Πρόγραμμα Παραγωγής
          </h2>
          <p className="text-muted-foreground">
            Οργάνωσε τις εργασίες και τη ροή της ομάδας παραγωγής σου
          </p>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg font-semibold flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-brand" />
                Φτιάξε πρόγραμμα με AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder='π.χ. "Τρίτη 11:00 γύρισμα οικονομικό reel με Μονεμβασιώτη, μοντάζ Τετάρτη, ανέβασμα Πέμπτη"'
                value={aiScheduleText}
                onChange={(e) => setAiScheduleText(e.target.value)}
                className="min-h-24"
                data-testid="input-ai-schedule"
              />
              <Button
                onClick={handleAIGenerate}
                disabled={generateTasksWithAI.isPending || !aiScheduleText.trim()}
                className="gap-2"
                data-testid="button-ai-generate"
              >
                <Sparkles className="w-4 h-4" />
                {generateTasksWithAI.isPending ? "Επεξεργασία..." : "Φτιάξε το πρόγραμμα με AI"}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader className="flex flex-row flex-wrap items-center justify-between gap-4 space-y-0 pb-4">
              <div className="flex flex-wrap items-center gap-3">
                <CardTitle className="text-lg font-semibold">Εργασίες</CardTitle>
                <Select value={formatFilter} onValueChange={setFormatFilter}>
                  <SelectTrigger className="h-9 w-[130px]" data-testid="filter-format">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Όλες οι μορφές</SelectItem>
                    {FORMATS.map((f) => (
                      <SelectItem key={f.value} value={f.value}>
                        {f.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <Select value={seriesFilter} onValueChange={setSeriesFilter}>
                  <SelectTrigger className="h-9 w-[150px]" data-testid="filter-series">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={ALL}>Όλες οι σειρές</SelectItem>
                    {seriesList.map((s) => (
                      <SelectItem key={s} value={s}>
                        {s}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="flex flex-wrap gap-2">
                <div className="flex rounded-md border">
                  <Button
                    variant={viewMode === "table" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("table")}
                    data-testid="button-view-table"
                    className="rounded-r-none"
                  >
                    <LayoutList className="w-4 h-4" />
                  </Button>
                  <Button
                    variant={viewMode === "calendar" ? "default" : "ghost"}
                    size="icon"
                    onClick={() => setViewMode("calendar")}
                    data-testid="button-view-calendar"
                    className="rounded-l-none"
                  >
                    <CalendarDays className="w-4 h-4" />
                  </Button>
                </div>
                <Button
                  variant="outline"
                  onClick={handleExport}
                  disabled={tasks.length === 0}
                  data-testid="button-export"
                  className="gap-2"
                >
                  <Download className="w-4 h-4" />
                  Εξαγωγή
                </Button>
                <Button
                  variant="outline"
                  onClick={handleImport}
                  data-testid="button-import"
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Εισαγωγή
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Φόρτωση εργασιών...
                </div>
              ) : viewMode === "table" ? (
                <TaskTable
                  tasks={filteredTasks}
                  onUpdateStatus={(taskId, status) =>
                    updateTask.mutate({ id: taskId, updates: { status } })
                  }
                  onEdit={(task) => {
                    setEditingTask(task);
                    setIsEditDialogOpen(true);
                  }}
                  onDelete={(taskId) => deleteTask.mutate(taskId)}
                  onHistory={setHistoryTask}
                  permissionUser={permissionUser}
                />
              ) : (
                <CalendarView
                  tasks={filteredTasks}
                  onTaskClick={(task) => {
                    setEditingTask(task);
                    setIsEditDialogOpen(true);
                  }}
                />
              )}
            </CardContent>
          </Card>

          {tasks.length > 0 && <WorkloadOverview tasks={tasks} />}

          <TaskForm
            onSubmit={(taskData) => createTask.mutate(taskData)}
            isPending={createTask.isPending}
            userEmail={user?.email}
            guestSuggestions={guestSuggestions}
          />
        </div>
      </main>

      <TaskEditDialog
        task={editingTask}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={(taskId, updates) => updateTask.mutate({ id: taskId, updates })}
        isPending={updateTask.isPending}
        userEmail={user?.email}
        guestSuggestions={guestSuggestions}
        readOnly={editingTask ? !canEditTask(editingTask, permissionUser) : false}
      />

      <StudioSettingsDialog open={isSettingsOpen} onOpenChange={setIsSettingsOpen} />
      <TrashDialog open={isTrashOpen} onOpenChange={setIsTrashOpen} />
      <TaskHistoryDialog task={historyTask} onOpenChange={(open) => !open && setHistoryTask(null)} />
    </div>
  );
}
