# GridRetail — Architecture Blueprint

## 1. System Vision & Purpose

GridRetail is an internal SaaS platform designed to accelerate sales cycles by generating customized, high-fidelity e-commerce demo storefronts for prospective clients within minutes.

Instead of manual design mockups, platform operators follow an intuitive workflow:
1. Provision client stores using an intuitive 5-step wizard.
2. Fine-tune aesthetics and layout in real-time using the **Visual Storefront Customizer**.
3. Generate secure, tokenized **Client Preview Links** with configurable expiration.
4. Share links with prospective clients who review, submit comments, and approve proposals directly via a floating client review panel.
5. Upload bespoke logos and hero banners through a unified **Cloud Media Management** pipeline.

---

## 2. Phase 3 Architecture & Data Flow

```mermaid
flowchart TD
    subgraph ClientLayer [Presentation Layer]
        Customizer["/stores/[id]/preview (Visual Customizer)"]
        PublicPreview["/preview/[token] (Public Client Preview)"]
        PublicStore["/store/[slug] (Rendered Storefront)"]
    end

    subgraph SecurityLayer [Security & Route Guard]
        MW[Next.js Middleware]
        AuthJS[Auth.js v5 RBAC]
        TokenVerifier[Crypto Token Verifier (SHA-256)]
    end

    subgraph MessagingLayer [Live Sync Layer]
        PostMessage[Bidirectional Origin-Validated postMessage]
    end

    subgraph StorageLayer [Media Storage]
        StorageAdapter[Storage Provider Abstraction]
        LocalDisk[Local Public Uploads]
        S3Cloud[S3 / R2 Object Storage]
    end

    subgraph ApiLayer [API Layer]
        StoresAPI["/api/stores/[id] (PATCH config)"]
        SharesAPI["/api/stores/[id]/shares (POST/PATCH token shares)"]
        FeedbackAPI["/api/preview/[token]/feedback (Client review)"]
        MediaAPI["/api/stores/[id]/media (Asset uploads)"]
    end

    subgraph RepositoryLayer [Domain Repositories]
        StoreRepo[StoreRepository]
        ShareRepo[PreviewShareRepository]
        FeedbackRepo[FeedbackRepository]
        MediaRepo[MediaAssetRepository]
        UserRepo[UserRepository]
    end

    Customizer <-->|postMessage Live Update| PublicStore
    Customizer --> StoresAPI
    Customizer --> SharesAPI
    Customizer --> MediaAPI
    PublicPreview --> TokenVerifier
    TokenVerifier --> ShareRepo
    PublicPreview --> FeedbackAPI
    FeedbackAPI --> FeedbackRepo
    FeedbackAPI --> StoreRepo
    MediaAPI --> StorageAdapter
    StorageAdapter --> LocalDisk
    StorageAdapter --> S3Cloud
    StoresAPI --> StoreRepo
    SharesAPI --> ShareRepo
```

---

## 3. Core Architectural Subsystems

### A. Visual Storefront Customizer & postMessage Pipeline
- **Drawer Controls:** The customizer hosts 4 dedicated tabs: Branding (accent colors, typography, logos, banners), Content (hero copy, CTA destination, brand story), Sections (modular layout toggles), and Review (client feedback conversation).
- **Communication Protocol:**
  - `GRIDRETAIL_PREVIEW_READY`: Handshake broadcast by the iframe on load.
  - `GRIDRETAIL_PREVIEW_UPDATE`: Payload sent by the customizer upon state mutation.
  - `GRIDRETAIL_PREVIEW_ACK`: Receipt acknowledgment sent by the iframe with timestamp.
  - Origin verification (`event.origin === window.location.origin`) strictly enforces that third-party windows cannot spoof preview updates.
- **Persistence:** Save operations commit changes via `PATCH /api/stores/[id]` with activity logging and unsaved-changes indicators.

### B. Secure Tokenized Client Preview Sharing
- **Bearer Tokens:** 32-byte cryptographically secure random tokens generated with `crypto.randomBytes()`.
- **Zero Raw Token Storage:** Only the SHA-256 hash (`crypto.createHash("sha256")`) is stored in the database.
- **Server-Side Validation:** The `/preview/[token]` route resolves the share record by token hash, validating that `status === "active"` and `Date.now() < expiresAt`.
- **Immediate Revocation:** Operators can revoke links instantaneously via `PATCH /api/stores/[id]/shares/[shareId]`.

### C. Client Feedback & Approval Workflow
- **Review Panel:** The public preview includes a non-intrusive floating drawer (`ClientFeedbackDrawer`) allowing clients to submit general feedback, request modifications, or grant formal proposal approval.
- **State Machine Transitions:**
  - `Draft` → `Pending Review` (on share creation)
  - `Pending Review` → `Approved` (on client approval)
  - `Pending Review` → `Changes Requested` (on client revision request)
- **Store Scoping:** Feedback is strictly bound to `storeId` and `shareId`.

### D. Cloud Media Management
- **Pluggable Storage Abstraction:** `StorageProvider` interface implemented by `LocalStorageProvider` (dev fallback) and `S3StorageProvider` (production S3/R2).
- **Validation:** Strict MIME validation (PNG, JPG, WEBP, SVG) and 5MB size limit.
- **Asset Attachment:** Uploads via `POST /api/stores/[id]/media` automatically link generated URLs to the store's branding document and notify the customizer.
