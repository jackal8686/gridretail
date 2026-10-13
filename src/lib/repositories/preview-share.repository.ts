import { getDb } from "@/lib/db/mongodb";
import { PreviewShare, ShareStatus } from "@/types/preview-share";

let memoryShares: PreviewShare[] = [];

export const PreviewShareRepository = {
  async create(share: PreviewShare): Promise<PreviewShare> {
    const db = await getDb();
    if (db) {
      try {
        await db.collection<PreviewShare>("preview_shares").insertOne({ ...share });
      } catch (err) {
        console.warn("MongoDB insert error in PreviewShareRepository.create:", err);
      }
    }

    memoryShares.push(share);
    return share;
  },

  async findByTokenHash(tokenHash: string): Promise<PreviewShare | null> {
    const db = await getDb();
    if (db) {
      try {
        const found = await db.collection<PreviewShare>("preview_shares").findOne({ tokenHash });
        if (found) {
          return this.computeLiveStatus(found);
        }
      } catch (err) {
        console.warn("MongoDB query error in PreviewShareRepository.findByTokenHash:", err);
      }
    }

    const mem = memoryShares.find((s) => s.tokenHash === tokenHash);
    return mem ? this.computeLiveStatus(mem) : null;
  },

  async findByStoreId(storeId: string): Promise<PreviewShare[]> {
    const db = await getDb();
    if (db) {
      try {
        const results = await db
          .collection<PreviewShare>("preview_shares")
          .find({ storeId })
          .sort({ createdAt: -1 })
          .toArray();
        return results.map((s) => this.computeLiveStatus(s));
      } catch (err) {
        console.warn("MongoDB query error in PreviewShareRepository.findByStoreId:", err);
      }
    }

    return memoryShares
      .filter((s) => s.storeId === storeId)
      .map((s) => this.computeLiveStatus(s))
      .sort((a, b) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime());
  },

  async revoke(id: string, revokedBy: string): Promise<PreviewShare | null> {
    const now = new Date().toISOString();
    const db = await getDb();
    if (db) {
      try {
        await db.collection<PreviewShare>("preview_shares").updateOne(
          { id },
          {
            $set: {
              status: "revoked",
              revokedAt: now,
              revokedBy,
            },
          }
        );
      } catch (err) {
        console.warn("MongoDB update error in PreviewShareRepository.revoke:", err);
      }
    }

    const idx = memoryShares.findIndex((s) => s.id === id);
    if (idx !== -1) {
      memoryShares[idx] = {
        ...memoryShares[idx],
        status: "revoked",
        revokedAt: now,
        revokedBy,
      };
      return memoryShares[idx];
    }
    return null;
  },

  async recordAccess(id: string): Promise<void> {
    const now = new Date().toISOString();
    const db = await getDb();
    if (db) {
      try {
        await db.collection<PreviewShare>("preview_shares").updateOne(
          { id },
          {
            $inc: { accessCount: 1 },
            $set: { lastAccessedAt: now },
          }
        );
      } catch (err) {
        console.warn("MongoDB recordAccess error:", err);
      }
    }

    const idx = memoryShares.findIndex((s) => s.id === id);
    if (idx !== -1) {
      memoryShares[idx] = {
        ...memoryShares[idx],
        accessCount: (memoryShares[idx].accessCount || 0) + 1,
        lastAccessedAt: now,
      };
    }
  },

  computeLiveStatus(share: PreviewShare): PreviewShare {
    if (share.status === "revoked" || share.revokedAt) {
      return { ...share, status: "revoked" as ShareStatus };
    }
    const isExpired = new Date(share.expiresAt).getTime() <= Date.now();
    if (isExpired) {
      return { ...share, status: "expired" as ShareStatus };
    }
    return { ...share, status: "active" as ShareStatus };
  },

  _resetMemory(shares?: PreviewShare[]) {
    memoryShares = shares ? [...shares] : [];
  },
};
