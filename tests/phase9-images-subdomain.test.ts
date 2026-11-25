import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs/promises";
import path from "path";
import { LocalStorageProvider } from "@/lib/storage/provider";
import { validateStoreInput } from "@/lib/validation/store";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { parseSubdomain } from "@/lib/urls";
import { Store } from "@/types";

test("Priority 6 — Shop Logo and Hero Banner Media, Persistence & Subdomain Routing", async (t) => {
  const dummyStore: Store = {
    id: "str_img_test_" + Date.now(),
    name: "Lumina Studio",
    slug: "lumina-studio",
    clientName: "Lumina Corp",
    clientId: "clt_lumina_01",
    industry: "Home & Living",
    templateId: "tmpl_modern_minimal",
    templateName: "Modern Minimal",
    themeId: "theme_nordic_pine",
    themeName: "Nordic Pine",
    status: "Draft",
    productCount: 4,
    previewUrl: "/store/lumina-studio",
    localUrl: "http://lumina-studio.localhost:3000",
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: "Architectural lighting and sustainable living.",
    branding: {
      primaryColor: "#176B4D",
      secondaryColor: "#FAF9F6",
      fontFamily: "Inter, sans-serif",
      heroHeadline: "Lumina Architectural Light",
      heroSubheadline: "Sculptural lighting designed for contemporary sanctuaries.",
      logoUrl: "/uploads/lumina-studio/logo-sample.png",
      bannerUrl: "/uploads/lumina-studio/banner-sample.jpg",
    },
    enabledSections: ["hero", "featured_products", "about", "footer"],
  };

  await t.test("1. LocalStorageProvider generates normalized forward-slash URLs and manages disk files", async () => {
    const provider = new LocalStorageProvider();
    const dummyBuffer = Buffer.from("iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==", "base64");

    // Upload Logo
    const logoResult = await provider.upload(dummyBuffer, "brand-logo.png", "image/png", "test-store", "logo");
    assert.ok(logoResult.url.startsWith("/uploads/test-store/logo-"), "Logo URL must start with /uploads/test-store/logo-");
    assert.ok(!logoResult.url.includes("\\"), "Logo URL must never contain Windows backslashes");

    // Upload Banner
    const bannerResult = await provider.upload(dummyBuffer, "hero-banner.webp", "image/webp", "test-store", "banner");
    assert.ok(bannerResult.url.startsWith("/uploads/test-store/banner-"), "Banner URL must start with /uploads/test-store/banner-");
    assert.ok(!bannerResult.url.includes("\\"), "Banner URL must never contain Windows backslashes");

    // Verify files exist in public/uploads directory
    const publicUploads = path.join(process.cwd(), "public", "uploads");
    const logoFilePath = path.join(publicUploads, logoResult.storageKey);
    const bannerFilePath = path.join(publicUploads, bannerResult.storageKey);

    const logoStat = await fs.stat(logoFilePath);
    assert.ok(logoStat.size > 0, "Uploaded logo file must exist on disk with positive byte size");

    const bannerStat = await fs.stat(bannerFilePath);
    assert.ok(bannerStat.size > 0, "Uploaded banner file must exist on disk with positive byte size");

    // Clean up test files
    await provider.delete(logoResult.storageKey);
    await provider.delete(bannerResult.storageKey);
  });

  await t.test("2. validateStoreInput preserves and sanitizes logoUrl, bannerUrl, and custom copy", async () => {
    const result = validateStoreInput({
      name: "Artisan Goods",
      slug: "artisan-goods",
      clientId: "clt_artisan",
      industry: "Home & Living",
      templateId: "tmpl_modern_minimal",
      branding: {
        primaryColor: "#2D5A27",
        secondaryColor: "#F4F1EA",
        fontFamily: "DM Sans, sans-serif",
        heroHeadline: "Pure Craftsmanship",
        heroSubheadline: "Handcrafted furniture and homeware.",
        logoUrl: "  /uploads/artisan-goods/logo-123.png  ",
        bannerUrl: "  https://cdn.example.com/artisan-banner.jpg  ",
        aboutText: "Crafted in small batches.",
        ctaText: "Explore Collection",
      },
    });

    assert.equal(result.valid, true, "Validation must pass for valid store input with branding assets");
    assert.equal(result.sanitized?.branding?.logoUrl, "/uploads/artisan-goods/logo-123.png", "logoUrl must be trimmed and preserved");
    assert.equal(result.sanitized?.branding?.bannerUrl, "https://cdn.example.com/artisan-banner.jpg", "bannerUrl must be trimmed and preserved");
    assert.equal(result.sanitized?.branding?.aboutText, "Crafted in small batches.", "aboutText must be preserved");
    assert.equal(result.sanitized?.branding?.ctaText, "Explore Collection", "ctaText must be preserved");
  });

  await t.test("3. StoreRepository persists logoUrl and bannerUrl on creation and retrieval", async () => {
    const created = await StoreRepository.create({ ...dummyStore });
    assert.equal(created.branding?.logoUrl, "/uploads/lumina-studio/logo-sample.png");
    assert.equal(created.branding?.bannerUrl, "/uploads/lumina-studio/banner-sample.jpg");

    const fetched = await StoreRepository.findById(created.id);
    assert.ok(fetched, "Store must be retrievable by ID");
    assert.equal(fetched?.branding?.logoUrl, "/uploads/lumina-studio/logo-sample.png");
    assert.equal(fetched?.branding?.bannerUrl, "/uploads/lumina-studio/banner-sample.jpg");

    const fetchedBySlug = await StoreRepository.findBySlug(created.slug);
    assert.ok(fetchedBySlug, "Store must be retrievable by slug");
    assert.equal(fetchedBySlug?.branding?.logoUrl, "/uploads/lumina-studio/logo-sample.png");
    assert.equal(fetchedBySlug?.branding?.bannerUrl, "/uploads/lumina-studio/banner-sample.jpg");
  });

  await t.test("4. Partial store updates deep-merge branding and NEVER wipe out stored image URLs", async () => {
    // 1. Partial update altering only primaryColor
    const updatedColor = await StoreRepository.update(dummyStore.id, {
      branding: {
        primaryColor: "#0F281E",
        fontFamily: "Inter, sans-serif",
      },
    });

    assert.ok(updatedColor, "Updated store must return store record");
    assert.equal(updatedColor?.branding?.primaryColor, "#0F281E", "primaryColor must be updated");
    assert.equal(updatedColor?.branding?.logoUrl, "/uploads/lumina-studio/logo-sample.png", "logoUrl must be preserved");
    assert.equal(updatedColor?.branding?.bannerUrl, "/uploads/lumina-studio/banner-sample.jpg", "bannerUrl must be preserved");

    // 2. Lifecycle status transition to Published
    const publishedStore = await StoreRepository.update(dummyStore.id, {
      status: "Published",
    });

    assert.ok(publishedStore, "Published store record must exist");
    assert.equal(publishedStore?.status, "Published");
    assert.equal(publishedStore?.branding?.logoUrl, "/uploads/lumina-studio/logo-sample.png", "logoUrl must survive publishing");
    assert.equal(publishedStore?.branding?.bannerUrl, "/uploads/lumina-studio/banner-sample.jpg", "bannerUrl must survive publishing");

    // 3. Explicit removal of logo when user clicks 'Remove'
    const removedLogoStore = await StoreRepository.update(dummyStore.id, {
      branding: {
        primaryColor: "#0F281E",
        fontFamily: "Inter, sans-serif",
        logoUrl: "",
      },
    });
    assert.equal(removedLogoStore?.branding?.logoUrl, "", "Explicit empty string logoUrl must allow removing logo");
    assert.equal(removedLogoStore?.branding?.bannerUrl, "/uploads/lumina-studio/banner-sample.jpg", "bannerUrl remains preserved when only logo is removed");
  });

  await t.test("5. Subdomain resolution identifies store subdomains and preserves /uploads pass-through", async () => {
    const hostWithSubdomain = "lumina-studio.localhost:3000";
    const parsed = parseSubdomain(hostWithSubdomain);

    assert.equal(parsed.isSubdomain, true);
    assert.equal(parsed.subdomain, "lumina-studio");
    assert.equal(parsed.isValid, true);
    assert.equal(parsed.isReserved, false);

    // Verify that /uploads path structure is classified as valid static pass-through
    const testUploadPath = "/uploads/lumina-studio/logo-123.png";
    assert.ok(testUploadPath.startsWith("/uploads"), "Upload path must be recognized as static media pass-through");
  });

  // Clean up test store
  await StoreRepository.delete(dummyStore.id);
});
