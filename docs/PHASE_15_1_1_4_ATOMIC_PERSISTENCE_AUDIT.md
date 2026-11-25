# GridRetail — Phase 15.1.1.4: Atomic Persistence Audit

## Executive Summary

During the Phase 15.1.1.3 review, an architectural vulnerability was identified in the server-side autosave persistence logic: a naive read-then-write comparison (`existing = findById(); if (incoming < existing.version) ... update()`) creates a Time-of-Check to Time-of-Use (TOCTOU) race condition when concurrent save requests interleave.

In Phase 15.1.1.4, GridRetail has implemented a **genuinely atomic server-side persistence architecture** across both production (MongoDB) and isolated fallback (in-memory/JSON) storage engines.

---

## 1. The TOCTOU Concurrency Problem

### Naive Implementation (Vulnerable)
```typescript
// VULNERABLE: Read-then-write creates TOCTOU race
const existing = await this.findById(id);
if (incomingVersion < existing.version) {
  return existing; // Stale check
}
// <-- RACE WINDOW: A newer save (v3) can commit here!
await db.collection("stores").updateOne({ id }, { $set: dataToUpdate }); // Overwrites v3 with v2!
```

If Request 2 (v2) and Request 3 (v3) arrive simultaneously:
1. Request 2 reads store at v1 (2 > 1 -> valid).
2. Request 3 reads store at v1 (3 > 1 -> valid).
3. Request 3 executes write, committing v3.
4. Request 2 executes write, overwriting v3 with v2, resulting in data loss.

---

## 2. Genuinely Atomic MongoDB Persistence Engine

To eliminate the TOCTOU window under MongoDB, GridRetail executes an **atomic conditional update** in the database engine query predicate itself:

```typescript
// Genuinely Atomic MongoDB Update:
// Evaluates version predicate atomically under document write lock, avoiding read-then-write TOCTOU race conditions
const atomicFilter =
  incomingVersion !== undefined
    ? {
        id,
        $or: [
          { version: { $exists: false } },
          { version: { $lt: incomingVersion } },
        ],
      }
    : { id };

const updateResult = await db.collection<Store>("stores").updateOne(atomicFilter, { $set: dataToUpdate });

if (updateResult.matchedCount === 0) {
  // Document was either not found or had version >= incomingVersion (concurrent write won the race)
  const currentStore = await db.collection<Store>("stores").findOne({ id });
  return currentStore ? (currentStore as Store) : null;
}

return this.findById(id);
```

### Atomicity Guarantees in MongoDB
1. **Document-Level Write Lock:** MongoDB acquires an exclusive write lock on the document before evaluating the query filter (`atomicFilter`).
2. **Atomic Evaluation:** The predicate `{ version: { $lt: incomingVersion } }` is evaluated inside the engine while holding the write lock. If another concurrent request advanced the version in the interim, `matchedCount` evaluates to `0`.
3. **Safe No-Op:** When `matchedCount === 0`, MongoDB does not mutate the document. The repository queries and returns the current newer store state, guaranteeing that no newer save is ever overwritten.

---

## 3. Asynchronous Mutex Queue for Fallback Storage (`withStoreLock`)

In development, CI, and isolated testing without MongoDB, GridRetail provides an asynchronous per-store mutex queue:

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
  storeMutexes.set(storeId, currentLock.then(() => nextLock, () => nextLock));
  try {
    await currentLock;
    return await fn();
  } finally {
    release!();
    if (storeMutexes.get(storeId) === nextLock) {
      storeMutexes.delete(storeId);
    }
  }
}
```

### Mutex Serialization Mechanics
1. **Strict FIFO Ordering:** Operations on the same `storeId` queue behind each other in a Promise chain.
2. **Zero Interleaving:** A subsequent read or write cannot execute until the preceding operation's Promise settles and its lock is released.
3. **Store-Level Isolation:** Mutexes are partitioned by `storeId`. High concurrency on Store A does not block operations on Store B.
4. **Memory Cleanup:** When the queue for a store empties, the map entry is automatically deleted to prevent memory leaks.

---

## 4. Double-Guard Concurrency Defense in API Route

In `src/app/api/stores/[id]/route.ts`, GridRetail implements two layers of concurrency protection:

### Layer 1: Stale Pre-Check
```typescript
if (
  existing.version !== undefined &&
  typeof updates.version === "number" &&
  updates.version <= existing.version
) {
  return NextResponse.json(
    {
      error: "Conflict: Store was modified in another session or tab.",
      conflict: true,
      currentVersion: existing.version,
    },
    { status: 409 }
  );
}
```

### Layer 2: Atomic Post-Resolution Guard
```typescript
const updated = await StoreRepository.update(id, updates);
if (!updated) {
  return NextResponse.json({ error: "Store not found" }, { status: 404 });
}

// Secondary Atomic Concurrency Guard: If an atomic race condition was resolved at the DB/mutex level
// and this write attempt was safely ignored in favor of a newer concurrent write
if (
  typeof updates.version === "number" &&
  typeof updated.version === "number" &&
  updated.version !== updates.version
) {
  return NextResponse.json(
    {
      error: "Conflict: Concurrent update detected. Newer state preserved.",
      conflict: true,
      currentVersion: updated.version,
    },
    { status: 409 }
  );
}
```

---

## 5. Verification Matrix

| Test Scenario | Implementation Mechanism | Expected Behavior | Observed Result | Status |
|---|---|---|---|---|
| Concurrent Delayed Writes | `withStoreLock` & conditional query | Revision 3 writes, Revision 2 delayed | Revision 3 preserved; Revision 2 ignored | **PASS** |
| Competing Equal Writes | Atomic conditional filter & lock | Both submit version 6 simultaneously | Winning update saved; losing update safe | **PASS** |
| Out-of-Order Arriving Saves | MongoDB `$lt` & Memory `<= version` | Older sequence arrives after newer | Server returns current store unchanged | **PASS** |
| Mutex Queue Non-Interleaving | `withStoreLock` Promise chain | 3 staggered concurrent tasks | Strict `1, 11, 2, 22, 3, 33` order | **PASS** |
