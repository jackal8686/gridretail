# GridRetail — Phase 4: Delivery Engine, Email Notifications, Drag-and-Drop Builder & Client Presentation Mode

> **Internal E-Commerce Demo Generation & Delivery Platform**  
> Enables account teams and retail solution architects to configure tailored demo storefronts, pitch live to clients, reorder layout sections dynamically, and export self-contained production delivery bundles within minutes.

---

## 1. Project Overview

GridRetail is an enterprise platform developed to streamline retail client pitches. Rather than relying on generic slide decks or static screenshots, GridRetail generates interactive, industry-tailored demo storefronts featuring customized product catalogs, branded themes, and responsive layouts.

### Phase 4 Capabilities Completed:
- **E-Commerce Delivery & Export Engine:**
  - Zero-dependency streaming PKZIP 2.0 compression engine (`ZipBuilder`) with CRC32 integrity checks.
  - Production bundle compiler (`ExportService`) generating self-contained static storefront packages (`index.html`, `styles.css`, `store-manifest.json`, `products.json`, `README.md`).
  - Persistent delivery history (`DeliveryRepository`) with SHA-256 cryptographic verification and direct streaming download endpoints (`/api/stores/[id]/deliveries/[deliveryId]/download`).
  - Modal interface (`DeliveryModal`) integrated across the customizer and presentation decks.
- **Email Notification Pipeline & Provider Abstraction:**
  - Event-driven notifications with durable MongoDB repository logging (`NotificationRepository`).
  - Pluggable email provider abstraction (`ConsoleMockEmailProvider` and `SmtpEmailProvider`) with automatic graceful fallback.
  - Branded responsive HTML and plain-text templates with strict HTML sanitization against XSS.
  - Automatic dispatch triggers wired into client review lifecycle (`feedback_submitted`, `changes_requested`, `proposal_approved`).
- **Advanced Drag-and-Drop Storefront Builder:**
  - Interactive section reordering in Tab 3 ("Sections") via HTML5 drag-and-drop handles and accessible keyboard controls (`ChevronUp`, `ChevronDown`).
  - Schema extension (`orderedSections`) persisted to MongoDB via `PATCH /api/stores/[id]`.
  - Live bidirectional `postMessage` synchronization updating the storefront canvas instantly without page reloads.
- **Client Presentation Mode (`/stores/[id]/present`):**
  - Distraction-free, full-viewport pitch walkthrough route for executive sales demonstrations.
  - 6 guided presentation slides (Executive Vision, Curated Catalog, Brand Narrative, Audience Engagement, Live Interactive Simulator, Commercial Next Steps).
  - Private presenter talking points drawer, viewport device toggles (Desktop, Tablet, Mobile), and keyboard shortcut navigation (`Right`, `Left`, `Space`, `N`, `Esc`).
- **Comprehensive Automated Test Suite:**
  - 63 automated unit tests passing across 12 test suites with zero failures.

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
