import { getDb } from "@/lib/db/mongodb";
import { Product } from "@/types";
import { MOCK_PRODUCTS } from "@/mock/products";

let memoryProducts: Product[] = [...MOCK_PRODUCTS];

export const ProductRepository = {
  async findAll(filter?: { category?: string; search?: string; ids?: string[] }): Promise<Product[]> {
    const db = await getDb();
    if (db) {
      try {
        const query: Record<string, unknown> = {};
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
          return products.map((p) => ({
            ...p,
            id: p.id || (p as unknown as { _id: { toString: () => string } })._id?.toString(),
          }));
        }
      } catch (err) {
        console.warn("MongoDB query error in ProductRepository.findAll:", err);
      }
    }

    return memoryProducts.filter((prod) => {
      const matchCategory = !filter?.category || filter.category === "ALL" || prod.category === filter.category;
      const matchIds = !filter?.ids || filter.ids.length === 0 || filter.ids.includes(prod.id);
      const matchSearch =
        !filter?.search ||
        prod.name.toLowerCase().includes(filter.search.toLowerCase()) ||
        prod.sku.toLowerCase().includes(filter.search.toLowerCase()) ||
        prod.category.toLowerCase().includes(filter.search.toLowerCase());
      return matchCategory && matchIds && matchSearch;
    });
  },

  async findById(id: string): Promise<Product | null> {
    const db = await getDb();
    if (db) {
      try {
        const product = await db.collection<Product>("products").findOne({ id });
        if (product) {
          return {
            ...product,
            id: product.id || (product as unknown as { _id: { toString: () => string } })._id?.toString(),
          };
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

  _resetMemory(products?: Product[]) {
    memoryProducts = products ? [...products] : [...MOCK_PRODUCTS];
  },
};
