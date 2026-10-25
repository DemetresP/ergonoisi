import admin from "./firebaseAdmin";
import {
  type User,
  type UpsertUser,
  type Task,
  type InsertTask,
  type StudioSettings,
} from "@shared/schema";

const DEFAULT_SETTINGS: StudioSettings = { team: [], series: ["Οικονομικό"] };

function getDb() {
  // Avoid crashing the whole server at startup if Firebase Admin isn't configured.
  // We'll throw a clear runtime error when an API endpoint actually needs Firestore.
  if (!admin.apps.length) {
    throw new Error(
      "Firebase Admin is not initialized. Check FIREBASE_SERVICE_ACCOUNT or FIREBASE_PROJECT_ID/FIREBASE_CLIENT_EMAIL/FIREBASE_PRIVATE_KEY env vars.",
    );
  }
  return admin.firestore();
}

export interface IStorage {
  getUser(id: string): Promise<User | undefined>;
  upsertUser(user: UpsertUser): Promise<User>;

  getTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  deleteTask(id: string): Promise<boolean>;

  getSettings(): Promise<StudioSettings>;
  saveSettings(settings: StudioSettings): Promise<StudioSettings>;
}

function toPlain<T = any>(doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
  if (!doc.exists) return undefined;
  const data = doc.data() as any;
  Object.keys(data).forEach((k) => {
    const v = data[k];
    if (v && typeof v.toDate === "function") {
      data[k] = v.toISOString ? v.toISOString() : v.toDate().toISOString();
    }
  });
  return { id: doc.id, ...data } as T;
}

// Tasks from before the HuffPost studio carry a newsit/tlife/zappit `tag` and no format;
// they are shown as reels without a series.
function toTask(doc: FirebaseFirestore.DocumentSnapshot<FirebaseFirestore.DocumentData>) {
  const task = toPlain<Task & { tag?: string }>(doc);
  if (!task) return undefined;
  const { tag: _legacyTag, ...rest } = task;
  return { ...rest, format: rest.format || "reel" } as Task;
}

export class FirestoreStorage implements IStorage {
  async getUser(id: string): Promise<User | undefined> {
    const db = getDb();
    const doc = await db.collection("users").doc(id).get();
    return toPlain<User>(doc);
  }

  async upsertUser(userData: UpsertUser): Promise<User> {
    const db = getDb();
    const id = (userData as any).id;
    const ref = id ? db.collection("users").doc(id) : db.collection("users").doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.set({ ...userData, updatedAt: now, createdAt: now }, { merge: true });
    const saved = await ref.get();
    return toPlain<User>(saved)!;
  }

  async getTasks(): Promise<Task[]> {
    const db = getDb();
    const snap = await db.collection("tasks").orderBy("createdAt").get();
    return snap.docs.map((d) => toTask(d)!).filter(Boolean);
  }

  async getTask(id: string): Promise<Task | undefined> {
    const db = getDb();
    const doc = await db.collection("tasks").doc(id).get();
    return toTask(doc);
  }

  async createTask(taskData: InsertTask): Promise<Task> {
    const db = getDb();
    const ref = db.collection("tasks").doc();
    const now = admin.firestore.FieldValue.serverTimestamp();
    await ref.set({ ...taskData, createdAt: now, updatedAt: now });
    const saved = await ref.get();
    return toTask(saved)!;
  }

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined> {
    const db = getDb();
    const ref = db.collection("tasks").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return undefined;
    await ref.update({
      ...updates,
      tag: admin.firestore.FieldValue.delete(),
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    const updated = await ref.get();
    return toTask(updated);
  }

  async deleteTask(id: string): Promise<boolean> {
    const db = getDb();
    const ref = db.collection("tasks").doc(id);
    const doc = await ref.get();
    if (!doc.exists) return false;
    await ref.delete();
    return true;
  }

  async getSettings(): Promise<StudioSettings> {
    const db = getDb();
    const doc = await db.collection("settings").doc("studio").get();
    const data = doc.exists ? doc.data() : undefined;
    return {
      team: data?.team ?? DEFAULT_SETTINGS.team,
      series: data?.series ?? DEFAULT_SETTINGS.series,
    };
  }

  async saveSettings(settings: StudioSettings): Promise<StudioSettings> {
    const db = getDb();
    await db.collection("settings").doc("studio").set(settings);
    return settings;
  }
}

export const storage = new FirestoreStorage();
