import { getDb, isFallbackAllowed, DatabaseUnavailableError } from "@/lib/db/mongodb";
import { Product } from "@/types";
import { MOCK_PRODUCTS } from "@/mock/products";

let memoryProducts: Product[] = [...MOCK_PRODUCTS];

export const ProductRepository = {
  async findAll(filter?: {
    category?: string;
    search?: string;
    ids?: string[];
    storeId?: string;
    status?: "active" | "draft";
  }): Promise<Product[]> {
    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = {};
        if (filter?.storeId) {
          query.storeId = filter.storeId;
        }
        if (filter?.status) {
          query.status = filter.status;
        }
        if (filter?.category && filter.category !== "ALL") {
          query.category = filter.category;
        }
        if (filter?.ids && filter.ids.length > 0) {
          query.id = { $in: filter.ids };
        }
        if (filter?.search) {
          query.$or = [
            { name: { $regex: filter.search, $options: "i" } },
            { sku: { $regex: filter.search, $options: "i" } },
            { category: { $regex: filter.search, $options: "i" } },
          ];
        }

        const products = await db.collection<Product>("products").find(query).toArray();
        if (products.length > 0) {
          return products.map((p) => {
            const raw = { ...p } as Record<string, unknown>;
            const id = p.id || (raw._id ? String(raw._id) : "");
            delete raw._id;
            return { ...raw, id } as unknown as Product;
          });
        }
      } catch (err) {
        console.warn("MongoDB query error in ProductRepository.findAll:", err);
      }
    }

    return memoryProducts.filter((prod) => {
      const matchStoreId = !filter?.storeId || prod.storeId === filter.storeId;
      const matchStatus = !filter?.status || (prod.status || "active") === filter.status;
      const matchCategory = !filter?.category || filter.category === "ALL" || prod.category === filter.category;
      const matchIds = !filter?.ids || filter.ids.length === 0 || filter.ids.includes(prod.id);
      const matchSearch =
        !filter?.search ||
        prod.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        prod.sku.toLowerCase().includes(filter.search.toLowerCase()) ||
        prod.category.toLowerCase().includes(filter.search.toLowerCase());
      return matchStoreId && matchStatus && matchCategory && matchIds && matchSearch;
    });
  },

  async findById(id: string): Promise<Product | null> {
    const db = await getDb();
    if (db) {
      try {
        const product = await db.collection<Product>("products").findOne({ id });
        if (product) {
          const raw = { ...product } as Record<string, unknown>;
          const id = product.id || (raw._id ? String(raw._id) : "");
          delete raw._id;
          return { ...raw, id } as unknown as Product;
        }
      } catch (err) {
        console.warn("MongoDB query error in ProductRepository.findById:", err);
      }
    }
    return memoryProducts.find((p) => p.id === id) || null;
  },

  async findByIds(ids: string[]): Promise<Product[]> {
    if (!ids || ids.length === 0) return [];
    return this.findAll({ ids });
  },

  async findByCategory(category: string): Promise<Product[]> {
    return this.findAll({ category });
  },

  async findByStoreId(storeId: string): Promise<Product[]> {
    if (!storeId) return [];
    return this.findAll({ storeId });
  },

  async create(product: Product): Promise<Product> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create product: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<Product>("products").insertOne({ ...product });
        return product;
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB insert error in ProductRepository.create:", err);
      }
    }

    memoryProducts.unshift(product);
    return product;
  },

  async createMany(products: Product[]): Promise<Product[]> {
    if (!products || products.length === 0) return [];
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot create products: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<Product>("products").insertMany([...products]);
        return products;
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB insertMany error in ProductRepository.createMany:", err);
      }
    }

    memoryProducts.unshift(...products);
    return products;
  },

  async update(id: string, updates: Partial<Product>): Promise<Product | null> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot update product: database is unavailable in production.");
    }
    if (db) {
      try {
        await db.collection<Product>("products").updateOne({ id }, { $set: updates });
        return this.findById(id);
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB update error in ProductRepository.update:", err);
      }
    }

    const index = memoryProducts.findIndex((p) => p.id === id);
    if (index !== -1) {
      memoryProducts[index] = { ...memoryProducts[index], ...updates };
      return memoryProducts[index];
    }
    return null;
  },

  async delete(id: string): Promise<boolean> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot delete product: database is unavailable in production.");
    }
    if (db) {
      try {
        const res = await db.collection<Product>("products").deleteOne({ id });
        const memIdx = memoryProducts.findIndex((p) => p.id === id);
        if (memIdx !== -1) memoryProducts.splice(memIdx, 1);
        return res.deletedCount > 0;
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB delete error in ProductRepository.delete:", err);
      }
    }

    const index = memoryProducts.findIndex((p) => p.id === id);
    if (index !== -1) {
      memoryProducts.splice(index, 1);
      return true;
    }
    return false;
  },

  async deleteByStoreId(storeId: string): Promise<number> {
    const db = await getDb();
    if (!db && !isFallbackAllowed()) {
      throw new DatabaseUnavailableError("Cannot delete products: database is unavailable in production.");
    }
    if (db) {
      try {
        const res = await db.collection<Product>("products").deleteMany({ storeId });
        memoryProducts = memoryProducts.filter((p) => p.storeId !== storeId);
        return res.deletedCount;
      } catch (err) {
        if (!isFallbackAllowed()) {
          throw err;
        }
        console.warn("MongoDB deleteMany error in ProductRepository.deleteByStoreId:", err);
      }
    }

    const initialLen = memoryProducts.length;
    memoryProducts = memoryProducts.filter((p) => p.storeId !== storeId);
    return initialLen - memoryProducts.length;
  },

  _resetMemory(products?: Product[]) {
    memoryProducts = products ? [...products] : [...MOCK_PRODUCTS];
  },
};

