import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { AppointmentProvider } from "@/types/appointment";

// In-memory fallback dataset for seamless dev/testing without database
let memoryProviders: AppointmentProvider[] = [
  {
    id: "prv_mock_01",
    storeId: "str_07",
    name: "Adv. Rajeshwari Sen",
    role: "Senior Partner, Corporate Law",
    email: "rajeshwari@example.com",
    status: "active",
    createdAt: "2026-10-14T09:00:00Z",
    updatedAt: "2026-10-14T09:00:00Z",
  },
];

export const ProviderRepository = {
  async findByStoreId(
    storeId: string,
    filter?: { status?: "active" | "inactive" }
  ): Promise<AppointmentProvider[]> {
    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = { storeId };
        if (filter?.status) {
          query.status = filter.status;
        }

        const providers = await db
          .collection<AppointmentProvider>("appointment_providers")
          .find(query)
          .sort({ createdAt: 1 })
          .toArray();

        return providers.map((p) => {
          const raw = { ...p } as Record<string, unknown>;
          const id = p.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id } as unknown as AppointmentProvider;
        });
      } catch (err) {
        console.warn("MongoDB query error in ProviderRepository.findByStoreId, falling back to memory:", err);
      }
    }

    return memoryProviders.filter((p) => {
      if (p.storeId !== storeId) return false;
      if (filter?.status && p.status !== filter.status) return false;
      return true;
    });
  },

  async findById(id: string): Promise<AppointmentProvider | null> {
    const db = await getDb();
    if (db) {
      try {
        const provider = await db
          .collection<AppointmentProvider>("appointment_providers")
          .findOne({ id });
        if (provider) {
          const raw = { ...provider } as Record<string, unknown>;
          const cleanId = provider.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id: cleanId } as unknown as AppointmentProvider;
        }
      } catch (err) {
        console.warn("MongoDB query error in ProviderRepository.findById, falling back to memory:", err);
      }
    }

    return memoryProviders.find((p) => p.id === id) || null;
  },

  async create(providerData: Partial<AppointmentProvider> & { storeId: string; name: string }): Promise<AppointmentProvider> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create provider: database is unavailable in production.");
    }

    const id = providerData.id || `prv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullProvider: AppointmentProvider = {
      role: "Professional",
      email: providerData.email || "",
      isActive: true,
      ...providerData,
      id,
      createdAt: providerData.createdAt || new Date().toISOString(),
      updatedAt: providerData.updatedAt || new Date().toISOString(),
    };

    if (db) {
      try {
        await db.collection<AppointmentProvider>("appointment_providers").insertOne({ ...fullProvider });
        return fullProvider;
      } catch (err) {
        if (!isFallbackAllowed()) throw err;
        console.warn("MongoDB insert error in ProviderRepository.create:", err);
      }
    }

    memoryProviders.push(fullProvider);
    return fullProvider;
  },

  async update(id: string, updates: Partial<AppointmentProvider>): Promise<AppointmentProvider | null> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot update provider: database is unavailable in production.");
    }

    const now = new Date().toISOString();
    const dataToUpdate = { ...updates, updatedAt: now };

    if (db) {
      try {
        await db
          .collection<AppointmentProvider>("appointment_providers")
          .updateOne({ id }, { $set: dataToUpdate });
        return this.findById(id);
      } catch (err) {
        if (!isFallbackAllowed()) throw err;
        console.warn("MongoDB update error in ProviderRepository.update:", err);
      }
    }

    const index = memoryProviders.findIndex((p) => p.id === id);
    if (index !== -1) {
      memoryProviders[index] = { ...memoryProviders[index], ...dataToUpdate };
      return memoryProviders[index];
    }
    return null;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (db) {
      try {
        const result = await db
          .collection<AppointmentProvider>("appointment_providers")
          .deleteOne({ id });
        return result.deletedCount > 0;
      } catch (err) {
        console.warn("MongoDB delete error in ProviderRepository.delete:", err);
      }
    }

    const initialLen = memoryProviders.length;
    memoryProviders = memoryProviders.filter((p) => p.id !== id);
    return memoryProviders.length < initialLen;
  },

  async deleteByStoreId(storeId: string): Promise<number> {
    const db = await getDb();
    if (db) {
      try {
        const result = await db
          .collection<AppointmentProvider>("appointment_providers")
          .deleteMany({ storeId });
        return result.deletedCount;
      } catch (err) {
        console.warn("MongoDB deleteMany error in ProviderRepository.deleteByStoreId:", err);
      }
    }

    const initialLen = memoryProviders.length;
    memoryProviders = memoryProviders.filter((p) => p.storeId !== storeId);
    return initialLen - memoryProviders.length;
  },

  _clearMemory(): void {
    memoryProviders = [];
  },
};
