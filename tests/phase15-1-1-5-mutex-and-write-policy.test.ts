import { test } from "node:test";
import assert from "node:assert/strict";

// Explicitly ensure test environment is active
(process.env as Record<string, string | undefined>).NODE_ENV = "test";
process.env.ENABLE_E2E_TEST_USER = "true";

import {
  StoreRepository,
  withStoreLock,
  _getStoreMutexCount,
  _hasStoreMutex,
} from "../src/lib/repositories/store.repository";

test("Phase 15.1.1.5 — Mutex Queue Cleanup & Versioned Write Policy Suite", async (t) => {
  // -------------------------------------------------------------------------
  // 1. FALLBACK MUTEX QUEUE CLEANUP & SERIALIZATION
  // -------------------------------------------------------------------------
  await t.test("1. One operation completes and its mutex entry is cleaned up", async () => {
    const storeId = "str_cleanup_test_01";
    assert.equal(_hasStoreMutex(storeId), false, "Mutex map must be initially empty for store");

    const result = await withStoreLock(storeId, async () => {
      assert.equal(_hasStoreMutex(storeId), true, "Mutex entry must exist while operation is executing");
      return "OP1_DONE";
    });

    assert.equal(result, "OP1_DONE");
    assert.equal(
      _hasStoreMutex(storeId),
      false,
      "Mutex entry must be removed from map after operation completes"
    );
  });

  await t.test("2. Multiple queued operations retain the lock until the final operation completes", async () => {
    const storeId = "str_cleanup_test_02";
    const executionTrace: number[] = [];

    // Launch 3 queued operations
    const op1 = withStoreLock(storeId, async () => {
      executionTrace.push(1);
      assert.equal(_hasStoreMutex(storeId), true, "Map must retain lock during op 1");
      await new Promise((r) => setTimeout(r, 30));
      executionTrace.push(11);
      return 1;
    });

    const op2 = withStoreLock(storeId, async () => {
      executionTrace.push(2);
      assert.equal(_hasStoreMutex(storeId), true, "Map must retain lock during op 2");
      await new Promise((r) => setTimeout(r, 20));
      executionTrace.push(22);
      return 2;
    });

    const op3 = withStoreLock(storeId, async () => {
      executionTrace.push(3);
      assert.equal(_hasStoreMutex(storeId), true, "Map must retain lock during op 3");
      await new Promise((r) => setTimeout(r, 10));
      executionTrace.push(33);
      return 3;
    });

    // While operations are in flight, map must retain entry
    assert.equal(_hasStoreMutex(storeId), true, "Map must have mutex entry while queue is active");

    const results = await Promise.all([op1, op2, op3]);
    assert.deepEqual(results, [1, 2, 3]);
    assert.deepEqual(executionTrace, [1, 11, 2, 22, 3, 33], "Execution must be strictly sequential FIFO");

    // Only after the final operation (op3) completes should the map entry be deleted
    assert.equal(
      _hasStoreMutex(storeId),
      false,
      "Mutex entry must be deleted after all queued operations complete"
    );
  });

  await t.test("3. A new operation arriving during cleanup cannot bypass the queue", async () => {
    const storeId = "str_cleanup_test_03";
    const order: string[] = [];

    const op1 = withStoreLock(storeId, async () => {
      order.push("op1_start");
      await new Promise((r) => setTimeout(r, 20));
      order.push("op1_end");
      return "op1";
    });

    // Enqueue op2 while op1 is finishing
    const op2 = withStoreLock(storeId, async () => {
      order.push("op2_start");
      order.push("op2_end");
      return "op2";
    });

    await Promise.all([op1, op2]);
    assert.deepEqual(
      order,
      ["op1_start", "op1_end", "op2_start", "op2_end"],
      "Op2 must wait for Op1 and cannot bypass queue"
    );
    assert.equal(_hasStoreMutex(storeId), false, "Mutex entry must be deleted after queue drains");
  });

  await t.test("4. A rejected operation releases the lock and does not wedge the queue", async () => {
    const storeId = "str_cleanup_test_04";

    await assert.rejects(
      async () => {
        await withStoreLock(storeId, async () => {
          throw new Error("Simulated failure in op1");
        });
      },
      /Simulated failure in op1/,
      "Op1 must reject with expected error"
    );

    // After failure, mutex entry must be cleaned up
    assert.equal(
      _hasStoreMutex(storeId),
      false,
      "Mutex entry must be cleaned up even after a rejected operation"
    );
  });

  await t.test("5. A subsequent operation succeeds after a rejection", async () => {
    const storeId = "str_cleanup_test_05";
    const trace: string[] = [];

    const failOp = withStoreLock(storeId, async () => {
      trace.push("fail_op_started");
      await new Promise((r) => setTimeout(r, 10));
      throw new Error("Op failed");
    });

    const followOp = withStoreLock(storeId, async () => {
      trace.push("follow_op_started");
      return "SUCCESS_AFTER_FAILURE";
    });

    await assert.rejects(failOp, /Op failed/);
    const followResult = await followOp;

    assert.equal(followResult, "SUCCESS_AFTER_FAILURE");
    assert.deepEqual(trace, ["fail_op_started", "follow_op_started"]);
    assert.equal(_hasStoreMutex(storeId), false, "Mutex entry must be deleted after final task");
  });

  await t.test("6. Different store IDs execute independently without cross-blocking", async () => {
    const storeA = "str_independent_A";
    const storeB = "str_independent_B";
    const parallelEvents: string[] = [];

    const taskA = withStoreLock(storeA, async () => {
      parallelEvents.push("A_start");
      await new Promise((r) => setTimeout(r, 30));
      parallelEvents.push("A_end");
      return "A";
    });

    const taskB = withStoreLock(storeB, async () => {
      parallelEvents.push("B_start");
      await new Promise((r) => setTimeout(r, 10));
      parallelEvents.push("B_end");
      return "B";
    });

    const [resA, resB] = await Promise.all([taskA, taskB]);
    assert.equal(resA, "A");
    assert.equal(resB, "B");

    // B took 10ms, A took 30ms -> B_end must occur before A_end
    assert.ok(
      parallelEvents.indexOf("B_end") < parallelEvents.indexOf("A_end"),
      "Store B should finish before Store A without waiting for Store A's longer lock"
    );

    assert.equal(_hasStoreMutex(storeA), false);
    assert.equal(_hasStoreMutex(storeB), false);
  });

  await t.test("7. Repeated operations across many store IDs do not leave completed mutex entries behind", async () => {
    const initialCount = _getStoreMutexCount();

    // Run 50 distinct operations across 50 different store IDs
    const storeCount = 50;
    const promises: Promise<number>[] = [];

    for (let i = 0; i < storeCount; i++) {
      const sId = `str_scale_test_${i}`;
      promises.push(
        withStoreLock(sId, async () => {
          await new Promise((r) => setTimeout(r, 2));
          return i;
        })
      );
    }

    const results = await Promise.all(promises);
    assert.equal(results.length, storeCount);

    // After all 50 complete, mutex map must have cleaned up every single entry
    assert.equal(
      _getStoreMutexCount(),
      initialCount,
      "Mutex map size must return to initial state with 0 leaked entries"
    );
  });

  // -------------------------------------------------------------------------
  // 2. VERSIONED WRITE ENFORCEMENT & REGRESSION TESTS
  // -------------------------------------------------------------------------
  await t.test("8. Versioned update accepted when its version is newer", async () => {
    const storeId = "str_policy_test_08";
    await StoreRepository.create({
      id: storeId,
      name: "Versioned Store Base",
      slug: "versioned-store-08",
      clientId: "cli_pol_08",
      clientName: "Client 08",
      industry: "Fashion & Apparel",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Published",
      productCount: 1,
      description: "Desc",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      version: 5,
    });

    // Version 6 is newer than 5 -> accepted
    const updated = await StoreRepository.update(storeId, {
      name: "Version 6 Updated Name",
      version: 6,
    });

    assert.equal(updated?.name, "Version 6 Updated Name");
    assert.equal(updated?.version, 6);

    await StoreRepository.delete(storeId);
  });

  await t.test("9. Stale versioned update rejected and does not mutate store", async () => {
    const storeId = "str_policy_test_09";
    await StoreRepository.create({
      id: storeId,
      name: "Store at Version 5",
      slug: "versioned-store-09",
      clientId: "cli_pol_09",
      clientName: "Client 09",
      industry: "Health & Wellness",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Published",
      productCount: 1,
      description: "Desc",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      version: 5,
    });

    // Stale write with version 4 (4 <= 5)
    const staleResult = await StoreRepository.update(storeId, {
      name: "Stale Overwrite Attempt",
      version: 4,
    });

    assert.equal(
      staleResult?.name,
      "Store at Version 5",
      "Repository must return existing state without applying stale update"
    );
    assert.equal(staleResult?.version, 5);

    const persisted = await StoreRepository.findById(storeId);
    assert.equal(persisted?.name, "Store at Version 5");
    assert.equal(persisted?.version, 5);

    await StoreRepository.delete(storeId);
  });

  await t.test("10. Unversioned update cannot bypass a versioned store's protection", async () => {
    const storeId = "str_policy_test_10";
    await StoreRepository.create({
      id: storeId,
      name: "Protected Versioned Store",
      slug: "protected-store-10",
      clientId: "cli_pol_10",
      clientName: "Client 10",
      industry: "Home & Living",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Published",
      productCount: 2,
      description: "Desc",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      version: 5,
    });

    // Unversioned update attempting to mutate editor-managed field (name)
    const unversionedResult = await StoreRepository.update(storeId, {
      name: "Unversioned Bypass Overwrite",
    });

    assert.equal(
      unversionedResult?.name,
      "Protected Versioned Store",
      "Unversioned update cannot modify editor data on a versioned store"
    );
    assert.equal(unversionedResult?.version, 5, "Version must remain 5");

    const persisted = await StoreRepository.findById(storeId);
    assert.equal(persisted?.name, "Protected Versioned Store");
    assert.equal(persisted?.version, 5);

    await StoreRepository.delete(storeId);
  });

  await t.test("11. Safe legacy compatibility behavior", async () => {
    // 11a. Unversioned store (no version) can be updated by legacy callers
    const unversionedStoreId = "str_legacy_unversioned_11a";
    await StoreRepository.create({
      id: unversionedStoreId,
      name: "Legacy Unversioned Store",
      slug: "legacy-store-11a",
      clientId: "cli_pol_11",
      clientName: "Client 11",
      industry: "Food & Gourmet",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Draft",
      productCount: 0,
      description: "Legacy",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      // version intentionally omitted
    });

    const legacyUpdateResult = await StoreRepository.update(unversionedStoreId, {
      name: "Legacy Updated Name",
      description: "Legacy updated description",
    });

    assert.equal(
      legacyUpdateResult?.name,
      "Legacy Updated Name",
      "Legacy unversioned store must accept updates from unversioned callers"
    );

    // 11b. Non-editor metadata update (e.g. status transition) succeeds on versioned store while preserving version
    const versionedStoreId = "str_status_meta_11b";
    await StoreRepository.create({
      id: versionedStoreId,
      name: "Metadata Test Store",
      slug: "meta-store-11b",
      clientId: "cli_pol_11b",
      clientName: "Client 11b",
      industry: "Beauty & Cosmetics",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Draft",
      productCount: 3,
      description: "Meta",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      version: 8,
    });

    const statusResult = await StoreRepository.update(versionedStoreId, {
      status: "Published",
    });

    assert.equal(statusResult?.status, "Published", "Status change must succeed");
    assert.equal(statusResult?.version, 8, "Version must be strictly preserved at 8");
    assert.equal(statusResult?.name, "Metadata Test Store", "Editor content must remain untouched");

    // 11c. Explicit scoped serverAutoVersion compatibility mechanism
    const autoVerResult = await StoreRepository.update(versionedStoreId, {
      name: "Auto-Versioned Name",
      serverAutoVersion: true,
    });

    assert.equal(autoVerResult?.name, "Auto-Versioned Name");
    assert.equal(autoVerResult?.version, 9, "serverAutoVersion must atomically increment version to 9");

    await StoreRepository.delete(unversionedStoreId);
    await StoreRepository.delete(versionedStoreId);
  });

  await t.test("12. Concurrent versioned and unversioned updates", async () => {
    const storeId = "str_concurrent_v_unv_12";
    await StoreRepository.create({
      id: storeId,
      name: "Base Concurrent Store",
      slug: "concurrent-v-unv-store",
      clientId: "cli_pol_12",
      clientName: "Client 12",
      industry: "Sports & Outdoors",
      templateId: "tmpl_minimal",
      templateName: "Minimal",
      status: "Published",
      productCount: 1,
      description: "Desc",
      createdAt: new Date().toISOString(),
      lastUpdated: new Date().toISOString(),
      version: 5,
    });

    // Versioned update v=6 and unversioned update dispatched concurrently
    const versionedWrite = StoreRepository.update(storeId, {
      name: "Versioned Save (v6)",
      version: 6,
    });

    const unversionedWrite = StoreRepository.update(storeId, {
      name: "Unversioned Rogue Overwrite",
    });

    const [vRes, unvRes] = await Promise.all([versionedWrite, unversionedWrite]);

    assert.equal(vRes?.version, 6, "Versioned write must succeed with version 6");
    assert.equal(vRes?.name, "Versioned Save (v6)");

    // Unversioned write must NOT overwrite the versioned store
    assert.equal(
      unvRes?.name,
      "Versioned Save (v6)",
      "Unversioned write must not overwrite versioned store snapshot"
    );
    assert.equal(unvRes?.version, 6);

    const finalPersisted = await StoreRepository.findById(storeId);
    assert.equal(finalPersisted?.name, "Versioned Save (v6)");
    assert.equal(finalPersisted?.version, 6);

    await StoreRepository.delete(storeId);
  });
});
