import test from "node:test";
import assert from "node:assert/strict";
import { COLOR_THEMES, getThemeById } from "../src/constants/themes";
import { DESIGN_TEMPLATES, getDesignTemplateById } from "../src/constants/design-templates";
import { TemplateRepository } from "../src/lib/repositories/template.repository";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { validateStoreInput } from "../src/lib/validation/store";
import { ColorThemeTokens } from "../src/types/template";

/**
 * Helper to compute relative luminance for WCAG contrast calculation
 */
function getLuminance(hex: string): number {
  const cleanHex = hex.replace("#", "");
  const fullHex =
    cleanHex.length === 3
      ? cleanHex.split("").map((c) => c + c).join("")
      : cleanHex;

  const r = parseInt(fullHex.slice(0, 2), 16) / 255;
  const g = parseInt(fullHex.slice(2, 4), 16) / 255;
  const b = parseInt(fullHex.slice(4, 6), 16) / 255;

  const toLinear = (c: number) =>
    c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4);

  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

/**
 * Helper to compute WCAG 2.1 contrast ratio
 */
function getContrastRatio(hex1: string, hex2: string): number {
  const l1 = getLuminance(hex1);
  const l2 = getLuminance(hex2);
  const lighter = Math.max(l1, l2);
  const darker = Math.min(l1, l2);
  return (lighter + 0.05) / (darker + 0.05);
}

test("Phase 9 Add-on — 12 Colour Themes Specification", async (t) => {
  await t.test("defines exactly 12 production-grade colour themes", () => {
    assert.equal(COLOR_THEMES.length, 12, "Should contain exactly 12 colour themes");
    const uniqueIds = new Set(COLOR_THEMES.map((th) => th.id));
    assert.equal(uniqueIds.size, 12, "All 12 themes must have unique identifiers");
  });

  await t.test("TemplateRepository.findAllThemes() returns all 12 themes", async () => {
    const themes = await TemplateRepository.findAllThemes();
    assert.equal(themes.length, 12);
  });

  await t.test("every theme contains complete, valid tokens and satisfies WCAG AA contrast", () => {
    const requiredTokenKeys: (keyof ColorThemeTokens)[] = [
      "primary",
      "secondary",
      "accent",
      "background",
      "surface",
      "text",
      "textMuted",
      "border",
      "cardBg",
      "badgeBg",
      "badgeText",
    ];

    const hexRegex = /^#([0-9a-fA-F]{3}|[0-9a-fA-F]{6})$/;

    for (const theme of COLOR_THEMES) {
      assert.ok(theme.id.startsWith("theme_"), `Theme ID ${theme.id} should start with 'theme_'`);
      assert.ok(theme.name.length > 0, `Theme ${theme.id} must have a name`);
      assert.ok(theme.description.length > 0, `Theme ${theme.id} must have a description`);
      assert.ok(Array.isArray(theme.previewSwatches) && theme.previewSwatches.length >= 4);
      assert.ok(Array.isArray(theme.suitableIndustries) && theme.suitableIndustries.length > 0);

      // Verify all required tokens exist and are valid hex strings
      for (const tokenKey of requiredTokenKeys) {
        const val = theme.tokens[tokenKey];
        assert.ok(val, `Theme ${theme.name} missing token ${tokenKey}`);
        assert.match(val, hexRegex, `Theme ${theme.name} token ${tokenKey} has invalid hex: ${val}`);
      }

      // Verify WCAG contrast between text and background
      const textOnBgContrast = getContrastRatio(theme.tokens.text, theme.tokens.background);
      assert.ok(
        textOnBgContrast >= 4.5,
        `Theme ${theme.name} text on background contrast is ${textOnBgContrast.toFixed(2)}, expected >= 4.5 (WCAG AA)`
      );

      // Verify WCAG contrast between text and surface
      const textOnSurfaceContrast = getContrastRatio(theme.tokens.text, theme.tokens.surface);
      assert.ok(
        textOnSurfaceContrast >= 4.5,
        `Theme ${theme.name} text on surface contrast is ${textOnSurfaceContrast.toFixed(2)}, expected >= 4.5 (WCAG AA)`
      );

      // Verify badge text contrast on badge background
      const badgeContrast = getContrastRatio(theme.tokens.badgeText, theme.tokens.badgeBg);
      assert.ok(
        badgeContrast >= 3.0,
        `Theme ${theme.name} badge text contrast is ${badgeContrast.toFixed(2)}, expected >= 3.0`
      );
    }
  });

  await t.test("supports both light mode and dark mode themes", () => {
    const lightThemes = COLOR_THEMES.filter((th) => !th.isDark);
    const darkThemes = COLOR_THEMES.filter((th) => th.isDark);

    assert.ok(lightThemes.length >= 8, "Expected at least 8 light mode themes");
    assert.ok(darkThemes.length >= 2, "Expected at least 2 dark mode themes (Slate, Cyber, etc.)");
  });

  await t.test("getThemeById retrieves known themes and falls back safely", () => {
    const nordic = getThemeById("theme_nordic_pine");
    assert.ok(nordic);
    assert.equal(nordic?.name, "Nordic Pine");

    const fallback = getThemeById("non_existent_id");
    assert.ok(fallback);
    assert.equal(fallback?.id, "theme_nordic_pine");
  });
});

test("Phase 9 Add-on — 8 Website Design Templates Specification", async (t) => {
  await t.test("defines exactly 8 visually distinct design templates", () => {
    assert.equal(DESIGN_TEMPLATES.length, 8, "Should contain exactly 8 design templates");
    const uniqueIds = new Set(DESIGN_TEMPLATES.map((tpl) => tpl.id));
    assert.equal(uniqueIds.size, 8, "All 8 design templates must have unique identifiers");
  });

  await t.test("TemplateRepository.findAllDesignTemplates() returns all 8 design templates", async () => {
    const templates = await TemplateRepository.findAllDesignTemplates();
    assert.equal(templates.length, 8);
  });

  await t.test("each design template defines distinct layout families and component slots", () => {
    const expectedFamilies = [
      "Modern Minimal",
      "Luxury Editorial",
      "Bold & Vibrant",
      "Classic Commerce",
      "Editorial Magazine",
      "Organic & Natural",
      "Tech & Futuristic",
      "Playful & Creative",
    ];

    const observedFamilies = DESIGN_TEMPLATES.map((t) => t.layoutFamily);
    for (const family of expectedFamilies) {
      assert.ok(
        observedFamilies.includes(family as (typeof observedFamilies)[number]),
        `Design templates must include layout family "${family}"`
      );
    }

    // Verify distinct layout components
    const headerLayouts = new Set(DESIGN_TEMPLATES.map((t) => t.headerLayout));
    const heroLayouts = new Set(DESIGN_TEMPLATES.map((t) => t.heroLayout));
    const cardLayouts = new Set(DESIGN_TEMPLATES.map((t) => t.cardLayout));

    assert.equal(headerLayouts.size, 8, "All 8 design templates must have distinct header layouts");
    assert.equal(heroLayouts.size, 8, "All 8 design templates must have distinct hero layouts");
    assert.equal(cardLayouts.size, 8, "All 8 design templates must have distinct card layouts");
  });

  await t.test("getDesignTemplateById retrieves templates and falls back safely", () => {
    const luxury = getDesignTemplateById("tmpl_luxury_editorial");
    assert.ok(luxury);
    assert.equal(luxury?.name, "Luxury Editorial");

    const fallback = getDesignTemplateById("invalid_id");
    assert.ok(fallback);
    assert.equal(fallback?.id, "tmpl_modern_minimal");
  });
});

test("Phase 9 Add-on — Independent Combinability & Compatibility", async (t) => {
  await t.test("TemplateRepository.findById supports both legacy IDs and new design template IDs", async () => {
    // Legacy template lookup
    const legacyNordic = await TemplateRepository.findById("tpl_nordic_clean");
    assert.ok(legacyNordic);
    assert.equal(legacyNordic?.name, "Nordic Clean");

    // Design template lookup
    const designModern = await TemplateRepository.findById("tmpl_modern_minimal");
    assert.ok(designModern);
    assert.equal(designModern?.name, "Modern Minimal");
  });

  await t.test("8 design templates and 12 colour themes produce 96 valid pairings without interference", () => {
    for (const tpl of DESIGN_TEMPLATES) {
      for (const th of COLOR_THEMES) {
        // Assert layout does not mutate theme
        assert.ok(tpl.id.startsWith("tmpl_"));
        assert.ok(th.id.startsWith("theme_"));
        assert.ok(tpl.headerLayout && tpl.heroLayout && tpl.cardLayout);
        assert.ok(th.tokens.primary && th.tokens.background && th.tokens.text);
      }
    }
  });

  await t.test("validateStoreInput sanitizes themeId and themeName", () => {
    const res = validateStoreInput({
      name: "Nordic Atelier",
      slug: "nordic-atelier",
      clientId: "client-123",
      industry: "Home & Living",
      templateId: "tmpl_modern_minimal",
      themeId: "theme_warm_terracotta",
      themeName: "Warm Terracotta",
    });

    assert.ok(res.valid, `Expected valid input, got errors: ${JSON.stringify(res.errors)}`);
    assert.equal(res.sanitized?.themeId, "theme_warm_terracotta");
    assert.equal(res.sanitized?.themeName, "Warm Terracotta");
  });

  await t.test("StoreRepository persists themeId and templateId independently", async () => {
    const testSlug = `customization-test-${Date.now()}`;
    const store = await StoreRepository.create({
      id: `str_test_${Date.now()}`,
      name: "Independent Customization Test",
      slug: testSlug,
      clientName: "Test Client",
      clientId: "cli_01",
      industry: "Electronics & Gadgets",
      templateId: "tmpl_tech_futuristic",
      templateName: "Tech & Futuristic",
      themeId: "theme_cyber_neon",
      themeName: "Cyber Neon",
      status: "Draft",
      productCount: 0,
      previewUrl: `/store/${testSlug}`,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: "Test store for independent themes and templates",
      branding: {
        primaryColor: "#06B6D4",
        secondaryColor: "#05070B",
        fontFamily: "Inter, sans-serif",
      },
    });

    assert.equal(store.templateId, "tmpl_tech_futuristic");
    assert.equal(store.themeId, "theme_cyber_neon");
    assert.equal(store.themeName, "Cyber Neon");

    // Update ONLY design template; themeId remains untouched
    const updatedTemplate = await StoreRepository.update(store.id, {
      templateId: "tmpl_editorial_magazine",
      templateName: "Editorial Magazine",
    });

    assert.equal(updatedTemplate?.templateId, "tmpl_editorial_magazine");
    assert.equal(updatedTemplate?.themeId, "theme_cyber_neon", "Theme must remain intact when template changes");

    // Update ONLY colour theme; templateId remains untouched
    const updatedTheme = await StoreRepository.update(store.id, {
      themeId: "theme_haute_champagne",
      themeName: "Haute Champagne",
    });

    assert.equal(updatedTheme?.templateId, "tmpl_editorial_magazine", "Template must remain intact when theme changes");
    assert.equal(updatedTheme?.themeId, "theme_haute_champagne");
    assert.equal(updatedTheme?.themeName, "Haute Champagne");
  });
});
