# Phase 16: Existing Architecture Audit

**Project:** GridRetail  
**Date:** 2026-11-22  
**Auditor:** Antigravity Engineering Agent  
**Phase:** 16 — Context-Aware Website Generation  

---

## 1. Executive Summary

This pre-implementation architecture audit reviews GridRetail's existing codebase in preparation for **Phase 16: Context-Aware Website Generation**. GridRetail currently operates as a multi-tenant website generation platform supporting three primary website types: **E-commerce**, **Appointment Scheduling**, and **Lead Generation**. 

Historically, website generation relied on static template selection, hardcoded default section lists (`resolveStoreSections`), and generic fallback copy. While Phase 14 and Phase 15 established an extensive design system (8 design templates, 12 color themes, 10 hero variations, and 30 section definitions) and an advanced three-panel Visual Editor with versioned persistence and undo/redo, the initial generation pipeline remained template-bound rather than business-context-driven.

Phase 16 transforms this foundation into a **context-aware generation engine**. This audit maps out all relevant subsystems, validates extension points, and establishes architectural constraints to guarantee that existing capabilities, visual editors, security protections, and test isolation remain 100% intact.

---

## 2. Core Architectural Subsystems Inspected

### 2.1 Store Creation Pipeline (`src/app/stores/new/page.tsx` & `src/app/api/stores/route.ts`)
- **Current Workflow:**
  - `src/app/stores/new/page.tsx` features a multi-step modal/wizard where the merchant enters a Store Name, Slug, Client, and Industry, selects a Website Type (`ecommerce`, `appointments`, `lead_gen`), and configures industry-specific items (products for e-commerce, preset services/providers for appointments, lead form starter templates for lead generation).
  - The wizard posts to `POST /api/stores`.
  - `POST /api/stores` validates inputs via `validateStoreInput(body)`, checks slug uniqueness and client/template existence, seeds initial catalog/services/providers, and synthesizes `branding`, `enabledSections`, `orderedSections`, and `sections`.
- **Identified Gap for Context-Aware Generation:**
  - Copy generation currently defaults to static strings such as `Welcome to ${name}`, `Professional Advisory & Strategic Consultation`, or `Curated ${industry} catalog`.
  - Section sets are fixed per website type:
    - Appointments: `["hero", "benefits_grid", "about", "faq_accordion", "footer"]`
    - Lead Gen: `["hero", "benefits_grid", "about", "how_it_works", "faq_accordion", "footer"]`
    - E-commerce: `["hero", "featured_products", "about", "newsletter", "footer"]`
  - There is no structured collection of target audience, business goals, differentiators, tone of voice, or specific category nuances (e.g., differentiating a criminal defense law firm from a sushi restaurant or a boutique clothing label).

### 2.2 Section Registry & Layout System (`src/constants/sections.ts`, `src/types/section.ts`, `src/lib/sections/resolver.ts`)
- **Inventory:** 30 registered section definitions organized into categories:
  - **Hero & Promotional (7):** `hero_full_width`, `hero_split`, `hero_product_showcase`, `hero_minimal`, `hero_cinematic`, `promotional_banner`, `multi_slide_carousel`.
  - **Products & Collections (6):** `featured_products`, `bestsellers_grid`, `new_arrivals`, `collection_showcase`, `product_comparison`, `product_discovery_cta`.
  - **Brand & Editorial (6):** `brand_story`, `craftsmanship_process`, `lifestyle_editorial_grid`, `lookbook_gallery`, `brand_values`, `timeline_milestones`.
  - **Information & Conversion (11):** `benefits_grid`, `how_it_works`, `faq_accordion`, `shipping_returns`, `contact_info`, `newsletter_signup`, `announcement_strip`, `trust_badges`, `verified_statistics_bar`, `custom_rich_text`, `footer_custom`.
- **Resolution Logic (`resolveStoreSections`):**
  - If a store possesses an explicit array of `SectionInstance[]`, it normalizes hero/promotional sections with active branding overrides (`bannerUrl`, `headline`, `subheadline`, `ctaText`).
  - If only legacy Phase 1-9 arrays exist (`orderedSections`), it synthesizes equivalent `SectionInstance` objects with stable IDs (`sec_legacy_${slug}_${type}_${idx}`).
- **Key Requirement for Phase 16:**
  - Context-aware generation must strictly recommend and generate instances conforming to these 30 registered `SectionType` identifiers. No unknown section types may be emitted, preventing renderer breakage.

### 2.3 Website Type Adapters
GridRetail supports three distinct storefront views rendering in both preview/customizer iframe mode and live public mode:
1. **E-commerce (`src/components/storefront/StorefrontView.tsx`):**
   - Renders hero, catalog grid with category filters, dynamic product sections, cart drawer, and simulated checkout modal.
2. **Appointment Scheduling (`src/components/storefront/AppointmentWebsiteView.tsx`):**
   - Renders service cards, staff provider bios, interactive appointment booking calendar, weekly availability slots, and booking cancellation modal.
3. **Lead Generation (`src/components/storefront/LeadGenWebsiteView.tsx`):**
   - Renders conversion hero, trust indicators, interactive custom lead capture form with multi-step support, inquiry modal, and CRM lead capture.
- **Architectural Preservation:**
  - No 4th website type should be added. The generation engine must map any business (e.g., Law Firm -> Lead Gen, Restaurant -> Lead Gen / Booking, Fitness Studio -> Appointments, Fashion Store -> E-commerce) cleanly onto one of these three battle-tested adapters.

### 2.4 Design Templates & Color Themes
- **8 Design Templates (`src/constants/design-templates.ts`):**
  - `tmpl_modern_minimal`, `tmpl_luxury_editorial`, `tmpl_bold_vibrant`, `tmpl_classic_commerce`, `tmpl_editorial_magazine`, `tmpl_organic_natural`, `tmpl_tech_futuristic`, `tmpl_playful_creative`.
- **12 Color Themes (`src/constants/themes.ts`):**
  - `theme_nordic_pine`, `theme_obsidian_slate`, `theme_monochrome_ink`, `theme_terracotta_dune`, `theme_electric_indigo`, `theme_sandstone_warm`, `theme_emerald_prestige`, `theme_cyber_punk`, `theme_rose_quartz`, `theme_ocean_depths`, `theme_sunset_amber`, `theme_botanical_sage`.
- **Styling Tokens (`StoreStylingTokens`):**
  - Granular control over `buttonRadius`, `cardStyle`, `contentWidth`, `spacingDensity`, `typographyHeadingFont`, `typographyBodyFont`, `formStyle`, `shadowScale`, `colorMode`, `heroVariation`, `headerVariation`, `footerVariation`, `cardVariation`, `typographyScale`.
- **Phase 16 Opportunity:**
  - Instead of forcing the merchant to guess the best template and theme, the generation engine can analyze business industry, personality, and audience to propose optimal combinations (e.g., Law Firm -> Luxury Editorial or Modern Minimal + Monochrome Ink or Emerald Prestige; Organic Skincare -> Organic Natural + Botanical Sage; Tech Startup -> Tech Futuristic + Obsidian Slate).

### 2.5 Phase 15 Visual Editor & Persistence Architecture
- **Visual Editor (`src/components/editor/VisualEditor.tsx`):**
  - Three-panel editor: Left section drawer (add/reorder/hide/duplicate/delete), Center live preview with responsive viewport switching (Desktop, Tablet, Mobile), Right property inspector for active section fields and store branding/styling tokens.
  - History engine (`useEditorHistory.ts`): 30-snapshot undo/redo buffer, 2.5s debounced autosave, dirty state tracking.
- **Persistence (`src/lib/repositories/store.repository.ts`):**
  - Exclusive FIFO per-store mutex (`withStoreLock`) prevents race conditions.
  - Versioned Write Policy: `EDITOR_MANAGED_FIELDS` (`name`, `description`, `branding`, `styling`, `sections`, `enabledSections`, `orderedSections`, `themeId`, `themeName`, `templateId`, `templateName`, `slug`).
  - Optimistic locking: Updates specifying a `version` are checked atomically (`incoming.version === existing.version + 1`). Unversioned updates targeting versioned stores return HTTP 409 Conflict.
- **Tenant Isolation (`src/lib/auth/permissions.ts`):**
  - Test runner is strictly confined to registered test fixtures (`TEST_RUNNER_FIXTURE_STORE_IDS`). Production test runner execution is permanently denied.
- **Phase 16 Persistence Contract:**
  - Generated stores must be initialized with `version: 1` upon initial creation.
  - Subsequent updates from the generation workflow or visual editor must respect the atomic version counter.
  - The business profile must be persisted as part of the store entity (`businessProfile?: BusinessProfile`).

### 2.6 AI Integration Strategy & Provider Abstraction
- **Current State:**
  - No active external LLM SDK or AI client is configured in production runtime. The app currently runs entirely on deterministic TypeScript logic and JSON fallbacks.
- **Phase 16 Architecture:**
  - Implement a clean AI provider abstraction interface (`GenerationProvider` in `src/lib/generation/types.ts`).
  - Provide a production-grade, highly sophisticated, deterministic **`MockGenerationProvider`** that analyzes business category, target audience, brand tone, and website type to produce rich, tailored, and safe content.
  - Structure the engine so an external provider (e.g., Gemini API, Vertex AI) can be plugged in seamlessly via configuration without altering core business logic or UI components.
  - Implement strict Zod/schema validation on all generation engine outputs before saving or rendering.

---

## 3. Architecture Constraints & Non-Negotiables

| Constraint | Enforcement Mechanism |
|---|---|
| **No 4th Website Type** | All business scenarios must map to `ecommerce`, `appointments`, or `lead_gen`. |
| **No Fabricated Facts** | Zero fabricated testimonials, prices, certifications, awards, or legal credentials. Use neutral copy or marked placeholders. |
| **No Unversioned Write Bypass** | Store persistence must route through `StoreRepository.update` with version incrementing. |
| **Preserve Phase 15 Editor** | Generated stores must load seamlessly into `/stores/[id]` with full section tree, inspectability, undo/redo, and responsive preview. |
| **Preserve Test Suite** | All 405 existing unit/integration tests across 34 suites must remain green. |
| **Zero Overwrite of Manual Edits** | Regeneration must require explicit merchant confirmation and support section-level granularity. |

---

## 4. Conclusion & Next Steps

GridRetail's existing architecture is robust, highly modular, and well-suited for context-aware generation. The clean separation between the section registry, layout components, design tokens, and the Visual Editor allows us to introduce the Business Profile and Generation Engine without rewriting or jeopardizing existing functionality.

We can proceed immediately to **Step 2: Business Profile Data Model & Validation**.
