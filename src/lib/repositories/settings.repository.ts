import { getDb } from "@/lib/db/mongodb";

export interface SystemSettings {
  id: string;
  workspaceName: string;
  storeExpiryDays: number;
  emailAlerts: boolean;
  reviewAlerts: boolean;
  deploymentNotifications: boolean;
  clientFeedbackAlerts: boolean;
  updatedAt: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
  id: "default",
  workspaceName: "GridRetail Global Studio",
  storeExpiryDays: 14,
  emailAlerts: true,
  reviewAlerts: true,
  deploymentNotifications: true,
  clientFeedbackAlerts: true,
  updatedAt: new Date().toISOString(),
};

let memorySettings: Record<string, SystemSettings> = {
  default: { ...DEFAULT_SETTINGS },
};

export const SettingsRepository = {
  async getSettings(tenantId: string = "default"): Promise<SystemSettings> {
    const db = await getDb();
    if (db) {
      try {
        const found = await db.collection<SystemSettings>("system_settings").findOne({ id: tenantId });
        if (found) {
          return found;
        }
      } catch (err) {
        console.warn("MongoDB query error in SettingsRepository.getSettings:", err);
      }
    }

    if (!memorySettings[tenantId]) {
      memorySettings[tenantId] = { ...DEFAULT_SETTINGS, id: tenantId };
    }
    return { ...memorySettings[tenantId] };
  },

  async updateSettings(
    updates: Partial<SystemSettings>,
    tenantId: string = "default"
  ): Promise<SystemSettings> {
    const existing = await this.getSettings(tenantId);
    const updated: SystemSettings = {
      ...existing,
      ...updates,
      id: tenantId,
      updatedAt: new Date().toISOString(),
    };

    const db = await getDb();
    if (db) {
      try {
        await db
          .collection<SystemSettings>("system_settings")
          .updateOne({ id: tenantId }, { $set: updated }, { upsert: true });
      } catch (err) {
        console.warn("MongoDB update error in SettingsRepository.updateSettings:", err);
      }
    }

    memorySettings[tenantId] = { ...updated };
    return updated;
  },

  _resetMemory() {
    memorySettings = {
      default: { ...DEFAULT_SETTINGS },
    };
  },
};
