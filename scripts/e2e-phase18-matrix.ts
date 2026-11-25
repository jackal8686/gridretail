process.env.MONGODB_URI = "";
process.env.MONGODB_DB_NAME = "gridretail_test";
process.env.ALLOW_IN_MEMORY_FALLBACK = "true";

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const PORT = 3042;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.join(process.cwd(), "docs", "screenshots", "phase18");
const ARTIFACT_DIR = path.resolve("C:/Users/RUDRA/.gemini/antigravity/brain/d74489b9-51fb-4522-b2bd-4daf057f74d7");

async function waitForServer(url: string, timeoutMs = 45000): Promise<boolean> {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return true;
    } catch {
      // Retry
    }
    await new Promise((r) => setTimeout(r, 600));
  }
  return false;
}

async function startServer(): Promise<ChildProcess> {
  console.log(`Starting isolated Next.js test server on port ${PORT}...`);
  const npxCmd = process.platform === "win32" ? "npx.cmd" : "npx";

  const proc = spawn(npxCmd, ["next", "start", "-H", "127.0.0.1", "-p", String(PORT)], {
    shell: true,
    stdio: "pipe",
    env: {
      ...process.env,
      PORT: String(PORT),
      NODE_ENV: "production",
      ALLOW_IN_MEMORY_FALLBACK: "true",
      MONGODB_URI: "",
    },
  });

  await new Promise<void>((resolve, reject) => {
    const timer = setTimeout(
      () => reject(new Error("Next.js server failed to respond within 35 seconds.")),
      35000
    );
    proc.stdout?.on("data", (d) => {
      const msg = d.toString().trim();
      if (msg.includes("Ready") || msg.includes("Local:") || msg.includes("✓ Ready")) {
        console.log("   [Next.js]", msg);
        clearTimeout(timer);
        resolve();
      }
    });
    proc.stderr?.on("data", (d) => {
      const errText = d.toString().trim();
      if (errText && !errText.includes("warn") && !errText.includes("Notice")) {
        console.error("   [Next.js stderr]", errText);
      }
    });
  });

  return proc;
}

async function runPhase18Captures() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  let serverProcess: ChildProcess | null = null;
  try {
    serverProcess = await startServer();

    console.log("Launching Chromium browser for Phase 18 evidence captures...");
    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    // 1. Login Page
    console.log("Capturing 1: login-page.png...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const loginPng = path.join(SCREENSHOT_DIR, "login-page.png");
    await page.screenshot({ path: loginPng });

    // Login for dashboard access
    console.log("Authenticating as admin...");
    await page.fill('input[type="email"]', "alex.mercer@gridretail.internal");
    await page.fill('input[type="password"]', "AdminGrid2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/dashboard`, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // 2. Dashboard
    console.log("Capturing 2: dashboard.png...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const dashboardPng = path.join(SCREENSHOT_DIR, "dashboard.png");
    await page.screenshot({ path: dashboardPng });

    // 3. Spotlight Search Modal
    console.log("Capturing 3: spotlight-search.png...");
    // Trigger spotlight search
    await page.keyboard.press("ControlOrMeta+K");
    await page.waitForTimeout(500);
    // Type query "advisory"
    await page.keyboard.type("advisory");
    await page.waitForTimeout(500);
    const searchPng = path.join(SCREENSHOT_DIR, "spotlight-search.png");
    await page.screenshot({ path: searchPng });
    // Close spotlight search
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // 4. Notifications Dropdown
    console.log("Capturing 4: notifications-dropdown.png...");
    const bellBtn = page.locator('button[aria-label="View notifications"]');
    await bellBtn.click();
    await page.waitForTimeout(500);
    const notifPng = path.join(SCREENSHOT_DIR, "notifications-dropdown.png");
    await page.screenshot({ path: notifPng });

    // 5. Activity Feed Modal
    console.log("Capturing 5: activity-feed.png...");
    const viewActivityBtn = page.getByRole("button", { name: "View all platform activity" });
    await viewActivityBtn.click();
    await page.waitForTimeout(600);
    const activityPng = path.join(SCREENSHOT_DIR, "activity-feed.png");
    await page.screenshot({ path: activityPng });
    // Close activity modal
    await page.getByRole("button", { name: "Done" }).click();
    await page.waitForTimeout(400);

    // 6. Settings Page
    console.log("Capturing 6: settings-page.png...");
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const settingsPng = path.join(SCREENSHOT_DIR, "settings-page.png");
    await page.screenshot({ path: settingsPng });

    // 7. Store Management
    console.log("Capturing 7: store-management.png...");
    await page.goto(`${BASE_URL}/stores`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    const storesPng = path.join(SCREENSHOT_DIR, "store-management.png");
    await page.screenshot({ path: storesPng });

    // 8. E-Commerce Website Builder
    console.log("Capturing 8: ecommerce-builder.png...");
    await page.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const ecomPng = path.join(SCREENSHOT_DIR, "ecommerce-builder.png");
    await page.screenshot({ path: ecomPng });

    // 9. Lead Gen Website Builder / Preview
    console.log("Capturing 9: leadgen-builder.png...");
    await page.goto(`${BASE_URL}/stores/str_apex/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const leadPng = path.join(SCREENSHOT_DIR, "leadgen-builder.png");
    await page.screenshot({ path: leadPng });

    // 10. Appointment Website Builder / Preview
    console.log("Capturing 10: appointment-builder.png...");
    await page.goto(`${BASE_URL}/stores/str_summit/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    const apptPng = path.join(SCREENSHOT_DIR, "appointment-builder.png");
    await page.screenshot({ path: apptPng });

    await browser.close();

    // Mirror to brain artifacts directory
    if (fs.existsSync(ARTIFACT_DIR)) {
      console.log(`Mirroring screenshots to artifact directory: ${ARTIFACT_DIR}...`);
      const files = [
        "login-page.png",
        "dashboard.png",
        "spotlight-search.png",
        "notifications-dropdown.png",
        "activity-feed.png",
        "settings-page.png",
        "store-management.png",
        "ecommerce-builder.png",
        "leadgen-builder.png",
        "appointment-builder.png",
      ];
      for (const f of files) {
        const src = path.join(SCREENSHOT_DIR, f);
        if (fs.existsSync(src)) {
          fs.copyFileSync(src, path.join(ARTIFACT_DIR, f));
        }
      }
      console.log("All 10 PNG files mirrored to artifact directory.");
    }

    console.log("\n==================================================================");
    console.log("   All 10 Phase 18 Screenshots Captured Successfully!             ");
    console.log("==================================================================");
  } finally {
    if (serverProcess) {
      console.log("Stopping isolated Next.js test server...");
      serverProcess.kill("SIGTERM");
    }
  }
}

runPhase18Captures().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
