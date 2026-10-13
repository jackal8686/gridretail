import { getDb } from "@/lib/db/mongodb";
import { Store } from "@/types";
import { MOCK_STORES } from "@/mock/stores";

// In-memory fallback dataset for seamless dev/testing without database
let memoryStores: Store[] = [...MOCK_STORES];

export const StoreRepository = {
  async findAll(filter?: { status?: string; industry?: string; search?: string }): Promise<Store[]> {
    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = {};
        if (filter?.status && filter.status !== "ALL") {
          query.status = filter.status;
        }
        if (filter?.industry && filter.industry !== "ALL") {
          query.industry = filter.industry;
        }
        if (filter?.search) {
          query.$or = [
            { name: { $regex: filter.search, $options: "i" } },
            { clientName: { $regex: filter.search, $options: "i" } },
            { templateName: { $regex: filter.search, $options: "i" } },
          ];
        }

        const stores = await db
          .collection<Store>("stores")
          .find(query)
          .sort({ lastUpdated: -1 })
          .toArray();

        return stores.map((s) => ({
          ...s,
          id: s.id || (s as unknown as { _id: { toString: () => string } })._id?.toString(),
        }));
      } catch (err) {
        console.warn("MongoDB query error in StoreRepository.findAll, falling back to memory:", err);
      }
    }

    // In-memory fallback
    return memoryStores.filter((store) => {
      const matchStatus = !filter?.status || filter.status === "ALL" || store.status === filter.status;
      const matchIndustry = !filter?.industry || filter.industry === "ALL" || store.industry === filter.industry;
      const matchSearch =
        !filter?.search ||
        store.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        store.clientName.toLowerCase().includes(filter.search.toLowerCase()) ||
        store.templateName.toLowerCase().includes(filter.search.toLowerCase());
      return matchStatus && matchIndustry && matchSearch;
    });
  },

  async findById(id: string): Promise<Store | null> {
    const db = await getDb();
    if (db) {
      try {
        const store = await db.collection<Store>("stores").findOne({ id });
        if (store) {
          return {
            ...store,
            id: store.id || (store as unknown as { _id: { toString: () => string } })._id?.toString(),
          };
        }
      } catch (err) {
        console.warn("MongoDB query error in StoreRepository.findById:", err);
      }
    }
    return memoryStores.find((s) => s.id === id) || null;
  },

  async findBySlug(slug: string): Promise<Store | null> {
    const normalized = slug.toLowerCase().trim();
    const db = await getDb();
    if (db) {
      try {
        const store = await db.collection<Store>("stores").findOne({ slug: normalized });
        if (store) {
          return {
            ...store,
            id: store.id || (store as unknown as { _id: { toString: () => string } })._id?.toString(),
          };
        }
      } catch (err) {
        console.warn("MongoDB query error in StoreRepository.findBySlug:", err);
      }
    }
    return memoryStores.find((s) => s.slug === normalized) || null;
  },

  async create(storeData: Store): Promise<Store> {
    const db = await getDb();
    if (db) {
      try {
        await db.collection<Store>("stores").insertOne({ ...storeData });
      } catch (err) {
        console.warn("MongoDB insert error in StoreRepository.create:", err);
      }
    }
    memoryStores.unshift(storeData);
    return storeData;
  },

  async update(id: string, updates: Partial<Store>): Promise<Store | null> {
    const db = await getDb();
    const now = new Date().toISOString();
    const dataToUpdate = { ...updates, lastUpdated: now };

    if (db) {
      try {
        await db.collection<Store>("stores").updateOne({ id }, { $set: dataToUpdate });
        return this.findById(id);
      } catch (err) {
        console.warn("MongoDB update error in StoreRepository.update:", err);
      }
    }

    const index = memoryStores.findIndex((s) => s.id === id);
    if (index !== -1) {
      memoryStores[index] = { ...memoryStores[index], ...dataToUpdate };
      return memoryStores[index];
    }
    return null;
  },

  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findBySlug(slug);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  },

  // Reset method for unit tests
  _resetMemory(stores?: Store[]) {
    memoryStores = stores ? [...stores] : [...MOCK_STORES];
  },
};
