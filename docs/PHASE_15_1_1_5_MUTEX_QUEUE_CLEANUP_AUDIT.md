# GridRetail — Phase 15.1.1.5: Fallback Mutex Queue Cleanup Audit

## Executive Summary

During the Phase 15.1.1.4 review, an object identity discrepancy was discovered in `withStoreLock()` in `src/lib/repositories/store.repository.ts`. The implementation stored a chained Promise in `storeMutexes`, but compared the map entry with `nextLock` during cleanup. Because `tailPromise !== nextLock`, `storeMutexes.delete(storeId)` was never executed, resulting in retained Promise references in memory.

In Phase 15.1.1.5, this cleanup logic has been corrected, hardened against race conditions, and verified across 7 targeted lifecycle scenarios.

---

## 1. Discrepancy & Root Cause Analysis

### Vulnerable Implementation (Phase 15.1.1.4)
```typescript
// DEFECT: Reference mismatch prevents cleanup
export async function withStoreLock<T>(storeId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = storeMutexes.get(storeId) || Promise.resolve();
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  // chained Promise stored in map:
  storeMutexes.set(storeId, currentLock.then(() => nextLock, () => nextLock));
  try {
    await currentLock;
    return await fn();
  } finally {
    release!();
    // BUG: storeMutexes.get(storeId) is the chained Promise, NOT nextLock!
    // This equality check ALWAYS evaluated to false:
    if (storeMutexes.get(storeId) === nextLock) {
      storeMutexes.delete(storeId);
    }
  }
}
```

### Why Cleanup Failed:
1. `nextLock` is an inner `Promise<void>` resolved by `release!()`.
2. `storeMutexes.set(storeId, ...)` stored `currentLock.then(...)`, which returns a **distinct Promise instance** (`tailPromise`).
3. In `finally`, `storeMutexes.get(storeId) === nextLock` evaluated whether `tailPromise === nextLock`.
4. Because two distinct Promise objects in JavaScript are never referentially equal (`tailPromise !== nextLock`), `storeMutexes.delete(storeId)` was dead code. Completed store keys remained in `storeMutexes` indefinitely.

---

## 2. Hardened Implementation (Phase 15.1.1.5)

```typescript
// Per-store asynchronous mutex queue to strictly serialize concurrent operations in fallback mode
const storeMutexes = new Map<string, Promise<unknown>>();

/**
 * Executes an operation with an exclusive per-store asynchronous lock.
 * Prevents race conditions and interleaved concurrent operations on the same store.
 */
export async function withStoreLock<T>(storeId: string, fn: () => Promise<T>): Promise<T> {
  const currentLock = storeMutexes.get(storeId) || Promise.resolve();
  let release: () => void;
  const nextLock = new Promise<void>((resolve) => {
    release = resolve;
  });
  const tailPromise = currentLock.then(() => nextLock, () => nextLock);
  storeMutexes.set(storeId, tailPromise);
  try {
    await currentLock;
    return await fn();
  } finally {
    release!();
    if (storeMutexes.get(storeId) === tailPromise) {
      storeMutexes.delete(storeId);
    }
  }
}

// Internal diagnostics for test assertions (not exposed in public API)
export function _getStoreMutexCount(): number {
  return storeMutexes.size;
}

export function _hasStoreMutex(storeId: string): boolean {
  return storeMutexes.has(storeId);
}
```

---

## 3. Structural Guarantees & Edge-Case Protection

### 3.1 Single Operation Cleanup
When an operation finishes and no other operation has queued:
1. `storeMutexes.get(storeId)` is still `tailPromise`.
2. `storeMutexes.get(storeId) === tailPromise` evaluates to `true`.
3. `storeMutexes.delete(storeId)` removes the store key from the map.
4. Verified: `_hasStoreMutex(storeId)` transitions from `true` to `false`.

### 3.2 Multiple Queued Operations
When multiple operations queue behind one another:
1. Op 1 registers `tailPromise1`.
2. Op 2 arrives while Op 1 is running, setting `storeMutexes` to `tailPromise2`.
3. Op 3 arrives while Op 2 is waiting, setting `storeMutexes` to `tailPromise3`.
4. When Op 1 finishes, `storeMutexes.get(storeId)` is `tailPromise3`. The comparison `tailPromise3 === tailPromise1` is `false`, so Op 1 does **not** delete the map entry.
5. When Op 2 finishes, `tailPromise3 === tailPromise2` is `false`, so Op 2 does **not** delete the map entry.
6. When Op 3 finishes, `storeMutexes.get(storeId)` is `tailPromise3`. The comparison is `true`, so Op 3 removes the entry.
7. Verified: The mutex map retains the lock throughout the entire queue lifecycle until the final task completes.

### 3.3 Rejection Safety (No Deadlocks)
If an operation throws an exception:
1. The `finally` block **always** executes, calling `release!()`.
2. Because `currentLock.then(() => nextLock, () => nextLock)` handles both onFulfilled and onRejected callbacks, `tailPromise` resolves when `nextLock` settles.
3. Queued subsequent operations await `tailPromise` without receiving an unhandled rejection, resuming execution cleanly.
4. Verified: A failing operation releases the lock and the subsequent operation executes and returns successfully.

### 3.4 Multi-Store Isolation
Store locks are partitioned by store ID in `storeMutexes`. Operations on Store A (`str_independent_A`) and Store B (`str_independent_B`) acquire independent Promise chains, allowing parallel execution without cross-blocking.

---

## 4. Verification Evidence

The 7 required mutex test cases were implemented and verified in `tests/phase15-1-1-5-mutex-and-write-policy.test.ts`:

| Test Requirement | Scenario | Assertions | Result |
|---|---|---|---|
| **1. Single Operation Cleanup** | Op 1 completes | `_hasStoreMutex` true during execution, false immediately after | **PASS** (0.63ms) |
| **2. Multi-Operation Retention** | 3 queued ops with staggered delays | Lock retained throughout op1 & op2; deleted only after op3 | **PASS** (82.63ms) |
| **3. Non-Bypass on Cleanup** | Op 2 arrives during Op 1 cleanup | Op 2 waits for Op 1; execution order strictly `op1_start -> op1_end -> op2_start -> op2_end` | **PASS** (30.58ms) |
| **4. Rejected Op Releases Lock** | Op 1 throws Error | Error caught; mutex entry cleaned up; no orphaned lock | **PASS** (1.99ms) |
| **5. Subsequent Op Succeeds** | Op 1 fails, Op 2 queued | Op 2 resumes, executes, and returns `"SUCCESS_AFTER_FAILURE"` | **PASS** (11.12ms) |
| **6. Store Independence** | Parallel ops on Store A (30ms) & Store B (10ms) | Store B finishes before Store A without contention | **PASS** (45.59ms) |
| **7. Scale & Leak Prevention** | 50 operations across 50 distinct store IDs | Final `_getStoreMutexCount()` strictly equals initial count (0 leaks) | **PASS** (15.71ms) |
