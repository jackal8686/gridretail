# GridRetail — Phase 18.1 Remaining Issues Register

**Milestone:** Phase 18.1  
**Author:** GridRetail Engineering  
**Date:** November 23, 2026  
**Status:** All Identified Issues Closed & Verified  

---

## 1. Issue Register & Remediation Ledger

| ID | Issue Title | Severity | Area | Status | Resolution Detail |
| :--- | :--- | :---: | :--- | :---: | :--- |
| **ISS-01** | Appointment Builder 404 (`Store record not found`) | Critical | Store Routing | **Fixed & Verified** | Dual-key resolution in `StoreRepository.findById` + route handler slug/alias mapping. |
| **ISS-02** | Lead Gen Builder 404 (`Store record not found`) | Critical | Store Routing | **Fixed & Verified** | Dual-key resolution in `StoreRepository.findById` + route handler slug/alias mapping. |
| **ISS-03** | Editor Layers 0 Sections Mismatch | Critical | Visual Editor | **Fixed & Verified** | `resolveStoreSections` fallback in `VisualEditorWorkspace` + pre-seeded mock sections. |
| **ISS-04** | E-Commerce Copy Leakage into Brand Story | High | Content Engine | **Fixed & Verified** | Website-type tailored defaults in `src/lib/sections/resolver.ts`. |
| **ISS-05** | Sidebar Version Discrepancy (`v5.0.0`) | Medium | Layout | **Fixed & Verified** | Centralized on `v${siteConfig.version}` (`v1.0.0`) in `AppSidebar.tsx`. |
| **ISS-06** | Unsupported `100% SLA uptime` Claim | High | Metrics | **Fixed & Verified** | Replaced with `Active environments` in `MetricCards.tsx`. |
| **ISS-07** | Dashboard & Store Table Cell Wrapping | Medium | UI Layout | **Fixed & Verified** | Added `min-w-[760px]`, `min-w-[960px]`, and `whitespace-nowrap` on badges and dates. |
| **ISS-08** | Client Workspace Settings Persistence Ambiguity | Medium | Settings | **Fixed & Verified** | Labeled as `(Stored in local browser workspace storage)`. |
| **ISS-09** | Empty Appointment Schedule Dashboard | High | Scheduling | **Fixed & Verified** | Seeded test appointment `apt_mock_01` for Summit Legal (`str_07`) and verified end-to-end. |
| **ISS-10** | Empty Lead CRM Dashboard | High | Lead Gen | **Fixed & Verified** | Seeded test lead `lead_mock_01` for Apex Growth (`str_08`) and verified end-to-end. |
| **ISS-11** | Inaccurate Mock Store Industries | Medium | Store Metadata | **Fixed & Verified** | Updated Summit Legal to `Legal & Advisory` and Apex Growth to `Professional Services`. |

---

## 2. Closure Verdict

Every issue in the register has been investigated, resolved in source code, verified with automated unit tests, and evidenced with actual Playwright browser captures. Zero critical or high defects remain unresolved.
