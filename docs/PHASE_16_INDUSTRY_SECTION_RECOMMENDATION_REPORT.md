# Phase 16: Industry Section Recommendation Report

**Project:** GridRetail  
**Date:** 2026-11-22  
**Author:** Antigravity Engineering Agent  
**Phase:** 16 — Context-Aware Website Generation  

---

## 1. Executive Summary

This report analyzes how GridRetail's **Industry Section Recommender** (`src/lib/generation/recommender.ts`) dynamically configures website structures, design templates, color themes, and section selections across diverse commercial domains. 

The recommender evaluates the merchant's business category, operational scope, primary goal, target audience, and brand personality, producing a tailored composition of sections selected exclusively from GridRetail's 30 registered section definitions.

---

## 2. Business Scenario Deep-Dives

### Scenario 1: Restaurant (Culinary & Dining)
- **Business Profile:**
  - *Name:* "Osteria Valenza"
  - *Industry:* "Food & Gourmet"
  - *Business Category:* "Italian Fine Dining & Enogastronomy"
  - *Website Type:* `lead_gen` (or booking consultation)
  - *Audience:* "Epicureans, local patrons, and private celebration planners"
  - *Primary Goal:* "generate_leads" (Table reservations & private event inquiries)
- **Recommended Configuration:**
  - **Design Template:** `tmpl_editorial_magazine` (Cover-story masthead, warm narrative layout)
  - **Color Theme:** `theme_terracotta_dune` (Earthy clay, warm alabaster, culinary warmth)
  - **Styling Tokens:** `buttonRadius: "rounded"`, `cardStyle: "bordered"`, `spacingDensity: "spacious"`
  - **Primary CTA:** "Reserve a Table" -> `#inquiry-form`
- **Recommended Section Sequence & Rationale:**
  1. `hero_cinematic`: Atmospheric full-width hero showcasing dining room ambience and signature seasonal dishes.
  2. `benefits_grid`: 3-pillar culinary commitment (Farm-to-Table Provenance, Artisanal Scratch Pasta, Natural Wine Pairings).
  3. `lifestyle_editorial_grid`: Photo gallery highlighting kitchen craft, plated preparations, and private dining salon.
  4. `brand_story`: Narrative detailing executive chef philosophy and regional ingredient sourcing.
  5. `how_it_works`: Reservation policy, dining timeline, and private event arrangement details.
  6. `contact_info`: Exact street address, operating dinner hours, parking guidance, and sommelier desk phone.
  7. `footer_custom`: Multi-column footer with reservations contact and directions.
- **Content Safety Enforcement:** Zero fabricated awards (no invented Michelin stars or false reviewer ratings). Neutral dietary and event notes.

---

### Scenario 2: Law Firm (Legal Advisory)
- **Business Profile:**
  - *Name:* "Sterling & Vance LLP"
  - *Industry:* "Legal Practice & Advisory"
  - *Business Category:* "Corporate Governance, Commercial Litigation & M&A"
  - *Website Type:* `lead_gen`
  - *Audience:* "Founders, board directors, and general corporate counsel"
  - *Primary Goal:* "generate_leads" (Confidential dispute and advisory intake)
- **Recommended Configuration:**
  - **Design Template:** `tmpl_luxury_editorial` (Refined serif typography, dignified hairline dividers)
  - **Color Theme:** `theme_monochrome_ink` (Editorial black and slate white, uncompromising clarity)
  - **Styling Tokens:** `buttonRadius: "sharp"`, `cardStyle: "bordered"`, `headerStyle: "standard"`
  - **Primary CTA:** "Request Consultation" -> `#inquiry-form`
- **Recommended Section Sequence & Rationale:**
  1. `hero_split`: Authoritative split hero establishing commercial litigation focus and direct partner consultation link.
  2. `benefits_grid`: 3 client commitments (Direct Senior Counsel, Proactive Risk Mitigation, Transparent Scoping).
  3. `brand_story`: Firm profile outlining core practice areas and institutional governance principles.
  4. `how_it_works`: Structured 3-step advisory roadmap (Confidential Intake -> Diagnostic Strategy Session -> Execution).
  5. `brand_values`: Principles of practice (Integrity, Rigorous Scrutiny, Strict Client Privilege).
  6. `faq_accordion`: Direct answers on initial conflict checks, remote consultation formats, and retainer frameworks.
  7. `contact_info`: Physical offices, direct intake phone, and encrypted message channel.
  8. `footer_custom`: Regulatory legal disclaimers, jurisdiction notes, and copyright.
- **Content Safety Enforcement:** Zero fabricated case win rates, fictitious trial settlements, or unverified bar honors.

---

### Scenario 3: Fitness Studio (Personal Training & Conditioning)
- **Business Profile:**
  - *Name:* "Apex Athletic Conditioning"
  - *Industry:* "Health & Wellness"
  - *Business Category:* "High-Performance Strength & Conditioning Studio"
  - *Website Type:* `appointments`
  - *Audience:* "Athletes, busy professionals, and fitness enthusiasts"
  - *Primary Goal:* "book_appointments" (Live session reservations)
- **Recommended Configuration:**
  - **Design Template:** `tmpl_bold_vibrant` (Assertive drop shadows, high-energy layout blocks)
  - **Color Theme:** `theme_obsidian_slate` (Deep charcoal space with glowing electric cyan accents)
  - **Styling Tokens:** `buttonRadius: "rounded"`, `cardStyle: "bordered"`, `shadowScale: "medium"`
  - **Primary CTA:** "Book a Session" -> `#booking-section`
- **Recommended Section Sequence & Rationale:**
  1. `hero_split`: High-energy training imagery paired with clear session booking value proposition.
  2. `benefits_grid`: 3 performance pillars (Biomechanically Sound Programming, Certified Coaches, Measurable Milestones).
  3. `brand_story`: Studio training philosophy emphasizing injury-free longevity and strength progression.
  4. `how_it_works`: Preparation roadmap (Select Slot -> Conditioning Assessment -> Regular Session).
  5. `timeline_milestones`: Visual milestones representing progression from baseline screening to athletic conditioning.
  6. `faq_accordion`: Session prep, studio cancellation policies, and required gear.
  7. `contact_info`: Studio location, transit accessibility, and front desk inquiry phone.
  8. `footer_custom`: Operational hours, social links, and studio policies.
- **Content Safety Enforcement:** No fabricated trainer degrees or false weight-loss promises.

---

### Scenario 4: Clothing Store (Contemporary Fashion)
- **Business Profile:**
  - *Name:* "Nordic Minimalist Atelier"
  - *Industry:* "Fashion & Apparel"
  - *Business Category:* "Organic Cotton Ready-to-Wear"
  - *Website Type:* `ecommerce`
  - *Audience:* "Conscious consumers and design-minded everyday dressers"
  - *Primary Goal:* "sell_products" (Direct online cart checkout)
- **Recommended Configuration:**
  - **Design Template:** `tmpl_modern_minimal` (Airy whitespace, floating translucent navigation)
  - **Color Theme:** `theme_nordic_pine` (Grounded forest emerald, warm alabaster paper backdrop)
  - **Styling Tokens:** `buttonRadius: "rounded"`, `cardStyle: "flat"`, `spacingDensity: "spacious"`
  - **Primary CTA:** "Explore Collection" -> `#catalog`
- **Recommended Section Sequence & Rationale:**
  1. `hero_split`: Split-screen seasonal showcase pairing organic silhouettes with capsule collection headline.
  2. `benefits_grid`: Value commitments (GOTS-Certified Fibers, Fair-Trade Production, Carbon-Neutral Delivery).
  3. `featured_products`: Curated 4-column catalog grid with instant add-to-bag and stock availability.
  4. `collection_showcase`: Visual category navigation (Tops, Trousers, Outerwear, Accessories).
  5. `brand_story`: Atelier heritage, ethical manufacturing standards, and textile longevity guarantee.
  6. `trust_badges`: Secure transaction, authentic garment, and responsive exchange badges.
  7. `shipping_returns`: Transparent 30-day return policy and doorstep tracking information.
  8. `newsletter_signup`: Subscriber release notices and seasonal capsule previews.
  9. `footer_custom`: Comprehensive catalog directory and customer support channels.
- **Content Safety Enforcement:** Real product catalog pricing and stock levels only. No fake countdown timers or fake review stars.

---

### Scenario 5: Software Company (B2B SaaS)
- **Business Profile:**
  - *Name:* "Krypton Systems"
  - *Industry:* "Electronics & Gadgets" (or B2B Software)
  - *Business Category:* "Enterprise Workflow Intelligence Platform"
  - *Website Type:* `lead_gen`
  - *Audience:* "Engineering leads, VP Product, and enterprise operations teams"
  - *Primary Goal:* "generate_leads" (Solution demo bookings & pilots)
- **Recommended Configuration:**
  - **Design Template:** `tmpl_tech_futuristic` (Precision angular architecture, telemetry indicators)
  - **Color Theme:** `theme_electric_indigo` (Crisp technical indigo with high-contrast surfaces)
  - **Styling Tokens:** `buttonRadius: "sharp"`, `cardStyle: "bordered"`, `contentWidth: "normal"`
  - **Primary CTA:** "Request a Demo" -> `#inquiry-form`
- **Recommended Section Sequence & Rationale:**
  1. `hero_split`: Telemetry-inspired split hero highlighting automation speed and enterprise API stability.
  2. `benefits_grid`: Technical capabilities (Sub-millisecond Latency, Zero Configuration Pipelines, End-to-End Encryption).
  3. `brand_story`: Platform engineering architecture and enterprise data security philosophy.
  4. `how_it_works`: 3-phase rollout roadmap (Connect Connectors -> Configure Automations -> Monitor Telemetry).
  5. `brand_values`: Reliability benchmarks, SOC2 compliance posture, and high availability commitments.
  6. `faq_accordion`: Deployment options (Cloud/On-prem), SLA guarantees, and licensing models.
  7. `contact_info`: Enterprise solutions desk, technical advisory lines, and security email.
  8. `footer_custom`: Developer documentation links, status page links, and privacy disclosures.
- **Content Safety Enforcement:** No fabricated customer logos (e.g. no inventing fake Fortune 500 customers) or unsubstantiated speed benchmarks.

---

## 3. Extensibility to Custom & Unknown Industries

When a merchant enters an industry or custom category outside standard presets (e.g., "Acoustic Insulation Consultancy", "Rare Antiquarian Books", "Artisan Woodworking"), the recommender applies a robust fallback rule tree:
1. **Semantic Analysis:** Maps descriptive keywords to the closest matching aesthetic archetype (e.g., "books" -> `tmpl_editorial_magazine`; "woodworking" -> `tmpl_organic_natural`; "insulation" -> `tmpl_classic_commerce`).
2. **Website Type Safeguards:** Strictly respects the chosen `websiteType` to assemble structurally coherent sections without component leakage.
3. **Editable Placeholders:** Unspecified business parameters default to neutral, transparent editorial prompts that can be customized in the Visual Editor.
