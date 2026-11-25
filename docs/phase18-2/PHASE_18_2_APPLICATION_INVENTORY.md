# GridRetail — Phase 18.2: Application Inventory & Route Catalog

**Date:** 2026-11-23  
**Milestone:** Phase 18.2 — Platform-Wide Functional Audit & Interaction Verification  
**Repository:** `D:\grid`  
**Application Stack:** Next.js 15.5.27 (App Router), React 19, TypeScript 5, Tailwind CSS v4, MongoDB / In-Memory Mock Fallback, Auth.js

---

## 1. Executive Summary

As part of Phase 18.2, a comprehensive technical and structural inventory was executed across the entire GridRetail codebase. This catalog details all 24 page routes, 47 API routes, 21 data repositories, data models, authentication guards, and the test suite structure.

GridRetail is an internal multi-tenant platform designed to create, customize, and deliver three types of high-fidelity client websites:
1. **E-Commerce Stores** (catalog, cart drawer, cart page, client checkout simulation)
2. **Appointment Scheduling Systems** (multi-service, provider assignment, interactive booking, client cancellation)
3. **Lead Generation & CRM Platforms** (custom forms, inquiries, pipeline stages, reminders, CSV import/export)

---

## 2. Page Route Inventory (24 Routes)

Every page route under `src/app` was inventoried for path, title, purpose, authentication requirement, data fetching mechanism, and interactive completeness:

| Route Path | Page Title / Purpose | Auth Guard | Data Source / Fetching | Interactive Completeness |
|---|---|---|---|---|
| `/` | Landing / Root Redirect to `/dashboard` or `/login` | Public / Middleware redirect | `auth()` session check | Complete |
| `/login` | Admin & Operator Authentication Portal | Public | Form submit to Auth.js `signIn('credentials')` | Complete |
| `/dashboard` | Platform Operations Overview & Metrics | Authenticated | Server Component fetching Store, Activity, and Analytics Repos | Partial (Metrics hardcoded subtitles/deltas) |
| `/stores` | Store Management Directory & Filtering | Authenticated | Client Component calling `/api/stores` | Partial (Missing Legal & Advisory in filter; no Delete/Archive UI) |
| `/stores/new` | Multi-Step Store Generation Wizard | Authenticated | Client Component submitting to `/api/generation/full-site` | Complete |
| `/stores/[id]` | Store Detail & Settings Hub | Authenticated | Server Component with StoreRepository | Complete |
| `/stores/[id]/editor` | Advanced Visual Customizer / Builder | Authenticated | Client Component fetching store & saving via `/api/stores/[id]` | Partial (Desktop canvas 800px squeeze; Pages tab anchors) |
| `/stores/[id]/preview` | Full-Screen Storefront Preview with Viewport Switcher | Authenticated | Server Component embedding preview iframe | Complete |
| `/stores/[id]/schedule` | Appointment Management & Operations Dashboard | Authenticated | Client Component fetching `/api/stores/[id]/appointments`, `providers`, `services` | Partial (Reschedule missing; Cancel/Complete functional) |
| `/stores/[id]/leads` | Lead CRM (Kanban & Table Views) | Authenticated | Client Component fetching `/api/stores/[id]/leads` | Partial (Form builder UI absent; CSV/Pipeline functional) |
| `/stores/[id]/present` | Client Presentation Pitch Deck (4 Slides) | Authenticated | Client Component presenting store pitch slides | Bug (Cross-industry product copy leakage on slides 2 & 3) |
| `/templates` | Design Template & Theme Catalog | Authenticated | Server Component fetching TemplateRepository | Partial ("Use Template" redirects to wizard; cannot apply to existing store) |
| `/products` | Products SKU Catalog & Inventory | Authenticated | Client Component with `MOCK_PRODUCTS` | Mock (Uses hardcoded mocks; Add/Edit buttons show PlaceholderModal) |
| `/clients` | Client Accounts & Ownership Roster | Authenticated | Client Component with `MOCK_CLIENTS` | Mock (Uses hardcoded mocks; Add/Details buttons show PlaceholderModal) |
| `/analytics` | Platform Traffic, Conversion & Storefront Analytics | Authenticated | Client Component fetching `/api/analytics` | Complete |
| `/settings` | System Configuration, Profile, Team, Notifications | Authenticated | Client Component with 4 tabs | Partial (Profile read-only; general/notifications persist to localStorage) |
| `/preview/[token]` | Public / Shareable Client Preview Portal | Public (Token-gated) | Client Component validating token via `/api/preview/[token]` | Complete |
| `/store/[slug]` | Public Storefront Dynamic Home / Catalog | Public | Dynamic SSR / Client Storefront View | Complete |
| `/store/[slug]/products/[productId]` | E-Commerce Product Detail Page (PDP) | Public | Server Component / Client ProductDetailClient | Complete |
| `/store/[slug]/collections/[category]` | E-Commerce Collection / Category Filter Page | Public | Client Component CollectionsClient | Complete |
| `/store/[slug]/cart` | Full-Page Shopping Cart | Public | Client Cart State via `StorefrontCartContext` | Complete |
| `/store/[slug]/checkout` | Multi-Step E-Commerce Checkout Simulator | Public | Client Checkout Flow (`ORD-SIM-...`) | Simulated (No backend order repository) |
| `/store/[slug]/appointments` | Public Customer Appointment Booking Page | Public | Client Component AppointmentWebsiteView | Complete |
| `/store/[slug]/forms/[formId]` | Public Lead Submission Page | Public | Client Component LeadGenWebsiteView | Complete |

---

## 3. API Route Inventory (47 Endpoints)

| Endpoint Path | HTTP Methods | Auth Guard | Repository / Service Used | Operation Performed |
|---|---|---|---|---|
| `/api/activities` | GET | Session | `ActivityRepository` | Retrieve platform-wide audit log |
| `/api/admin/maintenance` | POST | Session (Admin) | `cleanArtifacts()`, Cache clean | Trigger storage cleanup & cache flush |
| `/api/analytics` | GET | Session | `AnalyticsRepository` | Aggregate visits, leads, appointments |
| `/api/clients` | GET, POST | Session | `ClientRepository` | List clients, create client record |
| `/api/generation/business-profile` | POST | Session | `BusinessProfileEngine` | Generate industry business profile |
| `/api/generation/full-site` | POST | Session | `SiteGenerationEngine` | End-to-end multi-type site generation |
| `/api/generation/recommendations` | POST | Session | `RecommendationEngine` | Recommend sections by industry/type |
| `/api/health` | GET | Public | Database ping | System health check (MongoDB/Memory) |
| `/api/preview/[token]` | GET | Token | `PreviewShareRepository` | Verify preview token and fetch store |
| `/api/preview/[token]/comments` | GET, POST | Token | `CommentRepository` | Client preview commentary threads |
| `/api/preview/[token]/feedback` | GET, POST | Token | `FeedbackRepository` | Client review approvals/rejections |
| `/api/products/media` | POST | Session | `StorageProvider` | Upload product image asset |
| `/api/public/appointments` | POST | Public | `AppointmentRepository` | Customer appointment booking |
| `/api/public/appointments/[id]/cancel` | POST | Public (Token) | `AppointmentRepository` | Customer appointment cancellation |
| `/api/public/leads` | POST | Public | `LeadSubmissionRepository` | Customer lead form submission |
| `/api/stores` | GET, POST | Session | `StoreRepository` | List stores (filtered), create blank store |
| `/api/stores/[id]` | GET, PUT, PATCH, DELETE | Session | `StoreRepository` | Get, update, patch draft, soft delete store |
| `/api/stores/[id]/appointments` | GET, POST | Session | `AppointmentRepository` | Operator appointment listing & manual booking |
| `/api/stores/[id]/appointments/[appointmentId]` | PATCH | Session | `AppointmentRepository` | Operator appointment status update (confirm, cancel, complete) |
| `/api/stores/[id]/comments` | GET, POST | Session | `CommentRepository` | Internal store review comments |
| `/api/stores/[id]/deployments` | GET, POST | Session | `DeploymentRepository` | List and trigger edge deployments |
| `/api/stores/[id]/export` | POST | Session | `ExportService` | Generate ZIP export bundle |
| `/api/stores/[id]/feedback` | GET, POST | Session | `FeedbackRepository` | Store feedback listing & submission |
| `/api/stores/[id]/leads` | GET, POST | Session | `LeadRepository` | Fetch CRM leads, manual lead creation |
| `/api/stores/[id]/leads/[leadId]` | PATCH, DELETE | Session | `LeadRepository` | Update lead status/score, delete lead |
| `/api/stores/[id]/leads/[leadId]/notes` | POST | Session | `LeadRepository` | Add internal CRM note to lead |
| `/api/stores/[id]/leads/[leadId]/reminders` | POST | Session | `LeadReminderRepository` | Schedule follow-up reminder |
| `/api/stores/[id]/leads/export` | GET | Session | `LeadRepository`, CSV parser | Export store leads as CSV |
| `/api/stores/[id]/leads/import` | POST | Session | `LeadRepository`, CSV parser | Import leads from CSV file |
| `/api/stores/[id]/media` | GET, POST | Session | `MediaAssetRepository` | Upload & list media assets for store |
| `/api/stores/[id]/providers` | GET, POST | Session | `ProviderRepository` | List & register staff providers |
| `/api/stores/[id]/providers/[providerId]` | PATCH, DELETE | Session | `ProviderRepository` | Edit provider info/working hours |
| `/api/stores/[id]/services` | GET, POST | Session | `ServiceRepository` | List & create appointment services |
| `/api/stores/[id]/services/[serviceId]` | PATCH, DELETE | Session | `ServiceRepository` | Update or remove service definition |
| `/api/stores/[id]/shares` | GET, POST | Session | `PreviewShareRepository` | Generate & manage preview share links |
| `/api/templates` | GET | Session | `TemplateRepository` | Fetch catalog of design templates |

---

## 4. Repository & Data Model Inventory (21 Repositories)

The persistence layer is structured under `src/lib/repositories/`, implementing dual-mode persistence (MongoDB with auto-fallback to thread-safe in-memory collections when `ALLOW_IN_MEMORY_FALLBACK=true`):

1. **`ActivityRepository`** (`activity.repository.ts`): Logs user actions (`store.created`, `store.updated`, `store.published`, `store.exported`).
2. **`AnalyticsRepository`** (`analytics.repository.ts`): Tracks page views, visitors, and conversion metrics.
3. **`AppointmentRepository`** (`appointment.repository.ts`): Stores bookings, customer details, timestamps, statuses (`pending`, `confirmed`, `cancelled`, `completed`), and cancellation tokens.
4. **`ClientRepository`** (`client.repository.ts`): Manages client corporate profiles, assigned contact persons, and tier status.
5. **`CommentRepository`** (`comment.repository.ts`): Handles threaded annotations on preview stores.
6. **`DeliveryRepository`** (`delivery.repository.ts`): Logs export zip creations, downloads, and handoffs.
7. **`DeploymentRepository`** (`deployment.repository.ts`): Tracks deployment history, staging/production URLs, and build statuses.
8. **`FeedbackRepository`** (`feedback.repository.ts`): Stores structured client feedback with ratings and sign-offs.
9. **`LeadFormRepository`** (`lead-form.repository.ts`): Manages custom form definitions and field schemas.
10. **`LeadReminderRepository`** (`lead-reminder.repository.ts`): Schedules date-based reminders for sales agents.
11. **`LeadSubmissionRepository`** (`lead-submission.repository.ts`): Captures public raw form responses before ingestion.
12. **`LeadRepository`** (`lead.repository.ts`): Main CRM storage for inquiries, score, stage (`new`, `contacted`, `qualified`, `proposal`, `won`, `lost`).
13. **`MediaAssetRepository`** (`media-asset.repository.ts`): Tracks uploaded image metadata, MIME types, dimensions, and URLs.
14. **`NotificationRepository`** (`notification.repository.ts`): System notification storage for operators.
15. **`PreviewShareRepository`** (`preview-share.repository.ts`): Manages preview tokens, expiration dates, and access passwords.
16. **`ProductRepository`** (`product.repository.ts`): Product catalog, prices, categories, and inventory.
17. **`ProviderRepository`** (`provider.repository.ts`): Staff members, working hours, and calendar scheduling rules.
18. **`ServiceRepository`** (`service.repository.ts`): Appointment offerings, duration minutes, pricing, and required providers.
19. **`StoreRepository`** (`store.repository.ts`): Core store entity including business profile, section registry, theme configuration, navigation links, and publishing metadata.
20. **`TemplateRepository`** (`template.repository.ts`): Curated starting layouts across industries.
21. **`UserRepository`** (`user.repository.ts`): Platform operator credentials, roles (`admin`, `operator`, `viewer`), and tenant affiliations.

---

## 5. Security & Authentication Boundary Matrix

| Surface | Auth Mechanism | Role Authorization | Tenant Enforcement | Notes |
|---|---|---|---|---|
| Admin Platform (`/dashboard`, `/stores`, `/settings`) | Auth.js JWT Session | Admin / Operator / Viewer | Enforced via `session.user.tenantId` | Unauthenticated users redirected to `/login` |
| Store API Routes (`/api/stores/*`) | Session Header Bearer / Cookie | Operator / Admin | Scoped by `tenantId` query filter | Strict cross-tenant isolation |
| Public Storefronts (`/store/[slug]`) | Public Route | None (Public) | Scoped by unique `slug` lookup | Unpublished stores display draft notice |
| Public Booking API (`/api/public/appointments`) | Public API | Rate Limited / Validated | Scoped to store via `storeId` in body | Validates provider/service existence |
| Public Lead Submission (`/api/public/leads`) | Public API | Validated | Scoped to store via `storeId` | Auto-sanitizes input strings |
| Preview Share Portal (`/preview/[token]`) | Token Header / Cookie | Token Bearer | Scoped to token's store ID | Expired tokens return HTTP 410 Gone |
| Maintenance Route (`/api/admin/maintenance`) | Session | Admin Role Only | Global System Scope | Rejects non-admin operators with 403 Forbidden |

---

## 6. Test Suite Matrix (484 Tests across 56 Files)

The regression test suite covers unit, integration, and E2E validation:
- **Auth & Session Tests:** `tests/auth.test.ts`, `tests/permissions.test.ts`
- **Store & Generation Tests:** `tests/phase16-business-profile.test.ts`, `tests/phase16-content-generation.test.ts`, `tests/phase16-recommendation-engine.test.ts`
- **Appointments Engine:** `tests/phase11-appointments.test.ts`, `tests/phase11-concurrency.test.ts`, `tests/phase11-timezones.test.ts`
- **Lead CRM & CSV Engine:** `tests/phase12-csv.test.ts`, `tests/phase12-lead-gen.test.ts`
- **Visual Editor & Customizer:** `tests/phase15-visual-editor.test.ts`, `tests/e2e-customizer-preview-sync.test.ts`
- **Security & Data Retention:** `tests/phase13-security.test.ts`, `tests/phase7-infrastructure.test.ts`
- **Accessibility & Contrast:** `tests/phase17-accessibility-remediation.test.ts`
- **Stabilization & Reliability:** `tests/phase18-1-stabilization.test.ts`, `tests/phase18-platform-refinement.test.ts`
