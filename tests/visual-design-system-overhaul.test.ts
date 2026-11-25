import { describe, it } from "node:test";
import assert from "node:assert";
import { DESIGN_TEMPLATES } from "../src/constants/design-templates";
import { COLOR_THEMES } from "../src/constants/themes";
import { resolveStoreSections } from "../src/lib/sections/resolver";
import { Store } from "../src/types/store";
import { StoreRepository } from "../src/lib/repositories/store.repository";

describe("Visual Design System & Customizer Compatibility Verification", () => {
  it("verifies all 8 design templates have valid layout families and component slots", () => {
    assert.strictEqual(DESIGN_TEMPLATES.length, 8);
    for (const tmpl of DESIGN_TEMPLATES) {
      assert.ok(tmpl.id.startsWith("tmpl_"));
      assert.ok(tmpl.name.length > 0);
      assert.ok(tmpl.headerLayout, `Template ${tmpl.id} missing headerLayout`);
      assert.ok(tmpl.heroLayout, `Template ${tmpl.id} missing heroLayout`);
      assert.ok(tmpl.cardLayout, `Template ${tmpl.id} missing cardLayout`);
    }
  });

  it("verifies all 12 color themes contain complete coordinated color tokens", () => {
    assert.strictEqual(COLOR_THEMES.length, 12);
    for (const theme of COLOR_THEMES) {
      assert.ok(theme.id.startsWith("theme_"));
      assert.ok(theme.tokens.primary.startsWith("#"));
      assert.ok(theme.tokens.background.startsWith("#"));
      assert.ok(theme.tokens.surface.startsWith("#"));
      assert.ok(theme.tokens.text.startsWith("#"));
      assert.ok(theme.tokens.border.startsWith("#"));
      assert.ok(theme.tokens.cardBg.startsWith("#"));
      assert.ok(theme.tokens.badgeBg.startsWith("#"));
      assert.ok(theme.tokens.badgeText.startsWith("#"));
    }
  });

  it("resolves tailored sections for lead_gen website type without e-commerce artifacts", () => {
    const leadGenStore: Store = {
      id: "test_lead_gen_01",
      name: "Apex Strategy Group",
      slug: "apex-strategy",
      industry: "Electronics & Gadgets",
      websiteType: "lead_gen",
      templateId: "tmpl_modern_minimal",
      templateName: "Modern Minimal",
      themeId: "theme_nordic_pine",
      themeName: "Nordic Pine",
      status: "Draft",
      productCount: 0,
      description: "Apex Strategy Group consultation services",
      lastUpdated: new Date().toISOString(),
      clientId: "client_1",
      clientName: "Apex Partners",
      createdAt: new Date().toISOString(),
    };

    const sections = resolveStoreSections(leadGenStore);
    assert.ok(sections.length >= 4);

    // Lead gen sections must NOT include product catalog
    const productSections = sections.filter((s) => s.type === "featured_products" || s.type === "bestsellers_grid");
    assert.strictEqual(productSections.length, 0);

    // Hero section must point CTA to #inquiry-form
    const heroSection = sections.find((s) => s.type === "hero_full_width" || s.type.startsWith("hero_"));
    assert.ok(heroSection);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heroSettings = heroSection.settings as Record<string, any>;
    assert.strictEqual(heroSettings.ctaUrl, "#inquiry-form");
    assert.strictEqual(heroSettings.ctaText, "Request Consultation");
  });

  it("resolves tailored sections for appointments website type with booking CTAs", () => {
    const apptStore: Store = {
      id: "test_appt_01",
      name: "Chambers Legal Advisory",
      slug: "chambers-legal",
      industry: "Health & Wellness",
      websiteType: "appointments",
      templateId: "tmpl_luxury_editorial",
      templateName: "Luxury Editorial",
      themeId: "theme_obsidian_slate",
      themeName: "Obsidian Slate",
      status: "Draft",
      productCount: 0,
      description: "Chambers Legal Advisory appointments",
      lastUpdated: new Date().toISOString(),
      clientId: "client_2",
      clientName: "Chambers LLP",
      createdAt: new Date().toISOString(),
    };

    const sections = resolveStoreSections(apptStore);
    assert.ok(sections.length >= 4);

    // Must NOT have product sections
    const productSections = sections.filter((s) => s.type === "featured_products");
    assert.strictEqual(productSections.length, 0);

    // Hero must point to booking section
    const heroSection = sections.find((s) => s.type.startsWith("hero_"));
    assert.ok(heroSection);
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const heroSettings = heroSection.settings as Record<string, any>;
    assert.strictEqual(heroSettings.ctaUrl, "#booking-section");
    assert.strictEqual(heroSettings.ctaText, "Book Consultation");
  });

  it("persists styling tokens including formStyle and shadowScale via StoreRepository", async () => {
    const storeId = "visual-verify-" + Date.now();
    const store = await StoreRepository.create({
      id: storeId,
      name: "Visual Verification Store",
      slug: storeId,
      clientId: "client_v",
      clientName: "Design Lab",
      industry: "Electronics & Gadgets",
      websiteType: "lead_gen",
      templateId: "tmpl_modern_minimal",
      templateName: "Modern Minimal",
      themeId: "theme_nordic_pine",
      themeName: "Nordic Pine",
      status: "Draft",
      productCount: 0,
      description: "Visual verification store",
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      styling: {
        buttonRadius: "pill",
        cardStyle: "elevated",
        contentWidth: "wide",
        formStyle: "filled",
        shadowScale: "medium",
      },
    });

    assert.ok(store);
    assert.strictEqual(store.styling?.formStyle, "filled");
    assert.strictEqual(store.styling?.shadowScale, "medium");
    assert.strictEqual(store.styling?.buttonRadius, "pill");

    const updated = await StoreRepository.update(store.id, {
      styling: {
        ...store.styling,
        formStyle: "bordered",
        shadowScale: "dramatic",
      },
    });

    assert.strictEqual(updated?.styling?.formStyle, "bordered");
    assert.strictEqual(updated?.styling?.shadowScale, "dramatic");

    // Cleanup
    await StoreRepository.delete(store.id);
  });
});
