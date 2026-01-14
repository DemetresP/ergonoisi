import { z } from "zod";

// Plain Zod-based schema and TS types — removed Postgres/Drizzle-specific bindings

export const userSchema = z.object({
  id: z.string(),
  email: z.string().email().optional(),
  firstName: z.string().nullable().optional(),
  lastName: z.string().nullable().optional(),
  profileImageUrl: z.string().nullable().optional(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export const upsertUserSchema = z.object({
  id: z.string().optional(),
  email: z.string().email().optional(),
  firstName: z.string().optional(),
  lastName: z.string().optional(),
  profileImageUrl: z.string().optional(),
});

export type UpsertUser = z.infer<typeof upsertUserSchema>;
export type User = z.infer<typeof userSchema>;

export const insertTaskSchema = z.object({
  title: z.string().min(1, "Project title is required"),
  shootDate: z.string().nullable().optional(),
  shootTime: z.string().nullable().optional(),
  deliveryDate: z.string().nullable().optional(),
  deliveryTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  assignee: z.string().min(1).optional(),
  workType: z.enum(["shoot", "edit", "upload"]).default("shoot"),
  status: z.enum(["todo", "inprogress", "done"]).default("todo"),
  tag: z.enum(["newsit", "tlife", "zappit"]).default("tlife"),
  userId: z.string(),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;

export const taskSchema = insertTaskSchema.extend({
  id: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
});

export type Task = z.infer<typeof taskSchema>;
