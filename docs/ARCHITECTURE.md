# GridRetail — Architecture Blueprint

## 1. System Vision & Purpose

GridRetail is an internal SaaS platform designed to accelerate sales cycles by generating customized, high-fidelity e-commerce demo storefronts for prospective clients within minutes.

Instead of manual design mockups, platform operators follow an intuitive wizard:
1. Choose an industry-specific storefront template.
2. Provide brand guidelines (color palette, typography, logo).
3. Import or sample a tailored product catalog.
4. Preview the resulting storefront in real time.
5. Generate a secure, shareable demo link for prospective client presentations.

---

## 2. Phase 1 Architecture Overview

Phase 1 establishes the foundational UI and architectural boundaries without prematurely binding to backend persistence, external authentication, or generation engines.

### Key Architectural Pillars:
1. **Decoupled Presentation Layer:**
   - Next.js App Router with React Server and Client Components where appropriate.
   - Reusable UI primitives (`Button`, `Card`, `Badge`, `SearchInput`, `FilterSelect`, `Modal`, `EmptyState`) located in `@/components/ui`.
   - Domain-specific presentation components (`MetricCards`, `RecentStoresTable`, `QuickActions`, `RecentActivityFeed`) located in `@/components/dashboard`.
2. **Centralized Design System:**
   - Single source of truth in `src/config/theme.ts` coupled with Tailwind CSS v4 `@theme` tokens in `src/app/globals.css`.
   - Custom palette anchored by Emerald Green (`#176B4D`) and Warm Cream (`#FAF9F6`).
3. **Domain Types & Strict Interfaces:**
   - Centralized domain models in `src/types/` (`store.ts`, `client.ts`, `template.ts`, `product.ts`, `activity.ts`).
   - Complete avoidance of `any` types.
4. **Isolated Mock Datasets:**
   - All demonstration data lives in `src/mock/`.
   - Clear UI banners and disclaimers explicitly communicate that datasets are illustrative demo records.
   - Pre-structured schemas mirror future MongoDB documents to minimize refactoring friction in Phase 2.

---

## 3. Directory Layout & Module Boundaries

```text
src/
├── app/                  # Routing & Page Views
│   ├── layout.tsx        # Global shell and font loading
│   ├── page.tsx          # Root redirect to /dashboard
│   ├── globals.css       # Design tokens & baseline CSS
│   ├── dashboard/        # Executive overview & KPIs
│   ├── stores/           # Store management & status filters
│   ├── clients/          # Client CRM overview & contacts
│   ├── templates/        # 8-template architectural showcase
│   ├── products/         # Product catalog management
│   └── settings/         # Tabbed workspace preferences
├── components/
│   ├── layout/           # AppShell, AppSidebar, AppHeader, PageHeader
│   ├── dashboard/        # Dashboard-specific widgets & tables
│   ├── ui/               # Low-level reusable UI primitives
│   └── shared/           # Cross-cutting widgets (StatusBadge, DemoBanner, PlaceholderModal)
├── config/               # Site configuration & design tokens
├── constants/            # Navigation structure & route metadata
├── mock/                 # Strongly typed demonstration data
├── types/                # TypeScript interface contracts
└── utils/                # Lightweight helper functions (cn.ts)
```

---

## 4. State Management & Interaction Strategy

- **Phase 1 Strategy:**
  - Client state is managed locally via React hooks (`useState`, `useMemo`).
  - Search and filter queries execute in-memory against typed mock arrays.
  - Modals and actions clearly communicate future phases via the `PlaceholderModal` component.
- **Phase 2 Migration Strategy:**
  - In-memory filters will seamlessly transition to Server Actions and API route queries (`/api/stores`, `/api/templates`, etc.).
  - MongoDB models using Mongoose or the native Node driver will implement the same TypeScript interfaces defined in `src/types/`.
  - NextAuth (or custom session provider) will protect `/dashboard/*` routes and inject active operator context into `AppHeader` and `AppSidebar`.

---

## 5. Security & Boundary Guardrails

1. **No Frontend Secrets:** No API keys, credentials, or backend connection strings are embedded in client bundles.
2. **Accessible Interaction:** All buttons and interactive controls include semantic HTML tags, keyboard navigation support, and visible focus rings (`focus-visible:outline-2`).
3. **Reduced Motion:** Interactive transitions respect user preferences and operate with subtle duration scales (150ms–200ms).
