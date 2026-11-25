# Phase 16: Business Profile & Data Model Architecture

**Project:** GridRetail  
**Date:** 2026-11-22  
**Author:** Antigravity Engineering Agent  
**Phase:** 16 — Context-Aware Website Generation  

---

## 1. Executive Summary

This document specifies the data model, validation architecture, and persistence strategy for GridRetail's **Business Profile**. In Phase 16, website generation shifts from arbitrary template assignment to context-driven generation grounded in a structured, multi-dimensional merchant profile.

The data model captures the essential nuances of a business—its operational category, target audience, key differentiators, communication style, brand personality, and verified content—without overwhelming the merchant with mandatory fields.

---

## 2. Business Profile Schema & Structure

The profile is formally defined in `src/types/business-profile.ts` and integrated into `Store` and `CreateStoreInput` (`src/types/store.ts`).

```typescript
export interface BusinessProfile {
  // A. Business Identity
  businessName: string;
  industry: IndustryType | string;
  businessCategory: string; // e.g., "Corporate & Commercial Law", "Artisanal Bakery", "Pilates Studio"
  description: string;
  location?: string;
  language?: string;

  // B. Target Audience
  primaryAudience?: string; // e.g., "In-house general counsel & founders"
  customerNeeds?: string[]; // e.g., ["Fast risk assessment", "Regulatory compliance"]
  targetMarket?: "local" | "regional" | "national" | "global";
  communicationStyle?: CommunicationStyle;

  // C. Products & Services
  offerings?: BusinessOffering[];
  keyFeatures?: string[];
  differentiators?: string[];

  // D. Website Objective
  websiteType: WebsiteType; // "ecommerce" | "appointments" | "lead_gen"
  appointmentIndustry?: AppointmentIndustry;
  primaryGoal?: "sell_products" | "book_appointments" | "generate_leads" | "brand_profile";

  // E. Brand Identity
  visualStyle?: VisualStylePreference;
  primaryColor?: string;
  secondaryColor?: string;
  brandPersonality?: BrandPersonality;
  typographyPreference?: TypographyPreference;
  brandVoice?: string;
  logoUrl?: string;
  bannerUrl?: string;

  // F. Required Content & Verified Information
  aboutStory?: string;
  contactInfo?: BusinessContactDetails;
  faqs?: BusinessFaqItem[];
  testimonials?: GenuineTestimonial[];
  teamMembers?: GenuineTeamMember[];

  // G. Generation Metadata
  generationMetadata?: {
    generatedAt: string;
    engineVersion: string;
    provider: string;
    promptFingerprint?: string;
    isRegenerated?: boolean;
    lastRegeneratedSection?: string;
  };
}
```

---

## 3. Detailed Dimension Breakdown

### A. Business Identity
- **`businessName`** *(required, 2-100 chars)*: Official trading name.
- **`industry`** *(required)*: Broad industry classification (e.g., "Health & Wellness", "Fashion & Apparel", "Legal Practice & Advisory").
- **`businessCategory`** *(required, default fallback to industry)*: Specific specialization (e.g., "Criminal Defense & White Collar Litigation", "Cold-Pressed Botanical Skincare").
- **`description`** *(optional, up to 2000 chars)*: Merchant-provided operational summary.
- **`location`** *(optional)*: Physical operating city/region.
- **`language`** *(optional, defaults to "en")*: Primary site copy locale.

### B. Target Audience
- **`primaryAudience`**: Demographic or persona definition.
- **`customerNeeds`**: Array of core pain points or desires addressed by the business.
- **`targetMarket`**: Geographic scope (`local`, `regional`, `national`, `global`).
- **`communicationStyle`**: Voice register (`authoritative`, `approachable`, `luxurious`, `technical`, `creative`, `compassionate`).

### C. Products and Services
- **`offerings`**: Array of structured items (`name`, `description`, optional `price`, `isKeyDifferentiator`, `category`).
- **`keyFeatures`**: Tangible deliverables or methodology traits.
- **`differentiators`**: Clear competitive advantages provided by the merchant.

### D. Website Objective
- **`websiteType`**: Strictly constrained to GridRetail's three supported engines (`ecommerce`, `appointments`, `lead_gen`). No fourth type is created, preserving core routing, cart, booking calendar, and CRM workflows.
- **`primaryGoal`**: Commercial objective guiding CTA placement and conversion section priority.

### E. Brand Identity
- **`visualStyle`**: Aesthetic archetype (`modern_minimal`, `luxury_refined`, `bold_assertive`, `organic_warm`, `tech_futuristic`, `classic_corporate`, `editorial_story`, `playful_vibrant`).
- **`primaryColor` / `secondaryColor`**: Validated 6-character or 3-character hex color codes.
- **`brandPersonality`**: Brand archetype (`professional`, `innovative`, `artisanal`, `authoritative`, `compassionate`, `playful`, `minimalist`).
- **`typographyPreference`**: Font pairing category (`clean_sans`, `editorial_serif`, `technical_mono`, `humanist_sans`).

### F. Required Content & Verified Information
- **Content Authenticity Gate:** Genuine testimonials and team members must only be stored if provided by the merchant. If omitted, the generation engine outputs neutral editorial value propositions and does **not** hallucinate fake reviews or fictitious staff.
- **`contactInfo`**: Physical address, verified business phone, support email, and operating hours.

---

## 4. Server-Side Validation & Sanitization

Validation is implemented in `src/lib/validation/business-profile.ts`:
1. **Type Safety & Type Guards:** Strict parsing guards against prototype pollution, malformed arrays, and non-object inputs.
2. **Defensive Defaults:** If non-critical fields (e.g., `communicationStyle`, `brandPersonality`) contain invalid strings, they are sanitized to safe fallbacks or set to `undefined` rather than rejecting the creation request.
3. **Hex Code Sanitization:** Strict regex enforcement (`/^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/`).
4. **Integration with Store Validation:** `validateStoreInput()` in `src/lib/validation/store.ts` automatically runs `validateBusinessProfile()` if `businessProfile` is present in the request payload.

---

## 5. Persistence, Concurrency & Tenant Isolation

1. **Entity Attachment:** The sanitized profile is stored directly on the `Store` object in MongoDB and in-memory test fallbacks.
2. **Atomic Versioned Writes:** `businessProfile` is registered in `EDITOR_MANAGED_FIELDS` in `src/lib/repositories/store.repository.ts`. Any update modifying the business profile requires a valid incremented version number (`version: existing.version + 1`) under `withStoreLock`.
3. **Tenant Boundaries:** Access to view or update a store's business profile is strictly governed by the authenticated user's session or tenant ownership (`permissions.ts`), ensuring test isolation and merchant data separation.

---

## 6. Verification Status

- Types exported: `src/types/business-profile.ts`
- Validator implemented: `src/lib/validation/business-profile.ts`
- Store model updated: `src/types/store.ts`
- Repository updated: `src/lib/repositories/store.repository.ts`
- API creation route updated: `src/app/api/stores/route.ts`
