# GridRetail — Phase 18: Store Type Consistency Report

**Document ID:** `PHASE_18_STORE_TYPE_CONSISTENCY_REPORT.md`  
**Date:** November 23, 2026  
**Status:** Certified & Implemented  
**Author:** GridRetail Platform Engineering Team  

---

## 1. Objective

This report documents the resolution of Workstream 6 (Fix Store Type Consistency). The primary defect addressed was the misclassification of Lead Generation stores as "E-Commerce" across the Store Management table (`/stores`) and dashboard components.

---

## 2. Root Cause Analysis

In `src/app/stores/page.tsx` (prior to Phase 18):
```tsx
{store.websiteType === "appointments" ? (
  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-emerald-50 text-emerald-800 border border-emerald-200 shrink-0">
    Appointments
  </span>
) : (
  <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-stone-100 text-stone-600 border shrink-0">
    E-Commerce
  </span>
)}
```
The conditional expression handled only two branches: `appointments` versus everything else. When a store had `websiteType === "lead_gen"` (or `"lead-generation"`), the ternary evaluated directly to `E-Commerce`.

Furthermore:
1. **Scope Column:** Line 225 rendered `{store.websiteType === "appointments" ? "Services & Slots" : `${store.productCount || 0} SKUs`}`, displaying `"0 SKUs"` for Lead Generation stores.
2. **Action Buttons:** Only Appointment stores had a dedicated shortcut link (`/stores/[id]/schedule`), while Lead Generation stores had no shortcut to their lead intake management interface (`/stores/[id]/leads`).
3. **Filter Bar:** No filter existed to segment stores by website type.
4. **Dashboard Recent Stores Table:** Displayed store names without website type badges, obscuring the business model.

---

## 3. Remediation Architecture

### 3.1 Store Types Utility (`src/utils/store-types.ts`)
Created a shared utility module defining canonical normalization, label mapping, and badge styling:
- **`CanonicalWebsiteType`:** Union of `"ecommerce" | "appointments" | "lead_gen"`.
- **`normalizeWebsiteType(type?: string): CanonicalWebsiteType`:**
  - Case-insensitively maps `"appointments"`, `"appointment"`, `"appointment_scheduling"`, and `"scheduling"` to `"appointments"`.
  - Case-insensitively maps `"lead_gen"`, `"lead-gen"`, `"lead_generation"`, `"lead-generation"`, and `"leadgen"` to `"lead_gen"`.
  - Maps any other or undefined string to `"ecommerce"`.
- **`getWebsiteTypeLabel(type?: string): string`:**
  - `"appointments"` → `"Appointment Scheduling"`
  - `"lead_gen"` → `"Lead Generation"`
  - `"ecommerce"` → `"E-Commerce"`
- **`getWebsiteTypeBadgeClass(type?: string): string`:**
  - `"appointments"` → `bg-[#EBF0F5] text-[#2D6A9F] border-[#C3D7E8]` (Professional Blue)
  - `"lead_gen"` → `bg-[#F3EBF5] text-[#7B3F9E] border-[#E2CEE6]` (Royal Purple)
  - `"ecommerce"` → `bg-[#EBF3EF] text-[#176B4D] border-[#C8E0D2]` (Forest Green)
- **`getWebsiteTypeFilterOptions()`:** Returns options for `ALL`, `ecommerce`, `appointments`, and `lead_gen`.

### 3.2 Store Management Page Updates (`src/app/stores/page.tsx`)
1. **Dynamic Badges:**
   Replaced binary check with `<span className={getWebsiteTypeBadgeClass(store.websiteType)}>{getWebsiteTypeLabel(store.websiteType)}</span>`.
2. **Website Type Filter:**
   Added a dedicated `<FilterSelect label="Type" options={websiteTypeOptions} value={websiteTypeFilter} ... />` dropdown.
3. **Dynamic Scope Column:**
   - E-Commerce: Displays `${store.productCount || 0} SKUs`.
   - Appointments: Displays `"Services & Slots"`.
   - Lead Generation: Displays `"Forms & Leads"`.
4. **Dedicated Action Shortcuts:**
   - Appointments: Links to `/stores/[id]/schedule` ("Schedule").
   - Lead Gen: Links to `/stores/[id]/leads` ("Leads").
   - Subdomain and Live Preview links provided for all store types.

### 3.3 Dashboard Table Updates (`src/components/dashboard/RecentStoresTable.tsx`)
Added website type badge directly alongside the store title, providing instant visual identification of store categories on the dashboard.

### 3.4 Editor & Customizer Header (`src/components/editor/EditorToolbar.tsx`)
Connected `getWebsiteTypeLabel(websiteType)` in the editor toolbar, ensuring consistent labeling across desktop, tablet, and mobile builder views.

---

## 4. Visual Evidence

- **Screenshot:** `docs/screenshots/phase18/store-management.png` showing the Store Management table with distinct badges for E-Commerce (green), Appointment Scheduling (blue), and Lead Generation (purple), the "Type" filter select, and tailored "Schedule" and "Leads" action buttons.
- **Screenshot:** `docs/screenshots/phase18/dashboard.png` showing the Recent Stores table with website type badges next to every store name.
