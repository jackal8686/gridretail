# Phase 16: Generation Workflow & UI Architecture Report

**Project:** GridRetail  
**Date:** 2026-11-22  
**Author:** Antigravity Engineering Agent  
**Phase:** 16 — Context-Aware Website Generation  

---

## 1. Executive Summary

This report documents the implementation of GridRetail's **5-Step Context-Aware Store Generation Workflow** in `src/app/stores/new/page.tsx` and its seamless handoff to the Phase 15 Visual Editor (`/stores/[id]/preview`).

The generation workflow replaces static template assignment with an intuitive, guided, and interactive creation funnel. Merchants define their website objective, provide their business identity and audience parameters, choose their brand styling direction, review and adjust an AI-synthesized website plan, and launch directly into the visual customization workspace.

---

## 2. Multi-Step Workflow Breakdown

```
 ┌───────────────┐      ┌───────────────┐      ┌───────────────┐      ┌───────────────┐      ┌───────────────┐
 │    Step 1     │      │    Step 2     │      │    Step 3     │      │    Step 4     │      │    Step 5     │
 │  Objective &  ├─────►│   Business    ├─────►│     Brand     ├─────►│  AI Plan &    ├─────►│   Review &    │
 │ Store Details │      │    Profile    │      │   Direction   │      │   Structure   │      │    Launch     │
 └───────────────┘      └───────────────┘      └───────────────┘      └───────┬───────┘      └───────┬───────┘
                                                                              │                      │
                                                                              ▼                      ▼
                                                                     Interactive Toggles     Visual Editor
                                                                     & Content Preview     (/stores/[id])
```

### Step 1: Website Objective & Store Details
- **Website Objective Selection:**
  - E-Commerce (`ecommerce`): Product catalogs, collections, multi-variant shopping bag, simulated checkout.
  - Appointment Scheduling (`appointments`): Services, practitioners, operating hours, booking calendar.
  - Lead Generation (`lead_gen`): Form builder, multi-step capture funnels, integrated CRM pipeline.
- **Client Account Attribution:** Link store to an existing client record or create a new client account inline via "+ Other" or Quick Add Client.
- **Storefront Name & Local Subdomain Slug:** Real-time DNS slug validation (`http://[slug].localhost:3000`).

### Step 2: Business Profile & Audience Context
- **Industry & Specialization:** Broad industry sector combined with an explicit business specialization input (e.g., "Corporate Governance & Commercial Litigation", "Artisanal Sourdough Bakery", "High-Performance Strength Studio").
- **Target Audience:** Demographic/persona definition (e.g., "In-house general counsel & founders").
- **Customer Needs & Problems:** Comma-separated client pain points guiding benefits copy.
- **Key Differentiators & Value Commitments:** Foundational advantages setting the merchant apart.
- **Business Description & Physical Location:** Contextual narrative background.

### Step 3: Brand Direction & Visual Identity
- **Visual Style Archetype Selector:** 8 distinct style archetypes (`modern_minimal`, `luxury_refined`, `bold_assertive`, `organic_warm`, `tech_futuristic`, `classic_corporate`, `editorial_story`, `playful_vibrant`).
- **Brand Personality:** Archetypal tone chips (`professional`, `innovative`, `artisanal`, `authoritative`, `compassionate`, `playful`, `minimalist`).
- **Design Template Architecture:** Full inspection and selection across the 8 structural design templates.
- **Curated Color Themes & Palettes:** Selection across the 12 accessible color themes with preview swatches and custom hex overrides.
- **Typography & Media Assets:** Font family options and logo/hero banner asset uploads.

### Step 4: AI Context-Aware Generation Plan & Structure
- **Automatic Synthesis:** When advancing to Step 4, the engine synthesizes the business profile into a tailored website plan.
- **Strategy Overview Card:**
  - Audience Focus: Tailored analysis of client demographic.
  - Design Architecture: Rationale for the recommended design template and theme pairing.
  - Conversion Path: Explanation of primary CTA strategy.
- **Recommended Section Hierarchy & Interactive Checklist:**
  - Lists each recommended section with order number, category badge, and human-readable rationale.
  - Checkboxes enable merchants to toggle optional sections on or off prior to generation. Mandatory sections (Hero, Footer) are locked.
- **Content & Messaging Preview:** Live previews of generated Hero Headline, Subheadline, Primary CTA, Core Benefits, and FAQs.
- **Configurable Catalog / Services / Form Modules:** Integrated management for products, appointment consultation services, or lead form templates.

### Step 5: Review Storefront Plan & Launch
- **Comprehensive Parameter Review:** Side-by-side summary cards of business context, design architecture, active module count, and catalog/service metrics.
- **Generate Website & Launch in Visual Editor:** Action button triggers store creation via `POST /api/stores` with `version: 1` and redirects directly to `/stores/${createdStore.id}/preview`.

---

## 3. Visual Polish & Emerald Design System Compliance

The wizard adheres strictly to GridRetail's design system:
- **Color Palette:** Emerald primary (`#176B4D`, `#12533B`), warm paper backdrops (`#FAF9F6`, `#FFFFFF`), muted borders (`#E4E9E5`, `#C8E8D5`), and dark slate typography (`#18231E`, `#4F5D56`).
- **Typography:** Inter sans-serif with clear typographic scales and micro-badges.
- **Micro-Interactions:** Smooth step transitions, animated fade-in notifications, responsive flex/grid wrappers, and accessible keyboard navigation.
