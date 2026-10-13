import { getDb } from "@/lib/db/mongodb";
import { EmailNotification, NotificationStatus } from "@/types/notification";

let memoryNotifications: EmailNotification[] = [];

export const NotificationRepository = {
  async create(record: EmailNotification): Promise<EmailNotification> {
    const db = await getDb();
    if (db) {
      try {
        await db.collection<EmailNotification>("notifications").insertOne({ ...record });
      } catch (err) {
        console.warn("MongoDB insert error in NotificationRepository.create:", err);
      }
    }

    memoryNotifications.push({ ...record });
    return record;
  },

  async findById(id: string): Promise<EmailNotification | null> {
    const db = await getDb();
    if (db) {
      try {
        const found = await db.collection<EmailNotification>("notifications").findOne({ id });
        if (found) return found;
      } catch (err) {
        console.warn("MongoDB query error in NotificationRepository.findById:", err);
      }
    }

    return memoryNotifications.find((n) => n.id === id) || null;
  },

  async findByStoreId(storeId: string): Promise<EmailNotification[]> {
    const db = await getDb();
    if (db) {
      try {
        const results = await db
          .collection<EmailNotification>("notifications")
          .find({ storeId })
          .sort({ createdAt: -1 })
          .toArray();
        if (results.length > 0) return results;
      } catch (err) {
        console.warn("MongoDB query error in NotificationRepository.findByStoreId:", err);
      }
    }

    return memoryNotifications
      .filter((n) => n.storeId === storeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async findAll(): Promise<EmailNotification[]> {
    const db = await getDb();
    if (db) {
      try {
        const results = await db
          .collection<EmailNotification>("notifications")
          .find({})
          .sort({ createdAt: -1 })
          .toArray();
        if (results.length > 0) return results;
      } catch (err) {
        console.warn("MongoDB query error in NotificationRepository.findAll:", err);
      }
    }

    return [...memoryNotifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async updateStatus(id: string, status: NotificationStatus, error?: string): Promise<void> {
    const db = await getDb();
    const now = new Date().toISOString();
    const updateDoc: Partial<EmailNotification> = {
      status,
      sentAt: status === "sent" ? now : undefined,
      error,
    };

    if (db) {
      try {
        await db.collection<EmailNotification>("notifications").updateOne({ id }, { $set: updateDoc });
      } catch (err) {
        console.warn("MongoDB update error in NotificationRepository.updateStatus:", err);
      }
    }

    const index = memoryNotifications.findIndex((n) => n.id === id);
    if (index >= 0) {
      memoryNotifications[index] = { ...memoryNotifications[index], ...updateDoc };
    }
  },

  _resetMemory(notifications?: EmailNotification[]) {
    memoryNotifications = notifications ? [...notifications] : [];
  },
};
