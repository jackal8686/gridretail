# Phase 16: Generation Engine Architecture

**Project:** GridRetail  
**Date:** 2026-11-22  
**Author:** Antigravity Engineering Agent  
**Phase:** 16 — Context-Aware Website Generation  

---

## 1. Architectural Overview

The Phase 16 Generation Engine transitions GridRetail from a template-instantiation model into a multi-layered, context-aware website generation platform. It synthesizes business profile intelligence, industry semantics, target audience pain points, and brand personality into a fully realized website configuration compatible with GridRetail's 30 registered section definitions and three core website types (`ecommerce`, `appointments`, `lead_gen`).

```
                    ┌───────────────────────────┐
                    │  Merchant Business Profile│
                    │ (Identity, Goal, Audience)│
                    └─────────────┬─────────────┘
                                  │
                                  ▼
                    ┌───────────────────────────┐
                    │  GenerationProvider (API) │
                    └──────┬──────────────┬─────┘
                           │              │
           ┌───────────────┘              └────────────────┐
           ▼                                               ▼
┌──────────────────────────┐                   ┌──────────────────────────┐
│IndustrySectionRecommender│                   │     ContentGenerator     │
├──────────────────────────┤                   ├──────────────────────────┤
│• Template & Theme Match  │                   │• Hero Headline/Copy      │
│• Section Selection (30)  │                   │• Benefits & Values       │
│• Ordering & Filtering    │                   │• Process Steps           │
│• Structured Rationales   │                   │• Context-Aware FAQs      │
└──────────┬───────────────┘                   └───────────┬──────────────┘
           │                                               │
           └───────────────────────┬───────────────────────┘
                                   │
                                   ▼
                    ┌───────────────────────────┐
                    │     GenerationResult      │
                    │(Sections, Design, Copy)   │
                    └──────────────┬────────────┘
                                   │
                                   ▼
                    ┌───────────────────────────┐
                    │ Store Creation & Editor   │
                    │(/stores/[id] VisualEditor)│
                    └───────────────────────────┘
```

---

## 2. Core Engine Components

### 2.1 Provider Abstraction (`src/lib/generation/types.ts` & `provider.ts`)
The `GenerationProvider` interface establishes a provider-agnostic boundary:
```typescript
export interface GenerationProvider {
  id: string;
  name: string;
  isAvailable(): boolean;
  generatePlan(profile: BusinessProfile): Promise<{
    recommendedSections: SectionRecommendation[];
    designSystem: GeneratedDesignSystem;
    summary: GenerationResult["summary"];
  }>;
  generateWebsite(profile: BusinessProfile): Promise<GenerationResult>;
  regenerateSection(
    profile: BusinessProfile,
    sectionType: string,
    existingSection?: SectionInstance
  ): Promise<SectionInstance>;
}
```
GridRetail provides a deterministic, zero-latency **`MockGenerationProvider`** (`mock-provider.ts`) for local development, CI testing, and offline reliability. The design allows external LLM providers (e.g., Google Gemini SDK, Vertex AI) to be injected via `setGenerationProvider()` without altering any UI components, section registries, or data persistence pipelines.

### 2.2 Recommender Subsystem (`src/lib/generation/recommender.ts`)
The `IndustrySectionRecommender` acts as an architectural synthesizer:
1. **Design System Matching:** Maps industry, visual style preferences, and brand personality onto the 8 design templates and 12 color themes.
2. **Section Filtering & Incompatibility Guard:** Ensures sections match the active `websiteType` (e.g., preventing e-commerce shipping/returns policies from loading on legal advisory sites, or catalog grids from loading on clinic appointment sites).
3. **Structured Rationales:** Supplies human-readable explanations for every selected section so the merchant understands *why* each module was chosen.

### 2.3 Content Generator Subsystem (`src/lib/generation/content-generator.ts`)
The `ContentGenerator` converts business identity and audience into tailored, professional copy:
- **Hero Messaging:** Dynamic badges, headline, subheadline, and conversion CTAs tailored to business objectives.
- **Section Copy:** Generates tailored value propositions, step-by-step engagement processes, brand stories, and contextual FAQs.
- **Strict Authenticity Guards:** Never fabricates awards, fictitious testimonials, non-existent team members, or false performance statistics.

---

## 3. Section Compatibility Matrix

| Website Type | Included by Default | Optional Additions | Incompatible / Filtered Out |
|---|---|---|---|
| **E-commerce** | `hero_split` / `hero_full_width`, `benefits_grid`, `featured_products`, `collection_showcase`, `brand_story`, `trust_badges`, `shipping_returns`, `newsletter_signup`, `footer_custom` | `hero_product_showcase`, `bestsellers_grid`, `new_arrivals`, `product_comparison`, `lookbook_gallery` | Appointment calendars, staff practitioner directories |
| **Appointments** | `hero_split` / `hero_cinematic`, `benefits_grid`, `brand_story`, `how_it_works`, `faq_accordion`, `contact_info`, `footer_custom` | `timeline_milestones`, `custom_rich_text` | `shipping_returns`, `product_comparison`, `bestsellers_grid`, `new_arrivals` |
| **Lead Generation** | `hero_split` / `hero_minimal`, `benefits_grid`, `brand_story`, `how_it_works`, `brand_values`, `faq_accordion`, `contact_info`, `footer_custom` | `lifestyle_editorial_grid`, `timeline_milestones`, `trust_badges` | `shipping_returns`, `product_comparison`, `new_arrivals` |

---

## 4. Persistence & Editor Hand-Off

Once a plan is approved by the merchant in the creation workflow:
1. A new `Store` entity is created with `version: 1`, populated with the generated `SectionInstance[]`, `branding`, `styling`, and `businessProfile`.
2. The merchant is redirected directly into `/stores/[id]`, which mounts the Phase 15 Visual Editor.
3. In the Visual Editor, the merchant retains full autonomy: adding, duplicating, editing settings, reordering via drag-and-drop, switching responsive views, and saving via versioned atomic persistence.
