import { getDb } from "@/lib/db/mongodb";
import { DeliveryRecord } from "@/types/delivery";

let memoryDeliveries: DeliveryRecord[] = [];

export const DeliveryRepository = {
  async create(record: DeliveryRecord): Promise<DeliveryRecord> {
    const db = await getDb();
    if (db) {
      try {
        await db.collection<DeliveryRecord>("deliveries").insertOne({ ...record });
      } catch (err) {
        console.warn("MongoDB insert error in DeliveryRepository.create:", err);
      }
    }

    memoryDeliveries.push({ ...record });
    return record;
  },

  async findById(id: string): Promise<DeliveryRecord | null> {
    const db = await getDb();
    if (db) {
      try {
        const found = await db.collection<DeliveryRecord>("deliveries").findOne({ id });
        if (found) return found;
      } catch (err) {
        console.warn("MongoDB query error in DeliveryRepository.findById:", err);
      }
    }

    return memoryDeliveries.find((d) => d.id === id) || null;
  },

  async findByStoreId(storeId: string): Promise<DeliveryRecord[]> {
    const db = await getDb();
    if (db) {
      try {
        const results = await db
          .collection<DeliveryRecord>("deliveries")
          .find({ storeId })
          .sort({ createdAt: -1 })
          .toArray();
        if (results.length > 0) return results;
      } catch (err) {
        console.warn("MongoDB query error in DeliveryRepository.findByStoreId:", err);
      }
    }

    return memoryDeliveries
      .filter((d) => d.storeId === storeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async update(id: string, updates: Partial<DeliveryRecord>): Promise<DeliveryRecord | null> {
    const db = await getDb();
    if (db) {
      try {
        await db.collection<DeliveryRecord>("deliveries").updateOne({ id }, { $set: updates });
      } catch (err) {
        console.warn("MongoDB update error in DeliveryRepository.update:", err);
      }
    }

    const index = memoryDeliveries.findIndex((d) => d.id === id);
    if (index >= 0) {
      memoryDeliveries[index] = { ...memoryDeliveries[index], ...updates };
      return memoryDeliveries[index];
    }
    return null;
  },

  async findAll(): Promise<DeliveryRecord[]> {
    const db = await getDb();
    if (db) {
      try {
        const results = await db
          .collection<DeliveryRecord>("deliveries")
          .find({})
          .sort({ createdAt: -1 })
          .toArray();
        if (results.length > 0) return results;
      } catch (err) {
        console.warn("MongoDB query error in DeliveryRepository.findAll:", err);
      }
    }

    return [...memoryDeliveries].sort(
      (a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
    );
  },

  _resetMemory(deliveries?: DeliveryRecord[]) {
    memoryDeliveries = deliveries ? [...deliveries] : [];
  },
};
