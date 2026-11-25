# Phase 13 — Root Cause & Discrepancy Report

**Project:** GridRetail  
**Phase:** 13 — Visual System Stabilization, Browser Verification and Security Hardening  
**Date:** November 21, 2026  
**Auditor:** Full-Stack Architect & Security Reviewer  
**Status:** Resolved & Verified  

---

## 1. Executive Summary

Phase 13 was initiated to independently audit, stabilize, and verify the visual design system, live preview synchronisation, cross-origin communication security, and browser rendering across all three supported website types:
1. **E-commerce**
2. **Appointment Scheduling**
3. **Lead Generation**

While previous reports stated that the visual overhaul implemented 8 layout families and 12 colour themes, our independent inspection established key discrepancies and security vulnerabilities that required immediate engineering remediation prior to production certification.

---

## 2. Discrepancy Matrix

| Item # | Previous Report Claim | Actual Inspected Behavior | Severity | Remediation Status |
|---|---|---|---|---|
| **D-01** | TypeScript type-check passing cleanly with 0 errors | `npm run type-check` failed with TS2322, TS2367, and TS2345 in `tests/visual-design-system-overhaul.test.ts` | **High** | **Resolved:** Corrected mock `IndustryType` values, removed invalid `product_masonry` branch, aligned `Store` interface fields. |
| **D-02** | Secure cross-origin live customizer preview communication | Insecure `!event.origin \|\| event.origin.includes("localhost")` checks in `StorefrontView.tsx`, `AppointmentWebsiteView.tsx`, and `LeadGenWebsiteView.tsx` | **Critical** | **Resolved:** Built RFC-compliant `isAllowedPreviewOrigin` with strict URL parsing, rejecting `attacker-localhost.com` and null origins. |
| **D-03** | Preview customizer works reliably across local subdomains | `src/app/stores/[id]/preview/page.tsx` strictly checked `event.origin !== window.location.origin`, dropping messages from `http://<slug>.localhost:3000` | **High** | **Resolved:** Integrated `isAllowedPreviewOrigin` in the preview listener, supporting both path and local subdomain preview windows. |
| **D-04** | All test suites passing without linter warnings | `tests/phase12-e2e-verification.test.ts` emitted `@typescript-eslint/no-unused-vars` warning for variable `sub` | **Low** | **Resolved:** Added assertion `assert.ok(sub.id)`, achieving 0 errors and 0 warnings. |
| **D-05** | Seamless dev/testing fallback across all 3 website types | `src/mock/stores.ts` only contained e-commerce stores (`str_01`–`str_06`). No appointments or lead gen stores existed in mock fallback | **Medium** | **Resolved:** Added `str_07` (Appointment Scheduling) and `str_08` (Lead Generation) to `MOCK_STORES` with matching service and form definitions. |

---

## 3. Root Cause Analysis

### RCA-01: TypeScript Type Checking Breakage in `visual-design-system-overhaul.test.ts`
- **Symptom:** `npm run type-check` failed during baseline establishment.
- **Root Cause:**
  - Mock test stores used `'Consulting'`, `'Legal'`, and `'Technology'`, which are not valid values of the union `IndustryType` (`"Electronics & Gadgets" | "Fashion & Apparel" | "Home & Living" | "Beauty & Cosmetics" | "Food & Gourmet" | "Sports & Outdoors" | "Luxury Goods" | "Health & Wellness"`).
  - Test checked `tmpl.cardLayout === "product_masonry"` which does not exist in `cardLayout` union.
  - Argument passed to `StoreRepository.create` in test lacked required properties of `Store` interface.
- **Fix:** Refactored `tests/visual-design-system-overhaul.test.ts` to strictly adhere to TypeScript interfaces. `npm run type-check` now passes with 0 errors.

### RCA-02: Insecure `postMessage` Origin Checking
- **Symptom:** Storefront views accepted messages from arbitrary malicious domains containing the substring "localhost" or empty origins.
- **Root Cause:**
  ```typescript
  // INSECURE PREVIOUS IMPLEMENTATION:
  const isAllowedOrigin =
    !event.origin ||
    event.origin === window.location.origin ||
    event.origin.includes("localhost") ||
    event.origin.includes("127.0.0.1");
  ```
  - An attacker could host a webpage at `https://attacker-localhost.com` or `http://127.0.0.1.attacker.com` and dispatch fake `GRIDRETAIL_PREVIEW_UPDATE` messages into an embedded iframe.
  - Allowing `!event.origin` allowed opaque/sandboxed contexts to send untrusted messages.
- **Fix:** Developed `src/lib/security/preview-origin.ts`:
  - Enforces `new URL(origin)` parsing.
  - Verifies exact hostname match (`localhost`, `127.0.0.1`, or single-label RFC-1035 `.localhost` subdomain).
  - Enforces port matching with the active window or environment.
  - In production, restricts exclusively to `window.location.origin` or configured `NEXTAUTH_URL`.

### RCA-03: Subdomain vs. Path Origin Mismatch in Preview Customizer
- **Symptom:** When local subdomains (`http://aura-minimalist.localhost:3000`) were loaded in the customizer iframe, the parent window dropped handshake and acknowledgment events.
- **Root Cause:** The parent window in `preview/page.tsx` enforced `if (event.origin !== window.location.origin) return;`.
- **Fix:** Switched parent window message handler to use `isAllowedPreviewOrigin(event.origin)` and validated message schema with `validatePreviewMessage(event.data)`.

---

## 4. Verification & Quality Gates

Following the implementation of all fixes:
1. `npm run type-check`: 0 errors.
2. `npm run lint`: 0 errors, 0 warnings.
3. `npm test`: 326 tests pass across 27 suites (100% pass rate).
4. `npm run build`: Production build succeeded, 25 routes compiled cleanly.
5. Real browser verification via Playwright: 100% pass across Desktop, Tablet, and Mobile viewports for all 3 website types.
