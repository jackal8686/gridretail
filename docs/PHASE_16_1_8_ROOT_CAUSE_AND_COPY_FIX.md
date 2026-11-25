# Phase 16.1.8 — Root Cause Investigation & Cross-Industry Copy Fix

**Repository:** `D:\grid`  
**Phase:** 16.1.8 Final Cross-Industry Copy Consistency Fix  
**Date:** November 22, 2026  
**Status:** COMPLETE & VERIFIED

---

## 1. Executive Summary

During the visual review of the Phase 16 storefronts across viewports, non-e-commerce websites—specifically **Summit Legal Practice** (`appointments`) and **Apex Growth Advisory** (`lead_gen`)—were observed rendering e-commerce-specific copy and product catalog labels:
- `"Featured Collection"`
- `"Curated catalog selections"`
- `"Detailed product specifications"`
- `"Direct merchant ordering"`

This report documents the architectural root-cause investigation, the systemic multi-tier fix applied to the content generation engine, section templates, and section resolver, and the verification proving complete copy separation across all three supported website types (`ecommerce`, `appointments`, and `lead_gen`).

---

## 2. Root Cause Analysis

Investigation traced the leakage of commerce terminology into non-commerce storefronts to three distinct architectural levels:

### A. Level 1: Static Defaults in Section Definitions (`src/constants/sections.ts`)
The `hero_split` section definition in `src/constants/sections.ts` defined hardcoded e-commerce settings:
```ts
hero_split: {
  type: "hero_split",
  category: "hero",
  defaultSettings: {
    badge: "Featured Collection",
    headline: "Purposeful Design for Exceptional Spaces",
    subheadline: "Engineered with precision materials and durable craftsmanship.",
    ctaText: "Shop the Release",
    ctaUrl: "/collections",
    imageUrl: "",
    bulletPoints: [
      "Curated catalog selections",
      "Detailed product specifications",
      "Direct merchant ordering",
    ],
  },
}
```
`getDefaultSectionInstance("hero_split", order)` returned these static e-commerce defaults regardless of whether the target website was an online store, an appointment booking practice, or a B2B lead generation consultancy.

### B. Level 2: Incomplete Overrides in Content Generation (`src/lib/generation/content-generator.ts`)
In `ContentGenerator.generateSectionContent(profile, sectionType, order, existingSection)`:
1. `getDefaultSectionInstance(sectionType, order)` was invoked without website type context.
2. For `hero_split`, `s.bulletPoints` was only populated if the merchant profile explicitly supplied `profile.keyFeatures`:
   ```ts
   if (profile.keyFeatures && profile.keyFeatures.length > 0) {
     s.bulletPoints = profile.keyFeatures.slice(0, 3);
   }
   ```
   When `profile.keyFeatures` was omitted or undefined, `s.bulletPoints` was left untouched, silently preserving the e-commerce defaults (`"Curated catalog selections"`, etc.).
3. `s.badge` fell back to `category` without contextual adaptation for consultation or advisory contexts.
4. `generateBenefits(profile)` had a fallback description:
   `"Catalog and service listings for ${profile.businessCategory || 'client'} offerings."` which leaked the word `"Catalog"` into non-commerce sites.

### C. Level 3: Legacy Section Resolver (`src/lib/sections/resolver.ts`)
When resolving sections for legacy stores or stores using `enabledSections`/`orderedSections` (such as mock stores `str_07` and `str_08`):
1. `case "hero"` instantiated `getDefaultSectionInstance("hero_split", idx)`.
2. It updated `headline`, `subheadline`, `ctaText`, and `ctaUrl`, but **never overrode `badge` or `bulletPoints`**.
3. Consequently, `badge` remained `"Featured Collection"` and `bulletPoints` remained `["Curated catalog selections", "Detailed product specifications", "Direct merchant ordering"]`.

---

## 3. Implemented Fixes

The architectural fix resolves the issue at the source across all three layers rather than applying superficial overrides.

### 1. Context-Aware `getDefaultSectionInstance` (`src/constants/sections.ts`)
Updated `getDefaultSectionInstance` to accept an optional `websiteType?: "ecommerce" | "appointments" | "lead_gen"`:
- **`appointments`**:
  - `badge`: `"Practice Overview"`
  - `headline`: `"Professional Advisory & Strategic Consultation"`
  - `subheadline`: `"Schedule a focused, confidential appointment with our experienced practitioners."`
  - `ctaText`: `"Book Consultation"`
  - `ctaUrl`: `"#booking-section"`
  - `bulletPoints`:
    1. `"Confidential consultation enquiries"`
    2. `"Explore practice areas"`
    3. `"Connect with the practice team"`
- **`lead_gen`**:
  - `badge`: `"Growth Advisory"`
  - `headline`: `"Strategic Solutions & Dedicated Advisory"`
  - `subheadline`: `"Submit your inquiry to receive a tailored proposal and strategic consultation from our team."`
  - `ctaText`: `"Request Consultation"`
  - `ctaUrl`: `"#inquiry-form"`
  - `bulletPoints`:
    1. `"Discuss your business goals"`
    2. `"Explore advisory services"`
    3. `"Request an initial assessment"`
- **`ecommerce` (or unspecified)**:
  - Preserves standard catalog defaults (`"Featured Collection"`, catalog bullet points, `/collections` link).

### 2. Context-Aware Content Generator (`src/lib/generation/content-generator.ts`)
1. **Passes Website Type to Base Instance:**
   `getDefaultSectionInstance(sectionType, order, profile.websiteType)`
2. **Added `generateHeroBadge(profile)`:**
   - Honors explicit merchant `profile.badge` when supplied.
   - For `appointments`: detects legal (`"Legal Consultation Services"`), healthcare (`"Clinical Appointments"`), fitness (`"Training & Sessions"`), or defaults to `"Practice Overview"`.
   - For `lead_gen`: detects growth/strategy (`"Growth Advisory"`), tech (`"Enterprise Solutions"`), or defaults to `"Advisory Services"`.
   - For `ecommerce`: formats brand personality or defaults to `"Featured Collection"`.
3. **Added `generateHeroBullets(profile)`:**
   - Preserves merchant-provided `profile.keyFeatures` verbatim when present.
   - For `appointments`: generates consultation-oriented bullets (`"Confidential consultation enquiries"`, `"Connect with the legal team"`, `"Explore practice areas"`).
   - For `lead_gen`: generates advisory-oriented bullets (`"Discuss your business goals"`, `"Explore advisory services"`, `"Request an initial assessment"`).
   - For `ecommerce`: generates product catalog bullets (`"Curated catalog selections"`, etc.).
4. **Context-Aware Hero Minimal, Benefits Grid & Brand Story:**
   - `benefits_grid`: adapts subtitle from `"Service overview and catalog features"` to `"Service overview and consultation details"` (`appointments`) or `"Advisory overview and engagement details"` (`lead_gen`).
   - `brand_story`: replaces `"catalog options"` with `"dedicated appointments"` or `"strategic advisory"` when `profile.websiteType !== "ecommerce"`.
   - `generateBenefits`: adapts generic fallback description based on `profile.websiteType`.

### 3. Cross-Industry Section Resolution (`src/lib/sections/resolver.ts`)
1. **Configured Stores (`store.sections`):**
   - Automatically detects and replaces leaked e-commerce defaults (`"Featured Collection"`, catalog bullets) for `appointments` and `lead_gen` with type-appropriate defaults.
2. **Legacy Stores (`case "hero"`):**
   - Passes `store.websiteType` to `getDefaultSectionInstance`.
   - Explicitly populates `badge` and `bulletPoints` with type-aware content.
   - Defaults `ctaText` to `"Book Consultation"` (`appointments`), `"Request Consultation"` (`lead_gen`), or `"Explore Catalog"` (`ecommerce`), while honoring explicit merchant `branding.ctaText`.

### 4. Mock Store Configuration (`src/mock/stores.ts`)
Enhanced mock stores with explicit branding:
- **`str_07` (Summit Legal Practice):**
  - `badge`: `"Legal Consultation Services"`
  - `heroHeadline`: `"Bespoke Counsel for Global Enterprises"`
  - `ctaText`: `"Book Strategy Session"`
  - `bulletPoints`: `["Confidential consultation enquiries", "Connect with the legal team", "Explore practice areas"]`
- **`str_08` (Apex Growth Advisory):**
  - `badge`: `"Growth Advisory"`
  - `heroHeadline`: `"Scale Your Enterprise Revenue Pipeline"`
  - `ctaText`: `"Request Growth Assessment"`
  - `bulletPoints`: `["Discuss your business goals", "Explore advisory services", "Request an initial assessment"]`

---

## 4. Before vs After Comparison Matrix

| Website Type / Store | Field | Before (Phase 16.1.7) | After (Phase 16.1.8 Fix) | Verification Status |
|---|---|---|---|---|
| **Appointment Scheduling**<br>*(Summit Legal)* | **Eyebrow / Badge** | `"Featured Collection"` *(leaked)* | `"Legal Consultation Services"` | PASS |
| | **Bullet 1** | `"Curated catalog selections"` *(leaked)* | `"Confidential consultation enquiries"` | PASS |
| | **Bullet 2** | `"Detailed product specifications"` *(leaked)* | `"Connect with the legal team"` | PASS |
| | **Bullet 3** | `"Direct merchant ordering"` *(leaked)* | `"Explore practice areas"` | PASS |
| | **Primary CTA** | `"Explore Catalog"` / `"Shop the Release"` | `"Book Strategy Session"` | PASS |
| | **CTA URL** | `"/collections"` *(leaked)* | `"#booking-section"` | PASS |
| **Lead Generation**<br>*(Apex Growth)* | **Eyebrow / Badge** | `"Featured Collection"` *(leaked)* | `"Growth Advisory"` | PASS |
| | **Bullet 1** | `"Curated catalog selections"` *(leaked)* | `"Discuss your business goals"` | PASS |
| | **Bullet 2** | `"Detailed product specifications"` *(leaked)* | `"Explore advisory services"` | PASS |
| | **Bullet 3** | `"Direct merchant ordering"` *(leaked)* | `"Request an initial assessment"` | PASS |
| | **Primary CTA** | `"Explore Catalog"` / `"Shop the Release"` | `"Request Growth Assessment"` | PASS |
| | **CTA URL** | `"/collections"` *(leaked)* | `"#inquiry-form"` | PASS |
| **E-Commerce**<br>*(Aura Minimalist)* | **Eyebrow / Badge** | `"Featured Collection"` | `"Featured Collection"` | PASS (Preserved) |
| | **Bullet Points** | Catalog specifications | Catalog specifications | PASS (Preserved) |
| | **Primary CTA** | `"Explore Catalog"` | `"Explore Catalog"` | PASS (Preserved) |
| | **CTA URL** | `"#catalog"` | `"#catalog"` | PASS (Preserved) |

---

## 5. Architectural Non-Regression Verification

1. **New Stores & Generators:** Any newly created store using `MockGenerationProvider.generateWebsite(profile)` or `ContentGenerator.generateSectionContent(profile, type)` automatically produces website-type-aware copy.
2. **Custom Content Preservation:** When a merchant supplies explicit `keyFeatures`, `differentiators`, or `badge`, those values take strict precedence over generated fallbacks.
3. **No Database Schema Migrations:** All changes remain fully backward-compatible with the existing `Store`, `StoreBranding`, and `SectionInstance` models.
4. **Quality Gates Passed:**
   - `npm run type-check`: 0 errors
   - `npm run lint`: 0 warnings, 0 errors
   - `npm test`: 450 passing, 0 failing across 55 test files
   - `npm run build`: 27/27 static pages generated successfully
