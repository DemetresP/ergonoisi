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
import { Calendar, Download, Upload, LogOut, LayoutList, CalendarDays, Sparkles } from "lucide-react";
import * as XLSX from "xlsx";
import { TaskForm } from "@/components/TaskForm";
import { TaskTable } from "@/components/TaskTable";
import { WorkloadOverview } from "@/components/WorkloadOverview";
import { TaskEditDialog } from "@/components/TaskEditDialog";
import { CalendarView } from "@/components/CalendarView";
import type { Task } from "@shared/schema";
import { isUnauthorizedError } from "@/lib/authUtils";

export default function Dashboard() {
  const { user } = useAuth();
  const { toast } = useToast();
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false);
  const [viewMode, setViewMode] = useState<"table" | "calendar">("table");
  const [aiScheduleText, setAiScheduleText] = useState("");

  const { data: tasks = [], isLoading } = useQuery<Task[]>({
    queryKey: ["/api/tasks"],
  });

  const createTask = useMutation({
    mutationFn: async (taskData: any) => {
      return await apiRequest("POST", "/api/tasks", taskData);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
      toast({
        title: "Task created",
        description: "Your task has been added successfully.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to create task. Please try again.",
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
        title: "Task updated",
        description: "Your changes have been saved.",
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      toast({
        title: "Error",
        description: "Failed to update task. Please try again.",
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
        title: "Task deleted",
        description: "The task has been removed.",
      });
    },
    onError: (error: any) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      
      if (error.message?.includes("404") || error.message?.includes("not found")) {
        queryClient.invalidateQueries({ queryKey: ["/api/tasks"] });
        toast({
          title: "Task deleted",
          description: "The task was already removed.",
        });
        return;
      }
      
      toast({
        title: "Error",
        description: "Failed to delete task. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleExport = () => {
    const getWorkTypeLabel = (workType: string) => {
      if (workType === 'shoot') return 'Γύρισμα';
      if (workType === 'edit') return 'Μοντάζ';
      if (workType === 'upload') return 'Φόρτωμα';
      return 'Γύρισμα';
    };

    const exportData = tasks.map((task) => ({
      Title: task.title,
      "Production Date": task.shootDate || "",
      "Delivery Date": task.deliveryDate || "",
      "Delivery Time": task.deliveryTime || "",
      Assignee: task.assignee,
      "Work Type": getWorkTypeLabel(task.workType),
      Status: task.status,
      Tag: task.tag,
      Notes: task.notes || "",
    }));

    const worksheet = XLSX.utils.json_to_sheet(exportData);
    const workbook = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(workbook, worksheet, "Tasks");
    
    const fileName = `tlife-tasks-${new Date().toISOString().split("T")[0]}.xlsx`;
    XLSX.writeFile(workbook, fileName);
    
    toast({
      title: "Export successful",
      description: "Your tasks have been exported to Excel.",
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

        const parseWorkType = (value: any): "shoot" | "edit" | "upload" => {
          if (!value) return "shoot";
          const str = String(value).toLowerCase();
          if (str.includes('γύρισμα') || str === 'shoot') return 'shoot';
          if (str.includes('μοντάζ') || str === 'edit') return 'edit';
          if (str.includes('φόρτωμα') || str === 'upload') return 'upload';
          return "shoot";
        };

        for (const row of importedData) {
          await createTask.mutateAsync({
            title: row.Title || row.title,
            shootDate: row["Production Date"] || row["Shoot Date"] || row.shootDate || null,
            deliveryDate: row["Delivery Date"] || row.deliveryDate || null,
            deliveryTime: row["Delivery Time"] || row.deliveryTime || null,
            notes: row.Notes || row.notes || null,
            assignee: row.Assignee || row.assignee,
            workType: parseWorkType(row["Work Type"] || row.workType),
            status: row.Status || row.status || "todo",
            tag: row.Tag || row.tag || "tlife",
          });
        }

        toast({
          title: "Import successful",
          description: `Imported ${importedData.length} tasks.`,
        });
      } catch (error) {
        toast({
          title: "Import failed",
          description: "Invalid file format. Please check your Excel file.",
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
        title: "Tasks created",
        description: `${data.length} task(s) created successfully from your schedule.`,
      });
    },
    onError: (error: Error) => {
      if (isUnauthorizedError(error)) {
        toast({
          title: "Unauthorized",
          description: "You are logged out. Logging in again...",
          variant: "destructive",
        });
        setTimeout(() => {
          window.location.href = "/api/login";
        }, 500);
        return;
      }
      console.error("AI generation error:", error);
      toast({
        title: "Error",
        description: error.message || "Failed to generate tasks. Please try again.",
        variant: "destructive",
      });
    },
  });

  const handleAIGenerate = () => {
    if (!aiScheduleText.trim()) {
      toast({
        title: "Empty input",
        description: "Please enter your weekly schedule.",
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
        <div className="max-w-7xl mx-auto px-6 md:px-8 h-16 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 bg-primary rounded-md flex items-center justify-center">
              <Calendar className="w-5 h-5 text-primary-foreground" />
            </div>
            <h1 className="text-xl font-bold tracking-tight">tlife</h1>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" className="h-9 gap-2 px-2" data-testid="button-user-menu">
                <Avatar className="h-8 w-8">
                  <AvatarImage src={user?.profileImageUrl || undefined} alt={user?.email || "User"} />
                  <AvatarFallback className="text-xs">{getUserInitials()}</AvatarFallback>
                </Avatar>
                <span className="text-sm hidden md:inline-block">{user?.email || "User"}</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">
                    {user?.firstName || user?.lastName
                      ? `${user.firstName || ""} ${user.lastName || ""}`.trim()
                      : "User"}
                  </p>
                  <p className="text-xs text-muted-foreground">{user?.email || ""}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem asChild>
                <a href="/api/logout" className="cursor-pointer" data-testid="button-logout">
                  <LogOut className="mr-2 h-4 w-4" />
                  Log out
                </a>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-6 md:px-8 py-6 md:py-8">
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
                <Sparkles className="w-5 h-5 text-primary" />
                Φτιάξε πρόγραμμα με AI
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                placeholder='π.χ. "Τρίτη γύρισμα TLIFE με Δημήτρη, παράδοση Πέμπτη"'
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

          <TaskForm
            onSubmit={(taskData) => createTask.mutate(taskData)}
            isPending={createTask.isPending}
            userEmail={user?.email}
          />

          <Card>
            <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0 pb-4">
              <CardTitle className="text-lg font-semibold">Tasks</CardTitle>
              <div className="flex gap-2">
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
                  Export
                </Button>
                <Button
                  variant="outline"
                  onClick={handleImport}
                  data-testid="button-import"
                  className="gap-2"
                >
                  <Upload className="w-4 h-4" />
                  Import
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {isLoading ? (
                <div className="text-center py-12 text-muted-foreground">
                  Loading tasks...
                </div>
              ) : viewMode === "table" ? (
                <TaskTable
                  tasks={tasks}
                  onUpdateStatus={(taskId, status) =>
                    updateTask.mutate({ id: taskId, updates: { status } })
                  }
                  onEdit={(task) => {
                    setEditingTask(task);
                    setIsEditDialogOpen(true);
                  }}
                  onDelete={(taskId) => deleteTask.mutate(taskId)}
                  userEmail={user?.email}
                />
              ) : (
                <CalendarView
                  tasks={tasks}
                  onTaskClick={(task) => {
                    setEditingTask(task);
                    setIsEditDialogOpen(true);
                  }}
                />
              )}
            </CardContent>
          </Card>

          {tasks.length > 0 && <WorkloadOverview tasks={tasks} />}
        </div>
      </main>

      <TaskEditDialog
        task={editingTask}
        open={isEditDialogOpen}
        onOpenChange={setIsEditDialogOpen}
        onSave={(taskId, updates) => updateTask.mutate({ id: taskId, updates })}
        isPending={updateTask.isPending}
        userEmail={user?.email}
      />
    </div>
  );
}
