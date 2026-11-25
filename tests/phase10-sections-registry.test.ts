import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { ALL_SECTION_DEFINITIONS, getSectionDefinition, getDefaultSectionInstance } from "../src/constants/sections";
import { resolveStoreSections } from "../src/lib/sections/resolver";
import { validateStoreInput } from "../src/lib/validation/store";
import { Store } from "../src/types/store";
import { SectionInstance, SectionType } from "../src/types/section";

describe("Phase 10 — Section System Registry & Resolution", () => {
  it("defines all 30 expected sections across 5 functional categories", () => {
    assert.equal(ALL_SECTION_DEFINITIONS.length, 30);

    const categories = new Set(ALL_SECTION_DEFINITIONS.map((d) => d.category));
    assert.deepEqual(Array.from(categories).sort(), [
      "editorial",
      "footer",
      "hero",
      "info",
      "products",
    ]);
  });

  it("retrieves individual section definitions by SectionType", () => {
    const heroFull = getSectionDefinition("hero_full_width");
    assert.ok(heroFull);
    assert.equal(heroFull.name, "Full-Width Hero");
    assert.equal(heroFull.category, "hero");
    assert.ok(heroFull.availableLayouts.length > 0);

    const faq = getSectionDefinition("faq_accordion");
    assert.ok(faq);
    assert.equal(faq.category, "info");

    const stats = getSectionDefinition("verified_statistics_bar");
    assert.ok(stats);
    assert.equal(stats.category, "info");
    assert.equal(stats.name, "Verified Statistics Bar");

    const unknown = getSectionDefinition("non_existent_section" as unknown as SectionType);
    assert.equal(unknown, undefined);
  });

  it("generates default section instances with unique IDs and initial settings", () => {
    const instance1 = getDefaultSectionInstance("hero_full_width", 0);
    assert.ok(instance1.id);
    assert.equal(instance1.type, "hero_full_width");
    assert.equal(instance1.order, 0);
    assert.equal(instance1.visible, true);
    assert.ok(instance1.settings);

    const instance2 = getDefaultSectionInstance("featured_products", 1);
    assert.notEqual(instance1.id, instance2.id);
    assert.equal(instance2.order, 1);
  });

  it("resolves legacy Phase 1-9 stores into backward-compatible section instances", () => {
    const legacyStore: Partial<Store> = {
      id: "legacy_store_1",
      name: "Legacy Atelier",
      slug: "legacy-atelier",
      industry: "Fashion & Apparel",
      branding: {
        primaryColor: "#176B4D",
        secondaryColor: "#FAF9F6",
        fontFamily: "Inter",
        heroHeadline: "Timeless Minimalist Essentials",
        heroSubheadline: "Handcrafted sustainable garments",
        aboutText: "Founded in 2024 to deliver ethical luxury.",
        ctaText: "Shop the Collection",
        bannerUrl: "/uploads/stores/banner.jpg",
        logoUrl: "/uploads/stores/logo.svg",
      },
      orderedSections: ["hero", "about", "products", "testimonials", "contact"],
      enabledSections: ["hero", "about", "products", "contact"],
    };

    const resolved = resolveStoreSections(legacyStore as Store);
    assert.ok(resolved.length >= 4);

    // Hero section has legacy copy mapped
    const heroSection = resolved.find((s) => s.type === "hero_split");
    assert.ok(heroSection);
    assert.equal(heroSection.settings.headline, "Timeless Minimalist Essentials");
    assert.equal(heroSection.settings.subheadline, "Handcrafted sustainable garments");
    assert.equal(heroSection.settings.ctaText, "Shop the Collection");
    assert.equal(heroSection.settings.imageUrl, "/uploads/stores/banner.jpg");

    // About section has legacy about text mapped
    const aboutSection = resolved.find((s) => s.type === "brand_story");
    assert.ok(aboutSection);
    assert.equal(aboutSection.settings.bodyParagraph1, "Founded in 2024 to deliver ethical luxury.");

    // Visible property is set
    assert.equal(heroSection.visible, true);
  });

  it("preserves explicit Phase 10 sections when already defined on store", () => {
    const customSections: SectionInstance[] = [
      {
        id: "sec_hero_1",
        type: "hero_cinematic",
        order: 0,
        visible: true,
        settings: {
          headline: "Avant-Garde Architecture",
          ctaText: "Discover Pieces",
        },
      },
      {
        id: "sec_lookbook_2",
        type: "lookbook_gallery",
        order: 1,
        visible: true,
        settings: {
          title: "Autumn Lookbook 2026",
        },
      },
      {
        id: "sec_faq_3",
        type: "faq_accordion",
        order: 2,
        visible: false,
        settings: {},
      },
    ];

    const storeWithSections: Partial<Store> = {
      id: "modern_store_2",
      name: "Modern Atelier",
      slug: "modern-atelier",
      sections: customSections,
    };

    const resolved = resolveStoreSections(storeWithSections as Store);
    assert.equal(resolved.length, 3);
    assert.equal(resolved[0].type, "hero_cinematic");
    assert.equal(resolved[1].type, "lookbook_gallery");
    assert.equal(resolved[2].visible, false);
  });

  it("sanitizes and validates section instances during store updates", () => {
    const rawInput = {
      name: "Sample Atelier",
      slug: "sample-atelier",
      clientId: "client_123",
      industry: "Fashion & Apparel",
      templateId: "tpl_nordic_clean",
      sections: [
        {
          id: "custom_sec_1",
          type: "hero_split",
          order: 0,
          visible: true,
          settings: {
            headline: "Summer Release",
            primaryButtonText: "Explore Now",
          },
        },
        {
          id: "",
          type: "invalid_section_type_xyz",
          order: 1,
        },
      ],
      styling: {
        buttonRadius: "rounded",
        cardStyle: "bordered",
        headerSticky: true,
      },
    };

    const result = validateStoreInput(rawInput as unknown as Store);
    assert.ok(result.valid);
    assert.ok(result.sanitized);
    assert.ok(result.sanitized.sections);
    assert.equal(result.sanitized.sections.length, 1);
    assert.equal(result.sanitized.sections[0].type, "hero_split");
    assert.equal(result.sanitized.sections[0].settings.headline, "Summer Release");
    assert.equal(result.sanitized.styling?.buttonRadius, "rounded");
    assert.equal(result.sanitized.styling?.headerSticky, true);
  });
});
