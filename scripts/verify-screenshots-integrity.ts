import * as fs from "fs";
import * as path from "path";

const SCREENSHOTS_DIR = path.join(__dirname, "../docs/screenshots/phase14-1");

interface ScreenshotInfo {
  filename: string;
  relativePath: string;
  sizeBytes: number;
  width: number;
  height: number;
  validPng: boolean;
  category: string;
  associatedWebsiteType: string;
}

function parsePngHeader(filePath: string): { width: number; height: number; valid: boolean } {
  const buffer = fs.readFileSync(filePath);
  if (buffer.length < 24) return { width: 0, height: 0, valid: false };

  // PNG Magic Header: 89 50 4E 47 0D 0A 1A 0A
  const isPng =
    buffer[0] === 0x89 &&
    buffer[1] === 0x50 &&
    buffer[2] === 0x4e &&
    buffer[3] === 0x47 &&
    buffer[4] === 0x0d &&
    buffer[5] === 0x0a &&
    buffer[6] === 0x1a &&
    buffer[7] === 0x0a;

  if (!isPng) return { width: 0, height: 0, valid: false };

  // IHDR width and height
  const width = buffer.readUInt32BE(16);
  const height = buffer.readUInt32BE(20);

  return { width, height, valid: true };
}

function categorizeScreenshot(filename: string): { category: string; associatedWebsiteType: string } {
  if (filename.startsWith("hero-")) {
    return {
      category: "Hero Variation",
      associatedWebsiteType: "E-commerce (aura-minimalist exclusively)",
    };
  }
  if (filename.startsWith("nav-")) {
    return {
      category: "Navigation Header Variation",
      associatedWebsiteType: "E-commerce (aura-minimalist)",
    };
  }
  if (filename.startsWith("footer-")) {
    return {
      category: "Footer Variation",
      associatedWebsiteType: "E-commerce (aura-minimalist)",
    };
  }
  if (filename.startsWith("card-")) {
    return {
      category: "Card Treatment Variation",
      associatedWebsiteType: "E-commerce (aura-minimalist)",
    };
  }
  if (filename.startsWith("customizer-")) {
    return {
      category: "Visual Customizer UI",
      associatedWebsiteType: "Multi-Store Workspace",
    };
  }
  if (filename.startsWith("storefront-") || filename.startsWith("store-")) {
    if (filename.includes("appointments") || filename.includes("summit")) {
      return {
        category: "Full Storefront View",
        associatedWebsiteType: "Appointment Scheduling (summit-legal)",
      };
    }
    if (filename.includes("lead") || filename.includes("apex")) {
      return {
        category: "Full Storefront View",
        associatedWebsiteType: "Lead Generation (apex-growth)",
      };
    }
    return {
      category: "Full Storefront View",
      associatedWebsiteType: "E-commerce (aura-minimalist)",
    };
  }
  return {
    category: "General Evidence",
    associatedWebsiteType: "All Website Types",
  };
}

function run() {
  if (!fs.existsSync(SCREENSHOTS_DIR)) {
    console.error(`Directory not found: ${SCREENSHOTS_DIR}`);
    process.exit(1);
  }

  const files = fs.readdirSync(SCREENSHOTS_DIR).filter((f) => f.endsWith(".png")).sort();
  console.log(`Found ${files.length} PNG files in docs/screenshots/phase14-1/\n`);

  const results: ScreenshotInfo[] = [];

  for (const file of files) {
    const fullPath = path.join(SCREENSHOTS_DIR, file);
    const stats = fs.statSync(fullPath);
    const { width, height, valid } = parsePngHeader(fullPath);
    const { category, associatedWebsiteType } = categorizeScreenshot(file);

    results.push({
      filename: file,
      relativePath: `docs/screenshots/phase14-1/${file}`,
      sizeBytes: stats.size,
      width,
      height,
      validPng: valid && stats.size > 0,
      category,
      associatedWebsiteType,
    });
  }

  // Print markdown table
  console.log("| # | Filename | Relative Path | Dimensions | Size (KB) | Valid PNG | Category | Associated Website Type |");
  console.log("|---|----------|---------------|------------|-----------|-----------|----------|-------------------------|");

  results.forEach((r, idx) => {
    console.log(
      `| ${idx + 1} | \`${r.filename}\` | \`${r.relativePath}\` | ${r.width}x${r.height} | ${(r.sizeBytes / 1024).toFixed(1)} KB | ${r.validPng ? "Yes" : "NO"} | ${r.category} | ${r.associatedWebsiteType} |`
    );
  });

  const totalZeroByte = results.filter((r) => r.sizeBytes === 0).length;
  const totalInvalid = results.filter((r) => !r.validPng).length;
  const heroCount = results.filter((r) => r.category === "Hero Variation").length;

  console.log("\n--- Verification Summary ---");
  console.log(`Total Files: ${results.length}`);
  console.log(`Zero-byte Files: ${totalZeroByte}`);
  console.log(`Invalid PNG Files: ${totalInvalid}`);
  console.log(`Hero Screenshots: ${heroCount} (Exclusively captured against E-commerce aura-minimalist)`);

  fs.writeFileSync(
    path.join(__dirname, "../docs/screenshots-inventory.json"),
    JSON.stringify(results, null, 2)
  );
  console.log("\nSaved inventory to docs/screenshots-inventory.json");
}

run();
