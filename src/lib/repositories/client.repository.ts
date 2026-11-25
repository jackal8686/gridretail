import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { Client } from "@/types";
import { MOCK_CLIENTS } from "@/mock/clients";
import { StoreRepository } from "@/lib/repositories/store.repository";

let memoryClients: Client[] = [...MOCK_CLIENTS];

export const ClientRepository = {
  async findAll(filter?: { status?: string; search?: string }): Promise<Client[]> {
    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = {};
        if (filter?.status && filter.status !== "ALL") {
          query.status = filter.status;
        }
        if (filter?.search) {
          query.$or = [
            { name: { $regex: filter.search, $options: "i" } },
            { company: { $regex: filter.search, $options: "i" } },
            { contactEmail: { $regex: filter.search, $options: "i" } },
          ];
        }

        const clients = await db
          .collection<Client>("clients")
          .find(query)
          .sort({ company: 1 })
          .toArray();

        return clients.map((c) => ({
          ...c,
          id: c.id || (c as unknown as { _id: { toString: () => string } })._id?.toString(),
        }));
      } catch (err) {
        console.warn("MongoDB query error in ClientRepository.findAll:", err);
      }
    }

    return memoryClients.filter((client) => {
      const matchStatus = !filter?.status || filter.status === "ALL" || client.status === filter.status;
      const matchSearch =
        !filter?.search ||
        client.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        client.company.toLowerCase().includes(filter.search.toLowerCase()) ||
        client.contactEmail.toLowerCase().includes(filter.search.toLowerCase());
      return matchStatus && matchSearch;
    });
  },

  async findById(id: string): Promise<Client | null> {
    const db = await getDb();
    if (db) {
      try {
        const client = await db.collection<Client>("clients").findOne({ id });
        if (client) {
          return {
            ...client,
            id: client.id || (client as unknown as { _id: { toString: () => string } })._id?.toString(),
          };
        }
      } catch (err) {
        console.warn("MongoDB query error in ClientRepository.findById:", err);
      }
    }
    return memoryClients.find((c) => c.id === id) || null;
  },

  async findByCompany(company: string): Promise<Client | null> {
    const trimmed = company.trim().toLowerCase();
    const db = await getDb();
    if (db) {
      try {
        const client = await db.collection<Client>("clients").findOne({
          company: { $regex: `^${trimmed.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}$`, $options: "i" },
        });
        if (client) {
          return {
            ...client,
            id: client.id || (client as unknown as { _id: { toString: () => string } })._id?.toString(),
          };
        }
      } catch (err) {
        console.warn("MongoDB query error in ClientRepository.findByCompany:", err);
      }
    }
    return memoryClients.find((c) => c.company.trim().toLowerCase() === trimmed) || null;
  },

  async create(clientData: Client): Promise<Client> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create client: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<Client>("clients").insertOne({ ...clientData });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB insert error in ClientRepository.create:", err);
      }
    }
    memoryClients.push(clientData);
    return clientData;
  },

  async incrementStoreCount(clientId: string): Promise<void> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot increment store count: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<Client>("clients").updateOne({ id: clientId }, { $inc: { storeCount: 1 } });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB update error in ClientRepository.incrementStoreCount:", err);
      }
    }
    const client = memoryClients.find((c) => c.id === clientId);
    if (client) {
      client.storeCount += 1;
    }
  },

  async update(id: string, updates: Partial<Client>): Promise<Client | null> {
    const db = await getDb();
    if (db) {
      try {
        await db.collection<Client>("clients").updateOne({ id }, { $set: updates });
        return this.findById(id);
      } catch (err) {
        console.warn("MongoDB update error in ClientRepository.update:", err);
      }
    }
    const idx = memoryClients.findIndex((c) => c.id === id);
    if (idx !== -1) {
      memoryClients[idx] = { ...memoryClients[idx], ...updates };
      return memoryClients[idx];
    }
    return null;
  },

  async archive(id: string): Promise<Client | null> {
    return this.update(id, { status: "Archived" });
  },

  async canDelete(
    id: string
  ): Promise<{ canDelete: boolean; storeCount: number; linkedStores: { id: string; name: string; slug: string }[]; reason?: string }> {
    const client = await this.findById(id);
    if (!client) {
      return { canDelete: true, storeCount: 0, linkedStores: [] };
    }
    const allStores = await StoreRepository.findAll();
    const linkedStores = allStores.filter(
      (s) => s.clientId === id || (client.company && s.clientName.toLowerCase() === client.company.toLowerCase())
    );
    if (linkedStores.length > 0) {
      return {
        canDelete: false,
        storeCount: linkedStores.length,
        linkedStores: linkedStores.map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
        reason: `Client has ${linkedStores.length} active associated demo store(s). Archive client or detach stores first to prevent dangling invalid references.`,
      };
    }
    return { canDelete: true, storeCount: 0, linkedStores: [] };
  },

  async delete(id: string, options?: { detachStores?: boolean; force?: boolean }): Promise<boolean> {
    if (!options?.detachStores && !options?.force) {
      const check = await this.canDelete(id);
      if (!check.canDelete) {
        throw new Error(check.reason);
      }
    }

    if (options?.detachStores) {
      await StoreRepository.detachClientStores(id);
    }

    const db = await getDb();
    if (db) {
      try {
        const res = await db.collection<Client>("clients").deleteOne({ id });
        const memIdx = memoryClients.findIndex((c) => c.id === id);
        if (memIdx !== -1) memoryClients.splice(memIdx, 1);
        return res.deletedCount > 0;
      } catch (err) {
        console.warn("MongoDB delete error in ClientRepository.delete:", err);
      }
    }
    const idx = memoryClients.findIndex((c) => c.id === id);
    if (idx !== -1) {
      memoryClients.splice(idx, 1);
      return true;
    }
    return false;
  },

  _resetMemory(clients?: Client[]) {
    memoryClients = clients ? [...clients] : [...MOCK_CLIENTS];
  },
};
