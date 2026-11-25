import test from "node:test";
import assert from "node:assert/strict";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { MockGenerationProvider } from "../src/lib/generation/mock-provider";
import { BusinessProfile } from "../src/types/business-profile";
import { Store } from "../src/types/store";

test("Phase 16 — Persistence, Atomic Versioning & Safe Regeneration Suite", async (t) => {
  const storeId = `str_test_p16_${Date.now()}`;
  const mockProvider = new MockGenerationProvider();

  const profile: BusinessProfile = {
    businessName: "Krypton Systems",
    industry: "Electronics & Gadgets",
    businessCategory: "Enterprise SaaS",
    description: "Enterprise workflow automation platform.",
    websiteType: "lead_gen",
    primaryGoal: "generate_leads",
  };

  await t.test("1. Generates full website result with valid sections and metadata", async () => {
    const result = await mockProvider.generateWebsite(profile);
    assert.ok(result);
    assert.ok(result.sections.length >= 4);
    assert.equal(result.businessProfile.generationMetadata?.provider, "mock_deterministic_v1");
    assert.equal(result.businessProfile.generationMetadata?.providerType, "deterministic-rules");
    assert.equal(result.businessProfile.generationMetadata?.engineVersion, "16.1.0");
    assert.ok(result.designSystem.templateId);
    assert.ok(result.designSystem.themeId);
  });

  await t.test("2. StoreRepository persists store with businessProfile and version: 1", async () => {
    const genResult = await mockProvider.generateWebsite(profile);

    const newStore: Store = {
      id: storeId,
      name: "Krypton Systems",
      slug: `krypton-${Date.now()}`,
      clientName: "Krypton Corp",
      clientId: "cli_krypton_01",
      industry: "Electronics & Gadgets",
      templateId: genResult.designSystem.templateId,
      templateName: genResult.designSystem.templateName,
      themeId: genResult.designSystem.themeId,
      themeName: genResult.designSystem.themeName,
      status: "Draft",
      productCount: 0,
      lastUpdated: new Date().toISOString(),
      createdAt: new Date().toISOString(),
      description: profile.description || "",
      websiteType: "lead_gen",
      sections: genResult.sections,
      businessProfile: genResult.businessProfile,
      version: 1,
    };

    const created = await StoreRepository.create(newStore);
    assert.ok(created);
    assert.equal(created.id, storeId);
    assert.equal(created.version, 1);
    assert.equal(created.sections?.length, genResult.sections.length);
  });

  await t.test("3. Versioned write policy blocks unversioned businessProfile update on versioned store", async () => {
    // Attempt unversioned update on versioned store
    const result = await StoreRepository.update(storeId, {
      businessProfile: {
        ...profile,
        description: "Attempted unversioned description update.",
      },
    });

    // Write policy must reject unversioned write and preserve existing snapshot
    assert.ok(result);
    assert.equal(result.version, 1);
    assert.notEqual(result.businessProfile?.description, "Attempted unversioned description update.");
    assert.equal(result.businessProfile?.description, profile.description);

    const persisted = await StoreRepository.findById(storeId);
    assert.equal(persisted?.version, 1);
    assert.equal(persisted?.businessProfile?.description, profile.description);
  });

  await t.test("4. Versioned update with version: 2 successfully updates businessProfile", async () => {
    const updated = await StoreRepository.update(storeId, {
      version: 2,
      businessProfile: {
        ...profile,
        description: "Official updated enterprise description.",
        primaryAudience: "VP Engineering and Enterprise Architects",
      },
    });

    assert.ok(updated);
    assert.equal(updated.version, 2);
    assert.equal(updated.businessProfile?.primaryAudience, "VP Engineering and Enterprise Architects");
  });

  await t.test("5. Provider regenerateSection safely produces fresh section settings without mutating others", async () => {
    const store = await StoreRepository.findById(storeId);
    assert.ok(store);
    const existingHero = store?.sections?.find((s) => s.type.startsWith("hero_"));
    assert.ok(existingHero);

    const regeneratedHero = await mockProvider.regenerateSection(
      store!.businessProfile!,
      existingHero!.type,
      existingHero
    );

    assert.ok(regeneratedHero);
    assert.equal(regeneratedHero.id, existingHero!.id, "Regenerated section retains original stable ID");
    assert.equal(regeneratedHero.order, existingHero!.order, "Regenerated section retains order");
    assert.ok(regeneratedHero.settings.headline);

    // Persist regenerated hero with version: 3
    const newSections = store!.sections!.map((s) => (s.id === existingHero!.id ? regeneratedHero : s));
    const updatedStore = await StoreRepository.update(storeId, {
      version: 3,
      sections: newSections,
    });

    assert.equal(updatedStore?.version, 3);
    assert.equal(updatedStore?.sections?.find((s) => s.id === existingHero!.id)?.settings.headline, regeneratedHero.settings.headline);
  });

  await t.test("6. Mutex queue serializes concurrent section updates in fallback mode", async () => {
    const p1 = StoreRepository.update(storeId, {
      version: 4,
      description: "Concurrent update 1",
    });

    const p2 = StoreRepository.update(storeId, {
      version: 5,
      description: "Concurrent update 2",
    });

    const [r1, r2] = await Promise.all([p1, p2]);
    assert.ok(r1);
    assert.ok(r2);
    assert.equal(r1.version, 4);
    assert.equal(r2.version, 5);

    const finalStore = await StoreRepository.findById(storeId);
    assert.equal(finalStore?.version, 5);
    assert.equal(finalStore?.description, "Concurrent update 2");

    // Clean up
    await StoreRepository.delete(storeId);
  });
});
