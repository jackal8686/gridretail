# GridRetail — Phase 18.2: Store Management & Template Library Audit

**Date:** 2026-11-23  
**Milestone:** Phase 18.2 — Platform-Wide Functional Audit & Interaction Verification  
**Repository:** `D:\grid`  
**Inspected Components:**
- Store Directory: [src/app/stores/page.tsx](file:///d:/grid/src/app/stores/page.tsx)
- Store Creation Wizard: [src/app/stores/new/page.tsx](file:///d:/grid/src/app/stores/new/page.tsx)
- Store Detail Hub: [src/app/stores/[id]/page.tsx](file:///d:/grid/src/app/stores/[id]/page.tsx)
- Template Catalog: [src/app/templates/page.tsx](file:///d:/grid/src/app/templates/page.tsx)
- Template Repository & Mocks: [src/lib/repositories/template.repository.ts](file:///d:/grid/src/lib/repositories/template.repository.ts), [src/mock/templates.ts](file:///d:/grid/src/mock/templates.ts)

---

## 1. Store Directory & Management Page (`/stores`)

### 1.1 Store Listing & Data Retrieval
The Store Directory ([src/app/stores/page.tsx](file:///d:/grid/src/app/stores/page.tsx)) acts as the primary hub for operators to manage all client websites. It loads stores from `GET /api/stores` with support for server-side pagination, search queries, and multi-facet filtering.

Each store item displays:
- Store Name, Business Tagline, and Subdomain Slug (`/store/[slug]`)
- Website Type Tag:
  - `E-Commerce` (Purple badge)
  - `Appointment Scheduling` (Blue badge)
  - `Lead Generation` (Emerald badge)
- Publication Status: `Published` (Green) or `Draft` (Amber)
- Direct Workflow Action Links:
  - **Edit:** Navigates directly to `/stores/[id]/editor`
  - **Present:** Navigates to `/stores/[id]/present` (Pitch Deck)
  - **Schedule / Leads:** Contextually switches based on website type (links to `/stores/[id]/schedule` for appointments, `/stores/[id]/leads` for lead gen)
  - **Preview:** Opens full-screen preview at `/stores/[id]/preview`

### 1.2 Store Filter Droplist Anomaly (DEF-005)
- **Component:** [src/app/stores/page.tsx](file:///d:/grid/src/app/stores/page.tsx#L40-L55)
- **Defect Description:**
  The `industryOptions` constant lists standard retail and hospitality industries:
  `["Fashion & Apparel", "Beauty & Cosmetics", "Home & Living", "Electronics & Tech", "Food & Beverage", "Health & Wellness"]`
  However, Phase 16 expanded GridRetail to generate appointment and lead gen websites for non-retail industries such as **`"Legal & Advisory"`** (e.g. Summit Legal) and **`"Professional Services"`** (e.g. Apex Growth).
- **Impact:**
  When an operator filters the store list by industry, stores belonging to `"Legal & Advisory"` or `"Professional Services"` cannot be selected directly from the industry droplist. Operators must rely on the freeform text search.
- **Severity:** P3 (Low).

### 1.3 Missing UI for Store Deletion, Archiving & Unpublishing (DEF-006)
- **Component:** [src/app/stores/page.tsx](file:///d:/grid/src/app/stores/page.tsx#L180-L240), [src/components/editor/EditorToolbar.tsx](file:///d:/grid/src/components/editor/EditorToolbar.tsx#L110-L140)
- **Audit Finding:**
  1. The API route `DELETE /api/stores/[id]` exists and handles soft deletion via `StoreRepository.delete()`.
  2. In the UI, the store cards and table rows do **NOT** expose a "Delete Store" or "Archive Store" action button or modal confirmation.
  3. Once a store is published, neither the directory nor the Editor Toolbar provides an "Unpublish Store" button to transition the store back to `draft` status. The toolbar only displays "Republish" or "Publish".
- **Impact:** Operators cannot retire, unpublish, or delete stores through the graphical user interface.
- **Severity:** P2 (Medium).

---

## 2. Store Creation Wizard (`/stores/new`)

### 2.1 4-Step Interactive Flow
The wizard ([src/app/stores/new/page.tsx](file:///d:/grid/src/app/stores/new/page.tsx)) was rigorously tested end-to-end:
1. **Step 1: Business Identity:**
   - Fields: Business Name, Industry (dropdown with all supported sectors), Website Type selector, Subdomain slug input, Brand Voice.
   - Validation: Slug input automatically validates uniqueness against `/api/stores?slug=...` with instant green checkmark or error badge.
2. **Step 2: Template & Theme Selection:**
   - Filters templates based on the chosen website type.
   - Allows previewing color palettes (Minimalist, Bold Dark, Warm Organic, Corporate Blue).
3. **Step 3: Feature & Section Configuration:**
   - Context-aware recommendations dynamically populated via `RecommendationEngine`.
   - Toggleable sections (Hero, Featured Products, Services Grid, Lead Intake Form, Testimonials, FAQ, Contact).
4. **Step 4: Review & Generate:**
   - Summarizes selected profile, template, and sections.
   - Submits to `POST /api/generation/full-site`.
   - On completion, automatically creates database records, generates starter inventory/services/forms, and redirects to `/stores/[id]/editor`.

**Audit Finding:** The wizard is fully functional, robustly validated, and correctly synchronizes with the multi-type website generation engine.

---

## 3. Template Catalog (`/templates`)

### 3.1 Catalog Navigation & Structure
The Template Catalog ([src/app/templates/page.tsx](file:///d:/grid/src/app/templates/page.tsx)) showcases curated website templates:
- **Tabs:** All Templates, E-Commerce, Appointment Scheduling, Lead Generation.
- **Template Cards:**
  - Responsive mock preview thumbnails.
  - Badges indicating recommended industry, layout style, and section count.
  - Section tags (e.g. `Hero`, `Booking Calendar`, `Staff Roster`, `Pricing Table`).

### 3.2 Action Button Behavior & Limitation (DEF-007)
- **Component:** [src/app/templates/page.tsx](file:///d:/grid/src/app/templates/page.tsx#L85-L115)
- **Current Behavior:**
  Clicking "Use Template" redirects the operator to `/stores/new?template={templateId}`. This correctly pre-fills Step 2 of the creation wizard for a *new* store.
- **Limitation:**
  There is no mechanism within the platform to "Apply Template to Existing Store". If an operator is working on an existing draft store, they cannot switch its base layout template from this catalog; they must reconfigure sections manually in the Visual Editor.
- **Severity:** P3 (Informational / Architectural Limitation).

---

## 4. Visual Proof Screenshot References

| Screenshot Filename | Viewport | Verified Behavior |
|---|---|---|
| [11-stores-directory.png](file:///d:/grid/docs/screenshots/phase18-2/11-stores-directory.png) | 1440 × 900 | Complete store directory with search, filter tabs, and multi-type badges |
| [12-stores-filter-dropdown.png](file:///d:/grid/docs/screenshots/phase18-2/12-stores-filter-dropdown.png) | 1440 × 900 | Industry filter dropdown displaying available categories |
| [13-store-wizard-step1.png](file:///d:/grid/docs/screenshots/phase18-2/13-store-wizard-step1.png) | 1440 × 900 | Store Creation Wizard Step 1 with website type cards and slug validator |
| [14-templates-catalog.png](file:///d:/grid/docs/screenshots/phase18-2/14-templates-catalog.png) | 1440 × 900 | Template Catalog displaying E-Commerce, Appointment, and Lead Gen templates |
