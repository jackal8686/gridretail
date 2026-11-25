# GridRetail — Phase 18.1 Root Cause Analysis

**Author:** GridRetail Engineering  
**Date:** November 23, 2026  
**Document ID:** GR-P18-1-RCA-001  
**Status:** Complete & Remediated

---

## 1. Executive Problem Statement

During Phase 18 evaluation, several functional and cosmetic defects impacted platform usability and consistency:
1. **Critical Failure to Load Appointment & Lead Generation Builders:**
   Attempting to open the customizer/preview for Summit Legal Practice (`/stores/str_summit/preview` or `/stores/summit-legal/preview`) or Apex Growth Advisory (`/stores/str_apex/preview` or `/stores/apex-growth/preview`) resulted in an error card: `Storefront Editor Unavailable — Store record not found.`
2. **Editor Layers vs Canvas Discrepancy:**
   Loading the E-Commerce builder (`/stores/str_01/preview`) rendered a full storefront on the iframe canvas (Hero, Featured Products, Brand Story, Newsletter, Footer), but the left-hand Layers panel reported `Page Structure (0 Sections)`.
3. **Platform Version Divergence:**
   The desktop sidebar rendered `v5.0.0` inside an environment pill, while the platform footer and site metadata rendered `Version 1.0.0`.
4. **Unsupported SLA Claims:**
   The KPI card on the dashboard reported `100% SLA uptime` for Published Stores on an internal pitching and demo tool.
5. **Persistence Labeling Transparency:**
   Workstation preferences in platform settings (`/settings`) were stored in browser `localStorage` but lacked clear labeling.

---

## 2. In-Depth Root Cause Breakdown

### 2.1 Store Loading Failure (`Store record not found`)
- **Fault Mechanism:**
  The store route handler `GET /api/stores/[id]/route.ts` executed exclusively:
  ```ts
  const store = await StoreRepository.findById(id);
  ```
  In `src/mock/stores.ts`, the canonical stores were registered with:
  - `id: "str_07"`, `slug: "summit-legal"` (Appointment Scheduling)
  - `id: "str_08"`, `slug: "apex-growth"` (Lead Generation)
  However, fallback spotlight search entries (`GlobalSpotlightModal.tsx`) and legacy test scripts linked to `/stores/str_summit` and `/stores/str_apex`. Because `StoreRepository.findById` had no alias mapping or slug lookup, it returned `null`, producing an HTTP 404 response.
- **Remediation:**
  1. Updated `StoreRepository.findById` to support legacy alias mapping (`str_summit` -> `str_07`, `str_apex` -> `str_08`) and slug fallback (`slug: lookupId.toLowerCase()`).
  2. Updated `src/app/api/stores/[id]/route.ts` to query `findById(id)` followed by `findBySlug(id)`.
  3. In `PATCH /api/stores/[id]`, resolved updates directly against `existing.id` to prevent slug-mutation bugs.
  4. Corrected static fallback links in `GlobalSpotlightModal.tsx` to reference `str_07` and `str_08`.

### 2.2 Editor Layer Mismatch (`Page Structure: 0 Sections`)
- **Fault Mechanism:**
  In `src/components/editor/VisualEditorWorkspace.tsx`:
  ```ts
  const [sections, setSections] = useState<SectionInstance[]>(store.sections || []);
  ```
  For mock stores, `store.sections` was initially `undefined`. Consequently, `VisualEditorWorkspace` initialized `sections` to `[]`.
  Meanwhile, the iframe canvas rendered `StorefrontView`, which invokes `resolveStoreSections(store)`. The resolver dynamically synthesizes 5 standard section instances when `store.sections` is missing.
  This caused a split-brain state: the editor state was empty while the preview canvas was fully rendered.
- **Remediation:**
  1. Updated `VisualEditorWorkspace.tsx` to initialize `sections` with:
     ```ts
     const [sections, setSections] = useState<SectionInstance[]>(
       store.sections && store.sections.length > 0
         ? store.sections
         : resolveStoreSections(store)
     );
     ```
  2. In `src/mock/stores.ts`, wrapped `MOCK_STORES` with `resolveStoreSections`, ensuring every seeded store carries pre-populated section objects.

### 2.3 Versioning Divergence (`v5.0.0` vs `1.0.0`)
- **Fault Mechanism:**
  In `src/components/layout/AppSidebar.tsx` line 180, an environment badge hardcoded:
  ```tsx
  <span className="text-[10px] bg-[#E2F5E9] text-[#176B4D] px-1.5 py-0.5 rounded font-mono">
    v5.0.0
  </span>
  ```
  Meanwhile, `src/config/site.ts` declared `version: "1.0.0"`.
- **Remediation:**
  Imported `siteConfig` in `AppSidebar.tsx` and unified the badge display to `v{siteConfig.version}` (`v1.0.0`).

### 2.4 Unsupported SLA Uptime Claim
- **Fault Mechanism:**
  In `src/components/dashboard/MetricCards.tsx`, card 4 had:
  ```ts
  delta: "100% SLA uptime",
  ```
- **Remediation:**
  Replaced with `delta: "Active environments"`.

### 2.5 Table Layout & Wrapping
- **Fault Mechanism:**
  In `RecentStoresTable.tsx` and `stores/page.tsx`, table headers lacked explicit min-widths and `whitespace-nowrap`, causing table cells to break into awkward single-character wraps on narrower viewports.
- **Remediation:**
  Added `min-w-[760px]` / `min-w-[960px]` to tables and explicit column min-widths with `whitespace-nowrap` on status badges, dates, and actions.
