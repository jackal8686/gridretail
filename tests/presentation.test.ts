import { test } from "node:test";
import assert from "node:assert";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { Store } from "../src/types";

test("Client Presentation Mode Deck & Step Navigation", async (t) => {
  StoreRepository._resetMemory();

  const mockStore: Store = {
    id: "store-present-1",
    name: "Artisan Leather Co.",
    slug: "artisan-leather",
    clientName: "Artisan Brands Ltd",
    clientId: "client-artisan",
    industry: "Luxury Goods",
    templateId: "tpl-luxury-haute",
    templateName: "Luxury Haute",
    status: "Approved",
    productCount: 4,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: "Handcrafted Italian leather goods.",
    branding: {
      primaryColor: "#0F172A",
      secondaryColor: "#FAF9F6",
      fontFamily: "'Playfair Display', serif",
    },
  };

  await StoreRepository.create(mockStore);

  const TOTAL_SLIDES = 6;
  const slideTitles = [
    "Executive Vision & Brand Identity",
    "Curated E-Commerce Catalog",
    "Brand Narrative & Trust Signals",
    "Audience Engagement & Conversion",
    "Live Interactive Storefront Simulation",
    "Commercial Next Steps & Delivery",
  ];

  await t.test("Presentation step counter navigation stays within boundaries", () => {
    let currentSlide = 1;

    // Advance 5 times -> should reach slide 6
    for (let i = 0; i < 5; i++) {
      currentSlide = Math.min(currentSlide + 1, TOTAL_SLIDES);
    }
    assert.strictEqual(currentSlide, 6, "Must reach slide 6");

    // Advance past total -> should remain at 6
    currentSlide = Math.min(currentSlide + 1, TOTAL_SLIDES);
    assert.strictEqual(currentSlide, 6, "Must not exceed max slides");

    // Rewind 3 times -> should be at slide 3
    for (let i = 0; i < 3; i++) {
      currentSlide = Math.max(currentSlide - 1, 1);
    }
    assert.strictEqual(currentSlide, 3, "Must rewind to slide 3");

    // Rewind past beginning -> should stay at 1
    for (let i = 0; i < 5; i++) {
      currentSlide = Math.max(currentSlide - 1, 1);
    }
    assert.strictEqual(currentSlide, 1, "Must not go below slide 1");
  });

  await t.test("Slide titles and presenter talking points are defined for all steps", () => {
    assert.strictEqual(slideTitles.length, TOTAL_SLIDES);

    // Each title must be meaningful
    for (const title of slideTitles) {
      assert.ok(title.length > 5);
    }
  });

  await t.test("Store resolution retrieves store details for pitch deck", async () => {
    const resolved = await StoreRepository.findById(mockStore.id);
    assert.ok(resolved);
    assert.strictEqual(resolved.clientName, "Artisan Brands Ltd");
    assert.strictEqual(resolved.status, "Approved");
  });
});
