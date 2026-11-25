import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ProductRepository } from "../src/lib/repositories/product.repository";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { serializeProduct } from "../src/lib/serialization";

describe("Phase 10 — PDP, Collections & Shopping Cart State", () => {
  it("resolves product detail data and verifies store association", async () => {
    // Retrieve stores and products
    const stores = await StoreRepository.findAll();
    assert.ok(stores.length > 0);
    const store = stores[0];

    const products = await ProductRepository.findByStoreId(store.id);
    if (products.length > 0) {
      const product = products[0];
      const fetched = await ProductRepository.findById(product.id);
      assert.ok(fetched);
      assert.equal(fetched.id, product.id);

      // Verify serialization removes MongoDB methods
      const serialized = serializeProduct(fetched);
      assert.equal(typeof serialized.id, "string");
      assert.equal((serialized as unknown as Record<string, unknown>).toJSON, undefined);
    }
  });

  it("filters store products by category for collection pages", async () => {
    const allProducts = await ProductRepository.findAll();
    assert.ok(allProducts.length > 0);

    const categories = Array.from(new Set(allProducts.map((p) => p.category)));
    assert.ok(categories.length > 0);

    const testCat = categories[0];
    const filtered = allProducts.filter((p) => p.category.toLowerCase() === testCat.toLowerCase());
    assert.ok(filtered.length > 0);
    filtered.forEach((p) => {
      assert.equal(p.category.toLowerCase(), testCat.toLowerCase());
    });
  });

  it("handles product stock statuses and price discounts safely", async () => {
    const dummyProduct = {
      id: "prod_pdp_test_1",
      name: "Cashmere Overcoat",
      sku: "OVR-CSH-001",
      category: "Outerwear",
      price: 450,
      compareAtPrice: 600,
      currency: "USD",
      stockStatus: "In Stock" as const,
      description: "Luxurious double-faced cashmere overcoat.",
      createdAt: new Date().toISOString(),
      variants: ["S", "M", "L", "XL"],
      specifications: [
        { name: "Material", value: "100% Mongolian Cashmere" },
        { name: "Care", value: "Dry clean only" },
      ],
    };

    const serialized = serializeProduct(dummyProduct);
    assert.equal(serialized.compareAtPrice, 600);
    assert.equal(serialized.price, 450);
    assert.equal(serialized.variants?.length, 4);

    // Discount percentage formula
    const discount = Math.round(((serialized.compareAtPrice! - serialized.price) / serialized.compareAtPrice!) * 100);
    assert.equal(discount, 25);
  });
});
