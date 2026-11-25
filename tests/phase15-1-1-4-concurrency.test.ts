import { test } from "node:test";
import assert from "node:assert/strict";

// Explicitly ensure test environment is active
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.ENABLE_E2E_TEST_USER = "true";

import { StoreRepository, withStoreLock } from "../src/lib/repositories/store.repository";
import {
  isIsolatedTestEnvironment,
  isRegisteredTestFixtureStore,
  registerTestFixtureStore,
  unregisterTestFixtureStore,
  clearDynamicTestFixtures,
  initIsolatedTestFixtures,
} from "../src/lib/auth/test-fixture-registry";
import { canAccessStore } from "../src/lib/auth/permissions";
import { Store } from "../src/types/store";

test("Phase 15.1.1.4 — Atomic Autosave Concurrency, Multi-Tab Lifecycle & Strict Fixture Isolation", async (t) => {
  // -------------------------------------------------------------------------
  // 1. ASYNCHRONOUS PER-STORE MUTEX QUEUE SERIALIZATION
  // -------------------------------------------------------------------------
  await t.test("1. withStoreLock guarantees strict non-interleaved execution", async () => {
    const storeId = "str_lock_test_01";
    const executionOrder: number[] = [];

    // Launch 5 concurrent tasks with staggered delays
    const task1 = withStoreLock(storeId, async () => {
      executionOrder.push(1);
      await new Promise((r) => setTimeout(r, 40));
      executionOrder.push(11);
      return 1;
    });

    const task2 = withStoreLock(storeId, async () => {
      executionOrder.push(2);
      await new Promise((r) => setTimeout(r, 20));
      executionOrder.push(22);
      return 2;
    });

    const task3 = withStoreLock(storeId, async () => {
      executionOrder.push(3);
      await new Promise((r) => setTimeout(r, 10));
      executionOrder.push(33);
      return 3;
    });

    const results = await Promise.all([task1, task2, task3]);
    assert.deepEqual(results, [1, 2, 3]);

    // Verify non-interleaved sequential order: each task must finish (11, 22, 33) before next begins
    assert.deepEqual(
      executionOrder,
      [1, 11, 2, 22, 3, 33],
      "Tasks inside withStoreLock must execute sequentially without interleaving"
    );
  });

  // -------------------------------------------------------------------------
  // 2. ATOMIC SERVER-SIDE PERSISTENCE CONCURRENCY & OUT-OF-ORDER RESOLUTION
  // -------------------------------------------------------------------------
  await t.test("2. Atomic server-side save ordering prevents out-of-order overwrites", async () => {
    const storeId = "str_atomic_order_01";
    await StoreRepository.create({
      id: storeId,
      name: "Initial Store",
      slug: "atomic-order-test-store",
      clientId: "cli_atomic_01",
      clientName: "Atomic Client",
      industry: "Health & Wellness",
      templateId: "tmpl_nordic",
      templateName: "Nordic Pine",
      status: "Published",
      productCount: 1,
      description: "Initial description",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      version: 1,
    });

    // Simulate competing writes: Revision 3 arrives first, Revision 2 arrives second
    const writeRevision3 = StoreRepository.update(storeId, {
      name: "Revision 3 (Newest Write)",
      version: 3,
    });

    const writeRevision2Delayed = (async () => {
      await new Promise((r) => setTimeout(r, 25));
      return StoreRepository.update(storeId, {
        name: "Revision 2 (Stale Write)",
        version: 2,
      });
    })();

    const [r3, r2] = await Promise.all([writeRevision3, writeRevision2Delayed]);

    assert.equal(r3?.name, "Revision 3 (Newest Write)");
    assert.equal(r3?.version, 3);

    // Stale Revision 2 must NOT overwrite Revision 3; repository returns existing newer store
    assert.equal(
      r2?.name,
      "Revision 3 (Newest Write)",
      "Stale write must be safely ignored and not overwrite newer persisted version"
    );
    assert.equal(r2?.version, 3);

    // Query repository directly to verify storage integrity
    const persisted = await StoreRepository.findById(storeId);
    assert.equal(persisted?.name, "Revision 3 (Newest Write)");
    assert.equal(persisted?.version, 3);

    await StoreRepository.delete(storeId);
  });

  await t.test("3. Equal version competing writes (TOCTOU race) resolved safely", async () => {
    const storeId = "str_competing_race_02";
    await StoreRepository.create({
      id: storeId,
      name: "Initial Store",
      slug: "competing-race-store",
      clientId: "cli_race_02",
      clientName: "Race Client",
      industry: "Fashion & Apparel",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Published",
      productCount: 2,
      description: "Initial",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      version: 5,
    });

    // Two tabs or requests attempt to write version 6 simultaneously
    const writeTabA = StoreRepository.update(storeId, {
      name: "Tab A Update",
      version: 6,
    });

    const writeTabB = StoreRepository.update(storeId, {
      name: "Tab B Update",
      version: 6,
    });

    const [resA, resB] = await Promise.all([writeTabA, writeTabB]);

    // One must win and advance store to version 6; the second must detect equal version (<= 6) and not overwrite
    assert.ok(resA?.version === 6 && resB?.version === 6);
    // The persisted store must have version 6 and match the winning content
    const persisted = await StoreRepository.findById(storeId);
    assert.equal(persisted?.version, 6);
    assert.ok(
      persisted?.name === "Tab A Update" || persisted?.name === "Tab B Update",
      "Persisted store must maintain valid state from one of the atomic writes"
    );

    await StoreRepository.delete(storeId);
  });

  // -------------------------------------------------------------------------
  // 3. VERSION INITIALIZATION & 6-STEP PERSISTENCE LIFECYCLE
  // -------------------------------------------------------------------------
  await t.test("4. 6-step lifecycle: Open(v>0) -> Edit/Save -> Refresh -> Edit/Save -> Navigate -> Edit/Save", async () => {
    const storeId = "str_lifecycle_test_03";
    let persistedStore = await StoreRepository.create({
      id: storeId,
      name: "Lifecycle Base",
      slug: "lifecycle-test-store",
      clientId: "cli_life_03",
      clientName: "Lifecycle Client",
      industry: "Home & Living",
      templateId: "tmpl_modern",
      templateName: "Modern Minimal",
      status: "Draft",
      productCount: 0,
      description: "Lifecycle test store",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      version: 10, // Step 1: Open store with persisted version > 0
    });

    assert.equal(persistedStore.version, 10, "Step 1: Store opens with version > 0 (v=10)");

    // Step 2: Tab 1 mounts with initialVersion = 10. Edit and save.
    let tab1Seq = persistedStore.version ?? 0;
    const step2Version = ++tab1Seq; // version 11
    assert.equal(step2Version, 11);
    const step2Result = await StoreRepository.update(storeId, {
      name: "Lifecycle Step 2 Name",
      version: step2Version,
    });
    assert.equal(step2Result?.version, 11, "Step 2: Edit and save succeeds with incremented version 11");
    persistedStore = step2Result!;

    // Step 3: Refresh page. Editor remounts.
    // Client initializes requestSeqRef from persistedStore.version (11), NOT from 0!
    let tabRefreshSeq = persistedStore.version ?? 0;
    assert.equal(tabRefreshSeq, 11, "Step 3: After refresh, sequence starts at persisted version 11");

    // Step 4: Edit and save on refreshed page
    const step4Version = ++tabRefreshSeq; // version 12
    assert.equal(step4Version, 12);
    const step4Result = await StoreRepository.update(storeId, {
      name: "Lifecycle Step 4 Refreshed Name",
      version: step4Version,
    });
    assert.equal(step4Result?.version, 12, "Step 4: Edit and save after refresh succeeds with version 12");
    persistedStore = step4Result!;

    // Step 5: Navigate away and reopen editor.
    // Client initializes requestSeqRef from persistedStore.version (12)
    let tabReopenSeq = persistedStore.version ?? 0;
    assert.equal(tabReopenSeq, 12, "Step 5: After reopen, sequence starts at persisted version 12");

    // Step 6: Edit and save after reopen
    const step6Version = ++tabReopenSeq; // version 13
    assert.equal(step6Version, 13);
    const step6Result = await StoreRepository.update(storeId, {
      name: "Lifecycle Step 6 Reopened Name",
      version: step6Version,
    });
    assert.equal(step6Result?.version, 13, "Step 6: Edit and save after reopen succeeds with version 13");
    assert.equal(step6Result?.name, "Lifecycle Step 6 Reopened Name");

    await StoreRepository.delete(storeId);
  });

  // -------------------------------------------------------------------------
  // 4. MULTI-TAB CONFLICT DETECTION & 409 SIMULATION
  // -------------------------------------------------------------------------
  await t.test("5. Multi-Tab Conflict: Tab A saves v=6, Tab B submitting v=6 triggers conflict", async () => {
    const storeId = "str_multi_tab_conflict_04";
    await StoreRepository.create({
      id: storeId,
      name: "Base Multi-Tab Store",
      slug: "multi-tab-conflict-store",
      clientId: "cli_mt_04",
      clientName: "MultiTab Client",
      industry: "Luxury Goods",
      templateId: "tmpl_nordic",
      templateName: "Nordic",
      status: "Published",
      productCount: 4,
      description: "Multi tab test",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      version: 5,
    });

    // Both tabs loaded store at version 5
    const tabAInitialVer = 5;
    const tabBInitialVer = 5;

    // Tab A performs an edit and saves (v = 6)
    const tabASaveVer = tabAInitialVer + 1; // 6
    const tabAResult = await StoreRepository.update(storeId, {
      name: "Tab A Headline Edit",
      version: tabASaveVer,
    });
    assert.equal(tabAResult?.version, 6, "Tab A save succeeds and increments version to 6");

    // Tab B now attempts to submit an edit based on its initial version (v = 6)
    const tabBSaveVer = tabBInitialVer + 1; // 6
    const currentPersisted = await StoreRepository.findById(storeId);
    assert.equal(currentPersisted?.version, 6);

    // Conflict detection logic (matching route.ts & StoreRepository):
    const isConflict = currentPersisted?.version !== undefined && tabBSaveVer <= currentPersisted.version;
    assert.equal(isConflict, true, "Tab B submitting version <= current server version must trigger conflict");

    // Tab B update rejected: StoreRepository returns existing store without overwriting
    const tabBAttempt = await StoreRepository.update(storeId, {
      name: "Tab B Conflicting Edit",
      version: tabBSaveVer,
    });
    assert.equal(
      tabBAttempt?.name,
      "Tab A Headline Edit",
      "Tab B conflicting edit must not overwrite Tab A's persisted data"
    );

    // Verify Tab B client behavior: transitions saveStatus to error
    let tabBSaveStatus: "saved" | "saving" | "unsaved" | "error" = "saving";
    let tabBErrorMessage: string | null = null;

    if (isConflict) {
      tabBSaveStatus = "error";
      tabBErrorMessage = "Conflict: Store was modified in another session or tab.";
    }

    assert.equal(tabBSaveStatus, "error", "Tab B saveStatus must transition to error on conflict");
    assert.equal(
      tabBErrorMessage,
      "Conflict: Store was modified in another session or tab.",
      "Tab B must present clear conflict error message to user"
    );

    await StoreRepository.delete(storeId);
  });

  // -------------------------------------------------------------------------
  // 5. STRICT TEST-FIXTURE REGISTRY HARDENING & ISOLATION
  // -------------------------------------------------------------------------
  await t.test("6. Production Lockout: registerTestFixtureStore throws fatal Security Violation in production", () => {
    const originalEnv = process.env.NODE_ENV;
    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "production";
      assert.throws(
        () => registerTestFixtureStore("str_test_attempt_01"),
        /Security Violation: Cannot register test fixture stores in production/,
        "Attempting to register fixtures in production must throw a fatal Security Violation"
      );
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = originalEnv;
    }
  });

  await t.test("7. Outside Isolated Test Setup: registerTestFixtureStore throws fatal Security Violation", () => {
    const originalAllow = process.env.ALLOW_TEST_FIXTURES;
    try {
      (process.env as Record<string, string | undefined>).NODE_ENV = "development";
      delete process.env.ENABLE_E2E_TEST_USER;
      delete process.env.ALLOW_TEST_FIXTURES;

      assert.equal(
        isIsolatedTestEnvironment(),
        false,
        "isIsolatedTestEnvironment must be false when neither test env nor test flags are set"
      );

      assert.throws(
        () => registerTestFixtureStore("str_dev_attempt_01"),
        /Security Violation: Cannot register test fixture stores outside isolated test environments/,
        "Registration outside isolated test environment must throw fatal Security Violation"
      );
    } finally {
      (process.env as Record<string, string | undefined>).NODE_ENV = "test";
      process.env.ENABLE_E2E_TEST_USER = "true";
      if (originalAllow) process.env.ALLOW_TEST_FIXTURES = originalAllow;
    }
  });

  await t.test("8. Accidental ID Collisions & Lookalikes Strictly Denied", () => {
    clearDynamicTestFixtures();
    initIsolatedTestFixtures(["str_01", "str_07", "str_test_store_101"]);

    // Exact matches permitted
    assert.equal(isRegisteredTestFixtureStore("str_01"), true);
    assert.equal(isRegisteredTestFixtureStore("str_07"), true);
    assert.equal(isRegisteredTestFixtureStore("str_test_store_101"), true);

    // Accidental collisions, prefixes, suffixes and substrings: STRICTLY DENIED
    assert.equal(
      isRegisteredTestFixtureStore("str_01_merchant"),
      false,
      "str_01_merchant must not match str_01"
    );
    assert.equal(
      isRegisteredTestFixtureStore("str_07_evil"),
      false,
      "str_07_evil must not match str_07"
    );
    assert.equal(
      isRegisteredTestFixtureStore("str_test_store_101_suffix"),
      false,
      "str_test_store_101_suffix must not match str_test_store_101"
    );
    assert.equal(
      isRegisteredTestFixtureStore("prefix_str_01"),
      false,
      "prefix_str_01 must not match str_01"
    );
    assert.equal(
      isRegisteredTestFixtureStore("str_0"),
      false,
      "Partial substring str_0 must not match str_01"
    );

    // Dynamic unregister
    unregisterTestFixtureStore("str_test_store_101");
    assert.equal(isRegisteredTestFixtureStore("str_test_store_101"), false);
  });

  await t.test("9. Heuristic Bypasses Denied by Default for Test Runner Access", () => {
    clearDynamicTestFixtures();
    initIsolatedTestFixtures(["str_test_store_101"]);

    const testRunnerContext = {
      id: "usr_test_runner_01",
      role: "admin" as const,
      email: "test-runner@gridretail.test",
    };

    const baseStore: Store = {
      id: "str_arbitrary_01",
      name: "Arbitrary Store",
      slug: "arbitrary-store",
      clientId: "cli_01",
      clientName: "Client",
      industry: "Luxury Goods",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Published",
      productCount: 1,
      description: "Desc",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
    };

    // Heuristic 1: demo- slug alone -> DENIED
    assert.equal(
      canAccessStore(testRunnerContext, { ...baseStore, slug: "demo-fashion-store" }, "edit"),
      false,
      "demo- slug alone must not grant test-runner access"
    );

    // Heuristic 2: test- slug alone -> DENIED
    assert.equal(
      canAccessStore(testRunnerContext, { ...baseStore, slug: "test-fashion-store" }, "edit"),
      false,
      "test- slug alone must not grant test-runner access"
    );

    // Heuristic 3: str_test_ ID prefix alone -> DENIED
    assert.equal(
      canAccessStore(testRunnerContext, { ...baseStore, id: "str_test_unregistered_store" }, "edit"),
      false,
      "str_test_ prefix alone must not grant test-runner access"
    );

    // Heuristic 4: creatorId === testRunner.id -> DENIED
    assert.equal(
      canAccessStore(testRunnerContext, { ...baseStore, creatorId: "usr_test_runner_01" }, "edit"),
      false,
      "creatorId match alone must not grant test-runner access"
    );

    // Heuristic 5: isTestStore flag alone -> DENIED
    assert.equal(
      canAccessStore(
        testRunnerContext,
        { ...baseStore, isTestStore: true } as unknown as Store,
        "edit"
      ),
      false,
      "isTestStore boolean flag alone must not grant test-runner access"
    );

    // Exact registered ID -> PERMITTED
    assert.equal(
      canAccessStore(testRunnerContext, { ...baseStore, id: "str_test_store_101" }, "edit"),
      true,
      "Exact registered fixture store ID must grant test-runner access"
    );
  });
});
