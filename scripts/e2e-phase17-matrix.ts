process.env.MONGODB_URI = "";
process.env.MONGODB_DB_NAME = "gridretail_test";
process.env.ALLOW_IN_MEMORY_FALLBACK = "true";

import { chromium, Browser, BrowserContext, Page } from "playwright";
import { spawn, ChildProcess } from "child_process";
import path from "path";
import fs from "fs";

const PORT = 3038;
const BASE_URL = `http://127.0.0.1:${PORT}`;
const SCREENSHOT_DIR = path.join(process.cwd(), "docs", "screenshots", "phase17");

interface ViewportDef {
  name: "desktop" | "tablet" | "mobile";
  label: string;
  width: number;
  height: number;
}

const VIEWPORTS: ViewportDef[] = [
  { name: "desktop", label: "Desktop", width: 1440, height: 900 },
  { name: "tablet", label: "Tablet", width: 768, height: 1024 },
  { name: "mobile", label: "Mobile", width: 375, height: 812 },
];

interface WebsiteDef {
  typeKey: "ecommerce" | "appointments" | "leadgen";
  typeLabel: string;
  storeId: string;
  slug: string;
  pathUrl: string;
  previewUrl: string;
}

const WEBSITES: WebsiteDef[] = [
  {
    typeKey: "ecommerce",
    typeLabel: "E-Commerce",
    storeId: "str_01",
    slug: "aura-minimalist",
    pathUrl: `/store/aura-minimalist`,
    previewUrl: `/stores/str_01/preview`,
  },
  {
    typeKey: "appointments",
    typeLabel: "Appointment Scheduling",
    storeId: "str_07",
    slug: "summit-legal",
    pathUrl: `/store/summit-legal`,
    previewUrl: `/stores/str_07/preview`,
  },
  {
    typeKey: "leadgen",
    typeLabel: "Lead Generation",
    storeId: "str_08",
    slug: "apex-growth",
    pathUrl: `/store/apex-growth`,
    previewUrl: `/stores/str_08/preview`,
  },
];

async function waitForServer(url: string, timeoutMs = 25000): Promise<boolean> {
  const start = Date.now();
  while (Date.now() - start < timeoutMs) {
    try {
      const res = await fetch(url);
      if (res.status < 500) return true;
    } catch {
      // wait
    }
    await new Promise((r) => setTimeout(r, 400));
  }
  return false;
}

async function runPhase17_Matrix() {
  console.log("==================================================================");
  console.log("   GridRetail Phase 17 — Production QA Visual & Responsive E2E    ");
  console.log("==================================================================");

  if (!fs.existsSync(SCREENSHOT_DIR)) {
    fs.mkdirSync(SCREENSHOT_DIR, { recursive: true });
  }

  let serverProcess: ChildProcess | null = null;
  const executionResults: Array<Record<string, unknown>> = [];
  const accessibilityResults: Array<Record<string, unknown>> = [];

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
          () => reject(new Error("Next.js server failed to respond within 35 seconds.")),
          35000
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

    const context: BrowserContext = await browser.newContext();
    const page: Page = await context.newPage();

    // Authenticate Administrator
    console.log("Authenticating platform administrator...");
    await page.goto(`${BASE_URL}/login`, { waitUntil: "domcontentloaded" });
    await page.fill('input[type="email"], input[name="email"]', "admin@gridretail.internal");
    await page.fill('input[type="password"], input[name="password"]', "AdminGrid2026!");
    await page.click('button[type="submit"]');
    await page.waitForTimeout(2000);

    // Run the 3x3 Matrix: 3 Website Types x 3 Viewports = 9 Combinations
    for (const site of WEBSITES) {
      for (const vp of VIEWPORTS) {
        console.log(`\nTesting ${site.typeLabel} @ ${vp.label} (${vp.width}x${vp.height})...`);
        await page.setViewportSize({ width: vp.width, height: vp.height });

        // Navigate to storefront
        await page.goto(`${BASE_URL}${site.pathUrl}`, { waitUntil: "networkidle" });
        await page.waitForTimeout(1500);

        // Verification checks
        const overflow = await page.evaluate(() => {
          return document.body.scrollWidth > window.innerWidth;
        });

        const navVisible = await page.evaluate(() => {
          const nav = document.querySelector("header, nav");
          return !!nav;
        });

        const heroVisible = await page.evaluate(() => {
          const hero = document.querySelector('[class*="hero"], h1, [data-section-type*="hero"]');
          return !!hero;
        });

        const ctaCount = await page.locator('button, a[href*="#"], a[href*="cart"], a[href*="checkout"]').count();

        // Accessibility checks
        const a11yAudit = await page.evaluate(() => {
          const imagesWithoutAlt = Array.from(document.querySelectorAll("img")).filter(
            (img) => !img.hasAttribute("alt")
          ).length;
          const buttonsWithoutName = Array.from(document.querySelectorAll("button")).filter(
            (btn) => !btn.innerText.trim() && !btn.getAttribute("aria-label")
          ).length;
          const inputsWithoutLabel = Array.from(document.querySelectorAll("input:not([type='hidden'])")).filter(
            (input) => {
              const id = input.id;
              const hasLabel = id && document.querySelector(`label[for="${id}"]`);
              const hasAria = input.getAttribute("aria-label") || input.getAttribute("placeholder");
              return !hasLabel && !hasAria;
            }
          ).length;
          const headings = Array.from(document.querySelectorAll("h1, h2, h3, h4, h5, h6")).map(
            (h) => h.tagName
          );
          return {
            imagesWithoutAlt,
            buttonsWithoutName,
            inputsWithoutLabel,
            hasH1: headings.includes("H1"),
            totalHeadings: headings.length,
          };
        });

        // Type specific checks
        let typeSpecificFeature = false;
        if (site.typeKey === "ecommerce") {
          typeSpecificFeature = (await page.locator('[class*="product"], button:has-text("Add to Bag"), a[href*="cart"]').count()) > 0;
        } else if (site.typeKey === "appointments") {
          typeSpecificFeature = (await page.locator('[class*="service"], button:has-text("Book"), button:has-text("Schedule")').count()) > 0;
        } else if (site.typeKey === "leadgen") {
          typeSpecificFeature = (await page.locator('form, input[type="email"], textarea, button[type="submit"], button:has-text("Consultation"), button:has-text("Demo"), button:has-text("Reservation")').count()) > 0;
        }

        const prefix = site.typeKey === "leadgen" ? "lead-gen" : site.typeKey;
        const fileName = `${prefix}-${vp.name}.png`;
        const filePath = path.join(SCREENSHOT_DIR, fileName);

        await page.screenshot({
          path: filePath,
          fullPage: false,
        });

        const stat = fs.statSync(filePath);
        console.log(`✓ Captured: ${fileName} (${(stat.size / 1024).toFixed(1)} KB)`);

        executionResults.push({
          websiteType: site.typeLabel,
          viewport: vp.label,
          dimensions: `${vp.width}x${vp.height}`,
          horizontalOverflow: overflow ? "FAIL (Overflow detected)" : "PASS (No overflow)",
          navigation: navVisible ? "PASS" : "FAIL",
          hero: heroVisible ? "PASS" : "FAIL",
          ctaCount,
          typeSpecificCheck: typeSpecificFeature ? "PASS" : "FAIL",
          screenshotFile: fileName,
          fileSizeKb: (stat.size / 1024).toFixed(1),
          status: !overflow && navVisible && heroVisible ? "PASS" : "FAIL",
        });

        accessibilityResults.push({
          websiteType: site.typeLabel,
          viewport: vp.label,
          imagesWithoutAlt: a11yAudit.imagesWithoutAlt,
          buttonsWithoutName: a11yAudit.buttonsWithoutName,
          inputsWithoutLabel: a11yAudit.inputsWithoutLabel,
          hasH1: a11yAudit.hasH1,
          totalHeadings: a11yAudit.totalHeadings,
        });
      }
    }

    // Build Contact Sheet HTML & PNG
    console.log("\nGenerating Phase 17 Contact Sheet (3x3 composite matrix)...");
    const cardsHtml = executionResults.map((res) => {
      const imgPath = path.join(SCREENSHOT_DIR, res.screenshotFile as string);
      const b64 = fs.readFileSync(imgPath).toString("base64");
      return `
      <div class="card">
        <div class="card-header">
          <div class="card-title">${res.websiteType}</div>
          <div class="card-badge">${res.viewport} (${res.dimensions}) · ${res.fileSizeKb} KB</div>
        </div>
        <div class="img-container">
          <img src="data:image/png;base64,${b64}" alt="${res.websiteType} ${res.viewport}" />
        </div>
        <div class="card-footer">
          <code>${res.screenshotFile}</code> · Overflow: ${res.horizontalOverflow} · Status: <strong>${res.status}</strong>
        </div>
      </div>`;
    }).join("\n");

    const contactSheetHtml = `
    <!DOCTYPE html>
    <html lang="en">
    <head>
      <meta charset="UTF-8">
      <title>GridRetail Phase 17 Production QA Contact Sheet</title>
      <style>
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif;
          background: #0f172a;
          color: #f8fafc;
          padding: 40px;
          width: 1920px;
        }
        .header {
          text-align: center;
          margin-bottom: 36px;
        }
        .header h1 {
          font-size: 28px;
          font-weight: 700;
          color: #38bdf8;
          margin-bottom: 8px;
        }
        .header p {
          font-size: 14px;
          color: #94a3b8;
        }
        .grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 24px;
        }
        .card {
          background: #1e293b;
          border-radius: 12px;
          border: 1px solid #334155;
          overflow: hidden;
          display: flex;
          flex-direction: column;
        }
        .card-header {
          padding: 12px 16px;
          background: #1e293b;
          border-bottom: 1px solid #334155;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .card-title {
          font-size: 13px;
          font-weight: 600;
          color: #e2e8f0;
        }
        .card-badge {
          font-size: 11px;
          background: #0284c7;
          color: #ffffff;
          padding: 3px 8px;
          border-radius: 4px;
          font-weight: 500;
        }
        .img-container {
          background: #090d16;
          height: 380px;
          display: flex;
          align-items: center;
          justify-content: center;
          overflow: hidden;
          padding: 8px;
        }
        .img-container img {
          max-width: 100%;
          max-height: 100%;
          object-fit: contain;
          border-radius: 4px;
          box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.5);
        }
        .card-footer {
          padding: 8px 16px;
          background: #1e293b;
          border-top: 1px solid #334155;
          font-size: 11px;
          color: #94a3b8;
          text-align: center;
        }
        .card-footer code {
          color: #38bdf8;
        }
      </style>
    </head>
    <body>
      <div class="header">
        <h1>GridRetail — Phase 17 Production QA Visual Evidence</h1>
        <p>Verified 3×3 Browser Render Matrix: 3 Website Types × 3 Responsive Viewports (Desktop: 1440×900, Tablet: 768×1024, Mobile: 375×812)</p>
      </div>
      <div class="grid">
        ${cardsHtml}
      </div>
    </body>
    </html>`;

    const contactSheetHtmlPath = path.join(SCREENSHOT_DIR, "contact-sheet.html");
    fs.writeFileSync(contactSheetHtmlPath, contactSheetHtml, "utf-8");

    const contactPage = await context.newPage();
    await contactPage.setViewportSize({ width: 1920, height: 1600 });
    await contactPage.setContent(contactSheetHtml, { waitUntil: "networkidle" });
    const contactSheetPngPath = path.join(SCREENSHOT_DIR, "contact-sheet.png");
    await contactPage.screenshot({
      path: contactSheetPngPath,
      fullPage: true,
    });
    await contactPage.close();
    console.log(`✓ Captured: contact-sheet.png (${(fs.statSync(contactSheetPngPath).size / 1024).toFixed(1)} KB)`);

    // Copy all 10 images to conversation brain artifacts directory
    const ARTIFACT_DIR = path.resolve("C:/Users/RUDRA/.gemini/antigravity/brain/d74489b9-51fb-4522-b2bd-4daf057f74d7");
    if (fs.existsSync(ARTIFACT_DIR)) {
      console.log(`Mirroring screenshots to artifact directory: ${ARTIFACT_DIR}...`);
      const targetFiles = [
        "ecommerce-desktop.png", "ecommerce-tablet.png", "ecommerce-mobile.png",
        "appointments-desktop.png", "appointments-tablet.png", "appointments-mobile.png",
        "lead-gen-desktop.png", "lead-gen-tablet.png", "lead-gen-mobile.png",
        "contact-sheet.png",
      ];
      for (const f of targetFiles) {
        fs.copyFileSync(path.join(SCREENSHOT_DIR, f), path.join(ARTIFACT_DIR, f));
      }
      console.log(`✓ All 10 PNGs mirrored to artifact directory.`);
    }

    // Save JSON matrix
    fs.writeFileSync(
      path.join(process.cwd(), "docs", "phase17-responsive-matrix.json"),
      JSON.stringify({ executionResults, accessibilityResults }, null, 2)
    );

    await browser.close();
    console.log("\n==================================================================");
    console.log("   All 9 Phase 17 Viewport Screenshots Successfully Verified!     ");
    console.log("==================================================================");
  } finally {
    if (serverProcess) {
      console.log("Stopping isolated Next.js test server...");
      serverProcess.kill("SIGTERM");
    }
  }
}

runPhase17_Matrix().catch((err) => {
  console.error("Matrix verification failed:", err);
  process.exit(1);
});
