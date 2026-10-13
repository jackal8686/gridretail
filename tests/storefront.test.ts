import test from "node:test";
import assert from "node:assert/strict";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { ProductRepository } from "../src/lib/repositories/product.repository";
import { TemplateRepository } from "../src/lib/repositories/template.repository";

test("Storefront Resolution & Data Isolation Test", async (t) => {
  await t.test("resolves store configuration for valid slug", async () => {
    const store = await StoreRepository.findBySlug("aura-minimalist");
    assert.ok(store);
    assert.equal(store?.name, "Aura Minimalist Living");
    assert.equal(store?.industry, "Home & Living");

    // Template metadata association
    const template = await TemplateRepository.findById(store!.templateId);
    assert.ok(template);
    assert.equal(template?.id, "tpl_nordic_clean");
  });

  await t.test("returns null for unknown or malicious slugs (404 isolation)", async () => {
    const unknown = await StoreRepository.findBySlug("non-existent-store-slug-xyz");
    assert.equal(unknown, null);

    const injection = await StoreRepository.findBySlug("../../../etc/passwd");
    assert.equal(injection, null);
  });

  await t.test("resolves associated catalog items for storefront display", async () => {
    const store = await StoreRepository.findBySlug("volt-audio");
    assert.ok(store);

    const products = await ProductRepository.findAll({ category: store!.industry });
    assert.ok(products.length >= 1);
    products.forEach((p) => assert.equal(p.category, "Electronics & Gadgets"));
  });

  await t.test("ensures store creation persists correctly and can be retrieved immediately", async () => {
    const testSlug = `isolated-test-store-${Date.now()}`;
    const newStore = {
      id: `str_test_${Date.now()}`,
      name: "Isolated Test Store",
      slug: testSlug,
      clientName: "Test Client",
      clientId: "cli_01",
      industry: "Fashion & Apparel" as const,
      templateId: "tpl_editorial_minimal",
      templateName: "Editorial Minimal",
      status: "Draft" as const,
      productCount: 2,
      previewUrl: `/store/${testSlug}`,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "Automated test store record",
      branding: {
        primaryColor: "#111827",
        secondaryColor: "#F3F4F6",
        fontFamily: "Inter, sans-serif",
      },
      selectedProductIds: ["prd_01", "prd_02"],
    };

    await StoreRepository.create(newStore);

    const retrieved = await StoreRepository.findBySlug(testSlug);
    assert.ok(retrieved);
    assert.equal(retrieved?.name, "Isolated Test Store");
    assert.equal(retrieved?.branding?.primaryColor, "#111827");
  });
});
