import { sql } from 'drizzle-orm';
import {
  index,
  jsonb,
  pgTable,
  timestamp,
  varchar,
  integer,
  text,
} from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Session storage table - Required for Replit Auth
export const sessions = pgTable(
  "sessions",
  {
    sid: varchar("sid").primaryKey(),
    sess: jsonb("sess").notNull(),
    expire: timestamp("expire").notNull(),
  },
  (table) => [index("IDX_session_expire").on(table.expire)],
);

// User storage table - Required for Replit Auth
export const users = pgTable("users", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  email: varchar("email").unique(),
  firstName: varchar("first_name"),
  lastName: varchar("last_name"),
  profileImageUrl: varchar("profile_image_url"),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export type UpsertUser = typeof users.$inferInsert;
export type User = typeof users.$inferSelect;

// Tasks table for video production scheduling
export const tasks = pgTable("tasks", {
  id: varchar("id").primaryKey().default(sql`gen_random_uuid()`),
  title: text("title").notNull(),
  shootDate: varchar("shoot_date"),
  shootTime: varchar("shoot_time"),
  deliveryDate: varchar("delivery_date"),
  deliveryTime: varchar("delivery_time"),
  notes: text("notes"),
  assignee: text("assignee"),
  workType: varchar("work_type", { length: 20 }).notNull().default('shoot'),
  status: varchar("status", { length: 20 }).notNull().default('todo'),
  tag: varchar("tag", { length: 20 }).notNull().default('tlife'),
  userId: varchar("user_id").notNull().references(() => users.id, { onDelete: "cascade" }),
  createdAt: timestamp("created_at").defaultNow(),
  updatedAt: timestamp("updated_at").defaultNow(),
});

export const insertTaskSchema = createInsertSchema(tasks).omit({
  id: true,
  createdAt: true,
  updatedAt: true,
}).extend({
  title: z.string().min(1, "Project title is required"),
  shootDate: z.string().nullable().optional(),
  shootTime: z.string().nullable().optional(),
  deliveryDate: z.string().nullable().optional(),
  deliveryTime: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
  assignee: z.string().min(1).optional(),
  workType: z.enum(['shoot', 'edit', 'upload']).default('shoot'),
  status: z.enum(['todo', 'inprogress', 'done']).default('todo'),
  tag: z.enum(['newsit', 'tlife', 'zappit']).default('tlife'),
});

export type InsertTask = z.infer<typeof insertTaskSchema>;
export type Task = typeof tasks.$inferSelect;
