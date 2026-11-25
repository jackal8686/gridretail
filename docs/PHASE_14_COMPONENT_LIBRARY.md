# GridRetail Phase 14 — Component Library Reference

**Project:** GridRetail  
**Phase:** 14 — Professional Website Design Library & Visual Experience Enhancement  
**Document:** Technical Component Library & Design Tokens Reference  
**Status:** Complete  
**Date:** November 21, 2026  

---

## 1. Design Token Taxonomy & Options

### 1.1 StoreStylingTokens Reference Table

| Property | Type | Default | Description |
| :--- | :--- | :--- | :--- |
| `heroVariation` | `enum (10)` | Template default | Archetype layout for the storefront hero section |
| `headerVariation`| `enum (7)` | Template default | Header and navigation menu layout |
| `footerVariation`| `enum (6)` | `multi_column` | Storefront footer structure and directory depth |
| `cardVariation`  | `enum (6)` | `bordered` | Border, elevation, and hover styling for product and service cards |
| `contentWidth`   | `compact` \| `normal` \| `wide` | `normal` | Maximum horizontal constraint of page containers |
| `spacingDensity` | `compact` \| `normal` \| `spacious` | `normal` | Vertical section padding and grid gap density |
| `typographyScale`| `compact` \| `balanced` \| `prominent` | `balanced` | Proportional font sizing across headlines and subheads |
| `imagePosition`  | `left` \| `center` \| `right` | `right` | Column orientation of hero imagery in split layouts |
| `buttonRadius`   | `sharp` \| `rounded` \| `pill` | Template default | Corner curvature applied to buttons and badges |
| `shadowScale`    | `none` \| `subtle` \| `medium` \| `dramatic` | `subtle` | Intensity of box-shadows on cards and elevated containers |

---

## 2. Hero Section Library (10 Archetypes)

All hero variations are located in `src/components/storefront/sections/HeroSections.tsx` and dynamically render via `HeroSections`.

### 2.1 Centered Hero (`heroVariation: "centered"`)
- **Description:** Symmetrical, high-focus layout with centered typography, ambient halo glow, dual CTAs, and a trust guarantee pill.
- **Visual Structure:**
  - Ambient radial blur gradient behind headline (`bg-primary/10`).
  - Centered badge: Store industry / verified badge.
  - Heading 1 with prominent typography scaling (`text-4xl sm:text-6xl lg:text-7xl`).
  - Centered subtitle (`max-w-2xl text-muted-foreground`).
  - Button pair: Primary CTA ("Explore Collection" / "Book Now") + Secondary CTA ("Learn More").
  - Trust meter pill with check icon and security assurance text.

### 2.2 Split-Screen Hero (`heroVariation: "split"`)
- **Description:** Balanced two-column grid pairing narrative copy with high-impact imagery. Supports flexible image positioning (`left` vs `right`).
- **Visual Structure:**
  - Column 1: Eyebrow badge, main headline, narrative description, action buttons, quick stats.
  - Column 2: Framed hero image with rounded borders, accent gradient border, and floating badge.
  - Flex order swaps seamlessly on mobile viewports for optimal thumb ergonomics.

### 2.3 Image-Background Hero (`heroVariation: "image_bg"`)
- **Description:** Full-bleed background hero image with dark scrim gradient overlay for rich brand storytelling.
- **Visual Structure:**
  - High-resolution background image with `object-cover`.
  - Gradient overlay (`from-black/85 via-black/60 to-black/30`).
  - High-contrast white typography (`text-white`) with drop shadow for readability.
  - Glassmorphic secondary button with backdrop blur (`backdrop-blur-md bg-white/10 text-white`).

### 2.4 Editorial Magazine Hero (`heroVariation: "editorial"`)
- **Description:** Luxury fashion and lifestyle editorial layout. Features high-contrast hairline borders, oversized display serif typography, and a side commentary column.
- **Visual Structure:**
  - Header rule with issue/edition number and current season label.
  - Massive editorial display headline (`font-serif tracking-tight`).
  - Two-column bottom strip: left side has narrative editorial description, right side features curated CTA and collection details.

### 2.5 Minimal Typography Hero (`heroVariation: "minimal"`)
- **Description:** Understated, quiet luxury presentation characterized by generous whitespace, subtle hairline dividers, and refined monospace accents.
- **Visual Structure:**
  - Monospace category indicator (`font-mono text-xs tracking-widest uppercase`).
  - Clean, unadorned heading with balanced line height.
  - Understated single CTA button or minimal text link with arrow icon.

### 2.6 Product Spotlight Hero (`heroVariation: "product_spotlight"`)
- **Description:** E-commerce flagship spotlight designed to showcase a single key product directly in the hero zone.
- **Visual Structure:**
  - Product badge ("Featured Collection" / "New Release").
  - Product title and curated description.
  - Dynamic price pill (`text-2xl font-bold text-primary`).
  - Star rating badge with review counter.
  - Instant "Add to Bag" action button and quick-view feature list.
  - Hero product imagery in high-resolution aspect ratio (1:1 or 4:5).

### 2.7 Service Booking Hero (`heroVariation: "service_booking"`)
- **Description:** Tailored for appointment scheduling websites, highlighting key service disciplines and offering an immediate calendar consultation shortcut.
- **Visual Structure:**
  - "Immediate Availability" live status indicator (pulsing green dot).
  - Practice / specialist headline and qualification badges.
  - Primary CTA: "Schedule Consultation" with calendar icon.
  - Secondary CTA: "View Service Menu & Rates".
  - Guarantee footer: "No-obligation initial consultation • Direct calendar sync".

### 2.8 Form Conversion Hero (`heroVariation: "form_conversion"`)
- **Description:** High-conversion lead generation hero with inquiry input directly above the fold.
- **Visual Structure:**
  - Left column: High-converting value proposition headline, response time guarantee ("Quotes within 2 business hours"), and bulleted benefits.
  - Right column: Embedded quick-inquiry card with Name, Email, and Project Need inputs plus "Submit Request" CTA button.

### 2.9 Media Showcase Hero (`heroVariation: "media_showcase"`)
- **Description:** Asymmetric multi-image collage designed for creative studios, architectural firms, and luxury artisans.
- **Visual Structure:**
  - Primary hero image container (large format).
  - Secondary floating card overlapping the corner with subtle box shadow.
  - Curated statistic badge ("Curated Portfolio", "Handcrafted Quality").

### 2.10 Neo-Brutalist Asymmetric Hero (`heroVariation: "asymmetric"`)
- **Description:** Modern, high-energy layout with bold borders, contrasting solid blocks, and offset geometric layout.
- **Visual Structure:**
  - 2px solid high-contrast borders (`border-2 border-primary`).
  - Sharp corners (`rounded-none`).
  - Offset shadow block (`shadow-[6px_6px_0px_0px_rgba(0,0,0,1)]`).
  - High-impact badge tickers and bold typographic hierarchy.

---

## 3. Navigation Header Library (7 Archetypes)

Unified in `StorefrontView.tsx`, `AppointmentWebsiteView.tsx`, and `LeadGenWebsiteView.tsx`.

### 3.1 `minimal`
- Floating pill or clean baseline header.
- Brand logo on left, clean navigation links in center, shopping bag / book link on right.
- Zero visual clutter, subtle bottom hairline divider.

### 3.2 `corporate`
- Two-tier header structure.
- Top utility bar: Customer service phone, email, and operating hours.
- Main navigation bar: Brand logo, nested dropdown links, and primary CTA.

### 3.3 `centered_logo`
- Symmetrical layout.
- Split navigation: Links 1-2 on left of center, Brand Logo in exact center, Links 3-4 and CTA on right.
- High-end boutique aesthetic.

### 3.4 `transparent`
- Floating transparent header with `backdrop-blur-md bg-background/70`.
- Seamlessly overlays hero banners without creating visual hard edges.
- Contrast-adaptive text color transitions.

### 3.5 `commerce_cart`
- Optimized specifically for e-commerce conversion.
- Features prominent search input field, category quick-links, wishlist icon, and slide-over cart drawer button with live item counter badge.

### 3.6 `appointment_cta`
- Optimized for service practices and booking workflows.
- Prominent persistent "Book Appointment" CTA button on the far right.
- Secondary contact link for phone inquiries.

### 3.7 `lead_inquiry`
- Optimized for B2B lead generation.
- High-visibility "Get a Free Quote" / "Request Consultation" CTA button with contrasting accent pill.

---

## 4. Footer Section Library (6 Archetypes)

Implemented in `src/components/storefront/sections/FooterSection.tsx`.

### 4.1 `minimal_inline`
- Single-row horizontal layout.
- Left: Brand monogram and copyright.
- Center: Privacy Policy, Terms of Service.
- Right: Social media icons and back-to-top button.

### 4.2 `multi_column`
- 4-column comprehensive sitemap directory.
- Column 1: Brand description and logo.
- Column 2: Product / Service categories.
- Column 3: Company and team links.
- Column 4: Newsletter subscription input and reassurance text.

### 4.3 `business_info`
- Corporate footers prioritizing verifiable business credentials.
- Physical address, registration number, business hours, and direct support telephone lines.

### 4.4 `commerce_directory`
- Full e-commerce directory footer.
- Columns for Collections, Shipping & Returns, Order Tracking, and Customer Care.
- Verified payment badges row (Secure SSL, Major Cards, Encrypted Checkout).

### 4.5 `service_practitioner`
- Appointment scheduling footer.
- Practice consultation hours, emergency booking contacts, clinic location, and practitioner licensing statements.

### 4.6 `contact_focused`
- Lead generation conversion footer.
- Prominent inquiry card with direct email, telephone contact, and quick message link.

---

## 5. Card Presentation Styles (6 Treatments)

Implemented in `ProductSections.tsx` and applicable across products, services, and features:

| Treatment | Border | Shadow | Corner Radius | Hover Dynamics |
| :--- | :--- | :--- | :--- | :--- |
| `flat` | None | None | `rounded-lg` | Background tint shift (`hover:bg-muted/50`) |
| `bordered` | 1px `border-border/60` | Subtle | `rounded-xl` | Border highlight (`hover:border-primary/50`) |
| `elevated` | 1px `border-border/30` | `shadow-md` | `rounded-xl` | `hover:shadow-xl hover:-translate-y-1` |
| `floating` | Minimal | `shadow-lg` | `rounded-2xl` | `hover:shadow-2xl hover:-translate-y-2` |
| `block_solid`| 2px solid `border-primary`| Sharp block | `rounded-none` | High-contrast border color inversion |
| `soft_rounded`| 1px `border-border/40` | `shadow-sm` | `rounded-3xl` | Smooth ambient scale (`hover:scale-[1.02]`) |

---

## 6. Implementation Code References

- **Hero Sections:** `src/components/storefront/sections/HeroSections.tsx`
- **Footer Sections:** `src/components/storefront/sections/FooterSection.tsx`
- **Product & Card Sections:** `src/components/storefront/sections/ProductSections.tsx`
- **Section Renderer Dispatcher:** `src/components/storefront/sections/SectionRenderer.tsx`
- **Storefront View (E-commerce):** `src/components/storefront/StorefrontView.tsx`
- **Appointment View:** `src/components/storefront/AppointmentWebsiteView.tsx`
- **Lead Generation View:** `src/components/storefront/LeadGenWebsiteView.tsx`
- **Customizer Controls:** `src/app/stores/[id]/preview/page.tsx`
- **Type Definitions:** `src/types/store.ts`
- **Test Suite:** `tests/phase14-design-library.test.ts`
