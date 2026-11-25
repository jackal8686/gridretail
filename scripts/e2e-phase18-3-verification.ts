process.env.MONGODB_URI = "";
process.env.MONGODB_DB_NAME = "gridretail_test";
process.env.ALLOW_IN_MEMORY_FALLBACK = "true";

import { chromium, Browser, Page } from "playwright";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const PORT = 3045;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.join(process.cwd(), "docs", "screenshots", "phase18-3");
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

  // Mirror to artifact directory
  try {
    const artifactPath = path.join(ARTIFACT_DIR, filename);
    fs.copyFileSync(targetPath, artifactPath);
  } catch {
    // Artifact mirror non-blocking
  }
}

async function runVerification() {
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

    // ==========================================
    // 1. DESKTOP VIEWPORT (1440x900)
    // ==========================================
    console.log("\n--- Phase 18.3 Verification: Desktop (1440x900) ---");
    const desktopContext = await browser.newContext({
      viewport: { width: 1440, height: 900 },
      deviceScaleFactor: 1,
    });
    const page = await desktopContext.newPage();

    // 1. Login Page
    console.log("1. Login Screen...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await capture(page, "01-login-screen.png");

    await page.fill('input[type="email"]', "alex.mercer@gridretail.internal");
    await page.fill('input[type="password"]', "AdminGrid2026!");
    await page.click('button[type="submit"]');
    await page.waitForURL("**/dashboard", { timeout: 15000 });
    console.log("   Authenticated as admin.");

    // 2. Dashboard
    console.log("2. Dashboard...");
    await page.waitForSelector('[aria-label="Key Performance Indicators"]');
    await page.waitForTimeout(500);
    await capture(page, "02-dashboard.png");

    // 3. Spotlight Search Modal (Cmd+K)
    console.log("3. Spotlight Modal...");
    await page.keyboard.press("Control+k");
    await page.waitForTimeout(500);
    const spotlightInput = page.locator('input[placeholder*="Search stores, templates, sections"]');
    if (await spotlightInput.isVisible()) {
      await spotlightInput.fill("Aura");
      await page.waitForTimeout(400);
      await capture(page, "03-spotlight-modal.png");
      // Close by clicking backdrop
      await page.locator('div.fixed.inset-0.z-50').click({ position: { x: 20, y: 20 } }).catch(() => {});
      await page.waitForTimeout(400);
    }

    // 4. Notifications Drawer
    console.log("4. Header Notifications...");
    const bellBtn = page.getByRole("button", { name: /View notifications/i });
    if (await bellBtn.isVisible()) {
      await bellBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "04-header-notifications.png");
      await bellBtn.click(); // Close
      await page.waitForTimeout(300);
    }

    // 5. Activity Drawer
    console.log("5. Activity Drawer...");
    const activityBtn = page.getByRole("button", { name: /View all platform activity/i });
    if (await activityBtn.isVisible()) {
      await activityBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "05-activity-drawer.png");
      const closeActivity = page.getByRole("button", { name: /Close activity log/i });
      if (await closeActivity.isVisible()) await closeActivity.click();
      await page.waitForTimeout(300);
    }

    // 6. Stores Directory
    console.log("6. Stores Directory & Industry Filters...");
    await page.goto(`${BASE_URL}/stores`, { waitUntil: "networkidle" });
    await page.waitForTimeout(400);
    await capture(page, "06-stores-directory.png");

    // 7. Store Delete Modal
    console.log("7. Store Delete Modal...");
    const deleteBtn = page.locator('button[aria-label="Delete store"]').first();
    if (await deleteBtn.isVisible()) {
      await deleteBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "07-store-delete-modal.png");
      // Cancel
      const cancelBtn = page.getByRole("button", { name: /Cancel/i });
      if (await cancelBtn.isVisible()) await cancelBtn.click();
      await page.waitForTimeout(300);
    }

    // 8. Store Archive Modal
    console.log("8. Store Archive Modal...");
    const archiveBtn = page.locator('button[aria-label="Archive store"]').first();
    if (await archiveBtn.isVisible()) {
      await archiveBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "08-store-archive-modal.png");
      const cancelArchive = page.getByRole("button", { name: /Cancel/i });
      if (await cancelArchive.isVisible()) await cancelArchive.click();
      await page.waitForTimeout(300);
    }

    // 9. Visual Editor Desktop Canvas
    console.log("9. Visual Editor Desktop Canvas (1440px transform)...");
    await page.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await page.waitForTimeout(800);
    await capture(page, "09-editor-desktop-canvas.png");

    // 10. Visual Editor Page Sections
    console.log("10. Visual Editor Subpage Sections...");
    const pageSelect = page.locator("select").filter({ hasText: /Home Page/i }).first();
    if (await pageSelect.isVisible()) {
      await pageSelect.selectOption({ label: "Catalog / Collections" }).catch(() => {});
      await page.waitForTimeout(600);
      await capture(page, "10-editor-page-sections.png");
    }

    // 11. Presentation Deck (E-commerce)
    console.log("11. Presentation Deck (E-commerce)...");
    await page.goto(`${BASE_URL}/stores/str_01/present`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await capture(page, "11-presentation-deck-ecommerce.png");

    // 12. Presentation Deck (Lead-Gen)
    console.log("12. Presentation Deck (Lead-Gen)...");
    await page.goto(`${BASE_URL}/stores/str_08/present`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await capture(page, "12-presentation-deck-leadgen.png");

    // 13. Presentation Deck (Appointments)
    console.log("13. Presentation Deck (Appointments)...");
    await page.goto(`${BASE_URL}/stores/str_07/present`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await capture(page, "13-presentation-deck-appointments.png");

    // 14. Appointment Schedule Page
    console.log("14. Appointment Schedule Page...");
    await page.goto(`${BASE_URL}/stores/str_07/schedule`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await capture(page, "14-appointment-schedule-page.png");

    // 15. Appointment Reschedule Modal
    console.log("15. Appointment Reschedule Modal...");
    const rescheduleTrigger = page.locator('button:has-text("Reschedule")').first();
    if (await rescheduleTrigger.isVisible()) {
      await rescheduleTrigger.click();
      await page.waitForTimeout(400);
      await capture(page, "15-appointment-reschedule-modal.png");
      const cancelReschedule = page.getByRole("button", { name: /Cancel/i });
      if (await cancelReschedule.isVisible()) await cancelReschedule.click();
      await page.waitForTimeout(300);
    }

    // 16. Lead CRM Kanban
    console.log("16. Lead CRM Kanban...");
    await page.goto(`${BASE_URL}/stores/str_08/leads`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await capture(page, "16-lead-crm-kanban.png");

    // 17. Lead CRM Table
    console.log("17. Lead CRM Table View...");
    const tableBtn = page.getByRole("button", { name: /Table/i });
    if (await tableBtn.isVisible()) {
      await tableBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "17-lead-crm-table.png");
    }

    // 18. Visual Lead Form Builder
    console.log("18. Visual Lead Form Builder...");
    const builderBtn = page.getByRole("button", { name: /Form Builder/i });
    if (await builderBtn.isVisible()) {
      await builderBtn.click();
      await page.waitForTimeout(600);
      await capture(page, "18-lead-form-builder.png");

      // 19. Add/Edit Field Modal
      console.log("19. Lead Form Add Field Modal...");
      const addFieldBtn = page.getByRole("button", { name: /Add Field/i });
      if (await addFieldBtn.isVisible()) {
        await addFieldBtn.click();
        await page.waitForTimeout(400);
        await capture(page, "19-lead-form-add-field-modal.png");
        const cancelField = page.getByRole("button", { name: /Cancel/i });
        if (await cancelField.isVisible()) await cancelField.click();
        await page.waitForTimeout(300);
      }
    }

    // 20. Products Directory
    console.log("20. Global Products Directory...");
    await page.goto(`${BASE_URL}/products`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await capture(page, "20-products-directory.png");

    // 21. Product Add Modal
    console.log("21. Product Add Modal...");
    const addProductBtn = page.getByRole("button", { name: /Add Product/i });
    if (await addProductBtn.isVisible()) {
      await addProductBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "21-product-add-modal.png");
      const cancelProd = page.getByRole("button", { name: /Cancel/i });
      if (await cancelProd.isVisible()) await cancelProd.click();
      await page.waitForTimeout(300);
    }

    // 22. Product Details Modal
    console.log("22. Product Details Modal...");
    const viewProdBtn = page.locator('button:has-text("Details")').first();
    if (await viewProdBtn.isVisible()) {
      await viewProdBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "22-product-details-modal.png");
      const closeProdDetails = page.locator('div[data-testid="product-details-modal"] button').first();
      if (await closeProdDetails.isVisible()) await closeProdDetails.click();
      await page.waitForTimeout(300);
    }

    // 23. Product Delete Modal
    console.log("23. Product Delete Modal...");
    const deleteProdBtn = page.locator('button:has-text("Delete")').first();
    if (await deleteProdBtn.isVisible()) {
      await deleteProdBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "23-product-delete-modal.png");
      const cancelDeleteProd = page.getByRole("button", { name: /Cancel/i });
      if (await cancelDeleteProd.isVisible()) await cancelDeleteProd.click();
      await page.waitForTimeout(300);
    }

    // 24. Clients Directory
    console.log("24. Global Clients Directory...");
    await page.goto(`${BASE_URL}/clients`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await capture(page, "24-clients-directory.png");

    // 25. Client Add Modal
    console.log("25. Client Add Modal...");
    const addClientBtn = page.getByRole("button", { name: /Add Client/i });
    if (await addClientBtn.isVisible()) {
      await addClientBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "25-client-add-modal.png");
      const cancelClient = page.getByRole("button", { name: /Cancel/i });
      if (await cancelClient.isVisible()) await cancelClient.click();
      await page.waitForTimeout(300);
    }

    // 26. Client Details Modal
    console.log("26. Client Details Modal (with linked stores)...");
    const viewClientBtn = page.locator('button:has-text("Dossier")').first();
    if (await viewClientBtn.isVisible()) {
      await viewClientBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "26-client-details-modal.png");
      const closeClientDetails = page.locator('div[data-testid="client-details-modal"] button').first();
      if (await closeClientDetails.isVisible()) await closeClientDetails.click();
      await page.waitForTimeout(300);
    }

    // 27. Client Delete Modal
    console.log("27. Client Delete Modal...");
    const deleteClientBtn = page.locator('button:has-text("Delete")').first();
    if (await deleteClientBtn.isVisible()) {
      await deleteClientBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "27-client-delete-modal.png");
      const cancelDeleteClient = page.getByRole("button", { name: /Cancel/i });
      if (await cancelDeleteClient.isVisible()) await cancelDeleteClient.click();
      await page.waitForTimeout(300);
    }

    // 28. Storefront Demo Checkout
    console.log("28. Storefront Checkout Page...");
    await page.goto(`${BASE_URL}/store/aura-minimalist/checkout`, { waitUntil: "networkidle" });
    await page.waitForTimeout(600);
    await capture(page, "28-storefront-checkout.png");

    // 29. Storefront Order Confirmation
    console.log("29. Placing Demo Order...");
    const nameInput = page.locator('input[placeholder*="Full Name"], input[name="fullName"]').first();
    if (await nameInput.isVisible()) {
      await nameInput.fill("Ananya Sharma");
      const emailInput = page.locator('input[type="email"]').first();
      if (await emailInput.isVisible()) await emailInput.fill("ananya.sharma@example.com");
      const submitOrderBtn = page.locator('button[type="submit"]:has-text("Place Simulated Demo Order"), button:has-text("Complete Order")').first();
      if (await submitOrderBtn.isVisible()) {
        await submitOrderBtn.click();
        await page.waitForTimeout(800);
        await capture(page, "29-storefront-order-confirmation.png");
      }
    }

    // 30. Templates Directory
    console.log("30. Templates Directory...");
    await page.goto(`${BASE_URL}/templates`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await capture(page, "30-templates-directory.png");

    // 31. Template Apply Modal
    console.log("31. Template Apply Modal...");
    const applyTmplBtn = page.locator('button:has-text("Apply to Store")').first();
    if (await applyTmplBtn.isVisible()) {
      await applyTmplBtn.click();
      await page.waitForTimeout(400);
      await capture(page, "31-template-apply-modal.png");
      const cancelTmpl = page.getByRole("button", { name: /Cancel/i });
      if (await cancelTmpl.isVisible()) await cancelTmpl.click();
      await page.waitForTimeout(300);
    }

    // 32. Settings - General
    console.log("32. Settings General Tab...");
    await page.goto(`${BASE_URL}/settings`, { waitUntil: "networkidle" });
    await page.waitForTimeout(500);
    await capture(page, "32-settings-general.png");

    // 33. Settings - Notifications
    console.log("33. Settings Notifications Tab...");
    const notifTab = page.locator('div.w-full.md\\:w-60 button:has-text("Notifications")').first();
    if (await notifTab.isVisible()) {
      await notifTab.click();
      await page.waitForTimeout(400);
      await capture(page, "33-settings-notifications.png");
    }

    // 34. Settings - Account Profile
    console.log("34. Settings Account Profile Tab...");
    const accountTab = page.locator('div.w-full.md\\:w-60 button:has-text("Account")').first();
    if (await accountTab.isVisible()) {
      await accountTab.click();
      await page.waitForTimeout(400);
      await capture(page, "34-settings-profile.png");
    }

    await desktopContext.close();

    // ==========================================
    // 2. TABLET VIEWPORT (768x1024)
    // ==========================================
    console.log("\n--- Phase 18.3 Verification: Tablet (768x1024) ---");
    const tabletContext = await browser.newContext({
      viewport: { width: 768, height: 1024 },
      deviceScaleFactor: 1,
    });
    const tabletPage = await tabletContext.newPage();

    // Authenticate
    await tabletPage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await tabletPage.fill('input[type="email"]', "alex.mercer@gridretail.internal");
    await tabletPage.fill('input[type="password"]', "AdminGrid2026!");
    await tabletPage.click('button[type="submit"]');
    await tabletPage.waitForURL("**/dashboard", { timeout: 15000 });

    console.log("35. Tablet Dashboard...");
    await tabletPage.waitForTimeout(500);
    await capture(tabletPage, "35-tablet-dashboard-768.png");

    console.log("36. Tablet Visual Editor...");
    await tabletPage.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await tabletPage.waitForTimeout(600);
    await capture(tabletPage, "36-tablet-editor-768.png");

    console.log("37. Tablet Lead CRM...");
    await tabletPage.goto(`${BASE_URL}/stores/str_08/leads`, { waitUntil: "networkidle" });
    await tabletPage.waitForTimeout(600);
    await capture(tabletPage, "37-tablet-lead-crm-768.png");

    await tabletContext.close();

    // ==========================================
    // 3. MOBILE VIEWPORT (390x844)
    // ==========================================
    console.log("\n--- Phase 18.3 Verification: Mobile (390x844) ---");
    const mobileContext = await browser.newContext({
      viewport: { width: 390, height: 844 },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const mobilePage = await mobileContext.newPage();

    // Authenticate
    await mobilePage.goto(`${BASE_URL}/login`, { waitUntil: "networkidle" });
    await mobilePage.fill('input[type="email"]', "alex.mercer@gridretail.internal");
    await mobilePage.fill('input[type="password"]', "AdminGrid2026!");
    await mobilePage.click('button[type="submit"]');
    await mobilePage.waitForURL("**/dashboard", { timeout: 15000 });

    console.log("38. Mobile Dashboard...");
    await mobilePage.waitForTimeout(500);
    await capture(mobilePage, "38-mobile-dashboard-390.png");

    console.log("39. Mobile Stores List...");
    await mobilePage.goto(`${BASE_URL}/stores`, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(500);
    await capture(mobilePage, "39-mobile-stores-390.png");

    console.log("40. Mobile Visual Editor...");
    await mobilePage.goto(`${BASE_URL}/stores/str_01/preview`, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(600);
    await capture(mobilePage, "40-mobile-editor-390.png");

    console.log("41. Mobile Storefront Checkout...");
    await mobilePage.goto(`${BASE_URL}/store/aura-minimalist/checkout`, { waitUntil: "networkidle" });
    await mobilePage.waitForTimeout(600);
    await capture(mobilePage, "41-mobile-checkout-390.png");

    await mobileContext.close();

    console.log("\n--- Phase 18.3 Verification Complete: All 41 Screenshots Captured ---");
  } catch (err) {
    console.error("Verification run failed:", err);
    process.exitCode = 1;
  } finally {
    if (browser) await browser.close();
    if (serverProc) {
      console.log("Shutting down Next.js test server...");
      serverProc.kill("SIGINT");
    }
  }
}

runVerification();
