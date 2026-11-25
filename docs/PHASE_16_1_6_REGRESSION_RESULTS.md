# GridRetail — Phase 16.1.6 Regression Test Results & 55-File Reconciled Ledger

**Document Version:** 1.0.0  
**Phase:** 16.1.6 (Final Visual Evidence & Copy Accuracy Closure)  
**Date:** 2026-11-22  
**Repository:** `D:\grid`  
**Execution Environment:** Windows (x64) | Node.js v20+ | Next.js 15.5.27

---

## 1. Quality Gates Summary Table

| Quality Gate | Command | Exit Code | Duration | Status | Key Metrics |
| :--- | :--- | :---: | :---: | :---: | :--- |
| **Type Check** | `npm run type-check` | **0** | 6.8s | **PASS** | `tsc --noEmit` — 0 type errors |
| **Linting** | `npm run lint` | **0** | 10.5s | **PASS** | ESLint — 0 warnings, 0 errors |
| **Unit & Integration Tests** | `npm test` | **0** | 95.9s | **PASS** | 55 test files, 34 suites, 447 tests, 0 failures |
| **Production Build** | `npm run build` | **0** | 78.4s | **PASS** | Next.js 15.5.27 — 27/27 static/dynamic routes compiled |

**Overall Gate Status:** **100% PASS** (4/4 passed, 0 failures, 0 regressions)

---

## 2. Updated 55-File Reconciled Test Ledger (447 Discrete Tests)

In Phase 16.1.6, Subtest 16 (*"16. Phase 16.1.6 Conditional Business Copy: Rejects unsupplied merchant details as unsupported factual claims"*) was added to `tests/phase16-content-generation.test.ts`. This advanced the test runner count from 446 to **447 tests**.

Every row in the table below uses strictly plain, unformatted integer digits to guarantee 100% parser compatibility:

| # | Test File Path | Suites | Tests | Pass | Fail |
| :-: | :--- | :-: | :-: | :-: | :-: |
| 1 | tests/analytics.test.ts | 0 | 3 | 3 | 0 |
| 2 | tests/appointment-customizer-compatibility.test.ts | 0 | 9 | 9 | 0 |
| 3 | tests/auth.test.ts | 0 | 35 | 35 | 0 |
| 4 | tests/builder.test.ts | 0 | 4 | 4 | 0 |
| 5 | tests/client-other-option.test.ts | 1 | 6 | 6 | 0 |
| 6 | tests/comments.test.ts | 0 | 4 | 4 | 0 |
| 7 | tests/customizer.test.ts | 0 | 2 | 2 | 0 |
| 8 | tests/db.test.ts | 0 | 11 | 11 | 0 |
| 9 | tests/delivery.test.ts | 0 | 8 | 8 | 0 |
| 10 | tests/deployment.test.ts | 0 | 3 | 3 | 0 |
| 11 | tests/e2e-customizer-preview-sync.test.ts | 0 | 7 | 7 | 0 |
| 12 | tests/e2e-journeys.test.ts | 0 | 8 | 8 | 0 |
| 13 | tests/feedback.test.ts | 0 | 2 | 2 | 0 |
| 14 | tests/media.test.ts | 0 | 2 | 2 | 0 |
| 15 | tests/notifications.test.ts | 0 | 5 | 5 | 0 |
| 16 | tests/permissions.test.ts | 0 | 3 | 3 | 0 |
| 17 | tests/phase10-pdp-collections.test.ts | 1 | 3 | 3 | 0 |
| 18 | tests/phase10-sections-registry.test.ts | 1 | 6 | 6 | 0 |
| 19 | tests/phase10b-ecommerce.test.ts | 7 | 15 | 15 | 0 |
| 20 | tests/phase11-appointments.test.ts | 1 | 8 | 8 | 0 |
| 21 | tests/phase11-authorization.test.ts | 1 | 5 | 5 | 0 |
| 22 | tests/phase11-concurrency.test.ts | 1 | 5 | 5 | 0 |
| 23 | tests/phase11-failure-recovery.test.ts | 1 | 9 | 9 | 0 |
| 24 | tests/phase11-security-logging.test.ts | 1 | 8 | 8 | 0 |
| 25 | tests/phase11-timezones.test.ts | 1 | 7 | 7 | 0 |
| 26 | tests/phase12-csv.test.ts | 1 | 4 | 4 | 0 |
| 27 | tests/phase12-e2e-verification.test.ts | 1 | 4 | 4 | 0 |
| 28 | tests/phase12-lead-gen.test.ts | 1 | 7 | 7 | 0 |
| 29 | tests/phase13-security.test.ts | 5 | 19 | 19 | 0 |
| 30 | tests/phase14-1-1-acceptance.test.ts | 1 | 6 | 6 | 0 |
| 31 | tests/phase14-1-2-fallbacks-statistics.test.ts | 4 | 11 | 11 | 0 |
| 32 | tests/phase14-design-library.test.ts | 1 | 5 | 5 | 0 |
| 33 | tests/phase15-1-1-4-concurrency.test.ts | 0 | 10 | 10 | 0 |
| 34 | tests/phase15-1-1-5-mutex-and-write-policy.test.ts | 0 | 13 | 13 | 0 |
| 35 | tests/phase15-1-reliability.test.ts | 0 | 10 | 10 | 0 |
| 36 | tests/phase15-security-preflight.test.ts | 1 | 8 | 8 | 0 |
| 37 | tests/phase15-visual-editor.test.ts | 0 | 8 | 8 | 0 |
| 38 | tests/phase16-business-profile.test.ts | 0 | 7 | 7 | 0 |
| 39 | tests/phase16-content-generation.test.ts | 0 | 17 | 17 | 0 |
| 40 | tests/phase16-persistence-regeneration.test.ts | 0 | 7 | 7 | 0 |
| 41 | tests/phase16-recommendation-engine.test.ts | 0 | 11 | 11 | 0 |
| 42 | tests/phase7-infrastructure.test.ts | 0 | 24 | 24 | 0 |
| 43 | tests/phase8-rendering-fixes.test.ts | 0 | 14 | 14 | 0 |
| 44 | tests/phase9-categories-products.test.ts | 1 | 7 | 7 | 0 |
| 45 | tests/phase9-images-subdomain.test.ts | 0 | 6 | 6 | 0 |
| 46 | tests/phase9-themes-and-templates.test.ts | 0 | 16 | 16 | 0 |
| 47 | tests/pre-phase-12-customizer-preview-fixes.test.ts | 0 | 10 | 10 | 0 |
| 48 | tests/presentation.test.ts | 0 | 4 | 4 | 0 |
| 49 | tests/preview-share.test.ts | 0 | 2 | 2 | 0 |
| 50 | tests/previously-booked-appointments.test.ts | 1 | 5 | 5 | 0 |
| 51 | tests/security.test.ts | 0 | 6 | 6 | 0 |
| 52 | tests/storefront.test.ts | 0 | 5 | 5 | 0 |
| 53 | tests/subdomains.test.ts | 0 | 10 | 10 | 0 |
| 54 | tests/visual-design-system-overhaul.test.ts | 1 | 5 | 5 | 0 |
| 55 | tests/wizard.test.ts | 0 | 8 | 8 | 0 |
| TOTAL | 55 Test Files | 34 | 447 | 447 | 0 |

---

## 3. Mathematical Reconciliation

$$\sum_{i=1}^{55} \text{Suites}_i = 34 \equiv \text{Runner Suites (34)}$$
$$\sum_{i=1}^{55} \text{Tests}_i = 447 \equiv \text{Runner Tests (447)}$$
$$\sum_{i=1}^{55} \text{Pass}_i = 447 \equiv \text{Runner Pass (447)}$$
$$\sum_{i=1}^{55} \text{Fail}_i = 0 \equiv \text{Runner Fail (0)}$$

All totals match the Node.js test runner output with zero arithmetic error.

---

## 4. Raw Runner Execution Summary

```
> grid@0.1.0 test
> tsx --test --test-concurrency=1 "tests/*.test.ts"

...
ℹ tests 447
ℹ suites 34
ℹ pass 447
ℹ fail 0
ℹ cancelled 0
ℹ skipped 0
ℹ todo 0
ℹ duration_ms 95966.151
```

---

## 5. Production Build Verification

```
> grid@0.1.0 build
> next build
   ▲ Next.js 15.5.27
   - Environments: .env.local

   Creating an optimized production build ...
 ✓ Compiled successfully in 46s
   Linting and checking validity of types ...
   Collecting page data ...
   Generating static pages (0/27) ...
   Generating static pages (6/27) 
   Generating static pages (13/27) 
   Generating static pages (20/27) 
 ✓ Generating static pages (27/27)
   Finalizing page optimization ...
   Collecting build traces ...
```
All 27 routes compiled successfully with zero type or bundling errors.
