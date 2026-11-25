import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { Store, UpdateStoreInput, StoreBranding } from "@/types";
import { MOCK_STORES } from "@/mock/stores";

// In-memory fallback dataset for seamless dev/testing without database
let memoryStores: Store[] = [...MOCK_STORES];

// Per-store asynchronous mutex queue to strictly serialize concurrent operations in fallback mode
const storeMutexes = new Map<string, Promise<unknown>>();

/**
 * Executes an operation with an exclusive per-store asynchronous lock.
 * Prevents race conditions and interleaved concurrent operations on the same store.
 */
export async function withStoreLock<T>(storeId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = storeMutexes.get(storeId) || Promise.resolve();
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tailPromise = currentLock.then(() => nextLock, () => nextLock);
  storeMutexes.set(storeId, tailPromise);
  try {
    await currentLock;
    return await fn();
  } finally {
    release!();
    if (storeMutexes.get(storeId) === tailPromise) {
      storeMutexes.delete(storeId);
    }
  }
}

// Internal diagnostics for test assertions (not exposed in public API)
export function _getStoreMutexCount(): number {
  return storeMutexes.size;
}

export function _hasStoreMutex(storeId: string): boolean {
  return storeMutexes.has(storeId);
}

export const EDITOR_MANAGED_FIELDS: readonly string[] = [
  "name",
  "description",
  "branding",
  "styling",
  "sections",
  "pageSections",
  "enabledSections",
  "orderedSections",
  "themeId",
  "themeName",
  "templateId",
  "templateName",
  "slug",
  "businessProfile",
];

export function hasEditorManagedFields(updates: UpdateStoreInput): boolean {
  const keys = Object.keys(updates);
  return keys.some((k) => EDITOR_MANAGED_FIELDS.includes(k));
}

/**
 * Helper to compute deep-merged branding, styling and section synchronization.
 */
function computeMergedStoreUpdates(
  existing: Store,
  updates: UpdateStoreInput,
  effectiveVersion?: number
): Partial<Store> {
  const mergedUpdates = { ...updates } as Partial<Store>;
  delete (mergedUpdates as Record<string, unknown>).serverAutoVersion;
  delete (mergedUpdates as Record<string, unknown>).allowUnversioned;

  if (updates.branding) {
    mergedUpdates.branding = {
      ...existing.branding,
      ...updates.branding,
      logoUrl: updates.branding.logoUrl !== undefined ? updates.branding.logoUrl : existing.branding?.logoUrl,
      bannerUrl: updates.branding.bannerUrl !== undefined ? updates.branding.bannerUrl : existing.branding?.bannerUrl,
    } as StoreBranding;
  }

  if (updates.styling) {
    mergedUpdates.styling = {
      ...existing.styling,
      ...updates.styling,
    };
  }

  if (updates.businessProfile) {
    mergedUpdates.businessProfile = {
      ...existing.businessProfile,
      ...updates.businessProfile,
    };
  }

  const currentSections =
    mergedUpdates.sections || (!updates.sections && existing.sections ? existing.sections : undefined);
  if (currentSections && Array.isArray(currentSections) && updates.branding) {
    const banner = mergedUpdates.branding?.bannerUrl;
    const headline = updates.branding.heroHeadline;
    const subheadline = updates.branding.heroSubheadline;
    const cta = updates.branding.ctaText;
    const about = updates.branding.aboutText;
    const logo = updates.branding.logoUrl;

    mergedUpdates.sections = currentSections.map((sec) => {
      if (sec.type.startsWith("hero_") || sec.type === "promotional_banner") {
        const s = sec.settings || {};
        const newBanner = updates.branding?.bannerUrl !== undefined ? updates.branding.bannerUrl : banner;
        const effectiveBanner =
          newBanner !== undefined ? newBanner : s.imageUrl || s.backgroundImageUrl || s.bannerUrl;

        return {
          ...sec,
          settings: {
            ...s,
            ...(newBanner !== undefined
              ? {
                  imageUrl: newBanner,
                  backgroundImageUrl: newBanner,
                  bannerUrl: newBanner,
                }
              : effectiveBanner
              ? {
                  imageUrl: s.imageUrl || effectiveBanner,
                  backgroundImageUrl: s.backgroundImageUrl || effectiveBanner,
                  bannerUrl: s.bannerUrl || effectiveBanner,
                }
              : {}),
            ...(headline !== undefined ? { headline } : {}),
            ...(subheadline !== undefined ? { subheadline } : {}),
            ...(cta !== undefined ? { ctaText: cta } : {}),
          },
        };
      }
      if (sec.type === "brand_story") {
        const s = sec.settings || {};
        return {
          ...sec,
          settings: {
            ...s,
            ...(about !== undefined ? { bodyParagraph1: about } : {}),
            ...(logo !== undefined ? { imageUrl: logo } : {}),
          },
        };
      }
      return sec;
    });
  }

  const now = new Date().toISOString();
  return {
    ...mergedUpdates,
    lastUpdated: now,
    ...(effectiveVersion !== undefined ? { version: effectiveVersion } : {}),
  };
}

export const StoreRepository = {
  async findAll(filter?: { status?: string; industry?: string; search?: string; excludeArchived?: boolean }): Promise<Store[]> {
    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = {};
        if (filter?.status && filter.status !== "ALL") {
          query.status = filter.status;
        } else if (filter?.excludeArchived) {
          query.status = { $ne: "Archived" };
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

        return stores.map((s) => {
          const raw = { ...s } as Record<string, unknown>;
          const id = s.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id } as unknown as Store;
        });
      } catch (err) {
        console.warn("MongoDB query error in StoreRepository.findAll, falling back to memory:", err);
      }
    }

    // In-memory fallback
    return memoryStores.filter((store) => {
      const matchStatus = !filter?.status || filter.status === "ALL" || store.status === filter.status;
      const matchArchived = filter?.excludeArchived && (!filter.status || filter.status === "ALL") ? store.status !== "Archived" : true;
      const matchIndustry = !filter?.industry || filter.industry === "ALL" || store.industry === filter.industry;
      const matchSearch =
        !filter?.search ||
        store.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        store.clientName.toLowerCase().includes(filter.search.toLowerCase()) ||
        store.templateName.toLowerCase().includes(filter.search.toLowerCase());
      return matchStatus && matchArchived && matchIndustry && matchSearch;
    });
  },

  async findById(id: string): Promise<Store | null> {
    const ALIAS_MAP: Record<string, string> = {
      str_summit: "str_07",
      str_apex: "str_08",
    };
    const lookupId = ALIAS_MAP[id] || id;

    const db = await getDb();
    if (db) {
      try {
        const store = await db.collection<Store>("stores").findOne({
          $or: [{ id: lookupId }, { slug: lookupId.toLowerCase() }],
        });
        if (store) {
          const raw = { ...store } as Record<string, unknown>;
          const storeId = store.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id: storeId } as unknown as Store;
        }
      } catch (err) {
        console.warn("MongoDB query error in StoreRepository.findById:", err);
      }
    }
    return (
      memoryStores.find((s) => s.id === lookupId || (Boolean(lookupId) && typeof lookupId === "string" && s.slug === lookupId.toLowerCase())) || null
    );
  },

  async findBySlug(slug: string): Promise<Store | null> {
    const normalized = slug.toLowerCase().trim();
    const db = await getDb();
    if (db) {
      try {
        const store = await db.collection<Store>("stores").findOne({ slug: normalized });
        if (store) {
          const raw = { ...store } as Record<string, unknown>;
          const id = store.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id } as unknown as Store;
        }
      } catch (err) {
        console.warn("MongoDB query error in StoreRepository.findBySlug:", err);
      }
    }
    return memoryStores.find((s) => s.slug === normalized) || null;
  },

  async findByClientId(clientId: string): Promise<Store[]> {
    const all = await this.findAll();
    return all.filter((s) => s.clientId === clientId);
  },

  async detachClientStores(clientId: string): Promise<number> {
    const stores = await this.findByClientId(clientId);
    for (const st of stores) {
      await this.update(st.id, {
        clientId: "cli_unassigned",
        clientName: "Unassigned Client",
        allowUnversioned: true,
      });
    }
    return stores.length;
  },

  async create(storeData: Store): Promise<Store> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create store: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<Store>("stores").insertOne({ ...storeData });
        return storeData;
      } catch (err: unknown) {
        // Enforce hostname uniqueness: catch MongoDB unique index violation (code 11000)
        if ((err as { code?: number })?.code === 11000) {
          throw new Error(`Store slug "${storeData.slug}" is already in use by another store.`);
        }
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB insert error in StoreRepository.create:", err);
      }
    }

    // In-memory fallback collision check
    const existing = memoryStores.find((s) => s.slug === storeData.slug && s.id !== storeData.id);
    if (existing) {
      throw new Error(`Store slug "${storeData.slug}" is already in use by another store.`);
    }

    memoryStores.unshift(storeData);
    return storeData;
  },

  async update(id: string, updates: UpdateStoreInput): Promise<Store | null> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot update store: database is unavailable in production.");
    }

    const incomingVersion =
      typeof (updates as Record<string, unknown>).version === "number"
        ? ((updates as Record<string, unknown>).version as number)
        : typeof (updates as Record<string, unknown>).clientVersion === "number"
        ? ((updates as Record<string, unknown>).clientVersion as number)
        : undefined;

    const isScopedAutoVersion = Boolean((updates as Record<string, unknown>).serverAutoVersion);
    const isScopedAllowUnversioned = Boolean((updates as Record<string, unknown>).allowUnversioned);
    const touchesEditorData = hasEditorManagedFields(updates);

    // Genuinely Atomic MongoDB Persistence
    if (db) {
      try {
        const existing = await this.findById(id);
        if (!existing) {
          return null;
        }

        const isStoreVersioned = typeof existing.version === "number";

        // Fast-path stale & unversioned write policy evaluation
        if (incomingVersion !== undefined) {
          if (typeof existing.version === "number" && incomingVersion <= existing.version) {
            return existing;
          }
        } else if (isStoreVersioned && touchesEditorData && !isScopedAutoVersion && !isScopedAllowUnversioned) {
          // Unversioned write attempted on versioned store without scoped compatibility: protect versioned snapshot
          return existing;
        }

        let effectiveVersion: number | undefined;
        let atomicFilter: Record<string, unknown>;

        if (incomingVersion !== undefined) {
          effectiveVersion = incomingVersion;
          atomicFilter = {
            id,
            $or: [
              { version: { $exists: false } },
              { version: { $lt: incomingVersion } },
            ],
          };
        } else if (typeof existing.version === "number") {
          if (isScopedAutoVersion) {
            effectiveVersion = existing.version + 1;
            atomicFilter = { id, version: existing.version };
          } else if (isScopedAllowUnversioned || !touchesEditorData) {
            effectiveVersion = existing.version;
            atomicFilter = { id, version: existing.version };
          } else {
            return existing;
          }
        } else {
          // Legacy unversioned store
          effectiveVersion = undefined;
          atomicFilter = { id, version: { $exists: false } };
        }

        const dataToUpdate = computeMergedStoreUpdates(existing, updates, effectiveVersion);

        const updateResult = await db.collection<Store>("stores").updateOne(atomicFilter, { $set: dataToUpdate });

        if (updateResult.matchedCount === 0) {
          // Document was either not found or had version predicate fail (concurrent write won the race)
          const currentStore = await db.collection<Store>("stores").findOne({ id });
          return currentStore ? (currentStore as Store) : null;
        }

        return this.findById(id);
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB update error in StoreRepository.update:", err);
      }
    }

    // In-Memory Fallback Persistence: Serialized strictly via per-store asynchronous mutex
    return withStoreLock(id, async () => {
      const index = memoryStores.findIndex((s) => s.id === id);
      if (index === -1) {
        return null;
      }
      const existing = memoryStores[index];

      let effectiveVersion: number | undefined;

      if (incomingVersion !== undefined) {
        if (typeof existing.version === "number" && incomingVersion <= existing.version) {
          return existing;
        }
        effectiveVersion = incomingVersion;
      } else if (typeof existing.version === "number") {
        if (isScopedAutoVersion) {
          effectiveVersion = existing.version + 1;
        } else if (isScopedAllowUnversioned || !touchesEditorData) {
          effectiveVersion = existing.version;
        } else {
          // Unversioned write policy violation: cannot overwrite versioned store without version
          return existing;
        }
      } else {
        effectiveVersion = undefined;
      }

      const dataToUpdate = computeMergedStoreUpdates(existing, updates, effectiveVersion);
      memoryStores[index] = { ...existing, ...dataToUpdate };
      return memoryStores[index];
    });
  },

  async isSlugAvailable(slug: string, excludeId?: string): Promise<boolean> {
    const existing = await this.findBySlug(slug);
    if (!existing) return true;
    if (excludeId && existing.id === excludeId) return true;
    return false;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot delete store: database is unavailable in production.");
    }
    if (db) {
      try {
        const res = await db.collection<Store>("stores").deleteOne({ id });
        const memIdx = memoryStores.findIndex((s) => s.id === id);
        if (memIdx !== -1) memoryStores.splice(memIdx, 1);
        return res.deletedCount > 0;
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB delete error in StoreRepository.delete:", err);
      }
    }

    const index = memoryStores.findIndex((s) => s.id === id);
    if (index !== -1) {
      memoryStores.splice(index, 1);
      return true;
    }
    return false;
  },

  // Reset method for unit tests
  _resetMemory(stores?: Store[]) {
    memoryStores = stores ? [...stores] : [...MOCK_STORES];
  },
};
