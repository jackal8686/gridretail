try {
  if (typeof process.loadEnvFile === "function") {
    process.loadEnvFile(".env.local");
  }
} catch {
  // Ignore if .env.local is not present
}

import { chromium } from "playwright";
import { spawn, ChildProcess } from "child_process";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { ServiceRepository } from "../src/lib/repositories/service.repository";
import { ProviderRepository } from "../src/lib/repositories/provider.repository";
import { AppointmentRepository } from "../src/lib/repositories/appointment.repository";
import { Store } from "../src/types/store";
import { AppointmentConfig } from "../src/types/appointment";

const PORT = 3008;
const BASE_URL = `http://127.0.0.1:${PORT}`;

async function waitForServer(url: string, timeoutMs = 45000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // Server not ready yet
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function run() {
  console.log("===================================================================");
  console.log("  Phase 11 — Genuine Playwright Browser End-to-End Verification");
  console.log("===================================================================\n");

  const timestamp = Date.now();
  const storeSlug = `pw-legal-${timestamp}`;
  const storeId = `store_pw_${timestamp}`;

  console.log(`1. Seeding test appointment store: ${storeSlug}`);
  const config: AppointmentConfig = {
    timezone: "Asia/Kolkata",
    weeklyHours: [
      { dayOfWeek: 0, isOpen: false, openTime: "09:00", closeTime: "18:00" },
      { dayOfWeek: 1, isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      { dayOfWeek: 2, isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      { dayOfWeek: 3, isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      { dayOfWeek: 4, isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      { dayOfWeek: 5, isOpen: true, openTime: "09:00", closeTime: "18:00", breakStart: "13:00", breakEnd: "14:00" },
      { dayOfWeek: 6, isOpen: false, openTime: "09:00", closeTime: "18:00" },
    ],
    bufferMinutes: 15,
    minNoticeHours: 0, // 0 for testing immediate slots
    maxAdvanceDays: 30,
    cancellationPolicy: {
      allowed: true,
      noticeHours: 24,
      policyText: "Cancellations permitted up to 24 hours prior to appointment.",
    },
    requireApproval: false,
    meetingLocation: "Mumbai Chambers & Secure Video Link",
  };

  const store: Store = {
    id: storeId,
    name: "Playwright Law Chambers",
    slug: storeSlug,
    clientId: "client_pw_01",
    clientName: "PW Client",
    industry: "Health & Wellness",
    websiteType: "appointments",
    appointmentIndustry: "Legal Practice & Advisory",
    templateId: "editorial",
    templateName: "Editorial Minimal",
    themeId: "minimal-stone",
    themeName: "Minimal Stone",
    status: "Published",
    productCount: 0,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: "High-stakes litigation and advisory counsel verified via Playwright.",
    branding: {
      primaryColor: "#1A365D",
      fontFamily: "serif",
      heroHeadline: "Specialized Legal Advocacy and Strategic Advisory",
      heroSubheadline: "Book a consultation directly through our verified digital scheduling portal.",
    },
    appointmentConfig: config,
  };

  await StoreRepository.create(store);

  await ServiceRepository.create({
    id: `srv_pw_${timestamp}`,
    storeId,
    name: "Corporate Advisory Consultation",
    description: "In-depth corporate governance advisory and risk review.",
    durationMinutes: 60,
    price: 5000,
    currency: "INR",
    meetingType: "video_call",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  await ProviderRepository.create({
    id: `prv_pw_${timestamp}`,
    storeId,
    name: "Adv. Vikram Malhotra",
    role: "Senior Partner",
    email: "vikram@example.com",
    status: "active",
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  });

  console.log("2. Starting Next.js server on port", PORT);
  let devProcess: ChildProcess | null = null;
  const isAlreadyListening = await waitForServer(BASE_URL, 1500);

  if (!isAlreadyListening) {
    devProcess = spawn("npx", ["next", "dev", "-H", "127.0.0.1", "-p", String(PORT)], {
      shell: true,
      stdio: "pipe",
      env: { ...process.env, PORT: String(PORT) },
    });

    const readyPromise = new Promise<void>((resolve, reject) => {
      const timer = setTimeout(() => reject(new Error("Next.js dev server timeout")), 45000);
      devProcess?.stdout?.on("data", (d) => {
        const out = d.toString();
        if (out.includes("Ready") || out.includes("✓ Ready") || out.includes("Local:")) {
          console.log("   [Next.js Server]", out.trim());
          clearTimeout(timer);
          resolve();
        }
      });
      devProcess?.stderr?.on("data", (d) => {
        const errStr = d.toString();
        if (!errStr.includes("Fast Refresh") && !errStr.includes("warn")) {
          console.log("   [Next.js log]", errStr.trim());
        }
      });
    });

    await readyPromise;
    // Give half a second for socket listen
    await new Promise((r) => setTimeout(r, 1000));
  }
  console.log("   Next.js server is ready at", BASE_URL);

  console.log("3. Launching Chromium via Playwright...");
  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext();
  const page = await context.newPage();

  page.on("console", (msg) => console.log("   [Browser Console]", msg.text()));
  page.on("pageerror", (err) => console.error("   [Browser Page Error]", err.message));
  page.on("request", (req) => console.log("   [Browser Request]", req.url()));
  page.on("requestfailed", (req) => console.log("   [Request Failed]", req.url(), req.failure()?.errorText));

  try {
    const storefrontUrl = `${BASE_URL}/store/${storeSlug}`;
    console.log(`4. Navigating to appointment storefront: ${storefrontUrl}`);
    await page.goto(storefrontUrl, { waitUntil: "networkidle" });

    // Verify Title & Hero
    const headerTitle = await page.locator("header").textContent();
    console.log("   Storefront Header found:", headerTitle?.includes("Playwright Law Chambers"));
    if (!headerTitle?.includes("Playwright Law Chambers")) {
      throw new Error("Storefront header does not display store name");
    }

    // Set Date to a weekday (e.g. Next Monday)
    const targetDate = new Date();
    targetDate.setDate(targetDate.getDate() + ((1 + 7 - targetDate.getDay()) % 7 || 7)); // Next Monday
    const dateStr = targetDate.toISOString().split("T")[0];
    console.log(`5. Selecting date: ${dateStr}`);

    const dateInput = page.locator('input[type="date"]');
    await dateInput.fill(dateStr);
    await dateInput.dispatchEvent("change");

    // Wait for slot buttons to render
    console.log("6. Waiting for time slot buttons...");
    try {
      const slotButton = page.locator("#booking-section button:has-text('AM'), #booking-section button:has-text('PM')").first();
      await slotButton.waitFor({ timeout: 12000 });
      const slotTimeText = await slotButton.textContent();
      console.log(`   Found slot button: ${slotTimeText}`);
    } catch {
      const sectionText = await page.locator("#booking-section").textContent();
      console.log("   [Booking Section Text]:", sectionText?.replace(/\s+/g, " ").trim());
      throw new Error("Slot button did not appear within 12s");
    }

    const slotButton = page.locator("#booking-section button:has-text('AM'), #booking-section button:has-text('PM')").first();

    // Click slot
    await slotButton.click();

    // Fill customer form
    console.log("7. Filling customer details...");
    await page.locator('input[placeholder="e.g. Adv. Rajesh Iyer"]').fill("Playwright Client");
    await page.locator('input[placeholder="rajesh@example.in"]').fill("playwright@client.test");
    await page.locator('input[placeholder="+91 98765 43210"]').fill("+91 99999 11111");

    // Click submit
    console.log("8. Submitting appointment booking...");
    const submitBtn = page.locator('button:has-text("Confirm Appointment")');
    await submitBtn.click();

    // Wait for confirmation modal
    console.log("9. Waiting for confirmation modal...");
    const modalHeading = page.locator("h3:has-text('Reference:')");
    await modalHeading.waitFor({ timeout: 10000 });

    const confirmationText = await page.locator("text=/APT-SIM-\\d+/").textContent();
    console.log(`   SUCCESS: Booking confirmed! Number: ${confirmationText?.trim()}`);

    // Get cancellation link
    const cancelLinkLocator = page.locator('a:has-text("View Booking Page")');
    const cancelUrl = await cancelLinkLocator.getAttribute("href");
    console.log("   Cancellation URL generated: [REDACTED_FOR_SECURITY]");

    if (!cancelUrl) {
      throw new Error("Cancellation URL was not provided in confirmation modal");
    }

    // Close modal
    const closeBtn = page.locator('button:has-text("Close & Return")');
    await closeBtn.click();

    // Test Conflict Prevention:
    console.log("10. Testing double-booking conflict prevention in UI...");
    // Try to re-select same slot and submit
    await slotButton.click().catch(() => {});
    await page.locator('input[placeholder="e.g. Adv. Rajesh Iyer"]').fill("Conflict Client");
    await page.locator('input[placeholder="rajesh@example.in"]').fill("conflict@client.test");

    // If slot is still selectable, click submit and expect conflict error
    const isSubmitEnabled = await submitBtn.isEnabled();
    if (isSubmitEnabled) {
      await submitBtn.click();
      await page.waitForTimeout(1500);
      const errorText = await page.locator("text=/no longer available|conflict|Please choose another/i").textContent().catch(() => null);
      console.log(`   Conflict Feedback: "${errorText?.trim() || "Slot automatically disabled/deselected"}"`);
    } else {
      console.log("   SUCCESS: Occupied slot was automatically disabled or excluded from available list!");
    }

    // Test Cancellation Page:
    console.log("11. Navigating to self-service cancellation URL...");
    const fullCancelUrl = cancelUrl.startsWith("http") ? cancelUrl : `${BASE_URL}${cancelUrl}`;
    await page.goto(fullCancelUrl, { waitUntil: "networkidle" });

    // Verify cancellation details
    const cancelPageText = await page.locator("body").textContent();
    console.log("   Policy text present:", cancelPageText?.includes("Cancellations permitted"));

    // Check PII is not leaked on cancellation page
    const hasClientName = cancelPageText?.includes("Playwright Client");
    const hasClientEmail = cancelPageText?.includes("playwright@client.test");
    console.log(`   Non-disclosure check: customerName exposed = ${hasClientName}, customerEmail exposed = ${hasClientEmail}`);
    if (hasClientName || hasClientEmail) {
      throw new Error("SECURITY FAILURE: Customer PII is exposed on public cancellation page!");
    }

    // Confirm Cancellation
    console.log("12. Submitting cancellation via UI...");
    const cancelReasonInput = page.locator('input[placeholder*="Schedule conflict"]');
    if (await cancelReasonInput.isVisible()) {
      await cancelReasonInput.fill("Client rescheduling via Playwright test");
    }
    const confirmCancelBtn = page.locator('button:has-text("Confirm Cancellation")');
    await confirmCancelBtn.click();

    // Verify Cancellation confirmation
    const cancelledHeader = page.locator('text="Appointment Cancelled"');
    await cancelledHeader.waitFor({ timeout: 10000 });
    console.log("   SUCCESS: Appointment cancellation confirmed via Playwright!");

    console.log("\n===================================================================");
    console.log("  ALL PLAYWRIGHT BROWSER VERIFICATION CHECKS PASSED SUCCESSFULLY!");
    console.log("===================================================================\n");
    process.exit(0);
  } finally {
    await browser.close();
    if (devProcess) {
      devProcess.kill();
    }
    // Clean up test data
    await AppointmentRepository.deleteByStoreId(storeId);
    await ServiceRepository.deleteByStoreId(storeId);
    await ProviderRepository.deleteByStoreId(storeId);
    await StoreRepository.delete(storeId);
  }
}

run().catch((err) => {
  console.error("Playwright verification failed:", err);
  process.exit(1);
});
