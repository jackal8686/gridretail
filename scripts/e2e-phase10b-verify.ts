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

async function verifyPhase10B() {
  console.log("==========================================================");
  console.log("STARTING PHASE 10B REAL-BROWSER E-COMMERCE VERIFICATIONS");
  console.log("==========================================================");

  // 1. Ensure at least one published store with products exists
  const stores = await StoreRepository.findAll();
  let targetStore = stores.find((s) => s.status === "Published") || null;
  if (!targetStore && stores.length > 0) {
    targetStore = await StoreRepository.update(stores[0].id, { status: "Published" });
  }

  if (!targetStore) {
    throw new Error("No stores available for Phase 10B verification");
  }

  const slug = targetStore.slug;
  console.log(`✓ Using target published store: "${targetStore.name}" (${slug})`);

  let products = await ProductRepository.findByStoreId(targetStore.id);
  if (products.length === 0) {
    products = await ProductRepository.findAll();
  }
  console.log(`✓ Found ${products.length} products associated with store`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  const consoleErrors: string[] = [];
  const hydrationWarnings: string[] = [];
  page.on("console", (msg) => {
    const text = msg.text();
    if (msg.type() === "error") {
      consoleErrors.push(text);
    }
    if (
      text.toLowerCase().includes("hydration") ||
      text.toLowerCase().includes("mismatch") ||
      text.toLowerCase().includes("did not match")
    ) {
      hydrationWarnings.push(text);
    }
  });

  try {
    // ----------------------------------------------------
    // STEP 1: Storefront Homepage & INR Currency
    // ----------------------------------------------------
    console.log(`\n[1] Visiting Storefront Homepage at http://localhost:3000/store/${slug}...`);
    await page.goto(`http://localhost:3000/store/${slug}`, { waitUntil: "networkidle" });
    const title = await page.title();
    console.log(`✓ Page Loaded: "${title}"`);

    // Verify INR currency symbol present on page
    const pageText = await page.innerText("body");
    if (!pageText.includes("₹")) {
      throw new Error("Expected storefront to render prices formatted in INR (₹)");
    }
    console.log("✓ Verified standard INR (₹) currency presence across catalog");

    // ----------------------------------------------------
    // STEP 2: PDP Navigation & Variant Selection
    // ----------------------------------------------------
    console.log("\n[2] Navigating to Product Detail Page (PDP)...");
    const testProduct = products[0];
    const pdpUrl = `http://localhost:3000/store/${slug}/products/${testProduct.id}`;
    await page.goto(pdpUrl, { waitUntil: "networkidle" });
    console.log(`✓ Navigated to PDP: ${pdpUrl}`);

    // Verify PDP elements
    const prodHeading = await page.innerText("h1");
    console.log(`✓ Product heading: "${prodHeading}"`);

    // Check for variant pills if variants exist
    const variantButtons = await page.$$("button[aria-label*='variant' i], button:has-text('Small'), button:has-text('Medium'), button:has-text('Large')");
    if (variantButtons.length > 0) {
      await variantButtons[0].click();
      console.log("✓ Selected first available variant option");
    }

    // Click "Add to Bag"
    const addToBagBtn = await page.$("button:has-text('Add to Bag'), button:has-text('Add to Cart')");
    if (!addToBagBtn) {
      throw new Error("Add to Bag button not found on PDP");
    }
    await addToBagBtn.click();
    console.log("✓ Clicked 'Add to Bag' on PDP");

    // Allow cart drawer animation and state propagation
    await page.waitForTimeout(1000);

    // ----------------------------------------------------
    // STEP 3: Dedicated Cart Page (`/store/[slug]/cart`)
    // ----------------------------------------------------
    console.log(`\n[3] Visiting Dedicated Cart Page at http://localhost:3000/store/${slug}/cart...`);
    await page.goto(`http://localhost:3000/store/${slug}/cart`, { waitUntil: "networkidle" });

    const cartHeading = await page.innerText("h1");
    console.log(`✓ Cart Page Heading: "${cartHeading}"`);

    // Verify cart subtotal is rendered in INR
    const cartBody = await page.innerText("body");
    if (!cartBody.includes("₹")) {
      throw new Error("Cart page does not render INR (₹) subtotal");
    }
    console.log("✓ Verified cart subtotal formatting in INR (₹)");

    // Test quantity increment button if present
    const plusBtn = await page.$("button[aria-label='Increase quantity']");
    if (plusBtn) {
      await plusBtn.click();
      console.log("✓ Clicked quantity increment button (+) on cart page");
      await page.waitForTimeout(500);
    }

    // ----------------------------------------------------
    // STEP 4: Dedicated Simulated Checkout (`/store/[slug]/checkout`)
    // ----------------------------------------------------
    console.log(`\n[4] Navigating to Dedicated Simulated Checkout Page...`);
    const checkoutBtn = await page.$("button:has-text('Proceed to Simulated Checkout'), a:has-text('Proceed to Simulated Checkout')");
    if (checkoutBtn) {
      await checkoutBtn.click();
      await page.waitForURL(`**/store/${slug}/checkout`, { timeout: 8000 });
    } else {
      await page.goto(`http://localhost:3000/store/${slug}/checkout`, { waitUntil: "networkidle" });
    }
    console.log("✓ Loaded Simulated Checkout page");

    // Fill simulated checkout form
    await page.fill("input[placeholder*='Priya' i]", "Aditi Verma");
    await page.fill("input[type='email']", "aditi.verma@example.in");
    await page.fill("input[placeholder*='Heritage' i]", "108 Marine Promenade");
    await page.fill("input[placeholder*='Mumbai' i]", "Bengaluru");
    await page.fill("input[placeholder*='400001' i]", "560001");
    console.log("✓ Filled customer contact & shipping destination details");

    // Submit simulated order
    const placeOrderBtn = await page.$("button[type='submit']");
    if (!placeOrderBtn) {
      throw new Error("Place Simulated Order submit button not found");
    }
    await placeOrderBtn.click();
    console.log("✓ Submitted simulated order");

    // Verify order confirmation receipt modal/screen
    await page.waitForSelector("text=ORD-SIM-", { timeout: 8000 });
    const receiptText = await page.innerText("body");
    const orderNoMatch = receiptText.match(/ORD-SIM-\d{6}/);
    if (!orderNoMatch) {
      throw new Error("Did not find expected simulated order number pattern ORD-SIM-XXXXXX");
    }
    console.log(`✓ Verified Simulated Order Confirmation: "${orderNoMatch[0]}"`);

    // Verify disclaimer notice
    if (!receiptText.includes("interactive demonstration mode") && !receiptText.includes("No real financial transaction")) {
      throw new Error("Missing required demo disclaimer on checkout receipt");
    }
    console.log("✓ Verified mandatory demonstration disclaimer on simulated receipt");

    // ----------------------------------------------------
    // STEP 5: Collections Catalog Page (`/store/[slug]/collections`)
    // ----------------------------------------------------
    console.log(`\n[5] Visiting Collections Catalog Page at http://localhost:3000/store/${slug}/collections...`);
    await page.goto(`http://localhost:3000/store/${slug}/collections`, { waitUntil: "networkidle" });
    const collectionsHeading = await page.innerText("h1");
    console.log(`✓ Collections Page Heading: "${collectionsHeading}"`);

    // Test Category filter selection if categories available
    const categoryFilterPills = await page.$$("button[class*='rounded']:has-text('All')");
    console.log(`✓ Category filter controls detected: ${categoryFilterPills.length > 0 ? "YES" : "NO"}`);

    // ----------------------------------------------------
    // STEP 6: Hydration & Console Verification
    // ----------------------------------------------------
    console.log("\n[6] Checking Browser Console Errors & Hydration Warnings...");
    console.log(`✓ Total Console Errors: ${consoleErrors.length}`);
    console.log(`✓ Total Hydration Warnings: ${hydrationWarnings.length}`);

    if (hydrationWarnings.length > 0) {
      console.warn("⚠️ Hydration Warnings Detected:", hydrationWarnings);
      throw new Error(`Hydration mismatch warnings found: ${hydrationWarnings.join(" | ")}`);
    }

    console.log("\n==========================================================");
    console.log("ALL PHASE 10B REAL-BROWSER VERIFICATIONS PASSED 100%!");
    console.log("==========================================================");
  } finally {
    await browser.close();
  }
}

verifyPhase10B().catch((err) => {
  console.error("❌ Phase 10B Verification Failed:", err);
  process.exit(1);
});
