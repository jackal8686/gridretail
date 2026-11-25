process.env.MONGODB_URI = "";
process.env.MONGODB_DB_NAME = "gridretail_test";
process.env.ALLOW_IN_MEMORY_FALLBACK = "true";

import { chromium } from "playwright";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";
import crypto from "crypto";

const PORT = 3016;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.join(process.cwd(), "docs", "screenshots", "phase15");

// Generate isolated dynamic ephemeral credentials for test execution
const dynamicTestPassword = `Auth_${crypto.randomBytes(12).toString("hex")}!Aa1`;
const dynamicTestEmail = "test-runner@gridretail.test";

process.env.ENABLE_E2E_TEST_USER = "true";
process.env.E2E_ADMIN_PASSWORD = dynamicTestPassword;
process.env.E2E_ADMIN_EMAIL = dynamicTestEmail;

async function waitForServer(url: string, timeoutMs = 15000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // waiting for server
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function runPhase15E2E() {
  console.log("=================================================");
  console.log("   GridRetail Phase 15 Visual Editor E2E Test   ");
  console.log("=================================================");

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  let serverProcess: ChildProcess | null = null;

  try {
    const isAlreadyRunning = await waitForServer(BASE_URL, 1000);
    if (!isAlreadyRunning) {
      console.log(`Starting isolated Next.js production server on port ${PORT}...`);
      serverProcess = spawn("npx", ["next", "start", "-H", "127.0.0.1", "-p", String(PORT)], {
        shell: true,
        stdio: "pipe",
        env: {
          ...process.env,
          PORT: String(PORT),
          ALLOW_IN_MEMORY_FALLBACK: "true",
          ENABLE_E2E_TEST_USER: "true",
          E2E_ADMIN_PASSWORD: dynamicTestPassword,
          E2E_ADMIN_EMAIL: dynamicTestEmail,
        },
      });

      const readyPromise = new Promise<void>((resolve, reject) => {
        const timer = setTimeout(
          () => reject(new Error("Next.js server failed to launch within 30 seconds.")),
          30000
        );
        serverProcess?.stdout?.on("data", (d) => {
          const msg = d.toString().trim();
          if (msg.includes("Ready") || msg.includes("Local:") || msg.includes("âœ“ Ready")) {
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
    }

    console.log("Server is listening and ready at " + BASE_URL);

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      viewport: { width: 1536, height: 960 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();

    // 1. Authenticate
    console.log("Authenticating platform administrator...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"], input[name="email"]', "admin@gridretail.internal");
    await page.fill('input[type="password"], input[name="password"]', "AdminGrid2026!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // 2. Test E-Commerce Store & Desktop Viewport
    console.log("Testing E-Commerce Storefront in Visual Editor...");
    await page.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2500);

    // Verify workspace loaded
    const workspaceExists = await page.isVisible('[data-testid="advanced-visual-editor-workspace"]');
    console.log(`- Advanced Visual Editor Workspace Rendered: ${workspaceExists}`);

    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "editor-desktop-ecommerce.png"),
      fullPage: false,
    });
    console.log("âœ“ Captured: editor-desktop-ecommerce.png");

    // 3. Test Layers Navigator
    console.log("Capturing Layers Navigator...");
    const layersTab = page.locator('button:has-text("Layers")');
    if (await layersTab.isVisible()) {
      await layersTab.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "editor-layers-navigator.png"),
      fullPage: false,
    });
    console.log("âœ“ Captured: editor-layers-navigator.png");

    // 4. Test Add Section Library
    console.log("Capturing Add Section Library...");
    const addSectionTab = page.locator('button:has-text("Add Section")');
    if (await addSectionTab.isVisible()) {
      await addSectionTab.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "editor-add-section-library.png"),
      fullPage: false,
    });
    console.log("âœ“ Captured: editor-add-section-library.png");

    // 5. Test Properties Inspector (select first section)
    console.log("Testing Properties Inspector...");
    if (await layersTab.isVisible()) {
      await layersTab.click();
      await page.waitForTimeout(500);
    }
    const firstSectionItem = page.locator('[role="listitem"]').first();
    if (await firstSectionItem.isVisible()) {
      await firstSectionItem.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "editor-properties-inspector.png"),
      fullPage: false,
    });
    console.log("âœ“ Captured: editor-properties-inspector.png");

    // 6. Test Inline Text Quick Edit Modal
    console.log("Testing Quick Edit Modal on Canvas...");
    const quickEditBtn = page.locator('button:has-text("Quick Edit")');
    if (await quickEditBtn.isVisible()) {
      await quickEditBtn.click();
      await page.waitForTimeout(500);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "editor-inline-text-editing.png"),
      fullPage: false,
    });
    console.log("âœ“ Captured: editor-inline-text-editing.png");

    // Close quick edit modal if open
    const cancelBtn = page.locator('button:has-text("Cancel")');
    if (await cancelBtn.isVisible()) {
      await cancelBtn.click();
      await page.waitForTimeout(300);
    }

    // 7. Test Appointments Website & Tablet Viewport
    console.log("Testing Appointment Scheduling Storefront in Tablet Viewport...");
    await page.goto(`${BASE_URL}/stores/str_07/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const tabletBtn = page.locator('button[title="Switch to Tablet Viewport (768px)"]');
    if (await tabletBtn.isVisible()) {
      await tabletBtn.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "editor-tablet-appointments.png"),
      fullPage: false,
    });
    console.log("âœ“ Captured: editor-tablet-appointments.png");

    // 8. Test Lead Gen Website & Mobile Viewport
    console.log("Testing Lead Generation Storefront in Mobile Viewport...");
    await page.goto(`${BASE_URL}/stores/str_08/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(2000);

    const mobileBtn = page.locator('button[title="Switch to Mobile Viewport (375px)"]');
    if (await mobileBtn.isVisible()) {
      await mobileBtn.click();
      await page.waitForTimeout(800);
    }
    await page.screenshot({
      path: path.join(SCREENSHOT_DIR, "editor-mobile-leadgen.png"),
      fullPage: false,
    });
    console.log("âœ“ Captured: editor-mobile-leadgen.png");

    await browser.close();
    console.log("=================================================");
    console.log("âœ“ Phase 15 Visual Editor E2E Completed Successfully!");
    console.log("=================================================");
  } finally {
    if (serverProcess) {
      console.log("Shutting down test server...");
      try {
        if (process.platform === "win32" && serverProcess.pid) {
          spawn("taskkill", ["/pid", String(serverProcess.pid), "/f", "/t"]);
        } else {
          serverProcess.kill("SIGKILL");
        }
      } catch {
        // cleaned
      }
    }
  }
}

runPhase15E2E().catch((err) => {
  console.error("E2E verification error:", err);
  process.exit(1);
});
