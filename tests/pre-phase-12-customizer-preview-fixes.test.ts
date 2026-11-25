import test from "node:test";
import assert from "node:assert/strict";
import { resolveStoreSections } from "@/lib/sections/resolver";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { getDefaultSectionInstance } from "@/constants/sections";
import { Store } from "@/types/store";

test("Pre-Phase-12 Customizer & Preview Fixes Suite", async (t) => {
  const storeId = `str_test_${Date.now()}`;
  const slug = `preview-fix-${Date.now()}`;

  await t.test("1. resolveStoreSections populates hero images from branding.bannerUrl when sections are synthesized", () => {
    const store: Partial<Store> = {
      name: "Nordic Living Co",
      slug: "nordic-living",
      industry: "Home & Living",
      branding: {
        primaryColor: "#176B4D",
        fontFamily: "Inter, sans-serif",
        bannerUrl: "/uploads/stores/banner-nordic-1.jpg",
        heroHeadline: "Minimalist Scandinavian Living",
        heroSubheadline: "Handcrafted furniture and timeless decor.",
        ctaText: "Discover Pieces",
      },
      enabledSections: ["hero", "featured_products", "about", "newsletter", "footer"],
      orderedSections: ["hero", "featured_products", "about", "newsletter", "footer"],
    };

    const resolved = resolveStoreSections(store);
    assert.ok(resolved.length >= 5, "Should synthesize at least 5 sections");

    const hero = resolved.find((s) => s.type.startsWith("hero_"));
    assert.ok(hero, "Hero section should exist");
    assert.equal(hero.settings.imageUrl, "/uploads/stores/banner-nordic-1.jpg");
    assert.equal(hero.settings.backgroundImageUrl, "/uploads/stores/banner-nordic-1.jpg");
    assert.equal(hero.settings.headline, "Minimalist Scandinavian Living");
    assert.equal(hero.settings.subheadline, "Handcrafted furniture and timeless decor.");
    assert.equal(hero.settings.ctaText, "Discover Pieces");
  });

  await t.test("2. resolveStoreSections backfills hero sections when store has existing sections but empty image settings", () => {
    const heroSplit = getDefaultSectionInstance("hero_split", 0);
    heroSplit.settings = {
      headline: "Existing Headline",
      subheadline: "Existing Subheadline",
      imageUrl: "",
      backgroundImageUrl: "",
      bannerUrl: "",
    };

    const storeWithSections: Partial<Store> = {
      name: "Studio Craft",
      slug: "studio-craft",
      branding: {
        primaryColor: "#111827",
        fontFamily: "Inter, sans-serif",
        bannerUrl: "/uploads/stores/craft-banner-99.png",
      },
      sections: [heroSplit],
    };

    const resolved = resolveStoreSections(storeWithSections);
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].settings.imageUrl, "/uploads/stores/craft-banner-99.png");
    assert.equal(resolved[0].settings.backgroundImageUrl, "/uploads/stores/craft-banner-99.png");
  });

  await t.test("3. StoreRepository.update synchronizes hero sections with branding.bannerUrl", async () => {
    const initialHero = getDefaultSectionInstance("hero_full_width", 0);
    initialHero.settings = {
      headline: "Architectural Visions",
      backgroundImageUrl: "",
      imageUrl: "",
    };

    const customSection = getDefaultSectionInstance("benefits_grid", 1);
    customSection.settings = {
      headline: "Why Choose Us",
    };

    const newStore: Store = {
      id: storeId,
      name: "Aura Design Hub",
      slug,
      clientId: "client_99",
      clientName: "Aura Corp",
      industry: "Home & Living",
      templateId: "tmpl_modern_minimal",
      templateName: "Modern Minimal",
      themeId: "theme_nordic_pine",
      themeName: "Nordic Pine",
      status: "Draft",
      productCount: 0,
      description: "Aura Design Hub provides bespoke minimalist furniture.",
      previewUrl: `/store/${slug}`,
      localUrl: `http://${slug}.localhost:3000`,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      branding: {
        primaryColor: "#176B4D",
        fontFamily: "Inter, sans-serif",
        bannerUrl: "",
      },
      sections: [initialHero, customSection],
      orderedSections: ["hero", "benefits_grid"],
      enabledSections: ["hero", "benefits_grid"],
    };

    await StoreRepository.create(newStore);

    // Update with newly uploaded banner URL
    const updated = await StoreRepository.update(storeId, {
      branding: {
        bannerUrl: "/uploads/aura/hero-banner-new.webp",
      },
    });

    assert.ok(updated, "Store should update successfully");
    assert.equal(updated.branding?.bannerUrl, "/uploads/aura/hero-banner-new.webp");
    assert.ok(updated.sections && updated.sections.length === 2, "Sections should be preserved");

    const hero = updated.sections?.find((s) => s.type === "hero_full_width");
    assert.ok(hero, "Hero section should exist");
    assert.equal(hero.settings.imageUrl, "/uploads/aura/hero-banner-new.webp");
    assert.equal(hero.settings.backgroundImageUrl, "/uploads/aura/hero-banner-new.webp");
  });

  await t.test("4. Added custom sections persist in database and retain order and settings across status transitions", async () => {
    const faqSection = getDefaultSectionInstance("faq_accordion", 2);
    faqSection.settings = {
      headline: "Frequently Asked Questions",
      faqs: [{ question: "Do you ship worldwide?", answer: "Yes, complimentary express." }],
    };

    const existingStore = await StoreRepository.findById(storeId);
    assert.ok(existingStore);
    const updatedSections = [...(existingStore.sections || []), faqSection];

    // Save changes from customizer
    const saved = await StoreRepository.update(storeId, {
      sections: updatedSections,
      orderedSections: updatedSections.map((s) => s.type),
      enabledSections: updatedSections.map((s) => s.type),
    });

    assert.ok(saved);
    assert.equal(saved.sections?.length, 3, "Should have 3 sections after adding FAQ");
    const faq = saved.sections?.find((s) => s.type === "faq_accordion");
    assert.ok(faq, "FAQ section must be persisted in database");
    assert.equal(faq.settings.headline, "Frequently Asked Questions");

    // Publish store (Draft -> Published)
    const published = await StoreRepository.update(storeId, {
      status: "Published",
    });

    assert.ok(published);
    assert.equal(published.status, "Published");
    assert.equal(published.sections?.length, 3, "All 3 sections must remain intact after publishing");
    assert.equal(published.branding?.bannerUrl, "/uploads/aura/hero-banner-new.webp");
  });

  await t.test("5. Trust & Certifications section contains default badges and never resolves to empty or null", () => {
    const trustSec = getDefaultSectionInstance("trust_badges", 3);
    assert.ok(trustSec, "Trust section instance should be created");
    assert.equal(trustSec.type, "trust_badges");
    assert.ok(Array.isArray(trustSec.settings.badges), "Badges should be an array");
    assert.ok(trustSec.settings.badges.length >= 4, "Should have at least 4 default badges to prevent silent suppression");

    const storeWithTrust: Partial<Store> = {
      name: "Botanical Standard",
      slug: "botanical-standard",
      sections: [trustSec],
    };

    const resolved = resolveStoreSections(storeWithTrust);
    assert.equal(resolved.length, 1);
    const resolvedTrust = resolved[0];
    assert.equal(resolvedTrust.type, "trust_badges");
    assert.ok(Array.isArray(resolvedTrust.settings.badges));
    assert.ok(resolvedTrust.settings.badges.length > 0);
  });

  await t.test("6. FAQ Accordion section retains custom questions/answers and supports both stacked and two-column layouts", () => {
    const faqSec = getDefaultSectionInstance("faq_accordion", 4);
    assert.equal(faqSec.type, "faq_accordion");
    assert.ok(Array.isArray(faqSec.settings.faqs));
    assert.ok(faqSec.settings.faqs.length >= 4, "Default FAQs should be populated");

    faqSec.layoutVariant = "split_two_column";
    faqSec.settings.faqs = [
      { question: "Can I commission bespoke finishes?", answer: "Yes, our studio accepts bespoke custom commissions." },
      { question: "Where are the raw materials sourced?", answer: "100% sustainable European certified timber." },
    ];

    const storeWithFaq: Partial<Store> = {
      name: "Artisan Co",
      slug: "artisan-co",
      sections: [faqSec],
    };

    const resolved = resolveStoreSections(storeWithFaq);
    assert.equal(resolved.length, 1);
    assert.equal(resolved[0].layoutVariant, "split_two_column");
    const resolvedFaqs = resolved[0].settings.faqs as Array<{ question: string; answer: string }>;
    assert.equal(resolvedFaqs.length, 2);
    assert.equal(resolvedFaqs[0].question, "Can I commission bespoke finishes?");
  });

  await t.test("7. Replacing hero image in branding updates all hero section image settings unconditionally", async () => {
    const heroSplit = getDefaultSectionInstance("hero_split", 0);
    heroSplit.settings.imageUrl = "/uploads/stores/old-banner-v1.jpg";
    heroSplit.settings.backgroundImageUrl = "/uploads/stores/old-banner-v1.jpg";
    heroSplit.settings.bannerUrl = "/uploads/stores/old-banner-v1.jpg";

    const testStoreId = `str_replace_img_${Date.now()}`;
    const testSlug = `replace-img-${Date.now()}`;

    const store: Store = {
      id: testStoreId,
      name: "Gallery Living",
      slug: testSlug,
      clientId: "cli_gallery",
      clientName: "Gallery Inc",
      industry: "Home & Living",
      templateId: "tmpl_modern_minimal",
      templateName: "Modern Minimal",
      status: "Draft",
      productCount: 0,
      description: "Contemporary design gallery.",
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      branding: {
        primaryColor: "#176B4D",
        fontFamily: "Inter, sans-serif",
        bannerUrl: "/uploads/stores/old-banner-v1.jpg",
      },
      sections: [heroSplit],
      orderedSections: ["hero"],
      enabledSections: ["hero"],
    };

    await StoreRepository.create(store);

    // Replace the image with new banner URL
    const updated = await StoreRepository.update(testStoreId, {
      branding: {
        bannerUrl: "/uploads/stores/new-hero-v2.webp",
      },
    });

    assert.ok(updated);
    assert.equal(updated.branding?.bannerUrl, "/uploads/stores/new-hero-v2.webp");
    const updatedHero = updated.sections?.find((s) => s.type === "hero_split");
    assert.ok(updatedHero);
    assert.equal(updatedHero.settings.imageUrl, "/uploads/stores/new-hero-v2.webp", "Should overwrite old banner with new one");
    assert.equal(updatedHero.settings.backgroundImageUrl, "/uploads/stores/new-hero-v2.webp");
    assert.equal(updatedHero.settings.bannerUrl, "/uploads/stores/new-hero-v2.webp");

    await StoreRepository.delete(testStoreId);
  });

  await t.test("8. Multiple sections of the same type maintain independent IDs, configuration, and order", () => {
    const faq1 = getDefaultSectionInstance("faq_accordion", 1);
    faq1.settings.title = "Ordering & Logistics FAQ";
    faq1.settings.faqs = [{ question: "Lead time?", answer: "2 days." }];

    const faq2 = getDefaultSectionInstance("faq_accordion", 2);
    faq2.settings.title = "Materials & Sustainability FAQ";
    faq2.settings.faqs = [{ question: "Certifications?", answer: "FSC 100%." }];

    assert.notEqual(faq1.id, faq2.id, "Section IDs must be unique");

    const storeWithMultipleFaqs: Partial<Store> = {
      name: "Dual FAQ Store",
      slug: "dual-faq-store",
      sections: [faq1, faq2],
    };

    const resolved = resolveStoreSections(storeWithMultipleFaqs);
    assert.equal(resolved.length, 2);
    assert.equal(resolved[0].id, faq1.id);
    assert.equal(resolved[0].settings.title, "Ordering & Logistics FAQ");
    assert.equal(resolved[1].id, faq2.id);
    assert.equal(resolved[1].settings.title, "Materials & Sustainability FAQ");
  });

  await t.test("9. Cleanup test store record", async () => {
    const deleted = await StoreRepository.delete(storeId);
    assert.equal(deleted, true);
  });
});
