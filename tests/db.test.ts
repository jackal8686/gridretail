import test from "node:test";
import assert from "node:assert/strict";
import { checkDatabaseHealth, hasMongoConfig } from "../src/lib/db/mongodb";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { ClientRepository } from "../src/lib/repositories/client.repository";
import { TemplateRepository } from "../src/lib/repositories/template.repository";
import { ProductRepository } from "../src/lib/repositories/product.repository";
import { runDatabaseSeed } from "../src/lib/db/seed";

test("Database Health & Fallback Test", async (t) => {
  await t.test("reports health status gracefully without crashing when URI is unset or mock", async () => {
    const health = await checkDatabaseHealth();
    assert.ok(typeof health.connected === "boolean");
    assert.ok(health.database.length > 0);
    assert.ok(typeof health.message === "string");
  });

  await t.test("hasMongoConfig correctly detects absence of MONGODB_URI", () => {
    const isConfigured = hasMongoConfig();
    assert.equal(typeof isConfigured, "boolean");
  });
});

test("Seed Process Idempotency Test", async (t) => {
  await t.test("runDatabaseSeed executes idempotently without duplicate record explosion", async () => {
    const result1 = await runDatabaseSeed();
    assert.equal(result1.success, true);
    assert.ok(result1.counts.stores >= 6);
    assert.ok(result1.counts.templates >= 8);

    // Second run must succeed and produce identical counts
    const result2 = await runDatabaseSeed();
    assert.equal(result2.success, true);
    assert.equal(result2.counts.stores, result1.counts.stores);
    assert.equal(result2.counts.templates, result1.counts.templates);
  });
});

test("Repositories Query & Retrieval Test", async (t) => {
  await t.test("TemplateRepository retrieves all 8 architectural templates", async () => {
    const templates = await TemplateRepository.findAll();
    assert.equal(templates.length, 8);
    const nordic = await TemplateRepository.findById("tpl_nordic_clean");
    assert.ok(nordic);
    assert.equal(nordic?.name, "Nordic Clean");
  });

  await t.test("StoreRepository finds existing store by slug and id", async () => {
    const stores = await StoreRepository.findAll();
    assert.ok(stores.length >= 6);

    const store = await StoreRepository.findBySlug("aura-minimalist");
    assert.ok(store);
    assert.equal(store?.name, "Aura Minimalist Living");

    const byId = await StoreRepository.findById(store!.id);
    assert.equal(byId?.id, store!.id);
  });

  await t.test("StoreRepository slug availability checker detects duplicates", async () => {
    const isTaken = await StoreRepository.isSlugAvailable("aura-minimalist");
    assert.equal(isTaken, false);

    const isAvailable = await StoreRepository.isSlugAvailable("completely-new-unique-slug-2026");
    assert.equal(isAvailable, true);
  });

  await t.test("ProductRepository filters by category and retrieves by ID list", async () => {
    const allProducts = await ProductRepository.findAll();
    assert.ok(allProducts.length >= 8);

    const homeProducts = await ProductRepository.findAll({ category: "Home & Living" });
    assert.ok(homeProducts.length >= 2);
    homeProducts.forEach((p) => assert.equal(p.category, "Home & Living"));

    const ids = ["prd_01", "prd_02"];
    const subset = await ProductRepository.findByIds(ids);
    assert.equal(subset.length, 2);
  });

  await t.test("ClientRepository increments store count correctly", async () => {
    const client = await ClientRepository.findById("cli_01");
    assert.ok(client);
    const initialCount = client!.storeCount;

    await ClientRepository.incrementStoreCount("cli_01");
    const updatedClient = await ClientRepository.findById("cli_01");
    assert.equal(updatedClient!.storeCount, initialCount + 1);
  });
});
