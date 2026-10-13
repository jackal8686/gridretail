import test from "node:test";
import assert from "node:assert/strict";
import { normalizeSlug, validateSlug } from "../src/lib/validation/slug";
import { validateStoreInput } from "../src/lib/validation/store";

test("Slug Normalization & Security Test", (t) => {
  t.test("normalizes uppercase and special characters to lowercase alphanumeric slugs", () => {
    assert.equal(normalizeSlug("Aura Minimalist Living & Co."), "aura-minimalist-living-co");
    assert.equal(normalizeSlug("  ---Tech--Monolith--- "), "tech-monolith");
  });

  t.test("rejects slugs that are too short", () => {
    const res = validateSlug("ab");
    assert.equal(res.valid, false);
  });

  t.test("rejects reserved system keywords as storefront slugs", () => {
    assert.equal(validateSlug("admin").valid, false);
    assert.equal(validateSlug("dashboard").valid, false);
    assert.equal(validateSlug("api").valid, false);
    assert.equal(validateSlug("new").valid, false);
    assert.equal(validateSlug("login").valid, false);
  });

  t.test("accepts valid commercial slugs", () => {
    assert.equal(validateSlug("zenith-couture-2026").valid, true);
    assert.equal(validateSlug("solstice-audio").valid, true);
  });
});

test("Store Input Validation Test", (t) => {
  t.test("validates required fields: name, client, industry, template", () => {
    const missingAll = validateStoreInput({});
    assert.equal(missingAll.valid, false);
    assert.ok(missingAll.errors.name);
    assert.ok(missingAll.errors.clientId);
    assert.ok(missingAll.errors.industry);
    assert.ok(missingAll.errors.templateId);

    const valid = validateStoreInput({
      name: "Zenith Optical Lounge",
      clientId: "cli_01",
      industry: "Luxury Goods",
      templateId: "tpl_luxury_haute",
      slug: "zenith-optical-lounge",
      branding: {
        primaryColor: "#CA8A04",
      },
    });

    assert.equal(valid.valid, true);
    assert.equal(valid.sanitized?.name, "Zenith Optical Lounge");
    assert.equal(valid.sanitized?.slug, "zenith-optical-lounge");
    assert.equal(valid.sanitized?.branding?.primaryColor, "#CA8A04");
  });

  t.test("validates hex color formats in branding", () => {
    const invalidColor = validateStoreInput({
      name: "Test Store",
      clientId: "cli_01",
      industry: "Home & Living",
      templateId: "tpl_nordic_clean",
      branding: {
        primaryColor: "not-a-hex-color",
      },
    });

    assert.equal(invalidColor.valid, false);
    assert.ok(invalidColor.errors.primaryColor);
  });
});
