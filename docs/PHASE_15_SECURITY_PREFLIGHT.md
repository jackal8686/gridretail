# Phase 15 — Mandatory Security Preflight Audit & Remediation Report

**Project:** GridRetail  
**Phase:** 15 — Advanced Visual Editor  
**Timestamp:** 2026-11-21  
**Auditor:** Application Security & DevSecOps Lead  
**Files Audited & Remediated:**
- [src/lib/repositories/user.repository.ts](file:///d:/grid/src/lib/repositories/user.repository.ts)
- [src/lib/auth/permissions.ts](file:///d:/grid/src/lib/auth/permissions.ts)
- [storage/fallback-users.json](file:///d:/grid/storage/fallback-users.json)
- [scripts/e2e-phase14-1-verify.ts](file:///d:/grid/scripts/e2e-phase14-1-verify.ts)
- [scripts/e2e-hero-30-combinations.ts](file:///d:/grid/scripts/e2e-hero-30-combinations.ts)
- [tests/phase15-security-preflight.test.ts](file:///d:/grid/tests/phase15-security-preflight.test.ts)

---

## 1. Executive Summary & Audit Mandate

Prior to commencing Phase 15 implementation, a comprehensive security preflight was executed to address vulnerabilities related to testing credentials, test account provisioning, tenant isolation, and secret leakage.

### Verified Remediation Criteria

| Preflight Criteria | Status | Verified Technical Control |
|--------------------|--------|----------------------------|
| **1. Fallback Password Disabled in Normal Dev/Prod** | **VERIFIED** | The test-runner account `usr_test_runner_01` was completely excised from `DEFAULT_USERS` and deleted from `storage/fallback-users.json`. It cannot be resolved or authenticated under standard startup. |
| **2. Test Credentials via Isolated Test Config Only** | **VERIFIED** | `getIsolatedE2ETestRunnerUser()` requires `process.env.ENABLE_E2E_TEST_USER === "true"` and a dynamically supplied `process.env.E2E_ADMIN_PASSWORD`. Password hashes are derived dynamically in-memory; no static password strings exist. |
| **3. Test Account Production Lockout** | **VERIFIED** | Strict guard enforced: if `process.env.NODE_ENV === "production"`, `getIsolatedE2ETestRunnerUser()` returns `null` unconditionally, preventing seeding or lookup in production. |
| **4. Merchant Store Containment** | **VERIFIED** | `canAccessStore()` enforces an explicit guard for test-runner accounts (`usr_test_runner_01` or `*@gridretail.test`): denies all production store access and strictly denies access to any store flagged as a real/live merchant store. |
| **5. Zero Committed Secrets or Reusable Passwords** | **VERIFIED** | All hardcoded password strings were removed from test scripts. Scripts dynamically generate ephemeral random credentials at runtime if not provided in environment variables. |
| **6. Preservation of Existing Security Guardrails** | **VERIFIED** | Tenant isolation, draft store non-disclosure, active product filtering, and RBAC matrix remain intact without degradation. |

---

## 2. Identified Vulnerabilities & Detailed Remediations

### Vulnerability 1: Static Inclusion of Test Runner in `DEFAULT_USERS` and Fallback Storage
- **Finding:** In Phase 14.1.2, `usr_test_runner_01` was added to `DEFAULT_USERS` in `user.repository.ts`, causing it to be automatically serialized into `storage/fallback-users.json`.
- **Remediation:**
  1. Removed `usr_test_runner_01` from `DEFAULT_USERS`.
  2. Purged the serialized `test-runner@gridretail.test` record from `storage/fallback-users.json`.
  3. Replaced static declaration with `getIsolatedE2ETestRunnerUser()` which dynamically constructs the user in-memory only when `ENABLE_E2E_TEST_USER === "true"`.

### Vulnerability 2: Hardcoded Fallback Passwords in E2E Scripts
- **Finding:** `scripts/e2e-hero-30-combinations.ts` and `scripts/e2e-phase14-1-verify.ts` contained a fallback password string.
- **Remediation:**
  1. Removed all hardcoded password strings from both scripts.
  2. Scripts now consume `process.env.E2E_ADMIN_PASSWORD` if provided by CI/CD, or dynamically generate a cryptographically random ephemeral password (`crypto.randomBytes(12)`) per test execution.
  3. Ephemeral credentials are piped to child processes via environment variables and discarded upon test process termination.

### Vulnerability 3: Missing Merchant Store Boundary for Test Runners
- **Finding:** The test runner account was configured with `role: "admin"`, which bypassed store access checks in `canAccessStore()`.
- **Remediation:**
  Updated `canAccessStore()` in `src/lib/auth/permissions.ts` with explicit containment:
  ```ts
  if (user.id === "usr_test_runner_01" || user.email?.toLowerCase().endsWith("@gridretail.test")) {
    if (process.env.NODE_ENV === "production") return false;
    const anyStore = store as unknown as Record<string, unknown>;
    if (anyStore.isRealMerchant === true || anyStore.isLiveMerchant === true || anyStore.environment === "production") {
      return false;
    }
  }
  ```

---

## 3. Automated Preflight Regression Suite

The dedicated regression suite in [`tests/phase15-security-preflight.test.ts`](file:///d:/grid/tests/phase15-security-preflight.test.ts) executed 8 tests verifying all preflight criteria:

```text
▶ Phase 15 — Mandatory Security Preflight Suite
  ✔ 1. Test account is strictly null when ENABLE_E2E_TEST_USER is not set
  ✔ 2. Test account is strictly null in production even if ENABLE_E2E_TEST_USER is true
  ✔ 3. Test account is strictly null when E2E_ADMIN_PASSWORD is empty or short
  ✔ 4. Test account is not seeded into DEFAULT_USERS or storage/fallback-users.json
  ✔ 5. Dynamic password hashing succeeds only with matching isolated password
  ✔ 6. canAccessStore blocks test-runner from production access unconditionally
  ✔ 7. canAccessStore blocks test-runner from accessing real merchant stores
  ✔ 8. No hardcoded test passwords committed in test scripts
✔ Phase 15 — Mandatory Security Preflight Suite (8/8 passed)
```

---

## 4. Preflight Verdict

### Security Preflight Status: **PASSED & APPROVED**

All preflight conditions are met. The codebase is secure, free of hardcoded secrets, and ready for Phase 15 Visual Editor implementation.
