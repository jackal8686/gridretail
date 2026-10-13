import { getDb } from "@/lib/db/mongodb";
import { Client } from "@/types";
import { MOCK_CLIENTS } from "@/mock/clients";

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

  async create(clientData: Client): Promise<Client> {
    const db = await getDb();
    if (db) {
      try {
        await db.collection<Client>("clients").insertOne({ ...clientData });
      } catch (err) {
        console.warn("MongoDB insert error in ClientRepository.create:", err);
      }
    }
    memoryClients.push(clientData);
    return clientData;
  },

  async incrementStoreCount(clientId: string): Promise<void> {
    const db = await getDb();
    if (db) {
      try {
        await db.collection<Client>("clients").updateOne({ id: clientId }, { $inc: { storeCount: 1 } });
      } catch (err) {
        console.warn("MongoDB update error in ClientRepository.incrementStoreCount:", err);
      }
    }
    const client = memoryClients.find((c) => c.id === clientId);
    if (client) {
      client.storeCount += 1;
    }
  },

  _resetMemory(clients?: Client[]) {
    memoryClients = clients ? [...clients] : [...MOCK_CLIENTS];
  },
};
