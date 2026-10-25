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
  // When the reel/podcast goes live on the site or social
  publishDate: z.string().nullable().optional(),
  publishTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  assignee: z.string().min(1).optional(),
  workType: z.enum(["shoot", "edit", "upload"]).default("shoot"),
  status: z.enum(["todo", "inprogress", "done"]).default("todo"),
  format: z.enum(["reel", "podcast"]).default("reel"),
  series: z.string().nullable().optional(),
  guest: z.string().nullable().optional(),
  userId: z.string(),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;

export const taskSchema = insertTaskSchema.extend({
  id: z.string(),
  createdAt: z.string().optional(),
  updatedAt: z.string().optional(),
  // Set when the admin moves the task to the trash; restorable
  deletedAt: z.string().nullable().optional(),
  deletedBy: z.string().nullable().optional(),
});

export type Task = z.infer<typeof taskSchema>;

// Fields only the admin may change on an existing task
export const ADMIN_ONLY_TASK_FIELDS = [
  "assignee",
  "shootDate",
  "shootTime",
  "deliveryDate",
  "deliveryTime",
  "publishDate",
  "publishTime",
] as const;

export interface TaskChange {
  field: string;
  from: unknown;
  to: unknown;
}

export interface TaskHistoryEntry {
  id: string;
  action: "create" | "update" | "delete" | "restore";
  at: string;
  byEmail: string;
  byName: string;
  changes: TaskChange[];
}
export type TaskFormat = Task["format"];

export const FORMAT_LABELS: Record<TaskFormat, string> = {
  reel: "Reel",
  podcast: "Podcast",
};

// A team member's email is what lets them sign in and ties them to their tasks
export const teamMemberSchema = z.object({
  name: z.string().trim().min(1),
  email: z.union([z.string().trim().toLowerCase().email(), z.literal("")]).default(""),
});

export type TeamMember = z.infer<typeof teamMemberSchema>;

// Studio lists managed by the admin from the app (team members and series)
export const studioSettingsSchema = z.object({
  team: z.array(teamMemberSchema).default([]),
  series: z.array(z.string().trim().min(1)).default([]),
});

export type StudioSettings = z.infer<typeof studioSettingsSchema>;

export function findMemberByEmail(team: TeamMember[], email: string | null | undefined) {
  if (!email) return undefined;
  const normalized = email.toLowerCase();
  return team.find((member) => member.email === normalized);
}
