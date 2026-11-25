# GridRetail — Phase 03: Visual Customizer, Preview Sharing & Media Asset Management

**Document Code:** `PHASE_03_CUSTOMIZER_SHARING_MEDIA`  
**Phase:** 3 — Visual Customizer, Client Sharing, Feedback Workflow & Cloud Media  
**Status:** Complete & Fully Verified  
**Date:** October 13, 2026  
**Auditor / Lead Engineer:** Senior Full-Stack Engineer, Software Architect & Application Security Specialist  

---

## 1. Executive Summary & Scope

Phase 3 delivered the platform's core interactive client collaboration suite:
1. **Visual Storefront Customizer:** A real-time 3-panel editor communicating bidirectionally with the rendered storefront via origin-validated `postMessage` events.
2. **Secure Tokenized Client Preview Links:** Ephemeral, cryptographically hashed share links enabling prospective clients to review proposals without requiring system login credentials.
3. **Client Feedback & Approval Workflow:** A dedicated client review drawer embedded in the preview experience, allowing clients to submit general feedback, request modifications, or grant formal proposal approval.
4. **Cloud Media Asset Management:** A pluggable storage abstraction supporting local uploads in development and S3/R2 object storage in production, complete with MIME validation and 5MB payload limits.

---

## 2. Architecture & Design Decisions

### 2.1 Visual Storefront Customizer & postMessage Pipeline
- **Drawer Panels:** 4 configuration drawers:
  - **Branding:** Primary/secondary accent color pickers, typography pairings, brand logo, and hero banner image.
  - **Content:** Hero copy, value proposition headline, CTA destination, and brand story narrative.
  - **Sections:** Toggles for modular layout blocks (Announcement bar, Hero, Featured products, Brand story, Newsletter, Footer).
  - **Review:** Stream of incoming client comments and revision requests.
- **Bidirectional Handshake Protocol:**
  - `GRIDRETAIL_PREVIEW_READY`: Handshake broadcast by the iframe on component mount.
  - `GRIDRETAIL_PREVIEW_UPDATE`: Payload sent by the customizer upon state mutation.
  - `GRIDRETAIL_PREVIEW_ACK`: Receipt acknowledgment returned by the iframe with timestamp.
  - **Origin Verification:** Enforces `event.origin === window.location.origin` on both ends, blocking spoofing from third-party frames.
- **Persistence:** Commits configuration updates via `PATCH /api/stores/[id]` with activity logging and unsaved-changes indicators (`isDirty`).

### 2.2 Secure Tokenized Client Preview Sharing
- **Cryptographic Generation:** Generates 32-byte cryptographically secure random bearer tokens using `crypto.randomBytes(32).toString("hex")`.
- **Zero Raw Token Storage:** The raw token is returned to the creator once upon creation. Only its SHA-256 hash (`crypto.createHash("sha256").update(token).digest("hex")`) is persisted in MongoDB.
- **Validation Pipeline:** The `/preview/[token]` route hashes the incoming token and checks the database for `status === "active"` and `Date.now() < expiresAt`.
- **Constant-Time Verification:** Uses `crypto.timingSafeEqual` to prevent timing attack enumeration.
- **Instant Revocation:** Operators can revoke access instantaneously via `PATCH /api/stores/[id]/shares/[shareId]`.

### 2.3 Client Feedback & Approval State Machine
- **Floating Client Drawer (`ClientFeedbackDrawer.tsx`):** Unobtrusive drawer enabling clients to provide feedback or approve proposals.
- **Store Status Transitions:**
  - `Draft` → `Pending Review` (upon generating an active preview share)
  - `Pending Review` → `Approved` (when the client grants formal approval)
  - `Pending Review` → `Changes Requested` (when the client requests revisions)
- **Scoping & Isolation:** Feedback records are strictly bound to `storeId` and `shareId`.

### 2.4 Cloud Media Management
- **Storage Abstraction (`StorageProvider`):** Abstract interface implemented by `LocalStorageProvider` (local disk fallback) and `S3StorageProvider` (production S3/R2).
- **Validation Boundary:** Strict MIME type enforcement (`image/png`, `image/jpeg`, `image/webp`, `image/svg+xml`) and 5MB size limit.
- **Store Attachment:** Uploads via `POST /api/stores/[id]/media` automatically associate asset URLs with store branding and push live updates into the customizer.

---

## 3. Key Endpoints & Domain Schemas

### 3.1 REST API Routes
- `PATCH /api/stores/[id]`: Commits customizer design, branding, and content mutations.
- `POST /api/stores/[id]/shares`: Generates an expiring cryptographic share token.
- `GET /api/stores/[id]/shares`: Lists active and expired shares for a store.
- `PATCH /api/stores/[id]/shares/[shareId]`: Immediately revokes a share token.
- `POST /api/preview/[token]/feedback`: Public client feedback submission and approval trigger.
- `GET /api/preview/[token]/feedback`: Client feedback history for the active share.
- `POST /api/stores/[id]/feedback`: Authenticated team response endpoint.
- `GET /api/stores/[id]/feedback`: Authenticated store feedback stream.
- `POST /api/stores/[id]/media`: Multipart media asset upload endpoint.

### 3.2 Data Models (`src/types/preview-share.ts`, `feedback.ts`, `media.ts`)
```typescript
export interface PreviewShare {
  id: string;
  storeId: string;
  tokenHash: string;
  expiresAt: string;
  status: "active" | "revoked" | "expired";
  createdAt: string;
  accessCount: number;
  lastAccessedAt?: string;
}

export interface StoreFeedback {
  id: string;
  storeId: string;
  shareId: string;
  clientName: string;
  clientEmail?: string;
  type: "comment" | "approval" | "change_request";
  message: string;
  createdAt: string;
  resolved?: boolean;
}
```

---

## 4. Testing, Verification & Quality Gates

Automated tests expanded to 42 tests across 8 suites:
- `tests/customizer.test.ts`: Handshake validation, message serialization, and PATCH persistence.
- `tests/preview-share.test.ts`: Cryptographic token generation, SHA-256 hashing, expiration gating, and revocation.
- `tests/feedback.test.ts`: State machine transitions (`Approved`, `Changes Requested`), store scoping, and comment queries.
- `tests/media.test.ts`: Upload processing, storage key generation, MIME filtering, and metadata persistence.

### Verification Results:
- **Lint:** `npm run lint` — 0 errors, 0 warnings.
- **TypeScript:** `npm run type-check` — 0 errors.
- **Tests:** `npm test` — **42 / 42 passed (0 failed)**.
- **Build:** `npm run build` — Clean compilation across all 19 routes.
