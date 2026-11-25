# GridRetail — Multi-Tenant Website Generation, Customizer & Commerce Platform

> **Enterprise Website Generator for E-Commerce, Appointment Scheduling & Lead Generation**  
> Enables account teams and retail solution architects to configure tailored demo storefronts, pitch live to clients, deploy instantaneous staging environments, collaborate via in-context anchored comments, and export verified production bundles.

---

## 1. Project Overview

GridRetail is an enterprise platform developed to streamline client pitches across three primary business models:
1. **E-Commerce Websites:** Modular section builders, catalog management, variant selection, cart drawer, and simulated checkout flow.
2. **Appointment Scheduling Websites:** Services catalog, practitioner schedules, multi-timezone booking, atomic slot locking concurrency control, and cancellation workflows.
3. **Lead Generation Websites:** Drag-and-drop visual form builder, conditional logic, multi-step progression, immutable versioning, CRM dashboard, and duplicate lead matching.

---

## 2. Official Project Documentation Index (Phases 01 – 12)

The project documentation is organized into **exactly 12 consolidated primary phase documents** located in the [`docs/`](file:///D:/grid/docs) directory:

| Phase | Document | Description & Core Deliverables |
| :---: | :--- | :--- |
| **01** | [`PHASE_01_FOUNDATION_DESIGN_SYSTEM.md`](file:///D:/grid/docs/PHASE_01_FOUNDATION_DESIGN_SYSTEM.md) | Next.js 15 App Router scaffolding, design system tokens (`#176B4D` emerald, `#FAF9F6` canvas), reusable UI primitives, and 6 core dashboard routes. |
| **02** | [`PHASE_02_DATABASE_AUTH_STORE_WIZARD.md`](file:///D:/grid/docs/PHASE_02_DATABASE_AUTH_STORE_WIZARD.md) | Native MongoDB connection pooling & in-memory fallback, Auth.js credentials authentication, 5-step store creation wizard, dynamic storefront renderer, and responsive device preview sandbox. |
| **03** | [`PHASE_03_CUSTOMIZER_SHARING_MEDIA.md`](file:///D:/grid/docs/PHASE_03_CUSTOMIZER_SHARING_MEDIA.md) | 3-panel visual customizer with bidirectional `postMessage` synchronization, secure tokenized client preview links (SHA-256), client feedback state machine, and cloud media storage. |
| **04** | [`PHASE_04_EXPORT_DELIVERY_PRESENTATION.md`](file:///D:/grid/docs/PHASE_04_EXPORT_DELIVERY_PRESENTATION.md) | Zero-dependency streaming PKZIP 2.0 export engine, transactional email notifications with provider abstraction, drag-and-drop section builder, and fullscreen client presentation mode. |
| **05** | [`PHASE_05_ANALYTICS_DEPLOYMENTS_COLLABORATION.md`](file:///D:/grid/docs/PHASE_05_ANALYTICS_DEPLOYMENTS_COLLABORATION.md) | Cross-store conversion analytics & proposal funnel, one-click cloud staging preview deployments (Cloudflare/Vercel/S3), in-context anchored comments, and 4-tier enterprise RBAC. |
| **06** | [`PHASE_06_PRODUCTION_READINESS_SECURITY.md`](file:///D:/grid/docs/PHASE_06_PRODUCTION_READINESS_SECURITY.md) | Production readiness, security vulnerability remediation (SEC-01 to SEC-07: path traversal, anti-spoofing, SVG sanitization, stored XSS, iframe sandbox), operational structured logging, and 7 E2E user journeys. |
| **07** | [`PHASE_07_STORAGE_RETENTION_PERFORMANCE.md`](file:///D:/grid/docs/PHASE_07_STORAGE_RETENTION_PERFORMANCE.md) | Production database persistence guard (`DatabaseUnavailableError`), automated index synchronization (`npm run sync-indexes`), S3 signed URLs, artifact retention scanner, and system-wide latency optimizations. |
| **08** | [`PHASE_08_SUBDOMAIN_HOSTNAME_ROUTING.md`](file:///D:/grid/docs/PHASE_08_SUBDOMAIN_HOSTNAME_ROUTING.md) | RFC 6761 local subdomain routing (`{slug}.localhost:3000`), Next.js middleware rewrites, BSON serialization normalization, Auth.js session fetch fixes, and store publishing lifecycle. |
| **09** | [`PHASE_09_TEMPLATES_THEMES_CATALOG.md`](file:///D:/grid/docs/PHASE_09_TEMPLATES_THEMES_CATALOG.md) | Category-wise product management, custom product photography upload with magic-byte validation, 8 architectural design templates, 12 color themes (96 combinations), and responsive UI polish. |
| **10** | [`PHASE_10_SECTION_SYSTEM_ECOMMERCE.md`](file:///D:/grid/docs/PHASE_10_SECTION_SYSTEM_ECOMMERCE.md) | Modular section registry (29 section types across 5 categories), Product Detail Pages (PDP), collection browsing, composite cart keys, universal INR (₹) formatting, and simulated checkout flow (Subphases 10A & 10B consolidated). |
| **11** | [`PHASE_11_APPOINTMENT_SCHEDULING_SYSTEM.md`](file:///D:/grid/docs/PHASE_11_APPOINTMENT_SCHEDULING_SYSTEM.md) | Professional appointment scheduling system, practitioner profiles, dual-layer slot locking concurrency control (in-memory mutex + MongoDB unique index), reservation leases, cancellation tokens, and 8-template customizer layout engine parity. |
| **12** | [`PHASE_12_LEAD_GENERATION_FORM_BUILDER_CRM.md`](file:///D:/grid/docs/PHASE_12_LEAD_GENERATION_FORM_BUILDER_CRM.md) | Lead-generation website generator, 5 starter form templates, drag-and-drop form builder (9 field types & conditional logic), immutable versioning, lead CRM dashboard (Kanban/Table), duplicate matching, formula injection defense, and first-party analytics. |

---

## 3. Technology Stack

- **Framework:** Next.js 15.5.27 (App Router, Server & Client Components)
- **Language:** TypeScript 5 (Strict typing, zero `any`)
- **Styling:** Tailwind CSS v4 with custom design tokens in `@theme` and `src/config/theme.ts`
- **Database:** MongoDB 7.x / 9.x (Native driver, connection pooling, graceful in-memory dev fallback, production persistence guard)
- **Authentication:** Auth.js (`next-auth@5.0.0-beta.32`) with `bcryptjs` credential hashing & JWT sessions
- **Storage:** Pluggable storage provider (Local file staging & S3/R2 compatible adapter with presigned HMAC URLs)
- **Email:** Pluggable email notification provider (Console mock & production SMTP)
- **Deployments:** Staging deployment engine supporting simulated edge, Cloudflare Pages, Vercel, and AWS S3
- **Iconography:** Lucide React (`lucide-react`)
- **Fonts:** Geist Sans & Geist Mono via `next/font`
- **Test Runner:** Node.js native test runner via `tsx` (302 passing automated tests)

---

## 4. Getting Started

### Prerequisites
- Node.js `v20+` or `v22+`
- npm `v10+`
- MongoDB instance or Atlas connection string (Optional for local dev in-memory fallback; required for production)

### Installation & Development

1. **Install dependencies:**
   ```bash
   npm install
   ```

2. **Configure environment variables:**
   ```bash
   cp .env.example .env.local
   ```

3. **Database Setup & Index Synchronization:**
   ```bash
   # Seed default catalog and store templates
   npm run seed

   # Create bootstrap administrator account
   npm run bootstrap-admin

   # Synchronize database indexes (when MONGODB_URI is configured)
   npm run sync-indexes
   ```

4. **Run the development server:**
   ```bash
   npm run dev
   ```
   Open [http://localhost:3000](http://localhost:3000) in your browser.

5. **Default Credentials:**
   - **Administrator:** `admin@gridretail.internal` / `AdminGrid2026!`
   - **Employee:** `sarah.chen@gridretail.internal` / `AdminGrid2026!`

---

## 5. Verification & Testing

Execute the complete quality verification pipeline:

```bash
# Execute lint check (ESLint: 0 warnings, 0 errors)
npm run lint

# Execute TypeScript type-checking (tsc: 0 errors)
npm run type-check

# Execute automated test suite (302 / 302 passing tests)
npm run test

# Execute Next.js production build
npm run build
```
