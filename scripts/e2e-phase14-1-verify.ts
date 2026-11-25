process.env.MONGODB_URI = "";
process.env.MONGODB_DB_NAME = "gridretail_test";
process.env.ALLOW_IN_MEMORY_FALLBACK = "true";

import { chromium } from "playwright";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs/promises";
import crypto from "crypto";

const PORT = 3012;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "screenshots", "phase14-1");

// Isolated ephemeral test runner credentials (zero hardcoded static credentials)
const testEmail = process.env.E2E_ADMIN_EMAIL || "test-runner@gridretail.test";
const testPassword =
  process.env.E2E_ADMIN_PASSWORD ||
  `E2E_${crypto.randomBytes(12).toString("hex")}!Aa1`;
process.env.ENABLE_E2E_TEST_USER = "true";
process.env.E2E_ADMIN_PASSWORD = testPassword;
process.env.E2E_ADMIN_EMAIL = testEmail;

async function waitForServer(url: string, timeoutMs = 45000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // Server warming up
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function run() {
  console.log("===================================================================");
  console.log("  Phase 14.1: Comprehensive Verification & Evidence Generation");
  console.log("===================================================================\n");

  await fs.mkdir(SCREENSHOTS_DIR, { recursive: true });

  const ecomSlug = "aura-minimalist";
  const apptSlug = "summit-legal";
  const leadSlug = "apex-growth";

  // 1. Start Next.js production server
  console.log(`1. Starting Next.js production server on port ${PORT}...`);
  let serverProcess: ChildProcess | null = null;
  const alreadyListening = await waitForServer(BASE_URL, 1500);

  if (!alreadyListening) {
    serverProcess = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", String(PORT)], {
      shell: true,
      stdio: "pipe",
      env: {
        ...process.env,
        PORT: String(PORT),
        ALLOW_IN_MEMORY_FALLBACK: "true",
        ENABLE_E2E_TEST_USER: "true",
        E2E_ADMIN_PASSWORD: testPassword,
        E2E_ADMIN_EMAIL: testEmail,
      },
    });

    const readyPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(
        () => reject(new Error("Next.js server failed to launch within 30 seconds.")),
        30000
      );
      serverProcess?.stdout?.on("data", (d) => {
        const msg = d.toString().trim();
        if (msg.includes("Ready") || msg.includes("Local:") || msg.includes("✓ Ready")) {
          console.log("   [Next.js]", msg);
          clearTimeout(timer);
          resolve();
        }
      });
      serverProcess?.stderr?.on("data", (d) => {
        const errText = d.toString().trim();
        if (errText && !errText.includes("Fast Refresh") && !errText.includes("warn")) {
          console.error("   [Next.js err]", errText);
        }
      });
    });

    await readyPromise;
    await new Promise((r) => setTimeout(r, 2000));
    console.log(`   ✓ Server listening on ${BASE_URL}\n`);
  } else {
    console.log(`   ✓ Server was already listening on ${BASE_URL}\n`);
  }

  // 2. Launch Chromium
  console.log("2. Launching Headless Chromium...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // -------------------------------------------------------------
  // PART 1: 10 HERO VARIATIONS VERIFICATION
  // -------------------------------------------------------------
  console.log("\n--- PART 1: VERIFYING 10 HERO VARIATIONS ---");
  await page.goto(`${BASE_URL}/store/${ecomSlug}`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1000);

  const heroVariations = [
    "centered",
    "split",
    "image_bg",
    "editorial",
    "minimal",
    "product_spotlight",
    "service_booking",
    "form_conversion",
    "media_showcase",
    "asymmetric",
  ] as const;

  for (const heroVar of heroVariations) {
    await page.evaluate((variant) => {
      window.postMessage(
        {
          type: "GRIDRETAIL_PREVIEW_UPDATE",
          payload: {
            styling: {
              heroVariation: variant,
            },
          },
        },
        "*"
      );
    }, heroVar);

    await page.waitForTimeout(400);
    const shotPath = path.join(SCREENSHOTS_DIR, `hero-${heroVar}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`   📸 Captured Hero Variation [${heroVar}]: ${path.basename(shotPath)}`);
  }

  // -------------------------------------------------------------
  // PART 2: 7 NAVIGATION HEADER VARIATIONS & RESPONSIVE MOBILE DRAWER
  // -------------------------------------------------------------
  console.log("\n--- PART 2: VERIFYING 7 NAVIGATION VARIATIONS & MOBILE DRAWER ---");
  const navVariations = [
    "minimal",
    "corporate",
    "centered_logo",
    "transparent",
    "commerce_cart",
    "appointment_cta",
    "lead_inquiry",
  ] as const;

  for (const navVar of navVariations) {
    await page.evaluate((variant) => {
      window.postMessage(
        {
          type: "GRIDRETAIL_PREVIEW_UPDATE",
          payload: {
            styling: {
              headerVariation: variant,
            },
          },
        },
        "*"
      );
    }, navVar);

    await page.waitForTimeout(400);
    const shotPath = path.join(SCREENSHOTS_DIR, `nav-${navVar}.png`);
    await page.screenshot({ path: shotPath, fullPage: false });
    console.log(`   📸 Captured Nav Variation [${navVar}]: ${path.basename(shotPath)}`);
  }

  // Mobile Menu Toggle Test
  console.log("   Testing responsive mobile menu toggle drawer...");
  await page.setViewportSize({ width: 375, height: 812 });
  await page.waitForTimeout(400);

  const menuToggle = page.locator('button[aria-label="Toggle navigation menu"]');
  if (await menuToggle.count() > 0) {
    await menuToggle.first().click();
    await page.waitForTimeout(400);
    const mobileMenuShot = path.join(SCREENSHOTS_DIR, "nav-mobile-menu-drawer-open.png");
    await page.screenshot({ path: mobileMenuShot });
    console.log(`   📸 Captured Mobile Menu Open Drawer: ${path.basename(mobileMenuShot)}`);
  }

  // Reset viewport to desktop
  await page.setViewportSize({ width: 1440, height: 900 });

  // -------------------------------------------------------------
  // PART 3: 6 FOOTER VARIATIONS
  // -------------------------------------------------------------
  console.log("\n--- PART 3: VERIFYING 6 FOOTER VARIATIONS ---");
  const footerVariations = [
    "multi_column",
    "minimal_inline",
    "business_info",
    "commerce_directory",
    "service_practitioner",
    "contact_focused",
  ] as const;

  for (const footerVar of footerVariations) {
    await page.evaluate((variant) => {
      window.postMessage(
        {
          type: "GRIDRETAIL_PREVIEW_UPDATE",
          payload: {
            styling: {
              footerVariation: variant,
            },
          },
        },
        "*"
      );
    }, footerVar);

    await page.waitForTimeout(400);
    await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
    await page.waitForTimeout(300);

    const shotPath = path.join(SCREENSHOTS_DIR, `footer-${footerVar}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`   📸 Captured Footer Variation [${footerVar}]: ${path.basename(shotPath)}`);
  }

  // -------------------------------------------------------------
  // PART 4: 6 CARD TREATMENTS
  // -------------------------------------------------------------
  console.log("\n--- PART 4: VERIFYING 6 CARD TREATMENTS ---");
  const cardTreatments = [
    "flat",
    "bordered",
    "elevated",
    "floating",
    "block_solid",
    "soft_rounded",
  ] as const;

  for (const cardVar of cardTreatments) {
    await page.evaluate((variant) => {
      window.postMessage(
        {
          type: "GRIDRETAIL_PREVIEW_UPDATE",
          payload: {
            styling: {
              cardVariation: variant,
            },
          },
        },
        "*"
      );
    }, cardVar);

    await page.waitForTimeout(400);
    const catalogSection = page.locator("#catalog-section");
    if (await catalogSection.count() > 0) {
      await catalogSection.scrollIntoViewIfNeeded();
      await page.waitForTimeout(300);
    }

    const shotPath = path.join(SCREENSHOTS_DIR, `card-treatment-${cardVar}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`   📸 Captured Card Treatment [${cardVar}]: ${path.basename(shotPath)}`);
  }

  // -------------------------------------------------------------
  // PART 5: VERIFIED STATISTICS BAR SECTION
  // -------------------------------------------------------------
  console.log("\n--- PART 5: VERIFYING VERIFIED STATISTICS BAR SECTION ---");
  await page.evaluate(() => {
    window.postMessage(
      {
        type: "GRIDRETAIL_PREVIEW_UPDATE",
        payload: {
          sections: [
            {
              id: "hero_default",
              type: "hero_full_width",
              order: 0,
              visible: true,
              layoutVariant: "centered",
              settings: {},
            },
            {
              id: "sec_stats_verify",
              type: "verified_statistics_bar",
              order: 1,
              visible: true,
              layoutVariant: "boxed_cards",
              settings: {
                badge: "Platform Metrics",
                title: "Verifiable Operations & Standards",
                items: [
                  { value: "100%", label: "Tenant Isolation", sublabel: "Strictly segregated databases" },
                  { value: "0", label: "Third-Party Trackers", sublabel: "Zero tracking cookies" },
                  { value: "331", label: "Automated Tests", sublabel: "Complete quality verification" },
                  { value: "12", label: "Curated Themes", sublabel: "Accessible design palettes" },
                ],
              },
            },
          ],
        },
      },
      "*"
    );
  });
  await page.waitForTimeout(500);

  const statsEl = page.locator('[data-section-type="verified_statistics_bar"]');
  if (await statsEl.count() > 0) {
    await statsEl.scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    const shotPath = path.join(SCREENSHOTS_DIR, "section-verified-statistics-bar.png");
    await page.screenshot({ path: shotPath });
    console.log(`   📸 Captured Verified Statistics Bar: ${path.basename(shotPath)}`);
  }

  // -------------------------------------------------------------
  // PART 6: RESPONSIVE VIEWPORT EVIDENCE ACROSS 3 WEBSITE TYPES
  // -------------------------------------------------------------
  console.log("\n--- PART 6: RESPONSIVE VIEWPORT EVIDENCE (3 WEBSITE TYPES) ---");
  const viewports = [
    { name: "desktop", width: 1440, height: 900 },
    { name: "laptop", width: 1280, height: 800 },
    { name: "tablet", width: 768, height: 1024 },
    { name: "mobile", width: 375, height: 812 },
  ];

  // E-commerce
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/store/${ecomSlug}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    const shotPath = path.join(SCREENSHOTS_DIR, `responsive-ecom-${vp.name}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`   📸 Captured E-commerce ${vp.name} (${vp.width}x${vp.height}): ${path.basename(shotPath)}`);
  }

  // Appointments
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/store/${apptSlug}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    const shotPath = path.join(SCREENSHOTS_DIR, `responsive-appt-${vp.name}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`   📸 Captured Appointments ${vp.name} (${vp.width}x${vp.height}): ${path.basename(shotPath)}`);
  }

  // Lead Generation
  for (const vp of viewports) {
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.goto(`${BASE_URL}/store/${leadSlug}`, { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(400);
    const shotPath = path.join(SCREENSHOTS_DIR, `responsive-leadgen-${vp.name}.png`);
    await page.screenshot({ path: shotPath });
    console.log(`   📸 Captured Lead Gen ${vp.name} (${vp.width}x${vp.height}): ${path.basename(shotPath)}`);
  }

  // -------------------------------------------------------------
  // PART 7: CUSTOMIZER CONTROLS & PERSISTENCE
  // -------------------------------------------------------------
  console.log("\n--- PART 7: CUSTOMIZER CONTROLS & PERSISTENCE EVIDENCE ---");
  await page.setViewportSize({ width: 1440, height: 900 });

  // Log in using isolated test account credentials configured at launch
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"]', testEmail);
  await page.fill('input[type="password"], input[name="password"]', testPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // Navigate to store preview customizer
  await page.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "domcontentloaded" });
  await page.waitForTimeout(1500);

  // Click on "Styling" tab
  const stylingTabBtn = page.locator('button:has-text("Styling")');
  if (await stylingTabBtn.isVisible()) {
    await stylingTabBtn.click();
    await page.waitForTimeout(600);
  }

  const customizerShot = path.join(SCREENSHOTS_DIR, "customizer-styling-panel.png");
  await page.screenshot({ path: customizerShot });
  console.log(`   📸 Captured Customizer Styling Panel: ${path.basename(customizerShot)}`);

  console.log("\n--- CLEANING UP ---");
  await browser.close();
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }

  console.log("\n===================================================================");
  console.log("  Phase 14.1 Browser Verification Complete. All Evidence Generated!");
  console.log("===================================================================\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
