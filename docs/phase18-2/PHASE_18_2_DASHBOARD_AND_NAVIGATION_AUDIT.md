# GridRetail — Phase 18.2: Dashboard, Navigation & Global Search Audit

**Date:** 2026-11-23  
**Milestone:** Phase 18.2 — Platform-Wide Functional Audit & Interaction Verification  
**Repository:** `D:\grid`  
**Inspected Components:**
- Dashboard Page: [src/app/dashboard/page.tsx](file:///d:/grid/src/app/dashboard/page.tsx)
- Metric Cards: [src/components/dashboard/MetricCards.tsx](file:///d:/grid/src/components/dashboard/MetricCards.tsx)
- Recent Stores Table: [src/components/dashboard/RecentStoresTable.tsx](file:///d:/grid/src/components/dashboard/RecentStoresTable.tsx)
- App Header & Notifications: [src/components/layout/AppHeader.tsx](file:///d:/grid/src/components/layout/AppHeader.tsx)
- App Sidebar: [src/components/layout/AppSidebar.tsx](file:///d:/grid/src/components/layout/AppSidebar.tsx)
- Spotlight Modal: [src/components/shared/GlobalSpotlightModal.tsx](file:///d:/grid/src/components/shared/GlobalSpotlightModal.tsx)
- Activity Drawer: [src/components/shared/ActivityDrawerModal.tsx](file:///d:/grid/src/components/shared/ActivityDrawerModal.tsx)

---

## 1. Dashboard Overview & Metric Cards Audit

### 1.1 Metrics Data Source Analysis
The Dashboard page ([src/app/dashboard/page.tsx](file:///d:/grid/src/app/dashboard/page.tsx#L25-L50)) renders four primary summary cards using the `MetricCards` component:

```tsx
<MetricCards
  totalStores={stores.length}
  activeClients={activeClientsCount}
  pendingFeedback={pendingFeedbackCount}
  storageUsed={storageUsedFormatted}
/>
```

Inside [src/components/dashboard/MetricCards.tsx](file:///d:/grid/src/components/dashboard/MetricCards.tsx#L32-L75):
1. **Total Stores Card:**
   - **Main Value:** Dynamic (`stores.length` or computed total).
   - **Subtitle / Delta Badge:** Hardcoded string `"+2 this month"`. Does not query monthly creation rates from `StoreRepository`.
2. **Active Clients Card:**
   - **Main Value:** Dynamic client count.
   - **Subtitle / Delta Badge:** Hardcoded string `"98% satisfied"`. No satisfaction survey aggregation exists in the repository.
3. **Pending Feedback Card:**
   - **Main Value:** Dynamic count of feedback items with status `"pending"`.
   - **Subtitle / Delta Badge:** Hardcoded string `"Requires review"`.
4. **Storage Used Card:**
   - **Main Value:** Dynamic calculated byte size formatted as `MB` or `GB`.
   - **Subtitle / Delta Badge:** Hardcoded string `"5.2 GB of 20 GB quota"` or static tier text.

### 1.2 Evaluation & Defect Finding
- **Severity:** P3 (Low)
- **Defect ID:** `DEF-001`
- **Issue:** Metric cards mix dynamic primary counts with hardcoded secondary deltas and percentage labels (`"+2 this month"`, `"98% satisfied"`).
- **Remediation:** Calculate deltas using `createdAt >= startOfMonth` timestamps or hide delta badges when historical trend data is not available.

---

## 2. Recent Stores Table & Empty State

### 2.1 Table Structure & Click Targets
The table renders the 5 most recently updated stores with columns:
- **Store Name & Business Profile:** Clicking navigates to `/stores/[id]`.
- **Website Type Badge:** Correct color coding (Purple for E-Commerce, Blue for Appointments, Emerald for Lead Gen).
- **Status Badge:** Draft (Amber), Published (Green).
- **Industry & Domain:** Displays industry tag and subpath/slug.
- **Action Buttons:**
  - `Edit Store`: Navigates to `/stores/[id]/editor` (Functional).
  - `View Details`: Navigates to `/stores/[id]` (Functional).
  - `More Options` (Dropdown): Provides quick links to Preview, Present, Schedule/Leads (Functional).

### 2.2 Empty State Toggle Verification
The dashboard provides a testing/preview toggle button `Toggle Empty State Preview` in development/audit mode ([src/app/dashboard/page.tsx](file:///d:/grid/src/app/dashboard/page.tsx#L90-L105)). When triggered:
- The table smoothly displays the zero-state banner: `"No websites generated yet. Create your first client store using the multi-step generator."`
- The CTA `"Generate Website"` directs users to `/stores/new`.
- Clicking the toggle again immediately restores the populated store list without page reload.

---

## 3. Quick Actions Section

The Quick Actions container ([src/app/dashboard/page.tsx](file:///d:/grid/src/app/dashboard/page.tsx#L120-L160)) exposes five direct workflow triggers:
1. **`Generate Website`**: Links to `/stores/new` (Opens Store Creation Wizard).
2. **`View Stores`**: Links to `/stores` (Opens Store Directory).
3. **`Design Library`**: Links to `/templates` (Opens Template Catalog).
4. **`System Settings`**: Links to `/settings` (Opens Platform Configuration).
5. **`Export Data`**: Triggers a global CSV export / download handler.

**Audit Finding:** All quick action links point to valid routes; no dead `#` anchors or unimplemented `onClick` stubs exist.

---

## 4. App Sidebar & Responsive Behavior

### 4.1 Navigation Hierarchy
The sidebar ([src/components/layout/AppSidebar.tsx](file:///d:/grid/src/components/layout/AppSidebar.tsx)) displays:
- **Brand Identity:** `"GridRetail"` logo and subtitle `"Internal Website Engine"`.
- **Primary Routes:** Dashboard, Stores, Templates, Products, Clients, Analytics, Settings.
- **Collapse Toggle Button:** In the footer.
  - When expanded: 240px width with icons and textual labels.
  - When collapsed: 68px width showing icon-only tooltips. State is maintained cleanly.
- **Mobile Drawer:** On viewports below 1024px, the sidebar shifts off-canvas and toggles via the header hamburger button with backdrop overlay.

---

## 5. Header, Notifications & Activity Drawer

### 5.1 App Header Controls
- **Breadcrumbs:** Correctly reflect hierarchical path (e.g., `Dashboard > Stores > Botanica Apothecary`).
- **Global Search Button:** Displays shortcut badge `Ctrl K` / `Cmd K`, opening the Spotlight Modal.
- **Notification Bell:** Displays active badge count `2`.
- **User Avatar Dropdown:** Displays logged-in user (`Alex Mercer`, role: `Admin`), with links to Settings and Sign Out.

### 5.2 Header Notification Dropdown Audit (DEF-002)
- **Component:** [src/components/layout/AppHeader.tsx](file:///d:/grid/src/components/layout/AppHeader.tsx#L45-L68)
- **Data Source:** Hardcoded local React state initialized with:
  - `n-1`: "Aura Minimalist review request submitted"
  - `n-2`: "Botanica Apothecary published to production"
- **Defect:**
  - Clicking "Mark all as read" only executes `setNotifications([])` in local React state.
  - On full page refresh, the notifications revert to the initial 2 hardcoded items.
  - It does not integrate with `NotificationRepository` or `ActivityRepository`.
- **Severity:** P2 (Medium).

### 5.3 Activity Feed Drawer Modal
- **Trigger:** Clicking "View all activity" in the header or sidebar opens `ActivityDrawerModal` ([src/components/shared/ActivityDrawerModal.tsx](file:///d:/grid/src/components/shared/ActivityDrawerModal.tsx)).
- **Data Fetching:** Calls `GET /api/activities` dynamically. Renders 10+ recent audit events with relative timestamps ("5 minutes ago").
- **Limitation (DEF-003):** "Clear all activities" modifies frontend display state only; there is no backend DELETE endpoint for activity records.
- **Severity:** P3 (Low).

---

## 6. Spotlight Search Modal (P1 — Critical Interaction Defect)

### 6.1 Defect Diagnosis (DEF-004)
- **Component:** [src/components/shared/GlobalSpotlightModal.tsx](file:///d:/grid/src/components/shared/GlobalSpotlightModal.tsx#L210-L225)
- **Code:**
```tsx
const res = await fetch("/api/stores");
const json = await res.json();
if (active && Array.isArray(json)) {
  setStores(json);
}
```
- **Root Cause:**
  - `/api/stores` returns an object envelope: `{ stores: Store[], total: number }`.
  - `Array.isArray(json)` evaluates to `false` because `json` is an Object, not an Array.
  - Consequently, `setStores(json)` is NEVER called, and the `stores` state remains an empty array `[]`.
- **User Impact:**
  - When an operator opens Spotlight (`Ctrl+K`) and types the name of any existing store (e.g. `"Aura"`, `"Botanica"`, `"Summit"`), **zero store results are found**.
  - Spotlight only shows static navigation links (Dashboard, Stores, Settings) and fails its primary purpose of fast store switching.
- **Severity:** P1 (High Severity).
- **Suggested Fix:**
```tsx
const items = Array.isArray(json) ? json : (json.stores || []);
if (active && Array.isArray(items)) {
  setStores(items);
}
```

---

## 7. Visual Proof Screenshot References

| Screenshot Filename | Viewport | Verified Behavior |
|---|---|---|
| [01-dashboard-view.png](file:///d:/grid/docs/screenshots/phase18-2/01-dashboard-view.png) | 1440 × 900 | Full Dashboard layout with metrics, quick actions, and recent stores |
| [02-dashboard-metrics.png](file:///d:/grid/docs/screenshots/phase18-2/02-dashboard-metrics.png) | 1440 × 900 | Close-up of 4 metric summary cards |
| [03-dashboard-recent-stores.png](file:///d:/grid/docs/screenshots/phase18-2/03-dashboard-recent-stores.png) | 1440 × 900 | Recent Stores table with status pills and action dropdowns |
| [04-dashboard-quick-actions.png](file:///d:/grid/docs/screenshots/phase18-2/04-dashboard-quick-actions.png) | 1440 × 900 | Quick action buttons panel |
| [05-dashboard-empty-state.png](file:///d:/grid/docs/screenshots/phase18-2/05-dashboard-empty-state.png) | 1440 × 900 | Dashboard empty state after triggering test toggle |
| [06-notifications-dropdown.png](file:///d:/grid/docs/screenshots/phase18-2/06-notifications-dropdown.png) | 1440 × 900 | Header notification popup with hardcoded items |
| [07-activity-drawer-modal.png](file:///d:/grid/docs/screenshots/phase18-2/07-activity-drawer-modal.png) | 1440 × 900 | Slide-out Activity Log drawer fetching `/api/activities` |
| [08-spotlight-modal-open.png](file:///d:/grid/docs/screenshots/phase18-2/08-spotlight-modal-open.png) | 1440 × 900 | Spotlight search dialog opened via keyboard shortcut |
| [09-spotlight-search-stores-bug.png](file:///d:/grid/docs/screenshots/phase18-2/09-spotlight-search-stores-bug.png) | 1440 × 900 | Evidence of `DEF-004`: Searching for existing store yields no results |
| [10-sidebar-collapsed.png](file:///d:/grid/docs/screenshots/phase18-2/10-sidebar-collapsed.png) | 1440 × 900 | App sidebar collapsed into icon-only 68px mode |
