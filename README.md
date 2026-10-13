# GridRetail — Phase 3: Visual Customizer, Client Sharing, Feedback Workflow & Cloud Media

> **Internal E-Commerce Demo Generation Platform**  
> Enables account teams and retail solution architects to configure tailored, high-converting demo storefronts for prospective clients within minutes.

---

## 1. Project Overview

GridRetail is an enterprise platform developed to streamline retail client pitches. Rather than relying on generic slide decks or static screenshots, GridRetail generates interactive, industry-tailored demo storefronts featuring customized product catalogs, branded themes, and responsive layouts.

### Phase 3 Capabilities Completed:
- **Visual Storefront Customizer (`/stores/[id]/preview`):**
  - Integrated 3-panel professional customizer interface (Branding, Content, Sections, Review).
  - Bidirectional, origin-validated `postMessage` protocol syncing edits directly into the live preview iframe without page reload.
  - Server-side persistence via `PATCH /api/stores/[id]` with unsaved change detection, saving states, and rollback protection.
- **Secure Tokenized Client Preview Sharing (`/preview/[token]`):**
  - Bearer links generated using cryptographically secure random tokens (SHA-256 hash storage).
  - Configurable expiration periods (24h, 3 days, 7 days, 14 days) and immediate revocation controls via `PATCH /api/stores/[id]/shares/[shareId]`.
  - Public preview access strictly scoped to the designated storefront without requiring a GridRetail user login.
  - Hardened security headers, access counters, and clean unavailable/expired link screens.
- **Client Feedback & Approval Workflow:**
  - Public floating review drawer (`ClientFeedbackDrawer`) on tokenized client previews.
  - Formal proposal sign-off transitions (`Approved` / `Changes Requested`) with audit logging.
  - Real-time conversation threads between clients and internal account architects.
- **Cloud Media Management:**
  - Multi-provider storage abstraction (`LocalStorageProvider` + `S3StorageProvider`).
  - Integrated logo and hero banner upload controls with MIME type verification (PNG, JPG, WEBP, SVG) and 5MB size limits.
  - Immediate attachment to storefront branding documents and live canvas synchronization.
- **Comprehensive Automated Test Suite:**
  - 42 automated tests running via Node.js native test runner (`tsx --test tests/**/*.test.ts`).

---

## 2. Technology Stack

- **Framework:** Next.js 15.5.27 (App Router, Server & Client Components)
- **Language:** TypeScript 5 (Strict typing, no `any`)
- **Styling:** Tailwind CSS v4 with custom design tokens in `@theme` and `src/config/theme.ts`
- **Database:** MongoDB 7.x (Native driver, connection pooling, graceful in-memory fallback)
- **Authentication:** Auth.js (`next-auth@5.0.0-beta.32`) with `bcryptjs` credential hashing & JWT sessions
- **Storage:** Pluggable storage provider (Local file staging & S3/R2 compatible adapter)
- **Iconography:** Lucide React (`lucide-react`)
- **Fonts:** Geist Sans & Geist Mono via `next/font`
- **Test Runner:** Node.js native test runner via `tsx`

---

## 3. Directory Structure

```text
gridretail/
├── public/                     # Static assets, icons, and uploaded media
├── src/
│   ├── app/                    # Next.js App Router routes
│   │   ├── layout.tsx          # Root layout with SessionWrapper & AppShell
│   │   ├── page.tsx            # Entry point (redirects to /dashboard)
│   │   ├── login/page.tsx      # Corporate authentication portal
│   │   ├── dashboard/page.tsx  # Workspace overview, KPIs & recent activity
│   │   ├── stores/             # Store management & creation
│   │   │   ├── page.tsx        # Stores list table with search & filters
│   │   │   ├── new/page.tsx    # 5-step store generation wizard
│   │   │   └── [id]/preview/   # Visual storefront customizer suite
│   │   ├── preview/[token]/    # Tokenized public client preview & review drawer
│   │   ├── store/[slug]/       # Standalone generated storefront renderer
│   │   ├── clients/page.tsx    # Client accounts directory
│   │   ├── templates/page.tsx  # 8-template architectural showcase
│   │   ├── products/page.tsx   # Demo product catalog
│   │   ├── settings/page.tsx   # Platform settings & Team/Security management
│   │   └── api/                # Secure REST API endpoints
│   │       ├── auth/           # Auth.js route handler
│   │       ├── health/         # MongoDB health check endpoint
│   │       ├── admin/users/    # Admin user management endpoint
│   │       ├── stores/         # Stores list, create, detail, shares & media
│   │       ├── preview/        # Public token feedback API
│   │       ├── clients/        # Clients list & creation endpoints
│   │       ├── templates/      # Templates list endpoint
│   │       └── products/       # Products list endpoint
│   ├── components/
│   │   ├── layout/             # AppSidebar, AppHeader, AppShell, PageHeader
│   │   ├── dashboard/          # MetricCards, RecentStoresTable, QuickActions, ActivityFeed
│   │   ├── storefront/         # StorefrontView (postMessage live-sync renderer)
│   │   ├── ui/                 # Button, Card, Badge, SearchInput, FilterSelect, Modal, EmptyState
│   │   └── shared/             # StatusBadge, ShareModal, ClientFeedbackDrawer, SessionWrapper
│   ├── lib/
│   │   ├── crypto/             # Secure random tokens & SHA-256 hashing
│   │   ├── db/                 # MongoDB connection pool, seed & bootstrap scripts
│   │   ├── repositories/       # Domain repositories (Store, Client, Share, Feedback, Media, etc.)
│   │   ├── storage/            # Pluggable Storage Provider (Local & S3)
│   │   └── validation/         # Validation schemas for store, slug, and user
│   ├── types/                  # TypeScript domain contracts
│   ├── auth.ts                 # Auth.js configuration & credentials provider
│   └── middleware.ts           # Route protection middleware
├── tests/                      # Automated test suite (db, auth, wizard, storefront, customizer, shares, feedback, media)
├── docs/
│   ├── PHASE_1_AUDIT.md        # Phase 1 architectural & UI audit
│   ├── PHASE_2_AUDIT.md        # Phase 2 implementation audit
│   ├── PHASE_3_AUDIT.md        # Comprehensive Phase 3 implementation audit
│   ├── ARCHITECTURE.md         # Full architecture blueprint & data flow
│   └── DEVELOPMENT_LOG.md      # Detailed engineering changelog
├── .env.example                # Environment variables template
├── package.json                # Project dependencies and npm scripts
└── README.md                   # This project guide
```

---

## 4. Getting Started

### Prerequisites
- Node.js `v18+` or `v20+`
- npm `v9+` or `v10+`
- MongoDB instance (Optional; in-memory fallback operates seamlessly without a running MongoDB server)

### Installation & Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```

3. **Database Setup (Optional if using MongoDB):**
   ```bash
   npm run seed
   npm run bootstrap-admin
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Sign In Credentials:**
   - **Administrator:** `admin@gridretail.internal` / `AdminGrid2026!`
   - **Employee:** `sarah.chen@gridretail.internal` / `AdminGrid2026!`

---

## 5. Verification & Testing

Run all quality checks before committing:

```bash
# Execute lint check (ESLint)
npm run lint

# Execute TypeScript type-checking
npm run type-check

# Execute automated test suite (42 tests)
npm run test

# Execute production build
npm run build
```
