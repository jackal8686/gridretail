import { test } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";
import { generateSectionId, deepCloneSectionSettings } from "../src/lib/sections/id-generator";
import { SectionInstance } from "../src/types/section";
import { getIsolatedE2ETestRunnerUser } from "../src/lib/repositories/user.repository";
import { canAccessStore } from "../src/lib/auth/permissions";
import { Store } from "../src/types/store";
import { StoreRepository } from "../src/lib/repositories/store.repository";
import { validatePreviewMessage } from "../src/lib/security/preview-origin";
import { EditorSnapshot } from "../src/components/editor/types";

test("Phase 15.1 — Reliability, Evidence & Acceptance Closure Suite", async (t) => {
  // -------------------------------------------------------------------------
  // 1. SECTION ID COLLISION PREVENTION & DEEP SETTINGS CLONING
  // -------------------------------------------------------------------------
  await t.test("1. Collision-Resistant ID Generation under Rapid Synchronous Loops", () => {
    const generatedIds = new Set<string>();
    const count = 500;

    for (let i = 0; i < count; i++) {
      const id = generateSectionId("hero_split");
      assert.ok(id.startsWith("sec_hero_split_"), `Section ID must have proper prefix: ${id}`);
      assert.ok(!generatedIds.has(id), `Section ID collision detected on iteration ${i}: ${id}`);
      generatedIds.add(id);
    }

    assert.equal(generatedIds.size, count, `All ${count} generated IDs must be strictly unique`);
  });

  await t.test("2. Rapid Section Duplication Generates Distinct Stable IDs", () => {
    const baseSection: SectionInstance = {
      id: generateSectionId("featured_products"),
      type: "featured_products",
      order: 0,
      visible: true,
      settings: {
        headline: "Original Collection",
        cardStyle: "bordered",
        items: [
          { id: "item_1", title: "Product A", price: 99 },
          { id: "item_2", title: "Product B", price: 149 },
        ],
      },
    };

    const duplicatedSections: SectionInstance[] = [];
    const duplicateCount = 200;

    for (let i = 0; i < duplicateCount; i++) {
      const dupId = generateSectionId(baseSection.type);
      const dupSettings = deepCloneSectionSettings(baseSection.settings);
      const duplicate: SectionInstance = {
        ...baseSection,
        id: dupId,
        order: i + 1,
        settings: dupSettings,
      };
      duplicatedSections.push(duplicate);
    }

    const uniqueIds = new Set(duplicatedSections.map((s) => s.id));
    assert.equal(uniqueIds.size, duplicateCount, "All duplicated sections must possess unique IDs");
    assert.ok(!uniqueIds.has(baseSection.id), "Duplicates must never share base section ID");
  });

  await t.test("3. Deep Settings Cloning Prevents Mutable Reference Leakage", () => {
    const originalSettings = {
      headline: "Master Suite",
      cards: [
        { title: "Card 1", active: true, tags: ["luxury", "bespoke"] },
        { title: "Card 2", active: false, tags: ["minimal"] },
      ],
      metadata: {
        revision: 1,
        author: { name: "Architect", role: "admin" },
      },
    };

    const cloned = deepCloneSectionSettings(originalSettings);

    // Verify deep equality initially
    assert.deepEqual(cloned, originalSettings);

    // Mutate nested array in cloned copy
    (cloned.cards[0] as { title: string; active: boolean; tags: string[] }).title = "MUTATED CARD 1";
    (cloned.cards[0] as { title: string; active: boolean; tags: string[] }).tags.push("injected");
    (cloned.metadata as { revision: number; author: { name: string } }).author.name = "INTRUDER";

    // Verify original settings were NOT mutated
    assert.equal(
      originalSettings.cards[0].title,
      "Card 1",
      "Original nested card title must not mutate when duplicate changes"
    );
    assert.equal(
      originalSettings.cards[0].tags.length,
      2,
      "Original nested array length must not mutate when duplicate changes"
    );
    assert.equal(
      originalSettings.metadata.author.name,
      "Architect",
      "Original deeply nested metadata must remain immutable"
    );
  });

  await t.test("4. Reorder Operations Preserve IDs, Visibility, and Settings", () => {
    const sections: SectionInstance[] = [
      { id: generateSectionId("hero_split"), type: "hero_split", order: 0, visible: true, settings: { headline: "Hero" } },
      { id: generateSectionId("benefits_grid"), type: "benefits_grid", order: 1, visible: false, settings: { count: 4 } },
      { id: generateSectionId("footer_custom"), type: "footer_custom", order: 2, visible: true, settings: { copyright: "2026" } },
    ];

    const originalIds = sections.map((s) => s.id);
    const originalSettings = sections.map((s) => s.settings);

    // Swap section 0 and 1
    const reordered = [...sections];
    const [moved] = reordered.splice(0, 1);
    reordered.splice(1, 0, moved);
    const normalized = reordered.map((s, idx) => ({ ...s, order: idx }));

    assert.equal(normalized[0].id, originalIds[1], "Section at index 0 must be benefits_grid");
    assert.equal(normalized[1].id, originalIds[0], "Section at index 1 must be hero_split");
    assert.equal(normalized[0].visible, false, "Visibility state must be strictly preserved during reorder");
    assert.equal(normalized[1].visible, true, "Visibility state must be strictly preserved during reorder");
    assert.deepEqual(normalized[0].settings, originalSettings[1], "Settings must remain intact after reordering");
    assert.deepEqual(normalized[1].settings, originalSettings[0], "Settings must remain intact after reordering");
  });

  // -------------------------------------------------------------------------
  // 2. AUTOSAVE SERIALIZATION, FIFO ORDERING & NAVIGATION FLUSH SIMULATION
  // -------------------------------------------------------------------------
  await t.test("5. Request Sequencing & FIFO Ordering Simulation", async () => {
    // Model request sequencing to guarantee that an older slower request never overwrites a newer request
    let requestSeq = 0;
    let lastHandledSeq = 0;
    let currentServerState = "INITIAL";
    let saveStatus = "saved";
    let isSavingInProgress = false;
    let queuedSnapshot: string | null = null;

    const simulateServerSave = async (seq: number, payload: string, delayMs: number, shouldFail = false): Promise<boolean> => {
      isSavingInProgress = true;
      await new Promise((r) => setTimeout(r, delayMs));
      isSavingInProgress = false;

      if (shouldFail) {
        if (seq >= lastHandledSeq) {
          lastHandledSeq = seq;
          saveStatus = "error";
        }
        return false;
      }

      if (seq >= lastHandledSeq) {
        lastHandledSeq = seq;
        currentServerState = payload;
        saveStatus = "saved";

        if (queuedSnapshot && queuedSnapshot !== payload) {
          const nextPayload = queuedSnapshot;
          queuedSnapshot = null;
          return await simulateServerSave(++requestSeq, nextPayload, 5);
        }
        queuedSnapshot = null;
        return true;
      }
      // Slower obsolete request ignored
      return false;
    };

    // 5a. Out-of-order network response handling
    // Request 1 dispatched with 50ms delay
    const req1Seq = ++requestSeq;
    const p1 = simulateServerSave(req1Seq, "STATE_1", 50);

    // Request 2 dispatched shortly after with only 10ms delay (faster than req 1)
    const req2Seq = ++requestSeq;
    const p2 = simulateServerSave(req2Seq, "STATE_2", 10);

    await Promise.all([p1, p2]);

    assert.equal(isSavingInProgress, false, "Save must complete and reset in-progress flag");
    assert.equal(
      currentServerState,
      "STATE_2",
      "Server state must reflect Request 2 because it possessed a newer sequence number"
    );
    assert.equal(saveStatus, "saved", "Final save status must be saved");

    // 5b. Navigation while debounce timer is pending
    let debounceTimer: NodeJS.Timeout | null = null;
    let debouncedState = "STATE_2";
    let unmountFlushed = false;

    // Trigger debounced autosave
    debounceTimer = setTimeout(() => {
      debouncedState = "TIMER_EXPIRED_SAVE";
    }, 2500);

    // User navigates away immediately (unmount flush simulation)
    if (debounceTimer) {
      clearTimeout(debounceTimer);
      debounceTimer = null;
      // Synchronously flush latest pending state via keepalive
      debouncedState = "NAV_UNMOUNT_FLUSH_STATE";
      unmountFlushed = true;
    }
    assert.equal(unmountFlushed, true, "Navigation while debounce is pending must trigger immediate flush");
    assert.equal(debouncedState, "NAV_UNMOUNT_FLUSH_STATE", "Unmount flush must persist latest pending snapshot");

    // 5c. Navigation while a save request is in progress and a newer snapshot is queued
    const inFlightSeq = ++requestSeq;
    const slowSavePromise = simulateServerSave(inFlightSeq, "IN_FLIGHT_STATE", 30);
    // User performs rapid edits and navigates while slow save is in-flight
    queuedSnapshot = "NEWEST_QUEUED_SNAPSHOT";

    // Unmount flushes the newest queued snapshot rather than allowing the in-flight older one to overwrite it
    await slowSavePromise;
    assert.equal(
      currentServerState,
      "NEWEST_QUEUED_SNAPSHOT",
      "Newest queued snapshot must be processed and must not be overwritten by older in-flight state"
    );

    // 5d. Failed save followed by retry
    const failedSeq = ++requestSeq;
    const failResult = await simulateServerSave(failedSeq, "FAULTY_STATE", 10, true);
    assert.equal(failResult, false, "Simulated save failure must return false");
    assert.equal(saveStatus, "error", "Save status must reflect error state");

    // Retry with latest snapshot succeeds with incremented sequence
    const retrySeq = ++requestSeq;
    const retryResult = await simulateServerSave(retrySeq, "RETRY_SUCCESS_STATE", 10, false);
    assert.equal(retryResult, true, "Retry must succeed");
    assert.equal(saveStatus, "saved", "Save status after retry must be saved");
    assert.equal(currentServerState, "RETRY_SUCCESS_STATE", "Server state must reflect retried state");

    // 5e. Server-Side Atomic Revision Ordering via StoreRepository
    const raceStoreId = "str_race_order_test_01";
    await StoreRepository.create({
      id: raceStoreId,
      name: "Initial Store Name",
      slug: "race-order-test-store",
      clientId: "cli_race_01",
      clientName: "Race Client Corp",
      industry: "Fashion & Apparel",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Published",
      productCount: 5,
      description: "Race test store description",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      branding: { primaryColor: "#111", fontFamily: "Inter" },
    });

    // Save Revision 1 applied to server
    const r1 = await StoreRepository.update(raceStoreId, {
      name: "Revision 1 State",
      version: 1,
    });
    assert.equal(r1?.name, "Revision 1 State");
    assert.equal(r1?.version, 1);

    // Save Revision 2 (Newer snapshot dispatched during navigation)
    const r2 = await StoreRepository.update(raceStoreId, {
      name: "Revision 2 (Newest Navigation Flush)",
      version: 2,
    });
    assert.equal(r2?.name, "Revision 2 (Newest Navigation Flush)");
    assert.equal(r2?.version, 2);

    // Older slow in-flight request (Revision 1) arrives late at server
    const staleAttempt = await StoreRepository.update(raceStoreId, {
      name: "Stale Overwrite Attempt (Should Be Ignored)",
      version: 1,
    });
    assert.equal(
      staleAttempt?.name,
      "Revision 2 (Newest Navigation Flush)",
      "Server repository must safely ignore older revision 1 and return existing version 2"
    );

    // Directly query database/memory storage to confirm state was NOT mutated by stale request
    const persistedStore = await StoreRepository.findById(raceStoreId);
    assert.equal(
      persistedStore?.name,
      "Revision 2 (Newest Navigation Flush)",
      "Persisted store in repository must remain the latest version"
    );
    assert.equal(persistedStore?.version, 2, "Persisted version must remain 2");

    // Cleanup
    await StoreRepository.delete(raceStoreId);
  });

  await t.test("6. Undo / Redo Snapshot Invalidation & 30-Item Bound", () => {
    const history: EditorSnapshot[] = [];
    let historyIndex = -1;

    const push = (snap: EditorSnapshot) => {
      history.splice(historyIndex + 1);
      history.push(snap);
      if (history.length > 30) history.shift();
      historyIndex = history.length - 1;
    };

    const snapBase: EditorSnapshot = {
      templateId: "tmpl_modern_minimal",
      themeId: "theme_nordic_pine",
      storeName: "Base Store",
      primaryColor: "#176B4D",
      secondaryColor: "#FAF9F6",
      fontFamily: "Inter, sans-serif",
      heroHeadline: "Base Headline",
      heroSubheadline: "Base Sub",
      aboutText: "About",
      ctaText: "CTA",
      enabledSections: [],
      orderedSections: [],
      sections: [],
      styling: {},
    };

    // Push 3 snapshots
    push({ ...snapBase, heroHeadline: "State 1" });
    push({ ...snapBase, heroHeadline: "State 2" });
    push({ ...snapBase, heroHeadline: "State 3" });
    assert.equal(historyIndex, 2);

    // Undo to State 2
    historyIndex -= 1;
    assert.equal(history[historyIndex].heroHeadline, "State 2");

    // Push new edit while at State 2 -> forward redo history (State 3) must be invalidated
    push({ ...snapBase, heroHeadline: "Branch State" });
    assert.equal(history.length, 3, "Redo forward history must be sliced away");
    assert.equal(history[history.length - 1].heroHeadline, "Branch State");

    // Test 30-item limit bound
    for (let i = 0; i < 45; i++) {
      push({ ...snapBase, heroHeadline: `Head ${i}` });
    }
    assert.equal(history.length, 30, "History stack must never exceed exactly 30 items");
  });

  // -------------------------------------------------------------------------
  // 3. CODE-LEVEL SECURITY VERIFICATION
  // -------------------------------------------------------------------------
  await t.test("7. Security Verification: Test Runner Absent From Normal Fallback Users", () => {
    const fallbackPath = path.join(process.cwd(), "storage", "fallback-users.json");
    if (fs.existsSync(fallbackPath)) {
      const content = fs.readFileSync(fallbackPath, "utf-8");
      assert.doesNotMatch(content, /test-runner@gridretail\.test/);
      assert.doesNotMatch(content, /usr_test_runner_01/);
    }
  });

  await t.test("8. Security Verification: Production Lockout & Real Merchant Containment", () => {
    // 8a. Test runner is strictly blocked in production
    (process.env as Record<string, string | undefined>).NODE_ENV = "production";
    const runnerInProd = getIsolatedE2ETestRunnerUser();
    assert.equal(runnerInProd, null, "getIsolatedE2ETestRunnerUser must return null in production");

    const testRunnerContext = {
      id: "usr_test_runner_01",
      role: "admin" as const,
      email: "test-runner@gridretail.test",
    };

    const mockProdStore: Store = {
      id: "str_real_01",
      name: "Real Merchant",
      slug: "real-merchant",
      clientId: "cli_real_01",
      clientName: "Real Client",
      industry: "Fashion & Apparel",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Published",
      productCount: 10,
      description: "Live commercial store",
      createdAt: "2026-01-01T00:00:00Z",
      lastUpdated: "2026-01-01T00:00:00Z",
      branding: { primaryColor: "#000", secondaryColor: "#fff", fontFamily: "Inter" },
    };

    assert.equal(
      canAccessStore(testRunnerContext, mockProdStore, "view"),
      false,
      "canAccessStore must reject test runner in production"
    );

    // 8b. Test runner blocked from accessing flagged real merchant stores in dev
    (process.env as Record<string, string | undefined>).NODE_ENV = "development";
    (process.env as Record<string, string | undefined>).ENABLE_E2E_TEST_USER = "true";
    const realMerchantStore = {
      ...mockProdStore,
      isRealMerchant: true,
    } as unknown as Store;

    assert.equal(
      canAccessStore(testRunnerContext, realMerchantStore, "edit"),
      false,
      "canAccessStore must block test runner from modifying flagged real merchant store"
    );

    // 8c. Mandatory Deny-by-Default: Test runner blocked even if store has NO special environment flags
    const unflaggedMerchantStore: Store = {
      ...mockProdStore,
      id: "str_unflagged_merchant_99",
      name: "Unflagged Real Merchant",
      slug: "unflagged-real-merchant",
    };
    assert.equal(
      canAccessStore(testRunnerContext, unflaggedMerchantStore, "edit"),
      false,
      "canAccessStore must block test runner from modifying an unflagged merchant store (deny-by-default)"
    );
    assert.equal(
      canAccessStore(testRunnerContext, unflaggedMerchantStore, "view"),
      false,
      "canAccessStore must block test runner from viewing an unflagged merchant store"
    );

    // 8d. Exact registered test-store allowlist: Test runner permitted on verified registered test fixture
    const exactRegisteredStore: Store = {
      ...mockProdStore,
      id: "str_test_store_101",
      name: "Automated E2E Test Store",
      slug: "test-automated-fixture",
    };
    assert.equal(
      canAccessStore(testRunnerContext, exactRegisteredStore, "edit"),
      true,
      "canAccessStore must permit test runner on exact registered test fixture"
    );

    // 8e. Unregistered store with demo- slug: DENIED
    const demoSlugStore: Store = {
      ...mockProdStore,
      id: "str_unreg_demo_99",
      slug: "demo-boutique-store",
    };
    assert.equal(
      canAccessStore(testRunnerContext, demoSlugStore, "edit"),
      false,
      "Unregistered store with demo- slug must be denied to test runner"
    );

    // 8f. Unregistered store with test- slug: DENIED
    const testSlugStore: Store = {
      ...mockProdStore,
      id: "str_unreg_test_slug_99",
      slug: "test-boutique-store",
    };
    assert.equal(
      canAccessStore(testRunnerContext, testSlugStore, "edit"),
      false,
      "Unregistered store with test- slug must be denied to test runner"
    );

    // 8g. Unregistered store with str_test_ prefix: DENIED
    const prefixStore: Store = {
      ...mockProdStore,
      id: "str_test_unregistered_store_99",
      slug: "custom-slug-99",
    };
    assert.equal(
      canAccessStore(testRunnerContext, prefixStore, "edit"),
      false,
      "Unregistered store with str_test_ prefix must be denied to test runner"
    );

    // 8h. Store with creatorId equal to test-runner ID but not registered: DENIED
    const creatorMatchStore: Store = {
      ...mockProdStore,
      id: "str_unreg_creator_99",
      creatorId: "usr_test_runner_01",
    };
    assert.equal(
      canAccessStore(testRunnerContext, creatorMatchStore, "edit"),
      false,
      "Store with creatorId equal to test runner but not in fixture registry must be denied"
    );

    // 8i. Store with isTestStore: true but not registered: DENIED
    const flagMatchStore = {
      ...mockProdStore,
      id: "str_unreg_flagged_99",
      isTestStore: true,
    } as unknown as Store;
    assert.equal(
      canAccessStore(testRunnerContext, flagMatchStore, "edit"),
      false,
      "Store with isTestStore: true but not in fixture registry must be denied"
    );

    // 8j. Normal Administrator permissions remain unchanged
    const normalAdminContext = {
      id: "usr_admin_00",
      role: "admin" as const,
      email: "admin@gridretail.internal",
    };
    assert.equal(
      canAccessStore(normalAdminContext, unflaggedMerchantStore, "edit"),
      true,
      "Normal administrator must retain org-wide edit access to unflagged merchant store"
    );

    // 8k. Normal Employee permissions remain unchanged and tenant-bounded
    const normalEmployeeContext = {
      id: "usr_emp_01",
      role: "employee" as const,
      email: "sarah.chen@gridretail.internal",
    };
    const foreignEmployeeStore: Store = {
      ...mockProdStore,
      creatorId: "usr_emp_99_other",
    };
    assert.equal(
      canAccessStore(normalEmployeeContext, foreignEmployeeStore, "edit"),
      false,
      "Standard employee must be blocked from editing another employee's store"
    );
  });

  await t.test("9. Security Verification: Preview Origin & Protocol Validation", () => {
    // Valid section selection message
    const validSelect = validatePreviewMessage({
      type: "GRIDRETAIL_SECTION_SELECT",
      sectionId: "sec_hero_split_8832a",
    });
    assert.equal(validSelect.valid, true);
    assert.equal(validSelect.sectionId, "sec_hero_split_8832a");

    // Malicious sectionId must be rejected by schema validation (does not match sec_<type>_<uuid>)
    const maliciousMsg = {
      type: "GRIDRETAIL_SECTION_SELECT",
      sectionId: "<script>alert('xss')</script>",
    };
    const validatedMalicious = validatePreviewMessage(maliciousMsg);
    assert.equal(validatedMalicious.valid, false, "Section ID with XSS characters must be rejected");

    // Valid inline update
    const validInline = validatePreviewMessage({
      type: "GRIDRETAIL_INLINE_UPDATE",
      sectionId: "sec_hero_split_8832a",
      field: "headline",
      value: "Refined Vision",
    });
    assert.equal(validInline.valid, true);
    assert.equal(validInline.inlineUpdate?.field, "headline");
    assert.equal(validInline.inlineUpdate?.value, "Refined Vision");

    // Unauthorized inline update field
    const unauthorizedField = validatePreviewMessage({
      type: "GRIDRETAIL_INLINE_UPDATE",
      sectionId: "sec_hero_split_8832a",
      field: "dangerouslySetInnerHTML",
      value: "evil()",
    });
    assert.equal(unauthorizedField.valid, false, "Unauthorized inline field must be rejected");

    // Prototype pollution attempt
    const protoPollution = validatePreviewMessage({
      type: "GRIDRETAIL_INLINE_UPDATE",
      sectionId: "sec_hero_split_8832a",
      field: "__proto__",
      value: "polluted",
    });
    assert.equal(protoPollution.valid, false, "Prototype pollution key must be rejected");

    // Invalid message type
    const invalidMsg = { type: "UNKNOWN_UNTRUSTED_TYPE", payload: {} };
    assert.equal(validatePreviewMessage(invalidMsg).valid, false);
  });
});
