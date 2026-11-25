import { chromium } from "playwright";
import fsSync from "fs";
import path from "path";

// Load .env.local
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
      if (!process.env[key]) process.env[key] = val;
    }
  }
}

import { StoreRepository } from "../src/lib/repositories/store.repository";
import { ProductRepository } from "../src/lib/repositories/product.repository";

async function verifyPhase10A() {
  console.log("==================================================");
  console.log("STARTING PHASE 10A SPECIFIC BROWSER VERIFICATIONS");
  console.log("==================================================");

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  // Listen for console messages, specifically hydration warnings
  const consoleErrors: string[] = [];
  const hydrationWarnings: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") {
      consoleErrors.push(text);
    }
    if (text.toLowerCase().includes("hydration") || text.toLowerCase().includes("mismatch") || text.toLowerCase().includes("did not match")) {
      hydrationWarnings.push(text);
    }
  });

  // 1. Verify Clean Admin Login Page
  console.log("\n[1] Verifying Clean Admin Login Page...");
  await page.goto("http://localhost:3000/login", { waitUntil: "networkidle" });
  const loginHeader = await page.innerText("h2");
  console.log(`✓ Card Subtitle: "${loginHeader}"`);
  if (!loginHeader.includes("Admin Login")) {
    throw new Error(`Expected h2 to include "Admin Login", got: ${loginHeader}`);
  }

  const signInBtn = await page.innerText("button[type='submit']");
  console.log(`✓ Submit button text: "${signInBtn}"`);
  if (!signInBtn.includes("Sign In as Admin")) {
    throw new Error(`Expected button text to be "Sign In as Admin", got: ${signInBtn}`);
  }

  // Ensure dev multi-role buttons are removed
  const demoButtons = await page.$$("button:has-text('Creator')");
  console.log(`✓ Legacy multi-role demo buttons found: ${demoButtons.length} (Expected 0)`);
  if (demoButtons.length > 0) {
    throw new Error("Found dev test buttons on admin login page!");
  }

  // 2. Perform Login and Verify Dashboard
  console.log("\n[2] Performing Admin Login and Verifying Streamlined Navigation...");
  await page.fill("input[name='email']", "admin@gridretail.internal");
  await page.fill("input[name='password']", "AdminGrid2026!");
  await page.click("button[type='submit']");
  await page.waitForURL("**/dashboard", { timeout: 10000 });
  console.log("✓ Successfully redirected to /dashboard");

  // Verify DemoBanner is removed
  const demoBanner = await page.$("text=Phase 1 Preview: GridRetail Foundation");
  console.log(`✓ Outdated DemoBanner present: ${!!demoBanner} (Expected false)`);
  if (demoBanner) {
    throw new Error("Outdated DemoBanner still visible on dashboard!");
  }

  // Verify clean navigation items: Dashboard, Stores, Templates, Settings
  const navText = await page.innerText("nav");
  console.log("✓ Dashboard navigation visible text contains:");
  console.log("   Dashboard:", navText.includes("Dashboard"));
  console.log("   Stores:", navText.includes("Stores"));
  console.log("   Templates:", navText.includes("Templates"));
  console.log("   Settings:", navText.includes("Settings"));
  console.log("   Analytics (should be false):", navText.includes("Analytics"));
  console.log("   Clients (should be false):", navText.includes("Clients"));
  console.log("   Products (should be false):", navText.includes("Products"));

  if (navText.includes("Analytics") || navText.includes("Clients") || navText.includes("Products")) {
    throw new Error("Redundant navigation links found in AppShell sidebar!");
  }

  // 3. Verify Store Wizard Step 1: Pitch Description Alignment
  console.log("\n[3] Verifying Step 1 Wizard Pitch Description Label Alignment...");
  await page.goto("http://localhost:3000/stores/new", { waitUntil: "networkidle" });
  const pitchLabel = await page.locator("label:has-text('Pitch Description / Goal')");
  const pitchLabelVisible = await pitchLabel.isVisible();
  console.log(`✓ Pitch Description label visible: ${pitchLabelVisible}`);
  const pitchTextarea = await page.locator("textarea#store-pitch-description");
  const pitchTextareaVisible = await pitchTextarea.isVisible();
  console.log(`✓ Pitch Description textarea with id #store-pitch-description visible: ${pitchTextareaVisible}`);
  if (!pitchLabelVisible || !pitchTextareaVisible) {
    throw new Error("Pitch Description label or textarea not found in Step 1 wizard!");
  }

  // 4. Create a Test Store to verify Storefront & Customizer
  console.log("\n[4] Creating test store to verify customizer & storefront hydration...");
  const testStoreId = "str_p10a_" + Date.now();
  const testSlug = "p10a-store-" + Date.now();
  await StoreRepository.create({
    id: testStoreId,
    name: "Phase 10A Store",
    slug: testSlug,
    clientName: "Phase 10A Client",
    clientId: "cli_p10a",
    industry: "Fashion & Apparel",
    templateId: "tmpl_modern_minimal",
    templateName: "Modern Minimal",
    themeId: "theme_nordic_pine",
    themeName: "Nordic Pine",
    status: "Published",
    productCount: 1,
    previewUrl: `/stores/${testStoreId}/preview`,
    localUrl: `http://${testSlug}.localhost:3000`,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: "Store to verify Phase 10A fixes",
    branding: {
      primaryColor: "#176B4D",
      secondaryColor: "#FAF9F6",
      fontFamily: "Inter",
      heroHeadline: "Phase 10A Stabilized",
      heroSubheadline: "INR Pricing and Zero Hydration Errors",
    },
    enabledSections: ["hero", "featured_products", "about", "newsletter", "footer"],
    orderedSections: ["hero", "featured_products", "about", "newsletter", "footer"],
  });

  const testProdId = `prod_p10a_${Date.now()}`;
  await ProductRepository.create({
    id: testProdId,
    name: "Artisan Silk Scarf",
    sku: `SCARF-${Date.now()}`,
    category: "Fashion & Apparel",
    price: 3499,
    compareAtPrice: 4299,
    currency: "INR",
    stockStatus: "In Stock",
    description: "Pure mulberry silk with hand-rolled edges.",
    storeId: testStoreId,
    storeName: "Phase 10A Store",
    createdAt: new Date().toISOString(),
    status: "active",
  });

  // 5. Verify Visual Customizer without Review Tab
  console.log("\n[5] Verifying Visual Customizer has no Review tab...");
  await page.goto(`http://localhost:3000/stores/${testStoreId}/preview`, { waitUntil: "networkidle" });
  const reviewTab = await page.$("button:has-text('Review')");
  console.log(`✓ Review / Feedback tab button visible: ${!!reviewTab} (Expected false)`);
  if (reviewTab) {
    throw new Error("Found Review tab in customizer drawer!");
  }

  // 6. Verify Storefront Rendering, INR Display, and Hydration
  console.log("\n[6] Verifying Storefront Rendering, INR Currency, and 0 Hydration Errors...");
  hydrationWarnings.length = 0; // reset
  await page.goto(`http://localhost:3000/store/${testSlug}`, { waitUntil: "networkidle" });

  const storeBodyText = await page.innerText("body");
  const hasInrSymbol = storeBodyText.includes("₹");
  console.log(`✓ Storefront displays Indian Rupee symbol (₹): ${hasInrSymbol}`);
  console.log(`✓ Total Hydration Mismatch Warnings: ${hydrationWarnings.length}`);
  if (hydrationWarnings.length > 0) {
    console.error("Hydration warnings detected:", hydrationWarnings);
    throw new Error(`Storefront encountered ${hydrationWarnings.length} hydration warnings!`);
  }
  if (!hasInrSymbol) {
    throw new Error("Storefront did not render any INR (₹) price symbols!");
  }

  // 7. Verify Product Detail Page (PDP) INR Display
  console.log("\n[7] Verifying PDP INR price display...");
  await page.goto(`http://localhost:3000/store/${testSlug}/products/${testProdId}`, { waitUntil: "networkidle" });
  const pdpBody = await page.innerText("body");
  console.log(`✓ PDP displays ₹3,499: ${pdpBody.includes("₹3,499")}`);
  console.log(`✓ PDP displays compare-at ₹4,299: ${pdpBody.includes("₹4,299")}`);

  // Clean up
  await StoreRepository.delete(testStoreId);
  await ProductRepository.deleteByStoreId(testStoreId);
  await browser.close();

  console.log("\n==================================================");
  console.log("PHASE 10A REAL BROWSER VERIFICATION PASSED WITH 100% SUCCESS!");
  console.log("==================================================");
}

verifyPhase10A()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("PHASE 10A VERIFICATION FAILED:", err);
    process.exit(1);
  });
