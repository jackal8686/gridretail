import test from "node:test";
import assert from "node:assert/strict";
import { getStorageProvider } from "../src/lib/storage/provider";
import { MediaAssetRepository } from "../src/lib/repositories/media-asset.repository";
import { MediaAsset } from "../src/types/media";

test("Storage Provider Selection and Local File Staging", async () => {
  const provider = getStorageProvider();
  assert.ok(provider, "A valid storage provider must be resolved");

  // Create mock image buffer
  const sampleBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNk+M9QDwADhgGAWjR9awAAAABJRU5ErkJggg==", "base64");
  const uploadResult = await provider.upload(
    sampleBuffer,
    "brand-logo.png",
    "image/png",
    "str_01",
    "logo"
  );

  assert.ok(uploadResult.storageKey.startsWith("str_01/logo-"));
  assert.ok(uploadResult.url.startsWith("/uploads/str_01/"));

  // Delete test asset
  const deleted = await provider.delete(uploadResult.storageKey);
  assert.equal(deleted, true);
});

test("MediaAssetRepository CRUD and Store Association", async () => {
  MediaAssetRepository._resetMemory();

  const asset: MediaAsset = {
    id: "ast_test_01",
    storeId: "str_01",
    purpose: "banner",
    storageKey: "str_01/banner-123.jpg",
    url: "/uploads/str_01/banner-123.jpg",
    originalFilename: "hero-banner.jpg",
    mimeType: "image/jpeg",
    sizeBytes: 102400,
    uploadedBy: "Platform Administrator",
    uploadedAt: new Date().toISOString(),
  };

  await MediaAssetRepository.create(asset);

  const found = await MediaAssetRepository.findById("ast_test_01");
  assert.ok(found);
  assert.equal(found.purpose, "banner");
  assert.equal(found.storeId, "str_01");

  const storeAssets = await MediaAssetRepository.findByStoreId("str_01");
  assert.equal(storeAssets.length, 1);
  assert.equal(storeAssets[0].id, "ast_test_01");

  const otherAssets = await MediaAssetRepository.findByStoreId("str_02");
  assert.equal(otherAssets.length, 0);

  const deleted = await MediaAssetRepository.delete("ast_test_01");
  assert.equal(deleted, true);
  const afterDelete = await MediaAssetRepository.findById("ast_test_01");
  assert.equal(afterDelete, null);
});
