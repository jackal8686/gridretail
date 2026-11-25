# GridRetail — Phase 18.1 Website Type Isolation Report

**Milestone:** Phase 18.1  
**Author:** GridRetail Engineering  
**Date:** November 23, 2026  
**Status:** Isolated & Verified  

---

## 1. Executive Summary

GridRetail maintains strict isolation across its three supported website types:
1. **E-Commerce** (`ecommerce`)
2. **Appointment Scheduling** (`appointments`)
3. **Lead Generation** (`lead_gen`)

This report audits all points of potential leakage and verifies complete functional and visual separation.

---

## 2. Isolation Verification Matrix

| Platform Area | E-Commerce | Appointment Scheduling | Lead Generation | Isolation Status |
| :--- | :--- | :--- | :--- | :---: |
| **Catalog & Products** | Full inventory, categories, SKUs | Hidden / 0 SKUs | Hidden / 0 SKUs | **ISOLATED** |
| **Cart & Checkout** | Active cart drawer & checkout | Disabled / Not rendered | Disabled / Not rendered | **ISOLATED** |
| **Booking & Slots** | Disabled | Services, providers, slots | Disabled | **ISOLATED** |
| **Inquiry Forms** | Disabled | Service intake | Dynamic steps & honeypot | **ISOLATED** |
| **Store Management Column** | `X SKUs` | `Services & Slots` | `Forms & Leads` | **ISOLATED** |
| **Hero Eyebrow / Badge** | Store Notice / Promo | Legal / Practice Services | Growth Advisory | **ISOLATED** |
| **Default Bullets** | Curated catalog selections | Confidential consultation | Discuss business goals | **ISOLATED** |
| **Operational Admin** | Product manager | Schedule manager | Lead CRM | **ISOLATED** |

---

## 3. Regression Prevention

`tests/phase18-1-stabilization.test.ts` includes automated assertions validating:
- Serialized appointment sections contain zero e-commerce phrases ("Curated catalog", "Explore Catalog", "tactile materials").
- Serialized lead-generation sections contain zero product/cart references.
