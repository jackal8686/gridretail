# GridRetail — Phase 18.1 Website Type and Branding Report

**Author:** GridRetail Engineering  
**Date:** November 23, 2026  
**Document ID:** GR-P18-1-BRANDING-001  
**Status:** Canonical & Complete

---

## 1. Objective

Ensure absolute clarity, accurate website-type labeling, and strict separation between the internal GridRetail platform identity and client merchant storefront identities.

---

## 2. Platform Branding vs Client Branding

| Location | GridRetail Platform Identity | Client Storefront Identity |
| :--- | :--- | :--- |
| **Admin Login (`/login`)** | "GridRetail — Internal Website Generation Platform" | None (Platform Operator Authentication) |
| **Sidebar (`AppSidebar`)** | "GridRetail Internal Platform" • `v1.0.0` | None |
| **Dashboard Header (`/dashboard`)** | "Generate, configure, and manage high-converting client websites..." | Displays client stores in Recent Stores Table |
| **Store Management (`/stores`)** | Platform filter bar and store list | Client store names, custom slugs, and types |
| **Editor Canvas (`/store/[slug]`)** | None (Clean iframe isolation) | 100% Client Merchant branding & colors |

---

## 3. Industry Realism & Taxonomy

In `src/types/store.ts` and `src/mock/stores.ts`:
- Expanded `IndustryType` to include `"Legal & Advisory"` and `"Professional Services"`.
- Summit Legal Practice (`str_07`): Corrected from "Health & Wellness" to `"Legal & Advisory"`.
- Apex Growth Advisory (`str_08`): Corrected from "Health & Wellness" to `"Professional Services"`.
- Store Creation Wizard: Added custom category presets for Legal & Advisory (Corporate & M&A, IP & Patents, Regulatory Compliance, Executive Consultation) and Professional Services (Strategy & Transformation, Operational Architecture, Financial Advisory, Executive Coaching).
