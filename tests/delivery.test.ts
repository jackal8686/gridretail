import { test } from "node:test";
import assert from "node:assert";
import crypto from "crypto";
import { ZipBuilder, calculateCrc32 } from "../src/lib/export/zip-builder";
import { ExportService } from "../src/lib/export/export-service";
import { DeliveryRepository } from "../src/lib/repositories/delivery.repository";
import { Store, Template, Product } from "../src/types";

test("ZIP Engine & CRC32 Validation", async (t) => {
  await t.test("calculates deterministic CRC32 for known strings", () => {
    const testBuffer = Buffer.from("GridRetail Delivery Engine", "utf-8");
    const crc = calculateCrc32(testBuffer);
    assert.strictEqual(typeof crc, "number");
    assert.ok(crc > 0);

    // Second calculation yields identical hash
    const crc2 = calculateCrc32(testBuffer);
    assert.strictEqual(crc, crc2);
  });

  await t.test("builds valid PKZIP 2.0 archive structure", () => {
    const builder = new ZipBuilder();
    builder.addFile("index.html", "<!DOCTYPE html><html><body>Test</body></html>");
    builder.addFile("styles.css", "body { margin: 0; }");
    builder.addFile("data/info.json", JSON.stringify({ app: "GridRetail" }));

    const zipBuffer = builder.build();
    assert.ok(zipBuffer.length > 0, "ZIP buffer must not be empty");

    // Standard PKZIP Local File Header Signature: 0x04034b50 ('PK\x03\x04')
    const magicHeader = zipBuffer.readUInt32LE(0);
    assert.strictEqual(magicHeader, 0x04034b50, "ZIP must start with PK\\x03\\x04 signature");

    // End of Central Directory signature: 0x06054b50 ('PK\x05\x06')
    // Should be in the last 22 bytes of the buffer
    const eocdSignature = zipBuffer.readUInt32LE(zipBuffer.length - 22);
    assert.strictEqual(eocdSignature, 0x06054b50, "ZIP must terminate with End of Central Directory signature");
  });
});

test("ExportService Production Bundle Generation", async (t) => {
  const mockStore: Store = {
    id: "store-test-export-101",
    name: "Lumina Studio",
    slug: "lumina-studio",
    clientName: "Lumina Creative",
    clientId: "client-1",
    industry: "Fashion & Apparel",
    templateId: "tpl-minimal-canvas",
    templateName: "Minimal Canvas",
    status: "Draft",
    productCount: 2,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: "Contemporary apparel showroom.",
    branding: {
      primaryColor: "#176B4D",
      secondaryColor: "#FAF9F6",
      fontFamily: "Inter, sans-serif",
      heroHeadline: "Modern Luxury for Lumina",
      heroSubheadline: "Exclusive capsule collection.",
      aboutText: "Designed with timeless elegance.",
      ctaText: "Discover Pieces",
    },
    enabledSections: ["hero", "featured_products", "about", "newsletter", "footer"],
    orderedSections: ["hero", "about", "featured_products", "newsletter", "footer"],
  };

  const mockTemplate: Template = {
    id: "tpl-minimal-canvas",
    name: "Minimal Canvas",
    description: "Clean minimalist layout",
    industry: "Fashion & Apparel",
    style: "Editorial & Minimal",
    featured: true,
    colorPalette: {
      primary: "#176B4D",
      secondary: "#FAF9F6",
      accent: "#E2E8F0",
    },
    layoutType: "Grid",
    compatibleIndustries: ["Fashion & Apparel"],
    thumbnailGradient: "from-stone-100 to-stone-200",
  };

  const mockProducts: Product[] = [
    {
      id: "prod-1",
      name: "Cashmere Overcoat",
      sku: "SKU-CASH-01",
      category: "Fashion & Apparel",
      price: 490,
      currency: "USD",
      stockStatus: "In Stock",
      description: "Handcrafted virgin cashmere.",
      thumbnailColor: "bg-stone-200",
      createdAt: new Date().toISOString(),
    },
    {
      id: "prod-2",
      name: "Silk Evening Scarf",
      sku: "SKU-SILK-02",
      category: "Fashion & Apparel",
      price: 120,
      currency: "USD",
      stockStatus: "In Stock",
      description: "100% mulberry silk.",
      thumbnailColor: "bg-emerald-100",
      createdAt: new Date().toISOString(),
    },
  ];

  await t.test("generates all required static artifacts in bundle", async () => {
    const bundle = await ExportService.generateStoreBundle(mockStore, mockTemplate, mockProducts);

    assert.ok(bundle.buffer.length > 0);
    assert.strictEqual(bundle.fileSizeBytes, bundle.buffer.length);
    assert.ok(bundle.artifactName.includes("lumina-studio-export-"));
    assert.ok(bundle.artifactName.endsWith(".zip"));

    // Verify SHA-256 Checksum computation
    const expectedChecksum = crypto.createHash("sha256").update(bundle.buffer).digest("hex");
    assert.strictEqual(bundle.checksumSha256, expectedChecksum);

    // Verify file manifest list
    assert.deepStrictEqual(bundle.files, [
      "index.html",
      "styles.css",
      "store-manifest.json",
      "products.json",
      "README.md",
    ]);
  });
});

test("DeliveryRepository Data Persistence", async (t) => {
  DeliveryRepository._resetMemory();

  await t.test("creates and retrieves delivery records by store", async () => {
    const record = await DeliveryRepository.create({
      id: "del-test-1",
      storeId: "store-del-1",
      storeName: "Test Store",
      mode: "bundle_export",
      status: "completed",
      format: "zip",
      artifactName: "test-export.zip",
      fileSizeBytes: 2048,
      checksumSha256: "abcdef1234567890",
      createdAt: new Date().toISOString(),
      createdBy: "admin@gridretail.internal",
    });

    assert.strictEqual(record.id, "del-test-1");

    const found = await DeliveryRepository.findById("del-test-1");
    assert.ok(found);
    assert.strictEqual(found.artifactName, "test-export.zip");

    const storeDeliveries = await DeliveryRepository.findByStoreId("store-del-1");
    assert.strictEqual(storeDeliveries.length, 1);
    assert.strictEqual(storeDeliveries[0].id, "del-test-1");
  });

  await t.test("updates delivery status accurately", async () => {
    const updated = await DeliveryRepository.update("del-test-1", {
      status: "failed",
      errorMessage: "Test network timeout",
    });

    assert.ok(updated);
    assert.strictEqual(updated.status, "failed");
    assert.strictEqual(updated.errorMessage, "Test network timeout");
  });
});
