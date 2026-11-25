import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { siteConfig } from "../src/config/site";
import {
  normalizeWebsiteType,
  getWebsiteTypeLabel,
  getWebsiteTypeBadgeClass,
  getWebsiteTypeFilterOptions,
} from "../src/utils/store-types";
import { SECTION_DEFINITIONS } from "../src/constants/sections";

test("Phase 18 — Platform Refinement & Branding Verification", async (t) => {
  await t.test("Workstream 1: siteConfig contains updated platform branding and version", () => {
    assert.equal(siteConfig.name, "GridRetail");
    assert.equal(siteConfig.tagline, "Internal Website Generation Platform");
    assert.equal(siteConfig.version, "1.0.0");
    assert.ok(siteConfig.description.includes("retail, appointment, and lead generation"));
  });

  await t.test("Workstream 1: login page displays accurate platform branding", () => {
    const loginPath = path.join(process.cwd(), "src/app/login/page.tsx");
    const content = fs.readFileSync(loginPath, "utf8");

    assert.ok(!content.includes("Internal E-Commerce Demo Generation Platform"));
    assert.ok(content.includes("GridRetail — Internal Website Generation Platform"));
  });

  await t.test("Workstream 4: platform footer displays clean version and no obsolete phase labels", () => {
    const appShellPath = path.join(process.cwd(), "src/components/layout/AppShell.tsx");
    const content = fs.readFileSync(appShellPath, "utf8");

    assert.ok(!content.includes("Phase 2 Database & Engine"));
    assert.ok(!content.includes("Design System v1.0"));
    assert.ok(!content.includes("Internal Retail Generation Engine"));
    assert.ok(content.includes("GridRetail Platform"));
    assert.ok(content.includes("Internal Website Generation Platform"));
    assert.ok(content.includes("Version 1.0.0"));
    assert.ok(content.includes("Production Release"));
  });

  await t.test("Workstream 10: mojibake is completely eliminated across src", () => {
    const leftPanelPath = path.join(process.cwd(), "src/components/editor/EditorLeftPanel.tsx");
    const leftPanelContent = fs.readFileSync(leftPanelPath, "utf8");
    assert.ok(!leftPanelContent.includes("â€¢"));
    assert.ok(!leftPanelContent.includes("â€"));

    const canvasPath = path.join(process.cwd(), "src/components/editor/EditorCanvas.tsx");
    const canvasContent = fs.readFileSync(canvasPath, "utf8");
    assert.ok(!canvasContent.includes("â€¢"));
    assert.ok(!canvasContent.includes("â€"));

    // Scan entire src tree for any lingering mojibake sequences
    function scanDir(dir: string): string[] {
      const violations: string[] = [];
      const entries = fs.readdirSync(dir);
      for (const entry of entries) {
        if (entry === "node_modules" || entry === ".next" || entry === ".git") continue;
        const full = path.join(dir, entry);
        const stat = fs.statSync(full);
        if (stat.isDirectory()) {
          violations.push(...scanDir(full));
        } else if (/\.(tsx?|jsx?|json|css)$/.test(entry)) {
          const fileText = fs.readFileSync(full, "utf8");
          if (fileText.includes("â€")) {
            violations.push(full);
          }
        }
      }
      return violations;
    }

    const srcViolations = scanDir(path.join(process.cwd(), "src"));
    assert.deepEqual(srcViolations, []);
  });

  await t.test("Workstream 6: store type normalization accurately maps all 3 website types", () => {
    // E-Commerce
    assert.equal(normalizeWebsiteType("ecommerce"), "ecommerce");
    assert.equal(normalizeWebsiteType(""), "ecommerce");
    assert.equal(normalizeWebsiteType(undefined), "ecommerce");
    assert.equal(getWebsiteTypeLabel("ecommerce"), "E-Commerce");
    assert.ok(getWebsiteTypeBadgeClass("ecommerce").includes("text-[#176B4D]"));

    // Appointment Scheduling
    assert.equal(normalizeWebsiteType("appointments"), "appointments");
    assert.equal(normalizeWebsiteType("appointment"), "appointments");
    assert.equal(normalizeWebsiteType("scheduling"), "appointments");
    assert.equal(getWebsiteTypeLabel("appointments"), "Appointment Scheduling");
    assert.ok(getWebsiteTypeBadgeClass("appointments").includes("text-[#2D6A9F]"));

    // Lead Generation
    assert.equal(normalizeWebsiteType("lead_gen"), "lead_gen");
    assert.equal(normalizeWebsiteType("lead-gen"), "lead_gen");
    assert.equal(normalizeWebsiteType("lead-generation"), "lead_gen");
    assert.equal(normalizeWebsiteType("leadgen"), "lead_gen");
    assert.equal(getWebsiteTypeLabel("lead_gen"), "Lead Generation");
    assert.ok(getWebsiteTypeBadgeClass("lead_gen").includes("text-[#7B3F9E]"));

    // Filter Options
    const options = getWebsiteTypeFilterOptions();
    assert.equal(options.length, 4);
    assert.deepEqual(
      options.map((o) => o.value),
      ["ALL", "ecommerce", "appointments", "lead_gen"]
    );
  });

  await t.test("Workstream 5: Settings page has been cleaned up with appearance removed and currency decoupled", () => {
    const settingsPath = path.join(process.cwd(), "src/app/settings/page.tsx");
    const content = fs.readFileSync(settingsPath, "utf8");

    // Appearance tab removed
    assert.ok(!content.includes('{ id: "appearance"'));
    assert.ok(!content.includes("Appearance & Design Tokens"));

    // Default Currency removed from General Settings
    assert.ok(!content.includes("Default Currency & Locale"));

    // Workspace name and store expiry retained
    assert.ok(content.includes("Workspace Name"));
    assert.ok(content.includes("Default Demo Store Expiry"));
    assert.ok(content.includes("gridretail_workspace_name"));
    assert.ok(content.includes("gridretail_store_expiry"));
  });

  await t.test("Workstream 7: Section library has comprehensive section definitions", () => {
    const sectionTypes = Object.keys(SECTION_DEFINITIONS);
    assert.ok(sectionTypes.length >= 25);

    // E-Commerce product sections
    assert.ok(sectionTypes.includes("featured_products"));
    assert.ok(sectionTypes.includes("bestsellers_grid"));
    assert.ok(sectionTypes.includes("new_arrivals"));
    assert.ok(sectionTypes.includes("collection_showcase"));
    assert.ok(sectionTypes.includes("product_comparison"));

    // Content and info sections
    assert.ok(sectionTypes.includes("brand_story"));
    assert.ok(sectionTypes.includes("faq_accordion"));
    assert.ok(sectionTypes.includes("contact_info"));
    assert.ok(sectionTypes.includes("trust_badges"));
    assert.ok(sectionTypes.includes("verified_statistics_bar"));

    // Layout validation
    for (const type of sectionTypes) {
      const def = SECTION_DEFINITIONS[type as keyof typeof SECTION_DEFINITIONS];
      assert.ok(def.availableLayouts.length > 0);
      assert.ok(def.defaultLayout !== undefined);
    }
  });

  await t.test("Workstream 2 & 3: AppHeader does not mount roadmap PlaceholderModal", () => {
    const headerPath = path.join(process.cwd(), "src/components/layout/AppHeader.tsx");
    const content = fs.readFileSync(headerPath, "utf8");

    assert.ok(!content.includes("PlaceholderModal"));
    assert.ok(!content.includes("Activity Audit Log (Phase 2)"));
    assert.ok(content.includes("GlobalSpotlightModal"));
    assert.ok(content.includes("ActivityDrawerModal"));
    assert.ok(content.includes("metaKey || e.ctrlKey"));
  });
});
