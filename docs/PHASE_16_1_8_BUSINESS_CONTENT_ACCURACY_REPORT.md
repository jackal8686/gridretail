# GridRetail — Phase 16.1.8 Business Content Accuracy Report

## 1. Executive Summary

Phase 16.1.8 performs a comprehensive audit and removal of unsupported default claims across section registries, storefront fallback templates, and mock data. In particular, promotional claims regarding limited-run manufacturing, unverified certifications, delivery commitments, seasonal timestamps, and unproven credential badges were permanently eliminated and replaced with neutral, industry-aligned copy.

---

## 2. Unsupported Claims Removed

The following unsupported default phrases and commitments were identified and remediated:

| Prohibited Phrase / Claim | Source Location | Neutral Replacement |
| :--- | :--- | :--- |
| `"Handcrafted in limited runs"` | `src/constants/sections.ts` (hero_split) | `"Curated catalog selections"` |
| `"Sustainably sourced certified materials"` | `src/constants/sections.ts` (hero_split) | `"Detailed product specifications"` |
| `"Complimentary express delivery"` | `src/constants/sections.ts` (hero_split) | `"Direct merchant ordering"` |
| `"New Season 2026"` | `src/constants/sections.ts` (hero_split) | `"Featured Collection"` |
| `"Grade-A Aerospace Alloy"`, `"Zero Carbon Footprint"`, `"Lifetime Craft Warranty"` | `src/constants/sections.ts` (hero_product_showcase) | `["Precision construction", "Verified product dimensions", "Standard manufacturer guidelines"]` |
| `"Maison 2026"` | `src/constants/sections.ts` (hero_minimal) | `"Selected Catalog"` |
| `"Complimentary Express Courier on Orders Over $150"` | `src/constants/sections.ts` (promotional_banner) | `"View Store Updates and Order Guidelines"` |
| `"Limited Time Event"` | `src/constants/sections.ts` (promotional_banner) | `"Store Notice"` |
| `"FSC-certified timber, natural linen, and recycled alloys with full supply-chain traceability"` | `src/constants/sections.ts` (craftsmanship_story) | `"Carefully chosen materials suited to purposeful everyday use."` |
| `"Circular Materiality"`, `"Radical Transparency"`, `"5-year structural warranty"` | `src/constants/sections.ts` (brand_values) | `"Thoughtful Construction"`, `"Direct Collaboration"`, `"Durable Design"` |
| `"B-Corp Certified"`, `"Carbon Neutral Shipping"`, `"30-Day Guarantee"` | `src/constants/sections.ts` (trust_badges) & `InfoSections.tsx` | `"Direct Support"`, `"Detailed Specifications"`, `"Clear Store Policies"`, `"Secure Processing"` |
| `"Do you ship internationally with import duties covered? DDP shipping"` | `src/constants/sections.ts` (faq_accordion) | `"What are your order fulfillment terms?"` with neutral policy response |
| `"Conscious Sourcing & Carbon Balanced"` | `StorefrontView.tsx` | `"Thoughtful Design & Balanced Materials"` |
| `"🔥 HIGH ENERGY COMMERCIAL RELEASE"` | `StorefrontView.tsx` | `"⚡ FEATURED COMMERCIAL CATALOG"` |
| `"PRIVATE SHOWROOM COLLECTION"` | `StorefrontView.tsx` | `"CURATED CATALOG COLLECTION"` |
| `"Curated Visual Artifact • Collection Feature"` | `StorefrontView.tsx` | `"Visual Feature • Collection Overview"` |
| `"Verified Practice Portal"` | `AppointmentWebsiteView.tsx` | `"Practice Directory"` |
| `"VERIFIED SPECIALISTS"` | `AppointmentWebsiteView.tsx` | `"PRACTICE SPECIALISTS"` |
| `"Verified Clients"` | `AppointmentWebsiteView.tsx` | `"Client Consultations"` |
| `"Conscious Care & Holistic Consultation"` | `AppointmentWebsiteView.tsx` | `"Professional Practice & Advisory"` |
| `"(5.0 • Verified Client Feedback)"` | `AppointmentWebsiteView.tsx` | `"(Consultation Feedback)"` |
| `"Verified Client Desk"` | `LeadGenWebsiteView.tsx` | `"Direct Client Desk"` |
| `"Privacy Guarantee"` | `FooterSection.tsx` | `"Privacy Policy"` |
| `"seasonal editorial releases"` | `FooterSection.tsx` & `InfoSections.tsx` | `"store announcements"` |

---

## 3. Merchant Claim Preservation Rules

1. **Merchant-Supplied Claim Priority:** When a merchant explicitly inputs `keyFeatures`, `differentiators`, `shippingPolicy`, or `returnPolicy`, these values are preserved verbatim without truncation or editorial modification.
2. **Missing Feature Neutrality:** When merchant features are absent, the system generates neutral, descriptive copy detailing available services, direct ordering channels, and published guidelines.
3. **No Self-Verification:** Self-declared merchant certifications or credentials are never labeled as `"Verified by [body]"` without third-party proof; unverified entries are attributed as `"Merchant-provided declaration"`.
4. **No Implied Delivery Commitments:** Shipping and dispatch terms are displayed only when supplied via `profile.shippingPolicy`. When absent, neutral copy clarifies that store terms are set directly by the merchant.

---

## 4. Automated Regression Verification

The blacklist and preservation rules are asserted continuously in `tests/phase16-content-generation.test.ts`:
- **Test 17:** Verifies that all 30 section definitions in `ALL_SECTION_DEFINITIONS` are free of prohibited claims (`/handcrafted in limited runs/i`, `/complimentary express delivery/i`, `/new season 2026/i`, `/b-corp certified/i`, `/carbon neutral shipping/i`, `/zero carbon footprint/i`, etc.).
- **Test 18:** Verifies merchant claim preservation across E-Commerce, Appointments, and Lead Gen, and checks neutral fallback behavior when merchant data is unconfigured.
