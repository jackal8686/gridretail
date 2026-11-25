import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { DeploymentRecord, DeploymentStatus } from "@/types/deployment";

let memoryDeployments: DeploymentRecord[] = [];

export const DeploymentRepository = {
  async create(record: DeploymentRecord): Promise<DeploymentRecord> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create deployment: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<DeploymentRecord>("deployments").insertOne({ ...record });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB insert error in DeploymentRepository.create:", err);
      }
    }

    memoryDeployments.push(record);
    return record;
  },

  async findById(id: string): Promise<DeploymentRecord | null> {
    const db = await getDb();
    if (db) {
      try {
        const found = await db.collection<DeploymentRecord>("deployments").findOne({ id });
        if (found) return found;
      } catch (err) {
        console.warn("MongoDB query error in DeploymentRepository.findById:", err);
      }
    }

    return memoryDeployments.find((d) => d.id === id) || null;
  },

  async findByStoreId(storeId: string): Promise<DeploymentRecord[]> {
    const db = await getDb();
    if (db) {
      try {
        const results = await db
          .collection<DeploymentRecord>("deployments")
          .find({ storeId })
          .sort({ createdAt: -1 })
          .toArray();
        return results;
      } catch (err) {
        console.warn("MongoDB query error in DeploymentRepository.findByStoreId:", err);
      }
    }

    return memoryDeployments
      .filter((d) => d.storeId === storeId)
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async updateStatus(
    id: string,
    status: DeploymentStatus,
    updates?: Partial<DeploymentRecord>
  ): Promise<DeploymentRecord | null> {
    const updatedAt = new Date().toISOString();
    const patch: Partial<DeploymentRecord> = {
      ...updates,
      status,
      updatedAt,
      ...(status === "ready" && !updates?.deployedAt ? { deployedAt: updatedAt } : {}),
    };

    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot update deployment status: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<DeploymentRecord>("deployments").updateOne({ id }, { $set: patch });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB update error in DeploymentRepository.updateStatus:", err);
      }
    }

    const index = memoryDeployments.findIndex((d) => d.id === id);
    if (index !== -1) {
      memoryDeployments[index] = {
        ...memoryDeployments[index],
        ...patch,
      };
      return memoryDeployments[index];
    }

    return this.findById(id);
  },

  _resetMemory(records?: DeploymentRecord[]) {
    memoryDeployments = records ? [...records] : [];
  },
};
