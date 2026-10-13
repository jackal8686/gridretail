# GridRetail — Phase 2: Database Foundation, Authentication, Store Generation Wizard & Live Storefront Preview

> **Internal E-Commerce Demo Generation Platform**  
> Enables account teams and retail solution architects to configure tailored, high-converting demo storefronts for prospective clients within minutes.

---

## 1. Project Overview

GridRetail is an enterprise platform developed to streamline retail client pitches. Rather than relying on generic slide decks or static screenshots, GridRetail generates interactive, industry-tailored demo storefronts featuring customized product catalogs, branded themes, and responsive layouts.

### Phase 2 Capabilities Completed:
- **MongoDB Database Foundation:** Native MongoDB driver integration (`mongodb@7.x`) with connection pooling, cached client promises, indexes, and automatic fallback for offline development.
- **Role-Based Authentication (Auth.js / NextAuth v5):** Corporate credentials authentication with bcrypt-hashed passwords, JWT sessions (8h maxAge), Next.js Middleware route guarding, and RBAC (`admin` vs `employee`).
- **Team & Security Administration:** Admin user management API (`/api/admin/users`) with account creation, disabling/reactivation, and interactive UI in Settings.
- **5-Step Store Generation Wizard (`/stores/new`):**
  1. *Client & Store Details:* Client selection, inline quick-client creation, industry selection, store name, and auto-generated slug with real-time uniqueness validation.
  2. *Template Selection:* 8 architectural templates with industry recommendations, tag filters, and color palette inspection.
  3. *Branding & Storefront Sections:* Hex color pickers, typography pairing, value proposition toggles, and layout section management (hero, featured products, about, newsletter, footer).
  4. *Catalog Selection:* Searchable, category-filtered product picker with multi-SKU selection and count metrics.
  5. *Review & Deploy:* Comprehensive configuration summary and one-click store deployment with immediate redirection to the live preview.
- **Dynamic Storefront Renderer (`/store/[slug]`):** Public, standalone storefront rendering engine with theme colors, typography classes, dynamic layout sections, value propositions, and responsive product catalog grids.
- **Responsive Preview Suite (`/stores/[id]/preview`):** Device-mode switcher (Desktop, Tablet 768px, Mobile 375px), iframe sandbox, quick refresh, and direct pop-out link.
- **Complete Test Automation:** 34 automated unit/integration tests (`tests/db.test.ts`, `tests/auth.test.ts`, `tests/wizard.test.ts`, `tests/storefront.test.ts`) covering all core subsystems.

---

## 2. Technology Stack

- **Framework:** Next.js 15.5.27 (App Router, Server & Client Components)
- **Language:** TypeScript 5 (Strict typing, no `any`)
- **Styling:** Tailwind CSS v4 with custom design tokens in `@theme` and `src/config/theme.ts`
- **Database:** MongoDB 7.x (Native driver, connection pooling, graceful in-memory fallback)
- **Authentication:** Auth.js (`next-auth@5.0.0-beta.32`) with `bcryptjs` credential hashing & JWT sessions
- **Iconography:** Lucide React (`lucide-react`)
- **Fonts:** Geist Sans & Geist Mono via `next/font`
- **Test Runner:** Node.js native test runner via `tsx`

---

## 3. Directory Structure

```text
gridretail/
├── public/                     # Static assets and icons
├── src/
│   ├── app/                    # Next.js App Router routes
│   │   ├── layout.tsx          # Root layout with SessionWrapper & AppShell
│   │   ├── page.tsx            # Entry point (redirects to /dashboard)
│   │   ├── login/page.tsx      # Corporate authentication portal
│   │   ├── dashboard/page.tsx  # Workspace overview, KPIs & recent activity
│   │   ├── stores/             # Store management & creation
│   │   │   ├── page.tsx        # Stores list table with search & filters
│   │   │   ├── new/page.tsx    # 5-step store generation wizard
│   │   │   └── [id]/preview/   # Responsive iframe preview suite
│   │   ├── store/[slug]/       # Standalone generated storefront renderer
│   │   ├── clients/page.tsx    # Client accounts directory
│   │   ├── templates/page.tsx  # 8-template architectural showcase
│   │   ├── products/page.tsx   # Demo product catalog
│   │   ├── settings/page.tsx   # Platform settings & Team/Security management
│   │   └── api/                # REST API Route Handlers
│   │       ├── auth/           # Auth.js route handler
│   │       ├── health/         # MongoDB health check endpoint
│   │       ├── admin/users/    # Admin user management endpoint
│   │       ├── stores/         # Stores list, create & detail endpoints
│   │       ├── clients/        # Clients list & creation endpoints
│   │       ├── templates/      # Templates list endpoint
│   │       └── products/       # Products list endpoint
│   ├── components/
│   │   ├── layout/             # AppSidebar, AppHeader, AppShell, PageHeader
│   │   ├── dashboard/          # MetricCards, RecentStoresTable, QuickActions, ActivityFeed
│   │   ├── ui/                 # Button, Card, Badge, SearchInput, FilterSelect, Modal, EmptyState
│   │   └── shared/             # StatusBadge, DemoBanner, SessionWrapper
│   ├── config/
│   │   ├── theme.ts            # Centralized design tokens (colors, shadows, typography)
│   │   └── site.ts             # Site metadata and platform constants
│   ├── constants/
│   │   └── navigation.ts       # Navigation links, icons, and route definitions
│   ├── lib/
│   │   ├── db/                 # mongodb connection pool, seed & bootstrap scripts
│   │   ├── repositories/       # Store, Client, Template, Product, User, Activity repositories
│   │   └── validation/         # Zod/custom validators for slug, store, and user
│   ├── types/                  # TypeScript domain interfaces (Store, Client, User, etc.)
│   ├── auth.ts                 # Auth.js NextAuth configuration
│   └── middleware.ts           # Next.js route protection & session verification
├── tests/                      # Automated test suite (db, auth, wizard, storefront)
├── docs/
│   ├── PHASE_1_AUDIT.md        # Phase 1 architectural & UI audit
│   ├── PHASE_2_AUDIT.md        # Comprehensive Phase 2 implementation audit
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
   *(Ensure `AUTH_SECRET` is set. If connecting to a local MongoDB, configure `MONGODB_URI`)*.

3. **Database Setup (Optional if using MongoDB):**
   ```bash
   # Seed demonstration catalogs, clients, and templates
   npm run seed

   # Provision initial administrator account
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
   *(Quick-fill buttons are available on the login page for development convenience)*.

---

## 5. Verification & Testing

Run all quality checks before committing:

```bash
# Execute lint check (ESLint)
npm run lint

# Execute TypeScript type-checking
npm run type-check

# Execute automated test suite (34 tests)
npm run test

# Execute production build
npm run build
```
