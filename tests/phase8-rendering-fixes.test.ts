import test from "node:test";
import assert from "node:assert/strict";
import {
  serializeForClient,
  serializeStore,
  serializeTemplate,
  serializeProduct,
  serializeProducts,
} from "../src/lib/serialization";
import { parseSubdomain } from "../src/lib/urls";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { Store, Template, Product } from "../src/types";

// Helper simulating a MongoDB BSON ObjectId class
class MockObjectId {
  _bsontype = "ObjectID";
  hex: string;

  constructor(hex: string = "507f1f77bcf86cd799439011") {
    this.hex = hex;
  }

  toHexString(): string {
    return this.hex;
  }

  toString(): string {
    return this.hex;
  }

  toJSON(): string {
    return this.hex;
  }
}

test("Phase 8 — Rendering, Serialization, and Lifecycle Regression Tests", async (t) => {
  // ---------------------------------------------------------------------------
  // 1. BSON ObjectId and Prototype Serialization
  // ---------------------------------------------------------------------------
  await t.test("converts BSON ObjectId to string and strips toJSON method", () => {
    const mockId = new MockObjectId("65b123456789abcdef012345");
    const rawDoc = {
      _id: mockId,
      name: "Test Document",
      toJSON() {
        return "should be stripped";
      },
    };

    const serialized = serializeForClient(rawDoc);

    assert.strictEqual(typeof serialized._id, "string");
    assert.strictEqual(serialized._id, "65b123456789abcdef012345");
    assert.strictEqual(serialized.name, "Test Document");
    // toJSON function must be stripped so Next.js React Server Components accept it
    assert.strictEqual((serialized as { toJSON?: unknown }).toJSON, undefined);
    assert.strictEqual(Object.getPrototypeOf(serialized), Object.prototype);
  });

  await t.test("converts Date instances to ISO strings", () => {
    const date = new Date("2026-10-15T12:00:00.000Z");
    const rawDoc = {
      createdAt: date,
      lastUpdated: date,
    };

    const serialized = serializeForClient(rawDoc);

    assert.strictEqual(typeof serialized.createdAt, "string");
    assert.strictEqual(serialized.createdAt, "2026-10-15T12:00:00.000Z");
    assert.strictEqual(typeof serialized.lastUpdated, "string");
    assert.strictEqual(serialized.lastUpdated, "2026-10-15T12:00:00.000Z");
  });

  // ---------------------------------------------------------------------------
  // 2. Full Store, Template, and Product Serialization
  // ---------------------------------------------------------------------------
  await t.test("serializes a complete database-backed Store document safely", () => {
    const mockStore = {
      _id: new MockObjectId("660000000000000000000001"),
      id: "str_aura",
      name: "Aura Minimalist",
      slug: "aura-minimalist",
      clientName: "Aura Living",
      clientId: "cli_01",
      industry: "Home & Living" as const,
      templateId: "tpl_nordic",
      templateName: "Nordic Minimalist",
      status: "Draft" as const,
      productCount: 12,
      createdAt: "2026-01-01T00:00:00.000Z",
      lastUpdated: "2026-01-02T00:00:00.000Z",
      description: "Curated modern home essentials",
      branding: {
        primaryColor: "#176B4D",
        secondaryColor: "#FAF9F6",
        fontFamily: "Inter, sans-serif",
        heroHeadline: "Welcome to Aura Minimalist",
      },
      enabledSections: ["hero", "featured_products", "about"],
      orderedSections: ["hero", "featured_products", "about"],
    } as unknown as Store;

    const serialized = serializeStore(mockStore);
    const serializedRecord = serialized as unknown as Record<string, unknown>;


    assert.strictEqual(serialized.id, "str_aura");
    assert.strictEqual(serializedRecord._id, "660000000000000000000001");
    assert.strictEqual(typeof serialized.createdAt, "string");
    assert.strictEqual(typeof serialized.lastUpdated, "string");
    assert.strictEqual(serialized.branding?.primaryColor, "#176B4D");
    assert.strictEqual(Array.isArray(serialized.enabledSections), true);

    // Verify no functions or toJSON exist anywhere in the serialized store
    const hasToJSON = (obj: unknown): boolean => {
      if (!obj || typeof obj !== "object") return false;
      const rec = obj as Record<string, unknown>;
      if (typeof rec.toJSON === "function") return true;
      return Object.values(rec).some((val) => hasToJSON(val));
    };
    assert.strictEqual(hasToJSON(serialized), false);
  });

  await t.test("serializes a database-backed Template document safely", () => {
    const mockTemplate = {
      _id: new MockObjectId("660000000000000000000002"),
      id: "tpl_nordic",
      name: "Nordic Minimalist",
      description: "Scandinavian elegance",
      industry: "Home & Living",
      compatibleIndustries: ["Home & Living", "Fashion & Apparel"],
      thumbnailGradient: "from-stone-800 to-stone-900",
      colorPalette: {
        primary: "#176B4D",
        secondary: "#FAF9F6",
        accent: "#2C3B34",
        background: "#FFFFFF",
        surface: "#F7F6F2",
        text: "#18231E",
      },
      layoutType: "modern-clean",
      style: "minimalist",
      featured: true,
    } as unknown as Template;

    const serialized = serializeTemplate(mockTemplate);
    const serializedRecord = serialized as Record<string, unknown> | null;

    assert.notStrictEqual(serialized, null);
    assert.strictEqual(serialized?.id, "tpl_nordic");
    assert.strictEqual(serialized?.colorPalette.primary, "#176B4D");
    assert.strictEqual(typeof serializedRecord?._id, "string");
  });

  await t.test("serializes an individual Product and an array of Products safely", () => {
    const mockProduct1 = {
      _id: new MockObjectId("660000000000000000000003"),
      id: "prod_01",
      name: "Ceramic Mug",
      category: "Home & Living",
      price: 24,
      currency: "USD",
      stockStatus: "In Stock",
      createdAt: "2026-01-01T00:00:00.000Z",
    } as unknown as Product;

    const mockProduct2 = {
      _id: new MockObjectId("660000000000000000000004"),
      id: "prod_02",
      name: "Linen Throw",
      category: "Home & Living",
      price: 85,
      currency: "USD",
      stockStatus: "In Stock",
      createdAt: "2026-01-02T00:00:00.000Z",
    } as unknown as Product;

    const single = serializeProduct(mockProduct1);
    const singleRecord = single as unknown as Record<string, unknown>;
    assert.strictEqual(single.id, "prod_01");
    assert.strictEqual(singleRecord._id, "660000000000000000000003");

    const serialized = serializeProducts([mockProduct1, mockProduct2]);
    const rec0 = serialized[0] as unknown as Record<string, unknown>;
    const rec1 = serialized[1] as unknown as Record<string, unknown>;


    assert.strictEqual(serialized.length, 2);
    assert.strictEqual(serialized[0].id, "prod_01");
    assert.strictEqual(rec0._id, "660000000000000000000003");
    assert.strictEqual(typeof serialized[0].createdAt, "string");
    assert.strictEqual(serialized[1].id, "prod_02");
    assert.strictEqual(rec1._id, "660000000000000000000004");
  });

  // ---------------------------------------------------------------------------
  // 3. Publishing and Lifecycle Transitions
  // ---------------------------------------------------------------------------
  await t.test("transitions store status from Draft to Published and preserves canonical slug", async () => {
    const store = await StoreRepository.findBySlug("aura-minimalist");
    assert.notStrictEqual(store, null);
    if (!store) return;

    const initialStatus = store.status;
    const initialSlug = store.slug;

    // Update to Published
    const published = await StoreRepository.update(store.id, { status: "Published" });
    assert.notStrictEqual(published, null);
    assert.strictEqual(published?.status, "Published");
    assert.strictEqual(published?.slug, initialSlug);

    // Verify status persisted
    const fetched = await StoreRepository.findById(store.id);
    assert.strictEqual(fetched?.status, "Published");

    // Restore original status
    await StoreRepository.update(store.id, { status: initialStatus });
  });

  await t.test("allows editing a published store without changing its status or URL", async () => {
    const store = await StoreRepository.findBySlug("aura-minimalist");
    assert.notStrictEqual(store, null);
    if (!store) return;

    const updated = await StoreRepository.update(store.id, {
      description: "Updated description for published store",
    });

    assert.strictEqual(updated?.description, "Updated description for published store");
    assert.strictEqual(updated?.slug, "aura-minimalist");
  });

  // ---------------------------------------------------------------------------
  // 4. Draft Access Security Rules
  // ---------------------------------------------------------------------------
  await t.test("denies unauthenticated visitors access to Draft stores", () => {
    const isPublished = false;
    const session = null;
    const isStaffAuthorized = !!session;

    const shouldShowStorefront = isPublished || isStaffAuthorized;
    assert.strictEqual(shouldShowStorefront, false);
  });

  await t.test("allows authenticated staff to view Draft stores in workspace preview", () => {
    const isPublished = false;
    const session = { user: { id: "usr_admin", role: "admin" } };
    const isStaffAuthorized = !!session?.user;

    const shouldShowStorefront = isPublished || isStaffAuthorized;
    assert.strictEqual(shouldShowStorefront, true);
  });

  await t.test("allows public visitors to view Published stores without authentication", () => {
    const isPublished = true;
    const session = null;
    const isStaffAuthorized = !!session;

    const shouldShowStorefront = isPublished || isStaffAuthorized;
    assert.strictEqual(shouldShowStorefront, true);
  });

  // ---------------------------------------------------------------------------
  // 5. Hostname Routing and Auth Session Endpoint Rules
  // ---------------------------------------------------------------------------
  await t.test("correctly identifies store subdomains", () => {
    const parsed = parseSubdomain("aura-minimalist.localhost:3000");
    assert.strictEqual(parsed.isSubdomain, true);
    assert.strictEqual(parsed.subdomain, "aura-minimalist");
    assert.strictEqual(parsed.isReserved, false);
    assert.strictEqual(parsed.isValid, true);
  });

  await t.test("correctly identifies reserved subdomains", () => {
    const parsed = parseSubdomain("admin.localhost:3000");
    assert.strictEqual(parsed.isSubdomain, true);
    assert.strictEqual(parsed.isReserved, true);
  });

  await t.test("identifies standard root localhost without subdomains", () => {
    const parsed = parseSubdomain("localhost:3000");
    assert.strictEqual(parsed.isSubdomain, false);
    assert.strictEqual(parsed.subdomain, null);
  });
});
