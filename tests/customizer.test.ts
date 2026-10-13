import test from "node:test";
import assert from "node:assert/strict";
import { isValidPreviewUpdatePayload } from "../src/types/customizer";
import { StoreRepository } from "../src/lib/repositories/store.repository";

test("Customizer Message Validation & Payload Handling", () => {
  assert.equal(isValidPreviewUpdatePayload(null), false);
  assert.equal(isValidPreviewUpdatePayload("invalid-string"), false);
  assert.equal(isValidPreviewUpdatePayload(123), false);

  const validPayload = {
    name: "Updated Boutique",
    branding: {
      primaryColor: "#176B4D",
      secondaryColor: "#FAF9F6",
      heroHeadline: "New Seasonal Collection",
    },
    enabledSections: ["hero", "featured_products"],
  };

  assert.equal(isValidPreviewUpdatePayload(validPayload), true);
});

test("Customizer Store Configuration Persistence via StoreRepository", async () => {
  const store = await StoreRepository.findBySlug("aura-minimalist");
  assert.ok(store, "Aura minimalist demo store should exist");

  const originalName = store.name;
  const updatedName = "Nordic Living Atelier";

  // Update store configuration
  const updated = await StoreRepository.update(store.id, {
    name: updatedName,
    branding: {
      primaryColor: "#104D38",
      fontFamily: "Geist, sans-serif",
      heroHeadline: "Nordic Living Refined",
    },
  });

  assert.ok(updated, "Update should return updated store");
  assert.equal(updated.name, updatedName);
  assert.equal(updated.branding?.primaryColor, "#104D38");
  assert.equal(updated.branding?.fontFamily, "Geist, sans-serif");

  // Restore original state
  await StoreRepository.update(store.id, {
    name: originalName,
    branding: store.branding,
  });
});
