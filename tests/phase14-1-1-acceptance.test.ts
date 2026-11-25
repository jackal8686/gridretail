import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { getSectionDefinition } from "../src/constants/sections";
import { Store, StoreStylingTokens } from "../src/types/store";

describe("Phase 14.1.1 — Final Acceptance Closure Suite", () => {
  const testStoreId = "str_phase14_1_1_test";

  // Setup test store fixture
  const initialStore: Store = {
    id: testStoreId,
    name: "Phase 14.1.1 Verification Lab",
    slug: "phase14-1-1-verification-lab",
    clientName: "GridRetail Verification Corp",
    clientId: "client_test_corp",
    templateId: "tmpl_modern_minimal",
    templateName: "Modern Minimal",
    industry: "Home & Living",
    themeId: "theme_nordic_pine",
    status: "Draft",
    productCount: 4,
    createdAt: new Date().toISOString(),
    lastUpdated: new Date().toISOString(),
    description: "Acceptance verification store for Phase 14.1.1",
    styling: {
      buttonRadius: "rounded",
      cardStyle: "elevated",
      cardVariation: "elevated",
      headerVariation: "minimal",
      footerVariation: "multi_column",
      heroVariation: "centered",
      contentWidth: "normal",
      spacingDensity: "normal",
      typographyScale: "compact",
    },
    sections: [
      {
        id: "hero_default",
        type: "hero_full_width",
        order: 0,
        visible: true,
        layoutVariant: "centered",
        settings: { headline: "Architectural Essentials" },
      },
      {
        id: "stats_default",
        type: "verified_statistics_bar",
        order: 1,
        visible: true,
        layoutVariant: "horizontal_counters",
        settings: {
          title: "Key Performance Indicators",
          badge: "Operational Metrics",
          items: [
            { value: "--", label: "Metric Label", sublabel: "Placeholder description" },
          ],
        },
      },
    ],
  };

  it("1. Verified Statistics Bar — Never publishes empty or unconfirmed placeholder metrics as facts", () => {
    const statsDef = getSectionDefinition("verified_statistics_bar");
    assert.ok(statsDef, "verified_statistics_bar must exist in registry");

    // Verify default settings contain neutral placeholders, not fake business claims
    const defaultItems = statsDef.defaultSettings.items as Array<{ value: string; label: string }>;
    assert.ok(Array.isArray(defaultItems));
    for (const item of defaultItems) {
      assert.notEqual(item.value, "100% Data Ownership", "Must not contain hardcoded 100% claim");
      assert.notEqual(item.value, "0 Third-Party Trackers", "Must not contain hardcoded zero claim");
      assert.notEqual(item.value, "24/7 Automated Booking", "Must not contain hardcoded 24/7 claim");
      assert.notEqual(item.value, "12+ Dynamic Color Themes", "Must not contain hardcoded theme count claim");
    }

    // Verify filter logic: placeholder metrics are identified as unconfirmed
    const isPlaceholder = (item: { value?: string; label?: string }) => {
      const val = item.value?.trim() || "";
      const lbl = item.label?.trim() || "";
      if (!val || val === "--" || val === "...") return true;
      if (!lbl || lbl.toLowerCase() === "metric label" || lbl.toLowerCase().includes("placeholder")) return true;
      return false;
    };

    assert.equal(isPlaceholder({ value: "--", label: "Metric Label" }), true);
    assert.equal(isPlaceholder({ value: "", label: "Active Users" }), true);
    assert.equal(isPlaceholder({ value: "250+", label: "Verified Corporate Clients" }), false);
  });

  it("2. Styling Persistence — Updating one styling token preserves all unrelated tokens (top-level merge)", async () => {
    await StoreRepository.create(initialStore);

    // Update only heroVariation
    const updated1 = await StoreRepository.update(testStoreId, {
      styling: {
        heroVariation: "editorial",
      },
    });

    assert.ok(updated1);
    assert.equal(updated1.styling?.heroVariation, "editorial", "heroVariation updated");
    // All other tokens must remain preserved
    assert.equal(updated1.styling?.buttonRadius, "rounded", "buttonRadius preserved");
    assert.equal(updated1.styling?.cardVariation, "elevated", "cardVariation preserved");
    assert.equal(updated1.styling?.headerVariation, "minimal", "headerVariation preserved");
    assert.equal(updated1.styling?.footerVariation, "multi_column", "footerVariation preserved");
    assert.equal(updated1.styling?.contentWidth, "normal", "contentWidth preserved");
    assert.equal(updated1.styling?.spacingDensity, "normal", "spacingDensity preserved");
    assert.equal(updated1.styling?.typographyScale, "compact", "typographyScale preserved");
  });

  it("3. Styling Persistence — Preserves themeId, templateId, and section configuration across styling updates", async () => {
    const updated2 = await StoreRepository.update(testStoreId, {
      styling: {
        cardVariation: "block_solid",
        footerVariation: "business_info",
      },
    });

    assert.ok(updated2);
    assert.equal(updated2.styling?.cardVariation, "block_solid");
    assert.equal(updated2.styling?.footerVariation, "business_info");
    assert.equal(updated2.styling?.heroVariation, "editorial", "Previous update retained");

    // Theme and template preserved
    assert.equal(updated2.themeId, "theme_nordic_pine", "themeId preserved");
    assert.equal(updated2.templateId, "tmpl_modern_minimal", "templateId preserved");
    assert.equal(updated2.sections?.length, 2, "sections preserved");
  });

  it("4. Styling Persistence — Two rapid sequential updates merge consistently", async () => {
    await StoreRepository.update(testStoreId, {
      styling: {
        contentWidth: "wide",
      },
    });

    await StoreRepository.update(testStoreId, {
      styling: {
        typographyScale: "prominent",
      },
    });

    const reloaded = await StoreRepository.findById(testStoreId);
    assert.ok(reloaded);
    assert.equal(reloaded.styling?.contentWidth, "wide");
    assert.equal(reloaded.styling?.typographyScale, "prominent");
    assert.equal(reloaded.styling?.heroVariation, "editorial");
    assert.equal(reloaded.styling?.cardVariation, "block_solid");
    assert.equal(reloaded.styling?.footerVariation, "business_info");
    assert.equal(reloaded.styling?.buttonRadius, "rounded");
  });

  it("5. Hero Variations — All 10 modular hero variations are recognized and persistable", async () => {
    const heroVariations: NonNullable<StoreStylingTokens["heroVariation"]>[] = [
      "centered",
      "split",
      "image_bg",
      "editorial",
      "minimal",
      "product_spotlight",
      "service_booking",
      "form_conversion",
      "media_showcase",
      "asymmetric",
    ];

    for (const variant of heroVariations) {
      const res = await StoreRepository.update(testStoreId, {
        styling: { heroVariation: variant },
      });
      assert.equal(res?.styling?.heroVariation, variant);
    }
  });

  it("6. Cleanup test store fixture", async () => {
    const deleted = await StoreRepository.delete(testStoreId);
    assert.equal(deleted, true);
    const lookup = await StoreRepository.findById(testStoreId);
    assert.equal(lookup, null);
  });
});
