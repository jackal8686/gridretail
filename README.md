# GridRetail — Phase 1: Foundation, Architecture & Premium UI

> **Internal E-Commerce Demo Generation Platform**  
> Enables account teams and retail solution architects to configure tailored, high-converting demo storefronts for prospective clients within minutes.

---

## 1. Project Overview

GridRetail is an enterprise platform developed to streamline retail client pitches. Rather than relying on generic slide decks or static screenshots, GridRetail generates interactive, industry-tailored demo storefronts featuring customized product catalogs, branded themes, and responsive layouts.

### Phase 1 Goals Completed:
- Established a modern Next.js 15 (App Router) + TypeScript + Tailwind CSS foundation.
- Centralized design system tokens with an emerald green (`#176B4D`) and warm cream (`#FAF9F6`) visual identity.
- Built a responsive global application shell featuring a collapsible sidebar, mobile drawer, breadcrumb header, notification panel, and user profile affordances.
- Implemented 6 core application routes: `/` (redirects to dashboard), `/dashboard`, `/stores`, `/clients`, `/templates`, `/products`, and `/settings`.
- Established strongly typed, isolated mock datasets for stores, clients, templates, products, and platform activities.
- Implemented search, filtering, and inspect modals across all major screens.
- Created full architectural, development, and audit documentation in `docs/`.

---

## 2. Technology Stack

- **Framework:** Next.js 15 (App Router, Server & Client Components)
- **Language:** TypeScript 5 (Strict typing, no `any`)
- **Styling:** Tailwind CSS v4 with custom design tokens in `@theme` and `src/config/theme.ts`
- **Iconography:** Lucide React (`lucide-react`)
- **Fonts:** Geist Sans & Geist Mono via `next/font`
- **Future Database:** MongoDB (Scheduled for Phase 2)
- **Future Workflow Engine:** E-Commerce Generator Pipeline (Scheduled for Phase 2)

---

## 3. Directory Structure

```text
gridretail/
├── public/                     # Static assets and icons
├── src/
│   ├── app/                    # Next.js App Router routes
│   │   ├── layout.tsx          # Root layout with AppShell wrapper & metadata
│   │   ├── page.tsx            # Entry point (redirects to /dashboard)
│   │   ├── globals.css         # Tailwind v4 directives & brand CSS variables
│   │   ├── dashboard/page.tsx  # Workspace overview, KPIs & recent activity
│   │   ├── stores/page.tsx     # Store management table, search & filters
│   │   ├── clients/page.tsx    # Client accounts, contacts & demo store counts
│   │   ├── templates/page.tsx  # 8-template architectural showcase cards
│   │   ├── products/page.tsx   # Demo product SKU catalog & category filters
│   │   └── settings/page.tsx   # Tabbed settings panels with live local toggles
│   ├── components/
│   │   ├── layout/             # AppSidebar, AppHeader, AppShell, PageHeader
│   │   ├── dashboard/          # MetricCards, RecentStoresTable, QuickActions, ActivityFeed
│   │   ├── ui/                 # Button, Card, Badge, SearchInput, FilterSelect, Modal, EmptyState
│   │   └── shared/             # StatusBadge, DemoBanner, PlaceholderModal
│   ├── config/
│   │   ├── theme.ts            # Centralized design tokens (colors, shadows, typography)
│   │   └── site.ts             # Site metadata and platform constants
│   ├── constants/
│   │   └── navigation.ts       # Navigation links, icons, and route definitions
│   ├── mock/                   # Typed local demonstration datasets (stores, clients, templates, etc.)
│   ├── types/                  # TypeScript interfaces for all domain models
│   └── utils/
│       └── cn.ts               # Class name merging utility
├── docs/
│   ├── PHASE_1_AUDIT.md        # Comprehensive Phase 1 implementation audit
│   ├── ARCHITECTURE.md         # Architecture blueprint and design decisions
│   └── DEVELOPMENT_LOG.md      # Detailed engineering changelog
├── .env.example                # Safe environment variables template
├── .gitignore                  # Git ignore rules
├── package.json                # Project dependencies and npm scripts
├── tsconfig.json               # TypeScript compiler configuration
└── README.md                   # This project guide
```

---

## 4. Getting Started

### Prerequisites
- Node.js `v18+` or `v20+` (Tested on `v24.19.0`)
- npm `v9+` or `v10+` (Tested on `v12.0.2`)

### Installation & Development

1. **Clone the repository and enter the directory:**
   ```bash
   git clone <repo-url>
   cd grid
   ```

2. **Install dependencies:**
   ```bash
   npm install
   ```

3. **Configure environment variables (Optional in Phase 1):**
   ```bash
   cp .env.example .env.local
   ```

4. **Start the local development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Execute quality checks:**
   ```bash
   # Run TypeScript type check
   npm run build

   # Run ESLint linter
   npm run lint
   ```

---

## 5. Design System Tokens

| Token | Hex Value | Purpose |
|---|---|---|
| **Primary** | `#176B4D` | Brand primary actions, active navigation, focus rings |
| **Primary Dark** | `#104D38` | Hover and pressed button states |
| **Primary Light** | `#E2F5E9` | Selected route pills, subtle status badges, highlights |
| **Background** | `#FAF9F6` | Warm cream application background |
| **Surface** | `#FFFFFF` | Card panels, modals, dropdowns |
| **Text Primary** | `#18231E` | High-contrast headings and primary labels |
| **Text Secondary**| `#66736C` | Metadata, helper descriptions, table headers |
| **Border** | `#E4E9E5` | Structural dividers, input and card borders |
| **Success** | `#16804A` | Published demo states, live SLAs |
| **Warning** | `#B7791F` | Pending client reviews, low stock alerts |
| **Error** | `#C43D3D` | Destructive actions, out of stock alerts |

---

## 6. Phase 2 Roadmap Handoff

The Phase 1 foundation is fully decoupled and ready for Phase 2:
- **Authentication & Roles:** Multi-tenant operator login (NextAuth / custom SSO).
- **MongoDB Connection:** Schema models for `Store`, `Client`, `Template`, and `Product`.
- **Store Generation Engine:** Multi-step wizard allowing users to select an industry template, upload a catalog, and deploy a demo storefront.
- **Dynamic Storefront Preview:** Sandboxed iframe renderer with responsive device switcher (Mobile / Tablet / Desktop).
