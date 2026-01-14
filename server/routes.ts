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
    setupAuth = mod.setupAu
