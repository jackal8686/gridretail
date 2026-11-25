import test from "node:test";
import assert from "node:assert/strict";
import { IndustrySectionRecommender } from "../src/lib/generation/recommender";
import { BusinessProfile } from "../src/types/business-profile";
import { SECTION_DEFINITIONS } from "../src/constants/sections";
import { DESIGN_TEMPLATES } from "../src/constants/design-templates";
import { COLOR_THEMES } from "../src/constants/themes";
import { SectionType } from "../src/types/section";

test("Phase 16 — Industry Section Recommendation Engine Suite", async (t) => {
  const recommender = new IndustrySectionRecommender();

  await t.test("1. Scenario 1 — Restaurant (Lead Gen) Recommendation", () => {
    const profile: BusinessProfile = {
      businessName: "Osteria Valenza",
      industry: "Food & Gourmet",
      businessCategory: "Italian Fine Dining & Enogastronomy",
      description: "Artisanal scratch pasta and regional Italian wines.",
      websiteType: "lead_gen",
      primaryGoal: "generate_leads",
      visualStyle: "editorial_story",
    };

    const design = recommender.recommendDesignSystem(profile);
    assert.equal(design.templateId, "tmpl_editorial_magazine");
    assert.equal(design.themeId, "theme_warm_terracotta");
    assert.equal(design.ctaText, "Request a Reservation");
    assert.equal(design.ctaUrl, "#inquiry-form");

    const sections = recommender.recommendSections(profile);
    const types = sections.map((s) => s.type);

    // Assert recommended sections match dining scenario
    assert.ok(types.includes("hero_cinematic") || types.includes("hero_split"));
    assert.ok(types.includes("lifestyle_editorial_grid"));
    assert.ok(types.includes("brand_story"));
    assert.ok(types.includes("how_it_works"));
    assert.ok(types.includes("contact_info"));
    assert.ok(types.includes("footer_custom"));

    // Assert incompatible e-commerce sections are excluded
    assert.equal(types.includes("shipping_returns"), false);
    assert.equal(types.includes("product_comparison"), false);
  });

  await t.test("2. Scenario 2 — Law Firm (Lead Gen) Recommendation", () => {
    const profile: BusinessProfile = {
      businessName: "Sterling & Vance LLP",
      industry: "Legal Practice & Advisory",
      businessCategory: "Corporate Governance & Litigation",
      description: "Strategic commercial litigation and dispute advisory.",
      websiteType: "lead_gen",
      primaryGoal: "generate_leads",
      brandPersonality: "authoritative",
    };

    const design = recommender.recommendDesignSystem(profile);
    assert.equal(design.templateId, "tmpl_luxury_editorial");
    assert.equal(design.themeId, "theme_monochrome_ink");
    assert.equal(design.ctaText, "Request Consultation");
    assert.equal(design.ctaUrl, "#inquiry-form");
    assert.equal(design.styling.buttonRadius, "sharp");

    const sections = recommender.recommendSections(profile);
    const types = sections.map((s) => s.type);

    assert.ok(types.includes("hero_split"));
    assert.ok(types.includes("benefits_grid"));
    assert.ok(types.includes("brand_story"));
    assert.ok(types.includes("how_it_works"));
    assert.ok(types.includes("brand_values"));
    assert.ok(types.includes("faq_accordion"));
    assert.ok(types.includes("contact_info"));
    assert.ok(types.includes("footer_custom"));

    // Confirm every section has a human-readable rationale
    for (const s of sections) {
      assert.ok(s.rationale && s.rationale.length > 5, `Section ${s.type} must have rationale`);
    }
  });

  await t.test("3. Scenario 3 — Fitness Studio (Appointments) Recommendation", () => {
    const profile: BusinessProfile = {
      businessName: "Apex Athletic Conditioning",
      industry: "Health & Wellness",
      businessCategory: "High-Performance Strength Studio",
      description: "Evidence-based conditioning and tailored training.",
      websiteType: "appointments",
      primaryGoal: "book_appointments",
      visualStyle: "bold_assertive",
    };

    const design = recommender.recommendDesignSystem(profile);
    assert.equal(design.templateId, "tmpl_bold_vibrant");
    assert.equal(design.ctaText, "Book a Session");
    assert.equal(design.ctaUrl, "#booking-section");

    const sections = recommender.recommendSections(profile);
    const types = sections.map((s) => s.type);

    assert.ok(types.includes("hero_split"));
    assert.ok(types.includes("benefits_grid"));
    assert.ok(types.includes("brand_story"));
    assert.ok(types.includes("how_it_works"));
    assert.ok(types.includes("faq_accordion"));
    assert.ok(types.includes("contact_info"));

    // Incompatible e-commerce sections must not be present
    assert.equal(types.includes("shipping_returns"), false);
    assert.equal(types.includes("new_arrivals"), false);
  });

  await t.test("4. Scenario 4 — Clothing Store (E-Commerce) Recommendation", () => {
    const profile: BusinessProfile = {
      businessName: "Nordic Atelier",
      industry: "Fashion & Apparel",
      businessCategory: "Organic Ready-to-Wear",
      description: "Sustainable minimalist clothing handcrafted in small batches.",
      websiteType: "ecommerce",
      primaryGoal: "sell_products",
    };

    const design = recommender.recommendDesignSystem(profile);
    assert.equal(design.ctaText, "Explore Catalog");
    assert.equal(design.ctaUrl, "#catalog");

    const sections = recommender.recommendSections(profile);
    const types = sections.map((s) => s.type);

    assert.ok(types.includes("featured_products"));
    assert.ok(types.includes("collection_showcase"));
    assert.ok(types.includes("brand_story"));
    assert.ok(types.includes("trust_badges"));
    assert.ok(types.includes("shipping_returns"));
    assert.ok(types.includes("newsletter_signup"));
  });

  await t.test("5. Scenario 5 — Software Company (Lead Gen) Recommendation", () => {
    const profile: BusinessProfile = {
      businessName: "Krypton Systems",
      industry: "Electronics & Gadgets",
      businessCategory: "Enterprise Workflow SaaS",
      description: "High-reliability workflow automation platform.",
      websiteType: "lead_gen",
      primaryGoal: "generate_leads",
      visualStyle: "tech_futuristic",
    };

    const design = recommender.recommendDesignSystem(profile);
    assert.equal(design.templateId, "tmpl_tech_futuristic");
    assert.equal(design.themeId, "theme_obsidian_slate");
    assert.equal(design.ctaText, "Request a Demo");
    assert.equal(design.ctaUrl, "#inquiry-form");

    const sections = recommender.recommendSections(profile);
    const types = sections.map((s) => s.type);

    assert.ok(types.includes("hero_split"));
    assert.ok(types.includes("benefits_grid"));
    assert.ok(types.includes("how_it_works"));
    assert.ok(types.includes("faq_accordion"));
    assert.ok(types.includes("contact_info"));
  });

  await t.test("6. All recommended sections belong strictly to the 30 registered section types", () => {
    const profiles: BusinessProfile[] = [
      { businessName: "Test Law", industry: "Legal Practice & Advisory", businessCategory: "Law", websiteType: "lead_gen" },
      { businessName: "Test Gym", industry: "Health & Wellness", businessCategory: "Gym", websiteType: "appointments" },
      { businessName: "Test Shop", industry: "Home & Living", businessCategory: "Decor", websiteType: "ecommerce" },
      { businessName: "Test Tech", industry: "Electronics & Gadgets", businessCategory: "Robotics", websiteType: "lead_gen" },
    ];

    for (const p of profiles) {
      const recs = recommender.recommendSections(p);
      for (const r of recs) {
        assert.ok(
          SECTION_DEFINITIONS[r.type as SectionType],
          `Section type "${r.type}" must be a registered section definition`
        );
      }
    }
  });

  await t.test("7. All recommended design templates resolve strictly to the 8 canonical DESIGN_TEMPLATES", () => {
    const validTemplateIds = new Set(DESIGN_TEMPLATES.map((t) => t.id));
    assert.equal(validTemplateIds.size, 8, "Must have exactly 8 canonical design templates");

    const profiles: BusinessProfile[] = [
      { businessName: "L1", industry: "Legal Practice & Advisory", businessCategory: "Law", websiteType: "lead_gen" },
      { businessName: "F1", industry: "Health & Wellness", businessCategory: "Gym", websiteType: "appointments" },
      { businessName: "R1", industry: "Food & Gourmet", businessCategory: "Dining", websiteType: "lead_gen" },
      { businessName: "C1", industry: "Fashion & Apparel", businessCategory: "Apparel", websiteType: "ecommerce" },
      { businessName: "S1", industry: "Electronics & Gadgets", businessCategory: "SaaS", websiteType: "lead_gen" },
      { businessName: "M1", industry: "Home & Living", businessCategory: "Furniture", websiteType: "ecommerce" },
    ];

    for (const p of profiles) {
      const ds = recommender.recommendDesignSystem(p);
      assert.ok(
        validTemplateIds.has(ds.templateId),
        `Template "${ds.templateId}" for ${p.businessCategory} must be one of the 8 canonical templates`
      );
    }
  });

  await t.test("8. All recommended color themes resolve strictly to the 12 canonical COLOR_THEMES", () => {
    const validThemeIds = new Set(COLOR_THEMES.map((th) => th.id));
    assert.equal(validThemeIds.size, 12, "Must have exactly 12 canonical color themes");

    const profiles: BusinessProfile[] = [
      { businessName: "L1", industry: "Legal Practice & Advisory", businessCategory: "Law", websiteType: "lead_gen" },
      { businessName: "F1", industry: "Health & Wellness", businessCategory: "Gym", websiteType: "appointments" },
      { businessName: "R1", industry: "Food & Gourmet", businessCategory: "Dining", websiteType: "lead_gen" },
      { businessName: "C1", industry: "Fashion & Apparel", businessCategory: "Apparel", websiteType: "ecommerce" },
      { businessName: "S1", industry: "Electronics & Gadgets", businessCategory: "SaaS", websiteType: "lead_gen" },
      { businessName: "M1", industry: "Home & Living", businessCategory: "Furniture", websiteType: "ecommerce" },
    ];

    for (const p of profiles) {
      const ds = recommender.recommendDesignSystem(p);
      assert.ok(
        validThemeIds.has(ds.themeId),
        `Theme "${ds.themeId}" for ${p.businessCategory} must be one of the 12 canonical themes`
      );
    }
  });

  await t.test("9. Preserves merchant custom color overrides without corrupting theme resolution", () => {
    const customProfile: BusinessProfile = {
      businessName: "Neon Robotics",
      industry: "Electronics & Gadgets",
      businessCategory: "Industrial Automation",
      websiteType: "lead_gen",
      primaryColor: "#06B6D4",
      secondaryColor: "#1E293B",
    };

    const ds = recommender.recommendDesignSystem(customProfile);
    assert.equal(ds.themeId, "theme_obsidian_slate");
    assert.ok(COLOR_THEMES.find((th) => th.id === ds.themeId));
  });

  await t.test("10. Rejects unknown or corrupted template and theme IDs gracefully", () => {
    const invalidProfile: BusinessProfile = {
      businessName: "Fallback Check",
      industry: "Unknown Sector",
      businessCategory: "Undefined Entity",
      websiteType: "lead_gen",
    };

    const ds = recommender.recommendDesignSystem(invalidProfile);
    assert.equal(ds.templateId, "tmpl_modern_minimal", "Must fall back to safe default template");
    assert.equal(ds.themeId, "theme_nordic_pine", "Must fall back to safe default theme");
  });
});
