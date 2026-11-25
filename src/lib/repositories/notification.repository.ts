import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { EmailNotification, NotificationStatus, AppNotification } from "@/types/notification";

let memoryNotifications: EmailNotification[] = [];

let memoryAppNotifications: AppNotification[] = [
  {
    id: "n-1",
    type: "published",
    title: "Demo Published",
    description: "Aura Minimalist Living demo storefront is live for review.",
    time: "2 hours ago",
    read: false,
    createdAt: new Date(Date.now() - 2 * 3600 * 1000).toISOString(),
  },
  {
    id: "n-2",
    type: "review",
    title: "Review Requested",
    description: "Botanica Apothecary awaiting internal QA sign-off.",
    time: "Yesterday",
    read: false,
    createdAt: new Date(Date.now() - 24 * 3600 * 1000).toISOString(),
  },
];

export const NotificationRepository = {
  async create(record: EmailNotification): Promise<EmailNotification> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create notification: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<EmailNotification>("notifications").insertOne({ ...record });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
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
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot update notification status: database is unavailable in production.");
    }
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
        if (!isFallbackAllowed()) {
          throw err;
        }
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

  async findAppNotifications(userId?: string, tenantId?: string): Promise<AppNotification[]> {
    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = {};
        if (userId) query.$or = [{ userId }, { userId: { $exists: false } }, { userId: null }];
        if (tenantId) query.tenantId = tenantId;
        const results = await db
          .collection<AppNotification>("app_notifications")
          .find(query)
          .sort({ createdAt: -1 })
          .toArray();
        if (results.length > 0) return results;
      } catch (err) {
        console.warn("MongoDB query error in findAppNotifications:", err);
      }
    }

    return [...memoryAppNotifications].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  async createAppNotification(notif: AppNotification): Promise<AppNotification> {
    const db = await getDb();
    if (db) {
      try {
        await db.collection<AppNotification>("app_notifications").insertOne({ ...notif });
      } catch (err) {
        console.warn("MongoDB insert error in createAppNotification:", err);
      }
    }
    const existingIdx = memoryAppNotifications.findIndex((n) => n.id === notif.id);
    if (existingIdx >= 0) {
      memoryAppNotifications[existingIdx] = notif;
    } else {
      memoryAppNotifications.push(notif);
    }
    return notif;
  },

  async markAppNotificationRead(id: string, read: boolean = true): Promise<void> {
    const db = await getDb();
    if (db) {
      try {
        await db
          .collection<AppNotification>("app_notifications")
          .updateOne({ id }, { $set: { read } });
      } catch (err) {
        console.warn("MongoDB update error in markAppNotificationRead:", err);
      }
    }
    const found = memoryAppNotifications.find((n) => n.id === id);
    if (found) {
      found.read = read;
    }
  },

  async markAllAppNotificationsRead(userId?: string): Promise<void> {
    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = {};
        if (userId) query.$or = [{ userId }, { userId: { $exists: false } }, { userId: null }];
        await db
          .collection<AppNotification>("app_notifications")
          .updateMany(query, { $set: { read: true } });
      } catch (err) {
        console.warn("MongoDB update error in markAllAppNotificationsRead:", err);
      }
    }
    memoryAppNotifications = memoryAppNotifications.map((n) => ({ ...n, read: true }));
  },

  _resetAppMemory(notifs?: AppNotification[]) {
    memoryAppNotifications = notifs ? [...notifs] : [];
  },
};
