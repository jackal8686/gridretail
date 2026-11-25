# GridRetail — Phase 18.1 Settings and Metrics Report

**Milestone:** Phase 18.1  
**Author:** GridRetail Engineering  
**Date:** November 23, 2026  
**Status:** Remediated & Verified  

---

## 1. Executive Summary

This report documents the verification of Platform Settings persistence transparency, version consistency, and Dashboard KPI metric accuracy.

---

## 2. Platform Settings Persistence Transparency

In `src/app/settings/page.tsx`:
- **General Tab:**
  - Card Title: "General Workspace Settings"
  - Card Description: `Workstation identifier and default demo store parameters (Stored in local browser workspace storage).`
  - Footer Label: `Saved to local browser workspace storage`
- **Notifications Tab:**
  - Footer Label: `Saved to local browser notification preferences`
- **Team & Security Tab:**
  - Admin-only user management with live server-side `/api/admin/users` API endpoint.
- **Persistence Model:**
  Clearly distinguishes local browser workstation preferences (`localStorage`) from server-persisted user credentials (`MongoDB`).

---

## 3. Platform Version Consistency

- Canonical definition in `src/config/site.ts`: `version: "1.0.0"`.
- Platform footer (`AppShell.tsx`): `Version 1.0.0`.
- Sidebar environment badge (`AppSidebar.tsx`): Updated from hardcoded `v5.0.0` to `v${siteConfig.version}` (`v1.0.0`).
- Unified on Version 1.0.0 across all components.

---

## 4. Dashboard Metrics Accuracy

In `src/components/dashboard/MetricCards.tsx`:
- Removed unverified `delta: "100% SLA uptime"`.
- Replaced with factual label: `delta: "Active environments"`.
- Total Stores, In Progress, Pending Review, and Published counts dynamically calculate from actual store records loaded via `/api/stores`.
