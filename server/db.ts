// Postgres DB initializer removed — using Firestore instead.
// This file remains for compatibility but will throw if imported.
export function deprecatedDbImport() {
  throw new Error(
    "Postgres DB is no longer used. Migrate imports to Firestore-based storage (server/storage.ts).",
  );
}
