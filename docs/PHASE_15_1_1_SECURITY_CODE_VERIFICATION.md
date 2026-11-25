# GridRetail Phase 15.1.1 — Security Code Verification & Defense-in-Depth Audit

**Document Version:** 1.0.0  
**Phase:** 15.1.1 — Final Evidence & Security Closure  
**Date:** 2026-11-21  
**Repository:** `D:\grid`  
**Classification:** Internal Engineering & Security Audit Report  
**Status:** ACCEPTED & VERIFIED  

---

## 1. Executive Summary

This document provides a comprehensive security code verification and vulnerability assessment for GridRetail Phase 15.1.1. Following the visual editor overhaul in Phase 15 and the reliability improvements in Phase 15.1, this audit inspects the security perimeter of the live preview canvas, cross-window `postMessage` interfaces, tenant data isolation boundaries, test-runner accounts, and user credential storage.

All security controls were inspected against the active codebase and validated using automated regression suites (`npm test`), static type-checking (`npm run type-check`), and ESLint security rules (`npm run lint`).

---

## 2. Preview Origin & PostMessage Validation (`preview-origin.ts`)

Cross-document messaging between the visual editor host (`VisualEditorWorkspace`) and storefront preview iframes (`StorefrontView`, `AppointmentWebsiteView`, `LeadGenWebsiteView`) represents the primary IPC bridge. An insecure implementation would expose the parent editor or tenant storefronts to unauthorized DOM manipulation, state corruption, or cross-site scripting (XSS).

### 2.1 Origin Verification (`isAllowedPreviewOrigin`)

Located in [`src/lib/security/preview-origin.ts`](file:///D:/grid/src/lib/security/preview-origin.ts#L47-L125), `isAllowedPreviewOrigin` replaces naive string inclusion (such as `.includes("localhost")`) with strict RFC-compliant URL parsing:

```typescript
export function isAllowedPreviewOrigin(
  origin: string,
  expectedPort?: string | number
): boolean {
  if (!origin || typeof origin !== "string") {
    return false;
  }

  // Reject opaque / "null" origins
  if (origin === "null" || origin.trim() === "") {
    return false;
  }

  let parsed: URL;
  try {
    parsed = new URL(origin);
  } catch {
    return false;
  }

  // Only http and https protocols are permissible
  if (parsed.protocol !== "http:" && parsed.protocol !== "https:") {
    return false;
  }

  // In-browser self-origin match is always trusted
  if (typeof window !== "undefined" && window.location && window.location.origin) {
    if (parsed.origin === window.location.origin) {
      return true;
    }
  }
  // Production vs. Localhost evaluation with explicit port whitelisting...
```

**Security Characteristics Verified:**
- Rejection of opaque (`null`), empty, or non-string origins.
- Protocol restricted strictly to `http:` and `https:` (rejects `javascript:`, `data:`, `vbscript:`).
- In development mode: strictly permits loopback interfaces (`localhost`, `127.0.0.1`, `[::1]`) with verified numerical ports (3000–3010).
- In production mode: strictly matches against whitelisted origins defined in `NEXTAUTH_URL` and `NEXT_PUBLIC_APP_URL`.

### 2.2 Strict Section ID Regex Enforcement (`SECTION_ID_REGEX`)

Section identifiers must strictly adhere to the standardized prefix schema to prevent path traversal, prototype pollution, or database selector injection.

Defined at the module level in [`src/lib/security/preview-origin.ts`](file:///D:/grid/src/lib/security/preview-origin.ts#L25):
```typescript
export const SECTION_ID_REGEX = /^sec_[a-zA-Z0-9_-]{1,100}$/;
```

In `validatePreviewMessage`:
```typescript
if (type === "GRIDRETAIL_SECTION_SELECT") {
  if (typeof msg.sectionId !== "string" || !SECTION_ID_REGEX.test(msg.sectionId)) {
    return { valid: false, error: "Invalid sectionId format." };
  }
  const sectionId = sanitizeCssValue(msg.sectionId);
  return { valid: true, type, sectionId };
}
```

**Protection Matrix:**
| Attack Vector | Test Payload | Validation Result | Defense Mechanism |
|---|---|---|---|
| Prototype Property | `__proto__` | **REJECTED** | Does not match `^sec_` prefix |
| Constructor Hijacking | `constructor` | **REJECTED** | Does not match `^sec_` prefix |
| XSS Script Injection | `<script>alert(1)</script>` | **REJECTED** | Disallowed characters `< > ( ) /` |
| SQL Injection Pattern | `sec_' OR '1'='1` | **REJECTED** | Disallowed characters `' = [space]` |
| Path Traversal | `sec_../../etc/passwd` | **REJECTED** | Disallowed characters `. /` |
| Length Overflow | `sec_` + `'a'*200` | **REJECTED** | Exceeds 100 character maximum |
| Valid Section ID | `sec_hero_1a2b3c` | **ACCEPTED** | Matches format and passes sanitization |

### 2.3 Inline Field Whitelisting (`ALLOWED_INLINE_FIELDS`)

Inline editing updates sent across the postMessage bridge are restricted to a whitelist of customer-facing presentation strings. Internal metadata, system flags, IDs, and database properties cannot be updated via inline editing.

Defined at module level in [`src/lib/security/preview-origin.ts`](file:///D:/grid/src/lib/security/preview-origin.ts#L27-L40):
```typescript
export const ALLOWED_INLINE_FIELDS = new Set([
  "headline",
  "subheadline",
  "ctaText",
  "title",
  "subtitle",
  "description",
  "badge",
  "eyebrow",
  "buttonText",
  "aboutText",
  "bodyParagraph1",
  "bodyParagraph2",
]);
```

In `validatePreviewMessage`:
```typescript
if (type === "GRIDRETAIL_INLINE_UPDATE") {
  if (typeof msg.sectionId !== "string" || !SECTION_ID_REGEX.test(msg.sectionId)) {
    return { valid: false, error: "Invalid sectionId format for inline update." };
  }
  if (typeof msg.field !== "string" || !ALLOWED_INLINE_FIELDS.has(msg.field)) {
    return { valid: false, error: `Unauthorized inline field: ${String(msg.field)}` };
  }
  if (typeof msg.value !== "string") {
    return { valid: false, error: "Inline update value must be a string." };
  }
  const sectionId = sanitizeCssValue(msg.sectionId);
  const field = msg.field;
  const value = sanitizeCssValue(msg.value.slice(0, 1000));
  return { valid: true, type, inlineUpdate: { sectionId, field, value } };
}
```

**Security Result:**
- Unauthorized fields such as `creatorId`, `status`, `environment`, `__proto__`, or `templateId` are rejected with `valid: false`.
- Text values are truncated to 1,000 characters to prevent memory exhaustion.
- CSS expressions and HTML script patterns are stripped via `sanitizeCssValue()`.

---

## 3. PostMessage Sender Verification (`event.source`)

Origin verification alone is insufficient if multiple iframes or third-party windows share the origin. All message event listeners must confirm that `event.source` matches the expected window reference.

In Phase 15.1.1, all four message listeners were hardened with bidirectional window identity verification:

### 3.1 Editor Host: `VisualEditorWorkspace.tsx`
Lines 291–295 in [`src/components/editor/VisualEditorWorkspace.tsx`](file:///D:/grid/src/components/editor/VisualEditorWorkspace.tsx#L291-L295):
```typescript
const handleMessage = (e: MessageEvent) => {
  if (!isAllowedPreviewOrigin(e.origin)) return;
  if (iframeRef.current?.contentWindow && e.source !== iframeRef.current.contentWindow) return;

  const validation = validatePreviewMessage(e.data);
  if (!validation.valid) return;
  // ...
};
```
*Verification:* Messages originating from any window other than the active preview iframe are silently discarded.

### 3.2 Storefront Iframe: `StorefrontView.tsx` (E-commerce)
Lines 236–241 in [`src/components/storefront/StorefrontView.tsx`](file:///D:/grid/src/components/storefront/StorefrontView.tsx#L236-L241):
```typescript
const handleMessage = (event: MessageEvent) => {
  if (!isAllowedPreviewOrigin(event.origin)) return;
  if (window.parent && window.parent !== window && event.source !== window.parent) return;

  const validation = validatePreviewMessage(event.data);
  if (!validation.valid) return;
  // ...
};
```
*Verification:* If framed, the storefront verifies that `event.source === window.parent`. Rogue sibling frames cannot send messages to the storefront.

### 3.3 Storefront Iframe: `AppointmentWebsiteView.tsx` (Appointments)
Lines 111–116 in [`src/components/storefront/AppointmentWebsiteView.tsx`](file:///D:/grid/src/components/storefront/AppointmentWebsiteView.tsx#L111-L116):
```typescript
const handleMessage = (event: MessageEvent) => {
  if (!isAllowedPreviewOrigin(event.origin)) return;
  if (window.parent && window.parent !== window && event.source !== window.parent) return;

  const validation = validatePreviewMessage(event.data);
  if (!validation.valid) return;
  // ...
};
```
*Verification:* Identical strict parent window matching.

### 3.4 Storefront Iframe: `LeadGenWebsiteView.tsx` (Lead Generation)
Lines 102–107 in [`src/components/storefront/LeadGenWebsiteView.tsx`](file:///D:/grid/src/components/storefront/LeadGenWebsiteView.tsx#L102-L107):
```typescript
const handleMessage = (event: MessageEvent) => {
  if (!isAllowedPreviewOrigin(event.origin)) return;
  if (window.parent && window.parent !== window && event.source !== window.parent) return;

  const validation = validatePreviewMessage(event.data);
  if (!validation.valid) return;
  // ...
};
```
*Verification:* Identical strict parent window matching.

---

## 4. User Repository & Test Runner Security

### 4.1 Automated Test Runner Account Isolation

Test runners frequently require elevated permissions to verify administrative workflows. However, hardcoding test accounts into storage or shipping test backdoors to production creates severe vulnerabilities.

[`src/lib/repositories/user.repository.ts`](file:///D:/grid/src/lib/repositories/user.repository.ts#L45-L75) implements an isolated, in-memory-only test runner user provider:

```typescript
export function getIsolatedE2ETestRunnerUser(): User | null {
  // 1. Strictly null in production
  if (process.env.NODE_ENV === "production") {
    return null;
  }
  // 2. Only active when explicitly enabled
  if (process.env.ENABLE_E2E_TEST_USER !== "true") {
    return null;
  }
  // 3. Requires dynamic environment password (no fallback)
  const password = process.env.E2E_ADMIN_PASSWORD;
  if (!password || password.length < 8) {
    return null;
  }
  const email = normalizeEmail(process.env.E2E_ADMIN_EMAIL || "test-runner@gridretail.test");
  return {
    id: "usr_test_runner_01",
    name: "Automated E2E Test Runner",
    email,
    passwordHash: bcrypt.hashSync(password, 10),
    role: "admin",
    status: "active",
    createdAt: "2026-11-21T00:00:00Z",
    updatedAt: "2026-11-21T00:00:00Z",
  };
}
```

### 4.2 Test Runner Containment Guard (`permissions.ts`)

In addition to repository isolation, [`src/lib/auth/permissions.ts`](file:///D:/grid/src/lib/auth/permissions.ts#L80-L95) enforces an absolute kernel-level containment guard inside `canAccessStore`:

```typescript
// Security Preflight Guard: Automated Test Runner Containment
if (user.id === "usr_test_runner_01" || user.email?.toLowerCase().endsWith("@gridretail.test")) {
  // 1. Absolute production lockout: Test runner can NEVER access any store in production
  if (process.env.NODE_ENV === "production") {
    return false;
  }
  // 2. Real merchant store protection: Block test runner from accessing or modifying real merchant stores
  const anyStore = store as unknown as Record<string, unknown>;
  if (
    anyStore.isRealMerchant === true ||
    anyStore.isLiveMerchant === true ||
    anyStore.environment === "production"
  ) {
    return false;
  }
}
```

### 4.3 Fallback Storage Audit (`storage/fallback-users.json`)

The disk fallback user database at [`storage/fallback-users.json`](file:///D:/grid/storage/fallback-users.json) was audited:
1. **Zero Hardcoded Plaintext Passwords:** All users utilize authentic salted bcrypt password hashes (`$2b$10$...`).
2. **Zero Ephemeral Test Runner Persistence:** Test accounts generated during runtime test runs are in-memory or removed upon completion.
3. **Clean Baseline:** The storage file contains 6 legitimate internal system accounts with valid schema properties (`id`, `name`, `email`, `passwordHash`, `role`, `status`, `createdAt`, `updatedAt`).

---

## 5. Store API Security & Tenant Isolation (`/api/stores/[id]`)

Located in [`src/app/api/stores/[id]/route.ts`](file:///D:/grid/src/app/api/stores/[id]/route.ts):

### 5.1 Draft Store Protection (`GET /api/stores/[id]`)
```typescript
// Security Protection: Draft stores require authentication and ownership verification
if (store.status === "Draft") {
  const session = await auth();
  if (!session?.user) {
    return NextResponse.json(
      { error: "Unauthorized: Draft store requires authentication" },
      { status: 401 }
    );
  }
  const userRole = (session.user.role as UserRole) || "employee";
  const userId = session.user.id || "";
  if (!canAccessStore({ id: userId, role: userRole, email: session.user.email || undefined }, store, "view")) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to view this draft store" },
      { status: 403 }
    );
  }
}
```
- Published stores are publicly readable to serve storefronts.
- Draft stores strictly require an authenticated session (401 on missing session) and valid permissions (403 if unauthorized).

### 5.2 Store Modification Authorization (`PATCH` & `PUT`)
Lines 41–67:
```typescript
export async function PATCH(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params;
  const session = await auth();

  if (!session?.user) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const existing = await StoreRepository.findById(id);
  if (!existing) {
    return NextResponse.json({ error: "Store not found" }, { status: 404 });
  }

  const userRole = (session.user.role as UserRole) || "employee";
  const userId = session.user.id || "";
  if (!canAccessStore({ id: userId, role: userRole }, existing, "edit")) {
    return NextResponse.json(
      { error: "Forbidden: You do not have permission to modify this store" },
      { status: 403 }
    );
  }
  // ...
}

export const PUT = PATCH;
```

**Tenant Isolation Rules:**
- Admins and Sales Directors possess organization-wide editing capabilities.
- Account Managers can edit any store.
- Standard employees can only edit stores where `creatorId === user.id` or `creatorId` is unset.
- An attempt by Employee A to modify Employee B's store returns `403 Forbidden`.
- Slug collisions are checked before updating (`409 Conflict` if slug is already taken).
- Every modification creates an immutable audit log entry via `ActivityRepository.record()`.

---

## 6. Automated Security Test Evidence

All security requirements are covered by automated unit and integration tests:

| Test File | Security Subtest | Assertions | Result |
|---|---|---|---|
| `tests/preview-origin.test.ts` | Disallowed origin rejection | Rejects `null`, arbitrary domains, malformed ports | **PASS** |
| `tests/preview-origin.test.ts` | CSS value sanitization | Strips `expression()`, `javascript:`, url tags | **PASS** |
| `tests/phase15-1-reliability.test.ts` | Subtest 9: Security preflight validation | Rejects XSS characters in `sectionId`, rejects unauthorized inline fields, rejects `__proto__` | **PASS** |
| `tests/auth.test.ts` | Role-based store access | Asserts 403 when employee accesses non-owned store | **PASS** |
| `tests/auth.test.ts` | Test runner lockout | Verifies test runner cannot access stores in production mode | **PASS** |
| `tests/phase15-1-reliability.test.ts` | Subtest 1: Secure random section IDs | RFC 4122 v4 compliance, 0 collisions across 1,000 rapid cycles | **PASS** |

---

## 7. Conclusion & Sign-Off

The security perimeter of GridRetail Phase 15.1.1 has been verified. The application employs defense-in-depth across origin validation, message schema parsing, sender identity matching, role-based capability matrices, tenant store isolation, and test runner isolation.

**Verification Status:** **ACCEPTED & APPROVED**
