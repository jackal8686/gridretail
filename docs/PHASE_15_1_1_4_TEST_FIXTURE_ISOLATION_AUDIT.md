# GridRetail — Phase 15.1.1.4: Test Fixture Isolation Audit

## Executive Summary

Phase 15.1.1.4 hardens the isolated test fixture architecture against unauthorized access, environment escapes, and accidental ID collisions. Hardcoded trust across arbitrary non-production environments has been decommissioned in favor of an **isolated test environment check** and an **exact allowlist registry**.

---

## 1. Security Threat Model & Defense Mechanisms

| Vulnerability Vector | Previous Behavior | Hardened Phase 15.1.1.4 Behavior | Defense Mechanism |
|---|---|---|---|
| **Production Access** | Test runner blocked | Test runner blocked + Registration throws fatal error | `isIsolatedTestEnvironment()` strictly returns `false` if `NODE_ENV === "production"` |
| **Generic Dev Environment** | Fixtures trusted in all non-production | Fixtures untrusted unless explicitly in isolated test mode | Requires `NODE_ENV === "test"` OR `ENABLE_E2E_TEST_USER === "true"` OR `ALLOW_TEST_FIXTURES === "true"` |
| **Heuristic Slugs** | `demo-*` or `test-*` slugs probed | Rejected by default | Heuristic slugs alone never grant test-runner access |
| **ID Prefix Collision** | `str_test_*` IDs probed | Rejected by default | Prefixes alone never grant test-runner access |
| **Creator ID Spoofing** | Setting `creatorId: "usr_test_runner_01"` | Rejected by default | Creator matches outside registered fixtures return 403 Forbidden |
| **Flag Tampering** | Setting `isTestStore: true` | Rejected by default | Unregistered flagged stores return 403 Forbidden |
| **Accidental Lookalike Collisions** | Substring / prefix matches | Rejected by exact `Set.has()` | `str_01_merchant`, `str_07_evil`, `str_test_store_101_suffix` are denied |

---

## 2. Implementation Architecture

### Environment Isolation (`src/lib/auth/test-fixture-registry.ts`)
```typescript
/**
 * Validates whether the current execution context is an authorized isolated test environment.
 * Strictly false in production.
 */
export function isIsolatedTestEnvironment(): boolean {
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  return (
    process.env.NODE_ENV === "test" ||
    process.env.ENABLE_E2E_TEST_USER === "true" ||
    process.env.ALLOW_TEST_FIXTURES === "true"
  );
}
```

### Exact Registration Defense
```typescript
export function registerTestFixtureStore(storeId: string): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Security Violation: Cannot register test fixture stores in production.");
  }
  if (!isIsolatedTestEnvironment()) {
    throw new Error("Security Violation: Cannot register test fixture stores outside isolated test environments.");
  }
  if (!storeId || typeof storeId !== "string" || storeId.trim() === "") {
    return;
  }
  hasInitializedDefaultFixtures = true;
  dynamicTrustedFixtureIds.add(storeId.trim());
}
```

### Deny-by-Default Access Guard (`src/lib/auth/permissions.ts`)
```typescript
if (user.id === "usr_test_runner_01" || user.email?.toLowerCase().endsWith("@gridretail.test")) {
  // 1. Absolute production lockout: Test runner can NEVER access ANY store in production
  if (process.env.NODE_ENV === "production") {
    return false;
  }

  // 2. Real merchant store explicit protection: Deny if flagged as real/live/production
  const anyStore = store as unknown as Record<string, unknown>;
  if (
    anyStore.isRealMerchant === true ||
    anyStore.isLiveMerchant === true ||
    anyStore.environment === "production"
  ) {
    return false;
  }

  // 3. Strict Exact Test Fixture Allowlist Registry Check (Deny-by-default):
  // Slugs (demo-*, test-*), ID prefixes (str_test_*), creatorId, or isTestStore flags
  // ALONE ARE NOT PROOF of a fixture.
  // Access is permitted ONLY if store.id is an exact registered test fixture ID in the trusted registry.
  if (!store.id || !isRegisteredTestFixtureStore(store.id)) {
    return false;
  }

  // Within verified, registered test fixtures, test runner is permitted test actions
  return true;
}
```

---

## 3. Accidental Collision & Lookalike Test Evidence

The following verification scenarios were executed in `tests/phase15-1-1-4-concurrency.test.ts`:

1. **Exact Matches:**
   - `str_01` -> **Allowed** (`true`)
   - `str_07` -> **Allowed** (`true`)
   - `str_test_store_101` -> **Allowed** (`true`)
2. **Accidental Collisions & Lookalikes:**
   - `str_01_merchant` -> **Denied** (`false`)
   - `str_07_evil` -> **Denied** (`false`)
   - `str_test_store_101_suffix` -> **Denied** (`false`)
   - `prefix_str_01` -> **Denied** (`false`)
   - `str_0` (substring) -> **Denied** (`false`)
3. **Dynamic Deregistration:**
   - `unregisterTestFixtureStore("str_test_store_101")` -> **Immediately Denied** (`false`)
4. **Production Registration Attempt:**
   - Calling `registerTestFixtureStore` under `NODE_ENV === "production"` -> **Throws fatal Security Violation**
5. **Non-Isolated Environment Registration Attempt:**
   - Calling `registerTestFixtureStore` without test environment or test flags -> **Throws fatal Security Violation**

---

## 4. Preservation of Normal Tenant Isolation

Standard enterprise permissions remain completely unaffected by test runner hardening:
- **Platform Administrators:** Retain full access to all merchant stores across the tenant network.
- **Account Managers:** Retain viewing, editing, deployment, and preview share capabilities.
- **Employees:** Retain strictly tenant-bounded access to their own stores; editing another employee's store remains restricted (403 Forbidden).
