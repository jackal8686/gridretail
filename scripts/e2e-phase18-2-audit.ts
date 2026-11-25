process.env.MONGODB_URI = "";
process.env.MONGODB_DB_NAME = "gridretail_test";
process.env.ALLOW_IN_MEMORY_FALLBACK = "true";

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const PORT = 3042;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.join(process.cwd(), "docs", "screenshots", "phase18-2");
const ARTIFACT_DIR = path.resolve("C:/Users/RUDRA/.gemini/antigravity/brain/d74489b9-51fb-4522-b2bd-4daf057f74d7");

interface AuditFinding {
  id: string;
  module: string;
  feature: string;
  expected: string;
  actual: string;
  repro: string;
  severity: "P0" | "P1" | "P2" | "P3";
  implState: "Fully functional" | "Partially functional" | "UI only / no working backend" | "Mock or hardcoded implementation" | "Broken" | "Not implemented" | "Unable to verify";
  evidence: string;
  suggestedFix: string;
}

const auditFindings: AuditFinding[] = [];
const consoleErrors: { url: string; error: string }[] = [];
const failedRequests: { url: string; status: number; method: string }[] = [];

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
  console.log(`[Screenshot Captured] ${filename}`);

  // Mirror to artifact directory
  try {
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    fs.copyFileSync(targetPath, artifactPath);
  } catch (err) {
    // Artifact mirror non-blocking
  }
}

async function setupPageListeners(page: Page) {
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      consoleErrors.push({ url: page.url(), error: msg.text() });
    }
  });
  page.on("response", (res) => {
    if (res.status() >= 400 && !res.url().includes("favicon")) {
      failedRequests.push({ url: res.url(), status: res.status(), method: res.request().method() });
    }
  });
}

async function runAudit() {
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

    // 1. Authenticated Context
    const context = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await context.newPage();
    await setupPageListeners(page);

    // Login
    console.log("1. Authenticating as admin...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await capture(page, "01-login-screen.png");

    await page.fill('input[type="email"]', "alex.mercer@gridretail.internal");
    await page.fill('input[type="password"]', "AdminGrid2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("   Logged in successfully.");

    // 2. Dashboard Audit
    console.log("2. Auditing Dashboard...");
    await page.waitForSelector('[aria-label="Key Performance Indicators"]');
    await capture(page, "02-dashboard-desktop.png");

    // Test Empty State toggle
    const toggleBtn = page.getByRole("button", { name: /Preview Empty State/i });
    if (await toggleBtn.isVisible()) {
      await toggleBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "03-dashboard-empty-state.png");
      const restoreBtn = page.getByRole("button", { name: /Show Populated Workspace/i });
      await restoreBtn.click();
      await page.waitForTimeout(400);
    }

    // Test Notification Bell
    console.log("   Testing Header Notifications...");
    const bellBtn = page.getByRole("button", { name: /View notifications/i });
    await bellBtn.click();
    await page.waitForTimeout(300);
    await capture(page, "04-notifications-dropdown-open.png");

    const markAllReadBtn = page.getByRole("button", { name: /Mark all read/i });
    if (await markAllReadBtn.isVisible()) {
      await markAllReadBtn.click();
      await page.waitForTimeout(300);
      await capture(page, "05-notifications-all-read.png");
    }

    // Test Activity Drawer Modal
    console.log("   Testing Platform Activity Drawer...");
    const viewAllActBtn = page.getByRole("button", { name: /View all platform activity/i });
    if (await viewAllActBtn.isVisible()) {
      await viewAllActBtn.click();
      await page.waitForTimeout(500);
      await capture(page, "06-activity-drawer-modal.png");
      const closeActBtn = page.getByRole("button", { name: "Close" }).or(page.locator("button:has-text('Close')")).first();
      if (await closeActBtn.isVisible()) await closeActBtn.click();
      await page.waitForTimeout(300);
    }

    // Test Spotlight Search (Cmd+K)
    console.log("   Testing Spotlight Command Palette...");
    await page.keyboard.press("Control+K");
    await page.waitForTimeout(400);
    const spotlightInput = page.getByPlaceholder(/Type a command or search/i).or(page.locator("input[placeholder*='search']")).first();
    if (await spotlightInput.isVisible()) {
      await capture(page, "07-spotlight-search-open.png");
      // Search for store name
      await spotlightInput.fill("Aura");
      await page.waitForTimeout(500);
      await capture(page, "08-spotlight-search-store-query.png");
      await page.keyboard.press("Escape");
      await page.waitForTimeout(300);
    }

    // 3. Store Management Audit
    console.log("3. Auditing Store Management Directory...");
    await page.goto(`${BASE_URL}/stores`, { waitUntil: "networkidle" });
    await capture(page, "09-stores-directory.png");

    // Test Search input on stores
    const storeSearchInput = page.getByPlaceholder(/Search by store name/i);
    await storeSearchInput.fill("Summit");
    await page.waitForTimeout(300);
    await capture(page, "10-stores-filtered-summit.png");
    await storeSearchInput.fill("");

    // 4. Template Library Audit
    console.log("4. Auditing Template Library...");
    await page.goto(`${BASE_URL}/templates`, { waitUntil: "networkidle" });
    await capture(page, "11-templates-catalog.png");

    // Click Themes Tab
    const themesTabBtn = page.getByRole("button", { name: /Colour Themes/i });
    if (await themesTabBtn.isVisible()) {
      await themesTabBtn.click();
      await page.waitForTimeout(300);
      await capture(page, "12-templates-themes-tab.png");
    }

    // Click Preview Layout on first template
    const templatesTabBtn = page.getByRole("button", { name: /Design Templates/i });
    if (await templatesTabBtn.isVisible()) {
      await templatesTabBtn.click();
      await page.waitForTimeout(300);
      const previewLayoutBtn = page.getByRole("button", { name: /Preview Layout/i }).first();
      if (await previewLayoutBtn.isVisible()) {
        await previewLayoutBtn.click();
        await page.waitForTimeout(500);
        await capture(page, "13-template-preview-modal.png");
        const closeModalBtn = page.getByRole("button", { name: "Close" }).or(page.locator("button:has-text('✕')")).first();
        if (await closeModalBtn.isVisible()) await closeModalBtn.click();
      }
    }

    // 5. Advanced Visual Editor Audit (str_01 Aura Minimalist)
    console.log("5. Auditing Visual Editor (E-Commerce)...");
    await page.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1000);
    await capture(page, "14-visual-editor-desktop.png");

    // Test Viewport switching
    const tabletViewportBtn = page.getByRole("button", { name: /Tablet/i });
    if (await tabletViewportBtn.isVisible()) {
      await tabletViewportBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "15-visual-editor-tablet-mode.png");
    }

    const mobileViewportBtn = page.getByRole("button", { name: /Mobile/i });
    if (await mobileViewportBtn.isVisible()) {
      await mobileViewportBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "16-visual-editor-mobile-mode.png");
    }

    // Restore Desktop mode
    const desktopViewportBtn = page.getByRole("button", { name: /Desktop/i });
    if (await desktopViewportBtn.isVisible()) {
      await desktopViewportBtn.click();
      await page.waitForTimeout(400);
    }

    // Test Left Panel Tabs
    const addSectionTab = page.getByRole("button", { name: /Add Section/i }).or(page.locator("button[title*='Add Section']")).first();
    if (await addSectionTab.isVisible()) {
      await addSectionTab.click();
      await page.waitForTimeout(300);
      await capture(page, "17-editor-add-section-panel.png");
    }

    const stylingTab = page.getByRole("button", { name: /Styling/i }).or(page.locator("button[title*='Theme & Design']")).first();
    if (await stylingTab.isVisible()) {
      await stylingTab.click();
      await page.waitForTimeout(300);
      await capture(page, "18-editor-styling-panel.png");
    }

    const layersTab = page.getByRole("button", { name: /Layers/i }).or(page.locator("button[title*='Layers']")).first();
    if (await layersTab.isVisible()) {
      await layersTab.click();
      await page.waitForTimeout(300);
    }

    // 6. Products Catalog Audit
    console.log("6. Auditing Products Catalog...");
    await page.goto(`${BASE_URL}/products`, { waitUntil: "networkidle" });
    await capture(page, "19-products-catalog-page.png");

    const addProductBtn = page.getByRole("button", { name: /Add Product SKU/i });
    if (await addProductBtn.isVisible()) {
      await addProductBtn.click();
      await page.waitForTimeout(300);
      await capture(page, "20-add-product-placeholder-modal.png");
      const closeProdModal = page.getByRole("button", { name: /Close/i }).first();
      if (await closeProdModal.isVisible()) await closeProdModal.click();
    }

    // 7. Clients Roster Audit
    console.log("7. Auditing Clients Roster...");
    await page.goto(`${BASE_URL}/clients`, { waitUntil: "networkidle" });
    await capture(page, "21-clients-page.png");

    const addClientBtn = page.getByRole("button", { name: /Add Client Account/i });
    if (await addClientBtn.isVisible()) {
      await addClientBtn.click();
      await page.waitForTimeout(300);
      await capture(page, "22-add-client-placeholder-modal.png");
      const closeClientModal = page.getByRole("button", { name: /Close/i }).first();
      if (await closeClientModal.isVisible()) await closeClientModal.click();
    }

    // 8. Appointment Schedule Audit (str_07 Summit Legal)
    console.log("8. Auditing Appointment Scheduling...");
    await page.goto(`${BASE_URL}/stores/str_07/schedule`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await capture(page, "23-appointment-schedule-page.png");

    // Click Calendar View
    const calViewBtn = page.getByRole("button", { name: /Calendar/i });
    if (await calViewBtn.isVisible()) {
      await calViewBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "24-appointment-calendar-view.png");
    }

    // 9. Lead CRM Audit (str_08 Apex Growth)
    console.log("9. Auditing Lead CRM...");
    await page.goto(`${BASE_URL}/stores/str_08/leads`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await capture(page, "25-lead-crm-kanban.png");

    // Click Table View
    const tableViewBtn = page.getByRole("button", { name: /Table/i }).or(page.locator("button:has-text('Table')")).first();
    if (await tableViewBtn.isVisible()) {
      await tableViewBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "26-lead-crm-table-view.png");
    }

    // 10. Platform Settings Audit
    console.log("10. Auditing Platform Settings...");
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
    await capture(page, "27-settings-general-tab.png");

    const accountTabBtn = page.getByRole("button", { name: /Account Profile/i });
    if (await accountTabBtn.isVisible()) {
      await accountTabBtn.click();
      await page.waitForTimeout(300);
      await capture(page, "28-settings-account-tab.png");
    }

    const teamTabBtn = page.getByRole("button", { name: /Team & Security/i });
    if (await teamTabBtn.isVisible()) {
      await teamTabBtn.click();
      await page.waitForTimeout(500);
      await capture(page, "29-settings-team-tab.png");
    }

    const notifTabBtn = page.getByRole("button", { name: "Notifications", exact: true });
    if (await notifTabBtn.isVisible()) {
      await notifTabBtn.click();
      await page.waitForTimeout(300);
      await capture(page, "30-settings-notifications-tab.png");
    }

    // 11. Presentation Deck Audit (Summit Legal)
    console.log("11. Auditing Client Presentation Mode...");
    await page.goto(`${BASE_URL}/stores/str_07/present`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await capture(page, "31-present-slide-1.png");

    const nextSlideBtn = page.getByRole("button", { name: /Next/i });
    if (await nextSlideBtn.isVisible()) {
      await nextSlideBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "32-present-slide-2-catalog-leakage.png");

      await nextSlideBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "33-present-slide-3-courier-returns.png");
    }

    // 12. Public Storefronts Verification
    console.log("12. Auditing Public Storefronts & Cart/Checkout...");
    // Aura Minimalist (E-Commerce)
    await page.goto(`${BASE_URL}/store/aura-minimalist`, { waitUntil: "networkidle" });
    await capture(page, "34-storefront-ecommerce.png");

    // Summit Legal (Appointments)
    await page.goto(`${BASE_URL}/store/summit-legal`, { waitUntil: "networkidle" });
    await capture(page, "35-storefront-appointments.png");

    // Apex Growth (Lead Gen)
    await page.goto(`${BASE_URL}/store/apex-growth`, { waitUntil: "networkidle" });
    await capture(page, "36-storefront-lead-gen.png");

    // 13. Responsive Tablet & Mobile Audits
    console.log("13. Auditing Tablet (768x1024) and Mobile (390x844)...");
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await capture(page, "37-tablet-dashboard-768.png");
    await page.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await capture(page, "38-tablet-editor-768.png");

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(`${BASE_URL}/dashboard`, { waitUntil: "networkidle" });
    await capture(page, "39-mobile-dashboard-390.png");
    await page.goto(`${BASE_URL}/stores`, { waitUntil: "networkidle" });
    await capture(page, "40-mobile-stores-390.png");
    await page.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await capture(page, "41-mobile-editor-390.png");

    // Restore Desktop
    await page.setViewportSize({ width: 1440, height: 900 });

    await context.close();
    console.log("All interactive audits completed successfully!");

    console.log("\n=== CONSOLE ERRORS DETECTED ===");
    console.log(consoleErrors.length > 0 ? consoleErrors : "None");

    console.log("\n=== FAILED HTTP REQUESTS (>= 400) ===");
    console.log(failedRequests.length > 0 ? failedRequests : "None");

  } finally {
    if (browser) await browser.close();
    if (serverProc) {
      console.log("Stopping Next.js server...");
      serverProc.kill("SIGINT");
    }
  }
}

runAudit().catch((err) => {
  console.error("FATAL in runAudit:", err);
  process.exit(1);
});
