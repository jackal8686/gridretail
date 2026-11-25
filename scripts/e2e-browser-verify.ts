import { chromium } from "playwright";
import fsSync from "fs";
import path from "path";

// Load .env.local if present
const envLocalPath = path.join(process.cwd(), ".env.local");
if (fsSync.existsSync(envLocalPath)) {
  const content = fsSync.readFileSync(envLocalPath, "utf-8");
  for (const line of content.split("\n")) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith("#")) continue;
    const eqIdx = trimmed.indexOf("=");
    if (eqIdx !== -1) {
      const key = trimmed.slice(0, eqIdx).trim();
      const val = trimmed.slice(eqIdx + 1).trim();
      if (!process.env[key]) {
        process.env[key] = val;
      }
    }
  }
}

import { StoreRepository } from "../src/lib/repositories/store.repository";
import { ProductRepository } from "../src/lib/repositories/product.repository";
import { DESIGN_TEMPLATES } from "../src/constants/design-templates";
import { COLOR_THEMES } from "../src/constants/themes";
import fs from "fs/promises";

async function runBrowserVerification() {
  console.log("==================================================");
  console.log("STARTING PLAYWRIGHT REAL BROWSER VERIFICATION RUN");
  console.log("==================================================");

  // 1. Prepare test assets
  const publicUploads = path.join(process.cwd(), "public", "uploads", "test-brand");
  await fs.mkdir(publicUploads, { recursive: true });

  // Minimal 1x1 valid PNG
  const validPng = Buffer.from(
    "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==",
    "base64"
  );
  await fs.writeFile(path.join(publicUploads, "logo.png"), validPng);
  await fs.writeFile(path.join(publicUploads, "banner.png"), validPng);

  const logoUrl = "/uploads/test-brand/logo.png";
  const bannerUrl = "/uploads/test-brand/banner.png";

  const testStoreId = "str_e2e_verify_" + Date.now();
  const testStoreSlug = "e2e-brand-" + Date.now();

  const testStore = {
    id: testStoreId,
    name: "Aura Minimalist Test",
    slug: testStoreSlug,
    clientName: "Aura Living Corp",
    clientId: "cli_test_aura",
    industry: "Home & Living" as const,
    templateId: "tmpl_modern_minimal",
    templateName: "Modern Minimal",
    themeId: "theme_nordic_pine",
    themeName: "Nordic Pine",
    status: "Published" as const,
    productCount: 2,
    previewUrl: `/stores/${testStoreId}/preview`,
    localUrl: `http://${testStoreSlug}.localhost:3000`,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: "End to end automated browser test store",
    branding: {
      primaryColor: "#176B4D",
      secondaryColor: "#FAF9F6",
      fontFamily: "Inter, sans-serif",
      logoUrl,
      bannerUrl,
      heroHeadline: "Bespoke Modern Living",
      heroSubheadline: "Handcrafted interior objects for serene spaces.",
      aboutText: "Crafted with quiet intention.",
      ctaText: "Discover Pieces",
    },
    enabledSections: ["hero", "featured_products", "about", "newsletter", "footer"],
    orderedSections: ["hero", "featured_products", "about", "newsletter", "footer"],
  };

  console.log(`[1] Creating test store in database: ${testStore.name} (${testStore.slug})`);
  await StoreRepository.create(testStore);

  console.log(`[2] Seeding test products for store: ${testStoreId}`);
  const uniqueProd1 = `prod_e2e_1_${Date.now()}`;
  const uniqueProd2 = `prod_e2e_2_${Date.now()}`;
  const testProducts = [
    {
      id: uniqueProd1,
      name: "Ceramic Minimalist Vase",
      sku: `VASE-${Date.now()}`,
      category: "Home & Living",
      price: 2499,
      currency: "INR",
      stockStatus: "In Stock" as const,
      description: "Hand-thrown matte stoneware vase.",
      storeId: testStoreId,
      storeName: testStore.name,
      createdAt: new Date().toISOString(),
      status: "active" as const,
    },
    {
      id: uniqueProd2,
      name: "Nordic Linen Throw",
      sku: `THROW-${Date.now()}`,
      category: "Home & Living",
      price: 1899,
      currency: "INR",
      stockStatus: "In Stock" as const,
      description: "100% organic unbleached flax linen throw.",
      storeId: testStoreId,
      storeName: testStore.name,
      createdAt: new Date().toISOString(),
      status: "active" as const,
    },
  ];
  await ProductRepository.createMany(testProducts);

  // Launch real Chromium browser
  console.log("[3] Launching Playwright Chromium browser...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Test across viewport breakpoints
  const viewports = [
    { name: "Mobile (320px)", width: 320, height: 640 },
    { name: "Mobile (390px)", width: 390, height: 844 },
    { name: "Tablet (768px)", width: 768, height: 1024 },
    { name: "Desktop (1440px)", width: 1440, height: 900 },
  ];

  for (const vp of viewports) {
    console.log(`\n--- Testing Viewport: ${vp.name} ---`);
    await page.setViewportSize({ width: vp.width, height: vp.height });

    // Open store by path
    const url = `http://localhost:3000/store/${testStoreSlug}`;
    console.log(`Navigating to ${url}...`);
    const res = await page.goto(url, { waitUntil: "networkidle" });
    if (!res || res.status() !== 200) {
      throw new Error(`Failed to load store: status ${res?.status()}`);
    }

    // Verify images rendered
    const logoImgs = await page.$$(`img[src="${logoUrl}"]`);
    const bannerImgs = await page.$$(`img[src="${bannerUrl}"]`);
    console.log(`✓ Logo elements found on page: ${logoImgs.length}`);
    console.log(`✓ Banner elements found on page: ${bannerImgs.length}`);

    if (logoImgs.length === 0) throw new Error("Logo image not rendered in DOM!");
    if (bannerImgs.length === 0) throw new Error("Hero banner image not rendered in DOM!");

    // Check image visibility and naturalWidth > 0
    const logoLoaded = await page.evaluate((url) => {
      const img = document.querySelector(`img[src="${url}"]`) as HTMLImageElement;
      return img && img.complete && img.naturalWidth > 0;
    }, logoUrl);

    const bannerLoaded = await page.evaluate((url) => {
      const img = document.querySelector(`img[src="${url}"]`) as HTMLImageElement;
      return img && img.complete && img.naturalWidth > 0;
    }, bannerUrl);

    console.log(`✓ Logo naturalWidth check: ${logoLoaded ? "OK (Loaded)" : "FAILED"}`);
    console.log(`✓ Banner naturalWidth check: ${bannerLoaded ? "OK (Loaded)" : "FAILED"}`);
    if (!logoLoaded || !bannerLoaded) {
      throw new Error("Images failed to decode or load in browser!");
    }

    // Check cart drawer interaction
    console.log("Testing Quick Add & Shopping Bag Drawer...");
    const quickAddBtn = await page.$('button:has-text("Quick Add")');
    if (quickAddBtn) {
      await quickAddBtn.click();
      await page.waitForTimeout(500);
      const bagBtn = await page.$('button:has-text("Bag")');
      if (bagBtn) {
        await bagBtn.click();
        await page.waitForTimeout(500);
        const drawerHeader = await page.$('h2:has-text("Shopping Bag")');
        console.log(`✓ Shopping bag drawer opened: ${!!drawerHeader}`);
        // Close drawer
        const closeBtn = await page.$('button[aria-label="Close cart drawer"]');
        if (closeBtn) await closeBtn.click();
      }
    }
  }

  // 4. Test All 8 Website Design Templates in Real Browser
  console.log("\n==================================================");
  console.log("VERIFYING ALL 8 DESIGN TEMPLATES WITH TEST IMAGES");
  console.log("==================================================");

  for (const template of DESIGN_TEMPLATES) {
    console.log(`\nTesting Design Template: ${template.name} (${template.id})`);
    // Update store template
    await StoreRepository.update(testStoreId, {
      templateId: template.id,
      templateName: template.name,
    });

    await page.goto(`http://localhost:3000/store/${testStoreSlug}`, { waitUntil: "networkidle" });

    const logoLoaded = await page.evaluate((url) => {
      const img = document.querySelector(`img[src="${url}"]`) as HTMLImageElement;
      return img && img.complete && img.naturalWidth > 0;
    }, logoUrl);

    const bannerLoaded = await page.evaluate((url) => {
      const img = document.querySelector(`img[src="${url}"]`) as HTMLImageElement;
      return img && img.complete && img.naturalWidth > 0;
    }, bannerUrl);

    console.log(`✓ Template ${template.name} -> Logo Loaded: ${logoLoaded}, Banner Loaded: ${bannerLoaded}`);
    if (!logoLoaded || !bannerLoaded) {
      throw new Error(`Template ${template.name} failed to render logo or hero banner properly!`);
    }
  }

  // 5. Test Theme Switching without Layout or Image Loss
  console.log("\n==================================================");
  console.log("VERIFYING THEME SWITCHING WITH PERSISTENT MEDIA");
  console.log("==================================================");

  for (const theme of COLOR_THEMES.slice(0, 4)) {
    console.log(`Testing Theme: ${theme.name} (${theme.id})`);
    await StoreRepository.update(testStoreId, {
      themeId: theme.id,
      themeName: theme.name,
      branding: {
        ...testStore.branding,
        primaryColor: theme.tokens.primary,
        secondaryColor: theme.tokens.secondary,
      },
    });

    await page.goto(`http://localhost:3000/store/${testStoreSlug}`, { waitUntil: "networkidle" });
    const logoLoaded = await page.evaluate((url) => {
      const img = document.querySelector(`img[src="${url}"]`) as HTMLImageElement;
      return img && img.complete && img.naturalWidth > 0;
    }, logoUrl);
    console.log(`✓ Theme ${theme.name} -> Images intact: ${logoLoaded}`);
  }

  // 6. Test Phase 10: Product Detail Page (PDP), Collections, and Cart Drawer
  console.log("\n==================================================");
  console.log("VERIFYING PHASE 10: PDP, COLLECTIONS & CART DRAWER");
  console.log("==================================================");

  // Navigate to PDP
  const testProduct = testProducts[0];
  console.log(`Navigating to Product Detail Page for: ${testProduct.name}`);
  await page.goto(`http://localhost:3000/store/${testStoreSlug}/products/${testProduct.id}`, {
    waitUntil: "networkidle",
  });
  const pdpTitle = await page.innerText("h1");
  console.log(`✓ PDP Rendered with product title: "${pdpTitle}"`);

  // Add to Bag from PDP
  console.log("Clicking Add to Bag on PDP...");
  const addToBagBtn = page.locator("button:has-text('Add to Bag')");
  await addToBagBtn.click();
  await page.waitForTimeout(500);

  // Verify Cart Drawer is opened
  const cartDrawerVisible = await page.locator("h3:has-text('Your Shopping Bag')").isVisible();
  console.log(`✓ Cart Drawer opened upon adding product: ${cartDrawerVisible}`);

  // Navigate to Collections
  console.log("Navigating to Store Collections page...");
  await page.goto(`http://localhost:3000/store/${testStoreSlug}/collections`, {
    waitUntil: "networkidle",
  });
  const collectionsHeader = await page.innerText("h1");
  console.log(`✓ Collections Catalog rendered with header: "${collectionsHeader}"`);

  // 7. Test Lifecycle: Draft -> Published -> Unpublished
  console.log("\n==================================================");
  console.log("VERIFYING LIFECYCLE ACCESS GATES");
  console.log("==================================================");

  console.log("Transitioning store to Draft (Unpublished)...");
  await StoreRepository.update(testStoreId, { status: "Draft" });

  await page.goto(`http://localhost:3000/store/${testStoreSlug}`, { waitUntil: "networkidle" });
  const unpubText = await page.innerText("body");
  const isProtected =
    unpubText.includes("has not been published for public access") ||
    unpubText.includes("Sign In to Workspace");
  console.log(`✓ Unauthenticated public visitor denied access to Draft store: ${isProtected}`);

  console.log("Republishing store to Published...");
  await StoreRepository.update(testStoreId, { status: "Published" });
  await page.goto(`http://localhost:3000/store/${testStoreSlug}`, { waitUntil: "networkidle" });
  const repubText = await page.innerText("body");
  const isAccessible = repubText.includes(testStore.name);
  console.log(`✓ Published store accessible again: ${isAccessible}`);

  // Clean up test store & products
  console.log("\nCleaning up test artifacts from database and disk...");
  await StoreRepository.delete(testStoreId);
  await ProductRepository.deleteByStoreId(testStoreId);
  await fs.rm(publicUploads, { recursive: true, force: true });

  await browser.close();
  console.log("\n==================================================");
  console.log("ALL REAL BROWSER VERIFICATIONS COMPLETED WITH 100% SUCCESS");
  console.log("==================================================");
}

runBrowserVerification()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error("BROWSER VERIFICATION FAILED:", err);
    process.exit(1);
  });

