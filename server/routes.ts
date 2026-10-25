import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import {
  ADMIN_ONLY_TASK_FIELDS,
  insertTaskSchema,
  studioSettingsSchema,
  type Task,
  type TaskChange,
  type TaskHistoryEntry,
} from "@shared/schema";
import { canChangeStatus, canEditTask } from "@shared/permissions";
import { z } from "zod";
import { parseWeeklyScheduleToTasks } from "./openai";
import { setupAuth, isAuthenticated, type Actor } from "./replitAuth";
import { isFirebaseAdminInitialized } from "./firebaseAdmin";

// Treat missing, empty and null as the same "no value"
function normalize(value: unknown) {
  return value === undefined || value === "" ? null : value;
}

function diffTask(before: Task, updates: Record<string, unknown>): TaskChange[] {
  return Object.entries(updates)
    .filter(([field, to]) => normalize(to) !== normalize((before as any)[field]))
    .map(([field, to]) => ({ field, from: normalize((before as any)[field]), to: normalize(to) }));
}

async function recordHistory(
  taskId: string,
  actor: Actor,
  action: TaskHistoryEntry["action"],
  changes: TaskChange[] = [],
) {
  try {
    await storage.addHistory(taskId, { action, byEmail: actor.email, byName: actor.name, changes });
  } catch (error) {
    // Never fail the user's action because the history write failed
    console.error("Error recording task history:", error);
  }
}

export async function registerRoutes(app: Express): Promise<Server> {
  // Firebase auth (via ./replitAuth middleware) — always enabled
  await setupAuth(app);

  // Health / debug (no secrets)
  app.get("/api/health", (_req, res) => {
    const hasServiceAccountEnv = Boolean(process.env.FIREBASE_SERVICE_ACCOUNT);
    const hasProjectId = Boolean(process.env.FIREBASE_PROJECT_ID);
    const hasClientEmail = Boolean(process.env.FIREBASE_CLIENT_EMAIL);
    const hasPrivateKey = Boolean(process.env.FIREBASE_PRIVATE_KEY);
    const hasOpenAIKey = Boolean(process.env.OPENAI_API_KEY);

    res.json({
      ok: true,
      node: process.version,
      env: process.env.NODE_ENV,
      firebaseAdminInitialized: isFirebaseAdminInitialized(),
      firebaseEnv: {
        hasServiceAccountEnv,
        hasProjectId,
        hasClientEmail,
        hasPrivateKey,
      },
      openaiConfigured: hasOpenAIKey,
    });
  });

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const actor: Actor = req.actor;
      const user = await storage.getUser(actor.uid);
      res.json({ ...user, isAdmin: actor.isAdmin, memberName: actor.memberName ?? null });
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
    }
  });

  // Studio settings (team members, series) - readable by all, editable by admin
  app.get("/api/settings", isAuthenticated, async (_req: any, res) => {
    try {
      res.json(await storage.getSettings());
    } catch (error) {
      console.error("Error fetching settings:", error);
      res.status(500).json({ message: "Failed to fetch settings" });
    }
  });

  app.put("/api/settings", isAuthenticated, async (req: any, res) => {
    try {
      const actor: Actor = req.actor;
      if (!actor.isAdmin) {
        return res.status(403).json({ message: "Only admin can change studio settings" });
      }
      const settings = studioSettingsSchema.parse(req.body);

      const names = settings.team.map((m) => m.name);
      const emails = settings.team.map((m) => m.email).filter(Boolean);
      if (new Set(names).size !== names.length || new Set(emails).size !== emails.length) {
        return res.status(400).json({ message: "Each team member needs a unique name and email" });
      }

      res.json(
        await storage.saveSettings({
          team: settings.team,
          series: Array.from(new Set(settings.series)),
        }),
      );
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({ message: "Validation error", errors: error.errors });
      }
      console.error("Error saving settings:", error);
      res.status(500).json({ message: "Failed to save settings" });
    }
  });

  // Task routes - Team-wide visibility
  app.get("/api/tasks", isAuthenticated, async (_req: any, res) => {
    try {
      const tasks = await storage.getTasks();
      res.json(tasks);
    } catch (error) {
      console.error("Error fetching tasks:", error);
      res.status(500).json({ message: "Failed to fetch tasks" });
    }
  });

  app.get("/api/tasks/trash", isAuthenticated, async (req: any, res) => {
    try {
      const actor: Actor = req.actor;
      if (!actor.isAdmin) {
        return res.status(403).json({ message: "Only admin can view the trash" });
      }
      res.json(await storage.getDeletedTasks());
    } catch (error) {
      console.error("Error fetching trash:", error);
      res.status(500).json({ message: "Failed to fetch trash" });
    }
  });

  app.get("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const task = await storage.getTask(req.params.id);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.json(task);
    } catch (error) {
      console.error("Error fetching task:", error);
      res.status(500).json({ message: "Failed to fetch task" });
    }
  });

  app.get("/api/tasks/:id/history", isAuthenticated, async (req: any, res) => {
    try {
      const actor: Actor = req.actor;
      if (!actor.isAdmin) {
        return res.status(403).json({ message: "Only admin can view task history" });
      }
      res.json(await storage.getHistory(req.params.id));
    } catch (error) {
      console.error("Error fetching task history:", error);
      res.status(500).json({ message: "Failed to fetch task history" });
    }
  });

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const actor: Actor = req.actor;

      const validatedData = insertTaskSchema.parse({
        ...req.body,
        userId: actor.uid,
      });

      // Non-admins may propose a shoot date, but the other scheduling fields are admin-only
      if (!actor.isAdmin) {
        if (ADMIN_ONLY_TASK_FIELDS.some((field) => field !== "shootDate" && req.body[field])) {
          return res.status(403).json({
            message: "Only admin can set assignee, times, delivery and publish dates",
          });
        }
      }

      const task = await storage.createTask(validatedData);
      await recordHistory(task.id, actor, "create");
      res.status(201).json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      console.error("Error creating task:", error);
      res.status(500).json({ message: "Failed to create task" });
    }
  });

  app.patch("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actor: Actor = req.actor;

      // Validate update payload
      const updateSchema = insertTaskSchema.partial().omit({ userId: true });
      const validatedUpdates = updateSchema.parse(req.body);

      const existing = await storage.getTask(req.params.id);
      if (!existing || existing.deletedAt) {
        return res.status(404).json({ message: "Task not found" });
      }

      // Only fields whose value actually changes count; forms resend unchanged values
      const changes = diffTask(existing, validatedUpdates);
      if (changes.length === 0) {
        return res.json(existing);
      }

      if (!actor.isAdmin) {
        const changed = new Set(changes.map((c) => c.field));

        if (ADMIN_ONLY_TASK_FIELDS.some((field) => changed.has(field))) {
          return res.status(403).json({
            message: "Only admin can change assignee and shoot, delivery or publish dates/times",
          });
        }
        if (changed.has("status") && !canChangeStatus(existing, actor)) {
          return res.status(403).json({ message: "Only the assignee or admin can change the status" });
        }
        if (changes.some((c) => c.field !== "status") && !canEditTask(existing, actor)) {
          return res.status(403).json({ message: "You can only edit your own tasks" });
        }
      }

      const updates = Object.fromEntries(changes.map((c) => [c.field, (validatedUpdates as any)[c.field]]));
      const task = await storage.updateTask(req.params.id, updates);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      await recordHistory(task.id, actor, "update", changes);
      res.json(task);
    } catch (error) {
      if (error instanceof z.ZodError) {
        return res.status(400).json({
          message: "Validation error",
          errors: error.errors,
        });
      }
      console.error("Error updating task:", error);
      res.status(500).json({ message: "Failed to update task" });
    }
  });

  // Moves the task to the trash; it can be restored by the admin
  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const actor: Actor = req.actor;

      // Check if user is admin - only admin can delete tasks
      if (!actor.isAdmin) {
        return res.status(403).json({
          message: "Only admin can delete tasks",
        });
      }

      const deleted = await storage.trashTask(req.params.id, actor.email);

      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }

      await recordHistory(req.params.id, actor, "delete");
      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.post("/api/tasks/:id/restore", isAuthenticated, async (req: any, res) => {
    try {
      const actor: Actor = req.actor;
      if (!actor.isAdmin) {
        return res.status(403).json({ message: "Only admin can restore tasks" });
      }

      const task = await storage.restoreTask(req.params.id);
      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

      await recordHistory(task.id, actor, "restore");
      res.json(task);
    } catch (error) {
      console.error("Error restoring task:", error);
      res.status(500).json({ message: "Failed to restore task" });
    }
  });

  app.post("/api/tasks/ai-generate", isAuthenticated, async (req: any, res) => {
    try {
      const actor: Actor = req.actor;
      const { scheduleText } = req.body;

      if (!scheduleText || typeof scheduleText !== "string") {
        return res.status(400).json({ message: "scheduleText is required" });
      }

      const settings = await storage.getSettings();
      const parsedTasks = await parseWeeklyScheduleToTasks(scheduleText, settings);
      const teamNames = settings.team.map((m) => m.name);

      const createdTasks = [];
      for (const parsedTask of parsedTasks) {
        const taskData: any = {
          title: parsedTask.title,
          workType: parsedTask.workType,
          status: "todo",
          format: parsedTask.format === "podcast" ? "podcast" : "reel",
          userId: actor.uid,
        };
        if (parsedTask.series && settings.series.includes(parsedTask.series)) taskData.series = parsedTask.series;
        if (parsedTask.guest) taskData.guest = parsedTask.guest;

        if (actor.isAdmin) {
          if (parsedTask.assignee && teamNames.includes(parsedTask.assignee)) taskData.assignee = parsedTask.assignee;
          if (parsedTask.shootDate) taskData.shootDate = parsedTask.shootDate;
          if (parsedTask.shootTime) taskData.shootTime = parsedTask.shootTime;
          if (parsedTask.deliveryDate) taskData.deliveryDate = parsedTask.deliveryDate;
          if (parsedTask.publishDate) taskData.publishDate = parsedTask.publishDate;
          if (parsedTask.publishTime) taskData.publishTime = parsedTask.publishTime;
        }

        const validatedData = insertTaskSchema.parse(taskData);
        const createdTask = await storage.createTask(validatedData);
        await recordHistory(createdTask.id, actor, "create");
        createdTasks.push(createdTask);
      }

      res.status(201).json(createdTasks);
    } catch (error: any) {
      console.error("Error generating tasks from AI:", error);
      if (String(error?.message || "").includes("OpenAI is not configured")) {
        return res.status(503).json({
          message: "AI is not configured on the server (missing OPENAI_API_KEY).",
        });
      }
      res.status(500).json({
        message: "Failed to generate tasks",
        error: error.message,
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
