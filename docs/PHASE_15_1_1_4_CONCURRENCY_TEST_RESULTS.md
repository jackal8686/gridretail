# GridRetail — Phase 15.1.1.4: Concurrency Test Results

## Executive Summary

This report documents the empirical results of controlled concurrency tests conducted across persistence engines, mutex queues, multi-tab conflicts, navigation keepalive flushes, and tenant isolation registries.

---

## 1. Concurrency Test Suite Results (`tests/phase15-1-1-4-concurrency.test.ts`)

```
▶ Phase 15.1.1.4 — Atomic Autosave Concurrency, Multi-Tab Lifecycle & Strict Fixture Isolation
  ✔ 1. withStoreLock guarantees strict non-interleaved execution (95.8118ms)
  ✔ 2. Atomic server-side save ordering prevents out-of-order overwrites (38.8013ms)
  ✔ 3. Equal version competing writes (TOCTOU race) resolved safely (0.5315ms)
  ✔ 4. 6-step lifecycle: Open(v>0) -> Edit/Save -> Refresh -> Edit/Save -> Navigate -> Edit/Save (0.4526ms)
  ✔ 5. Multi-Tab Conflict: Tab A saves v=6, Tab B submitting v=6 triggers conflict (0.405ms)
  ✔ 6. Production Lockout: registerTestFixtureStore throws fatal Security Violation in production (0.6376ms)
  ✔ 7. Outside Isolated Test Setup: registerTestFixtureStore throws fatal Security Violation (0.3021ms)
  ✔ 8. Accidental ID Collisions & Lookalikes Strictly Denied (0.3941ms)
  ✔ 9. Heuristic Bypasses Denied by Default for Test Runner Access (1.2515ms)
✔ Phase 15.1.1.4 — Atomic Autosave Concurrency, Multi-Tab Lifecycle & Strict Fixture Isolation (144.4455ms)
ℹ tests 10
ℹ suites 0
ℹ pass 10
ℹ fail 0
ℹ duration_ms 148.6902
```

---

## 2. Test Case Deep Dive & Observations

### Test 1: `withStoreLock` Non-Interleaved Execution
- **Setup:** Staggered asynchronous tasks (delays: 40ms, 20ms, 10ms) dispatched concurrently via `Promise.all`.
- **Expected Sequence:** Task 1 must start and finish before Task 2 starts; Task 2 must finish before Task 3 starts.
- **Observed Trace:** `[1, 11, 2, 22, 3, 33]`.
- **Finding:** No interleaving occurred. Fallback storage operations serialize strictly in FIFO order.

### Test 2: Out-of-Order Overwrite Prevention
- **Setup:** Revision 3 submitted immediately; Revision 2 submitted with artificial 25ms delay.
- **Expected Result:** Revision 3 accepted and persisted; delayed Revision 2 recognized as stale (`version: 2 < 3`) and ignored; store remains at Revision 3.
- **Observed Result:** Repository and storage retained `name: "Revision 3 (Newest Write)"` and `version: 3`.

### Test 3: Competing Equal Version Writes (TOCTOU Race)
- **Setup:** Two simultaneous requests (Tab A and Tab B) attempt to write `version: 6` to a store currently at `version: 5`.
- **Expected Result:** Exactly one update commits `version: 6`; the competing request evaluates condition `<= 6` and does not corrupt data.
- **Observed Result:** Persisted store advanced cleanly to `version: 6` with consistent data.

### Test 4: 6-Step Persistence Lifecycle
- **Setup:** Tested initial load with `v=10`, edit & save (`v=11`), page refresh (`v=11`), edit & save (`v=12`), navigation unmount & reopen (`v=12`), edit & save (`v=13`).
- **Observed Result:** Sequence counter initialized correctly on every mount; all 6 operations succeeded without stale rejections.

### Test 5: Multi-Tab Conflict Detection
- **Setup:** Tab A and Tab B loaded store at `v=5`. Tab A saved `v=6`. Tab B submitted `v=6`.
- **Expected Result:** Tab B update detected as conflict (`tabBSaveVer <= currentPersisted.version`).
- **Observed Result:** Server returns 409 Conflict. Tab B sets `saveStatus = "error"`, displays clear conflict alert, and preserves uncommitted changes.

### Tests 6–9: Strict Isolated Fixture Registry Hardening
- **Production Lockout:** Attempting to register fixture in production threw `Security Violation: Cannot register test fixture stores in production`.
- **Non-Isolated Environment:** Attempting registration in generic dev environment without test flags threw `Security Violation: Cannot register test fixture stores outside isolated test environments`.
- **Lookalike Collisions:** Lookalikes (`str_01_merchant`, `str_07_evil`, `str_test_store_101_suffix`, `str_0`) all returned `false`.
- **Heuristic Bypasses:** Stores with `demo-` slug, `test-` slug, `str_test_` prefix, matching `creatorId`, or `isTestStore: true` were all rejected for test runners (403 Forbidden).

---

## 3. Keepalive Navigation Race Safety

### Findings on Browser `keepalive`
1. **Best-Effort Semantics:** The Fetch API `keepalive` flag ensures in-flight HTTP requests survive page navigation or tab closure under normal browser operation.
2. **Abrupt Termination Boundaries:** Browser keepalive cannot guarantee persistence if the underlying OS process is abruptly killed (`SIGKILL`, OS crash, power loss). GridRetail explicitly documents keepalive as best-effort.
3. **Queue Prioritization:** On unmount, `useEditorHistory` prioritizes flushing the latest snapshot in memory, using an incremented sequence counter to ensure that any earlier in-flight save that finishes after unmount cannot overwrite the unmount flush.
