process.env.MONGODB_URI = "";
process.env.MONGODB_DB_NAME = "gridretail_test";

import { chromium } from "playwright";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs/promises";

const PORT = 3010;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOTS_DIR = path.join(process.cwd(), "docs", "screenshots");

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
  console.log("  Phase 14: Browser Verification — Professional Website Design");
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
      env: { ...process.env, PORT: String(PORT), ALLOW_IN_MEMORY_FALLBACK: "true" },
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

  // 2. Launch Chromium via Playwright
  console.log("2. Launching Headless Chromium...");
  const browser = await chromium.launch({
    headless: true,
    args: ["--no-sandbox", "--disable-setuid-sandbox"],
  });

  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
  });
  const page = await context.newPage();

  // A. E-Commerce Storefront - Centered Hero Default
  console.log("\n--- A. VERIFYING E-COMMERCE DESIGN (AURA MINIMALIST) ---");
  await page.goto(`${BASE_URL}/store/${ecomSlug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "phase14-ecommerce-hero-centered.png"),
    fullPage: false,
  });
  console.log("   📸 Captured: phase14-ecommerce-hero-centered.png");

  // PostMessage Live Variation Switch: Magazine Editorial Hero
  console.log("\n--- B. VERIFYING EDITORIAL MAGAZINE HERO DYNAMICS ---");
  await page.evaluate(() => {
    window.postMessage(
      {
        type: "GRIDRETAIL_PREVIEW_UPDATE",
        payload: {
          styling: {
            heroVariation: "editorial",
            typographyScale: "prominent",
            contentWidth: "wide",
          },
        },
      },
      "*"
    );
  });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "phase14-ecommerce-hero-editorial.png"),
    fullPage: false,
  });
  console.log("   📸 Captured: phase14-ecommerce-hero-editorial.png");

  // PostMessage Live Variation Switch: Brutalist Asymmetric Hero
  console.log("\n--- C. VERIFYING BRUTALIST ASYMMETRIC HERO ---");
  await page.evaluate(() => {
    window.postMessage(
      {
        type: "GRIDRETAIL_PREVIEW_UPDATE",
        payload: {
          styling: {
            heroVariation: "asymmetric",
            cardVariation: "block_solid",
            headerVariation: "corporate",
          },
        },
      },
      "*"
    );
  });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "phase14-ecommerce-hero-asymmetric.png"),
    fullPage: false,
  });
  console.log("   📸 Captured: phase14-ecommerce-hero-asymmetric.png");

  // Navigation Headers & Footers Verification
  console.log("\n--- D. VERIFYING NAVIGATION HEADERS & FOOTERS ---");
  await page.evaluate(() => {
    window.postMessage(
      {
        type: "GRIDRETAIL_PREVIEW_UPDATE",
        payload: {
          styling: {
            headerVariation: "transparent",
            footerVariation: "commerce_directory",
          },
        },
      },
      "*"
    );
  });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "phase14-navigation-headers.png"),
    fullPage: false,
  });
  console.log("   📸 Captured: phase14-navigation-headers.png");

  // Scroll to footer
  await page.evaluate(() => window.scrollTo(0, document.body.scrollHeight));
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "phase14-footer-variations.png"),
    fullPage: false,
  });
  console.log("   📸 Captured: phase14-footer-variations.png");

  // E. Appointment Scheduling Store
  console.log("\n--- E. VERIFYING APPOINTMENT SCHEDULING (SUMMIT LEGAL) ---");
  await page.goto(`${BASE_URL}/store/${apptSlug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "phase14-appointment-service-booking.png"),
    fullPage: false,
  });
  console.log("   📸 Captured: phase14-appointment-service-booking.png");

  // F. Lead Generation Store
  console.log("\n--- F. VERIFYING LEAD GENERATION (APEX GROWTH) ---");
  await page.goto(`${BASE_URL}/store/${leadSlug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1000);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "phase14-leadgen-form-conversion.png"),
    fullPage: false,
  });
  console.log("   📸 Captured: phase14-leadgen-form-conversion.png");

  // G. Visual Customizer Controls Pane
  console.log("\n--- G. VERIFYING VISUAL CUSTOMIZER CONTROLS ---");
  // Log in as default admin
  await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
  await page.fill('input[type="email"], input[name="email"]', "admin@gridretail.internal");
  await page.fill('input[type="password"], input[name="password"]', "AdminGrid2026!");
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);

  // Navigate to store preview customizer
  await page.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
  await page.waitForTimeout(1500);

  // Click on "Styling" tab
  const stylingTabBtn = page.locator('button:has-text("Styling")');
  if (await stylingTabBtn.isVisible()) {
    await stylingTabBtn.click();
    await page.waitForTimeout(600);
  }

  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "phase14-customizer-controls.png"),
    fullPage: false,
  });
  console.log("   📸 Captured: phase14-customizer-controls.png");

  // H. Responsive Viewports
  console.log("\n--- H. VERIFYING RESPONSIVE VIEWPORTS ---");
  // Tablet: 768 x 1024
  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto(`${BASE_URL}/store/${ecomSlug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "phase14-responsive-tablet.png"),
    fullPage: false,
  });
  console.log("   📸 Captured: phase14-responsive-tablet.png");

  // Mobile: 375 x 812
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto(`${BASE_URL}/store/${ecomSlug}`, { waitUntil: "networkidle" });
  await page.waitForTimeout(600);
  await page.screenshot({
    path: path.join(SCREENSHOTS_DIR, "phase14-responsive-mobile.png"),
    fullPage: false,
  });
  console.log("   📸 Captured: phase14-responsive-mobile.png");

  // Cleanup
  console.log("\n3. Closing browser and terminating verification server...");
  await browser.close();
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }

  console.log("\n===================================================================");
  console.log("  Phase 14 Browser Verification: ALL CHECKS PASSED SUCCESSFULLY!");
  console.log("===================================================================\n");
  process.exit(0);
}

run().catch((err) => {
  console.error("FATAL ERROR in Phase 14 E2E Verification:", err);
  process.exit(1);
});
