import test from "node:test";
import assert from "node:assert/strict";
import { resolveStoreSections } from "@/lib/sections/resolver";
import { StoreRepository } from "@/lib/repositories/store.repository";
import { ServiceRepository } from "@/lib/repositories/service.repository";
import { ProviderRepository } from "@/lib/repositories/provider.repository";
import { AppointmentRepository } from "@/lib/repositories/appointment.repository";
import { getDefaultSectionInstance } from "@/constants/sections";
import { COLOR_THEMES, getThemeById } from "@/constants/themes";
import { DESIGN_TEMPLATES, getDesignTemplateById } from "@/constants/design-templates";
import { Store } from "@/types/store";

test("Appointment Website Customizer Compatibility Suite", async (t) => {
  const storeId = `str_appt_test_${Date.now()}`;
  const slug = `appt-customizer-${Date.now()}`;

  await t.test("1. resolveStoreSections synthesizes appointment-tailored sections without e-commerce products", () => {
    const apptStore: Partial<Store> = {
      name: "Apex Legal & Advisory",
      slug: "apex-legal",
      websiteType: "appointments",
      appointmentIndustry: "Legal Practice & Advisory",
      description: "Premier corporate law and strategic litigation consultation.",
      branding: {
        primaryColor: "#0F2942",
        secondaryColor: "#F4F7FA",
        fontFamily: "Georgia, serif",
        bannerUrl: "/uploads/stores/legal-chambers.jpg",
      },
    };

    const sections = resolveStoreSections(apptStore);
    assert.ok(sections.length >= 4, "Should synthesize at least 4 default sections for appointment store");

    // Must NOT contain e-commerce product sections
    const hasProducts = sections.some((s) => s.type === "featured_products" || s.type === "bestsellers_grid");
    assert.equal(hasProducts, false, "Appointment websites must not synthesize e-commerce product grids by default");

    // Must contain hero, benefits_grid, brand_story (about), faq_accordion, footer_custom
    const hero = sections.find((s) => s.type.startsWith("hero_"));
    assert.ok(hero, "Hero section must exist");
    assert.equal(hero.settings.imageUrl, "/uploads/stores/legal-chambers.jpg", "Hero image should receive bannerUrl");
    assert.equal(hero.settings.ctaUrl, "#booking-section", "Appointment hero CTA must target #booking-section");
    assert.equal(hero.settings.ctaText, "Book Consultation", "Appointment hero default CTA text should be Book Consultation");

    const benefits = sections.find((s) => s.type === "benefits_grid");
    assert.ok(benefits, "Benefits grid section should exist for appointment sites");
    assert.equal(benefits.settings.badge, "Client Commitments");

    const faq = sections.find((s) => s.type === "faq_accordion");
    assert.ok(faq, "FAQ accordion section should exist for appointment sites");
    assert.equal(faq.settings.badge, "Practice FAQ");

    const footer = sections.find((s) => s.type === "footer_custom");
    assert.ok(footer, "Footer custom section should exist");
  });

  await t.test("2. resolveStoreSections preserves custom sections configured on appointment websites", () => {
    const customFaq = getDefaultSectionInstance("faq_accordion", 1);
    customFaq.settings = {
      badge: "Custom Consultation FAQ",
      title: "Everything You Need to Know",
      q1: "How are consultation fees billed?",
      a1: "Retainer or flat-fee billing agreed upon before consultation starts.",
    };

    const customTrust = getDefaultSectionInstance("trust_badges", 2);
    customTrust.settings = {
      badge1Title: "Bar Council Certified",
      badge2Title: "25+ Years Experience",
      badge3Title: "Confidentiality Guaranteed",
    };

    const apptStoreWithSections: Partial<Store> = {
      name: "Chambers of V. Sharma",
      slug: "chambers-sharma",
      websiteType: "appointments",
      branding: {
        primaryColor: "#1E3A8A",
        fontFamily: "Inter, sans-serif",
        bannerUrl: "/uploads/stores/chambers-banner.webp",
        heroHeadline: "Specialist Constitutional Counsel",
        ctaText: "Request Briefing",
      },
      sections: [
        {
          ...getDefaultSectionInstance("hero_split", 0),
          settings: { imageUrl: "" },
        },
        customFaq,
        customTrust,
      ],
    };

    const resolved = resolveStoreSections(apptStoreWithSections);
    assert.equal(resolved.length, 3, "Should preserve all 3 configured sections");

    // Hero banner should be backfilled from branding
    const hero = resolved[0];
    assert.equal(hero.settings.imageUrl, "/uploads/stores/chambers-banner.webp");
    assert.equal(hero.settings.headline, "Specialist Constitutional Counsel");
    assert.equal(hero.settings.ctaText, "Request Briefing");
    assert.equal(hero.settings.ctaUrl, "#booking-section");

    // Trust and FAQ should be intact
    assert.equal(resolved[1].type, "faq_accordion");
    assert.equal(resolved[1].settings.badge, "Custom Consultation FAQ");

    assert.equal(resolved[2].type, "trust_badges");
    assert.equal(resolved[2].settings.badge1Title, "Bar Council Certified");
  });

  await t.test("3. Independent theme and design template resolution on appointment websites", () => {
    // Verify all 12 color themes resolve without conflict for appointment websites
    for (const theme of COLOR_THEMES) {
      const resolvedTheme = getThemeById(theme.id);
      assert.ok(resolvedTheme, `Theme ${theme.id} should resolve`);
      assert.ok(resolvedTheme.tokens.primary, `Theme ${theme.id} must define primary token`);
      assert.ok(resolvedTheme.tokens.surface, `Theme ${theme.id} must define surface token`);
      assert.ok(resolvedTheme.tokens.background, `Theme ${theme.id} must define background token`);
      assert.ok(resolvedTheme.tokens.cardBg, `Theme ${theme.id} must define cardBg token`);
    }

    // Verify all 8 design templates resolve correctly
    for (const tmpl of DESIGN_TEMPLATES) {
      const resolvedTmpl = getDesignTemplateById(tmpl.id);
      assert.ok(resolvedTmpl, `Template ${tmpl.id} should resolve`);
      assert.ok(resolvedTmpl.name, `Template ${tmpl.id} must have a name`);
    }
  });

  await t.test("4. StoreRepository persists appointment customizer changes (themes, styling, banner, sections)", async () => {
    // Create an appointment store
    const createdStore = await StoreRepository.create({
      id: storeId,
      name: "Elite Wellness Practice",
      slug,
      clientId: "cli_test_wellness",
      clientName: "Elite Wellness Client",
      industry: "Health & Wellness",
      websiteType: "appointments",
      appointmentIndustry: "Salon, Spa & Wellness",
      description: "Holistic wellness therapies and personalized consultations.",
      themeId: "theme_warm_terracotta",
      templateId: "tmpl_editorial_boutique",
      templateName: "Editorial Boutique",
      createdAt: new Date().toISOString(),
      productCount: 0,
      lastUpdated: new Date().toISOString(),
      branding: {
        primaryColor: "#9E472A",
        secondaryColor: "#FBF7F4",
        fontFamily: "'Playfair Display', serif",
        heroHeadline: "Harmonize Body, Mind & Spirit",
        heroSubheadline: "Book a personalized therapeutic session with certified wellness practitioners.",
        ctaText: "Book Wellness Session",
        bannerUrl: "/uploads/stores/wellness-initial.jpg",
      },
      styling: {
        buttonRadius: "pill",
        cardStyle: "floating",
        headerSticky: true,
        contentWidth: "normal",
      },
      sections: resolveStoreSections({
        websiteType: "appointments",
        branding: {
          primaryColor: "#9E472A",
          fontFamily: "'Playfair Display', serif",
          bannerUrl: "/uploads/stores/wellness-initial.jpg",
        },
      }),
      status: "Draft",
    });

    assert.ok(createdStore, "Store should be created in repository");
    assert.equal(createdStore.websiteType, "appointments");
    assert.equal(createdStore.styling?.buttonRadius, "pill");
    assert.equal(createdStore.styling?.cardStyle, "floating");
    assert.equal(createdStore.themeId, "theme_warm_terracotta");

    // Perform a customizer update: change theme, update bannerUrl, modify styling tokens
    const updatedStore = await StoreRepository.update(storeId, {
      themeId: "theme_nordic_pine",
      templateId: "tmpl_modern_minimal",
      branding: {
        primaryColor: "#176B4D",
        secondaryColor: "#FAF9F6",
        bannerUrl: "/uploads/stores/wellness-new-banner.jpg",
        heroHeadline: "Revitalize Your Well-Being",
        ctaText: "Reserve Your Session",
      },
      styling: {
        buttonRadius: "sharp",
        cardStyle: "elevated",
        headerSticky: false,
      },
    });

    assert.ok(updatedStore, "Store should update successfully");
    assert.equal(updatedStore.themeId, "theme_nordic_pine");
    assert.equal(updatedStore.branding?.bannerUrl, "/uploads/stores/wellness-new-banner.jpg");
    assert.equal(updatedStore.branding?.heroHeadline, "Revitalize Your Well-Being");
    assert.equal(updatedStore.branding?.ctaText, "Reserve Your Session");
    assert.equal(updatedStore.styling?.buttonRadius, "sharp");
    assert.equal(updatedStore.styling?.cardStyle, "elevated");
    assert.equal(updatedStore.styling?.headerSticky, false);

    // Verify hero sections received the updated banner URL
    const heroSec = updatedStore.sections?.find((s) => s.type.startsWith("hero_"));
    assert.ok(heroSec, "Hero section should exist");
    assert.equal(heroSec.settings.imageUrl, "/uploads/stores/wellness-new-banner.jpg");
    assert.equal(heroSec.settings.bannerUrl, "/uploads/stores/wellness-new-banner.jpg");
  });

  await t.test("5. Appointment core lifecycle and services remain fully operational alongside customizer", async () => {
    // Add a consultation service to the test store
    const service = await ServiceRepository.create({
      storeId,
      name: "Holistic Health Evaluation",
      description: "60-minute in-depth health history and wellness plan.",
      durationMinutes: 60,
      price: 2500,
      currency: "INR",
      isFreeConsultation: false,
      meetingType: "in_person",
      status: "active",
    });
    assert.ok(service.id, "Service should be created");

    // Add a provider
    const provider = await ProviderRepository.create({
      storeId,
      name: "Dr. Ananya Roy",
      role: "Lead Ayurvedic Physician",
      bio: "15+ years experience in chronic health management.",
      status: "active",
    });
    assert.ok(provider.id, "Provider should be created");

    // Book an appointment
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 1);
    const startUtc = new Date(Date.UTC(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 10, 0, 0)).toISOString();
    const endUtc = new Date(Date.UTC(tomorrow.getFullYear(), tomorrow.getMonth(), tomorrow.getDate(), 11, 0, 0)).toISOString();

    const appt = await AppointmentRepository.create({
      storeId,
      serviceId: service.id,
      serviceName: service.name,
      providerId: provider.id,
      providerName: provider.name,
      customerName: "Rohan Deshmukh",
      customerEmail: "rohan.deshmukh@example.com",
      startUtc,
      endUtc,
      durationMinutes: 60,
      price: 2500,
      currency: "INR",
      status: "Confirmed",
      meetingType: "in_person",
    });

    assert.ok(appt.id, "Appointment record should be created");
    assert.ok(appt.confirmationNumber, "Appointment should receive confirmation number");

    // Customer email lookup (My Appointments)
    const customerAppts = await AppointmentRepository.findByCustomerEmail(storeId, "rohan.deshmukh@example.com");
    assert.equal(customerAppts.length, 1);
    assert.equal(customerAppts[0].confirmationNumber, appt.confirmationNumber);

    // Cancel appointment
    const cancelled = await AppointmentRepository.update(appt.id, {
      status: "Cancelled",
      cancelledAtUtc: new Date().toISOString(),
      cancellationReason: "Client rescheduling request",
    });
    assert.ok(cancelled);
    assert.equal(cancelled.status, "Cancelled");
  });

  await t.test("6. Layout selection, persistence, and preview adaptation across all 8 design templates for appointment websites", async () => {
    const expectedLayouts = [
      { id: "tmpl_modern_minimal", header: "floating-minimal", hero: "split-showcase", card: "understated" },
      { id: "tmpl_luxury_editorial", header: "centered-luxury", hero: "cinematic-framed", card: "tall-editorial" },
      { id: "tmpl_bold_vibrant", header: "bold-announcement", hero: "high-impact-blocks", card: "block-solid" },
      { id: "tmpl_classic_commerce", header: "multi-tier-utility", hero: "commercial-banner", card: "classic-rating" },
      { id: "tmpl_editorial_magazine", header: "magazine-headline", hero: "magazine-story", card: "captioned-story" },
      { id: "tmpl_organic_natural", header: "organic-soft", hero: "organic-flow", card: "soft-rounded" },
      { id: "tmpl_tech_futuristic", header: "technical-hud", hero: "cyber-specs", card: "monospaced-grid" },
      { id: "tmpl_playful_creative", header: "playful-banner", hero: "asymmetric-cards", card: "sticker-playful" },
    ];

    for (const expected of expectedLayouts) {
      const tmpl = getDesignTemplateById(expected.id);
      assert.ok(tmpl, `Design template ${expected.id} must exist`);
      assert.equal(tmpl.headerLayout, expected.header, `Template ${expected.id} should have header layout ${expected.header}`);
      assert.equal(tmpl.heroLayout, expected.hero, `Template ${expected.id} should have hero layout ${expected.hero}`);
      assert.equal(tmpl.cardLayout, expected.card, `Template ${expected.id} should have card layout ${expected.card}`);

      // Persist template selection on appointment store
      const updated = await StoreRepository.update(storeId, {
        templateId: expected.id,
        templateName: tmpl.name,
      });
      assert.ok(updated, `Store update with ${expected.id} should succeed`);
      assert.equal(updated.templateId, expected.id);
      assert.equal(updated.templateName, tmpl.name);

      // Verify retrieval by ID
      const retrieved = await StoreRepository.findById(storeId);
      assert.ok(retrieved);
      assert.equal(retrieved.templateId, expected.id, `Retrieved store must persist templateId ${expected.id}`);
      assert.equal(retrieved.templateName, tmpl.name);

      // Verify retrieval by slug (published store subdomain endpoint)
      const retrievedBySlug = await StoreRepository.findBySlug(slug);
      assert.ok(retrievedBySlug);
      assert.equal(retrievedBySlug.templateId, expected.id, `Published subdomain store must render templateId ${expected.id}`);
    }
  });

  await t.test("7. Appointment store clean initial load (no false positive dirty state)", () => {
    const rawApptStore: Store = {
      id: "str_clean_check_01",
      name: "Zenith Strategy Advisory",
      slug: "zenith-strategy",
      clientId: "cli_zenith",
      clientName: "Zenith Partners",
      industry: "Health & Wellness",
      websiteType: "appointments",
      appointmentIndustry: "Consulting & Strategy",
      description: "Executive strategic planning and high-stakes advisory.",
      status: "Draft",
      templateId: "tmpl_modern_minimal",
      templateName: "Modern Minimal",
      themeId: "theme_nordic_pine",
      createdAt: new Date().toISOString(),
      productCount: 0,
      lastUpdated: new Date().toISOString(),
      branding: {
        primaryColor: "#176B4D",
        fontFamily: "Inter, sans-serif",
      },
    };

    // Calculate dirty state matching preview page logic
    const isAppointments = rawApptStore.websiteType === "appointments";
    const initialHeroHeadline = isAppointments
      ? (rawApptStore.branding?.heroHeadline || "Professional Advisory & Strategic Consultation")
      : (rawApptStore.branding?.heroHeadline || `Welcome to ${rawApptStore.name}`);
    const initialHeroSubheadline = isAppointments
      ? (rawApptStore.branding?.heroSubheadline || rawApptStore.description || "Schedule a focused, confidential appointment with our experienced practitioners.")
      : (rawApptStore.branding?.heroSubheadline || `Curated ${rawApptStore.industry} collection designed for modern living.`);
    const initialCtaText = isAppointments
      ? (rawApptStore.branding?.ctaText || "Book Consultation")
      : (rawApptStore.branding?.ctaText || "Explore Catalog");
    const initialOrderedSections = isAppointments
      ? ["hero", "benefits_grid", "about", "faq_accordion", "footer"]
      : ["hero", "featured_products", "about", "newsletter", "footer"];

    const originalHeroHeadline =
      rawApptStore.branding?.heroHeadline ||
      (isAppointments
        ? "Professional Advisory & Strategic Consultation"
        : `Welcome to ${rawApptStore.name}`);
    const originalHeroSubheadline =
      rawApptStore.branding?.heroSubheadline ||
      (isAppointments
        ? (rawApptStore.description || "Schedule a focused, confidential appointment with our experienced practitioners.")
        : `Curated ${rawApptStore.industry} collection designed for modern living.`);
    const originalCtaText =
      rawApptStore.branding?.ctaText ||
      (isAppointments ? "Book Consultation" : "Explore Catalog");
    const originalOrderedSections =
      rawApptStore.orderedSections && rawApptStore.orderedSections.length > 0
        ? rawApptStore.orderedSections
        : (isAppointments
            ? ["hero", "benefits_grid", "about", "faq_accordion", "footer"]
            : ["hero", "featured_products", "about", "newsletter", "footer"]);

    assert.equal(initialHeroHeadline, originalHeroHeadline);
    assert.equal(initialHeroSubheadline, originalHeroSubheadline);
    assert.equal(initialCtaText, originalCtaText);
    assert.deepEqual(initialOrderedSections, originalOrderedSections);
  });

  await t.test("8. Cleanup test store and records", async () => {
    await StoreRepository.delete(storeId);
    const retrieved = await StoreRepository.findById(storeId);
    assert.equal(retrieved, null, "Test store should be cleaned up");
  });
});
