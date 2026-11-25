# GridRetail — Visual Design System, Layout Engine & Customizer Root-Cause Audit

**Document Code:** `VISUAL_DESIGN_ROOT_CAUSE_AUDIT`  
**Scope:** Deep Diagnosis of Layout, Theme, Section, Context & Styling Failures across E-Commerce, Appointment Scheduling, and Lead Generation Websites  
**Status:** Audit Complete & Verified  
**Date:** October 24, 2026  
**Auditor:** Senior Full-Stack Engineer, Frontend Architect, Design Systems Engineer & Security Reviewer  

---

## 1. Executive Summary

GridRetail supports three distinct website types:
1. **E-Commerce Websites** (`websiteType === "ecommerce"`)
2. **Appointment Scheduling Websites** (`websiteType === "appointments"`)
3. **Lead Generation Websites** (`websiteType === "lead_gen"`)

A systematic architectural inspection across the configuration pipeline, customizer drawer, live `postMessage` synchronization, storefront renderers, modular section system, and database persistence revealed that although controls exist in the customizer, several critical failure modes prevent changes from consistently updating the rendered websites.

This audit details the root causes discovered, affected files, architectural remedies, and regression risks.

---

## 2. Root Cause Findings by Subsystem

### 2.1 Lead Generation Website Renderer Disconnected from Live Customizer (`LeadGenWebsiteView.tsx`)
- **Affected Files:**
  - `src/components/storefront/LeadGenWebsiteView.tsx`
  - `src/app/store/[slug]/page.tsx`
- **Actual Root Cause:**
  - `LeadGenWebsiteView.tsx` completely lacked a `postMessage` event listener for `GRIDRETAIL_PREVIEW_UPDATE` and never emitted `GRIDRETAIL_PREVIEW_READY`.
  - It maintained no reactive state hooks for `activeThemeId`, `activeTemplateId`, `branding`, `sections`, or `styling`.
  - Any edits in the customizer (changing themes, layouts, branding, hero images, or sections) broadcast messages over `postMessage`, but `LeadGenWebsiteView` silently ignored them. The preview was completely frozen.
  - The renderer used hardcoded Tailwind classes (`bg-[#176B4D]`, `bg-[#FAF9F6]`, `border-[#E4E9E5]`, `text-[#18231E]`) rather than reading theme tokens from the active theme or CSS variables.
  - It had no layout adaptation for headers, heroes, or form containers, and rendered a hardcoded footer.
- **Architectural Remedy:**
  - Implement bidirectional `postMessage` protocol (`GRIDRETAIL_PREVIEW_READY`, `GRIDRETAIL_PREVIEW_UPDATE`, `GRIDRETAIL_PREVIEW_ACK`) with reactive state.
  - Adapt header, hero, inquiry form container, and footer to the active design template layout family.
  - Apply dynamic theme tokens (`tokens.primary`, `tokens.background`, `tokens.surface`, `tokens.border`, etc.) and CSS custom properties.

### 2.2 Appointment Websites Hardcode Section Flow and Ignore Modular Sequencing (`AppointmentWebsiteView.tsx`)
- **Affected Files:**
  - `src/components/storefront/AppointmentWebsiteView.tsx`
- **Actual Root Cause:**
  - While `AppointmentWebsiteView.tsx` listened for `GRIDRETAIL_PREVIEW_UPDATE`, its section rendering pipeline was hardcoded into a monolithic sequence: Header &rarr; Hero &rarr; Booking Flow &rarr; Filtered Modular Sections &rarr; Client Portal &rarr; Footer.
  - `<SectionRenderer />` was only invoked for leftover non-hero, non-footer, non-product sections at the very bottom (lines 2591 and 3157).
  - The sequence in `orderedSections` and visibility in `enabledSections` had zero effect on the main booking, hero, or portal components. Moving or hiding sections in the Section Manager did not alter the page structure.
- **Architectural Remedy:**
  - Decouple the appointment storefront into modular section types (`appointment_booking`, `appointment_services`, `practitioner_roster`, `client_portal_lookup`) that respect `orderedSections` and `enabledSections`.
  - Ensure custom sections (FAQ, Trust Badges, Brand Story, Benefits Grid) can be reordered anywhere in the page flow relative to the booking sections.

### 2.3 E-Commerce Storefront Renders Generic Sections and Bypasses Template Layouts (`StorefrontView.tsx` & `SectionRenderer.tsx`)
- **Affected Files:**
  - `src/components/storefront/StorefrontView.tsx`
  - `src/components/storefront/sections/SectionRenderer.tsx`
  - `src/components/storefront/sections/HeroSections.tsx`
  - `src/components/storefront/sections/ProductSections.tsx`
- **Actual Root Cause:**
  - `StorefrontView.tsx` contained 8 dedicated implementations of `renderHero()` and `renderProductCard()`, but lines 2055-2078 always preferred `sections.map(sec => <SectionRenderer ... />)`.
  - Because `resolveStoreSections()` synthesizes default section instances for every store, `sections.length` is always > 0. The customizer therefore always rendered through `SectionRenderer`.
  - `SectionRendererProps` did not accept `templateId` or `activeDesignTemplate`.
  - `HeroSections.tsx` and `ProductSections.tsx` ignored the selected design template's `heroLayout` and `cardLayout`.
  - Switching layout templates in the customizer only changed the `<header>`. The hero and product grid retained identical visual structures across all 8 templates.
- **Architectural Remedy:**
  - Pass `activeDesignTemplate` and `activeTheme` through `SectionRenderer` into `HeroSections` and `ProductSections`.
  - Update `HeroSections` and `ProductSections` to render the 8 distinct architectural layouts corresponding to `headerLayout`, `heroLayout`, and `cardLayout`.

### 2.4 Section Resolver Lacks Lead Generation Support (`src/lib/sections/resolver.ts`)
- **Affected Files:**
  - `src/lib/sections/resolver.ts`
- **Actual Root Cause:**
  - `resolveStoreSections()` only branched for `websiteType === "appointments"`.
  - For `websiteType === "lead_gen"`, it defaulted to e-commerce: synthesizing `featured_products`, setting `ctaText: "Explore Catalog"`, and pointing `ctaUrl` to `"#catalog"`.
  - No default lead generation sections (`lead_form_section`, `service_benefits`, `consultation_process`, `trust_certifications`, `faq_accordion`) existed in the resolver.
- **Architectural Remedy:**
  - Add first-class `websiteType === "lead_gen"` handling in `resolveStoreSections()`.
  - Synthesize lead-capture hero, interactive form container, benefits grid, client proof, and contact sections.

### 2.5 Customizer Default Fallbacks and State Overwrites (`/stores/[id]/preview/page.tsx`)
- **Affected Files:**
  - `src/app/stores/[id]/preview/page.tsx`
- **Actual Root Cause:**
  - In `src/app/stores/[id]/preview/page.tsx`, `heroHeadline`, `heroSubheadline`, `ctaText`, `enabledSections`, and `orderedSections` checked for `"appointments"` and otherwise used e-commerce strings. For lead generation stores, this populated `"Explore Catalog"` and `"Curated collection..."`.
  - When switching `templateId`, `sections` remained locked to whatever section layout variants were originally synthesized. Switching from "Modern Minimal" to "Bold & Vibrant" did not adapt section layout variants.
  - The customizer lacked an Undo/Redo history stack and lacked a "Reset Design to Template Defaults" mechanism.
- **Architectural Remedy:**
  - Implement website-type-aware defaults across all state initialization.
  - When switching design templates, intelligently adapt compatible section layout variants.
  - Provide Undo/Redo capability and template reset controls.

### 2.6 Lack of Root CSS Custom Properties & Hardcoded Color Clashes
- **Affected Files:**
  - `src/app/globals.css`
  - All storefront section components
- **Actual Root Cause:**
  - Tokens were only applied via inline `style={{ backgroundColor: tokens.surface }}` on top-level section containers.
  - Child elements, form fields, badges, and modal dialogs used static Tailwind utility classes (`bg-white`, `border-stone-200`, `text-[#18231E]`).
  - Selecting dark themes (such as `theme_obsidian_slate` or `theme_monochrome_ink`) caused severe contrast clashes, unreadable text, or stark white form blocks.
- **Architectural Remedy:**
  - Inject CSS custom properties (`--theme-primary`, `--theme-secondary`, `--theme-accent`, `--theme-background`, `--theme-surface`, `--theme-text`, `--theme-text-muted`, `--theme-border`, `--theme-card-bg`, `--theme-badge-bg`, `--theme-badge-text`, `--theme-button-radius`, `--theme-card-radius`) on the root container of every storefront view and preview iframe.
  - Standardize components to consume these CSS custom properties.

---

## 3. Risk Assessment & Non-Regression Strategy

| Risk Area | Potential Failure Mode | Prevention Strategy |
| :--- | :--- | :--- |
| **Existing E-Commerce Stores** | Changing `SectionRenderer` breaks existing PDP, cart drawer, or catalog filters. | Preserve all existing section types and props; enhance layout variant resolution without removing existing handlers. |
| **Existing Appointment Stores** | Reordering sections breaks slot-locking concurrency or booking calendar. | Maintain all booking state machines, APIs, and slot mutex logic; only make the visual presentation modular. |
| **Existing Lead Generation Stores** | Dynamic sync breaks published form snapshots or submission API. | Strictly preserve `publishedSteps` and submission endpoints (`/api/public/stores/[slug]/forms/[formId]/submit`); update only visual rendering and live preview sync. |
| **Database Persistence** | Adding new styling tokens invalidates existing saved stores in MongoDB. | Ensure all new fields on `StoreStylingTokens` are optional with safe fallback defaults in `src/types/store.ts`. |
| **Automated Test Regressions** | Modified theme or template constants fail existing unit tests. | Maintain all 12 theme IDs in `COLOR_THEMES` and all 8 template IDs in `DESIGN_TEMPLATES`, keeping exact ID contracts while expanding capabilities. |
