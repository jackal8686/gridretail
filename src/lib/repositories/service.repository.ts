import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { AppointmentService } from "@/types/appointment";

// In-memory fallback dataset for seamless dev/testing without database
let memoryServices: AppointmentService[] = [
  {
    id: "srv_mock_01",
    storeId: "str_07",
    name: "Corporate Mergers & Acquisitions Advisory",
    description: "60-minute confidential consultation on restructuring, due diligence, and regulatory compliance.",
    durationMinutes: 60,
    price: 15000,
    currency: "INR",
    meetingType: "video_call",
    status: "active",
    createdAt: "2026-10-14T09:00:00Z",
    updatedAt: "2026-10-14T09:00:00Z",
  },
];

export const ServiceRepository = {
  async findByStoreId(
    storeId: string,
    filter?: { status?: "active" | "inactive" }
  ): Promise<AppointmentService[]> {
    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = { storeId };
        if (filter?.status) {
          query.status = filter.status;
        }

        const services = await db
          .collection<AppointmentService>("appointment_services")
          .find(query)
          .sort({ createdAt: 1 })
          .toArray();

        return services.map((s) => {
          const raw = { ...s } as Record<string, unknown>;
          const id = s.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id } as unknown as AppointmentService;
        });
      } catch (err) {
        console.warn("MongoDB query error in ServiceRepository.findByStoreId, falling back to memory:", err);
      }
    }

    return memoryServices.filter((s) => {
      if (s.storeId !== storeId) return false;
      if (filter?.status && s.status !== filter.status) return false;
      return true;
    });
  },

  async findById(id: string): Promise<AppointmentService | null> {
    const db = await getDb();
    if (db) {
      try {
        const service = await db
          .collection<AppointmentService>("appointment_services")
          .findOne({ id });
        if (service) {
          const raw = { ...service } as Record<string, unknown>;
          const cleanId = service.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id: cleanId } as unknown as AppointmentService;
        }
      } catch (err) {
        console.warn("MongoDB query error in ServiceRepository.findById, falling back to memory:", err);
      }
    }

    return memoryServices.find((s) => s.id === id) || null;
  },

  async create(serviceData: Partial<AppointmentService> & { storeId: string; name: string }): Promise<AppointmentService> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create service: database is unavailable in production.");
    }

    const id = serviceData.id || `srv_${Date.now()}_${Math.random().toString(36).substring(2, 7)}`;
    const fullService: AppointmentService = {
      description: serviceData.description || "Professional service.",
      durationMinutes: 45,
      price: 0,
      isFreeConsultation: serviceData.price === 0,
      currency: "INR",
      meetingType: "video_call",
      isActive: true,
      ...serviceData,
      id,
      createdAt: serviceData.createdAt || new Date().toISOString(),
      updatedAt: serviceData.updatedAt || new Date().toISOString(),
    };

    if (db) {
      try {
        await db.collection<AppointmentService>("appointment_services").insertOne({ ...fullService });
        return fullService;
      } catch (err) {
        if (!isFallbackAllowed()) throw err;
        console.warn("MongoDB insert error in ServiceRepository.create:", err);
      }
    }

    memoryServices.push(fullService);
    return fullService;
  },

  async update(id: string, updates: Partial<AppointmentService>): Promise<AppointmentService | null> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot update service: database is unavailable in production.");
    }

    const now = new Date().toISOString();
    const dataToUpdate = { ...updates, updatedAt: now };

    if (db) {
      try {
        await db
          .collection<AppointmentService>("appointment_services")
          .updateOne({ id }, { $set: dataToUpdate });
        return this.findById(id);
      } catch (err) {
        if (!isFallbackAllowed()) throw err;
        console.warn("MongoDB update error in ServiceRepository.update:", err);
      }
    }

    const index = memoryServices.findIndex((s) => s.id === id);
    if (index !== -1) {
      memoryServices[index] = { ...memoryServices[index], ...dataToUpdate };
      return memoryServices[index];
    }
    return null;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (db) {
      try {
        const result = await db
          .collection<AppointmentService>("appointment_services")
          .deleteOne({ id });
        return result.deletedCount > 0;
      } catch (err) {
        console.warn("MongoDB delete error in ServiceRepository.delete:", err);
      }
    }

    const initialLen = memoryServices.length;
    memoryServices = memoryServices.filter((s) => s.id !== id);
    return memoryServices.length < initialLen;
  },

  async deleteByStoreId(storeId: string): Promise<number> {
    const db = await getDb();
    if (db) {
      try {
        const result = await db
          .collection<AppointmentService>("appointment_services")
          .deleteMany({ storeId });
        return result.deletedCount;
      } catch (err) {
        console.warn("MongoDB deleteMany error in ServiceRepository.deleteByStoreId:", err);
      }
    }

    const initialLen = memoryServices.length;
    memoryServices = memoryServices.filter((s) => s.storeId !== storeId);
    return initialLen - memoryServices.length;
  },

  // Helper for tests/resetting
  _clearMemory(): void {
    memoryServices = [];
  },
};
