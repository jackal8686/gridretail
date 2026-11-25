# GridRetail — Phase 16.1.8 Responsive Verification

## 1. Overview & Test Matrix

This document provides visual and technical verification of the responsive matrix across all three website archetypes supported by GridRetail:
1. **E-Commerce** (`aura-minimalist`, `str_01`)
2. **Appointment Scheduling** (`summit-legal`, `str_07`)
3. **Lead Generation** (`apex-growth`, `str_08`)

Evaluated at three standardized viewports:
- **Desktop:** 1440 × 900
- **Tablet:** 768 × 1024
- **Mobile:** 375 × 812

---

## 2. Lead-Generation Mobile Header Verification (375px & Intermediate Width)

### Prior Issues at 375px
- Business name wrapped across multiple lines.
- Primary CTA wrapped across multiple lines.
- Logo, business name, CTA button, and hamburger toggle competed for 343px of horizontal space, causing visual collisions.

### Remediated Architecture (`src/components/storefront/LeadGenWebsiteView.tsx`)
1. **Business Name Single-Line Truncation:**
   - Applied `min-w-0` to the left container.
   - Applied `text-sm sm:text-lg font-bold tracking-tight block leading-tight truncate max-w-[130px] xs:max-w-[180px] sm:max-w-none`.
   - Result: Business name never wraps across lines at 375px or 480px.
2. **Header Subtitle Suppression on Mobile:**
   - Applied `hidden sm:block truncate` to the secondary title `"Commercial Lead & Strategy Advisory"`.
   - Result: Header height remains compact and consistent across mobile viewports.
3. **Compact Non-Wrapping CTA Button:**
   - Applied `whitespace-nowrap shrink-0 px-2.5 sm:px-5 py-1.5 sm:py-2 text-[11px] sm:text-xs`.
   - Responsive label: renders `"Inquire"` on `<sm` viewports (or short custom label) and the full `{branding.ctaText || "Submit Inquiry"}` on `sm:` and up.
   - Result: CTA button never wraps into multiple lines.
4. **Accessible Touch Target for Mobile Navigation:**
   - Hamburger button sized with `min-w-[36px] min-h-[36px] flex items-center justify-center p-2 rounded-lg border shrink-0`.
   - Added explicit `aria-label="Toggle navigation menu"` and `aria-expanded={isMobileMenuOpen}`.
5. **Mobile Drawer Action:**
   - When mobile menu is expanded, a full-width prominent CTA button displays the complete `{branding.ctaText || "Submit Strategic Inquiry"}`.

### Verification Results
- **375px Viewport:** 0 horizontal overflow detected. Business name, compact CTA, and hamburger menu fit comfortably with 16px lateral padding.
- **480px Viewport (Intermediate):** 0 horizontal overflow. Expanded space permits larger text without truncation.

---

## 3. Appointment Scheduling Hero Spacing Verification

### Prior Issue on Desktop (1440 × 900)
- An excessive vertical void (~176px) separated the hero CTA buttons and the consultation services heading due to compounding padding (`py-16 sm:py-24` on hero, `py-16 sm:py-20` on services section, and `mb-12` heading margin).

### Remediated Spacing
- Hero padding adjusted to `pt-10 sm:pt-14 pb-8 sm:pb-10`.
- Integrated framed `ThemeAwareHeroGraphic` (aspect ratio 21/9) when merchant banner is omitted.
- Services section padding adjusted to `pt-10 sm:pt-14 pb-14 sm:pb-18` with `mb-8 sm:mb-10` heading margin.
- Result: Gap reduced from ~176px to ~72px, providing intentional editorial breathing room without an empty void.

---

## 4. Screenshot Evidence Manifest

All 10 PNG files were captured via Playwright in production mode (`scripts/e2e-phase16-1-matrix.ts`), verified with `sharp`, stored in `docs/screenshots/phase16-1/`, and mirrored to the conversation artifact directory:

| Artifact Filename | Website Archetype | Viewport | Target Dimensions | Actual Dimensions | File Size | Horizontal Overflow | Validation Status |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `ecommerce-desktop.png` | E-Commerce | Desktop | 1440 × 900 | 1440 × 900 | 112.0 KB | None (0px) | Valid |
| `ecommerce-tablet.png` | E-Commerce | Tablet | 768 × 1024 | 768 × 1024 | 116.6 KB | None (0px) | Valid |
| `ecommerce-mobile.png` | E-Commerce | Mobile | 375 × 812 | 375 × 812 | 54.4 KB | None (0px) | Valid |
| `appointments-desktop.png` | Appointments | Desktop | 1440 × 900 | 1440 × 900 | 116.5 KB | None (0px) | Valid |
| `appointments-tablet.png` | Appointments | Tablet | 768 × 1024 | 768 × 1024 | 109.2 KB | None (0px) | Valid |
| `appointments-mobile.png` | Appointments | Mobile | 375 × 812 | 375 × 812 | 48.0 KB | None (0px) | Valid |
| `lead-gen-desktop.png` | Lead Generation | Desktop | 1440 × 900 | 1440 × 900 | 100.5 KB | None (0px) | Valid |
| `lead-gen-tablet.png` | Lead Generation | Tablet | 768 × 1024 | 768 × 1024 | 105.0 KB | None (0px) | Valid |
| `lead-gen-mobile.png` | Lead Generation | Mobile | 375 × 812 | 375 × 812 | 48.0 KB | None (0px) | Valid |
| `contact-sheet.png` | 3 × 3 Composite | Combined | 1920 × 1608 | 1920 × 1608 | 418.4 KB | None (0px) | Valid |
