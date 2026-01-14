import { defineConfig } from "drizzle-kit";

if (!process.env.DATABASE_URL) {
  // No database configured — migrations and drizzle operations will be disabled.
  // Keep the config file present for developer workflows that add DATABASE_URL later.
  // eslint-disable-next-line no-console
  console.warn("DATABASE_URL not set — drizzle-kit operations disabled.");
}

export default defineConfig({
  out: "./migrations",
  schema: "./shared/schema.ts",
  dialect: "postgresql",
  dbCredentials: process.env.DATABASE_URL ? { url: process.env.DATABASE_URL } : undefined,
});
