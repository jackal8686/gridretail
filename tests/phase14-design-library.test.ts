import { describe, it } from "node:test";
import assert from "node:assert";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { validatePreviewMessage } from "../src/lib/security/preview-origin";
import { StoreStylingTokens } from "../src/types/store";

describe("Phase 14 — Professional Website Design Library Suite", () => {
  it("1. Accepts and validates all 10 Hero Variations in styling tokens", () => {
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

    assert.strictEqual(heroVariations.length, 10);
    heroVariations.forEach((variation) => {
      const payload = {
        type: "GRIDRETAIL_PREVIEW_UPDATE",
        payload: {
          styling: {
            heroVariation: variation,
          },
        },
      };
      const result = validatePreviewMessage(payload);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.payload?.styling?.heroVariation, variation);
    });
  });

  it("2. Accepts and validates all 7 Header Navigation Variations", () => {
    const headerVariations: NonNullable<StoreStylingTokens["headerVariation"]>[] = [
      "minimal",
      "corporate",
      "centered_logo",
      "transparent",
      "commerce_cart",
      "appointment_cta",
      "lead_inquiry",
    ];

    assert.strictEqual(headerVariations.length, 7);
    headerVariations.forEach((nav) => {
      const payload = {
        type: "GRIDRETAIL_PREVIEW_UPDATE",
        payload: {
          styling: {
            headerVariation: nav,
          },
        },
      };
      const result = validatePreviewMessage(payload);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.payload?.styling?.headerVariation, nav);
    });
  });

  it("3. Accepts and validates all 6 Footer Layout Variations", () => {
    const footerVariations: NonNullable<StoreStylingTokens["footerVariation"]>[] = [
      "minimal_inline",
      "multi_column",
      "business_info",
      "commerce_directory",
      "service_practitioner",
      "contact_focused",
    ];

    assert.strictEqual(footerVariations.length, 6);
    footerVariations.forEach((footer) => {
      const payload = {
        type: "GRIDRETAIL_PREVIEW_UPDATE",
        payload: {
          styling: {
            footerVariation: footer,
          },
        },
      };
      const result = validatePreviewMessage(payload);
      assert.strictEqual(result.valid, true);
      assert.strictEqual(result.payload?.styling?.footerVariation, footer);
    });
  });

  it("4. Accepts and validates Card Treatments, Container Widths, Spacing, and Typography Scales", () => {
    const cardVariations: NonNullable<StoreStylingTokens["cardVariation"]>[] = [
      "flat",
      "bordered",
      "elevated",
      "floating",
      "block_solid",
      "soft_rounded",
    ];
    assert.strictEqual(cardVariations.length, 6);

    const widths: NonNullable<StoreStylingTokens["contentWidth"]>[] = ["compact", "normal", "wide"];
    const densities: NonNullable<StoreStylingTokens["spacingDensity"]>[] = ["compact", "normal", "spacious"];
    const scales: NonNullable<StoreStylingTokens["typographyScale"]>[] = ["compact", "balanced", "prominent"];
    const positions: NonNullable<StoreStylingTokens["imagePosition"]>[] = ["left", "right", "center"];

    const payload = {
      type: "GRIDRETAIL_PREVIEW_UPDATE",
      payload: {
        styling: {
          cardVariation: cardVariations[4],
          contentWidth: widths[2],
          spacingDensity: densities[1],
          typographyScale: scales[0],
          imagePosition: positions[0],
        },
      },
    };

    const result = validatePreviewMessage(payload);
    assert.strictEqual(result.valid, true);
    assert.strictEqual(result.payload?.styling?.cardVariation, "block_solid");
    assert.strictEqual(result.payload?.styling?.contentWidth, "wide");
    assert.strictEqual(result.payload?.styling?.spacingDensity, "normal");
    assert.strictEqual(result.payload?.styling?.typographyScale, "compact");
    assert.strictEqual(result.payload?.styling?.imagePosition, "left");
  });

  it("5. Persists extended Phase 14 StoreStylingTokens in StoreRepository", async () => {
    const store = await StoreRepository.create({
      id: "str_phase14_test",
      name: "Phase 14 Design Store",
      slug: "phase14-design-store",
      clientId: "client_phase14",
      clientName: "Phase 14 Client",
      description: "Test Phase 14 Store description",
      industry: "Health & Wellness",
      templateId: "tmpl_modern_minimal",
      templateName: "Modern Minimal",
      themeId: "theme_nordic_pine",
      status: "Draft",
      productCount: 0,
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      styling: {
        buttonRadius: "pill",
        cardStyle: "elevated",
        heroVariation: "editorial",
        headerVariation: "transparent",
        footerVariation: "service_practitioner",
        cardVariation: "floating",
        contentWidth: "wide",
        spacingDensity: "spacious",
        typographyScale: "prominent",
        imagePosition: "left",
      },
    });

    assert.ok(store);
    assert.strictEqual(store.styling?.heroVariation, "editorial");
    assert.strictEqual(store.styling?.headerVariation, "transparent");
    assert.strictEqual(store.styling?.footerVariation, "service_practitioner");
    assert.strictEqual(store.styling?.cardVariation, "floating");
    assert.strictEqual(store.styling?.contentWidth, "wide");
    assert.strictEqual(store.styling?.spacingDensity, "spacious");
    assert.strictEqual(store.styling?.typographyScale, "prominent");
    assert.strictEqual(store.styling?.imagePosition, "left");

    // Update styling tokens
    const updated = await StoreRepository.update(store.id, {
      styling: {
        ...store.styling,
        heroVariation: "asymmetric",
        headerVariation: "corporate",
        footerVariation: "business_info",
        cardVariation: "block_solid",
      },
    });

    assert.ok(updated);
    assert.strictEqual(updated.styling?.heroVariation, "asymmetric");
    assert.strictEqual(updated.styling?.headerVariation, "corporate");
    assert.strictEqual(updated.styling?.footerVariation, "business_info");
    assert.strictEqual(updated.styling?.cardVariation, "block_solid");

    // Clean up
    await StoreRepository.delete(store.id);
  });
});
