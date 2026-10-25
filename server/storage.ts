import admin from "./firebaseAdmin";
import {
  type User,
  type UpsertUser,
  type Task,
  type InsertTask,
  type StudioSettings,
  type TaskHistoryEntry,
  type TeamMember,
} from "@shared/schema";

// HuffPost Greece site sections, used as the studio's series
const HUFFPOST_SECTIONS = [
  "Κοινωνία",
  "Πολιτική",
  "Κόσμος",
  "Οικονομία",
  "Άποψη",
  "Life",
  "Entertainment",
  "Πολιτισμός",
  "Αθλητικά",
];
// Bumped when the stored series list must be replaced once (see migrateToHuffPostSeries)
const SERIES_VERSION = 2;

const DEFAULT_SETTINGS: StudioSettings = { team: [], series: HUFFPOST_SECTIONS };

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
  getDeletedTasks(): Promise<Task[]>;
  getTask(id: string): Promise<Task | undefined>;
  createTask(task: InsertTask): Promise<Task>;
  updateTask(id: string, updates: Partial<Task>): Promise<Task | undefined>;
  trashTask(id: string, byEmail: string): Promise<boolean>;
  restoreTask(id: string): Promise<Task | undefined>;

  addHistory(taskId: string, entry: Omit<TaskHistoryEntry, "id" | "at">): Promise<void>;
  getHistory(taskId: string): Promise<TaskHistoryEntry[]>;

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
    return snap.docs.map((d) => toTask(d)!).filter((task) => task && !task.deletedAt);
  }

  async getDeletedTasks(): Promise<Task[]> {
    const db = getDb();
    const snap = await db.collection("tasks").orderBy("createdAt").get();
    return snap.docs.map((d) => toTask(d)!).filter((task) => task && task.deletedAt);
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

  // Tasks are never hard-deleted from the app; the admin can restore them from the trash
  async trashTask(id: string, byEmail: string): Promise<boolean> {
    const updated = await this.updateTask(id, { deletedAt: new Date().toISOString(), deletedBy: byEmail });
    return Boolean(updated);
  }

  async restoreTask(id: string): Promise<Task | undefined> {
    return this.updateTask(id, { deletedAt: null, deletedBy: null });
  }

  async addHistory(taskId: string, entry: Omit<TaskHistoryEntry, "id" | "at">): Promise<void> {
    const db = getDb();
    await db
      .collection("tasks")
      .doc(taskId)
      .collection("history")
      .add({ ...entry, at: new Date().toISOString() });
  }

  async getHistory(taskId: string): Promise<TaskHistoryEntry[]> {
    const db = getDb();
    const snap = await db.collection("tasks").doc(taskId).collection("history").orderBy("at", "desc").get();
    return snap.docs.map((d) => toPlain<TaskHistoryEntry>(d)!);
  }

  // Settings are read on every authenticated request (access check), so keep a short cache
  private settingsCache: { value: StudioSettings; expires: number } | undefined;

  async getSettings(): Promise<StudioSettings> {
    if (this.settingsCache && this.settingsCache.expires > Date.now()) {
      return this.settingsCache.value;
    }
    const db = getDb();
    const doc = await db.collection("settings").doc("studio").get();
    let data = doc.exists ? doc.data() : undefined;

    if (data && data.seriesVersion !== SERIES_VERSION) {
      await this.migrateToHuffPostSeries();
      data = { ...data, series: HUFFPOST_SECTIONS, seriesVersion: SERIES_VERSION };
    }

    const value: StudioSettings = {
      // Team was briefly stored as plain names; those members have no email yet
      team: (data?.team ?? DEFAULT_SETTINGS.team).map((member: string | TeamMember) =>
        typeof member === "string" ? { name: member, email: "" } : member,
      ),
      series: data?.series ?? DEFAULT_SETTINGS.series,
    };
    this.settingsCache = { value, expires: Date.now() + 30_000 };
    return value;
  }

  async saveSettings(settings: StudioSettings): Promise<StudioSettings> {
    const db = getDb();
    await db.collection("settings").doc("studio").set({ ...settings, seriesVersion: SERIES_VERSION });
    this.settingsCache = undefined;
    return settings;
  }

  // One-off: the first custom series are replaced by the HuffPost sections,
  // and tasks under the old "Οικονομικό" move to "Οικονομία"
  private async migrateToHuffPostSeries() {
    const db = getDb();
    const renamed = await db.collection("tasks").where("series", "==", "Οικονομικό").get();
    const batch = db.batch();
    renamed.docs.forEach((d) => batch.update(d.ref, { series: "Οικονομία" }));
    batch.set(
      db.collection("settings").doc("studio"),
      { series: HUFFPOST_SECTIONS, seriesVersion: SERIES_VERSION },
      { merge: true },
    );
    await batch.commit();
  }
}

export const storage = new FirestoreStorage();
