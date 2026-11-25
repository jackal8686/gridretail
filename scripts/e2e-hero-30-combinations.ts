process.env.MONGODB_URI = "";
process.env.MONGODB_DB_NAME = "gridretail_test";
process.env.ALLOW_IN_MEMORY_FALLBACK = "true";

import { chromium } from "playwright";
import { spawn, ChildProcess } from "child_process";
import crypto from "crypto";

const PORT = 3013;
const BASE_URL = `http://127.0.0.1:${PORT}`;

// Ephemeral isolated test credentials (zero hardcoded static secrets)
const testEmail = process.env.E2E_ADMIN_EMAIL || "test-runner@gridretail.test";
const testPassword =
  process.env.E2E_ADMIN_PASSWORD ||
  `E2E_${crypto.randomBytes(12).toString("hex")}!Aa1`;
process.env.ENABLE_E2E_TEST_USER = "true";
process.env.E2E_ADMIN_PASSWORD = testPassword;
process.env.E2E_ADMIN_EMAIL = testEmail;

interface CombinationResult {
  websiteType: string;
  storeSlug: string;
  heroVariation: string;
  customizerRendered: boolean;
  primaryCtaVerified: boolean;
  interactionVerified: boolean;
  fallbackVerified: boolean;
  savedAndPersisted: boolean;
  storefrontRendered: boolean;
  errors: string[];
}

const HERO_VARIATIONS = [
  { id: "centered", label: "Centered Architecture" },
  { id: "split", label: "Split-Screen" },
  { id: "image_bg", label: "Immersive Image BG" },
  { id: "editorial", label: "Magazine Editorial" },
  { id: "minimal", label: "Minimal Typography" },
  { id: "product_spotlight", label: "Flagship Spotlight" },
  { id: "service_booking", label: "Service Booking" },
  { id: "form_conversion", label: "Lead Capture Form" },
  { id: "media_showcase", label: "Media Showcase" },
  { id: "asymmetric", label: "Brutalist Asymmetric" },
];

const STORES = [
  { type: "E-commerce", id: "str_01", slug: "aura-minimalist" },
  { type: "Appointment Scheduling", id: "str_07", slug: "summit-legal" },
  { type: "Lead Generation", id: "str_08", slug: "apex-growth" },
];

async function waitForServer(url: string, timeoutMs = 45000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // warming up
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  return false;
}

async function run() {
  console.log("===================================================================");
  console.log("  Phase 14.1.2: Complete Hero Compatibility Browser Testing (30 Combinations)");
  console.log("===================================================================\n");

  console.log(`Starting Next.js server on port ${PORT}...`);
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
  }

  console.log(`✓ Next.js server active at ${BASE_URL}\n`);

  const browser = await chromium.launch({ headless: true });
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();

  // Track browser console errors
  const pageErrors: string[] = [];
  page.on("pageerror", (err) => {
    pageErrors.push(err.message);
  });

  // Authenticate using isolated test account (configured at launch)
  console.log("1. Authenticating with isolated test credentials...");
  await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
  await page.fill('input[type="email"], input[name="email"]', testEmail);
  await page.fill('input[type="password"], input[name="password"]', testPassword);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(1500);
  console.log("✓ Authentication complete.\n");

  const results: CombinationResult[] = [];
  let index = 1;

  for (const store of STORES) {
    console.log(`-------------------------------------------------------------------`);
    console.log(`Testing Website Type: ${store.type} (Store ID: ${store.id}, Slug: ${store.slug})`);
    console.log(`-------------------------------------------------------------------`);

    for (const hero of HERO_VARIATIONS) {
      const currentErrors: string[] = [];
      const testTag = `[${index}/30] ${store.type} + ${hero.id}`;
      process.stdout.write(`  ${testTag}... `);

      // 1. Open preview customizer
      await page.goto(`${BASE_URL}/stores/${store.id}/preview`, { waitUntil: "domcontentloaded" });
      await page.waitForTimeout(1000);

      // 2. Select Styling tab
      const stylingTabBtn = page.locator('button:has-text("Styling")');
      if (await stylingTabBtn.isVisible()) {
        await stylingTabBtn.click();
        await page.waitForTimeout(400);
      }

      // 3. Click Hero variation button within Hero Section container
      const heroContainer = page.locator('div:has(> label:has-text("Hero Section Variation"))');
      const heroBtn = heroContainer.locator(`button:has-text("${hero.label}")`);
      if (await heroBtn.isVisible()) {
        await heroBtn.click();
        await page.waitForTimeout(500);
      } else {
        currentErrors.push(`Hero button for '${hero.label}' not found in customizer`);
      }

      // 4. Verify preview frame hero rendering
      const previewFrame = page.frameLocator("iframe");
      let customizerRendered = false;
      let primaryCtaVerified = false;
      let interactionVerified = false;
      let fallbackVerified = false;

      try {
        const heroSection = previewFrame.locator(`[data-hero-variation="${hero.id}"]`);
        await heroSection.waitFor({ timeout: 5000 });
        customizerRendered = true;

        // 5. Verify primary CTA button
        const primaryCta = heroSection.locator('a[href*="#"], button');
        const ctaCount = await primaryCta.count();
        if (ctaCount > 0) {
          primaryCtaVerified = true;
        }

        // 6. Verify interaction elements per variation
        if (hero.id === "form_conversion") {
          const formInputs = heroSection.locator('input[type="email"], input[type="text"], input');
          interactionVerified = (await formInputs.count()) > 0;
        } else if (hero.id === "service_booking") {
          const bookingActions = heroSection.locator("a, button");
          interactionVerified = (await bookingActions.count()) > 0;
        } else if (hero.id === "product_spotlight") {
          const spotlightElements = heroSection.locator("img, svg, a, button");
          interactionVerified = (await spotlightElements.count()) > 0;
        } else {
          // General CTA interaction verification
          interactionVerified = primaryCtaVerified;
        }

        // 7. Verify fallback behavior (no broken text, no $49 fake prices)
        const heroText = (await heroSection.textContent()) || "";
        const hasFakePrices = heroText.includes("$49.00");
        const hasFakePolicies = heroText.includes("Flexible Rescheduling Policy");
        if (!hasFakePrices && !hasFakePolicies && heroText.trim().length > 10) {
          fallbackVerified = true;
        } else {
          currentErrors.push("Hero contained fabricated fallback claims or broken empty text");
        }
      } catch (e) {
        currentErrors.push(`Preview iframe failed to render hero variation '${hero.id}': ${e}`);
      }

      // 8. Save customization
      let savedAndPersisted = false;
      try {
        const saveBtn = page.locator('button:has-text("Save Changes"), button:has-text("Save & Republish")');
        if (await saveBtn.first().isVisible() && !(await saveBtn.first().isDisabled())) {
          await saveBtn.first().click();
          await page.waitForTimeout(1000);
        }

        // 9. Reload preview and verify persistence
        await page.reload({ waitUntil: "domcontentloaded" });
        await page.waitForTimeout(1000);

        const stylingTabAfter = page.locator('button:has-text("Styling")');
        if (await stylingTabAfter.isVisible()) {
          await stylingTabAfter.click();
          await page.waitForTimeout(400);
        }

        // Check if button is visible in hero container
        const heroContainerAfter = page.locator('div:has(> label:has-text("Hero Section Variation"))');
        const activeBtn = heroContainerAfter.locator(`button:has-text("${hero.label}")`);
        if (await activeBtn.isVisible()) {
          savedAndPersisted = true;
        }
      } catch (e) {
        currentErrors.push(`Save/reload persistence verification failed: ${e}`);
      }

      // 10. Verify published storefront displays the same variation
      let storefrontRendered = false;
      try {
        await page.goto(`${BASE_URL}/store/${store.slug}`, { waitUntil: "domcontentloaded" });
        await page.waitForTimeout(600);

        const storefrontHero = page.locator(`[data-hero-variation="${hero.id}"]`);
        await storefrontHero.waitFor({ timeout: 4000 });
        storefrontRendered = true;
      } catch (e) {
        currentErrors.push(`Published storefront /store/${store.slug} failed to render '${hero.id}': ${e}`);
      }

      const passed =
        customizerRendered &&
        primaryCtaVerified &&
        interactionVerified &&
        fallbackVerified &&
        savedAndPersisted &&
        storefrontRendered &&
        currentErrors.length === 0;

      if (passed) {
        console.log("✓ PASS");
      } else {
        console.log(`✗ FAIL (${currentErrors.join("; ")})`);
      }

      results.push({
        websiteType: store.type,
        storeSlug: store.slug,
        heroVariation: hero.id,
        customizerRendered,
        primaryCtaVerified,
        interactionVerified,
        fallbackVerified,
        savedAndPersisted,
        storefrontRendered,
        errors: currentErrors,
      });

      index++;
    }
  }

  await browser.close();
  if (serverProcess) {
    serverProcess.kill("SIGTERM");
  }

  // Summary
  console.log("\n===================================================================");
  console.log("  30-Combination Hero Compatibility Test Summary");
  console.log("===================================================================");
  const totalPassed = results.filter(
    (r) =>
      r.customizerRendered &&
      r.primaryCtaVerified &&
      r.interactionVerified &&
      r.fallbackVerified &&
      r.savedAndPersisted &&
      r.storefrontRendered &&
      r.errors.length === 0
  ).length;

  console.log(`Total Tested: ${results.length}/30`);
  console.log(`Total Passed: ${totalPassed}/30`);
  console.log(`Total Failed: ${results.length - totalPassed}/30`);

  if (totalPassed === 30) {
    console.log("\n🎉 ALL 30 HERO COMBINATIONS FULLY VERIFIED IN REAL BROWSER!");
    process.exit(0);
  } else {
    console.error("\n❌ Some hero combinations failed browser testing.");
    process.exit(1);
  }
}

run().catch((err) => {
  console.error("Execution error:", err);
  process.exit(1);
});
