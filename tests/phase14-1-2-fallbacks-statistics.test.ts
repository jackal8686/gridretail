import { describe, it } from "node:test";
import assert from "node:assert/strict";
import React from "react";
import { renderToString } from "react-dom/server";
import { VerifiedStatisticsBarSection } from "../src/components/storefront/sections/InfoSections";
import { HeroSections } from "../src/components/storefront/sections/HeroSections";
import { ModularHero } from "../src/components/storefront/ModularHero";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { Store } from "../src/types/store";
import { SectionInstance } from "../src/types/section";
import { ColorThemeTokens } from "../src/types/template";

const mockTokens: ColorThemeTokens = {
  primary: "#18231E",
  secondary: "#2C3E35",
  accent: "#8B9D83",
  background: "#F9F8F6",
  surface: "#FFFFFF",
  text: "#18231E",
  textMuted: "#6B7280",
  border: "#E5E7EB",
  cardBg: "#FFFFFF",
  badgeBg: "#F3F4F6",
  badgeText: "#18231E",
};

describe("Phase 14.1.2 — Fallbacks, Statistics & Safety Closure Suite", () => {
  // -------------------------------------------------------------
  // PART 1: VERIFIED STATISTICS BAR COMPREHENSIVE AUDIT
  // -------------------------------------------------------------
  describe("Verified Statistics Bar Section", () => {
    it("1. Empty metric — Filtered out and section returns null when all metrics are empty", () => {
      const instance: SectionInstance = {
        id: "stats_test_1",
        type: "verified_statistics_bar",
        order: 1,
        visible: true,
        layoutVariant: "horizontal_counters",
        settings: {
          items: [
            { value: "", label: "" },
            { value: "   ", label: "   " },
          ],
        },
      };

      const html = renderToString(
        React.createElement(VerifiedStatisticsBarSection, {
          instance,
          tokens: mockTokens,
          primaryColor: "#18231E",
        })
      );

      assert.equal(html, "", "Empty metrics must suppress section rendering (return null)");
    });

    it("2. Default placeholder metric — Suppressed on storefront when values are placeholders", () => {
      const instance: SectionInstance = {
        id: "stats_test_2",
        type: "verified_statistics_bar",
        order: 1,
        visible: true,
        layoutVariant: "horizontal_counters",
        settings: {
          items: [
            { value: "--", label: "Metric Label", sublabel: "Placeholder description" },
            { value: "...", label: "Metric Label" },
          ],
        },
      };

      const html = renderToString(
        React.createElement(VerifiedStatisticsBarSection, {
          instance,
          tokens: mockTokens,
          primaryColor: "#18231E",
        })
      );

      assert.equal(html, "", "Placeholder metrics must never render on published storefronts");
    });

    it("3. Merchant-entered but unverified metric — Renders cleanly WITHOUT verified badge/indicator", () => {
      const instance: SectionInstance = {
        id: "stats_test_3",
        type: "verified_statistics_bar",
        order: 1,
        visible: true,
        layoutVariant: "horizontal_counters",
        settings: {
          title: "Our Operational Reach",
          items: [
            { value: "500+", label: "Active Enterprise Clients", verified: false },
          ],
        },
      };

      const html = renderToString(
        React.createElement(VerifiedStatisticsBarSection, {
          instance,
          tokens: mockTokens,
          primaryColor: "#18231E",
        })
      );

      assert.ok(html.includes("500+"), "Must render merchant value");
      assert.ok(html.includes("Active Enterprise Clients"), "Must render merchant label");
      assert.equal(
        html.includes("data-metric-verified"),
        false,
        "A metric must NEVER receive a verified indicator merely because a value exists"
      );
      assert.equal(
        html.includes("Verified"),
        false,
        "Unverified merchant metrics must not display a Verified badge"
      );
    });

    it("4. Explicitly verified metric — Renders WITH verified indicator badge", () => {
      const instance: SectionInstance = {
        id: "stats_test_4",
        type: "verified_statistics_bar",
        order: 1,
        visible: true,
        layoutVariant: "horizontal_counters",
        settings: {
          title: "Audited Metrics",
          items: [
            { value: "99.98%", label: "Platform Uptime SLA", verified: true },
          ],
        },
      };

      const html = renderToString(
        React.createElement(VerifiedStatisticsBarSection, {
          instance,
          tokens: mockTokens,
          primaryColor: "#18231E",
        })
      );

      assert.ok(html.includes("99.98%"));
      assert.ok(html.includes("Platform Uptime SLA"));
      assert.ok(
        html.includes('data-metric-verified="true"'),
        "Explicitly verified metrics must receive verified indicator"
      );
      assert.ok(html.includes("Verified"), "Must display Verified badge text");
    });

    it("5. Mixed verified and unverified metrics — Verified indicator ONLY attaches to verified items", () => {
      const instance: SectionInstance = {
        id: "stats_test_5",
        type: "verified_statistics_bar",
        order: 1,
        visible: true,
        layoutVariant: "horizontal_counters",
        settings: {
          items: [
            { value: "10,000+", label: "Units Delivered", verified: false },
            { value: "ISO-27001", label: "Security Compliance", verified: true },
          ],
        },
      };

      const html = renderToString(
        React.createElement(VerifiedStatisticsBarSection, {
          instance,
          tokens: mockTokens,
          primaryColor: "#18231E",
        })
      );

      assert.ok(html.includes("10,000+"));
      assert.ok(html.includes("ISO-27001"));
      // Exactly ONE verified badge must be rendered
      const occurrences = (html.match(/data-metric-verified="true"/g) || []).length;
      assert.equal(occurrences, 1, "Only the explicitly verified metric may display the indicator");
    });

    it("6. Both supported layouts — Renders both horizontal_counters and boxed_cards cleanly", () => {
      const validItems = [
        { value: "$12.4M", label: "Annual Volume", verified: true },
        { value: "48 States", label: "Domestic Coverage", verified: false },
      ];

      // Layout 1: horizontal_counters
      const horizontalInstance: SectionInstance = {
        id: "stats_horizontal",
        type: "verified_statistics_bar",
        order: 1,
        visible: true,
        layoutVariant: "horizontal_counters",
        settings: { items: validItems },
      };

      const horizontalHtml = renderToString(
        React.createElement(VerifiedStatisticsBarSection, {
          instance: horizontalInstance,
          tokens: mockTokens,
          primaryColor: "#18231E",
        })
      );

      assert.ok(horizontalHtml.includes("divide-y") || horizontalHtml.includes("divide-x"));
      assert.ok(horizontalHtml.includes("$12.4M"));

      // Layout 2: boxed_cards
      const boxedInstance: SectionInstance = {
        id: "stats_boxed",
        type: "verified_statistics_bar",
        order: 1,
        visible: true,
        layoutVariant: "boxed_cards",
        settings: { items: validItems },
      };

      const boxedHtml = renderToString(
        React.createElement(VerifiedStatisticsBarSection, {
          instance: boxedInstance,
          tokens: mockTokens,
          primaryColor: "#18231E",
        })
      );

      assert.ok(boxedHtml.includes("rounded-2xl border text-center"));
      assert.ok(boxedHtml.includes("$12.4M"));
    });
  });

  // -------------------------------------------------------------
  // PART 2: HERO FALLBACKS & MISSING DATA SAFETY
  // -------------------------------------------------------------
  describe("Hero Variations Fallback Safety", () => {
    it("7. Product Spotlight Hero — Does not fabricate $49.00 prices or fake 'In Stock' claims when catalog is empty", () => {
      const instance: SectionInstance = {
        id: "hero_spotlight",
        type: "hero_full_width",
        order: 0,
        visible: true,
        layoutVariant: "product_spotlight",
        settings: {},
      };

      const html = renderToString(
        React.createElement(HeroSections, {
          instance,
          tokens: mockTokens,
          styling: { heroVariation: "product_spotlight" },
          primaryColor: "#18231E",
        })
      );

      // Must not fabricate prices or inventory claims
      assert.equal(html.includes("$49.00"), false, "Must NOT display fabricated $49.00 price");
      assert.equal(html.includes("$49"), false, "Must NOT display fabricated $49 price");
      assert.equal(html.includes("In Stock"), false, "Must NOT display unverified 'In Stock' claim");
      assert.equal(html.includes("Spotlight Edition"), false, "Must NOT display hardcoded spotlight edition badge");
      // Must render clean neutral headline fallback
      assert.ok(html.includes("Welcome to Our Store") || html.includes("Featured"));
    });

    it("8. Service Booking Hero — Does not invent fake advisory services or unverified policies", () => {
      const instance: SectionInstance = {
        id: "hero_service",
        type: "hero_full_width",
        order: 0,
        visible: true,
        layoutVariant: "service_booking",
        settings: {},
      };

      const html = renderToString(
        React.createElement(HeroSections, {
          instance,
          tokens: mockTokens,
          styling: { heroVariation: "service_booking" },
          primaryColor: "#18231E",
        })
      );

      // Must NOT display fabricated policies or service packages when unconfigured
      assert.equal(html.includes("Flexible Rescheduling Policy"), false, "Must NOT display fabricated policy");
      assert.equal(html.includes("Professional Client Advisory"), false, "Must NOT display fake advisory claim");
      assert.equal(html.includes("practice personnel"), false, "Must NOT display fake practice claim");
      assert.ok(html.includes("Scheduling"), "Must render neutral scheduling header");
    });

    it("9. Form Conversion Hero — Renders neutral inquiry form without unverified privacy guarantees", () => {
      const instance: SectionInstance = {
        id: "hero_form",
        type: "hero_full_width",
        order: 0,
        visible: true,
        layoutVariant: "form_conversion",
        settings: {},
      };

      const html = renderToString(
        React.createElement(HeroSections, {
          instance,
          tokens: mockTokens,
          styling: { heroVariation: "form_conversion" },
          primaryColor: "#18231E",
        })
      );

      assert.equal(
        html.includes("Privacy guaranteed. Never shared with third parties"),
        false,
        "Must NOT state unverified legal/privacy promises"
      );
      assert.ok(html.includes("Submit an Inquiry") || html.includes("Submit Inquiry"));
    });

    it("10. ModularHero Component — Exports and renders cleanly as a top-level facade", () => {
      const html = renderToString(
        React.createElement(ModularHero, {
          tokens: mockTokens,
          styling: { heroVariation: "centered" },
          primaryColor: "#18231E",
          branding: {
            heroHeadline: "Verified Minimalist Store",
          },
        })
      );

      assert.ok(html.includes("Verified Minimalist Store"));
      assert.ok(html.includes('data-hero-variation="centered"'));
    });
  });

  // -------------------------------------------------------------
  // PART 3: PERSISTENCE CONCURRENCY TERMINOLOGY VERIFICATION
  // -------------------------------------------------------------
  describe("Styling Persistence & Concurrency Semantics", () => {
    const testStoreId = "str_phase14_1_2_concurrency";

    it("11. Sequential Updates vs. Concurrency — Confirms sequential state accumulation across ticks (not simultaneous concurrency)", async () => {
      const testStore: Store = {
        id: testStoreId,
        name: "Concurrency Test Store",
        slug: "concurrency-test-store",
        clientName: "Test Client",
        clientId: "cli_test",
        templateId: "tmpl_modern_minimal",
        templateName: "Modern Minimal",
        industry: "Home & Living",
        description: "Test store for concurrency verification",
        themeId: "theme_nordic_pine",
        status: "Draft",
        productCount: 0,
        createdAt: new Date().toISOString(),
        lastUpdated: new Date().toISOString(),
        styling: {
          buttonRadius: "rounded",
          cardVariation: "elevated",
          heroVariation: "centered",
        },
      };

      await StoreRepository.create(testStore);

      // Sequential update 1: change cardVariation
      await StoreRepository.update(testStoreId, {
        styling: { cardVariation: "floating" },
      });

      // Sequential update 2: change heroVariation
      const finalStore = await StoreRepository.update(testStoreId, {
        styling: { heroVariation: "split" },
      });

      assert.ok(finalStore);
      // Both tokens must be present via top-level spread
      assert.equal(finalStore.styling?.cardVariation, "floating");
      assert.equal(finalStore.styling?.heroVariation, "split");
      assert.equal(finalStore.styling?.buttonRadius, "rounded");

      // Cleanup
      await StoreRepository.delete(testStoreId);
    });
  });
});
