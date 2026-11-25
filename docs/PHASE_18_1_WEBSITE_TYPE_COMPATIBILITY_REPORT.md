# GridRetail — Phase 18.1: Website Type Compatibility Report

## 1. Executive Summary

GridRetail guarantees strict isolation and content compatibility across its three supported website generation modalities:
1. **E-Commerce**
2. **Appointment Scheduling**
3. **Lead Generation**

Phase 18.1 systematically eliminated cross-industry vocabulary leakage and retail artifacts from non-ecommerce storefronts.

---

## 2. Modality Matrix & Content Separation

| Feature / Element | E-Commerce (`ecommerce`) | Appointment Scheduling (`appointments`) | Lead Generation (`lead_gen`) |
| :--- | :--- | :--- | :--- |
| **Primary Goal** | Catalog browsing & direct cart checkout | Service booking & specialist scheduling | High-value client inquiries & qualification |
| **Hero Eyebrow** | `⚡ CURATED COLLECTION` | `⚡ PROFESSIONAL PRACTICE` | `⚡ STRATEGIC ADVISORY` |
| **Hero Headline** | `Curated [Industry] Collection` | `Specialized Legal & Advisory Practice` | `Strategic Enterprise Growth Solutions` |
| **Primary CTA** | `Explore Catalog` / `Shop Now` | `Book Consultation` | `Request Information` / `Schedule Session` |
| **Key Badges** | `Curated Selection` • `Direct Order` | `Verified Practice` • `Direct Booking` | `Verified Advisory` • `Direct Inquiry` |
| **Primary Content** | Product catalog grid & cart drawer | Service picker & calendar slot booking | Multi-step interactive inquiry form & CRM |
| **Shopping Cart** | Enabled (`cartItems`, subtotal, checkout) | Completely disabled & hidden | Completely disabled & hidden |

---

## 3. Implementation Hardening

### 3.1 `src/components/storefront/StorefrontView.tsx`
* Updated default branding state and hero layouts (`bold-announcement`, `cinematic-framed`, `split-minimal`, etc.) to dynamically branch on `initialStore.websiteType`.
* Replaced static retail strings (`Curated Catalog`, `Curated Brand Collection`) with practice-aware equivalents.

### 3.2 `src/lib/sections/resolver.ts`
* Removed hardcoded e-commerce copy (*"sustainable tactile materials"*, *"curated pieces"*) from non-ecommerce `brand_story` and `hero` fallbacks.
* Generates dedicated service and lead-capture sections for non-retail industries.

### 3.3 Public Preview Routing (`src/app/preview/[token]/page.tsx`)
* Implemented clean polymorphic routing:
  * `store.websiteType === "appointments"`: Renders `AppointmentWebsiteView`.
  * `store.websiteType === "lead_gen"`: Renders `LeadGenWebsiteView`.
  * `store.websiteType === "ecommerce"`: Renders `StorefrontView`.

---

## 4. Verification Evidence
* Unit tests in `tests/phase18-1-stabilization.test.ts` verify zero e-commerce terms leak into Appointment or Lead Gen generated sections.
* High-resolution screenshots confirm clean, distinct layouts for Summit Legal Practice and Apex Growth Advisory.
