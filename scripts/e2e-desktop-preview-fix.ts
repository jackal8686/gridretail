process.env.MONGODB_URI = "";
process.env.MONGODB_DB_NAME = "gridretail_test";
process.env.ALLOW_IN_MEMORY_FALLBACK = "true";

import { chromium, Browser, Page } from "playwright";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const PORT = 3054;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.join(process.cwd(), "docs", "screenshots", "desktop-preview-fix");
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

async function capture(page: Page, filename: string) {
  const targetPath = path.join(SCREENSHOT_DIR, filename);
  await page.screenshot({ path: targetPath, fullPage: false });
  console.log(`   [Captured] ${filename}`);

  try {
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    fs.copyFileSync(targetPath, artifactPath);
  } catch {
    // Artifact mirror non-blocking
  }
}

async function runDesktopPreviewVerification() {
  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  let serverProc: ChildProcess | null = null;
  let browser: Browser | null = null;

  try {
    serverProc = await startServer();
    browser = await chromium.launch({
      headless: true,
      args: ["--no-sandbox", "--disable-setuid-sandbox"],
    });

    console.log("\n========================================================");
    console.log("VISUAL EDITOR DESKTOP PREVIEW FIX VERIFICATION SUITE");
    console.log("========================================================\n");

    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await desktopContext.newPage();

    // Login
    console.log("1. Authenticating as Administrator...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await page.fill('input[type="email"]', "alex.mercer@gridretail.internal");
    await page.fill('input[type="password"]', "AdminGrid2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("   Authenticated successfully.");

    // Open store visual editor for str_01
    console.log("2. Navigating to Visual Editor for Store str_01...");
    await page.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(3000);

    // 1. Desktop Preview Fully Rendered
    console.log("3. Capturing Desktop Preview (01-desktop-preview-rendered.png)...");
    await capture(page, "01-desktop-preview-rendered.png");

    // 2. Switch to Tablet View
    console.log("4. Switching to Tablet Preview (02-tablet-preview-rendered.png)...");
    const tabletBtn = page.locator('button[aria-label="Tablet View"]');
    await tabletBtn.click();
    await page.waitForTimeout(1000);
    await capture(page, "02-tablet-preview-rendered.png");

    // 3. Switch to Mobile View
    console.log("5. Switching to Mobile Preview (03-mobile-preview-rendered.png)...");
    const mobileBtn = page.locator('button[aria-label="Mobile View"]');
    await mobileBtn.click();
    await page.waitForTimeout(1000);
    await capture(page, "03-mobile-preview-rendered.png");

    // 4. Switch from Tablet to Desktop
    console.log("6. Switching from Tablet to Desktop (04-tablet-to-desktop.png)...");
    await tabletBtn.click();
    await page.waitForTimeout(600);
    const desktopBtn = page.locator('button[aria-label="Desktop View"]');
    await desktopBtn.click();
    await page.waitForTimeout(1000);
    await capture(page, "04-tablet-to-desktop.png");

    // 5. Switch from Mobile to Desktop
    console.log("7. Switching from Mobile to Desktop (05-mobile-to-desktop.png)...");
    await mobileBtn.click();
    await page.waitForTimeout(600);
    await desktopBtn.click();
    await page.waitForTimeout(1000);
    await capture(page, "05-mobile-to-desktop.png");

    // 6. Theme Change in Desktop View
    console.log("8. Testing Theme Change in Desktop View (06-desktop-theme-change.png)...");
    const stylingTab = page.locator('button:has-text("Styling")');
    if (await stylingTab.isVisible()) {
      await stylingTab.click();
      await page.waitForTimeout(600);
      const themeCard = page.locator('button:has-text("Obsidian Slate"), button:has-text("Warm Terracotta")').first();
      if (await themeCard.isVisible()) {
        await themeCard.click();
        await page.waitForTimeout(1200);
      }
    }
    await capture(page, "06-desktop-theme-change.png");

    // 7. Section Edit in Desktop View
    console.log("9. Testing Section Edit in Desktop View (07-desktop-section-edit.png)...");
    const layersTab = page.locator('button:has-text("Layers")');
    if (await layersTab.isVisible()) {
      await layersTab.click();
      await page.waitForTimeout(600);
    }
    const firstSection = page.locator('[data-testid^="layer-item-"]').first();
    if (await firstSection.isVisible()) {
      await firstSection.click();
      await page.waitForTimeout(600);
    }
    await capture(page, "07-desktop-section-edit.png");

    console.log("\n========================================================");
    console.log("ALL 7 VERIFICATION SCREENSHOTS SUCCESSFULLY CAPTURED!");
    console.log("========================================================\n");
  } finally {
    if (browser) {
      await browser.close();
    }
    if (serverProc) {
      console.log("Stopping test server...");
      if (process.platform === "win32") {
        spawn("taskkill", ["/pid", String(serverProc.pid), "/f", "/t"]);
      } else {
        serverProc.kill("SIGTERM");
      }
    }
  }
}

runDesktopPreviewVerification().catch((err) => {
  console.error("Verification failed:", err);
  process.exit(1);
});
