import { test } from "node:test";
import assert from "node:assert";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { isValidPreviewUpdatePayload } from "../src/types/customizer";
import { Store } from "../src/types";

test("Drag-and-Drop Storefront Builder & Section Ordering", async (t) => {
  StoreRepository._resetMemory();

  const mockStore: Store = {
    id: "store-builder-1",
    name: "Aero Dynamics",
    slug: "aero-dynamics",
    clientName: "Aero Corp",
    clientId: "client-aero",
    industry: "Sports & Outdoors",
    templateId: "tpl-bold-grid",
    templateName: "Bold Grid",
    status: "Draft",
    productCount: 3,
    lastUpdated: new Date().toISOString(),
    createdAt: new Date().toISOString(),
    description: "High performance cycling equipment.",
    enabledSections: ["hero", "featured_products", "about", "newsletter", "footer"],
    orderedSections: ["hero", "featured_products", "about", "newsletter", "footer"],
  };

  await StoreRepository.create(mockStore);

  await t.test("StoreRepository persists custom section ordering", async () => {
    const reordered = ["about", "hero", "featured_products", "newsletter", "footer"];
    const updated = await StoreRepository.update(mockStore.id, {
      orderedSections: reordered,
    });

    assert.ok(updated);
    assert.deepStrictEqual(updated.orderedSections, reordered);

    const reloaded = await StoreRepository.findById(mockStore.id);
    assert.deepStrictEqual(reloaded?.orderedSections, reordered);
  });

  await t.test("PreviewUpdatePayload validates orderedSections array", () => {
    const payload = {
      name: "Aero Dynamics",
      orderedSections: ["about", "hero", "featured_products", "newsletter", "footer"],
      enabledSections: ["hero", "about"],
    };

    assert.ok(isValidPreviewUpdatePayload(payload));
    assert.strictEqual(payload.orderedSections.length, 5);
    assert.strictEqual(payload.orderedSections[0], "about");
  });

  await t.test("Section movement helper swaps adjacent sections correctly", () => {
    const initialSections = ["hero", "featured_products", "about", "newsletter", "footer"];

    // Helper simulating moveSection(index, direction)
    const move = (sections: string[], index: number, dir: "up" | "down"): string[] => {
      const targetIndex = dir === "up" ? index - 1 : index + 1;
      if (targetIndex < 0 || targetIndex >= sections.length) return sections;
      const copy = [...sections];
      const [item] = copy.splice(index, 1);
      copy.splice(targetIndex, 0, item);
      return copy;
    };

    // Move 'about' (index 2) UP -> should now be at index 1
    const movedUp = move(initialSections, 2, "up");
    assert.deepStrictEqual(movedUp, ["hero", "about", "featured_products", "newsletter", "footer"]);

    // Move 'hero' (index 0) UP -> boundary check, should not change
    const boundaryCheck = move(initialSections, 0, "up");
    assert.deepStrictEqual(boundaryCheck, initialSections);

    // Move 'footer' (index 4) DOWN -> boundary check, should not change
    const bottomCheck = move(initialSections, 4, "down");
    assert.deepStrictEqual(bottomCheck, initialSections);

    // Move 'hero' (index 0) DOWN -> should be at index 1
    const movedDown = move(initialSections, 0, "down");
    assert.deepStrictEqual(movedDown, ["featured_products", "hero", "about", "newsletter", "footer"]);
  });
});
