import test from "node:test";
import assert from "node:assert/strict";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { resolveStoreSections } from "@/lib/sections/resolver";
import { getDefaultSectionInstance } from "@/constants/sections";
import { Store } from "@/types/store";
import { SectionInstance } from "@/types/section";

test("Full E2E Journey: Store Customizer, Preview & Subdomain Consistency", async (t) => {
  const storeId = `str_e2e_customizer_${Date.now()}`;
  const slug = `e2e-aurora-${Date.now()}`;

  let createdStore: Store;

  await t.test("Step 1: Store creation with default synthesized sections and branding", async () => {
    const storeRecord: Store = {
      id: storeId,
      name: "Aurora Design Studio",
      slug,
      clientId: "cli_01",
      clientName: "Aurora Living Inc",
      industry: "Home & Living",
      templateId: "tmpl_modern_minimal",
      templateName: "Modern Minimal",
      themeId: "theme_nordic_pine",
      themeName: "Nordic Pine",
      status: "Draft",
      productCount: 4,
      description: "Aurora Design Studio provides modern minimalist interiors and curated furniture.",
      previewUrl: `/store/${slug}`,
      localUrl: `http://${slug}.localhost:3000`,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      branding: {
        primaryColor: "#176B4D",
        secondaryColor: "#FAF9F6",
        fontFamily: "Inter, sans-serif",
        heroHeadline: "Welcome to Aurora Design Studio",
        heroSubheadline: "Curated architectural collection designed for modern living.",
        ctaText: "Explore Catalog",
        aboutText: "Designed exclusively for Aurora Living Inc.",
      },
      enabledSections: ["hero", "featured_products", "about", "newsletter", "footer"],
      orderedSections: ["hero", "featured_products", "about", "newsletter", "footer"],
      styling: {
        buttonRadius: "rounded",
        cardStyle: "bordered",
        contentWidth: "normal",
      },
    };

    // Store is created in database
    createdStore = await StoreRepository.create(storeRecord);
    assert.ok(createdStore, "Store should be created");
    assert.equal(createdStore.status, "Draft");

    // Resolving initial store sections
    const initialSections = resolveStoreSections(createdStore);
    assert.equal(initialSections.length, 5, "Should synthesize 5 initial sections");
    assert.equal(initialSections[0].type, "hero_split");
    assert.equal(initialSections[0].visible, true);
  });

  await t.test("Step 2 & 3: Hero banner image upload and immediate visual preview synchronization", async () => {
    const uploadedBannerUrl = "/uploads/stores/aurora-hero-2026.webp";

    // 1. Simulating banner upload via media endpoint (/api/stores/[id]/media)
    const updatedStore = await StoreRepository.update(storeId, {
      branding: {
        bannerUrl: uploadedBannerUrl,
      },
    });

    assert.ok(updatedStore);
    assert.equal(updatedStore.branding?.bannerUrl, uploadedBannerUrl);

    // 2. Verify resolveStoreSections backfills the uploaded banner to the hero section
    const previewSections = resolveStoreSections(updatedStore);
    const heroSection = previewSections.find((s) => s.type.startsWith("hero_"));
    assert.ok(heroSection, "Hero section should exist in preview sections");
    assert.equal(
      heroSection.settings.imageUrl,
      uploadedBannerUrl,
      "Hero section imageUrl must match uploaded banner"
    );
    assert.equal(
      heroSection.settings.backgroundImageUrl,
      uploadedBannerUrl,
      "Hero section backgroundImageUrl must match uploaded banner"
    );
  });

  await t.test("Step 4 & 5: Adding new modular sections via SectionManager in customizer", async () => {
    const currentStore = await StoreRepository.findById(storeId);
    assert.ok(currentStore);

    const baseSections = resolveStoreSections(currentStore);

    // Add Section 1: benefits_grid (Why Choose Us)
    const benefits = getDefaultSectionInstance("benefits_grid", baseSections.length);
    benefits.settings = {
      headline: "Artisanal Integrity",
      subheadline: "Every piece is thoughtfully engineered with circular materials.",
    };

    // Add Section 2: faq_accordion (Common Inquiries)
    const faq = getDefaultSectionInstance("faq_accordion", baseSections.length + 1);
    faq.settings = {
      headline: "Customer Inquiries",
      faqs: [
        { question: "Where is the showroom located?", answer: "Bangalore, India." },
        { question: "What is your dispatch lead time?", answer: "Dispatches within 48 hours." },
      ],
    };

    // Add Section 3: trust_badges (Trust & Certifications)
    const trust = getDefaultSectionInstance("trust_badges", baseSections.length + 2);
    trust.layoutVariant = "cards_grid";

    const newSections: SectionInstance[] = [...baseSections, benefits, faq, trust];
    assert.equal(newSections.length, 8, "Should now have 8 section instances");

    // Persist customizer changes (mimicking handleSaveChanges)
    const saved = await StoreRepository.update(storeId, {
      sections: newSections,
      orderedSections: newSections.map((s) => s.type),
      enabledSections: newSections.map((s) => s.type),
    });

    assert.ok(saved);
    assert.equal(saved.sections?.length, 8, "All 8 sections must be persisted in database");
    assert.equal(saved.sections[5].type, "benefits_grid");
    assert.equal(saved.sections[6].type, "faq_accordion");
    assert.equal(saved.sections[7].type, "trust_badges");
  });

  await t.test("Step 6: Editing content (Headline, Subheadline, CTA, About text) in customizer", async () => {
    const updated = await StoreRepository.update(storeId, {
      branding: {
        heroHeadline: "Architectural Clarity for Elevated Living",
        heroSubheadline: "Sustainably crafted Scandinavian minimalism.",
        ctaText: "Shop the 2026 Collection",
        aboutText: "Aurora Living balances serene geometry with tactile Indian craftsmanship.",
      },
    });

    assert.ok(updated);
    assert.equal(updated.branding?.heroHeadline, "Architectural Clarity for Elevated Living");
    assert.equal(updated.branding?.ctaText, "Shop the 2026 Collection");

    const resolved = resolveStoreSections(updated);
    const hero = resolved.find((s) => s.type.startsWith("hero_"));
    assert.ok(hero);
    assert.equal(hero.settings.headline, "Architectural Clarity for Elevated Living");
    assert.equal(hero.settings.subheadline, "Sustainably crafted Scandinavian minimalism.");
    assert.equal(hero.settings.ctaText, "Shop the 2026 Collection");

    const about = resolved.find((s) => s.type === "brand_story");
    assert.ok(about);
    assert.equal(about.settings.bodyParagraph1, "Aurora Living balances serene geometry with tactile Indian craftsmanship.");
  });

  await t.test("Step 7 & 8: Publishing store and validating published subdomain consistency", async () => {
    // Transition to Published (mimicking Save & Republish / Publish Store)
    const publishedStore = await StoreRepository.update(storeId, {
      status: "Published",
    });

    assert.ok(publishedStore);
    assert.equal(publishedStore.status, "Published");

    // Query published store by slug as done by /store/[slug] and subdomain middleware
    const loadedStore = await StoreRepository.findBySlug(slug);
    assert.ok(loadedStore, "Published store must be resolvable by slug");
    assert.equal(loadedStore.status, "Published");
    assert.equal(loadedStore.branding?.bannerUrl, "/uploads/stores/aurora-hero-2026.webp");
    assert.equal(loadedStore.branding?.heroHeadline, "Architectural Clarity for Elevated Living");

    // Verify sections loaded on published store
    const publishedSections = resolveStoreSections(loadedStore);
    assert.equal(publishedSections.length, 8, "Published store must render all 8 sections");

    // Verify hero section on published store has the banner image
    const publishedHero = publishedSections.find((s) => s.type.startsWith("hero_"));
    assert.ok(publishedHero);
    assert.equal(publishedHero.settings.imageUrl, "/uploads/stores/aurora-hero-2026.webp");
    assert.equal(publishedHero.settings.headline, "Architectural Clarity for Elevated Living");

    // Verify custom added sections exist on published store
    const publishedBenefits = publishedSections.find((s) => s.type === "benefits_grid");
    assert.ok(publishedBenefits, "Benefits grid must exist on published store");
    assert.equal(publishedBenefits.settings.headline, "Artisanal Integrity");

    const publishedFaq = publishedSections.find((s) => s.type === "faq_accordion");
    assert.ok(publishedFaq, "FAQ accordion must exist on published store");
    assert.equal(publishedFaq.settings.headline, "Customer Inquiries");

    const publishedTrust = publishedSections.find((s) => s.type === "trust_badges");
    assert.ok(publishedTrust, "Trust & Certifications section must exist on published store");
    assert.equal(publishedTrust.layoutVariant, "cards_grid");
    assert.ok(Array.isArray(publishedTrust.settings.badges));
    assert.ok(publishedTrust.settings.badges.length >= 4);
  });

  await t.test("Step 9: Clean up test store", async () => {
    const deleted = await StoreRepository.delete(storeId);
    assert.equal(deleted, true);
  });
});
