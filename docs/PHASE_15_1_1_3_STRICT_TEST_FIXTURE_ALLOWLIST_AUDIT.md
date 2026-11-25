# GridRetail Phase 15.1.1.3 — Strict Test-Fixture Allowlist Audit Report

**Document Version:** 1.0.0  
**Phase:** 15.1.1.3 — Strict Test-Store Allowlist & Autosave Race Closure  
**Date:** 2026-11-21  
**Repository:** `D:\grid`  
**Classification:** Security Architecture & Authorization Boundary Audit  
**Status:** FULLY IMPLEMENTED, TESTED & SECURED  

---

## 1. Executive Summary

During previous iterations (Phase 15.1.1 and 15.1.1.2), test runner containment was improved from relying solely on optional merchant flags to a deny-by-default stance. However, a residual security gap remained: the evaluation logic still recognized heuristic patterns—such as `demo-*` or `test-*` slugs, `str_test_*` ID prefixes, `creatorId === user.id`, or `isTestStore: true` flags—as indicators of test store status. An attacker or accidental configuration could craft a store with a `demo-` slug or a `str_test_` ID prefix to grant the automated test runner unauthorized access to commercial data.

In Phase 15.1.1.3, **all heuristic indicators were completely decommissioned**. Test runner access is now strictly confined to an **exact in-memory trusted test-fixture registry** ([`src/lib/auth/test-fixture-registry.ts`](file:///D:/grid/src/lib/auth/test-fixture-registry.ts)). If a store ID is not explicitly present in the registry, access is unconditionally denied.

---

## 2. Architectural Design & Registry Implementation

### 2.1 The Trusted Fixture Registry (`src/lib/auth/test-fixture-registry.ts`)

A dedicated registry was created to maintain the authorized fixture store IDs:

```typescript
// Baseline trusted fixture store IDs seeded for development/E2E test suites
const DEFAULT_TRUSTED_FIXTURE_IDS = new Set<string>([
  "str_01",              // Aura Minimalist (E-commerce fixture)
  "str_07",              // Summit Legal (Appointments fixture)
  "str_08",              // Apex Growth (Lead Gen fixture)
  "str_test_store_101",  // Automated reliability test fixture
  "str_test_fixture_42", // Automated auth test fixture
]);

const dynamicTrustedFixtureIds = new Set<string>();

export function isRegisteredTestFixtureStore(storeId: string): boolean {
  if (!storeId || typeof storeId !== "string") {
    return false;
  }
  return DEFAULT_TRUSTED_FIXTURE_IDS.has(storeId) || dynamicTrustedFixtureIds.has(storeId);
}

export function registerTestFixtureStore(storeId: string): void {
  if (process.env.NODE_ENV === "production") {
    throw new Error("Security Violation: Cannot register test fixture stores in production.");
  }
  if (!storeId || typeof storeId !== "string" || storeId.trim() === "") {
    return;
  }
  dynamicTrustedFixtureIds.add(storeId.trim());
}

export function unregisterTestFixtureStore(storeId: string): void {
  dynamicTrustedFixtureIds.delete(storeId);
}

export function clearDynamicTestFixtures(): void {
  dynamicTrustedFixtureIds.clear();
}
```

### 2.2 Security Controls of the Registry
1. **Client Immunity:** The registry is internal server-side TypeScript code. It cannot be registered, populated, or modified by any public API route, client request, or HTTP payload.
2. **Production Immunity:** `registerTestFixtureStore` throws an explicit runtime exception if `process.env.NODE_ENV === "production"`.
3. **Exact ID Matching:** Access evaluates `isRegisteredTestFixtureStore(store.id)` strictly via $O(1)$ set membership on exact store ID strings.

---

## 3. Enforcement in `canAccessStore` (`src/lib/auth/permissions.ts`)

In [`src/lib/auth/permissions.ts`](file:///D:/grid/src/lib/auth/permissions.ts#L80-L115):

```typescript
export function canAccessStore(
  user: AuthUserContext,
  store: Store,
  action: StoreAction
): boolean {
  // Security Preflight Guard: Automated Test Runner Containment
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

  // Admin and Sales Director have organization-wide access
  if (user.role === "admin" || user.role === "sales_director") {
    return true;
  }
  // Standard role checks continue untouched...
```

---

## 4. Elimination of Heuristic Indicators

The following matrix documents the decommissioned heuristic indicators and verifies that none of them bypass security:

| Heuristic Test Vector | Store Payload Configuration | Old Behavior | Phase 15.1.1.3 Behavior | Result |
|---|---|:---:|:---:|:---:|
| `demo-` slug pattern | `{ id: "str_unreg_01", slug: "demo-boutique" }` | Allowed | **DENIED** | **PASS** |
| `test-` slug pattern | `{ id: "str_unreg_02", slug: "test-boutique" }` | Allowed | **DENIED** | **PASS** |
| `str_test_` prefix | `{ id: "str_test_unregistered_99", slug: "store" }` | Allowed | **DENIED** | **PASS** |
| Creator ID match | `{ id: "str_unreg_03", creatorId: "usr_test_runner_01" }` | Allowed | **DENIED** | **PASS** |
| `isTestStore: true` flag | `{ id: "str_unreg_04", isTestStore: true }` | Allowed | **DENIED** | **PASS** |
| Unflagged Real Store | `{ id: "str_real_99", name: "Real Merchant" }` | Denied | **DENIED** | **PASS** |
| Registered Fixture in Prod | `{ id: "str_test_fixture_42" }` in production | Denied | **DENIED** | **PASS** |
| Exact Registered Fixture | `{ id: "str_test_fixture_42" }` in non-prod | Allowed | **ALLOWED** | **PASS** |
| Standard Admin on Store | `user.role === "admin"`, unflagged store | Allowed | **ALLOWED** | **PASS** |
| Standard Employee on Foreign | `user.role === "employee"`, `creatorId: "other"`| Denied | **DENIED** | **PASS** |

---

## 5. Automated Security Test Evidence

Nine targeted assertions in `tests/auth.test.ts` and six in `tests/phase15-1-reliability.test.ts` assert these boundaries:

```typescript
// tests/auth.test.ts
▶ Test Runner Tenant Isolation & Role Authorization Boundaries
  ✔ exact registered test fixture: allowed in non-production (1.3981ms)
  ✔ unregistered store with demo- slug: denied (0.6695ms)
  ✔ unregistered store with test- slug: denied (0.8964ms)
  ✔ unregistered store with str_test_ prefix: denied (0.4431ms)
  ✔ store with creatorId equal to test-runner ID but not registered: denied (0.31ms)
  ✔ store with isTestStore: true but not registered: denied (0.2863ms)
  ✔ ordinary merchant store with no environment flags: denied (0.3176ms)
  ✔ every store, including registered fixtures, denied to test runners in production (0.3262ms)
  ✔ normal administrator and employee permissions remain unchanged (0.3477ms)
```

Furthermore, [`src/app/api/stores/[id]/route.ts`](file:///D:/grid/src/app/api/stores/[id]/route.ts#L60-L67) enforces HTTP `403 Forbidden` for any unauthorized access attempt:
```typescript
if (!canAccessStore({ id: userId, role: userRole }, existing, "edit")) {
  return NextResponse.json(
    { error: "Forbidden: You do not have permission to modify this store" },
    { status: 403 }
  );
}
```

---

## 6. Conclusion

Heuristic test fixture identification has been eliminated. The automated test runner is restricted strictly to exact registered IDs in non-production environments with unconditional production lockout.

**Audit Status:** **APPROVED & PASSING**
