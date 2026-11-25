process.env.MONGODB_URI = "";
process.env.MONGODB_DB_NAME = "gridretail_test";
process.env.ALLOW_IN_MEMORY_FALLBACK = "true";

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const PORT = 3019;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.join(process.cwd(), "docs", "screenshots", "phase16");

async function waitForServer(url: string, timeoutMs = 25000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // waiting
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function runPhase16Verification() {
  console.log("==================================================================");
  console.log("  GridRetail Phase 16 — Context-Aware Website Generation E2E Verification");
  console.log("==================================================================");

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  let serverProcess: ChildProcess | null = null;

  try {
    const isRunning = await waitForServer(BASE_URL, 1000);
    if (!isRunning) {
      console.log(`Starting isolated Next.js production server on port ${PORT}...`);
      const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";
      serverProcess = spawn(npxCmd, ["next", "start", "-H", "127.0.0.1", "-p", String(PORT)], {
        shell: true,
        stdio: "pipe",
        env: {
          ...process.env,
          PORT: String(PORT),
          ALLOW_IN_MEMORY_FALLBACK: "true",
        },
      });

      const readyPromise = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Next.js server failed to respond within 30 seconds.")),
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
          if (errText && !errText.includes("warn")) {
            console.error("   [Next.js err]", errText);
          }
        });
      });

      await readyPromise;
      await new Promise((r) => setTimeout(r, 1500));
      console.log("Next.js server is ready at " + BASE_URL);
    } else {
      console.log("Using existing running server at " + BASE_URL);
    }

    const browser: Browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context: BrowserContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page: Page = await context.newPage();

    // 1. Authenticate Platform Administrator
    console.log("Authenticating platform administrator...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"], input[name="email"]', "admin@gridretail.internal");
    await page.fill('input[type="password"], input[name="password"]', "AdminGrid2026!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // -------------------------------------------------------------
    // PART 1: 5-Step Context-Aware Wizard Walkthrough
    // -------------------------------------------------------------
    console.log("Navigating to Store Generation Wizard (/stores/new)...");
    await page.goto(`${BASE_URL}/stores/new`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);

    // STEP 1: Objective & Details
    console.log("Filling Step 1: Objective & Details...");
    // Select Website Type: Lead Gen
    const leadGenBtn = page.locator('button:has-text("Lead Generation")');
    if (await leadGenBtn.count() > 0) {
      await leadGenBtn.first().click();
      await page.waitForTimeout(400);
    }

    await page.fill('input[placeholder*="Lumina Atelier Living"]', "Vanguard Legal Counsel");
    await page.fill('input[placeholder*="lumina-atelier-living"]', "vanguard-legal-counsel");

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase16-wizard-step1-objective.png"),
      fullPage: false,
    });
    console.log("✓ Captured: phase16-wizard-step1-objective.png");

    // Advance to Step 2
    console.log("Advancing to Step 2...");
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(1000);

    // STEP 2: Business Profile & Context
    console.log("Filling Step 2: Business Profile & Context...");
    const catInput = page.locator('input[placeholder*="Corporate Governance"]');
    if (await catInput.count() > 0) {
      await catInput.first().fill("Commercial Litigation & Arbitration");
    }
    const audInput = page.locator('input[placeholder*="In-house legal counsel"]');
    if (await audInput.count() > 0) {
      await audInput.first().fill("Enterprise General Counsels and Venture-backed Founders");
    }
    const locInput = page.locator('input[placeholder*="Mumbai, India"]');
    if (await locInput.count() > 0) {
      await locInput.first().fill("London & Singapore Chambers");
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase16-wizard-step2-profile.png"),
      fullPage: false,
    });
    console.log("✓ Captured: phase16-wizard-step2-profile.png");

    // Advance to Step 3
    console.log("Advancing to Step 3...");
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(1000);

    // STEP 3: Brand Direction & Identity
    console.log("Capturing Step 3: Brand Direction & Identity...");
    // Select luxury_refined archetype if present
    const luxuryCard = page.locator('text=Luxury & Refined');
    if (await luxuryCard.count() > 0) {
      await luxuryCard.first().click();
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase16-wizard-step3-brand.png"),
      fullPage: false,
    });
    console.log("✓ Captured: phase16-wizard-step3-brand.png");

    // Advance to Step 4 (Synthesizes AI Plan)
    console.log("Advancing to Step 4 (AI Plan Synthesis)...");
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(2000);

    // STEP 4: AI Plan & Structure
    console.log("Capturing Step 4: AI Website Plan & Structure...");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase16-wizard-step4-ai-plan.png"),
      fullPage: false,
    });
    console.log("✓ Captured: phase16-wizard-step4-ai-plan.png");

    // Advance to Step 5 (Review & Launch)
    console.log("Advancing to Step 5...");
    await page.click('button:has-text("Continue")');
    await page.waitForTimeout(1000);

    // STEP 5: Review & Launch
    console.log("Capturing Step 5: Review & Launch...");
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase16-wizard-step5-review.png"),
      fullPage: false,
    });
    console.log("✓ Captured: phase16-wizard-step5-review.png");

    // -------------------------------------------------------------
    // PART 2: Generated Website Showcase (All 3 Website Types)
    // -------------------------------------------------------------
    console.log("Testing Generated E-Commerce Website (str_01)...");
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase16-ecommerce-generated-desktop.png"),
      fullPage: false,
    });
    console.log("✓ Captured: phase16-ecommerce-generated-desktop.png");

    console.log("Testing Generated Appointment Scheduling Website (str_07)...");
    await page.goto(`${BASE_URL}/stores/str_07/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase16-appointments-generated-desktop.png"),
      fullPage: false,
    });
    console.log("✓ Captured: phase16-appointments-generated-desktop.png");

    console.log("Testing Generated Lead Generation Website (str_08)...");
    await page.goto(`${BASE_URL}/stores/str_08/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase16-leadgen-generated-desktop.png"),
      fullPage: false,
    });
    console.log("✓ Captured: phase16-leadgen-generated-desktop.png");

    // -------------------------------------------------------------
    // PART 3: Visual Editor AI Section Regeneration Modal
    // -------------------------------------------------------------
    console.log("Opening AI Section Regeneration Modal in Visual Editor...");
    // Click on a section in the preview iframe or layers tab
    const layersBtn = page.locator('button:has-text("Layers")');
    if (await layersBtn.isVisible()) {
      await layersBtn.click();
      await page.waitForTimeout(500);
    }
    // Select the first section in layers
    const firstSectionItem = page.locator('[data-testid="layer-item"], button:has-text("Hero"), button:has-text("hero_")');
    if (await firstSectionItem.count() > 0) {
      await firstSectionItem.first().click();
      await page.waitForTimeout(800);
    }

    // Click "AI Context Copy" or "Regenerate Copy with AI Context" button in right inspector panel
    const regenBtn = page.locator('button:has-text("AI Context Copy"), button:has-text("Regenerate Copy")');
    if (await regenBtn.count() > 0) {
      await regenBtn.first().click();
      await page.waitForTimeout(600);
    }

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase16-visual-editor-regen-modal.png"),
      fullPage: false,
    });
    console.log("✓ Captured: phase16-visual-editor-regen-modal.png");

    // Close modal if open
    const cancelBtn = page.locator('button:has-text("Cancel")');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(400);
    }

    // -------------------------------------------------------------
    // PART 4: Responsive Verification (Tablet & Mobile)
    // -------------------------------------------------------------
    console.log("Testing Tablet Viewport (768x1024)...");
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/store/aura-minimalist`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase16-responsive-tablet.png"),
      fullPage: false,
    });
    console.log("✓ Captured: phase16-responsive-tablet.png");

    console.log("Testing Mobile Viewport (375x812)...");
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`${BASE_URL}/store/aura-minimalist`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "phase16-responsive-mobile.png"),
      fullPage: false,
    });
    console.log("✓ Captured: phase16-responsive-mobile.png");

    await browser.close();
    console.log("==================================================================");
    console.log("  All Phase 16 Playwright Screenshots Successfully Captured!      ");
    console.log("==================================================================");
  } finally {
    if (serverProcess) {
      console.log("Stopping isolated Next.js test server...");
      serverProcess.kill("SIGTERM");
    }
  }
}

runPhase16Verification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
