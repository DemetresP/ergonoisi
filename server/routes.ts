import type { Express } from "express";
import { createServer, type Server } from "http";
import { storage } from "./storage";
import { insertTaskSchema } from "@shared/schema";
import { z } from "zod";
import { isAdmin } from "@shared/admin";
import { parseWeeklyScheduleToTasks } from "./openai";

/**
 * Replit auth toggle
 * When false, auth is completely disabled (Render / production without Replit)
 */
const ENABLE_REPLIT_AUTH = process.env.ENABLE_REPLIT_AUTH === "true";

/**
 * Defaults when auth is disabled
 */
let setupAuth: (app: Express) => Promise<void> = async () => {};
let isAuthenticated: any = (_req: any, _res: any, next: any) => next();

export async function registerRoutes(app: Express): Promise<Server> {
  /**
   * Conditionally load Replit auth ONLY if enabled
   */
  if (ENABLE_REPLIT_AUTH) {
    const mod = await import("./replitAuth");
    setupAuth = mod.setupAuth;
    isAuthenticated = mod.isAuthenticated;
    await setupAuth(app);
  }

  // Auth routes
  app.get("/api/auth/user", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      if (!userId) return res.status(401).json({ message: "Unauthorized" });

      const user = await storage.getUser(userId);
      res.json(user);
    } catch (error) {
      console.error("Error fetching user:", error);
      res.status(500).json({ message: "Failed to fetch user" });
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

  app.post("/api/tasks", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userEmail = req.user?.claims?.email;

      if (!userId || !userEmail) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      const validatedData = insertTaskSchema.parse({
        ...req.body,
        userId,
      });

      // Check if non-admin user is trying to set assignee, shootTime, deliveryDate, or deliveryTime
      if (!isAdmin(userEmail)) {
        if (req.body.assignee || req.body.shootTime || req.body.deliveryDate || req.body.deliveryTime) {
          return res.status(403).json({
            message: "Only admin can set assignee, production time, delivery date, and delivery time",
          });
        }
      }

      const task = await storage.createTask(validatedData);
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
      const userEmail = req.user?.claims?.email;
      if (!userEmail) return res.status(401).json({ message: "Unauthorized" });

      // Check if non-admin user is trying to update assignee, shootTime, deliveryDate, or deliveryTime
      if (!isAdmin(userEmail)) {
        if ("assignee" in req.body || "shootTime" in req.body || "deliveryDate" in req.body || "deliveryTime" in req.body) {
          return res.status(403).json({
            message: "Only admin can modify assignee, production time, delivery date, and delivery time",
          });
        }
      }

      // Validate update payload
      const updateSchema = insertTaskSchema.partial().omit({ userId: true });
      const validatedUpdates = updateSchema.parse(req.body);

      const task = await storage.updateTask(req.params.id, validatedUpdates);

      if (!task) {
        return res.status(404).json({ message: "Task not found" });
      }

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

  app.delete("/api/tasks/:id", isAuthenticated, async (req: any, res) => {
    try {
      const userEmail = req.user?.claims?.email;
      if (!userEmail) return res.status(401).json({ message: "Unauthorized" });

      // Check if user is admin - only admin can delete tasks
      if (!isAdmin(userEmail)) {
        return res.status(403).json({
          message: "Only admin can delete tasks",
        });
      }

      const deleted = await storage.deleteTask(req.params.id);

      if (!deleted) {
        return res.status(404).json({ message: "Task not found" });
      }

      res.status(204).send();
    } catch (error) {
      console.error("Error deleting task:", error);
      res.status(500).json({ message: "Failed to delete task" });
    }
  });

  app.post("/api/tasks/ai-generate", isAuthenticated, async (req: any, res) => {
    try {
      const userId = req.user?.claims?.sub;
      const userEmail = req.user?.claims?.email;
      const { scheduleText } = req.body;

      if (!userId || !userEmail) {
        return res.status(401).json({ message: "Unauthorized" });
      }

      if (!scheduleText || typeof scheduleText !== "string") {
        return res.status(400).json({ message: "scheduleText is required" });
      }

      const parsedTasks = await parseWeeklyScheduleToTasks(scheduleText);

      const createdTasks = [];
      for (const parsedTask of parsedTasks) {
        const taskData: any = {
          title: parsedTask.title,
          workType: parsedTask.workType,
          status: "todo",
          tag: parsedTask.tag || "tlife",
          userId,
        };

        if (isAdmin(userEmail)) {
          if (parsedTask.assignee) taskData.assignee = parsedTask.assignee;
          if (parsedTask.shootDate) taskData.shootDate = parsedTask.shootDate;
          if (parsedTask.deliveryDate) taskData.deliveryDate = parsedTask.deliveryDate;
        }

        const validatedData = insertTaskSchema.parse(taskData);
        const createdTask = await storage.createTask(validatedData);
        createdTasks.push(createdTask);
      }

      res.status(201).json(createdTasks);
    } catch (error: any) {
      console.error("Error generating tasks from AI:", error);
      res.status(500).json({
        message: "Failed to generate tasks",
        error: error.message,
      });
    }
  });

  const httpServer = createServer(app);
  return httpServer;
}
