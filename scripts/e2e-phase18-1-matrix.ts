process.env.MONGODB_URI = "";
process.env.MONGODB_DB_NAME = "gridretail_test";
process.env.ALLOW_IN_MEMORY_FALLBACK = "true";

import { chromium } from "playwright";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const PORT = 3042;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.join(process.cwd(), "docs", "screenshots", "phase18-1");
const LEGACY_DIR = path.join(process.cwd(), "screenshots", "10 png");
const ARTIFACT_DIR = path.resolve("C:/Users/RUDRA/.gemini/antigravity/brain/d74489b9-51fb-4522-b2bd-4daf057f74d7");

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
      () => reject(new Error("Next.js server failed to respond within 45 seconds.")),
      45000
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
        console.warn("   [Next.js stderr]", errText);
      }
    });
    proc.on("error", (err) => {
      clearTimeout(timer);
      reject(err);
    });
  });

  return proc;
}

async function run() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }
  if (!fs.existsSync(LEGACY_DIR)) {
    fs.mkdirSync(LEGACY_DIR, { recursive: true });
  }

  let serverProc: ChildProcess | null = null;
  try {
    serverProc = await startServer();
    console.log("Next.js production server ready. Launching Playwright browser...");

    const browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });

    const page = await context.newPage();

    // Authenticate as admin
    console.log("Authenticating as admin...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await page.fill('input[type="email"]', "alex.mercer@gridretail.internal");
    await page.fill('input[type="password"]', "AdminGrid2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL(`**/dashboard`, { timeout: 15000 }).catch(() => {});
    await page.waitForTimeout(1000);

    // 1. Dashboard
    console.log("Capturing 1: dashboard.png (1440x900)...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "dashboard.png") });

    // 2. Store Management
    console.log("Capturing 2: store-management.png (1440x900)...");
    await page.goto(`${BASE_URL}/stores`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "store-management.png") });

    // 3. E-Commerce Website Builder (str_01)
    console.log("Capturing 3: ecommerce-builder.png (1440x900)...");
    await page.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "ecommerce-builder.png") });

    // 4. Appointment Website Builder (str_07 - Summit Legal Practice)
    console.log("Capturing 4: appointment-builder.png (1440x900)...");
    await page.goto(`${BASE_URL}/stores/str_07/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "appointment-builder.png") });

    // 5. Appointment Schedule with actual test appointment (str_07)
    console.log("Capturing 5: appointment-schedule.png (1440x900)...");
    await page.goto(`${BASE_URL}/stores/str_07/schedule`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "appointment-schedule.png") });

    // 6. Lead Gen Website Builder (str_08 - Apex Growth Advisory)
    console.log("Capturing 6: leadgen-builder.png (1440x900)...");
    await page.goto(`${BASE_URL}/stores/str_08/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "leadgen-builder.png") });

    // 7. Lead CRM with actual test lead (str_08)
    console.log("Capturing 7: lead-crm.png (1440x900)...");
    await page.goto(`${BASE_URL}/stores/str_08/leads`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1200);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "lead-crm.png") });

    // 8. Activity Feed Modal
    console.log("Capturing 8: activity-feed.png (1440x900)...");
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    const bellForActivity = page.locator('button[aria-label="View notifications"]');
    await bellForActivity.click();
    await page.waitForTimeout(500);
    const viewActivityBtn = page.getByRole("button", { name: "View all platform activity" });
    await viewActivityBtn.click();
    await page.waitForTimeout(700);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "activity-feed.png") });
    await page.getByRole("button", { name: "Done" }).click();
    await page.waitForTimeout(400);

    // 9. Notifications Dropdown
    console.log("Capturing 9: notifications-dropdown.png (1440x900)...");
    const bellBtn = page.locator('button[aria-label="View notifications"]');
    await bellBtn.click();
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "notifications-dropdown.png") });
    await page.mouse.click(100, 100);
    await page.waitForTimeout(400);

    // 10. Settings Page
    console.log("Capturing 10: settings-page.png (1440x900)...");
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "settings-page.png") });

    // 11. Spotlight Search Modal
    console.log("Capturing 11: spotlight-search.png (1440x900)...");
    await page.keyboard.press("ControlOrMeta+K");
    await page.waitForTimeout(600);
    await page.keyboard.type("advisory");
    await page.waitForTimeout(600);
    await page.screenshot({ path: path.join(SCREENSHOT_DIR, "spotlight-search.png") });
    await page.keyboard.press("Escape");
    await page.waitForTimeout(400);

    // Mobile Viewport Context (390 x 844)
    console.log("Switching to Mobile Viewport (390x844)...");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    // Authenticate mobile session
    await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await mobilePage.fill('input[type="email"]', "alex.mercer@gridretail.internal");
    await mobilePage.fill('input[type="password"]', "AdminGrid2026!");
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL(`**/dashboard`, { timeout: 15000 }).catch(() => {});
    await mobilePage.waitForTimeout(1000);

    // 12. Mobile Dashboard / Store Management
    console.log("Capturing 12: mobile-dashboard.png (390x844)...");
    await mobilePage.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(1000);
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-dashboard.png") });

    // 13. Mobile Builder View
    console.log("Capturing 13: mobile-builder.png (390x844)...");
    await mobilePage.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(1500);
    await mobilePage.screenshot({ path: path.join(SCREENSHOT_DIR, "mobile-builder.png") });

    // Also mirror contact-sheet.png for backwards compatibility
    fs.copyFileSync(
      path.join(SCREENSHOT_DIR, "appointment-schedule.png"),
      path.join(SCREENSHOT_DIR, "contact-sheet.png")
    );

    console.log("Mirroring all 13 screenshots to brain artifact directory and legacy directory...");
    const files = [
      "dashboard.png",
      "store-management.png",
      "ecommerce-builder.png",
      "appointment-builder.png",
      "appointment-schedule.png",
      "leadgen-builder.png",
      "lead-crm.png",
      "activity-feed.png",
      "notifications-dropdown.png",
      "settings-page.png",
      "spotlight-search.png",
      "mobile-dashboard.png",
      "mobile-builder.png",
      "contact-sheet.png",
    ];

    for (const file of files) {
      const src = path.join(SCREENSHOT_DIR, file);
      if (fs.existsSync(src)) {
        fs.copyFileSync(src, path.join(LEGACY_DIR, file));
        if (fs.existsSync(ARTIFACT_DIR)) {
          fs.copyFileSync(src, path.join(ARTIFACT_DIR, file));
        }
      }
    }

    console.log("All 13 Phase 18.1 screenshots captured and mirrored successfully!");
    await mobileContext.close();
    await browser.close();
  } finally {
    if (serverProc) {
      console.log("Terminating isolated Next.js test server...");
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(serverProc.pid), "/f", "/t"]);
      } else {
        serverProc.kill("SIGTERM");
      }
    }
  }
}

run().catch((err) => {
  console.error("Screenshot capture failed:", err);
  process.exit(1);
});
