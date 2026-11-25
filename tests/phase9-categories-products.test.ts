import { test, describe, beforeEach } from "node:test";
import assert from "node:assert";
import { ProductRepository } from "../src/lib/repositories/product.repository";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { validateStoreInput } from "../src/lib/validation/store";
import { serializeProduct, serializeStore } from "../src/lib/serialization";
import { Product, Store, StoreCategory } from "../src/types";

describe("Phase 9 — Category-Wise Product Management & Store Isolation", () => {
  beforeEach(() => {
    ProductRepository._resetMemory();
    StoreRepository._resetMemory();
  });

  test("ProductRepository persists custom products with storeId and category", async () => {
    const storeId = "str_phase9_test";
    const customProd: Product = {
      id: "prod_p9_01",
      name: "Handmade Ceramic Mug",
      sku: "AURA-MUG-101",
      category: "Kitchen & Dining",
      price: 32.5,
      compareAtPrice: 40.0,
      currency: "USD",
      stockStatus: "In Stock",
      description: "Speckled stoneware mug with satin matte glaze.",
      storeId,
      storeName: "Aura Living",
      createdAt: new Date().toISOString(),
      imageUrl: "/uploads/str_phase9_test/product-mug.png",
      variants: ["Speckled White", "Earthy Terracotta"],
      status: "active",
    };

    const saved = await ProductRepository.create(customProd);
    assert.strictEqual(saved.id, "prod_p9_01");
    assert.strictEqual(saved.storeId, storeId);
    assert.strictEqual(saved.category, "Kitchen & Dining");
    assert.strictEqual(saved.compareAtPrice, 40.0);

    const retrieved = await ProductRepository.findById("prod_p9_01");
    assert.notStrictEqual(retrieved, null);
    assert.strictEqual(retrieved?.name, "Handmade Ceramic Mug");
    assert.strictEqual(retrieved?.imageUrl, "/uploads/str_phase9_test/product-mug.png");
  });

  test("Strict Store Isolation: Products from Store A do not leak into Store B", async () => {
    const storeAId = "str_store_alpha";
    const storeBId = "str_store_beta";

    const prodA: Product = {
      id: "prod_alpha_1",
      name: "Alpha Organic Tee",
      sku: "ALP-TEE-01",
      category: "Apparel",
      price: 45,
      currency: "USD",
      stockStatus: "In Stock",
      description: "Organic cotton t-shirt.",
      storeId: storeAId,
      createdAt: new Date().toISOString(),
    };

    const prodB: Product = {
      id: "prod_beta_1",
      name: "Beta Smart Lamp",
      sku: "BET-LMP-01",
      category: "Lighting",
      price: 120,
      currency: "USD",
      stockStatus: "In Stock",
      description: "Smart ambient table lamp.",
      storeId: storeBId,
      createdAt: new Date().toISOString(),
    };

    await ProductRepository.createMany([prodA, prodB]);

    const storeAProducts = await ProductRepository.findByStoreId(storeAId);
    const storeBProducts = await ProductRepository.findByStoreId(storeBId);

    assert.strictEqual(storeAProducts.length, 1);
    assert.strictEqual(storeAProducts[0].id, "prod_alpha_1");
    assert.strictEqual(storeAProducts[0].name, "Alpha Organic Tee");

    assert.strictEqual(storeBProducts.length, 1);
    assert.strictEqual(storeBProducts[0].id, "prod_beta_1");
    assert.strictEqual(storeBProducts[0].name, "Beta Smart Lamp");

    // Negative verification: Store A products not present in Store B results
    assert.strictEqual(
      storeAProducts.some((p) => p.storeId === storeBId),
      false
    );
    assert.strictEqual(
      storeBProducts.some((p) => p.storeId === storeAId),
      false
    );
  });

  test("ProductRepository filters by category within store", async () => {
    const storeId = "str_store_categories";

    const p1: Product = {
      id: "p_dining_1",
      name: "Dinner Plate",
      sku: "DIN-01",
      category: "Dinnerware",
      price: 24,
      currency: "USD",
      stockStatus: "In Stock",
      description: "Ceramic plate",
      storeId,
      createdAt: new Date().toISOString(),
    };

    const p2: Product = {
      id: "p_lighting_1",
      name: "Sconce Light",
      sku: "LGT-01",
      category: "Lighting",
      price: 85,
      currency: "USD",
      stockStatus: "In Stock",
      description: "Brass wall sconce",
      storeId,
      createdAt: new Date().toISOString(),
    };

    await ProductRepository.createMany([p1, p2]);

    const dinnerware = await ProductRepository.findAll({ storeId, category: "Dinnerware" });
    assert.strictEqual(dinnerware.length, 1);
    assert.strictEqual(dinnerware[0].id, "p_dining_1");

    const lighting = await ProductRepository.findAll({ storeId, category: "Lighting" });
    assert.strictEqual(lighting.length, 1);
    assert.strictEqual(lighting[0].id, "p_lighting_1");
  });

  test("ProductRepository updates and deletes products cleanly", async () => {
    const storeId = "str_store_crud";
    const prod: Product = {
      id: "p_crud_1",
      name: "Initial Name",
      sku: "CRUD-01",
      category: "Decor",
      price: 50,
      currency: "USD",
      stockStatus: "In Stock",
      description: "Initial description",
      storeId,
      createdAt: new Date().toISOString(),
    };

    await ProductRepository.create(prod);

    // Update
    const updated = await ProductRepository.update("p_crud_1", {
      name: "Updated Name",
      price: 65,
      stockStatus: "Low Stock",
    });
    assert.strictEqual(updated?.name, "Updated Name");
    assert.strictEqual(updated?.price, 65);
    assert.strictEqual(updated?.stockStatus, "Low Stock");

    // Delete
    const deleted = await ProductRepository.delete("p_crud_1");
    assert.strictEqual(deleted, true);

    const notFound = await ProductRepository.findById("p_crud_1");
    assert.strictEqual(notFound, null);
  });

  test("validateStoreInput sanitizes custom categories and products", () => {
    const input = {
      name: "Artisan Woodcraft Studio",
      slug: "artisan-woodcraft",
      clientId: "cli_client_01",
      industry: "Home & Living" as const,
      templateId: "tpl_minimalist",
      categories: [
        { id: "cat_1", name: "  Dining Tables  ", description: "Solid wood dining surfaces." },
        { id: "cat_2", name: "Accent Chairs", description: "Sculptural seating." },
      ],
      products: [
        {
          name: "  Walnut Credenza  ",
          price: "850.50",
          category: "Living Room",
          description: "Solid American walnut sideboard.",
          compareAtPrice: 990,
          variants: ["Walnut", "White Oak"],
          stockStatus: "In Stock" as const,
        },
      ],
    };

    const res = validateStoreInput(input);
    assert.strictEqual(res.valid, true);
    assert.strictEqual(res.sanitized?.categories?.length, 2);
    assert.strictEqual(res.sanitized?.categories?.[0].name, "Dining Tables");
    assert.strictEqual(res.sanitized?.categories?.[0].slug, "dining-tables");

    const sanitizedProd = res.sanitized?.products?.[0];
    assert.strictEqual(sanitizedProd?.name, "Walnut Credenza");
    assert.strictEqual(sanitizedProd?.price, 850.5);
    assert.strictEqual(sanitizedProd?.category, "Living Room");
    assert.strictEqual(typeof sanitizedProd?.sku, "string");
  });

  test("validateStoreInput enforces positive price and required product fields", () => {
    const invalidInput = {
      name: "Invalid Pricing Store",
      slug: "invalid-pricing",
      clientId: "cli_client_01",
      industry: "Home & Living" as const,
      templateId: "tpl_minimalist",
      products: [
        {
          name: "",
          price: -50,
          category: "",
        },
      ],
    };

    const res = validateStoreInput(invalidInput);
    assert.strictEqual(res.valid, false);
    assert.notStrictEqual(res.errors["products.0.name"], undefined);
    assert.notStrictEqual(res.errors["products.0.price"], undefined);
    assert.notStrictEqual(res.errors["products.0.category"], undefined);
  });

  test("Serialization safely preserves categories and Phase 9 product fields", () => {
    const category: StoreCategory = {
      id: "cat_homewares",
      name: "Homewares",
      slug: "homewares",
      description: "Living essentials",
      order: 0,
    };

    const store: Store = {
      id: "str_serialize_test",
      name: "Terra & Stone",
      slug: "terra-stone",
      clientId: "cli_01",
      clientName: "Terra Goods",
      industry: "Home & Living",
      templateId: "tpl_nordic",
      templateName: "Nordic Warmth",
      status: "Draft",
      productCount: 1,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "Artisan homewares",
      categories: [category],
    };

    const serializedStore = serializeStore(store);
    assert.strictEqual(serializedStore.categories?.length, 1);
    assert.strictEqual(serializedStore.categories?.[0].name, "Homewares");

    const product: Product = {
      id: "prod_serialize_1",
      name: "Terracotta Vase",
      sku: "TER-VAS-01",
      category: "Homewares",
      price: 68,
      compareAtPrice: 85,
      currency: "USD",
      stockStatus: "In Stock",
      description: "Unglazed ceramic vase",
      imageUrl: "/uploads/str_serialize_test/product-vase.webp",
      variants: ["Terra", "Sandstone"],
      specifications: { Height: "24cm", Material: "Terracotta" },
      status: "active",
      createdAt: new Date().toISOString(),
    };

    const serializedProduct = serializeProduct(product);
    assert.strictEqual(serializedProduct.imageUrl, "/uploads/str_serialize_test/product-vase.webp");
    assert.strictEqual(serializedProduct.compareAtPrice, 85);
    assert.strictEqual(serializedProduct.variants?.length, 2);
    assert.strictEqual((serializedProduct.specifications as Record<string, string>)?.Height, "24cm");
    assert.strictEqual(serializedProduct.status, "active");
  });
});
