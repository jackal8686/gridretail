import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { MediaAsset } from "@/types/media";

let memoryAssets: MediaAsset[] = [];

export const MediaAssetRepository = {
  async create(asset: MediaAsset): Promise<MediaAsset> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create media asset: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<MediaAsset>("media_assets").insertOne({ ...asset });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB insert error in MediaAssetRepository.create:", err);
      }
    }

    memoryAssets.push(asset);
    return asset;
  },

  async findByStoreId(storeId: string): Promise<MediaAsset[]> {
    const db = await getDb();
    if (db) {
      try {
        const results = await db
          .collection<MediaAsset>("media_assets")
          .find({ storeId })
          .sort({ uploadedAt: -1 })
          .toArray();
        return results;
      } catch (err) {
        console.warn("MongoDB query error in MediaAssetRepository.findByStoreId:", err);
      }
    }

    return memoryAssets
      .filter((a) => a.storeId === storeId)
      .sort((a, b) => new Date(b.uploadedAt).getTime() - new Date(a.uploadedAt).getTime());
  },

  async findById(id: string): Promise<MediaAsset | null> {
    const db = await getDb();
    if (db) {
      try {
        const found = await db.collection<MediaAsset>("media_assets").findOne({ id });
        if (found) return found;
      } catch (err) {
        console.warn("MongoDB query error in MediaAssetRepository.findById:", err);
      }
    }

    return memoryAssets.find((a) => a.id === id) || null;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot delete media asset: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<MediaAsset>("media_assets").deleteOne({ id });
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB delete error in MediaAssetRepository.delete:", err);
      }
    }

    const idx = memoryAssets.findIndex((a) => a.id === id);
    if (idx !== -1) {
      memoryAssets.splice(idx, 1);
      return true;
    }
    return false;
  },

  _resetMemory(assets?: MediaAsset[]) {
    memoryAssets = assets ? [...assets] : [];
  },
};
